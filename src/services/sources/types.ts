import { Settings } from '../../game/types';

/** A question as stored in the bank: answers unshuffled, correct one known. */
export interface RawQuestion {
  /** Source-prefixed, e.g. "otdb:3k2j1" or "tapi:622a1c3b…". */
  id: string;
  source: 'otdb' | 'tapi' | 'builtin';
  /** Display name. */
  category: string;
  /** Which of our categories this counts for, so offline games can filter. */
  categoryIds: string[];
  difficulty: string;
  text: string;
  correct: string;
  wrong: string[];
}

export interface QuestionSource {
  name: string;
  /** Can this source serve the given category (null = anything)? */
  supports: (categoryId: string | null) => boolean;
  fetch: (count: number, settings: Settings, signal?: AbortSignal) => Promise<RawQuestion[]>;
}
