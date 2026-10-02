import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../game/engine';
import { Settings } from '../game/types';
import { BACKUP_QUESTIONS } from './backupQuestions';
import { questionBank } from './questionBank';
import { loadQuestions, NotEnoughQuestionsError, shuffle, topUpQuestionBank } from './questions';
import { openTriviaDb } from './sources/openTriviaDb';
import { theTriviaApi } from './sources/theTriviaApi';
import { RawQuestion } from './sources/types';

vi.mock('./sources/openTriviaDb', () => ({
  openTriviaDb: { name: 'Open Trivia DB', supports: (c: string | null) => c !== 'food', fetch: vi.fn() },
}));
vi.mock('./sources/theTriviaApi', () => ({
  theTriviaApi: { name: 'The Trivia API', supports: () => true, fetch: vi.fn() },
}));

const otdb = vi.mocked(openTriviaDb.fetch);
const tapi = vi.mocked(theTriviaApi.fetch);

const raw = (id: string, patch: Partial<RawQuestion> = {}): RawQuestion => ({
  id,
  source: id.startsWith('otdb') ? 'otdb' : 'tapi',
  category: 'Animals',
  categoryIds: ['animals'],
  difficulty: 'easy',
  text: `Question ${id}?`,
  correct: `right ${id}`,
  wrong: ['w1', 'w2', 'w3'],
  ...patch,
});
const batch = (prefix: string, n: number, patch: Partial<RawQuestion> = {}) => Array.from({ length: n }, (_, i) => raw(`${prefix}:${i}`, patch));

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, questionCount: 10, ...patch });
const offline = () => {
  otdb.mockRejectedValue(new TypeError('Failed to fetch'));
  tapi.mockRejectedValue(new TypeError('Failed to fetch'));
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  otdb.mockReset();
  tapi.mockReset();
});

describe('loadQuestions — online', () => {
  it('mixes questions from both sources', async () => {
    otdb.mockResolvedValue(batch('otdb', 10));
    tapi.mockResolvedValue(batch('tapi', 10));
    const { questions, notice } = await loadQuestions(settings());

    expect(questions).toHaveLength(10);
    expect(notice).toBeNull();
    expect(questions.filter(q => q.id.startsWith('otdb'))).toHaveLength(5);
    expect(questions.filter(q => q.id.startsWith('tapi'))).toHaveLength(5);
  });

  it('shuffles answers and keeps correctIndex pointing at the right one', async () => {
    otdb.mockResolvedValue(batch('otdb', 10));
    tapi.mockResolvedValue([]);
    const { questions } = await loadQuestions(settings());
    for (const q of questions) expect(q.answers[q.correctIndex]).toBe(`right ${q.id}`);
  });

  it('saves everything fetched — including the extras — to the bank', async () => {
    otdb.mockResolvedValue(batch('otdb', 10));
    tapi.mockResolvedValue(batch('tapi', 10));
    await loadQuestions(settings());

    expect(questionBank.count()).toBe(20);
    expect(questionBank.seenIds().size).toBe(10); // only the ones actually played
  });

  it("doesn't repeat questions you've already played when there are fresh ones", async () => {
    otdb.mockResolvedValue(batch('otdb', 10));
    tapi.mockResolvedValue(batch('tapi', 10));
    const first = await loadQuestions(settings());
    const second = await loadQuestions(settings());

    const firstIds = new Set(first.questions.map(q => q.id));
    expect(second.questions.some(q => firstIds.has(q.id))).toBe(false);
  });

  it('drops the same question coming from both sources', async () => {
    otdb.mockResolvedValue([raw('otdb:1', { text: 'What is a Bonobo?' }), ...batch('otdb', 9)]);
    tapi.mockResolvedValue([raw('tapi:1', { text: 'What is a bonobo' }), ...batch('tapi', 9)]);
    const { questions } = await loadQuestions(settings());

    expect(questions.filter(q => /bonobo/i.test(q.text))).toHaveLength(1);
  });

  it('only asks sources that cover the category', async () => {
    tapi.mockResolvedValue(batch('tapi', 10, { categoryIds: ['food'] }));
    await loadQuestions(settings({ category: 'food' }));

    expect(otdb).not.toHaveBeenCalled();
    expect(tapi).toHaveBeenCalled();
  });

  it('carries on with one source if the other fails', async () => {
    otdb.mockRejectedValue(new Error('rate limited'));
    tapi.mockResolvedValue(batch('tapi', 10));
    const { questions, notice } = await loadQuestions(settings());

    expect(questions).toHaveLength(10);
    expect(notice).toBeNull();
  });

  it('tops up from the bank when the sources come back short', async () => {
    questionBank.add(batch('saved', 5));
    otdb.mockResolvedValue(batch('otdb', 3));
    tapi.mockResolvedValue(batch('tapi', 2));
    const { questions } = await loadQuestions(settings());

    expect(questions).toHaveLength(10);
  });

  it('plays a short game, with a heads-up, if that is all there is', async () => {
    otdb.mockResolvedValue(batch('otdb', 3));
    tapi.mockResolvedValue(batch('tapi', 3));
    const { questions, notice } = await loadQuestions(settings({ category: 'animals' }));

    expect(questions).toHaveLength(6);
    expect(notice).toMatch(/only 6 questions/i);
  });

  it('says so when there are too few for a game', async () => {
    otdb.mockResolvedValue(batch('otdb', 1));
    tapi.mockResolvedValue([]);
    await expect(loadQuestions(settings({ category: 'animals' }))).rejects.toBeInstanceOf(NotEnoughQuestionsError);
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    otdb.mockImplementation(async () => {
      controller.abort();
      return batch('otdb', 10);
    });
    tapi.mockResolvedValue(batch('tapi', 10));
    await expect(loadQuestions(settings(), controller.signal)).rejects.toBeDefined();
  });
});

