import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../game/engine';
import { Settings } from '../../game/types';
import { mockFetch } from '../../test/fetchMock';

type Module = typeof import('./openTriviaDb');

const apiQuestion = (overrides: Record<string, unknown> = {}) => ({
  category: 'Entertainment: Video Games',
  type: 'multiple',
  difficulty: 'easy',
  question: 'Who&#039;s the &quot;hero&quot; of Zelda?',
  correct_answer: 'Link',
  incorrect_answers: ['Zelda', 'Ganon', 'Epona'],
  ...overrides,
});
const ok = (...results: unknown[]) => ({ response_code: 0, results });
const code = (response_code: number) => ({ response_code, results: [] });
const token = (t = 'tok') => ({ response_code: 0, token: t });

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch });

let source: Module['openTriviaDb'];

beforeEach(async () => {
  vi.resetModules(); // fresh rate-limit state
  vi.useFakeTimers();
  source = (await import('./openTriviaDb')).openTriviaDb;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Open Trivia DB source', () => {
  it('decodes HTML entities, tidies the category and tags it with our category id', async () => {
    mockFetch({ '/api_token.php': [token()], '/api.php': [ok(apiQuestion())] });
    const [q] = await source.fetch(10, settings());

    expect(q).toMatchObject({
      source: 'otdb',
      text: 'Who\'s the "hero" of Zelda?',
      category: 'Video Games',
      categoryIds: ['video-games'],
      correct: 'Link',
      wrong: ['Zelda', 'Ganon', 'Epona'],
    });
    expect(q.id).toMatch(/^otdb:/);
  });

  it('sends amount, category, difficulty and the session token', async () => {
    const api = mockFetch({ '/api_token.php': [token('abc123')], '/api.php': [ok(apiQuestion())] });
    await source.fetch(20, settings({ category: 'animals', difficulty: 'hard' }));

    expect(Object.fromEntries(api.to('/api.php')[0].searchParams)).toEqual({
      amount: '20',
      type: 'multiple',
      category: '27',
      difficulty: 'hard',
      token: 'abc123',
    });
    expect(localStorage.getItem('trivia.opentdb.token')).toBe('abc123');
  });

  it("doesn't cover categories it has no equivalent for", () => {
    expect(source.supports('food')).toBe(false);
    expect(source.supports('animals')).toBe(true);
    expect(source.supports(null)).toBe(true);
  });

  it('reuses a saved session token', async () => {
    localStorage.setItem('trivia.opentdb.token', 'saved');
    const api = mockFetch({ '/api.php': [ok(apiQuestion())] });
    await source.fetch(10, settings());

    expect(api.to('/api_token.php')).toHaveLength(0);
    expect(api.to('/api.php')[0].searchParams.get('token')).toBe('saved');
  });

  it('spaces back-to-back requests at least 5 seconds apart', async () => {
    mockFetch({ '/api_token.php': [token()], '/api.php': [ok(apiQuestion())] });
    await source.fetch(10, settings());

    let done = false;
    const second = source.fetch(10, settings()).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    await second;
    expect(done).toBe(true);
  });

  it('waits and retries when rate limited', async () => {
    const api = mockFetch({ '/api_token.php': [token()], '/api.php': [code(5), ok(apiQuestion())] });
    const result = source.fetch(10, settings());
    await vi.advanceTimersByTimeAsync(6000);

    expect(await result).toHaveLength(1);
    expect(api.to('/api.php')).toHaveLength(2);
  });

  it('requests a new token when the saved one has expired', async () => {
    localStorage.setItem('trivia.opentdb.token', 'stale');
    const api = mockFetch({ '/api_token.php': [token('fresh')], '/api.php': [code(3), ok(apiQuestion())] });
    const result = source.fetch(10, settings());
    await vi.advanceTimersByTimeAsync(6000);
    await result;

    expect(api.to('/api.php').map(c => c.searchParams.get('token'))).toEqual(['stale', 'fresh']);
  });

  it('resets an exhausted token once, then returns nothing rather than failing', async () => {
    const api = mockFetch({ '/api_token.php': [token()], '/api.php': [code(4), code(1)] });
    const result = source.fetch(10, settings({ category: 'animals' }));
    await vi.advanceTimersByTimeAsync(6000);

    expect(await result).toEqual([]);
    expect(api.calls.some(c => c.searchParams.get('command') === 'reset')).toBe(true);
  });

  it('fails when the server is unreachable', async () => {
    mockFetch({ '/api_token.php': [new TypeError('Failed to fetch')], '/api.php': [new TypeError('Failed to fetch')] });
    await expect(source.fetch(10, settings())).rejects.toThrow('Failed to fetch');
  });

  it('stops when cancelled while waiting its turn', async () => {
    mockFetch({ '/api_token.php': [token()], '/api.php': [ok(apiQuestion())] });
    await source.fetch(10, settings()); // use the rate-limit slot

    const controller = new AbortController();
    const result = source.fetch(10, settings(), controller.signal);
    const assertion = expect(result).rejects.toBeDefined();
    controller.abort();
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(2); // token + first request only
  });
});
