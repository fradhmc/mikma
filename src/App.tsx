import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Shuffle,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import {
  AuthorOption,
  ChapterItem,
  MangaItem,
  ReadingHistoryEntry,
  SearchFilters,
} from './types/manga';
import {
  fetchMangaById,
  fetchMangaChapters,
  fetchMangaList,
  fetchRandomManga,
} from './services/mangadex';
import {
  getLibrary,
  getReadingHistory,
  getUiTheme,
  setUiTheme,
} from './services/localStorage';
import { CoverImage } from './components/CoverImage';
import { SearchAndFilterPanel } from './components/SearchAndFilterPanel';
import { MangaDetailView } from './components/MangaDetailView';
import { MangaReader } from './components/MangaReader';
import { HistoryAndLibraryView } from './components/HistoryAndLibraryView';

const INITIAL_FILTERS: SearchFilters = {
  query: '',
  searchTarget: 'all',
  authorQuery: '',
  selectedAuthor: null,
  status: 'all',
  demographic: 'all',
  sort: 'popular',
  language: 'all',
  tagIds: [],
  tagMode: 'AND',
  year: '',
  contentRating: 'safe_suggestive',
  offset: 0,
  limit: 24,
};

const STATUS_SHORT: Record<string, string> = {
  ongoing: 'Ongoing',
  completed: 'Completed',
  hiatus: 'Hiatus',
  cancelled: 'Cancelled',
};

type ActiveRoute =
  | { view: 'catalog' }
  | { view: 'detail'; manga: MangaItem }
  | {
      view: 'reader';
      manga: MangaItem;
      chapter: ChapterItem;
      allChapters: ChapterItem[];
      startPage: number;
    }
  | { view: 'local'; tab: 'history' | 'library' | 'backup' };