describe('loadQuestions — offline', () => {
  it('plays saved questions for the category, with a notice', async () => {
    questionBank.add([...batch('saved', 10), ...batch('history', 10, { categoryIds: ['history'] })]);
    offline();
    const { questions, notice } = await loadQuestions(settings({ category: 'animals' }));

    expect(questions).toHaveLength(10);
    expect(questions.every(q => q.id.startsWith('saved'))).toBe(true);
    expect(notice).toMatch(/saved from earlier/i);
  });

  it('never serves off-topic questions for a category it has nothing saved for', async () => {
    questionBank.add(batch('history', 10, { categoryIds: ['history'] }));
    offline();
    await expect(loadQuestions(settings({ category: 'animals' }))).rejects.toThrow(/no Animals questions are saved/);
  });

  it('says how many it has when there are too few saved', async () => {
    questionBank.add(batch('saved', 2));
    offline();
    await expect(loadQuestions(settings({ category: 'animals' }))).rejects.toThrow(/only 2 Animals questions/);
  });

  it('uses saved, then built-in, questions for "Anything goes"', async () => {
    questionBank.add(batch('saved', 3));
    offline();
    const { questions, notice } = await loadQuestions(settings({ questionCount: 15 }));

    expect(questions).toHaveLength(15);
    expect(questions.filter(q => q.id.startsWith('saved'))).toHaveLength(3);
    expect(questions.filter(q => q.id.startsWith('builtin'))).toHaveLength(12);
    expect(notice).toMatch(/saved and built-in/i);
  });

  it('prefers saved questions you have not played yet', async () => {
    questionBank.add(batch('saved', 20));
    questionBank.markSeen(batch('saved', 10).map(q => q.id));
    offline();
    const { questions } = await loadQuestions(settings({ category: 'animals' }));
    const played = new Set(batch('saved', 10).map(q => q.id));

    expect(questions.some(q => played.has(q.id))).toBe(false);
  });
});

describe('topUpQuestionBank', () => {
  it('saves a big batch from The Trivia API', async () => {
    tapi.mockResolvedValue(batch('tapi', 50));
    await topUpQuestionBank(settings({ category: 'animals' }));

    expect(tapi).toHaveBeenCalledWith(50, expect.objectContaining({ category: 'animals' }), undefined);
    expect(questionBank.count()).toBe(50);
  });

  it('quietly does nothing when offline', async () => {
    offline();
    await expect(topUpQuestionBank(settings())).resolves.toBeUndefined();
  });
});

describe('shuffle', () => {
  it('keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort()).toEqual(input);
  });
});

describe('built-in backup questions', () => {
  it('has enough for the longest game', () => {
    expect(BACKUP_QUESTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it.each(BACKUP_QUESTIONS.map(b => [b[1], b] as const))('"%s" has four distinct answers', (_, [, , ...answers]) => {
    expect(answers).toHaveLength(4);
    expect(new Set(answers).size).toBe(4);
  });

  it('has no duplicate questions', () => {
    const texts = BACKUP_QUESTIONS.map(b => b[1]);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
