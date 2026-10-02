import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  ChapterItem,
  MangaItem,
  ReaderBackground,
  ReaderFit,
  ReaderMode,
  ReaderSettings,
} from '../types/manga';
import { ChapterPagesPayload, fetchChapterPages } from '../services/mangadex';
import {
  getReaderSettings,
  saveReaderSettings,
  saveReadingHistoryEntry,
} from '../services/localStorage';

interface MangaReaderProps {
  manga: MangaItem;
  chapter: ChapterItem;
  allChapters: ChapterItem[];
  initialPage?: number;
  onSelectChapter: (chapter: ChapterItem, startPage?: number) => void;
  onClose: () => void;
}

interface PageImageProps {
  index: number;
  total: number;
  proxyUrl: string;
  directUrl: string;
  fit: ReaderFit;
  mode: ReaderMode;
  onVisible?: (index: number) => void;
}

const PageImage: React.FC<PageImageProps> = ({
  index,
  total,
  proxyUrl,
  directUrl,
  fit,
  mode,
  onVisible,
}) => {
  const [src, setSrc] = useState(proxyUrl);
  const [triedDirect, setTriedDirect] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSrc(proxyUrl);
    setTriedDirect(false);
    setFailed(false);
    setLoaded(false);
  }, [proxyUrl, directUrl]);

  useEffect(() => {
    if (mode !== 'vertical' || !onVisible || !containerRef.current) return;
    const el = containerRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            onVisible(index);
          }
        }
      },
      {
        threshold: [0.35, 0.65],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, mode, onVisible]);

  const handleError = () => {
    if (!triedDirect) {
      setTriedDirect(true);
      setSrc(directUrl);
    } else {
      setFailed(true);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFailed(false);
    setTriedDirect(false);
    setLoaded(false);
    setRetryCount((c) => c + 1);
    const sep = proxyUrl.includes('?') ? '&' : '?';
    setSrc(`${proxyUrl}${sep}retry=${retryCount + 1}`);
  };

  const fitClasses =
    fit === 'optimal'
      ? 'w-full max-w-[820px] mx-auto'
      : fit === 'full'
      ? 'w-full max-w-[1200px] mx-auto'
      : 'max-h-[86vh] w-auto mx-auto';

  return (
    <div
      ref={containerRef}
      data-page-index={index}
      className="relative flex flex-col items-center justify-center w-full select-none"
    >
      {!loaded && !failed && (
        <div
          className={`flex flex-col items-center justify-center min-h-[420px] sm:min-h-[580px] border border-stone-800/60 bg-stone-900/40 text-stone-400 ${
            fit === 'screen' ? 'w-full max-w-[680px]' : fitClasses
          }`}
        >
          <div className="w-6 h-6 border-2 border-stone-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-tabular">
            Memuat Halaman {index + 1} / {total}
          </span>
        </div>
      )}

      {failed ? (
        <div
          className={`flex flex-col items-center justify-center min-h-[360px] p-8 border border-stone-800 bg-stone-900/70 text-stone-300 ${fitClasses}`}
        >
          <p className="text-sm mb-2">Gagal memuat gambar halaman {index + 1}.</p>
          <p className="text-xs text-stone-500 mb-4 text-center max-w-sm">
            Server MangaDex@Home mungkin sedang sibuk. Coba muat ulang halaman ini atau aktifkan mode Hemat Kuota.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-stone-100 text-stone-900 rounded hover:bg-white transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang Halaman {index + 1}
          </button>
        </div>
      ) : (
        <img
          src={src}
          alt={`Halaman ${index + 1} dari ${total}`}
          referrerPolicy="no-referrer"
          loading={mode === 'vertical' && index > 3 ? 'lazy' : 'eager'}
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`block object-contain transition-opacity duration-150 ${fitClasses} ${
            loaded ? 'opacity-100' : 'h-0 opacity-0 overflow-hidden'
          }`}
        />
      )}
    </div>
  );
};

