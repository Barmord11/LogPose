import { META, ANIME } from '@consumet/extensions'

/**
 * Server-side wrapper around Consumet's `@consumet/extensions` Anilist
 * provider. Runs only inside Vercel serverless functions — never in the
 * browser — and strips Consumet's large payload down to exactly what
 * LogPose's UI needs.
 *
 * This wrapper covers two distinct jobs, both backed by the same
 * Consumet call but conceptually separate for the frontend:
 *
 *   1. DETAILS — real Anilist metadata (title, image, genres,
 *      synopsis, status, format, score, characters, episode count).
 *      This is what LogPose's details page displays.
 *
 *   2. WATCH LINK — a per-episode external URL on AnimeKai, the
 *      underlying site Consumet's Anilist meta-provider uses to
 *      resolve actual streaming sources (Consumet's default is
 *      HiAnime if no provider is passed; LogPose passes AnimeKai
 *      explicitly). Anilist itself has no video and no per-episode
 *      links, so this part can only ever come from a site like
 *      AnimeKai — never from Anilist directly.
 *
 * Business rule: LogPose never hosts or proxies video. `episode.url`
 * is always an external link; the frontend only ever opens it in a
 * new tab.
 */

export interface StrippedEpisode {
  id: string
  number: number
  title?: string | null
  image?: string | null
  /** External watch link (AnimeKai) — opened via `target="_blank"`, never embedded. */
  url?: string | null
}

export interface StrippedCharacter {
  id: string
  name: string
  role: string | null
  image: string | null
}

export interface StrippedAnimeInfo {
  id: string
  title: string
  image: string | null
  /** Anilist genre tags, e.g. ["Action", "Adventure"]. */
  genres: string[]
  /** Plain-text synopsis — Consumet returns this with HTML markup; stripped here. */
  description: string | null
  /** Anilist media status, e.g. "ONGOING", "COMPLETED", "NOT_YET_AIRED". */
  status: string | null
  /** Anilist format, e.g. "TV", "MOVIE", "OVA". */
  format: string | null
  /** Anilist average score, 0-100, or null if not yet rated. */
  rating: number | null
  characters: StrippedCharacter[]
  totalEpisodes: number
  episodes: StrippedEpisode[]
}

export interface StrippedSearchResult {
  id: string
  title: string
  image: string | null
  releaseDate?: number | null
  totalEpisodes?: number | null
}

let provider: InstanceType<typeof META.Anilist> | null = null

/** Lazily construct the provider so importing this module has no side effects (easier to test). */
function getProvider() {
  if (!provider) provider = new META.Anilist(new ANIME.AnimeKai())
  return provider
}

function pickTitle(title: unknown): string {
  if (typeof title === 'string' && title.length > 0) return title
  if (title && typeof title === 'object') {
    const t = title as Record<string, string | undefined>
    return t.english ?? t.romaji ?? t.native ?? 'Untitled'
  }
  return 'Untitled'
}

function pickCharacterName(name: unknown): string {
  if (typeof name === 'string' && name.length > 0) return name
  if (name && typeof name === 'object') {
    const n = name as Record<string, string | undefined>
    if (n.full) return n.full
    if (n.userPreferred) return n.userPreferred
    const combined = [n.first, n.last].filter(Boolean).join(' ')
    if (combined) return combined
  }
  return 'Unknown'
}

/**
 * Anilist descriptions come back as HTML (`<br>`, `<i>`, escaped
 * entities). LogPose only ever renders this as plain text, so it's
 * cleaned up once here rather than in every consumer.
 */
function stripDescriptionHtml(description: unknown): string | null {
  if (typeof description !== 'string' || description.length === 0) return null
  return description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export class ConsumetLookupError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ConsumetLookupError'
  }
}

/**
 * Fetches full Anilist info for one series and strips it to the
 * details fields LogPose's UI needs, plus the episode list (each with
 * its external AnimeKai watch `url`, when available).
 */
export async function fetchAnimeInfo(anilistId: string): Promise<StrippedAnimeInfo> {
  let info: any
  try {
    info = await getProvider().fetchAnimeInfo(anilistId)
  } catch (err) {
    throw new ConsumetLookupError(`Consumet fetchAnimeInfo failed for id "${anilistId}"`, err)
  }

  if (!info || info.id === undefined) {
    throw new ConsumetLookupError(`No anime found for id "${anilistId}"`)
  }

  const episodesRaw = Array.isArray(info.episodes) ? info.episodes : []
  const charactersRaw = Array.isArray(info.characters) ? info.characters : []

  return {
    id: String(info.id),
    title: pickTitle(info.title),
    image: info.image ?? info.cover ?? null,
    genres: Array.isArray(info.genres) ? info.genres.filter((g: unknown) => typeof g === 'string') : [],
    description: stripDescriptionHtml(info.description),
    status: typeof info.status === 'string' ? info.status : null,
    format: typeof info.type === 'string' ? info.type : null,
    rating: typeof info.rating === 'number' ? info.rating : null,
    characters: charactersRaw.slice(0, 12).map((c: any, index: number) => ({
      id: String(c.id ?? `char-${index}`),
      name: pickCharacterName(c.name),
      role: typeof c.role === 'string' ? c.role : null,
      image: c.image ?? null,
    })),
    totalEpisodes: info.totalEpisodes ?? episodesRaw.length,
    episodes: episodesRaw.map((ep: any, index: number) => ({
      id: String(ep.id ?? `${info.id}-ep-${index + 1}`),
      number: ep.number ?? index + 1,
      title: ep.title ?? null,
      image: ep.image ?? null,
      url: ep.url ?? null,
    })),
  }
}

/** Searches Anilist by title and strips each result to card-sized data. */
export async function searchAnime(query: string): Promise<StrippedSearchResult[]> {
  let response: any
  try {
    response = await getProvider().search(query)
  } catch (err) {
    throw new ConsumetLookupError(`Consumet search failed for query "${query}"`, err)
  }

  const results = Array.isArray(response?.results) ? response.results : []

  return results.map((r: any) => ({
    id: String(r.id),
    title: pickTitle(r.title),
    image: r.image ?? null,
    releaseDate: r.releaseDate ?? null,
    totalEpisodes: r.totalEpisodes ?? null,
  }))
}
