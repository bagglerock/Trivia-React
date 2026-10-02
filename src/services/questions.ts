import { Question, Settings } from '../game/types';
import { BACKUP_QUESTIONS } from './backupQuestions';
import { categoryById } from './categories';
import { questionBank } from './questionBank';
import { openTriviaDb } from './sources/openTriviaDb';
import { theTriviaApi } from './sources/theTriviaApi';
import { QuestionSource, RawQuestion } from './sources/types';
import { hash, sameQuestionKey, shuffle } from './util';

export { CATEGORIES } from './categories';
export { shuffle } from './util';

export const SOURCES: QuestionSource[] = [openTriviaDb, theTriviaApi];

/** Fewer than this and it's not really a game. */
export const MIN_QUESTIONS = 5;

export class NotEnoughQuestionsError extends Error {
  constructor() {
    super('Not enough questions for that category/difficulty combo. Try a different mix.');
  }
}

export interface LoadResult {
  questions: Question[];
  /** Shown above the game when something's not quite normal (offline, short game…). */
  notice: string | null;
}

const toQuestion = (q: RawQuestion): Question => {
  const answers = shuffle([q.correct, ...q.wrong]);
  return { id: q.id, category: q.category, difficulty: q.difficulty, text: q.text, answers, correctIndex: answers.indexOf(q.correct) };
};

const builtInQuestions = (): RawQuestion[] =>
  BACKUP_QUESTIONS.map(([category, text, correct, ...wrong]) => ({
    id: `builtin:${hash(text)}`,
    source: 'builtin',
    category,
    categoryIds: [],
    difficulty: 'medium',
    text,
    correct,
    wrong,
  }));

/** Take one from each list in turn, so a game mixes sources. */
const interleave = <T,>(lists: T[][]): T[] => {
  const out: T[] = [];
  for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => i < l.length && out.push(l[i]));
  return out;
};

/** Adds questions to `chosen` until it has `count`, skipping any it already has (same id or same wording). */
const fill = (chosen: RawQuestion[], count: number, more: RawQuestion[]) => {
  const ids = new Set(chosen.map(q => q.id));
  const texts = new Set(chosen.map(q => sameQuestionKey(q.text)));
  for (const q of more) {
    if (chosen.length >= count) break;
    const key = sameQuestionKey(q.text);
    if (ids.has(q.id) || texts.has(key)) continue;
    chosen.push(q);
    ids.add(q.id);
    texts.add(key);
  }
};

/**
 * Gets a game's worth of questions:
 * 1. asks every source that covers the category, at the same time;
 * 2. saves everything they send to the question bank (more than we need — that's the offline stash);
 * 3. plays questions we haven't seen yet first, topping up from the bank;
 * 4. with no connection at all, plays from the bank — or, for "Anything goes", the built-in set.
 */
export const loadQuestions = async (settings: Settings, signal?: AbortSignal): Promise<LoadResult> => {
  const count = settings.questionCount;
  const filter = { categoryId: settings.category, difficulty: settings.difficulty };
  const sources = SOURCES.filter(s => s.supports(settings.category));

  const results = await Promise.allSettled(sources.map(s => s.fetch(count, settings, signal)));
  if (signal?.aborted) throw signal.reason;

  const fetched: RawQuestion[][] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') fetched.push(r.value);
    else console.warn(`${sources[i].name} failed:`, r.reason);
  });
  const online = fetched.length > 0;
  questionBank.add(fetched.flat());

  const seen = questionBank.seenIds();
  const chosen: RawQuestion[] = [];
  fill(chosen, count, interleave(fetched.map(shuffle)).filter(q => !seen.has(q.id)));
  fill(chosen, count, questionBank.pick(count * 2, filter));

  const notices: string[] = [];
  if (!online) notices.push("Can't reach the question servers — playing questions saved from earlier games.");

  if (chosen.length < count && !settings.category) {
    fill(chosen, count, shuffle(builtInQuestions()));
    if (!online) notices.splice(0, 1, "Can't reach the question servers — playing saved and built-in questions.");
  }

  if (chosen.length < Math.min(count, MIN_QUESTIONS)) {
    if (online) throw new NotEnoughQuestionsError();
    const name = categoryById(settings.category)?.name ?? 'that category';
    throw new Error(
      chosen.length
        ? `Can't reach the question servers, and only ${chosen.length} ${name} questions are saved. Try "Anything goes" or reconnect.`
        : `Can't reach the question servers, and no ${name} questions are saved yet. Try "Anything goes" or reconnect.`
    );
  }
  if (chosen.length < count) notices.push(`Only ${chosen.length} questions available for that mix — short game!`);

  questionBank.markSeen(chosen.map(q => q.id));
  return { questions: chosen.map(toQuestion), notice: notices.join(' ') || null };
};

/**
 * Called during a game: quietly grabs a big batch for this category and saves it,
 * so the bank keeps growing and there's plenty to play if the connection drops.
 * Uses The Trivia API so it never competes with Open Trivia DB's 5-second rate limit.
 */
export const topUpQuestionBank = async (settings: Settings, signal?: AbortSignal) => {
  try {
    questionBank.add(await theTriviaApi.fetch(50, settings, signal));
  } catch {
    // Offline or refused — that's what the bank is for.
  }
};

export const savedQuestionCount = (categoryId: string | null = null) => questionBank.count({ categoryId, difficulty: null });
