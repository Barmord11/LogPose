import { META, ANIME } from '@consumet/extensions'

/**
 * Server-side wrapper around Consumet's `@consumet/extensions` Anilist
 * provider. Runs only inside Vercel serverless functions — never in the
 * browser — and strips Consumet's large payload down to exactly what
 * LogPose's UI needs.
 *
 * The Anilist meta-provider combines two things: Anilist for metadata
 * (title, image, episode count) and a separate underlying site for the
 * actual per-episode watch links. We use AnimeKai for that — Consumet's
 * default is HiAnime if you don't pass a provider explicitly.
 *
 * Business rule: LogPose never hosts or proxies video. `episode.url` is
 * always an external link (on AnimeKai); the frontend only ever opens
 * it in a new tab.
 */

export interface StrippedEpisode {
  id: string
  number: number
  title?: string | null
  image?: string | null
  /** External watch link — opened via `target="_blank"`, never embedded. */
  url?: string | null
}

export interface StrippedAnimeInfo {
  id: string
  title: string
  image: string | null
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

export class ConsumetLookupError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ConsumetLookupError'
  }
}

/**
 * Fetches full Anilist info for one series and strips it to:
 * id, title, image, totalEpisodes, and the episode list (each with its
 * external watch `url`, when the upstream provider supplies one).
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

  return {
    id: String(info.id),
    title: pickTitle(info.title),
    image: info.image ?? info.cover ?? null,
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
