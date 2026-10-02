import {
  AuthorOption,
  ChapterItem,
  DemographicType,
  MangaItem,
  MangaTag,
  PublicationStatus,
  SearchFilters,
} from '../types/manga';

const API_BASE = '/api/mangadex';
const DIRECT_MANGADEX_BASE = 'https://api.mangadex.org';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchMangaDexJson(subPath: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}${subPath}`, {
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Fallback to direct MangaDex API below if running plain Vite on localhost
  }

  const directRes = await fetch(`${DIRECT_MANGADEX_BASE}${subPath}`, {
    headers: { Accept: 'application/json' },
  });
  if (!directRes.ok) {
    throw new Error(`Gagal menghubungi server MangaDex (${directRes.status})`);
  }
  return await directRes.json();
}

export interface GenreOption {
  id: string;
  label: string;
  nameEn: string;
  group: 'genre' | 'theme' | 'format';
}

export const CURATED_GENRES: GenreOption[] = [
  { id: '391b0423-d847-456f-aff0-8b0cfc03066b', label: 'Aksi (Action)', nameEn: 'Action', group: 'genre' },
  { id: '87cc87cd-a395-47af-b27a-93258283bbc6', label: 'Petualangan (Adventure)', nameEn: 'Adventure', group: 'genre' },
  { id: '4d32cc48-9f00-4cca-9b5a-a839f0764984', label: 'Komedi (Comedy)', nameEn: 'Comedy', group: 'genre' },
  { id: 'b9af3a63-f058-46de-a9a0-e0c13906197a', label: 'Drama', nameEn: 'Drama', group: 'genre' },
  { id: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', label: 'Fantasi (Fantasy)', nameEn: 'Fantasy', group: 'genre' },
  { id: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', label: 'Romansa (Romance)', nameEn: 'Romance', group: 'genre' },
  { id: 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9', label: 'Slice of Life', nameEn: 'Slice of Life', group: 'genre' },
  { id: 'ee968100-4191-4968-93d3-f82d72be7e46', label: 'Misteri (Mystery)', nameEn: 'Mystery', group: 'genre' },
  { id: '3b60b75c-a2d7-4860-ab56-05f391bb889c', label: 'Psikologis (Psychological)', nameEn: 'Psychological', group: 'theme' },
  { id: 'cdad7e68-1419-41dd-bdce-27753074a640', label: 'Horor (Horror)', nameEn: 'Horror', group: 'genre' },
  { id: '256c8bd9-4904-4360-bf4f-508a76d67183', label: 'Fiksi Ilmiah (Sci-Fi)', nameEn: 'Sci-Fi', group: 'genre' },
  { id: '69964a64-2f90-4d33-beeb-f3ed2875eb4c', label: 'Olahraga (Sports)', nameEn: 'Sports', group: 'genre' },
  { id: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', label: 'Supranatural', nameEn: 'Supernatural', group: 'theme' },
  { id: '07251805-a27e-4d59-b488-f0bfbec15168', label: 'Thriller', nameEn: 'Thriller', group: 'genre' },
  { id: '33771934-028e-4cb3-8744-691e866a923e', label: 'Sejarah (Historical)', nameEn: 'Historical', group: 'genre' },
  { id: '799c202e-7daa-44eb-9cf7-8a3c0441531e', label: 'Bela Diri (Martial Arts)', nameEn: 'Martial Arts', group: 'theme' },
  { id: 'ace04997-f6bd-436e-b261-779182193d3d', label: 'Isekai', nameEn: 'Isekai', group: 'genre' },
  { id: '50880a9d-5440-4732-9afb-8f457127e836', label: 'Mecha', nameEn: 'Mecha', group: 'genre' },
  { id: 'caaa44eb-cd40-4177-b930-79d3ef2afe87', label: 'Kehidupan Sekolah', nameEn: 'School Life', group: 'theme' },
  { id: '5fff9cde-849c-4d78-aab0-0d52b2ee1d25', label: 'Survival', nameEn: 'Survival', group: 'theme' },
  { id: '292e862b-2d17-4062-90a2-0356caa4ae27', label: 'Time Travel', nameEn: 'Time Travel', group: 'theme' },
  { id: 'df33b754-73a3-4c54-80e6-1a74a8058539', label: 'Medis (Medical)', nameEn: 'Medical', group: 'genre' },
];

const INDONESIAN_TAG_LABELS: Record<string, string> = {
  Action: 'Aksi (Action)',
  Adventure: 'Petualangan',
  Comedy: 'Komedi',
  Drama: 'Drama',
  Fantasy: 'Fantasi',
  Romance: 'Romansa',
  'Slice of Life': 'Slice of Life',
  Mystery: 'Misteri',
  Psychological: 'Psikologis',
  Horror: 'Horor',
  'Sci-Fi': 'Sci-Fi',
  Sports: 'Olahraga',
  Supernatural: 'Supranatural',
  Thriller: 'Thriller',
  Historical: 'Sejarah',
  'Martial Arts': 'Bela Diri',
  Isekai: 'Isekai',
  Mecha: 'Mecha',
  'School Life': 'Sekolah',
  Survival: 'Survival',
  'Time Travel': 'Perjalanan Waktu',
  Medical: 'Medis',
  Reincarnation: 'Reinkarnasi',
  Cooking: 'Kuliner',
  Crime: 'Kriminal',
  Philosophical: 'Filosofis',
  Tragedy: 'Tragedi',
};

export async function fetchAllGenresAndThemes(): Promise<GenreOption[]> {
  try {
    const json = await fetchMangaDexJson('/manga/tag');
    const rawTags = Array.isArray(json.data) ? json.data : [];
    if (rawTags.length === 0) return CURATED_GENRES;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: GenreOption[] = rawTags
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((t: any) => {
        const nameEn = t.attributes?.name?.en || '';
        const group = (t.attributes?.group || 'genre') as GenreOption['group'];
        return {
          id: String(t.id),
          nameEn,
          label: INDONESIAN_TAG_LABELS[nameEn] || nameEn,
          group,
        };
      })
      .filter((t: GenreOption) => Boolean(t.nameEn) && (t.group === 'genre' || t.group === 'theme'));

    // Sort genres first, then alphabetically
    parsed.sort((a, b) => {
      if (a.group !== b.group) return a.group === 'genre' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

    return parsed.length > 0 ? parsed : CURATED_GENRES;
  } catch {
    return CURATED_GENRES;
  }
}

export async function searchAuthors(nameQuery: string): Promise<AuthorOption[]> {
  const q = nameQuery.trim();
  if (!q) return [];
  try {
    const params = new URLSearchParams();
    params.set('name', q);
    params.set('limit', '10');
    const json = await fetchMangaDexJson(`/author?${params.toString()}`);
    const list = Array.isArray(json.data) ? json.data : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => ({
        id: String(a.id),
        name: String(a.attributes?.name || ''),
      }))
      .filter((a: AuthorOption) => Boolean(a.name));
  } catch {
    return [];
  }
}

function extractLocalizedString(
  map: Record<string, string> | undefined,
  preferredKeys: string[] = ['id', 'en', 'ja-ro', 'ja']
): string {
  if (!map || typeof map !== 'object') return '';
  for (const key of preferredKeys) {
    if (map[key]) return map[key];
  }
  const values = Object.values(map);
  return values.length > 0 ? values[0] : '';
}

function extractAltTitle(
  altTitles: Array<Record<string, string>> | undefined,
  primaryTitle: string
): string | undefined {
  if (!Array.isArray(altTitles) || altTitles.length === 0) return undefined;
  const preferredLangs = ['id', 'en', 'ja-ro', 'ja'];
  for (const lang of preferredLangs) {
    for (const item of altTitles) {
      if (item[lang] && item[lang].toLowerCase() !== primaryTitle.toLowerCase()) {
        return item[lang];
      }
    }
  }
  return undefined;
}

function cleanDescription(raw: string): string {
  if (!raw) return 'Belum ada sinopsis yang tersedia untuk judul ini dalam arsip MangaDex.';
  return raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/---[\s\S]*$/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

export function buildCoverUrl(
  mangaId: string,
  fileName: string | null,
  size: '256' | '512' | 'full' = '512'
): string | null {
  if (!fileName) return null;
  const suffix = size === 'full' ? '' : `.${size}.jpg`;
  return `/api/cover/${mangaId}/${fileName}${suffix}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseMangaEntity(entity: any): MangaItem {
  const id: string = entity.id;
  const attr = entity.attributes || {};
  const relationships: Array<{ id: string; type: string; attributes?: Record<string, unknown> }> =
    entity.relationships || [];

  const title =
    extractLocalizedString(attr.title, ['en', 'id', 'ja-ro', 'ja']) || 'Judul Tidak Diketahui';
  const altTitle = extractAltTitle(attr.altTitles, title);
  const rawDesc = extractLocalizedString(attr.description, ['id', 'en', 'ja']);
  const description = cleanDescription(rawDesc);

  const status = (attr.status || 'ongoing') as PublicationStatus;
  const year = typeof attr.year === 'number' ? attr.year : null;
  const demographic = (attr.publicationDemographic || 'none') as DemographicType;
  const contentRating = attr.contentRating || 'safe';
  const originalLanguage = attr.originalLanguage || 'ja';
  const availableLanguages: string[] = Array.isArray(attr.availableTranslatedLanguages)
    ? attr.availableTranslatedLanguages
    : [];

  const tags: MangaTag[] = Array.isArray(attr.tags)
    ? attr.tags
        .map((t: { id: string; attributes?: { name?: Record<string, string>; group?: string } }) => ({
          id: t.id,
          name: extractLocalizedString(t.attributes?.name, ['en', 'id']),
          group: (t.attributes?.group || 'genre') as MangaTag['group'],
        }))
        .filter((t: MangaTag) => Boolean(t.name))
    : [];

  let author = 'Anonim';
  let authorId: string | undefined;
  let artist = '';
  let artistId: string | undefined;
  let coverFileName: string | null = null;

  for (const rel of relationships) {
    if (rel.type === 'author' && rel.attributes?.name) {
      author = String(rel.attributes.name);
      authorId = rel.id;
    } else if (rel.type === 'artist' && rel.attributes?.name) {
      artist = String(rel.attributes.name);
      artistId = rel.id;
    } else if (rel.type === 'cover_art' && rel.attributes?.fileName) {
      coverFileName = String(rel.attributes.fileName);
    }
  }

  return {
    id,
    title,
    altTitle,
    description,
    status,
    year,
    demographic,
    contentRating,
    originalLanguage,
    availableLanguages,
    tags,
    author,
    authorId,
    artist: artist || author,
    artistId: artistId || authorId,
    coverFileName,
    coverUrl: buildCoverUrl(id, coverFileName, '512'),
    coverUrlLarge: buildCoverUrl(id, coverFileName, 'full'),
  };
}

