import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Trash2,
  Download,
  Upload,
  Clock,
  Bookmark,
  Search,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  LibraryEntry,
  LibraryReadingStatus,
  ReadingHistoryEntry,
} from '../types/manga';
import {
  clearAllHistory,
  exportLocalBackup,
  getLibrary,
  getReadingHistory,
  importLocalBackup,
  removeHistoryEntry,
  removeLibraryEntry,
} from '../services/localStorage';
import { CoverImage } from './CoverImage';

interface HistoryAndLibraryViewProps {
  initialTab?: 'history' | 'library' | 'backup';
  onOpenMangaById: (mangaId: string) => void;
  onResumeHistoryEntry: (entry: ReadingHistoryEntry) => void;
  onExploreCatalog: () => void;
}

const STATUS_LABELS: Record<LibraryReadingStatus, string> = {
  reading: 'Sedang Dibaca',
  plan_to_read: 'Ingin Dibaca',
  completed: 'Selesai Dibaca',
  on_hold: 'Ditunda',
};

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const HistoryAndLibraryView: React.FC<HistoryAndLibraryViewProps> = ({
  initialTab = 'history',
  onOpenMangaById,
  onResumeHistoryEntry,
  onExploreCatalog,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'library' | 'backup'>(initialTab);
  const [history, setHistory] = useState<ReadingHistoryEntry[]>(() => getReadingHistory());
  const [library, setLibrary] = useState<LibraryEntry[]>(() => getLibrary());
  const [libraryFilter, setLibraryFilter] = useState<'all' | LibraryReadingStatus>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const sync = () => {
      setHistory(getReadingHistory());
      setLibrary(getLibrary());
    };
    window.addEventListener('kurohon-storage-update', sync);
    return () => window.removeEventListener('kurohon-storage-update', sync);
  }, []);

  const filteredHistory = React.useMemo(() => {
    if (!localSearch.trim()) return history;
    const q = localSearch.trim().toLowerCase();
    return history.filter(
      (h) =>
        h.mangaTitle.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q) ||
        h.chapterTitle.toLowerCase().includes(q)
    );
  }, [history, localSearch]);

  const filteredLibrary = React.useMemo(() => {
    return library.filter((item) => {
      const matchesStatus = libraryFilter === 'all' || item.readingStatus === libraryFilter;
      const matchesQuery =
        !localSearch.trim() ||
        item.mangaTitle.toLowerCase().includes(localSearch.trim().toLowerCase()) ||
        item.author.toLowerCase().includes(localSearch.trim().toLowerCase()) ||
        (item.personalNote &&
          item.personalNote.toLowerCase().includes(localSearch.trim().toLowerCase()));
      return matchesStatus && matchesQuery;
    });
  }, [library, libraryFilter, localSearch]);

  const handleDownloadBackup = () => {
    const json = exportLocalBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mikma-riwayat-lokal-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMessage({
      type: 'success',
      text: 'Berkas cadangan JSON berhasil diunduh ke perangkat Anda.',
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const result = importLocalBackup(content);
      setBackupMessage({
        type: result.success ? 'success' : 'error',
        text: result.message,
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-200 dark:border-stone-800">
        <div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
            Penyimpanan Peramban Lokal · Tanpa Akun & Tanpa Login
          </p>
          <h1 className="font-editorial text-4xl sm:text-5xl text-stone-900 dark:text-stone-100">
            Arsip & Riwayat Baca Pribadi
          </h1>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center p-1 bg-stone-200/70 dark:bg-stone-900 rounded border border-stone-300/60 dark:border-stone-800 text-xs self-start">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-tabular">Riwayat Baca ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'library'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="font-tabular">Koleksi Tersimpan ({library.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm transition-colors whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cadangkan JSON</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar for History / Library */}
      {activeTab !== 'backup' && (
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={
                activeTab === 'history'
                  ? 'Cari judul atau penulis di riwayat baca...'
                  : 'Cari di koleksi tersimpan...'
              }
              className="w-full pl-9 pr-4 py-2 text-xs bg-transparent border border-stone-300 dark:border-stone-800 rounded focus:outline-none focus:border-amber-700"
            />
          </div>

          {activeTab === 'history' && history.length > 0 && (
            <div className="flex items-center gap-2">
              {confirmClear ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-700 dark:text-red-400">Hapus seluruh riwayat?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearAllHistory();
                      setConfirmClear(false);
                    }}
                    className="px-3 py-1.5 bg-red-700 text-white rounded font-medium hover:bg-red-600 transition-colors"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-red-700 dark:hover:text-red-400 border border-stone-300 dark:border-stone-800 rounded transition-colors whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Semua Riwayat</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'library' && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'reading', label: 'Sedang Dibaca' },
                  { id: 'plan_to_read', label: 'Ingin Dibaca' },
                  { id: 'completed', label: 'Selesai' },
                  { id: 'on_hold', label: 'Ditunda' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setLibraryFilter(st.id)}
                  className={`px-3 py-1.5 rounded border transition-colors whitespace-nowrap ${
                    libraryFilter === st.id
                      ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100 font-medium'
                      : 'border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: READING HISTORY */}
      {activeTab === 'history' && (
        <div className="mt-8">
          {filteredHistory.length === 0 ? (
            <div className="py-20 px-4 border border-stone-200 dark:border-stone-800 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-stone-400" />
              <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mb-1">
                Belum Ada Riwayat Bacaan
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
                Setiap manga dan halaman bab yang Anda baca akan otomatis tercatat secara lokal di peramban ini tanpa perlu login.
              </p>
              <button
                type="button"
                onClick={onExploreCatalog}
                className="px-5 py-2.5 text-xs font-medium bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors"
              >
                Jelajahi Katalog MangaDex
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-200 dark:divide-stone-800 border-t border-b border-stone-200 dark:border-stone-800">
              {filteredHistory.map((item) => {
                const percent =
                  item.totalPages > 0
                    ? Math.min(100, Math.round(((item.currentPage + 1) / item.totalPages) * 100))
                    : 0;

                return (
                  <div
                    key={`${item.mangaId}-${item.chapterId}`}
                    className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div
                        onClick={() => onOpenMangaById(item.mangaId)}
                        className="w-16 sm:w-20 shrink-0 cursor-pointer"
                      >
                        <CoverImage
                          src={item.coverUrl}
                          mangaId={item.mangaId}
                          title={item.mangaTitle}
                          author={item.author}
                          aspectClassName="aspect-[3/4]"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-stone-500 dark:text-stone-400 font-tabular">
                          <span>{item.author}</span>
                          <span aria-hidden="true">·</span>
                          <span className="uppercase">{item.language}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatRelativeTime(item.updatedAt)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenMangaById(item.mangaId)}
                          className="mt-1 font-editorial text-xl sm:text-2xl text-left text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-400 transition-colors line-clamp-1"
                        >
                          {item.mangaTitle}
                        </button>

                        <p className="mt-0.5 text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300 font-tabular">
                          Bab {item.chapterNumber}
                          {item.chapterTitle ? ` — ${item.chapterTitle}` : ''}
                        </p>

                        {/* Reading Progress Bar */}
                        <div className="mt-3 max-w-xs">
                          <div className="flex justify-between text-[11px] font-tabular text-stone-500 dark:text-stone-400 mb-1">
                            <span>
                              Halaman {item.currentPage + 1} dari {item.totalPages}
                            </span>
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full h-1 bg-stone-200 dark:bg-stone-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-700 transition-all duration-200"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onResumeHistoryEntry(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors whitespace-nowrap"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="font-tabular">
                          Lanjutkan (Hal. {item.currentPage + 1})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenMangaById(item.mangaId)}
                        className="px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-800 rounded hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors whitespace-nowrap"
                      >
                        Daftar Bab
                      </button>

                      <button
                        type="button"
                        onClick={() => removeHistoryEntry(item.mangaId)}
                        title="Hapus dari riwayat"
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOCAL LIBRARY / BOOKMARKS */}
      {activeTab === 'library' && (
        <div className="mt-8">
          {filteredLibrary.length === 0 ? (
            <div className="py-20 px-4 border border-stone-200 dark:border-stone-800 text-center">
              <Bookmark className="w-8 h-8 mx-auto mb-3 text-stone-400" />
              <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mb-1">
                Koleksi Lokal Masih Kosong
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
                Tandai manga favorit Anda dengan status baca (Sedang Dibaca, Ingin Dibaca, Selesai) untuk diakses cepat kapan saja.
              </p>
              <button
                type="button"
                onClick={onExploreCatalog}
                className="px-5 py-2.5 text-xs font-medium bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors"
              >
                Cari Manga untuk Disimpan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLibrary.map((entry) => (
                <div
                  key={entry.mangaId}
                  className="flex gap-4 p-4 border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40"
                >
                  <div
                    onClick={() => onOpenMangaById(entry.mangaId)}
                    className="w-24 shrink-0 cursor-pointer"
                  >
                    <CoverImage
                      src={entry.coverUrl}
                      mangaId={entry.mangaId}
                      title={entry.mangaTitle}
                      author={entry.author}
                      aspectClassName="aspect-[3/4]"
                    />
                  </div>

                  <div className="flex flex-col justify-between min-w-0 flex-1">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-400 font-medium">
                        <span>{STATUS_LABELS[entry.readingStatus]}</span>
                        {entry.year && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-tabular text-stone-500">{entry.year}</span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenMangaById(entry.mangaId)}
                        className="mt-1 font-editorial text-xl text-left text-stone-900 dark:text-stone-100 hover:text-amber-800 dark:hover:text-amber-400 transition-colors line-clamp-2"
                      >
                        {entry.mangaTitle}
                      </button>

                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {entry.author}
                      </p>

                      {entry.personalNote && (
                        <p className="mt-2 text-xs italic text-stone-600 dark:text-stone-300 line-clamp-2 border-l-2 border-stone-300 dark:border-stone-700 pl-2">
                          “{entry.personalNote}”
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-2 border-t border-stone-200/80 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() => onOpenMangaById(entry.mangaId)}
                        className="text-xs font-medium text-stone-900 dark:text-stone-100 hover:underline"
                      >
                        Buka Manga
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLibraryEntry(entry.mangaId)}
                        className="text-xs text-stone-400 hover:text-red-600 transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BACKUP & RESTORE JSON */}
      {activeTab === 'backup' && (
        <div className="mt-8 max-w-2xl">
          <h2 className="font-editorial text-2xl text-stone-900 dark:text-stone-100 mb-2">
            Cadangkan & Pulihkan Data Lokal
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
            Mikma dirancang tanpa sistem login demi privasi dan kecepatan akses. Seluruh riwayat bacaan, halaman terakhir, tanda bab selesai, dan koleksi disimpan di <code className="font-tabular text-xs">localStorage</code> peramban Anda. Unduh salinan JSON untuk memindahkan data ke perangkat atau peramban lain.
          </p>

          {backupMessage && (
            <div
              className={`mb-6 p-4 border rounded flex items-start gap-3 text-xs ${
                backupMessage.type === 'success'
                  ? 'border-emerald-700/40 bg-emerald-950/10 text-emerald-800 dark:text-emerald-300'
                  : 'border-red-700/40 bg-red-950/10 text-red-800 dark:text-red-300'
              }`}
            >
              {backupMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{backupMessage.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 mb-1">
                  Ekspor Cadangan Lokal (.json)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
                  Mencakup {history.length} judul dalam riwayat baca dan {library.length} manga di koleksi tersimpan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Berkas Cadangan</span>
              </button>
            </div>

            <div className="p-6 border border-stone-200 dark:border-stone-800 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm text-stone-900 dark:text-stone-100 mb-1">
                  Impor Berkas Cadangan (.json)
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
                  Pilih berkas JSON hasil ekspor Mikma untuk memulihkan riwayat bacaan dan koleksi Anda.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih Berkas JSON</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
