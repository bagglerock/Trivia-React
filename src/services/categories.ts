/**
 * Our categories, and how to ask each question source for them.
 * Keep this list alphabetical by name — it's shown as-is in the setup menu.
 */
export interface Category {
  id: string;
  name: string;
  /** Open Trivia DB category id, if it has one. */
  openTriviaDb?: number;
  /** The Trivia API filter: whole categories, or tags (comma-joined = any of). */
  triviaApi: { categories?: string[]; tags?: string[] };
}

export const CATEGORIES: Category[] = [
  { id: 'animals', name: 'Animals', openTriviaDb: 27, triviaApi: { tags: ['animals'] } },
  { id: 'books', name: 'Books', openTriviaDb: 10, triviaApi: { tags: ['books', 'literature'] } },
  { id: 'computers', name: 'Computers', openTriviaDb: 18, triviaApi: { tags: ['computing', 'computers', 'computer_science'] } },
  { id: 'film', name: 'Film', openTriviaDb: 11, triviaApi: { tags: ['film', 'films', 'movies'] } },
  { id: 'food', name: 'Food & Drink', triviaApi: { categories: ['food_and_drink'] } },
  { id: 'general', name: 'General Knowledge', openTriviaDb: 9, triviaApi: { categories: ['general_knowledge'] } },
  { id: 'geography', name: 'Geography', openTriviaDb: 22, triviaApi: { categories: ['geography'] } },
  { id: 'history', name: 'History', openTriviaDb: 23, triviaApi: { categories: ['history'] } },
  { id: 'music', name: 'Music', openTriviaDb: 12, triviaApi: { categories: ['music'] } },
  { id: 'science', name: 'Science & Nature', openTriviaDb: 17, triviaApi: { categories: ['science'] } },
  { id: 'society', name: 'Society & Culture', triviaApi: { categories: ['society_and_culture'] } },
  { id: 'sports', name: 'Sports', openTriviaDb: 21, triviaApi: { categories: ['sport_and_leisure'] } },
  { id: 'television', name: 'Television', openTriviaDb: 14, triviaApi: { tags: ['tv', 'television'] } },
  { id: 'video-games', name: 'Video Games', openTriviaDb: 15, triviaApi: { tags: ['video_games'] } },
];

export const categoryById = (id: string | null): Category | undefined => CATEGORIES.find(c => c.id === id);

/** Which of our categories a question from Open Trivia DB belongs to. */
export const categoryIdsForOpenTriviaDb = (sourceCategoryId: number | undefined): string[] =>
  CATEGORIES.filter(c => c.openTriviaDb !== undefined && c.openTriviaDb === sourceCategoryId).map(c => c.id);

/** Which of our categories a question from The Trivia API belongs to, given its category and tags. */
export const categoryIdsForTriviaApi = (category: string, tags: string[]): string[] =>
  CATEGORIES.filter(c => c.triviaApi.categories?.includes(category) || c.triviaApi.tags?.some(t => tags.includes(t))).map(c => c.id);