export async function fetchMangaStatistics(
  mangaIds: string[]
): Promise<Record<string, { rating: number; follows: number }>> {
  if (mangaIds.length === 0) return {};
  try {
    const params = new URLSearchParams();
    mangaIds.slice(0, 50).forEach((id) => params.append('manga[]', id));
    const json = await fetchMangaDexJson(`/statistics/manga?${params.toString()}`);
    const stats = json.statistics || {};
    const result: Record<string, { rating: number; follows: number }> = {};

    for (const id of Object.keys(stats)) {
      const item = stats[id];
      result[id] = {
        rating: item?.rating?.bayesian || item?.rating?.average || 0,
        follows: item?.follows || 0,
      };
    }
    return result;
  } catch {
    return {};
  }
}

function buildBaseMangaSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('limit', String(filters.limit || 24));
  params.set('offset', String(filters.offset || 0));
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');
  params.append('contentRating[]', 'safe');
  if (filters.contentRating !== 'safe_only') {
    params.append('contentRating[]', 'suggestive');
  }
  params.set('hasAvailableChapters', 'true');

  if (filters.status !== 'all') {
    params.append('status[]', filters.status);
  }

  if (filters.demographic !== 'all') {
    params.append('publicationDemographic[]', filters.demographic);
  }

  if (filters.language !== 'all') {
    params.append('availableTranslatedLanguage[]', filters.language);
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    for (const tagId of filters.tagIds) {
      params.append('includedTags[]', tagId);
    }
    params.set('includedTagsMode', filters.tagMode || 'AND');
  }

  const trimmedYear = filters.year ? filters.year.trim() : '';
  if (/^\d{4}$/.test(trimmedYear)) {
    params.set('year', trimmedYear);
  }

  if (filters.sort === 'popular') {
    params.set('order[followedCount]', 'desc');
  } else if (filters.sort === 'latest') {
    params.set('order[latestUploadedChapter]', 'desc');
  } else if (filters.sort === 'rating') {
    params.set('order[rating]', 'desc');
  } else if (filters.sort === 'newest') {
    params.set('order[createdAt]', 'desc');
  } else if (filters.sort === 'relevance') {
    params.set('order[relevance]', 'desc');
  } else if (filters.sort === 'title_asc') {
    params.set('order[title]', 'asc');
  } else if (filters.sort === 'year_desc') {
    params.set('order[year]', 'desc');
  }

  return params;
}

