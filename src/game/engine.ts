import { GameState, PlayerAnswer, Question, Settings } from './types';

export const MAX_POINTS = 1000;
export const MIN_POINTS = 100;

export const DEFAULT_SETTINGS: Settings = {
  playerCount: 2,
  names: ['Player 1', 'Player 2'],
  questionCount: 10,
  secondsPerQuestion: 15,
  category: null,
  difficulty: null,
};

/** Points on offer right now: falls from MAX_POINTS to MIN_POINTS as the clock runs out. */
export const pointsAt = (elapsedMs: number, durationMs: number): number => {
  const remaining = Math.min(1, Math.max(0, 1 - elapsedMs / durationMs));
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * remaining);
};

export type Action =
  | { type: 'START'; settings: Settings }
  | { type: 'LOADED'; questions: Question[]; notice: string | null; now: number }
  | { type: 'LOAD_FAILED'; error: string }
  | { type: 'BEGIN_QUESTION'; now: number }
  | { type: 'ANSWER'; player: number; choice: number; now: number }
  | { type: 'TIME_UP'; now: number }
  | { type: 'NEXT'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'NEW_GAME' };

export const initialState = (settings: Settings = DEFAULT_SETTINGS): GameState => ({
  phase: 'setup',
  settings,
  questions: [],
  index: 0,
  phaseStartedAt: null,
  pausedAt: null,
  results: [],
  notice: null,
  error: null,
});

const PAUSABLE = ['loading', 'intro', 'question', 'reveal'];

/** Actions that move the game clock along; ignored while paused. */
const CLOCKED = ['BEGIN_QUESTION', 'ANSWER', 'TIME_UP', 'NEXT'];

export const reducer = (state: GameState, action: Action): GameState => {
  if (state.pausedAt !== null && CLOCKED.includes(action.type)) return state;

  switch (action.type) {
    case 'PAUSE':
      if (state.pausedAt !== null || !PAUSABLE.includes(state.phase)) return state;
      return { ...state, pausedAt: action.now };

    case 'RESUME': {
      if (state.pausedAt === null) return state;
      const pausedFor = action.now - state.pausedAt;
      return {
        ...state,
        pausedAt: null,
        phaseStartedAt: state.phaseStartedAt === null ? null : state.phaseStartedAt + pausedFor,
      };
    }

    case 'START':
      return { ...initialState(action.settings), phase: 'loading' };

    case 'NEW_GAME':
      return initialState(state.settings);

    case 'LOAD_FAILED':
      return { ...state, phase: 'setup', error: action.error };

    case 'LOADED':
      if (state.phase !== 'loading') return state;
      return {
        ...state,
        phase: 'intro',
        phaseStartedAt: action.now,
        questions: action.questions,
        notice: action.notice,
        results: action.questions.map(() => Array(state.settings.playerCount).fill(null)),
      };

    case 'BEGIN_QUESTION':
      if (state.phase !== 'intro') return state;
      return { ...state, phase: 'question', phaseStartedAt: action.now };

    case 'ANSWER': {
      const { player, choice, now } = action;
      const current = state.results[state.index];
      const question = state.questions[state.index];
      if (state.phase !== 'question' || state.phaseStartedAt === null) return state;
      if (player >= state.settings.playerCount || current[player] !== null) return state;
      if (choice < 0 || choice >= question.answers.length) return state;

      const durationMs = state.settings.secondsPerQuestion * 1000;
      const elapsedMs = Math.min(durationMs, Math.max(0, now - state.phaseStartedAt));
      const correct = choice === question.correctIndex;
      const answer: PlayerAnswer = { choice, elapsedMs, correct, points: correct ? pointsAt(elapsedMs, durationMs) : 0 };

      const updated = current.map((a, i) => (i === player ? answer : a));
      const results = state.results.map((r, i) => (i === state.index ? updated : r));
      const everyoneAnswered = updated.every(a => a !== null);

      if (!everyoneAnswered) return { ...state, results };
      return { ...state, results, phase: 'reveal', phaseStartedAt: now };
    }

    case 'TIME_UP':
      if (state.phase !== 'question') return state;
      return { ...state, phase: 'reveal', phaseStartedAt: action.now };

    case 'NEXT':
      if (state.phase !== 'reveal') return state;
      if (state.index >= state.questions.length - 1) return { ...state, phase: 'final', phaseStartedAt: action.now };
      return { ...state, phase: 'intro', index: state.index + 1, phaseStartedAt: action.now };

    default:
      return state;
  }
};

// ---- Derived data ----

export const scoreFor = (state: GameState, player: number, throughIndex = state.results.length - 1): number =>
  state.results.slice(0, throughIndex + 1).reduce((sum, r) => sum + (r[player]?.points ?? 0), 0);

/** Scores that should be on the board right now — the current question only counts once it's revealed. */
export const visibleScores = (state: GameState): number[] => {
  const through = state.phase === 'reveal' || state.phase === 'final' ? state.index : state.index - 1;
  return Array.from({ length: state.settings.playerCount }, (_, p) => scoreFor(state, p, through));
};

export interface PlayerStats {
  name: string;
  score: number;
  correct: number;
  answered: number;
  fastestMs: number | null;
  averageCorrectMs: number | null;
}

export const statsFor = (state: GameState, player: number): PlayerStats => {
  const answers = state.results.map(r => r[player]).filter((a): a is PlayerAnswer => a !== null);
  const correctTimes = answers.filter(a => a.correct).map(a => a.elapsedMs);
  return {
    name: state.settings.names[player],
    score: scoreFor(state, player),
    correct: correctTimes.length,
    answered: answers.length,
    fastestMs: correctTimes.length ? Math.min(...correctTimes) : null,
    averageCorrectMs: correctTimes.length ? correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length : null,
  };
};