export const MangaReader: React.FC<MangaReaderProps> = ({
  manga,
  chapter,
  allChapters,
  initialPage = 0,
  onSelectChapter,
  onClose,
}) => {
  const [settings, setSettings] = useState<ReaderSettings>(() => getReaderSettings());
  const [payload, setPayload] = useState<ChapterPagesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const readerRootRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  // Determine previous and next chapters in chronological reading order
  // Note: allChapters may be sorted desc or asc; let's sort by chapter number ascending to find true prev/next
  const sortedChaptersAsc = React.useMemo(() => {
    return [...allChapters].sort((a, b) => {
      const numA = parseFloat(a.chapter || '0');
      const numB = parseFloat(b.chapter || '0');
      if (numA !== numB) return numA - numB;
      return new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime();
    });
  }, [allChapters]);

  const currentChapterIdx = sortedChaptersAsc.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentChapterIdx > 0 ? sortedChaptersAsc[currentChapterIdx - 1] : null;
  const nextChapter =
    currentChapterIdx >= 0 && currentChapterIdx < sortedChaptersAsc.length - 1
      ? sortedChaptersAsc[currentChapterIdx + 1]
      : null;

  const activePages = React.useMemo(() => {
    if (!payload) return [];
    return settings.dataSaver ? payload.dataSaverPages : payload.hdPages;
  }, [payload, settings.dataSaver]);

  const totalPages = activePages.length;

  // Save reading history whenever chapter or currentPage updates
  const persistHistory = useCallback(
    (pageIdx: number, count: number) => {
      if (count <= 0) return;
      const safePage = Math.max(0, Math.min(pageIdx, count - 1));
      saveReadingHistoryEntry({
        mangaId: manga.id,
        mangaTitle: manga.title,
        coverUrl: manga.coverUrl,
        author: manga.author,
        chapterId: chapter.id,
        chapterNumber: chapter.chapter || 'Oneshot',
        chapterTitle: chapter.title || '',
        volume: chapter.volume,
        language: chapter.translatedLanguage,
        currentPage: safePage,
        totalPages: count,
        updatedAt: Date.now(),
      });
    },
    [manga, chapter]
  );

  // Fetch chapter images from MangaDex@Home
  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    initialScrollDoneRef.current = false;
    try {
      const data = await fetchChapterPages(chapter.id);
      setPayload(data);
      const count = settings.dataSaver ? data.dataSaverPages.length : data.hdPages.length;
      const startIdx = initialPage > 0 && initialPage < count ? initialPage : 0;
      setCurrentPage(startIdx);
      persistHistory(startIdx, count);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat halaman bab dari MangaDex@Home.'
      );
    } finally {
      setLoading(false);
    }
  }, [chapter.id, initialPage, persistHistory, settings.dataSaver]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // Scroll to initialPage in vertical mode once pages are ready
  useEffect(() => {
    if (
      !loading &&
      payload &&
      settings.mode === 'vertical' &&
      initialPage > 0 &&
      !initialScrollDoneRef.current
    ) {
      initialScrollDoneRef.current = true;
      setTimeout(() => {
        const targetEl = document.querySelector(`[data-page-index="${initialPage}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 120);
    } else if (!loading && payload && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [loading, payload, settings.mode, initialPage]);

  // Update history when currentPage changes
  useEffect(() => {
    if (totalPages > 0) {
      persistHistory(currentPage, totalPages);
    }
  }, [currentPage, totalPages, persistHistory]);

  // Preload next 2 images in single-page mode
  useEffect(() => {
    if (settings.mode === 'vertical' || activePages.length === 0) return;
    const preloadIndices = [currentPage + 1, currentPage + 2].filter(
      (idx) => idx >= 0 && idx < activePages.length
    );
    preloadIndices.forEach((idx) => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = activePages[idx].proxyUrl;
    });
  }, [currentPage, settings.mode, activePages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (nextChapter) {
      onSelectChapter(nextChapter, 0);
    }
  }, [currentPage, totalPages, nextChapter, onSelectChapter]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (prevChapter) {
      onSelectChapter(prevChapter, 0);
    }
  }, [currentPage, prevChapter, onSelectChapter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'Escape') {
        if (showSettingsPanel) {
          setShowSettingsPanel(false);
        } else {
          onClose();
        }
      } else if (settings.mode !== 'vertical') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (settings.mode === 'single-rtl') {
            goToPrevPage();
          } else {
            goToNextPage();
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (settings.mode === 'single-rtl') {
            goToNextPage();
          } else {
            goToPrevPage();
          }
        } else if (e.key === ' ') {
          e.preventDefault();
          goToNextPage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.mode, showSettingsPanel, onClose, goToNextPage, goToPrevPage]);

  const updateSetting = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    const updated = saveReaderSettings({ [key]: value });
    setSettings(updated);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerRootRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handlePageVisibility = useCallback((idx: number) => {
    setCurrentPage(idx);
  }, []);

  const handleScrubberChange = (newIdx: number) => {
    setCurrentPage(newIdx);
    if (settings.mode === 'vertical') {
      const targetEl = document.querySelector(`[data-page-index="${newIdx}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const bgClasses: Record<ReaderBackground, string> = {
    ink: 'bg-[#09090B] text-stone-100',
    charcoal: 'bg-[#18181B] text-stone-100',
    paper: 'bg-[#F4F1EA] text-stone-900',
  };

  return (
    <div
      ref={readerRootRef}
      className={`min-h-screen flex flex-col transition-colors duration-200 ${bgClasses[settings.background]}`}
    >
      {/* Sticky Top Reader Bar */}
      <header
        className={`sticky top-0 z-40 border-b transition-transform duration-200 ${
          settings.background === 'paper'
            ? 'bg-[#F4F1EA]/95 border-stone-300 text-stone-900'
            : 'bg-[#09090B]/95 border-stone-800 text-stone-100'
        } backdrop-blur-md ${showControls ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Back button & Manga/Chapter info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-current/15 hover:bg-current/5 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
            <div className="min-w-0">
              <p className="text-xs opacity-60 truncate">{manga.title}</p>
              <p className="text-sm font-semibold truncate font-tabular">
                {chapter.chapter ? `Bab ${chapter.chapter}` : 'Oneshot'}
                {chapter.title ? ` — ${chapter.title}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Chapter Selector & Prev/Next Chapter */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              disabled={!prevChapter}
              onClick={() => prevChapter && onSelectChapter(prevChapter, 0)}
              className="p-2 rounded border border-current/15 disabled:opacity-30 hover:bg-current/5 transition-colors"
              title="Bab Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={chapter.id}
              onChange={(e) => {
                const found = allChapters.find((c) => c.id === e.target.value);
                if (found) onSelectChapter(found, 0);
              }}
              aria-label="Pilih Bab"
              className={`px-3 py-1.5 text-xs font-tabular rounded border max-w-[240px] truncate focus:outline-none ${
                settings.background === 'paper'
                  ? 'bg-white border-stone-300 text-stone-900'
                  : 'bg-stone-900 border-stone-700 text-stone-100'
              }`}
            >
              {sortedChaptersAsc.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.chapter ? `Bab ${ch.chapter}` : 'Oneshot'} ({ch.translatedLanguage.toUpperCase()})
                  {ch.title ? ` - ${ch.title}` : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!nextChapter}
              onClick={() => nextChapter && onSelectChapter(nextChapter, 0)}
              className="p-2 rounded border border-current/15 disabled:opacity-30 hover:bg-current/5 transition-colors"
              title="Bab Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Mode Quick-Switch & Settings */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center p-0.5 rounded border border-current/15 text-xs">
              <button
                type="button"
                onClick={() => updateSetting('mode', 'vertical')}
                className={`px-2.5 py-1 rounded-sm transition-colors whitespace-nowrap ${
                  settings.mode === 'vertical'
                    ? 'bg-amber-700 text-white font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Vertikal
              </button>
              <button
                type="button"
                onClick={() => updateSetting('mode', 'single-ltr')}
                className={`px-2.5 py-1 rounded-sm transition-colors whitespace-nowrap ${
                  settings.mode === 'single-ltr'
                    ? 'bg-amber-700 text-white font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                1 Halaman
              </button>
              <button
                type="button"
                onClick={() => updateSetting('mode', 'single-rtl')}
                className={`px-2.5 py-1 rounded-sm transition-colors whitespace-nowrap ${
                  settings.mode === 'single-rtl'
                    ? 'bg-amber-700 text-white font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Manga RTL
              </button>
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded border border-current/15 hover:bg-current/5 transition-colors hidden sm:inline-flex"
              title="Layar Penuh"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsPanel((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                showSettingsPanel
                  ? 'bg-amber-700 border-amber-700 text-white'
                  : 'border-current/15 hover:bg-current/5'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Expandable Settings Toolbar */}
        {showSettingsPanel && (
          <div
            className={`border-t px-4 sm:px-6 py-4 ${
              settings.background === 'paper'
                ? 'bg-stone-100 border-stone-300'
                : 'bg-stone-900/95 border-stone-800'
            }`}
          >
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Reading Mode */}
              <div>
                <span className="block opacity-60 mb-1.5">Mode Baca</span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: 'vertical', label: 'Gulir Vertikal' },
                      { id: 'single-ltr', label: 'Kiri ke Kanan' },
                      { id: 'single-rtl', label: 'Kanan ke Kiri' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => updateSetting('mode', m.id)}
                      className={`flex-1 py-1.5 px-2 rounded border text-center transition-colors whitespace-nowrap ${
                        settings.mode === m.id
                          ? 'bg-amber-700 border-amber-700 text-white font-medium'
                          : 'border-current/15 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Fit */}
              <div>
                <span className="block opacity-60 mb-1.5">Ukuran Gambar</span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: 'optimal', label: 'Ideal (820px)' },
                      { id: 'full', label: 'Lebar (1200px)' },
                      { id: 'screen', label: 'Tinggi Layar' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateSetting('fit', f.id)}
                      className={`flex-1 py-1.5 px-2 rounded border text-center transition-colors whitespace-nowrap ${
                        settings.fit === f.id
                          ? 'bg-amber-700 border-amber-700 text-white font-medium'
                          : 'border-current/15 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Quality / Data Saver */}
              <div>
                <span className="block opacity-60 mb-1.5">Kualitas Gambar MangaDex@Home</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => updateSetting('dataSaver', false)}
                    className={`flex-1 py-1.5 px-2 rounded border text-center transition-colors whitespace-nowrap ${
                      !settings.dataSaver
                        ? 'bg-amber-700 border-amber-700 text-white font-medium'
                        : 'border-current/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    Resolusi Asli (HD)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('dataSaver', true)}
                    className={`flex-1 py-1.5 px-2 rounded border text-center transition-colors whitespace-nowrap ${
                      settings.dataSaver
                        ? 'bg-amber-700 border-amber-700 text-white font-medium'
                        : 'border-current/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    Hemat Kuota (Cepat)
                  </button>
                </div>
              </div>

              {/* Canvas Background */}
              <div>
                <span className="block opacity-60 mb-1.5">Latar Kanvas</span>
                <div className="flex gap-1">
                  {(
                    [
                      { id: 'ink', label: 'Tinta Hitam' },
                      { id: 'charcoal', label: 'Abu Gelap' },
                      { id: 'paper', label: 'Kertas Arsip' },
                    ] as const
                  ).map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => updateSetting('background', bg.id)}
                      className={`flex-1 py-1.5 px-2 rounded border text-center transition-colors whitespace-nowrap ${
                        settings.background === bg.id
                          ? 'bg-amber-700 border-amber-700 text-white font-medium'
                          : 'border-current/15 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Reader Canvas */}
      <main className="flex-1 flex flex-col items-center justify-center relative">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Menghubungkan ke server MangaDex@Home...</p>
            <p className="text-xs opacity-60 font-tabular">
              Memuat {chapter.chapter ? `Bab ${chapter.chapter}` : 'Oneshot'}
            </p>
          </div>
        ) : error ? (
          <div className="py-24 px-4 max-w-md mx-auto text-center">
            <p className="font-editorial text-2xl mb-2">Gagal Memuat Bab</p>
            <p className="text-sm opacity-75 mb-6">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={loadPages}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-amber-700 text-white rounded hover:bg-amber-600 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium border border-current/20 rounded hover:bg-current/5 transition-colors"
              >
                Kembali ke Detail
              </button>
            </div>
          </div>
        ) : activePages.length === 0 ? (
          <div className="py-24 px-4 max-w-md mx-auto text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="font-editorial text-2xl mb-2">Bab Tidak Memiliki Halaman</p>
            <p className="text-sm opacity-75 mb-6">
              Bab ini mungkin ditautkan ke penerbit eksternal atau belum memiliki berkas gambar di MangaDex.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium bg-amber-700 text-white rounded hover:bg-amber-600 transition-colors"
            >
              Pilih Bab Lain
            </button>
          </div>
        ) : settings.mode === 'vertical' ? (
          /* Vertical Long-Strip / Webtoon Mode */
          <div
            onClick={() => setShowControls((v) => !v)}
            className="w-full flex flex-col items-center pb-16 cursor-pointer"
          >
            {activePages.map((page, index) => (
              <PageImage
                key={`${chapter.id}-${index}-${settings.dataSaver ? 'saver' : 'hd'}`}
                index={index}
                total={totalPages}
                proxyUrl={page.proxyUrl}
                directUrl={page.directUrl}
                fit={settings.fit}
                mode="vertical"
                onVisible={handlePageVisibility}
              />
            ))}

            {/* End of Chapter Transition Card */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[680px] mx-auto mt-12 px-6 py-10 border-t border-b border-current/15 text-center"
            >
              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Tersimpan otomatis di Riwayat Baca Lokal</span>
              </div>
              <h2 className="font-editorial text-3xl mb-1">
                Selesai Membaca {chapter.chapter ? `Bab ${chapter.chapter}` : 'Oneshot'}
              </h2>
              <p className="text-xs opacity-65 mb-6">
                {chapter.title || manga.title} · {totalPages} Halaman
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {prevChapter && (
                  <button
                    type="button"
                    onClick={() => onSelectChapter(prevChapter, 0)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-current/20 rounded hover:bg-current/5 transition-colors whitespace-nowrap"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>
                      Bab Sebelumnya ({prevChapter.chapter ? `Bab ${prevChapter.chapter}` : 'Oneshot'})
                    </span>
                  </button>
                )}

                {nextChapter ? (
                  <button
                    type="button"
                    onClick={() => onSelectChapter(nextChapter, 0)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-amber-700 text-white rounded hover:bg-amber-600 transition-colors whitespace-nowrap"
                  >
                    <span>
                      Lanjut ke {nextChapter.chapter ? `Bab ${nextChapter.chapter}` : 'Bab Berikutnya'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-amber-700 text-white rounded hover:bg-amber-600 transition-colors whitespace-nowrap"
                  >
                    <span>Kembali ke Daftar Bab</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Single Page Mode (LTR or RTL) */
          <div className="w-full flex-1 flex flex-col items-center justify-center py-4 px-2 sm:px-6 relative">
            <div className="relative w-full flex items-center justify-center">
              {/* Clickable Left / Center / Right Navigation Zones */}
              <div
                onClick={() =>
                  settings.mode === 'single-rtl' ? goToNextPage() : goToPrevPage()
                }
                title={
                  settings.mode === 'single-rtl'
                    ? 'Klik untuk halaman berikutnya (RTL)'
                    : 'Klik untuk halaman sebelumnya'
                }
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
              />
              <div
                onClick={() => setShowControls((v) => !v)}
                title="Tampilkan / sembunyikan bilah navigasi"
                className="absolute inset-y-0 left-1/3 w-1/3 z-20 cursor-pointer"
              />
              <div
                onClick={() =>
                  settings.mode === 'single-rtl' ? goToPrevPage() : goToNextPage()
                }
                title={
                  settings.mode === 'single-rtl'
                    ? 'Klik untuk halaman sebelumnya (RTL)'
                    : 'Klik untuk halaman berikutnya'
                }
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
              />

              {activePages[currentPage] && (
                <PageImage
                  key={`${chapter.id}-single-${currentPage}-${settings.dataSaver ? 'saver' : 'hd'}`}
                  index={currentPage}
                  total={totalPages}
                  proxyUrl={activePages[currentPage].proxyUrl}
                  directUrl={activePages[currentPage].directUrl}
                  fit={settings.fit}
                  mode={settings.mode}
                />
              )}
            </div>

            {/* Single-page bottom navigation controls */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 z-30">
              <button
                type="button"
                onClick={() =>
                  settings.mode === 'single-rtl' ? goToNextPage() : goToPrevPage()
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-current/20 rounded hover:bg-current/5 transition-colors whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{settings.mode === 'single-rtl' ? 'Halaman Berikutnya' : 'Sebelumnya'}</span>
              </button>

              <span className="text-xs font-tabular px-3">
                Halaman {currentPage + 1} dari {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  settings.mode === 'single-rtl' ? goToPrevPage() : goToNextPage()
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-700 text-white rounded hover:bg-amber-600 transition-colors whitespace-nowrap"
              >
                <span>{settings.mode === 'single-rtl' ? 'Sebelumnya' : 'Halaman Berikutnya'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Progress Scrubber Bar */}
      {totalPages > 0 && (
        <footer
          className={`sticky bottom-0 z-40 border-t transition-transform duration-200 ${
            settings.background === 'paper'
              ? 'bg-[#F4F1EA]/95 border-stone-300 text-stone-900'
              : 'bg-[#09090B]/95 border-stone-800 text-stone-100'
          } backdrop-blur-md ${showControls ? 'translate-y-0' : 'translate-y-full'}`}
        >
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-12 flex items-center gap-4">
            <span className="text-xs font-tabular whitespace-nowrap shrink-0">
              Hal. {currentPage + 1} / {totalPages}
            </span>

            <input
              type="range"
              min={0}
              max={Math.max(0, totalPages - 1)}
              value={currentPage}
              onChange={(e) => handleScrubberChange(Number(e.target.value))}
              aria-label="Navigasi Halaman"
              className="w-full accent-amber-700 cursor-pointer h-1.5 bg-stone-700/40 rounded-lg"
            />

            <span className="text-xs font-tabular opacity-60 whitespace-nowrap shrink-0 hidden sm:inline">
              {Math.round(((currentPage + 1) / totalPages) * 100)}% selesai
            </span>
          </div>
        </footer>
      )}
    </div>
  );
};