export async function fetchMangaList(
  filters: SearchFilters
): Promise<{ items: MangaItem[]; total: number; resolvedAuthor?: AuthorOption | null }> {
  const params = buildBaseMangaSearchParams(filters);
  let resolvedAuthor: AuthorOption | null = filters.selectedAuthor || null;

  // Resolve author if selectedAuthor or authorQuery or searchTarget === 'author' is used
  if (!resolvedAuthor && filters.authorQuery.trim()) {
    const matchingAuthors = await searchAuthors(filters.authorQuery.trim());
    if (matchingAuthors.length > 0) {
      resolvedAuthor = matchingAuthors[0];
    } else {
      return { items: [], total: 0, resolvedAuthor: null };
    }
  } else if (!resolvedAuthor && filters.searchTarget === 'author' && filters.query.trim()) {
    const matchingAuthors = await searchAuthors(filters.query.trim());
    if (matchingAuthors.length > 0) {
      resolvedAuthor = matchingAuthors[0];
    } else {
      return { items: [], total: 0, resolvedAuthor: null };
    }
  }

  if (resolvedAuthor) {
    params.set('authorOrArtist', resolvedAuthor.id);
  }

  if (filters.query.trim() && filters.searchTarget !== 'author') {
    params.set('title', filters.query.trim());
  }

  const json = await fetchMangaDexJson(`/manga?${params.toString()}`);
  const rawList = Array.isArray(json.data) ? json.data : [];
  let items: MangaItem[] = rawList.map(parseMangaEntity);
  let total = typeof json.total === 'number' ? json.total : items.length;

  // Smart fallback for 'all' search mode: if user searched a query in 'all' mode and few/no title matches were found,
  // check if the query is an Author name on MangaDex and merge/return works by that author!
  if (
    filters.searchTarget === 'all' &&
    filters.query.trim() &&
    !resolvedAuthor &&
    filters.offset === 0 &&
    items.length < 6
  ) {
    const matchingAuthors = await searchAuthors(filters.query.trim());
    if (matchingAuthors.length > 0) {
      const topAuthor = matchingAuthors[0];
      const authorParams = buildBaseMangaSearchParams(filters);
      authorParams.set('authorOrArtist', topAuthor.id);
      try {
        const authorJson = await fetchMangaDexJson(`/manga?${authorParams.toString()}`);
        const authorMangaList: MangaItem[] = (
          Array.isArray(authorJson.data) ? authorJson.data : []
        ).map(parseMangaEntity);

        const existingIds = new Set(items.map((m) => m.id));
        for (const m of authorMangaList) {
          if (!existingIds.has(m.id)) {
            items.push(m);
            existingIds.add(m.id);
          }
        }
        if (items.length > rawList.length) {
          resolvedAuthor = topAuthor;
          total = Math.max(total, items.length);
        }
      } catch {
        // Ignore secondary author fallback error
      }
    }
  }

  // Enrich with rating & follower stats
  const statsMap = await fetchMangaStatistics(items.map((m) => m.id));
  for (const item of items) {
    if (statsMap[item.id]) {
      item.rating = statsMap[item.id].rating;
      item.follows = statsMap[item.id].follows;
    }
  }

  return {
    items,
    total,
    resolvedAuthor,
  };
}