export default function App() {
  const [theme, setTheme] = useState<'paper' | 'ink'>(() => getUiTheme());
  const [route, setRoute] = useState<ActiveRoute>({ view: 'catalog' });
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [mangaList, setMangaList] = useState<MangaItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [resolvedAuthor, setResolvedAuthor] = useState<AuthorOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [randomLoading, setRandomLoading] = useState(false);

  const [history, setHistory] = useState<ReadingHistoryEntry[]>(() => getReadingHistory());
  const [libraryCount, setLibraryCount] = useState<number>(() => getLibrary().length);

  // Sync theme with root HTML class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'ink') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'paper' ? 'ink' : 'paper';
    setTheme(next);
    setUiTheme(next);
  };

  // Sync local history & library counts
  useEffect(() => {
    const syncStorage = () => {
      setHistory(getReadingHistory());
      setLibraryCount(getLibrary().length);
    };
    window.addEventListener('kurohon-storage-update', syncStorage);
    return () => window.removeEventListener('kurohon-storage-update', syncStorage);
  }, []);

  // Load manga catalog whenever filters change
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMangaList(filters);
      setMangaList(res.items);
      setTotalResults(res.total);
      setResolvedAuthor(res.resolvedAuthor || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat katalog dari MangaDex API.'
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleSelectManga = (manga: MangaItem) => {
    setRoute({ view: 'detail', manga });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMangaById = async (mangaId: string) => {
    const existing = mangaList.find((m) => m.id === mangaId);
    if (existing) {
      handleSelectManga(existing);
      return;
    }
    try {
      setLoading(true);
      const fetched = await fetchMangaById(mangaId);
      setRoute({ view: 'detail', manga: fetched });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka detail manga.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChapter = (
    manga: MangaItem,
    chapter: ChapterItem,
    allChapters: ChapterItem[],
    startPage = 0
  ) => {
    setRoute({
      view: 'reader',
      manga,
      chapter,
      allChapters,
      startPage,
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleResumeHistoryEntry = async (entry: ReadingHistoryEntry) => {
    try {
      setLoading(true);
      const [manga, chapterFeed] = await Promise.all([
        fetchMangaById(entry.mangaId),
        fetchMangaChapters(entry.mangaId, {
          languages: ['id', 'en'],
          order: 'desc',
          offset: 0,
          limit: 100,
        }),
      ]);

      const targetChapter: ChapterItem =
        chapterFeed.chapters.find((c) => c.id === entry.chapterId) || {
          id: entry.chapterId,
          volume: entry.volume,
          chapter: entry.chapterNumber,
          title: entry.chapterTitle,
          translatedLanguage: entry.language,
          pages: entry.totalPages,
          publishAt: new Date(entry.updatedAt).toISOString(),
          scanlationGroup: 'Riwayat Lokal',
          externalUrl: null,
        };

      handleOpenChapter(manga, targetChapter, chapterFeed.chapters, entry.currentPage);
    } catch {
      handleOpenMangaById(entry.mangaId);
    } finally {
      setLoading(false);
    }
  };

  const handleSurpriseRandomManga = async () => {
    if (randomLoading) return;
    setRandomLoading(true);
    try {
      const randomItem = await fetchRandomManga();
      setRoute({ view: 'detail', manga: randomItem });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Fallback: pick a random manga from current list
      if (mangaList.length > 0) {
        const pick = mangaList[Math.floor(Math.random() * mangaList.length)];
        handleSelectManga(pick);
      }
    } finally {
      setRandomLoading(false);
    }
  };

  const handleFilterByAuthor = (authorName: string, authorId?: string) => {
    setFilters({
      ...INITIAL_FILTERS,
      selectedAuthor: authorId ? { id: authorId, name: authorName } : null,
      authorQuery: authorId ? '' : authorName,
      offset: 0,
    });
    setRoute({ view: 'catalog' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFilterByTag = (tagId: string) => {
    setFilters((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId) ? prev.tagIds : [...prev.tagIds, tagId],
      offset: 0,
    }));
    setRoute({ view: 'catalog' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If currently in Full-Screen Reader Mode, render MangaReader directly
  if (route.view === 'reader') {
    return (
      <MangaReader
        manga={route.manga}
        chapter={route.chapter}
        allChapters={route.allChapters}
        initialPage={route.startPage}
        onSelectChapter={(nextChap, startPage = 0) =>
          setRoute({
            view: 'reader',
            manga: route.manga,
            chapter: nextChap,
            allChapters: route.allChapters,
            startPage,
          })
        }
        onClose={() => setRoute({ view: 'detail', manga: route.manga })}
      />
    );
  }

  const isDefaultBrowseState =
    !filters.query.trim() &&
    !filters.selectedAuthor &&
    !filters.authorQuery.trim() &&
    filters.tagIds.length === 0 &&
    filters.status === 'all' &&
    filters.demographic === 'all' &&
    filters.language === 'all' &&
    !filters.year.trim() &&
    filters.offset === 0;

  const featuredHeroManga =
    isDefaultBrowseState && mangaList.length > 0 ? mangaList[0] : null;

  const currentPageNumber = Math.floor(filters.offset / filters.limit) + 1;
  const totalPagesCount = Math.max(1, Math.ceil(Math.min(totalResults, 10000) / filters.limit));

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] dark:bg-[#0C0C0E] text-stone-900 dark:text-stone-100 transition-colors duration-200">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 dark:bg-[#0C0C0E]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setFilters(INITIAL_FILTERS);
              setRoute({ view: 'catalog' });
            }}
            className="font-editorial text-2xl sm:text-3xl tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Mikma
          </button>

          {/* Zone 2: 5 Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-400">
            <button
              type="button"
              onClick={() => {
                setRoute({ view: 'catalog' });
              }}
              className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap ${
                route.view === 'catalog' && filters.sort !== 'latest'
                  ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8 decoration-amber-700'
                  : ''
              }`}
            >
              Jelajah Katalog
            </button>

            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, sort: 'popular', offset: 0 }));
                setRoute({ view: 'catalog' });
              }}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap"
            >
              Populer
            </button>

            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, sort: 'latest', offset: 0 }));
                setRoute({ view: 'catalog' });
              }}
              className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap ${
                route.view === 'catalog' && filters.sort === 'latest'
                  ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8 decoration-amber-700'
                  : ''
              }`}
            >
              Update Terbaru
            </button>

            <button
              type="button"
              onClick={() => setRoute({ view: 'local', tab: 'history' })}
              className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap font-tabular ${
                route.view === 'local' && route.tab === 'history'
                  ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8 decoration-amber-700'
                  : ''
              }`}
            >
              Riwayat Baca ({history.length})
            </button>

            <button
              type="button"
              onClick={() => setRoute({ view: 'local', tab: 'library' })}
              className={`hover:text-stone-900 dark:hover:text-stone-100 transition-colors whitespace-nowrap font-tabular ${
                route.view === 'local' && route.tab === 'library'
                  ? 'text-stone-900 dark:text-stone-100 underline underline-offset-8 decoration-amber-700'
                  : ''
              }`}
            >
              Koleksi Lokal ({libraryCount})
            </button>
          </nav>

          {/* Zone 3: 2 Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSurpriseRandomManga}
              disabled={randomLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-300 dark:border-stone-800 rounded hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap"
            >
              <Shuffle className={`w-3.5 h-3.5 ${randomLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Manga Acak</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti Tema Tampilan"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {theme === 'paper' ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Mode Tinta</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>Mode Kertas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Secondary Navigation Strip */}
        <div className="flex md:hidden items-center justify-around border-t border-stone-200 dark:border-stone-800 py-2 px-3 text-xs font-medium text-stone-600 dark:text-stone-400">
          <button
            type="button"
            onClick={() => setRoute({ view: 'catalog' })}
            className={route.view === 'catalog' ? 'text-amber-800 dark:text-amber-400 font-semibold' : ''}
          >
            Katalog
          </button>
          <button
            type="button"
            onClick={() => setRoute({ view: 'local', tab: 'history' })}
            className={
              route.view === 'local' && route.tab === 'history'
                ? 'text-amber-800 dark:text-amber-400 font-semibold'
                : ''
            }
          >
            Riwayat ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setRoute({ view: 'local', tab: 'library' })}
            className={
              route.view === 'local' && route.tab === 'library'
                ? 'text-amber-800 dark:text-amber-400 font-semibold'
                : ''
            }
          >
            Koleksi ({libraryCount})
          </button>
          <button
            type="button"
            onClick={() => setRoute({ view: 'local', tab: 'backup' })}
            className={
              route.view === 'local' && route.tab === 'backup'
                ? 'text-amber-800 dark:text-amber-400 font-semibold'
                : ''
            }
          >
            Cadangan
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {route.view === 'detail' ? (
          <MangaDetailView
            manga={route.manga}
            onBack={() => setRoute({ view: 'catalog' })}
            onOpenChapter={handleOpenChapter}
            onTagSelect={handleFilterByTag}
            onAuthorSelect={handleFilterByAuthor}
          />
        ) : route.view === 'local' ? (
          <HistoryAndLibraryView
            initialTab={route.tab}
            onOpenMangaById={handleOpenMangaById}
            onResumeHistoryEntry={handleResumeHistoryEntry}
            onExploreCatalog={() => setRoute({ view: 'catalog' })}
          />
        ) : (
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
            {/* Local Continue Reading Ribbon (shown when user has reading history) */}
            {history.length > 0 && isDefaultBrowseState && (
              <section
                aria-label="Lanjutkan Membaca dari Riwayat Lokal"
                className="mb-10 pb-8 border-b border-stone-200 dark:border-stone-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Tersimpan Otomatis di Perangkat Anda
                    </p>
                    <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
                      Lanjutkan Membaca
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoute({ view: 'local', tab: 'history' })}
                    className="text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline whitespace-nowrap"
                  >
                    Lihat Semua Riwayat ({history.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.slice(0, 3).map((entry) => {
                    const pct =
                      entry.totalPages > 0
                        ? Math.round(((entry.currentPage + 1) / entry.totalPages) * 100)
                        : 0;
                    return (
                      <div
                        key={`${entry.mangaId}-${entry.chapterId}`}
                        className="flex items-center gap-3.5 p-3 border border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/40"
                      >
                        <div
                          onClick={() => handleOpenMangaById(entry.mangaId)}
                          className="w-14 shrink-0 cursor-pointer"
                        >
                          <CoverImage
                            src={entry.coverUrl}
                            mangaId={entry.mangaId}
                            title={entry.mangaTitle}
                            aspectClassName="aspect-[3/4]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleOpenMangaById(entry.mangaId)}
                            className="font-semibold text-sm text-left text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-400 truncate block w-full"
                          >
                            {entry.mangaTitle}
                          </button>
                          <p className="text-xs text-stone-500 dark:text-stone-400 font-tabular truncate mt-0.5">
                            Bab {entry.chapterNumber} · Hal. {entry.currentPage + 1}/
                            {entry.totalPages} ({pct}%)
                          </p>
                          <button
                            type="button"
                            onClick={() => handleResumeHistoryEntry(entry)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Lanjutkan Baca</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Editorial Spotlight Hero (shown in default browse state) */}
            {featuredHeroManga && (
              <section
                aria-label="Sorotan Utama Katalog"
                className="mb-10 pb-10 border-b border-stone-200 dark:border-stone-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <span>Sorotan Katalog MangaDex</span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleFilterByAuthor(
                          featuredHeroManga.author,
                          featuredHeroManga.authorId
                        )
                      }
                      className="hover:text-amber-800 dark:hover:text-amber-400 hover:underline"
                    >
                      {featuredHeroManga.author}
                    </button>
                    {featuredHeroManga.year && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-tabular">{featuredHeroManga.year}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{STATUS_SHORT[featuredHeroManga.status]}</span>
                  </div>

                  <h1
                    onClick={() => handleSelectManga(featuredHeroManga)}
                    className="font-editorial text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-stone-900 dark:text-stone-100 cursor-pointer hover:text-amber-900 dark:hover:text-amber-400 transition-colors"
                  >
                    {featuredHeroManga.title}
                  </h1>

                  <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3 max-w-2xl">
                    {featuredHeroManga.description}
                  </p>

                  {/* Unboxed Genre Metadata */}
                  {featuredHeroManga.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                      {featuredHeroManga.tags.slice(0, 6).map((t, i, arr) => (
                        <React.Fragment key={t.id}>
                          <button
                            type="button"
                            onClick={() => handleFilterByTag(t.id)}
                            className="hover:text-stone-900 dark:hover:text-stone-100 hover:underline"
                          >
                            {t.name}
                          </button>
                          {i < arr.length - 1 && <span aria-hidden="true">·</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectManga(featuredHeroManga)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors whitespace-nowrap"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Baca & Lihat Daftar Bab</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleFilterByAuthor(
                          featuredHeroManga.author,
                          featuredHeroManga.authorId
                        )
                      }
                      className="px-4 py-2.5 text-xs font-medium border border-stone-300 dark:border-stone-800 rounded hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap"
                    >
                      Karya Lain dari {featuredHeroManga.author}
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => handleSelectManga(featuredHeroManga)}
                  className="lg:col-span-4 max-w-[260px] mx-auto lg:ml-auto w-full p-2.5 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 cursor-pointer"
                >
                  <CoverImage
                    src={featuredHeroManga.coverUrlLarge || featuredHeroManga.coverUrl}
                    mangaId={featuredHeroManga.id}
                    coverFileName={featuredHeroManga.coverFileName}
                    title={featuredHeroManga.title}
                    author={featuredHeroManga.author}
                    aspectClassName="aspect-[3/4]"
                  />
                </div>
              </section>
            )}

            {/* Comprehensive Search & Multi-Filter System */}
            <SearchAndFilterPanel
              filters={filters}
              resolvedAuthor={resolvedAuthor}
              totalResults={totalResults}
              loading={loading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onUpdateFilters={setFilters}
              onResetFilters={() => setFilters(INITIAL_FILTERS)}
            />

            {/* Search & Filter Results Display */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="space-y-3 animate-pulse">
                    <div className="aspect-[3/4] bg-stone-200 dark:bg-stone-900" />
                    <div className="h-3 bg-stone-200 dark:bg-stone-900 w-2/3" />
                    <div className="h-4 bg-stone-200 dark:bg-stone-900 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-20 px-4 border border-stone-200 dark:border-stone-800 text-center">
                <p className="font-editorial text-2xl mb-2">Gagal Memuat Katalog</p>
                <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{error}</p>
                <button
                  type="button"
                  onClick={loadCatalog}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Muat Ulang</span>
                </button>
              </div>
            ) : mangaList.length === 0 ? (
              <div className="py-20 px-4 border border-stone-200 dark:border-stone-800 text-center">
                <p className="font-editorial text-3xl mb-2">Tidak Ada Manga yang Cocok</p>
                <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
                  Tidak ditemukan judul untuk kombinasi pencarian judul, penulis, atau filter genre saat ini. Coba kurangi filter genre atau gunakan mode OR.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-amber-800 text-white rounded hover:bg-amber-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter Pencarian</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              /* GRID CATALOG VIEW */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {mangaList.map((manga) => {
                  const localEntry = history.find((h) => h.mangaId === manga.id);
                  return (
                    <article
                      key={manga.id}
                      className="group flex flex-col justify-between"
                    >
                      <div>
                        {/* Cover Artwork */}
                        <div
                          onClick={() => handleSelectManga(manga)}
                          className="cursor-pointer overflow-hidden border border-stone-200 dark:border-stone-800 transition-transform duration-150 group-hover:-translate-y-0.5"
                        >
                          <CoverImage
                            src={manga.coverUrl}
                            mangaId={manga.id}
                            coverFileName={manga.coverFileName}
                            title={manga.title}
                            author={manga.author}
                            aspectClassName="aspect-[3/4]"
                          />
                        </div>

                        {/* Unboxed Metadata Kicker (Author · Year · Score) */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-stone-500 dark:text-stone-400">
                          <button
                            type="button"
                            onClick={() => handleFilterByAuthor(manga.author, manga.authorId)}
                            className="hover:text-amber-800 dark:hover:text-amber-400 hover:underline truncate max-w-[140px]"
                            title={`Filter karya oleh ${manga.author}`}
                          >
                            {manga.author}
                          </button>
                          {manga.year && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-tabular">{manga.year}</span>
                            </>
                          )}
                          {manga.rating ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-tabular text-amber-800 dark:text-amber-400 font-medium">
                                ★ {manga.rating.toFixed(1)}
                              </span>
                            </>
                          ) : null}
                        </div>

                        {/* Primary Title */}
                        <h3
                          onClick={() => handleSelectManga(manga)}
                          className="mt-1 font-semibold text-base leading-snug text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors cursor-pointer line-clamp-2"
                        >
                          {manga.title}
                        </h3>

                        {/* Unboxed Genre Text Line */}
                        {manga.tags.length > 0 && (
                          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 truncate">
                            {manga.tags
                              .slice(0, 3)
                              .map((t) => t.name)
                              .join(' · ')}
                          </p>
                        )}
                      </div>

                      {/* Local History Progress Indicator if previously read */}
                      {localEntry && (
                        <button
                          type="button"
                          onClick={() => handleResumeHistoryEntry(localEntry)}
                          className="mt-2.5 pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-tabular text-amber-800 dark:text-amber-400 hover:underline"
                        >
                          <span>Lanjut Bab {localEntry.chapterNumber}</span>
                          <span>
                            Hal. {localEntry.currentPage + 1}/{localEntry.totalPages}
                          </span>
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              /* EDITORIAL DETAILED LIST VIEW */
              <div className="divide-y divide-stone-200 dark:divide-stone-800 border-t border-b border-stone-200 dark:border-stone-800">
                {mangaList.map((manga) => {
                  const localEntry = history.find((h) => h.mangaId === manga.id);
                  return (
                    <article
                      key={manga.id}
                      className="py-6 flex flex-col sm:flex-row gap-6 items-start"
                    >
                      <div
                        onClick={() => handleSelectManga(manga)}
                        className="w-28 sm:w-36 shrink-0 cursor-pointer border border-stone-200 dark:border-stone-800"
                      >
                        <CoverImage
                          src={manga.coverUrl}
                          mangaId={manga.id}
                          coverFileName={manga.coverFileName}
                          title={manga.title}
                          author={manga.author}
                          aspectClassName="aspect-[3/4]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Unboxed Metadata Header */}
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 dark:text-stone-400">
                          <button
                            type="button"
                            onClick={() => handleFilterByAuthor(manga.author, manga.authorId)}
                            className="font-medium text-stone-800 dark:text-stone-200 hover:text-amber-800 dark:hover:text-amber-400 hover:underline"
                          >
                            {manga.author}
                          </button>
                          {manga.artist && manga.artist !== manga.author && (
                            <>
                              <span aria-hidden="true">/</span>
                              <span>Ilustrasi: {manga.artist}</span>
                            </>
                          )}
                          {manga.year && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-tabular">{manga.year}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{STATUS_SHORT[manga.status] || manga.status}</span>
                          {manga.demographic !== 'none' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{manga.demographic}</span>
                            </>
                          )}
                          {manga.rating ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-tabular text-amber-800 dark:text-amber-400 font-medium">
                                ★ {manga.rating.toFixed(2)}
                              </span>
                            </>
                          ) : null}
                        </div>

                        <h3
                          onClick={() => handleSelectManga(manga)}
                          className="mt-1 font-editorial text-2xl sm:text-3xl text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-400 cursor-pointer transition-colors"
                        >
                          {manga.title}
                        </h3>

                        <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed max-w-3xl">
                          {manga.description}
                        </p>

                        {/* Clickable Genre List */}
                        {manga.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
                            <span className="font-medium text-stone-700 dark:text-stone-300">
                              Genre:
                            </span>
                            {manga.tags.slice(0, 8).map((tag, i, arr) => (
                              <React.Fragment key={tag.id}>
                                <button
                                  type="button"
                                  onClick={() => handleFilterByTag(tag.id)}
                                  className="hover:text-amber-800 dark:hover:text-amber-400 hover:underline"
                                >
                                  {tag.name}
                                </button>
                                {i < arr.length - 1 && <span aria-hidden="true">·</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSelectManga(manga)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 transition-opacity"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Lihat Bab & Baca</span>
                          </button>

                          {localEntry && (
                            <button
                              type="button"
                              onClick={() => handleResumeHistoryEntry(localEntry)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-amber-800 text-white rounded hover:bg-amber-700 transition-colors font-tabular"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>
                                Lanjutkan Bab {localEntry.chapterNumber} (Hal.{' '}
                                {localEntry.currentPage + 1}/{localEntry.totalPages})
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Catalog Pagination */}
            {!loading && totalResults > filters.limit && (
              <div className="mt-12 pt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 text-xs font-tabular">
                <button
                  type="button"
                  disabled={filters.offset === 0}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      offset: Math.max(0, prev.offset - prev.limit),
                    }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 dark:border-stone-800 rounded disabled:opacity-35 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Halaman Sebelumnya</span>
                </button>

                <span className="text-stone-600 dark:text-stone-400">
                  Halaman {currentPageNumber} dari {totalPagesCount} ({totalResults.toLocaleString('id-ID')} Judul)
                </span>

                <button
                  type="button"
                  disabled={filters.offset + filters.limit >= Math.min(totalResults, 10000)}
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      offset: prev.offset + prev.limit,
                    }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 dark:border-stone-800 rounded disabled:opacity-35 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap"
                >
                  <span>Halaman Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quiet Archival Footer */}
      <footer className="mt-16 border-t border-stone-200 dark:border-stone-800 py-8 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Mikma — Pustaka & Pembaca Manga Tanpa Login. Seluruh riwayat baca disimpan secara lokal di peramban Anda.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setRoute({ view: 'local', tab: 'history' })}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Riwayat Lokal
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setRoute({ view: 'local', tab: 'backup' })}
              className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Ekspor / Impor JSON
            </button>
            <span aria-hidden="true">·</span>
            <span>Didukung oleh MangaDex API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
