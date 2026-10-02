import { categoryById, categoryIdsForTriviaApi } from '../categories';
import { QuestionSource, RawQuestion } from './types';

const API = 'https://the-trivia-api.com/v2';
const MAX_PER_REQUEST = 50;

/** Display names for The Trivia API's category slugs. */
const CATEGORY_NAMES: Record<string, string> = {
  arts_and_literature: 'Arts & Literature',
  film_and_tv: 'Film & TV',
  food_and_drink: 'Food & Drink',
  general_knowledge: 'General Knowledge',
  geography: 'Geography',
  history: 'History',
  music: 'Music',
  science: 'Science',
  society_and_culture: 'Society & Culture',
  sport_and_leisure: 'Sport & Leisure',
};

const toRaw = (q: any, requestedCategory: string | null): RawQuestion => {
  const ids = categoryIdsForTriviaApi(q.category, q.tags ?? []);
  const ours = categoryById(requestedCategory);
  return {
    id: `tapi:${q.id}`,
    source: 'tapi',
    category: ours?.name ?? CATEGORY_NAMES[q.category] ?? q.category,
    categoryIds: requestedCategory && !ids.includes(requestedCategory) ? [...ids, requestedCategory] : ids,
    difficulty: q.difficulty,
    text: q.question.text.trim(),
    correct: q.correctAnswer.trim(),
    wrong: q.incorrectAnswers.map((a: string) => a.trim()),
  };
};

/**
 * The Trivia API (https://the-trivia-api.com) — free for non-commercial use under CC BY-NC 4.0.
 */
export const theTriviaApi: QuestionSource = {
  name: 'The Trivia API',

  supports: () => true, // every one of our categories maps onto it

  async fetch(count, settings, signal) {
    const filter = categoryById(settings.category)?.triviaApi;
    const params = new URLSearchParams({ limit: String(Math.min(count, MAX_PER_REQUEST)), types: 'text_choice' });
    if (filter?.categories) params.set('categories', filter.categories.join(','));
    if (filter?.tags) params.set('tags', filter.tags.join(','));
    if (settings.difficulty) params.set('difficulties', settings.difficulty);

    const res = await fetch(`${API}/questions?${params}`, { signal });
    if (!res.ok) throw new Error(`The Trivia API responded ${res.status}`);
    const json = await res.json();
    return (json as any[]).filter(q => q.incorrectAnswers?.length === 3).map(q => toRaw(q, settings.category));
  },
};
