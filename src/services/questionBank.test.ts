import { describe, expect, it } from 'vitest';
import { BANK_LIMIT, questionBank } from './questionBank';
import { RawQuestion } from './sources/types';

const q = (id: string, patch: Partial<RawQuestion> = {}): RawQuestion => ({
  id,
  source: 'tapi',
  category: 'Animals',
  categoryIds: ['animals'],
  difficulty: 'easy',
  text: `Question ${id}?`,
  correct: 'yes',
  wrong: ['no', 'maybe', 'never'],
  ...patch,
});

const any = { categoryId: null, difficulty: null };

describe('question bank', () => {
  it('saves questions and survives a reload (it lives in browser storage)', () => {
    questionBank.add([q('a'), q('b')]);
    expect(JSON.parse(localStorage.getItem('trivia.bank.v1')!)).toHaveLength(2);
    expect(questionBank.count()).toBe(2);
  });

  it("doesn't duplicate a question saved twice, and keeps its played date", () => {
    questionBank.add([q('a')]);
    questionBank.markSeen(['a'], 1000);
    questionBank.add([q('a', { text: 'Updated?' })]);

    expect(questionBank.count()).toBe(1);
    expect(questionBank.seenIds().has('a')).toBe(true);
  });

  it('filters by category and difficulty', () => {
    questionBank.add([q('a'), q('b', { categoryIds: ['history'] }), q('c', { difficulty: 'hard' })]);

    expect(questionBank.pick(10, { categoryId: 'animals', difficulty: null }).map(x => x.id).sort()).toEqual(['a', 'c']);
    expect(questionBank.pick(10, { categoryId: 'animals', difficulty: 'hard' }).map(x => x.id)).toEqual(['c']);
    expect(questionBank.count({ categoryId: 'history', difficulty: null })).toBe(1);
  });

  it('serves never-played questions first, then the longest-ago played', () => {
    questionBank.add([q('recent'), q('old'), q('fresh')]);
    questionBank.markSeen(['recent'], 2000);
    questionBank.markSeen(['old'], 1000);

    expect(questionBank.pick(3, any).map(x => x.id)).toEqual(['fresh', 'old', 'recent']);
  });

  it('can exclude questions already chosen', () => {
    questionBank.add([q('a'), q('b')]);
    expect(questionBank.pick(10, any, new Set(['a'])).map(x => x.id)).toEqual(['b']);
  });

  it('returns plain questions without the bookkeeping fields', () => {
    questionBank.add([q('a')]);
    expect(questionBank.pick(1, any)[0]).toEqual(q('a'));
  });

  it('stays under the size limit by dropping the most recently played', () => {
    const many = Array.from({ length: BANK_LIMIT }, (_, i) => q(`q${i}`));
    questionBank.add(many);
    questionBank.markSeen(['q0'], 5000);
    questionBank.add([q('new')]);

    expect(questionBank.count()).toBe(BANK_LIMIT);
    expect(questionBank.pick(BANK_LIMIT, any).some(x => x.id === 'q0')).toBe(false);
    expect(questionBank.pick(BANK_LIMIT, any).some(x => x.id === 'new')).toBe(true);
  });

  it('copes with corrupt storage', () => {
    localStorage.setItem('trivia.bank.v1', '{not json');
    expect(questionBank.count()).toBe(0);
    questionBank.add([q('a')]);
    expect(questionBank.count()).toBe(1);
  });
});