export async function fetchMangaById(mangaId: string): Promise<MangaItem> {
  const params = new URLSearchParams();
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');

  const json = await fetchMangaDexJson(`/manga/${encodeURIComponent(mangaId)}?${params.toString()}`);
  const item = parseMangaEntity(json.data);
  const statsMap = await fetchMangaStatistics([item.id]);
  if (statsMap[item.id]) {
    item.rating = statsMap[item.id].rating;
    item.follows = statsMap[item.id].follows;
  }
  return item;
}

export async function fetchRandomManga(): Promise<MangaItem> {
  const params = new URLSearchParams();
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');

  const json = await fetchMangaDexJson(`/manga/random?${params.toString()}`);
  return parseMangaEntity(json.data);
}

export interface FetchChaptersOptions {
  languages: string[];
  order: 'asc' | 'desc';
  offset: number;
  limit: number;
}

export async function fetchMangaChapters(
  mangaId: string,
  options: FetchChaptersOptions
): Promise<{ chapters: ChapterItem[]; total: number }> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit || 100));
  params.set('offset', String(options.offset || 0));
  params.append('includes[]', 'scanlation_group');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('contentRating[]', 'erotica');
  params.set('order[chapter]', options.order);
  params.set('order[volume]', options.order);
  params.set('includeEmptyPages', '0');
  params.set('includeExternalUrl', '0');

  for (const lang of options.languages) {
    params.append('translatedLanguage[]', lang);
  }

  const json = await fetchMangaDexJson(
    `/manga/${encodeURIComponent(mangaId)}/feed?${params.toString()}`
  );
  const rawData = Array.isArray(json.data) ? json.data : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chapters: ChapterItem[] = rawData.map((ch: any) => {
    const attr = ch.attributes || {};
    const rels: Array<{ type: string; attributes?: { name?: string } }> = ch.relationships || [];
    const groupRel = rels.find((r) => r.type === 'scanlation_group');

    return {
      id: ch.id,
      volume: attr.volume ? String(attr.volume) : null,
      chapter: attr.chapter ? String(attr.chapter) : null,
      title: attr.title ? String(attr.title) : '',
      translatedLanguage: attr.translatedLanguage || 'en',
      pages: typeof attr.pages === 'number' ? attr.pages : 0,
      publishAt: attr.publishAt || attr.createdAt || new Date().toISOString(),
      scanlationGroup: groupRel?.attributes?.name || 'Scanlation Independen',
      externalUrl: attr.externalUrl || null,
    };
  });

  return {
    chapters,
    total: typeof json.total === 'number' ? json.total : chapters.length,
  };
}

