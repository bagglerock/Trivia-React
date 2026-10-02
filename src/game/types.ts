export interface Question {
  id: string;
  category: string;
  difficulty: string;
  text: string;
  answers: string[];
  correctIndex: number;
}

export interface Settings {
  playerCount: 1 | 2;
  names: [string, string];
  questionCount: number;
  secondsPerQuestion: number;
  /** One of CATEGORIES' ids, or null for anything. */
  category: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

/** One player's response to one question. */
export interface PlayerAnswer {
  choice: number;
  elapsedMs: number;
  correct: boolean;
  points: number;
}

export type Phase = 'setup' | 'loading' | 'intro' | 'question' | 'reveal' | 'final';

export interface GameState {
  phase: Phase;
  settings: Settings;
  questions: Question[];
  index: number;
  /** performance.now() when the current phase began, shifted forward by any time spent paused. */
  phaseStartedAt: number | null;
  /** Non-null while paused: when the pause began. */
  pausedAt: number | null;
  /** results[questionIndex][playerIndex]; null means no answer before time ran out. */
  results: (PlayerAnswer | null)[][];
  /** Shown above the game when something's not quite normal (offline, short game…). */
  notice: string | null;
  error: string | null;
}
