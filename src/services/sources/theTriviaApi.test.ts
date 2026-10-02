import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../game/engine';
import { Settings } from '../../game/types';
import { mockFetch } from '../../test/fetchMock';
import { theTriviaApi } from './theTriviaApi';

const apiQuestion = (overrides: Record<string, unknown> = {}) => ({
  id: '622a1c3b',
  category: 'food_and_drink',
  correctAnswer: 'Spain ',
  incorrectAnswers: ['Italy', 'France', 'Russia'],
  question: { text: 'From which country does the dish paella originate?' },
  tags: ['food', 'general_knowledge', 'food_and_drink'],
  type: 'text_choice',
  difficulty: 'easy',
  ...overrides,
});

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch });

afterEach(() => vi.unstubAllGlobals());

describe('The Trivia API source', () => {
  it('maps questions into our format, trimming stray whitespace', async () => {
    mockFetch({ '/v2/questions': [[apiQuestion()]] });
    const [q] = await theTriviaApi.fetch(10, settings());

    expect(q).toEqual({
      id: 'tapi:622a1c3b',
      source: 'tapi',
      category: 'Food & Drink',
      categoryIds: ['food'],
      difficulty: 'easy',
      text: 'From which country does the dish paella originate?',
      correct: 'Spain',
      wrong: ['Italy', 'France', 'Russia'],
    });
  });

  it('asks by whole category where it can', async () => {
    const api = mockFetch({ '/v2/questions': [[]] });
    await theTriviaApi.fetch(20, settings({ category: 'sports', difficulty: 'medium' }));

    expect(Object.fromEntries(api.calls[0].searchParams)).toEqual({
      limit: '20',
      types: 'text_choice',
      categories: 'sport_and_leisure',
      difficulties: 'medium',
    });
  });

  it('asks by tags for categories it only has as tags', async () => {
    const api = mockFetch({ '/v2/questions': [[apiQuestion({ category: 'science', tags: ['animals'] })]] });
    const [q] = await theTriviaApi.fetch(10, settings({ category: 'animals' }));

    expect(api.calls[0].searchParams.get('tags')).toBe('animals');
    expect(api.calls[0].searchParams.has('categories')).toBe(false);
    expect(q.category).toBe('Animals');
    expect(q.categoryIds).toContain('animals');
  });

  it('caps a request at 50 questions', async () => {
    const api = mockFetch({ '/v2/questions': [[]] });
    await theTriviaApi.fetch(200, settings());
    expect(api.calls[0].searchParams.get('limit')).toBe('50');
  });

  it('skips questions without exactly three wrong answers', async () => {
    mockFetch({ '/v2/questions': [[apiQuestion({ incorrectAnswers: ['Italy'] }), apiQuestion({ id: 'ok' })]] });
    const questions = await theTriviaApi.fetch(10, settings());
    expect(questions.map(q => q.id)).toEqual(['tapi:ok']);
  });

  it('fails on an error response', async () => {
    mockFetch({ '/v2/questions': [{ status: 429, body: {} }] });
    await expect(theTriviaApi.fetch(10, settings())).rejects.toThrow('429');
  });
});
