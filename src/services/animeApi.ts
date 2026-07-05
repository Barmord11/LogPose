/**
 * Thin fetch wrapper around the Vercel serverless functions in
 * /api/anime, which combine two independent sources server-side:
 *  - AniList's official GraphQL API for details + search — see
 *    api/_lib/anilist.ts
 *  - Consumet/AnimeKai for the (best-effort) per-episode watch link —
 *    see api/_lib/consumet.ts
 * Relative paths are same-origin both on Vercel and under `vercel dev`.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

// ── Client-side response cache ──────────────────────────────────────
// The browsing views (Home's trending/popular, Search's default
// popular view, a series' own detail page) fetch the same handful of
// AniList-backed endpoints over and over as someone moves between
// pages in one visit — Home → Search → Home again, or back to a
// series they already opened. Without this, every one of those trips
// re-shows a loading spinner for data that hasn't changed. Kept in
// memory (instant, for the common case of navigating within the same
// tab) AND mirrored to sessionStorage (so a manual refresh doesn't
// throw it away too) — both capped at the same TTL the server's own
// in-memory AniList cache uses (api/_lib/anilist.ts), so a client
// cache hit and a server cache hit go stale at roughly the same time.
const CACHE_TTL_MS = 5 * 60 * 1000
const STORAGE_PREFIX = 'logpose-cache:'

interface CacheEntry<T> {
  expires: number
  value: T
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

function readCache<T>(key: string): T | undefined {
  const fromMemory = memoryCache.get(key) as CacheEntry<T> | undefined
  if (fromMemory) {
    if (fromMemory.expires > Date.now()) return fromMemory.value
    memoryCache.delete(key)
    return undefined
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return undefined
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (entry.expires < Date.now()) {
      sessionStorage.removeItem(STORAGE_PREFIX + key)
      return undefined
    }
    memoryCache.set(key, entry)
    return entry.value
  } catch {
    // Private browsing / storage disabled / corrupt entry - fall back
    // to always fetching fresh rather than throwing.
    return undefined
  }
}

function writeCache<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { expires: Date.now() + CACHE_TTL_MS, value }
  memoryCache.set(key, entry)
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // Storage full/unavailable - the in-memory cache above still works
    // for the rest of this tab's session, which is the common case.
  }
}

/** Wraps an async fetcher with the cache above - a cache hit returns synchronously-resolved data with no network call at all. */
async function withCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = readCache<T>(key)
  if (cached !== undefined) return cached
  const value = await fetcher()
  writeCache(key, value)
  return value
}

/** Test-only escape hatch - clears the client cache so tests reusing the same endpoint don't leak stale responses across cases. Not used in production code. */
export function __resetAnimeApiCacheForTests(): void {
  memoryCache.clear()
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .forEach(k => sessionStorage.removeItem(k))
  } catch {
    // ignore - nothing to clear if storage isn't available
  }
}

export interface AnimeEpisode {
  id: string
  number: number
  title: string | null
  image: string | null
  /** External watch link (AnimeKai). LogPose never hosts video — always opened via target="_blank". Null when Consumet couldn't resolve one. */
  url: string | null
}

export interface AnimeCharacter {
  id: string
  name: string
  role: string | null
  image: string | null
}

export interface AnimeInfo {
  /** AniList id (from the official AniList GraphQL API). */
  id: string
  title: string
  image: string | null
  /** Wide banner artwork, when AniList has one — falls back to `image` in the UI when null. */
  bannerImage: string | null
  genres: string[]
  /** Plain-text synopsis. */
  description: string | null
  /** AniList status, e.g. "Currently Airing", "Finished Airing". */
  status: string | null
  /** AniList format, e.g. "TV", "Movie", "OVA". */
  format: string | null
  /** Normalized to a 0-10 scale (AniList's own averageScore is 0-100) — display as-is, don't divide. */
  score: number | null
  characters: AnimeCharacter[]
  totalEpisodes: number
  /** Best-effort - empty when Consumet/AnimeKai couldn't be reached. */
  episodes: AnimeEpisode[]
}

export interface AnimeSearchResult {
  id: string
  title: string
  image: string | null
  releaseDate: number | null
  totalEpisodes: number | null
}

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (body && typeof body === 'object' && 'error' in body && String(body.error)) || res.statusText
    throw new Error(message)
  }
  return body
}

/** GET /api/anime/:id — full series details (AniList) + episode list with outbound AnimeKai watch links (Consumet, best-effort). Cached — reopening a series you already viewed this session/tab is instant. */
export async function fetchAnimeInfo(anilistId: string | number): Promise<AnimeInfo> {
  return withCache(`anime:${anilistId}`, async () => {
    const res = await fetch(`${BASE_URL}/api/anime/${encodeURIComponent(String(anilistId))}`)
    return parseJsonOrThrow(res) as Promise<AnimeInfo>
  })
}

/**
 * GET /api/anime/search?q=... — AniList title search, card-sized results.
 * Accepts an optional AbortSignal so callers (e.g. the debounced search box)
 * can cancel a request that's been superseded by newer input, instead of
 * letting a slow, stale response overwrite fresher results.
 */
export async function searchAnime(query: string, signal?: AbortSignal): Promise<AnimeSearchResult[]> {
  return withCache(`search:${query.trim().toLowerCase()}`, async () => {
    const res = await fetch(`${BASE_URL}/api/anime/search?q=${encodeURIComponent(query)}`, { signal })
    const body = await parseJsonOrThrow(res)
    return (body?.results ?? []) as AnimeSearchResult[]
  })
}

/** GET /api/anime/trending — currently-airing series ranked by popularity, for Home's "Trending Now" section. Cached — hopping between Home and another page and back won't re-show a loading spinner for the same list. */
export async function fetchTrending(): Promise<AnimeSearchResult[]> {
  return withCache('trending', async () => {
    const res = await fetch(`${BASE_URL}/api/anime/trending`)
    const body = await parseJsonOrThrow(res)
    return (body?.results ?? []) as AnimeSearchResult[]
  })
}

/** GET /api/anime/popular — all-time most popular series (not airing-only), for Home's hero/"Popular This Week" grid and Search's default browsing view. Cached — shared between both pages, so visiting whichever one loads it second is instant. */
export async function fetchPopular(): Promise<AnimeSearchResult[]> {
  return withCache('popular', async () => {
    const res = await fetch(`${BASE_URL}/api/anime/popular`)
    const body = await parseJsonOrThrow(res)
    return (body?.results ?? []) as AnimeSearchResult[]
  })
}

/** GET /api/anime/genre?g=Action,Adventure — popularity-ranked series matching any of the given AniList genre names. Cached per genre combination. */
export async function fetchByGenre(genreNames: string[]): Promise<AnimeSearchResult[]> {
  return withCache(`genre:${[...genreNames].sort().join(',').toLowerCase()}`, async () => {
    const res = await fetch(`${BASE_URL}/api/anime/genre?g=${encodeURIComponent(genreNames.join(','))}`)
    const body = await parseJsonOrThrow(res)
    return (body?.results ?? []) as AnimeSearchResult[]
  })
}

/** GET /api/anime/random — one series picked at random from AniList's popular pool, for the mobile compass "surprise me" button. */
export async function fetchRandomAnime(): Promise<AnimeSearchResult> {
  const res = await fetch(`${BASE_URL}/api/anime/random`)
  const body = await parseJsonOrThrow(res)
  return body.result as AnimeSearchResult
}
