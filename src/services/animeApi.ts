/**
 * Thin fetch wrapper around the Vercel serverless functions in /api/anime,
 * which in turn wrap @consumet/extensions' META.Anilist provider.
 * Relative paths are same-origin both on Vercel and under `vercel dev`.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export interface AnimeEpisode {
  id: string
  number: number
  title: string | null
  image: string | null
  /** External watch link. LogPose never hosts video — always opened via target="_blank". */
  url: string | null
}

export interface AnimeInfo {
  id: string
  title: string
  image: string | null
  totalEpisodes: number
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

/** GET /api/anime/:id — full series info + episode list with outbound watch links. */
export async function fetchAnimeInfo(anilistId: string | number): Promise<AnimeInfo> {
  const res = await fetch(`${BASE_URL}/api/anime/${encodeURIComponent(String(anilistId))}`)
  return parseJsonOrThrow(res) as Promise<AnimeInfo>
}

/** GET /api/anime/search?q=... — Anilist title search, card-sized results. */
export async function searchAnime(query: string): Promise<AnimeSearchResult[]> {
  const res = await fetch(`${BASE_URL}/api/anime/search?q=${encodeURIComponent(query)}`)
  const body = await parseJsonOrThrow(res)
  return (body?.results ?? []) as AnimeSearchResult[]
}
