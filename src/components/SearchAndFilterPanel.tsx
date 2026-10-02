import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  UserCheck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  AuthorOption,
  PublicationStatus,
  SearchFilters,
  SearchSortOption,
  SearchTargetMode,
} from '../types/manga';
import {
  CURATED_GENRES,
  fetchAllGenresAndThemes,
  GenreOption,
  searchAuthors,
} from '../services/mangadex';

interface SearchAndFilterPanelProps {
  filters: SearchFilters;
  resolvedAuthor?: AuthorOption | null;
  totalResults: number;
  loading: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onUpdateFilters: (updater: (prev: SearchFilters) => SearchFilters) => void;
  onResetFilters: () => void;
}

const NOTABLE_AUTHORS: Array<{ name: string }> = [
  { name: 'Naoki Urasawa' },
  { name: 'Tatsuki Fujimoto' },
  { name: 'Takehiko Inoue' },
  { name: 'Eiichiro Oda' },
  { name: 'Kentaro Miura' },
  { name: 'ONE' },
];

export const SearchAndFilterPanel: React.FC<SearchAndFilterPanelProps> = ({
  filters,
  resolvedAuthor,
  totalResults,
  loading,
  viewMode,
  onViewModeChange,
  onUpdateFilters,
  onResetFilters,
}) => {
  const [titleInput, setTitleInput] = useState(filters.query);
  const [authorInput, setAuthorInput] = useState(
    filters.selectedAuthor?.name || filters.authorQuery || ''
  );
  const [authorSuggestions, setAuthorSuggestions] = useState<AuthorOption[]>([]);
  const [loadingAuthors, setLoadingAuthors] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  const [allGenres, setAllGenres] = useState<GenreOption[]>(CURATED_GENRES);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [genreSearchInput, setGenreSearchInput] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);

  const authorBoxRef = useRef<HTMLDivElement | null>(null);

  // Sync local inputs when parent resets or updates filters externally
  useEffect(() => {
    setTitleInput(filters.query);
  }, [filters.query]);

  useEffect(() => {
    setAuthorInput(filters.selectedAuthor?.name || filters.authorQuery || '');
  }, [filters.selectedAuthor, filters.authorQuery]);

  // Load all official MangaDex genres & themes once on mount
  useEffect(() => {
    let active = true;
    fetchAllGenresAndThemes().then((tags) => {
      if (active && tags.length > 0) {
        setAllGenres(tags);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Close author dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (authorBoxRef.current && !authorBoxRef.current.contains(e.target as Node)) {
        setShowAuthorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live author lookup from MangaDex /author endpoint
  useEffect(() => {
    const q = authorInput.trim();
    if (!q || (filters.selectedAuthor && filters.selectedAuthor.name === q)) {
      setAuthorSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAuthors(true);
      const results = await searchAuthors(q);
      setAuthorSuggestions(results);
      setLoadingAuthors(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [authorInput, filters.selectedAuthor]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateFilters((prev) => ({
      ...prev,
      query: titleInput.trim(),
      authorQuery: prev.selectedAuthor ? '' : authorInput.trim(),
      offset: 0,
    }));
    setShowAuthorDropdown(false);
  };

  const handleSelectAuthorSuggestion = (author: AuthorOption) => {
    setAuthorInput(author.name);
    setShowAuthorDropdown(false);
    onUpdateFilters((prev) => ({
      ...prev,
      selectedAuthor: author,
      authorQuery: '',
      offset: 0,
    }));
  };

  const handleClearAuthor = () => {
    setAuthorInput('');
    setAuthorSuggestions([]);
    onUpdateFilters((prev) => ({
      ...prev,
      selectedAuthor: null,
      authorQuery: '',
      offset: 0,
    }));
  };

  const handleToggleGenre = (tagId: string) => {
    onUpdateFilters((prev) => {
      const exists = prev.tagIds.includes(tagId);
      const nextTags = exists
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId];
      return {
        ...prev,
        tagIds: nextTags,
        offset: 0,
      };
    });
  };

  const filteredGenreOptions = React.useMemo(() => {
    const q = genreSearchInput.trim().toLowerCase();
    const list = q
      ? allGenres.filter(
          (g) =>
            g.label.toLowerCase().includes(q) || g.nameEn.toLowerCase().includes(q)
        )
      : allGenres;
    return showAllGenres || q ? list : list.slice(0, 18);
  }, [allGenres, genreSearchInput, showAllGenres]);

  const hasActiveFilters =
    Boolean(filters.query.trim()) ||
    Boolean(filters.selectedAuthor) ||
    Boolean(filters.authorQuery.trim()) ||
    filters.tagIds.length > 0 ||
    filters.status !== 'all' ||
    filters.demographic !== 'all' ||
    filters.language !== 'all' ||
    Boolean(filters.year.trim());

  const activeAuthorDisplay = filters.selectedAuthor || resolvedAuthor;

  return (
    <section
      aria-label="Sistem Pencarian dan Filter Katalog MangaDex"
      className="border-b border-stone-200 dark:border-stone-800 pb-8 mb-8"
    >
      {/* Primary Search Form: Title, Target Mode, and Author Autocomplete */}
      <form onSubmit={handleSearchSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* 1. Title / Keyword Input + Target Selector (7 cols) */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row gap-2">
            {/* Search Target Mode Selector */}
            <div className="flex items-center p-1 bg-stone-200/70 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded text-xs shrink-0">
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: 'title', label: 'Judul' },
                  { id: 'author', label: 'Penulis' },
                ] as Array<{ id: SearchTargetMode; label: string }>
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    onUpdateFilters((prev) => ({
                      ...prev,
                      searchTarget: mode.id,
                      offset: 0,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-sm transition-colors whitespace-nowrap ${
                    filters.searchTarget === mode.id
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Main Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder={
                  filters.searchTarget === 'author'
                    ? 'Ketik nama penulis (contoh: Naoki Urasawa, Tatsuki Fujimoto)...'
                    : filters.searchTarget === 'title'
                    ? 'Cari judul manga (contoh: Berserk, One Piece, Monster, Frieren)...'
                    : 'Cari berdasarkan judul manga atau nama penulis...'
                }
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded focus:outline-none focus:border-amber-700"
              />
              {titleInput && (
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput('');
                    onUpdateFilters((prev) => ({ ...prev, query: '', offset: 0 }));
                  }}
                  aria-label="Hapus kata kunci judul"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Dedicated Author Search & Autocomplete Input (5 cols) */}
          <div ref={authorBoxRef} className="lg:col-span-5 relative flex gap-2">
            <div className="relative flex-1">
              <UserCheck className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={authorInput}
                onFocus={() => setShowAuthorDropdown(true)}
                onChange={(e) => {
                  setAuthorInput(e.target.value);
                  setShowAuthorDropdown(true);
                  if (filters.selectedAuthor) {
                    onUpdateFilters((prev) => ({
                      ...prev,
                      selectedAuthor: null,
                    }));
                  }
                }}
                placeholder="Filter Penulis / Ilustrator (misal: Takehiko Inoue)..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded focus:outline-none focus:border-amber-700"
              />
              {authorInput && (
                <button
                  type="button"
                  onClick={handleClearAuthor}
                  aria-label="Hapus filter penulis"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Live Author Suggestions Dropdown from MangaDex /author API */}
              {showAuthorDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded shadow-lg py-2 max-h-64 overflow-y-auto text-xs">
                  {loadingAuthors ? (
                    <div className="px-3 py-2 text-stone-500">
                      Mencari penulis di database MangaDex...
                    </div>
                  ) : authorSuggestions.length > 0 ? (
                    <div>
                      <div className="px-3 py-1 text-[11px] text-stone-400 border-b border-stone-200 dark:border-stone-800">
                        Pilih penulis resmi dari MangaDex:
                      </div>
                      {authorSuggestions.map((author) => (
                        <button
                          key={author.id}
                          type="button"
                          onClick={() => handleSelectAuthorSuggestion(author)}
                          className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between transition-colors"
                        >
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            {author.name}
                          </span>
                          <span className="text-[11px] text-stone-400 font-tabular">
                            Pilih Penulis
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5">
                      <p className="text-[11px] text-stone-400 mb-2">
                        Populer — Klik untuk memfilter karya penulis:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {NOTABLE_AUTHORS.map((a) => (
                          <button
                            key={a.name}
                            type="button"
                            onClick={async () => {
                              setAuthorInput(a.name);
                              setShowAuthorDropdown(false);
                              const found = await searchAuthors(a.name);
                              if (found.length > 0) {
                                handleSelectAuthorSuggestion(found[0]);
                              } else {
                                onUpdateFilters((prev) => ({
                                  ...prev,
                                  authorQuery: a.name,
                                  offset: 0,
                                }));
                              }
                            }}
                            className="px-2.5 py-1 rounded border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors"
                          >
                            {a.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-medium bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors whitespace-nowrap shrink-0"
            >
              Cari Manga
            </button>
          </div>
        </div>
      </form>

      {/* Secondary Filter Bar: Sort, Status, Demographic, Language, Year, and Panel Toggle */}
      <div className="mt-4 pt-4 border-t border-stone-200/70 dark:border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="sort-select" className="text-stone-500 dark:text-stone-400">
              Urutkan:
            </label>
            <select
              id="sort-select"
              value={filters.sort}
              onChange={(e) =>
                onUpdateFilters((prev) => ({
                  ...prev,
                  sort: e.target.value as SearchSortOption,
                  offset: 0,
                }))
              }
              className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded font-medium focus:outline-none focus:border-amber-700"
            >
              <option value="popular">Populer (Pengikut Terbanyak)</option>
              <option value="rating">Rating Tertinggi</option>
              <option value="latest">Update Bab Terbaru</option>
              <option value="relevance">Relevansi Terbaik</option>
              <option value="title_asc">Judul (A – Z)</option>
              <option value="year_desc">Tahun Terbit Terbaru</option>
              <option value="newest">Baru Ditambahkan</option>
            </select>
          </div>

          {/* Publication Status Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="status-select" className="text-stone-500 dark:text-stone-400">
              Status:
            </label>
            <select
              id="status-select"
              value={filters.status}
              onChange={(e) =>
                onUpdateFilters((prev) => ({
                  ...prev,
                  status: e.target.value as 'all' | PublicationStatus,
                  offset: 0,
                }))
              }
              className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded font-medium focus:outline-none focus:border-amber-700"
            >
              <option value="all">Semua Status</option>
              <option value="ongoing">Berlanjut (Ongoing)</option>
              <option value="completed">Tamat (Completed)</option>
              <option value="hiatus">Hiatus</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>

          {/* Demographic Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="demo-select" className="text-stone-500 dark:text-stone-400">
              Demografi:
            </label>
            <select
              id="demo-select"
              value={filters.demographic}
              onChange={(e) =>
                onUpdateFilters((prev) => ({
                  ...prev,
                  demographic: e.target.value as SearchFilters['demographic'],
                  offset: 0,
                }))
              }
              className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded font-medium focus:outline-none focus:border-amber-700"
            >
              <option value="all">Semua Demografi</option>
              <option value="shounen">Shounen</option>
              <option value="seinen">Seinen</option>
              <option value="shoujo">Shoujo</option>
              <option value="josei">Josei</option>
            </select>
          </div>

          {/* Translated Language Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="lang-select" className="text-stone-500 dark:text-stone-400">
              Bahasa Bab:
            </label>
            <select
              id="lang-select"
              value={filters.language}
              onChange={(e) =>
                onUpdateFilters((prev) => ({
                  ...prev,
                  language: e.target.value as SearchFilters['language'],
                  offset: 0,
                }))
              }
              className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded font-medium focus:outline-none focus:border-amber-700"
            >
              <option value="all">Semua Bahasa</option>
              <option value="id">Bahasa Indonesia (ID)</option>
              <option value="en">English (EN)</option>
              <option value="ja">Japanese (JA)</option>
            </select>
          </div>

          {/* Publication Year Input */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="year-input" className="text-stone-500 dark:text-stone-400">
              Tahun:
            </label>
            <input
              id="year-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={filters.year}
              onChange={(e) =>
                onUpdateFilters((prev) => ({
                  ...prev,
                  year: e.target.value.replace(/\D/g, ''),
                  offset: 0,
                }))
              }
              placeholder="Semua"
              className="w-20 px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded font-tabular focus:outline-none focus:border-amber-700"
            />
          </div>
        </div>

        {/* Right Controls: Toggle Genre Drawer & View Mode (Grid / List) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors whitespace-nowrap ${
              isAdvancedOpen || filters.tagIds.length > 0
                ? 'border-amber-800/50 bg-amber-950/10 text-amber-900 dark:text-amber-300 font-medium'
                : 'border-stone-300 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              Filter Genre {filters.tagIds.length > 0 ? `(${filters.tagIds.length})` : ''}
            </span>
            {isAdvancedOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Grid vs Detailed List View Switcher */}
          <div className="flex items-center p-0.5 bg-stone-200/70 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              title="Tampilan Grid Katalog"
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="Tampilan Daftar Detail"
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Multi-Genre & Theme Selector */}
      {isAdvancedOpen && (
        <div className="mt-4 pt-4 border-t border-stone-200/70 dark:border-stone-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Pilih Genre & Tema MangaDex (Bisa lebih dari satu):
              </span>

              {/* Tag Combination Mode: AND vs OR */}
              <div className="inline-flex items-center p-0.5 bg-stone-200/70 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFilters((prev) => ({ ...prev, tagMode: 'AND', offset: 0 }))
                  }
                  className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${
                    filters.tagMode === 'AND'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium'
                      : 'text-stone-500'
                  }`}
                >
                  Wajib Semua (AND)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFilters((prev) => ({ ...prev, tagMode: 'OR', offset: 0 }))
                  }
                  className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${
                    filters.tagMode === 'OR'
                      ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium'
                      : 'text-stone-500'
                  }`}
                >
                  Salah Satu (OR)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={genreSearchInput}
                onChange={(e) => setGenreSearchInput(e.target.value)}
                placeholder="Filter daftar genre..."
                className="px-2.5 py-1 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded focus:outline-none focus:border-amber-700 w-44"
              />
              <button
                type="button"
                onClick={() => setShowAllGenres((v) => !v)}
                className="text-xs text-amber-800 dark:text-amber-400 hover:underline whitespace-nowrap"
              >
                {showAllGenres
                  ? 'Ringkas Daftar'
                  : `Tampilkan Semua (${allGenres.length} Genre & Tema)`}
              </button>
            </div>
          </div>

          {/* Interactive Multi-Select Genre Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateFilters((prev) => ({ ...prev, tagIds: [], offset: 0 }))
              }
              className={`px-3 py-1.5 text-xs rounded border transition-colors whitespace-nowrap ${
                filters.tagIds.length === 0
                  ? 'bg-stone-900 text-stone-50 border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100 font-medium'
                  : 'border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              Semua Genre
            </button>

            {filteredGenreOptions.map((genre) => {
              const isSelected = filters.tagIds.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => handleToggleGenre(genre.id)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber-800 text-white border-amber-800 font-medium'
                      : 'border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-700 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  {genre.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Filter Status Bar & Result Counter */}
      <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-stone-600 dark:text-stone-400">
          <span className="font-tabular font-medium text-stone-900 dark:text-stone-100">
            {loading
              ? 'Memuat hasil dari MangaDex...'
              : `${totalResults.toLocaleString('id-ID')} judul ditemukan`}
          </span>

          {filters.query.trim() && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Kata kunci: <strong className="text-stone-900 dark:text-stone-100">“{filters.query}”</strong>
              </span>
            </>
          )}

          {activeAuthorDisplay && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                Penulis/Ilustrator:{' '}
                <strong className="text-amber-800 dark:text-amber-400">
                  {activeAuthorDisplay.name}
                </strong>
                <button
                  type="button"
                  onClick={handleClearAuthor}
                  className="text-stone-400 hover:text-red-600 ml-0.5"
                  title="Hapus filter penulis"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            </>
          )}

          {filters.tagIds.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Genre ({filters.tagMode}):{' '}
                <strong className="text-stone-900 dark:text-stone-100">
                  {filters.tagIds
                    .map((id) => allGenres.find((g) => g.id === id)?.label || 'Genre')
                    .join(', ')}
                </strong>
              </span>
            </>
          )}

          {filters.status !== 'all' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="capitalize">Status: {filters.status}</span>
            </>
          )}

          {filters.demographic !== 'all' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="capitalize">Demografi: {filters.demographic}</span>
            </>
          )}

          {filters.language !== 'all' && (
            <>
              <span aria-hidden="true">·</span>
              <span className="uppercase">Bahasa: {filters.language}</span>
            </>
          )}

          {filters.year.trim() && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-tabular">Tahun: {filters.year}</span>
            </>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setTitleInput('');
              setAuthorInput('');
              onResetFilters();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>
    </section>
  );
};