export interface ChapterPagesPayload {
  chapterId: string;
  baseUrl: string;
  hash: string;
  hdPages: Array<{ proxyUrl: string; directUrl: string }>;
  dataSaverPages: Array<{ proxyUrl: string; directUrl: string }>;
}

export async function fetchChapterPages(chapterId: string): Promise<ChapterPagesPayload> {
  const json = await fetchMangaDexJson(`/at-home/server/${encodeURIComponent(chapterId)}`);
  const baseUrl: string = json.baseUrl || 'https://uploads.mangadex.org';
  const hash: string = json.chapter?.hash || '';
  const dataFiles: string[] = Array.isArray(json.chapter?.data) ? json.chapter.data : [];
  const saverFiles: string[] = Array.isArray(json.chapter?.dataSaver) ? json.chapter.dataSaver : [];

  const hdPages = dataFiles.map((file) => {
    const directUrl = `${baseUrl}/data/${hash}/${file}`;
    return {
      proxyUrl: `/api/page?url=${encodeURIComponent(directUrl)}`,
      directUrl,
    };
  });

  const dataSaverPages = saverFiles.map((file) => {
    const directUrl = `${baseUrl}/data-saver/${hash}/${file}`;
    return {
      proxyUrl: `/api/page?url=${encodeURIComponent(directUrl)}`,
      directUrl,
    };
  });

  return {
    chapterId,
    baseUrl,
    hash,
    hdPages,
    dataSaverPages: dataSaverPages.length > 0 ? dataSaverPages : hdPages,
  };
}
