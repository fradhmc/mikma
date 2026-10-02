import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  ArrowUpDown,
  Search,
  RefreshCw,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  ChapterItem,
  ChapterProgress,
  LibraryEntry,
  LibraryReadingStatus,
  MangaItem,
  ReadingHistoryEntry,
} from '../types/manga';
import { fetchMangaChapters } from '../services/mangadex';
import {
  getLastReadForManga,
  getLibraryEntry,
  getMangaChapterProgress,
  removeLibraryEntry,
  toggleChapterReadStatus,
  upsertLibraryEntry,
} from '../services/localStorage';
import { CoverImage } from './CoverImage';

interface MangaDetailViewProps {
  manga: MangaItem;
  onBack: () => void;
  onOpenChapter: (manga: MangaItem, chapter: ChapterItem, allChapters: ChapterItem[], startPage?: number) => void;
  onTagSelect?: (tagId: string) => void;
  onAuthorSelect?: (authorName: string, authorId?: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  ongoing: 'Berlanjut (Ongoing)',
  completed: 'Tamat (Completed)',
  hiatus: 'Hiatus',
  cancelled: 'Dibatalkan',
};

const LIBRARY_STATUS_OPTIONS: Array<{ value: LibraryReadingStatus; label: string }> = [
  { value: 'reading', label: 'Sedang Dibaca' },
  { value: 'plan_to_read', label: 'Ingin Dibaca' },
  { value: 'completed', label: 'Selesai Dibaca' },
  { value: 'on_hold', label: 'Ditunda' },
];

export const MangaDetailView: React.FC<MangaDetailViewProps> = ({
  manga,
  onBack,
  onOpenChapter,
  onTagSelect,
  onAuthorSelect,
}) => {
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const [langFilter, setLangFilter] = useState<'id_en' | 'id' | 'en' | 'all'>('id_en');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [chapterQuery, setChapterQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;

  // Local state synced with localStorage
  const [lastRead, setLastRead] = useState<ReadingHistoryEntry | null>(() =>
    getLastReadForManga(manga.id)
  );
  const [chapterProgressMap, setChapterProgressMap] = useState<Record<string, ChapterProgress>>(() =>
    getMangaChapterProgress(manga.id)
  );
  const [libraryEntry, setLibraryEntry] = useState<LibraryEntry | null>(() =>
    getLibraryEntry(manga.id)
  );
  const [noteInput, setNoteInput] = useState(() => getLibraryEntry(manga.id)?.personalNote || '');
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const syncLocalState = useCallback(() => {
    setLastRead(getLastReadForManga(manga.id));
    setChapterProgressMap(getMangaChapterProgress(manga.id));
    const lib = getLibraryEntry(manga.id);
    setLibraryEntry(lib);
  }, [manga.id]);

  useEffect(() => {
    syncLocalState();
    window.addEventListener('kurohon-storage-update', syncLocalState);
    return () => window.removeEventListener('kurohon-storage-update', syncLocalState);
  }, [syncLocalState]);

  const loadChapters = useCallback(async () => {
    setLoadingChapters(true);
    setChapterError(null);
    try {
      const languages =
        langFilter === 'id_en'
          ? ['id', 'en']
          : langFilter === 'id'
          ? ['id']
          : langFilter === 'en'
          ? ['en']
          : [];

      const res = await fetchMangaChapters(manga.id, {
        languages,
        order: sortOrder,
        offset,
        limit: LIMIT,
      });

      // Fallback: if 'id_en' returned 0 chapters, automatically fetch all languages so user always sees chapters
      if (res.chapters.length === 0 && langFilter === 'id_en' && offset === 0) {
        const allLangRes = await fetchMangaChapters(manga.id, {
          languages: [],
          order: sortOrder,
          offset: 0,
          limit: LIMIT,
        });
        setChapters(allLangRes.chapters);
        setTotalChapters(allLangRes.total);
      } else {
        setChapters(res.chapters);
        setTotalChapters(res.total);
      }
    } catch (err) {
      setChapterError(
        err instanceof Error ? err.message : 'Gagal memuat daftar bab dari MangaDex.'
      );
    } finally {
      setLoadingChapters(false);
    }
  }, [manga.id, langFilter, sortOrder, offset]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  // Find earliest chapter in loaded list for "Baca dari Bab Pertama"
  const firstChapter = React.useMemo(() => {
    if (chapters.length === 0) return null;
    const sorted = [...chapters].sort((a, b) => {
      const numA = parseFloat(a.chapter || '999999');
      const numB = parseFloat(b.chapter || '999999');
      return numA - numB;
    });
    return sorted[0];
  }, [chapters]);

  const handleResumeReading = () => {
    if (!lastRead) return;
    const found = chapters.find((c) => c.id === lastRead.chapterId);
    if (found) {
      onOpenChapter(manga, found, chapters, lastRead.currentPage);
    } else {
      // Construct a ChapterItem from local history if it's on another pagination page
      const fallbackChapter: ChapterItem = {
        id: lastRead.chapterId,
        volume: lastRead.volume,
        chapter: lastRead.chapterNumber,
        title: lastRead.chapterTitle,
        translatedLanguage: lastRead.language,
        pages: lastRead.totalPages,
        publishAt: new Date(lastRead.updatedAt).toISOString(),
        scanlationGroup: 'Riwayat Lokal',
        externalUrl: null,
      };
      onOpenChapter(manga, fallbackChapter, chapters, lastRead.currentPage);
    }
  };

  const handleLibraryStatusSelect = (status: LibraryReadingStatus) => {
    const entry = upsertLibraryEntry(manga, status, noteInput);
    setLibraryEntry(entry);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    const status = libraryEntry?.readingStatus || 'reading';
    const entry = upsertLibraryEntry(manga, status, noteInput.trim());
    setLibraryEntry(entry);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  const handleToggleRead = (e: React.MouseEvent, ch: ChapterItem) => {
    e.stopPropagation();
    toggleChapterReadStatus(
      manga.id,
      ch.id,
      ch.chapter || 'Oneshot',
      ch.title || '',
      ch.pages
    );
  };

  const filteredChapters = React.useMemo(() => {
    if (!chapterQuery.trim()) return chapters;
    const q = chapterQuery.trim().toLowerCase();
    return chapters.filter(
      (c) =>
        (c.chapter && c.chapter.toLowerCase().includes(q)) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        c.scanlationGroup.toLowerCase().includes(q)
    );
  }, [chapters, chapterQuery]);

  const readChaptersCount = Object.values(chapterProgressMap).filter((p) => p.completed).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      {/* Top Back Navigation */}
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Pustaka</span>
        </button>
      </div>

      {/* Main Accession Layout: Left Column (Artwork + Metadata) & Right Column (Editorial Info + Chapters) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-3 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <CoverImage
              src={manga.coverUrlLarge || manga.coverUrl}
              mangaId={manga.id}
              coverFileName={manga.coverFileName}
              title={manga.title}
              author={manga.author}
              aspectClassName="aspect-[3/4]"
            />
          </div>

          {/* Primary Reading CTA Module */}
          <div className="space-y-2.5">
            {lastRead ? (
              <button
                type="button"
                onClick={handleResumeReading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span className="font-tabular">
                  Lanjutkan Bab {lastRead.chapterNumber} (Hal. {lastRead.currentPage + 1}/{lastRead.totalPages})
                </span>
              </button>
            ) : null}

            {firstChapter && (
              <button
                type="button"
                onClick={() => onOpenChapter(manga, firstChapter, chapters, 0)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  lastRead
                    ? 'border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                    : 'bg-amber-800 hover:bg-amber-700 text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="font-tabular">
                  {lastRead
                    ? `Baca dari Bab ${firstChapter.chapter || 'Pertama'}`
                    : `Mulai Baca Bab ${firstChapter.chapter || 'Pertama'}`}
                </span>
              </button>
            )}
          </div>

          {/* Local Collection / Bookmark Module */}
          <div className="pt-6 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Koleksi Lokal (Tanpa Login)
              </span>
              {libraryEntry && (
                <button
                  type="button"
                  onClick={() => {
                    removeLibraryEntry(manga.id);
                    setLibraryEntry(null);
                  }}
                  className="text-xs text-red-700 dark:text-red-400 hover:underline"
                >
                  Hapus dari Koleksi
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {LIBRARY_STATUS_OPTIONS.map((opt) => {
                const isSelected = libraryEntry?.readingStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleLibraryStatusSelect(opt.value)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-stone-900 text-stone-50 border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                        : 'border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'
                    }`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSelected ? 'fill-current' : ''}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Personal Local Note */}
            <form onSubmit={handleSaveNote} className="mt-4">
              <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5">
                Catatan Pribadi Lokal
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Misal: Terakhir di arc Shibuya..."
                  className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-transparent border border-stone-300 dark:border-stone-800 rounded focus:outline-none focus:border-amber-700"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  {noteSavedFeedback ? 'Tersimpan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>

          {/* Museum Accession Metadata Grid (dl with hairline dividers) */}
          <dl className="pt-6 border-t border-stone-200 dark:border-stone-800 divide-y divide-stone-200 dark:divide-stone-800/80 text-xs">
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-stone-500 dark:text-stone-400">Penulis</dt>
              <dd className="font-medium text-right">
                {onAuthorSelect ? (
                  <button
                    type="button"
                    onClick={() => onAuthorSelect(manga.author, manga.authorId)}
                    className="hover:text-amber-800 dark:hover:text-amber-400 hover:underline transition-colors text-right"
                  >
                    {manga.author}
                  </button>
                ) : (
                  manga.author
                )}
              </dd>
            </div>
            {manga.artist && manga.artist !== manga.author && (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-stone-500 dark:text-stone-400">Ilustrator</dt>
                <dd className="font-medium text-right">
                  {onAuthorSelect ? (
                    <button
                      type="button"
                      onClick={() => onAuthorSelect(manga.artist, manga.artistId)}
                      className="hover:text-amber-800 dark:hover:text-amber-400 hover:underline transition-colors text-right"
                    >
                      {manga.artist}
                    </button>
                  ) : (
                    manga.artist
                  )}
                </dd>
              </div>
            )}
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-stone-500 dark:text-stone-400">Status Publikasi</dt>
              <dd className="font-medium text-right">{STATUS_LABELS[manga.status] || manga.status}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-stone-500 dark:text-stone-400">Tahun Rilis</dt>
              <dd className="font-tabular text-right">{manga.year || '—'}</dd>
            </div>
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-stone-500 dark:text-stone-400">Demografi</dt>
              <dd className="capitalize text-right">
                {manga.demographic === 'none' ? 'Umum' : manga.demographic}
              </dd>
            </div>
            {manga.rating ? (
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-stone-500 dark:text-stone-400">Skor MangaDex</dt>
                <dd className="font-tabular font-medium text-amber-800 dark:text-amber-500 text-right">
                  {manga.rating.toFixed(2)} / 10.0
                </dd>
              </div>
            ) : null}
            <div className="py-2.5 flex justify-between gap-4">
              <dt className="text-stone-500 dark:text-stone-400">Progres Lokal</dt>
              <dd className="font-tabular text-right">
                {readChaptersCount} bab selesai dibaca
              </dd>
            </div>
          </dl>
        </div>

        {/* Right Column: 8 cols (Title, Synopsis, Genres, Chapter Feed) */}
        <div className="lg:col-span-8">
          {/* Unboxed Kicker Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-2">
            <span>{manga.author}</span>
            <span aria-hidden="true">·</span>
            <span className="font-tabular">{manga.year || 'Arsip'}</span>
            <span aria-hidden="true">·</span>
            <span>{STATUS_LABELS[manga.status] || manga.status}</span>
            {manga.demographic !== 'none' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="capitalize">{manga.demographic}</span>
              </>
            )}
          </div>

          <h1 className="font-editorial text-3xl sm:text-5xl leading-tight text-stone-900 dark:text-stone-100">
            {manga.title}
          </h1>

          {manga.altTitle && (
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{manga.altTitle}</p>
          )}

          {/* Unboxed Genre & Theme Metadata List */}
          {manga.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
              <span className="font-medium text-stone-900 dark:text-stone-200">Genre & Tema:</span>
              {manga.tags.slice(0, 10).map((tag, idx, arr) => (
                <React.Fragment key={tag.id}>
                  {onTagSelect ? (
                    <button
                      type="button"
                      onClick={() => onTagSelect(tag.id)}
                      className="hover:text-amber-800 dark:hover:text-amber-400 hover:underline transition-colors"
                    >
                      {tag.name}
                    </button>
                  ) : (
                    <span>{tag.name}</span>
                  )}
                  {idx < arr.length - 1 && <span aria-hidden="true">·</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Editorial Synopsis */}
          <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-800">
            <h2 className="font-editorial text-xl text-stone-900 dark:text-stone-100 mb-2">
              Sinopsis Karya
            </h2>
            <p className="text-sm sm:text-[15px] leading-relaxed text-stone-700 dark:text-stone-300 max-w-[70ch] whitespace-pre-line">
              {manga.description}
            </p>
          </div>

          {/* Chapter Feed Section */}
          <div className="mt-10 pt-8 border-t border-stone-200 dark:border-stone-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100">
                  Daftar Bab Terjemahan
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-tabular mt-0.5">
                  Menampilkan {filteredChapters.length} dari {totalChapters} bab tersedia di MangaDex
                </p>
              </div>

              {/* Interactive Language Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center p-0.5 bg-stone-200/70 dark:bg-stone-900 rounded border border-stone-300/60 dark:border-stone-800 text-xs">
                  {(
                    [
                      { id: 'id_en', label: 'ID + EN' },
                      { id: 'id', label: 'Indonesia' },
                      { id: 'en', label: 'English' },
                      { id: 'all', label: 'Semua' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setLangFilter(tab.id);
                        setOffset(0);
                      }}
                      className={`px-2.5 py-1 rounded-sm transition-colors whitespace-nowrap ${
                        langFilter === tab.id
                          ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'));
                    setOffset(0);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-800 rounded hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortOrder === 'desc' ? 'Terbaru' : 'Bab Pertama'}</span>
                </button>
              </div>
            </div>

            {/* Chapter Quick Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={chapterQuery}
                onChange={(e) => setChapterQuery(e.target.value)}
                placeholder="Cari nomor bab, judul bab, atau grup scanlation..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-transparent border border-stone-300 dark:border-stone-800 rounded focus:outline-none focus:border-amber-700"
              />
            </div>

            {/* Chapter List Rows */}
            {loadingChapters ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2 text-stone-500">
                <div className="w-6 h-6 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Memuat daftar bab dari MangaDex...</span>
              </div>
            ) : chapterError ? (
              <div className="py-12 px-4 border border-stone-300 dark:border-stone-800 text-center">
                <p className="text-sm text-stone-700 dark:text-stone-300 mb-3">{chapterError}</p>
                <button
                  type="button"
                  onClick={loadChapters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Muat Ulang Bab
                </button>
              </div>
            ) : filteredChapters.length === 0 ? (
              <div className="py-12 px-4 border border-stone-200 dark:border-stone-800 text-center">
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-2">
                  Tidak ada bab ditemukan untuk filter bahasa ini.
                </p>
                {langFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setLangFilter('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Tampilkan Semua Bahasa Terjemahan
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-200 dark:divide-stone-800/80 border-t border-b border-stone-200 dark:border-stone-800">
                {filteredChapters.map((ch) => {
                  const prog = chapterProgressMap[ch.id];
                  const isRead = Boolean(prog?.completed);
                  const isLastRead = lastRead?.chapterId === ch.id;
                  const formattedDate = new Date(ch.publishAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={ch.id}
                      onClick={() =>
                        onOpenChapter(
                          manga,
                          ch,
                          chapters,
                          prog && !prog.completed ? prog.currentPage : 0
                        )
                      }
                      className={`group flex items-center justify-between gap-4 py-3 px-2 cursor-pointer transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-900/70 ${
                        isRead ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-tabular font-semibold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors whitespace-nowrap">
                            {ch.volume ? `Vol. ${ch.volume} ` : ''}
                            {ch.chapter ? `Bab ${ch.chapter}` : 'Oneshot'}
                          </span>
                          {ch.title && (
                            <span className="text-sm text-stone-600 dark:text-stone-300 truncate">
                              — {ch.title}
                            </span>
                          )}
                        </div>

                        {/* Unboxed Metadata Row */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-stone-500 dark:text-stone-400 font-tabular">
                          <span className="uppercase font-medium text-stone-700 dark:text-stone-300">
                            {ch.translatedLanguage}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans truncate max-w-[200px]">
                            {ch.scanlationGroup}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{ch.pages} hal</span>
                          <span aria-hidden="true">·</span>
                          <span>{formattedDate}</span>
                          {isLastRead && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-800 dark:text-amber-400 font-medium font-sans">
                                Terakhir Dibaca (Hal. {lastRead.currentPage + 1}/{lastRead.totalPages})
                              </span>
                            </>
                          )}
                          {!isLastRead && prog && !prog.completed && prog.currentPage > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-800 dark:text-amber-400 font-sans">
                                Hal. {prog.currentPage + 1}/{prog.totalPages}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Actions: Mark Read Toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleRead(e, ch)}
                          title={
                            isRead ? 'Tandai belum selesai dibaca' : 'Tandai sudah selesai dibaca'
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap ${
                            isRead
                              ? 'border-emerald-700/40 text-emerald-700 dark:text-emerald-400 bg-emerald-950/10'
                              : 'border-stone-300 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isRead ? 'Dibaca' : 'Tandai'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination for Chapters if total > LIMIT */}
            {totalChapters > LIMIT && (
              <div className="mt-6 flex items-center justify-between text-xs font-tabular">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-800 rounded disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                >
                  Halaman Bab Sebelumnya
                </button>
                <span>
                  Menampilkan {offset + 1} – {Math.min(offset + LIMIT, totalChapters)} dari{' '}
                  {totalChapters}
                </span>
                <button
                  type="button"
                  disabled={offset + LIMIT >= totalChapters}
                  onClick={() => setOffset((o) => o + LIMIT)}
                  className="px-4 py-2 border border-stone-300 dark:border-stone-800 rounded disabled:opacity-40 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
                >
                  Halaman Bab Berikutnya
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
