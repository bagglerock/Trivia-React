export interface Question {
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
  category: number | null;
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
  questionStartedAt: number | null;
  /** results[questionIndex][playerIndex]; null means no answer before time ran out. */
  results: (PlayerAnswer | null)[][];
  usingBackupQuestions: boolean;
  error: string | null;
}
