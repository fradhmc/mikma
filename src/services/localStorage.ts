import {
  ChapterProgress,
  LibraryEntry,
  LibraryReadingStatus,
  MangaItem,
  ReaderSettings,
  ReadingHistoryEntry,
} from '../types/manga';

const KEYS = {
  HISTORY: 'kurohon_reading_history_v1',
  CHAPTER_PROGRESS: 'kurohon_chapter_progress_v1',
  LIBRARY: 'kurohon_library_v1',
  READER_SETTINGS: 'kurohon_reader_settings_v1',
  THEME: 'kurohon_ui_theme_v1',
};

const DEFAULT_READER_SETTINGS: ReaderSettings = {
  mode: 'vertical',
  fit: 'optimal',
  dataSaver: false,
  showPageIndicator: true,
  background: 'ink',
};

function notifyStorageChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kurohon-storage-update'));
  }
}

// 1. Reading History (Chronological per Manga)
export function getReadingHistory(): ReadingHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReadingHistoryEntry(entry: ReadingHistoryEntry): void {
  try {
    const current = getReadingHistory();
    // Remove previous entry for the same manga so each manga appears once at top of recent history,
    // while per-chapter history is preserved in CHAPTER_PROGRESS
    const filtered = current.filter((item) => item.mangaId !== entry.mangaId);
    const updated = [entry, ...filtered].slice(0, 200);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));

    // Also update per-chapter progress map
    saveChapterProgress(entry.mangaId, {
      chapterId: entry.chapterId,
      chapterNumber: entry.chapterNumber,
      chapterTitle: entry.chapterTitle,
      currentPage: entry.currentPage,
      totalPages: entry.totalPages,
      completed: entry.totalPages > 0 && entry.currentPage >= entry.totalPages - 1,
      readAt: entry.updatedAt,
    });

    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save reading history:', err);
  }
}

export function removeHistoryEntry(mangaId: string): void {
  try {
    const current = getReadingHistory();
    const updated = current.filter((item) => item.mangaId !== mangaId);
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(updated));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to remove history entry:', err);
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(KEYS.HISTORY);
    localStorage.removeItem(KEYS.CHAPTER_PROGRESS);
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}

export function getLastReadForManga(mangaId: string): ReadingHistoryEntry | null {
  const history = getReadingHistory();
  return history.find((item) => item.mangaId === mangaId) || null;
}

// 2. Per-Chapter Progress Tracking
type MangaChapterMap = Record<string, Record<string, ChapterProgress>>;

