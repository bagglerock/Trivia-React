import { categoryById, categoryIdsForOpenTriviaDb } from '../categories';
import { hash, sleep } from '../util';
import { QuestionSource, RawQuestion } from './types';

const API = 'https://opentdb.com';
const TOKEN_KEY = 'trivia.opentdb.token';
const MAX_PER_REQUEST = 50;

/** Open Trivia DB only gives category names in results; map them back to its ids. */
const CATEGORY_IDS_BY_NAME: Record<string, number> = {
  'General Knowledge': 9,
  'Entertainment: Books': 10,
  'Entertainment: Film': 11,
  'Entertainment: Music': 12,
  'Entertainment: Television': 14,
  'Entertainment: Video Games': 15,
  'Science & Nature': 17,
  'Science: Computers': 18,
  Sports: 21,
  Geography: 22,
  History: 23,
  Animals: 27,
};

const decode = (html: string): string => new DOMParser().parseFromString(html, 'text/html').documentElement.textContent ?? html;

// ---- Session token: stops Open Trivia DB from repeating questions across games ----

const readToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const saveToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable; we just won't dedupe across games
  }
};

const requestToken = async (signal?: AbortSignal): Promise<string | null> => {
  const res = await fetch(`${API}/api_token.php?command=request`, { signal });
  const json = await res.json();
  const token = json.response_code === 0 ? (json.token as string) : null;
  saveToken(token);
  return token;
};

const resetToken = async (token: string, signal?: AbortSignal) => {
  await fetch(`${API}/api_token.php?command=reset&token=${token}`, { signal });
};

// Open Trivia DB allows one question request per IP every 5 seconds, so space them out up front.
const MIN_GAP_MS = 5200;
let nextSlot = 0;

const waitForSlot = async (signal?: AbortSignal) => {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS;
  if (wait) await sleep(wait, signal);
};

// Open Trivia DB response codes
const OK = 0;
const NO_RESULTS = 1;
const TOKEN_NOT_FOUND = 3;
const TOKEN_EMPTY = 4;
const RATE_LIMITED = 5;

const toRaw = (r: any, requestedCategory: string | null): RawQuestion => {
  const sourceCategory = decode(r.category);
  const text = decode(r.question);
  const ids = categoryIdsForOpenTriviaDb(CATEGORY_IDS_BY_NAME[sourceCategory]);
  return {
    id: `otdb:${hash(text)}`,
    source: 'otdb',
    category: sourceCategory.replace(/^(Entertainment|Science): /, ''),
    categoryIds: requestedCategory && !ids.includes(requestedCategory) ? [...ids, requestedCategory] : ids,
    difficulty: r.difficulty,
    text,
    correct: decode(r.correct_answer).trim(),
    wrong: r.incorrect_answers.map((a: string) => decode(a).trim()),
  };
};

export const openTriviaDb: QuestionSource = {
  name: 'Open Trivia DB',

  supports: categoryId => categoryId === null || categoryById(categoryId)?.openTriviaDb !== undefined,

  async fetch(count, settings, signal) {
    const sourceCategory = categoryById(settings.category)?.openTriviaDb;
    let token = readToken() ?? (await requestToken(signal).catch(() => null));
    let tokenWasReset = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const params = new URLSearchParams({ amount: String(Math.min(count, MAX_PER_REQUEST)), type: 'multiple' });
      if (sourceCategory) params.set('category', String(sourceCategory));
      if (settings.difficulty) params.set('difficulty', settings.difficulty);
      if (token) params.set('token', token);

      await waitForSlot(signal);
      const res = await fetch(`${API}/api.php?${params}`, { signal });
      const json = await res.json();

      switch (json.response_code) {
        case OK:
          return json.results.map((r: any) => toRaw(r, settings.category));
        case NO_RESULTS:
        case TOKEN_EMPTY:
          // With a token, "no results" can just mean we've already seen most of this category. Start fresh once.
          if (token && !tokenWasReset) {
            await resetToken(token, signal);
            tokenWasReset = true;
            break;
          }
          return [];
        case TOKEN_NOT_FOUND:
          token = await requestToken(signal);
          break;
        case RATE_LIMITED:
          nextSlot = Date.now() + MIN_GAP_MS;
          break;
        default:
          throw new Error(`Open Trivia DB response code ${json.response_code}`);
      }
    }
    throw new Error('Open Trivia DB kept refusing the request');
  },
};
