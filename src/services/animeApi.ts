/**
 * Thin fetch wrapper around the Vercel serverless functions in
 * /api/anime, which combine two independent sources server-side:
 *  - Jikan (MyAnimeList) for details + search — see api/_lib/jikan.ts
 *  - Consumet/AnimeKai for the (best-effort) per-episode watch link —
 *    see api/_lib/consumet.ts
 * Relative paths are same-origin both on Vercel and under `vercel dev`.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

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
  /** MyAnimeList id (from Jikan). */
  id: string
  title: string
  image: string | null
  genres: string[]
  /** Plain-text synopsis. */
  description: string | null
  /** MyAnimeList status, e.g. "Currently Airing", "Finished Airing". */
  status: string | null
  /** MyAnimeList format, e.g. "TV", "Movie", "OVA". */
  format: string | null
  /** MyAnimeList score, already on a 0-10 scale (not 0-100) — display as-is, don't divide. */
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

/** GET /api/anime/:id — full series details (Jikan) + episode list with outbound AnimeKai watch links (Consumet, best-effort). */
export async function fetchAnimeInfo(malId: string | number): Promise<AnimeInfo> {
  const res = await fetch(`${BASE_URL}/api/anime/${encodeURIComponent(String(malId))}`)
  return parseJsonOrThrow(res) as Promise<AnimeInfo>
}

/**
 * GET /api/anime/search?q=... — MyAnimeList title search (via Jikan), card-sized results.
 * Accepts an optional AbortSignal so callers (e.g. the debounced search box)
 * can cancel a request that's been superseded by newer input, instead of
 * letting a slow, stale response overwrite fresher results.
 */
export async function searchAnime(query: string, signal?: AbortSignal): Promise<AnimeSearchResult[]> {
  const res = await fetch(`${BASE_URL}/api/anime/search?q=${encodeURIComponent(query)}`, { signal })
  const body = await parseJsonOrThrow(res)
  return (body?.results ?? []) as AnimeSearchResult[]
}
