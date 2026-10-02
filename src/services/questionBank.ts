import { RawQuestion } from './sources/types';
import { shuffle } from './util';

/**
 * Every question we fetch is saved here (browser storage), so games can carry on if the connection drops.
 * Each entry remembers when it was last played so we can serve fresh questions first.
 */

const KEY = 'trivia.bank.v1';
/** ~2000 questions is roughly 600KB — comfortably inside localStorage's ~5MB. */
export const BANK_LIMIT = 2000;

interface BankEntry extends RawQuestion {
  savedAt: number;
  seenAt: number | null;
}

export interface BankFilter {
  categoryId: string | null;
  difficulty: string | null;
}

const read = (): BankEntry[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (entries: BankEntry[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Full or unavailable. Try again with half; worst case we just don't cache.
    if (entries.length > 100) write(entries.slice(entries.length / 2));
  }
};

const matches = (q: RawQuestion, { categoryId, difficulty }: BankFilter) =>
  (categoryId === null || q.categoryIds.includes(categoryId)) && (difficulty === null || q.difficulty === difficulty);

/** Oldest-played first; never-played before anything played. */
const byStaleness = (a: BankEntry, b: BankEntry) => (a.seenAt ?? -Infinity) - (b.seenAt ?? -Infinity);

export const questionBank = {
  /** Save questions (merging with what's there) and trim to the size limit. */
  add(questions: RawQuestion[], now = Date.now()) {
    if (!questions.length) return;
    const byId = new Map(read().map(e => [e.id, e]));
    for (const q of questions) {
      const existing = byId.get(q.id);
      byId.set(q.id, { ...q, savedAt: existing?.savedAt ?? now, seenAt: existing?.seenAt ?? null });
    }
    let entries = [...byId.values()];
    if (entries.length > BANK_LIMIT) {
      // Drop the questions we've played most recently first — they're the least useful to keep.
      entries = entries.sort(byStaleness).slice(0, BANK_LIMIT);
    }
    write(entries);
  },

  /** Up to `count` questions matching the filter, least-recently-played first (random within ties). */
  pick(count: number, filter: BankFilter, excludeIds: Set<string> = new Set()): RawQuestion[] {
    const candidates = shuffle(read().filter(e => matches(e, filter) && !excludeIds.has(e.id))).sort(byStaleness);
    return candidates.slice(0, count).map(({ savedAt, seenAt, ...q }) => q);
  },

  /** Has this question been played before? */
  seenIds(): Set<string> {
    return new Set(read().filter(e => e.seenAt !== null).map(e => e.id));
  },

  markSeen(ids: string[], now = Date.now()) {
    const wanted = new Set(ids);
    write(read().map(e => (wanted.has(e.id) ? { ...e, seenAt: now } : e)));
  },

  count(filter?: BankFilter): number {
    const entries = read();
    return filter ? entries.filter(e => matches(e, filter)).length : entries.length;
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nothing to do
    }
  },
};
