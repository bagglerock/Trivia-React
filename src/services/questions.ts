import { Question, Settings } from '../game/types';
import { BACKUP_QUESTIONS } from './backupQuestions';

const API = 'https://opentdb.com';
const TOKEN_KEY = 'trivia.opentdb.token';

export const CATEGORIES: { id: number; name: string }[] = [
  { id: 27, name: 'Animals' },
  { id: 10, name: 'Books' },
  { id: 18, name: 'Computers' },
  { id: 11, name: 'Film' },
  { id: 9, name: 'General Knowledge' },
  { id: 22, name: 'Geography' },
  { id: 23, name: 'History' },
  { id: 12, name: 'Music' },
  { id: 17, name: 'Science & Nature' },
  { id: 21, name: 'Sports' },
  { id: 14, name: 'Television' },
  { id: 15, name: 'Video Games' },
];

export const shuffle = <T>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const decode = (html: string): string => new DOMParser().parseFromString(html, 'text/html').documentElement.textContent ?? html;

const buildQuestion = (category: string, difficulty: string, text: string, correct: string, wrong: string[]): Question => {
  const answers = shuffle([correct, ...wrong]);
  return { category, difficulty, text, answers, correctIndex: answers.indexOf(correct) };
};

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

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

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

const fetchFromApi = async (settings: Settings, signal?: AbortSignal): Promise<Question[]> => {
  let token = readToken() ?? (await requestToken(signal).catch(() => null));
  let tokenWasReset = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    const params = new URLSearchParams({ amount: String(settings.questionCount), type: 'multiple' });
    if (settings.category) params.set('category', String(settings.category));
    if (settings.difficulty) params.set('difficulty', settings.difficulty);
    if (token) params.set('token', token);

    await waitForSlot(signal);
    const res = await fetch(`${API}/api.php?${params}`, { signal });
    const json = await res.json();

    switch (json.response_code) {
      case OK:
        return json.results.map((r: any) =>
          buildQuestion(
            decode(r.category).replace(/^Entertainment: /, ''),
            r.difficulty,
            decode(r.question),
            decode(r.correct_answer),
            r.incorrect_answers.map(decode)
          )
        );
      case NO_RESULTS:
      case TOKEN_EMPTY:
        // With a token, "no results" can just mean we've already seen most of this category. Start fresh once.
        if (token && !tokenWasReset) {
          await resetToken(token, signal);
          tokenWasReset = true;
          break;
        }
        throw new NotEnoughQuestionsError();
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
};

export class NotEnoughQuestionsError extends Error {
  constructor() {
    super('Not enough questions for that category/difficulty combo. Try a different mix.');
  }
}

const backupQuestions = (count: number): Question[] =>
  shuffle(BACKUP_QUESTIONS)
    .slice(0, count)
    .map(([category, text, correct, ...wrong]) => buildQuestion(category, 'medium', text, correct, wrong));

/**
 * Fetches questions. If the API is unreachable and no category was picked, falls back to the built-in set;
 * with a category picked we'd rather say so than serve off-topic questions.
 */
export const loadQuestions = async (
  settings: Settings,
  signal?: AbortSignal
): Promise<{ questions: Question[]; usingBackup: boolean }> => {
  try {
    return { questions: await fetchFromApi(settings, signal), usingBackup: false };
  } catch (e) {
    if (signal?.aborted || e instanceof NotEnoughQuestionsError) throw e;
    console.warn('Question server failed:', e);
    if (settings.category) {
      throw new Error("Couldn't reach the question server for that category. Give it a few seconds and hit Start again.");
    }
    return { questions: backupQuestions(settings.questionCount), usingBackup: true };
  }
};
