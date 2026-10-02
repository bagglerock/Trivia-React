import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../game/engine';
import { Settings } from '../game/types';
import { BACKUP_QUESTIONS } from './backupQuestions';

type Questions = typeof import('./questions');

const apiQuestion = (overrides: Record<string, unknown> = {}) => ({
  category: 'Entertainment: Video Games',
  type: 'multiple',
  difficulty: 'easy',
  question: 'Who&#039;s the &quot;hero&quot; of Zelda?',
  correct_answer: 'Link',
  incorrect_answers: ['Zelda', 'Ganon', 'Epona'],
  ...overrides,
});

const json = (body: unknown) => Promise.resolve({ json: () => Promise.resolve(body) } as Response);

/** Routes fetch calls by endpoint; api.php responses are consumed in order. */
const mockApi = (apiResponses: unknown[], token = 'tok') => {
  const calls: URL[] = [];
  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input);
    calls.push(url);
    if (url.pathname === '/api_token.php') return json({ response_code: 0, token });
    const next = apiResponses.shift();
    if (next instanceof Error) return Promise.reject(next);
    return json(next ?? { response_code: 0, results: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, apiCalls: () => calls.filter(c => c.pathname === '/api.php') };
};

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch });

let q: Questions;

beforeEach(async () => {
  // Fresh module each test: the rate-limit spacing is module state.
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
  q = await import('./questions');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('loadQuestions', () => {
  it('decodes HTML entities, tidies the category and points correctIndex at the right answer', async () => {
    mockApi([{ response_code: 0, results: [apiQuestion()] }]);
    const { questions, usingBackup } = await q.loadQuestions(settings());

    expect(usingBackup).toBe(false);
    const [first] = questions;
    expect(first.text).toBe('Who\'s the "hero" of Zelda?');
    expect(first.category).toBe('Video Games');
    expect(first.answers).toHaveLength(4);
    expect(first.answers[first.correctIndex]).toBe('Link');
  });

  it('sends the amount, category, difficulty and session token', async () => {
    const api = mockApi([{ response_code: 0, results: [apiQuestion()] }], 'abc123');
    await q.loadQuestions(settings({ questionCount: 20, category: 27, difficulty: 'hard' }));

    const params = api.apiCalls()[0].searchParams;
    expect(Object.fromEntries(params)).toEqual({ amount: '20', type: 'multiple', category: '27', difficulty: 'hard', token: 'abc123' });
    expect(localStorage.getItem('trivia.opentdb.token')).toBe('abc123');
  });

  it('reuses a saved session token instead of requesting a new one', async () => {
    localStorage.setItem('trivia.opentdb.token', 'saved');
    const api = mockApi([{ response_code: 0, results: [apiQuestion()] }]);
    await q.loadQuestions(settings());

    expect(api.calls.some(c => c.pathname === '/api_token.php')).toBe(false);
    expect(api.apiCalls()[0].searchParams.get('token')).toBe('saved');
  });

  it('spaces back-to-back requests at least 5 seconds apart', async () => {
    mockApi([
      { response_code: 0, results: [apiQuestion()] },
      { response_code: 0, results: [apiQuestion()] },
    ]);
    await q.loadQuestions(settings());

    let done = false;
    const second = q.loadQuestions(settings()).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    await second;
    expect(done).toBe(true);
  });

  it('waits and retries when rate limited', async () => {
    const api = mockApi([{ response_code: 5, results: [] }, { response_code: 0, results: [apiQuestion()] }]);
    const result = q.loadQuestions(settings({ category: 27 }));
    await vi.advanceTimersByTimeAsync(6000);

    expect((await result).usingBackup).toBe(false);
    expect(api.apiCalls()).toHaveLength(2);
  });

  it('requests a new token when the saved one has expired', async () => {
    localStorage.setItem('trivia.opentdb.token', 'stale');
    const api = mockApi([{ response_code: 3, results: [] }, { response_code: 0, results: [apiQuestion()] }], 'fresh');
    const result = q.loadQuestions(settings());
    await vi.advanceTimersByTimeAsync(6000);
    await result;

    expect(api.apiCalls().map(c => c.searchParams.get('token'))).toEqual(['stale', 'fresh']);
  });

  it('resets an exhausted token once, then reports not enough questions', async () => {
    const api = mockApi([
      { response_code: 4, results: [] },
      { response_code: 1, results: [] },
    ]);
    const result = q.loadQuestions(settings({ category: 27 }));
    const assertion = expect(result).rejects.toBeInstanceOf(q.NotEnoughQuestionsError);
    await vi.advanceTimersByTimeAsync(6000);
    await assertion;

    expect(api.calls.some(c => c.searchParams.get('command') === 'reset')).toBe(true);
  });

  it('falls back to the built-in questions when the server is down and any category is fine', async () => {
    mockApi([new TypeError('Failed to fetch')]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { questions, usingBackup } = await q.loadQuestions(settings({ questionCount: 15 }));

    expect(usingBackup).toBe(true);
    expect(questions).toHaveLength(15);
  });

  it('never serves off-topic backup questions when a category was picked', async () => {
    mockApi([new TypeError('Failed to fetch')]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(q.loadQuestions(settings({ category: 27 }))).rejects.toThrow(/couldn't reach the question server/i);
  });

  it('stops quietly when the load is cancelled', async () => {
    mockApi([{ response_code: 0, results: [apiQuestion()] }, { response_code: 0, results: [apiQuestion()] }]);
    await q.loadQuestions(settings()); // use up the rate-limit slot so the next load has to wait

    const controller = new AbortController();
    const result = q.loadQuestions(settings(), controller.signal);
    const assertion = expect(result).rejects.toBeDefined();
    controller.abort();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2); // token + first load only
  });
});

describe('shuffle', () => {
  it('keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = q.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort()).toEqual(input);
  });
});

describe('backup questions', () => {
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
