export type DemographicType = 'shounen' | 'shoujo' | 'josei' | 'seinen' | 'none';
export type PublicationStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export interface MangaTag {
  id: string;
  name: string;
  group: 'genre' | 'theme' | 'format' | 'content';
}

export interface AuthorOption {
  id: string;
  name: string;
}

export interface MangaItem {
  id: string;
  title: string;
  altTitle?: string;
  description: string;
  status: PublicationStatus;
  year: number | null;
  demographic: DemographicType;
  contentRating: string;
  originalLanguage: string;
  availableLanguages: string[];
  tags: MangaTag[];
  author: string;
  authorId?: string;
  artist: string;
  artistId?: string;
  coverFileName: string | null;
  coverUrl: string | null;
  coverUrlLarge: string | null;
  rating?: number;
  follows?: number;
}

export interface ChapterItem {
  id: string;
  volume: string | null;
  chapter: string | null;
  title: string;
  translatedLanguage: string;
  pages: number;
  publishAt: string;
  scanlationGroup: string;
  externalUrl: string | null;
}

export type SearchSortOption =
  | 'popular'
  | 'latest'
  | 'rating'
  | 'relevance'
  | 'newest'
  | 'title_asc'
  | 'year_desc';

export type SearchTargetMode = 'all' | 'title' | 'author';

export interface SearchFilters {
  query: string;
  searchTarget: SearchTargetMode;
  authorQuery: string;
  selectedAuthor: AuthorOption | null;
  status: 'all' | PublicationStatus;
  demographic: 'all' | 'shounen' | 'seinen' | 'shoujo' | 'josei';
  sort: SearchSortOption;
  language: 'all' | 'id' | 'en' | 'ja';
  tagIds: string[];
  tagMode: 'AND' | 'OR';
  year: string;
  contentRating: 'safe_suggestive' | 'safe_only';
  offset: number;
  limit: number;
}

export interface ChapterProgress {
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string;
  currentPage: number;
  totalPages: number;
  completed: boolean;
  readAt: number;
}

export interface ReadingHistoryEntry {
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  author: string;
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string;
  volume: string | null;
  language: string;
  currentPage: number;
  totalPages: number;
  updatedAt: number;
}

export type LibraryReadingStatus = 'reading' | 'plan_to_read' | 'completed' | 'on_hold';

export interface LibraryEntry {
  mangaId: string;
  mangaTitle: string;
  coverUrl: string | null;
  author: string;
  year: number | null;
  publicationStatus: PublicationStatus;
  readingStatus: LibraryReadingStatus;
  addedAt: number;
  updatedAt: number;
  personalNote?: string;
}

export type ReaderMode = 'vertical' | 'single-ltr' | 'single-rtl';
export type ReaderFit = 'optimal' | 'full' | 'screen';
export type ReaderBackground = 'ink' | 'charcoal' | 'paper';

export interface ReaderSettings {
  mode: ReaderMode;
  fit: ReaderFit;
  dataSaver: boolean;
  showPageIndicator: boolean;
  background: ReaderBackground;
}