function getAllChapterProgressMap(): MangaChapterMap {
  try {
    const raw = localStorage.getItem(KEYS.CHAPTER_PROGRESS);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function getMangaChapterProgress(mangaId: string): Record<string, ChapterProgress> {
  const all = getAllChapterProgressMap();
  return all[mangaId] || {};
}

export function saveChapterProgress(mangaId: string, progress: ChapterProgress): void {
  try {
    const all = getAllChapterProgressMap();
    if (!all[mangaId]) {
      all[mangaId] = {};
    }
    const existing = all[mangaId][progress.chapterId];
    all[mangaId][progress.chapterId] = {
      ...progress,
      completed: progress.completed || (existing?.completed ?? false),
    };
    localStorage.setItem(KEYS.CHAPTER_PROGRESS, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save chapter progress:', err);
  }
}

export function toggleChapterReadStatus(
  mangaId: string,
  chapterId: string,
  chapterNumber: string,
  chapterTitle: string,
  totalPages: number
): boolean {
  try {
    const all = getAllChapterProgressMap();
    if (!all[mangaId]) {
      all[mangaId] = {};
    }
    const existing = all[mangaId][chapterId];
    const nextCompleted = !existing?.completed;

    if (nextCompleted) {
      all[mangaId][chapterId] = {
        chapterId,
        chapterNumber,
        chapterTitle,
        currentPage: totalPages > 0 ? totalPages - 1 : 1,
        totalPages: totalPages || 1,
        completed: true,
        readAt: Date.now(),
      };
    } else {
      delete all[mangaId][chapterId];
    }

    localStorage.setItem(KEYS.CHAPTER_PROGRESS, JSON.stringify(all));
    notifyStorageChange();
    return nextCompleted;
  } catch {
    return false;
  }
}

// 3. Local Library / Bookmarks
export function getLibrary(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(KEYS.LIBRARY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLibraryEntry(mangaId: string): LibraryEntry | null {
  const list = getLibrary();
  return list.find((item) => item.mangaId === mangaId) || null;
}

export function upsertLibraryEntry(
  manga: MangaItem,
  readingStatus: LibraryReadingStatus,
  personalNote?: string
): LibraryEntry {
  const list = getLibrary();
  const existingIndex = list.findIndex((item) => item.mangaId === manga.id);
  const now = Date.now();

  const entry: LibraryEntry = {
    mangaId: manga.id,
    mangaTitle: manga.title,
    coverUrl: manga.coverUrl,
    author: manga.author,
    year: manga.year,
    publicationStatus: manga.status,
    readingStatus,
    addedAt: existingIndex >= 0 ? list[existingIndex].addedAt : now,
    updatedAt: now,
    personalNote: personalNote ?? (existingIndex >= 0 ? list[existingIndex].personalNote : undefined),
  };

  if (existingIndex >= 0) {
    list[existingIndex] = entry;
  } else {
    list.unshift(entry);
  }

  localStorage.setItem(KEYS.LIBRARY, JSON.stringify(list));
  notifyStorageChange();
  return entry;
}

export function removeLibraryEntry(mangaId: string): void {
  const list = getLibrary().filter((item) => item.mangaId !== mangaId);
  localStorage.setItem(KEYS.LIBRARY, JSON.stringify(list));
  notifyStorageChange();
}

// 4. Reader Settings & Theme
export function getReaderSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(KEYS.READER_SETTINGS);
    if (!raw) return DEFAULT_READER_SETTINGS;
    return { ...DEFAULT_READER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveReaderSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const updated = { ...getReaderSettings(), ...settings };
  localStorage.setItem(KEYS.READER_SETTINGS, JSON.stringify(updated));
  notifyStorageChange();
  return updated;
}

export function getUiTheme(): 'paper' | 'ink' {
  try {
    const raw = localStorage.getItem(KEYS.THEME);
    return raw === 'ink' ? 'ink' : 'paper';
  } catch {
    return 'paper';
  }
}

export function setUiTheme(theme: 'paper' | 'ink'): void {
  localStorage.setItem(KEYS.THEME, theme);
  notifyStorageChange();
}

// 5. Export & Import JSON Backup
export interface LocalBackupPayload {
  version: number;
  exportedAt: string;
  history: ReadingHistoryEntry[];
  chapterProgress: MangaChapterMap;
  library: LibraryEntry[];
  readerSettings: ReaderSettings;
}

export function exportLocalBackup(): string {
  const payload: LocalBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    history: getReadingHistory(),
    chapterProgress: getAllChapterProgressMap(),
    library: getLibrary(),
    readerSettings: getReaderSettings(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importLocalBackup(jsonString: string): {
  success: boolean;
  message: string;
  stats?: { historyCount: number; libraryCount: number };
} {
  try {
    const data = JSON.parse(jsonString) as Partial<LocalBackupPayload>;
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Format berkas JSON tidak valid.' };
    }

    const history = Array.isArray(data.history) ? data.history : [];
    const library = Array.isArray(data.library) ? data.library : [];
    const chapterProgress =
      data.chapterProgress && typeof data.chapterProgress === 'object' ? data.chapterProgress : {};

    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    localStorage.setItem(KEYS.LIBRARY, JSON.stringify(library));
    localStorage.setItem(KEYS.CHAPTER_PROGRESS, JSON.stringify(chapterProgress));

    if (data.readerSettings && typeof data.readerSettings === 'object') {
      saveReaderSettings(data.readerSettings);
    }

    notifyStorageChange();
    return {
      success: true,
      message: `Berhasil memulihkan ${history.length} riwayat baca dan ${library.length} koleksi manga.`,
      stats: { historyCount: history.length, libraryCount: library.length },
    };
  } catch {
    return {
      success: false,
      message: 'Gagal membaca berkas cadangan. Pastikan berkas berformat JSON dari Mikma.',
    };
  }
}
