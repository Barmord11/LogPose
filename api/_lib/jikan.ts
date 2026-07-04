/**
 * Server-side wrapper around Jikan v4 (https://api.jikan.moe/v4), the
 * free, unofficial-but-stable REST API for MyAnimeList data. No API
 * key, no scraping, CORS-friendly — but still called from our own
 * serverless function rather than the browser so we have one place to
 * shape the response and (later, if needed) add caching in front of
 * Jikan's ~60 req/min rate limit.
 *
 * This is LogPose's DETAILS source (title, image, genres, synopsis,
 * status, format, score, characters, episode count) — see
 * api/_lib/consumet.ts for the separate WATCH LINK job, which is
 * unrelated and best-effort.
 */

const JIKAN_BASE = 'https://api.jikan.moe/v4'

// Jikan enforces a shared ~60 req/min rate limit across everyone using
// this deployment (see README "Known follow-ups"). A short in-memory
// cache absorbs bursts - repeated searches/trending look-ups within the
// TTL are served without hitting Jikan again. This only helps within a
// single warm serverless instance (it resets on cold start), but that's
// still a meaningful reduction for popular queries/trending, which is
// the traffic most likely to spike now that Home also calls this.
const CACHE_TTL_MS = 5 * 60 * 1000
const responseCache = new Map<string, { expires: number; value: any }>()

function getCached(path: string): any | undefined {
  const entry = responseCache.get(path)
  if (!entry) return undefined
  if (entry.expires < Date.now()) {
    responseCache.delete(path)
    return undefined
  }
  return entry.value
}

function setCached(path: string, value: any): void {
  responseCache.set(path, { expires: Date.now() + CACHE_TTL_MS, value })
}

/** Test-only escape hatch — clears the in-memory cache so tests reusing the same query/id don't leak stale responses across cases. Not used in production code. */
export function __resetJikanCacheForTests(): void {
  responseCache.clear()
}

export interface JikanCharacter {
  id: string
  name: string
  role: string | null
  image: string | null
}

export interface JikanAnimeInfo {
  id: string
  title: string
  image: string | null
  genres: string[]
  description: string | null
  status: string | null
  format: string | null
  /** MyAnimeList score, 0-10 (already on a 0-10 scale — do not divide). */
  score: number | null
  characters: JikanCharacter[]
  totalEpisodes: number
}

export interface JikanSearchResult {
  id: string
  title: string
  image: string | null
  releaseDate: number | null
  totalEpisodes: number | null
}

export class JikanLookupError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'JikanLookupError'
  }
}

async function jikanFetch(path: string): Promise<any> {
  const cached = getCached(path)
  if (cached !== undefined) return cached

  let res: Response
  try {
    res = await fetch(`${JIKAN_BASE}${path}`)
  } catch (err) {
    throw new JikanLookupError(`Network error calling Jikan (${path})`, err)
  }
  if (!res.ok) {
    throw new JikanLookupError(`Jikan returned ${res.status} for ${path}`)
  }
  const body = await res.json()
  setCached(path, body)
  return body
}

function pickTitle(data: any): string {
  return data?.title_english || data?.title || 'Untitled'
}

// Jikan's synopsis commonly ends with a "[Written by MAL Rewrite]"-style
// credit line — strip it so LogPose's UI doesn't repeat it everywhere.
function cleanDescription(description: unknown): string | null {
  if (typeof description !== 'string' || description.length === 0) return null
  return description.replace(/\n*\[written by mal rewrite\]\s*$/i, '').trim() || null
}

/** Fetches details (info + character list) for one series by its MyAnimeList id. */
export async function fetchAnimeInfo(malId: string): Promise<JikanAnimeInfo> {
  let body: any
  try {
    body = await jikanFetch(`/anime/${encodeURIComponent(malId)}`)
  } catch (err) {
    if (err instanceof JikanLookupError) throw err
    throw new JikanLookupError(`Jikan fetchAnimeInfo failed for id "${malId}"`, err)
  }

  const data = body?.data
  if (!data || data.mal_id === undefined) {
    throw new JikanLookupError(`No anime found for id "${malId}"`)
  }

  // Character list is a separate endpoint — best-effort, never fails the whole lookup.
  let characters: JikanCharacter[] = []
  try {
    const charBody = await jikanFetch(`/anime/${encodeURIComponent(malId)}/characters`)
    const charData = Array.isArray(charBody?.data) ? charBody.data : []
    characters = charData.slice(0, 12).map((entry: any, index: number) => ({
      id: String(entry?.character?.mal_id ?? `char-${index}`),
      name: entry?.character?.name ?? 'Unknown',
      role: typeof entry?.role === 'string' ? entry.role : null,
      image: entry?.character?.images?.jpg?.image_url ?? null,
    }))
  } catch {
    /* character data is a nice-to-have, not required */
  }

  return {
    id: String(data.mal_id),
    title: pickTitle(data),
    image: data.images?.jpg?.large_image_url ?? data.images?.jpg?.image_url ?? null,
    genres: Array.isArray(data.genres) ? data.genres.map((g: any) => g?.name).filter(Boolean) : [],
    description: cleanDescription(data.synopsis),
    status: typeof data.status === 'string' ? data.status : null,
    format: typeof data.type === 'string' ? data.type : null,
    score: typeof data.score === 'number' ? data.score : null,
    characters,
    totalEpisodes: typeof data.episodes === 'number' ? data.episodes : 0,
  }
}

/** Searches MyAnimeList by title (SFW filter on) and strips each result to card-sized data. */
export async function searchAnime(query: string): Promise<JikanSearchResult[]> {
  let body: any
  try {
    body = await jikanFetch(`/anime?q=${encodeURIComponent(query)}&sfw=true&limit=20`)
  } catch (err) {
    if (err instanceof JikanLookupError) throw err
    throw new JikanLookupError(`Jikan search failed for query "${query}"`, err)
  }

  const results = Array.isArray(body?.data) ? body.data : []

  return results.map((r: any) => ({
    id: String(r.mal_id),
    title: pickTitle(r),
    image: r.images?.jpg?.large_image_url ?? r.images?.jpg?.image_url ?? null,
    releaseDate: r.year ?? r.aired?.prop?.from?.year ?? null,
    totalEpisodes: typeof r.episodes === 'number' ? r.episodes : null,
  }))
}

/**
 * Currently-airing series ranked by popularity — feeds the Home page's
 * "Trending Now" section. Same card-sized shape as searchAnime, so the
 * frontend can reuse one result type for both.
 */
export async function fetchTrending(limit = 10): Promise<JikanSearchResult[]> {
  let body: any
  try {
    body = await jikanFetch(`/top/anime?filter=airing&limit=${encodeURIComponent(String(limit))}`)
  } catch (err) {
    if (err instanceof JikanLookupError) throw err
    throw new JikanLookupError('Jikan trending fetch failed', err)
  }

  const results = Array.isArray(body?.data) ? body.data : []

  return results.map((r: any) => ({
    id: String(r.mal_id),
    title: pickTitle(r),
    image: r.images?.jpg?.large_image_url ?? r.images?.jpg?.image_url ?? null,
    releaseDate: r.year ?? r.aired?.prop?.from?.year ?? null,
    totalEpisodes: typeof r.episodes === 'number' ? r.episodes : null,
  }))
}
