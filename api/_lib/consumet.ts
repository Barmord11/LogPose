import { META, ANIME } from '@consumet/extensions'

/**
 * Server-side wrapper around Consumet's `@consumet/extensions` — used
 * for exactly one job now: resolving external, per-episode watch
 * links on AnimeKai for a given AniList id.
 *
 * LogPose's DETAILS (title, image, genres, synopsis, status, format,
 * score, characters) come from AniList's own GraphQL API instead (see
 * api/_lib/anilist.ts) — AniList is official, key-free, and has a far
 * more forgiving rate limit than Jikan did. Consumet's providers are
 * HTML scrapers that can and do go down (Cloudflare challenges, dead
 * mirrors, DNS failures), so keeping Consumet scoped to only the watch
 * link means that instability can never break the details page itself
 * — callers should treat a failure here as "no watch link available
 * right now", not a fatal error.
 *
 * `META.Anilist` (Consumet's AniList meta-provider) accepts an AniList
 * id directly, so no id crosswalk is needed — the same id
 * api/_lib/anilist.ts gives us is passed straight through.
 *
 * Business rule: LogPose never hosts or proxies video. `episode.url`
 * is always an external link (on AnimeKai); the frontend only ever
 * opens it in a new tab.
 */

export interface StrippedEpisode {
  id: string
  number: number
  title?: string | null
  image?: string | null
  /** External watch link (AnimeKai) — opened via `target="_blank"`, never embedded. */
  url?: string | null
}

let provider: InstanceType<typeof META.Anilist> | null = null

/** Lazily construct the provider so importing this module has no side effects (easier to test). */
function getProvider() {
  if (!provider) provider = new META.Anilist(new ANIME.AnimeKai())
  return provider
}

export class ConsumetLookupError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'ConsumetLookupError'
  }
}

/**
 * Resolves the episode list (each with its external AnimeKai watch
 * `url`, when the upstream scraper has one) for an AniList id.
 * This is best-effort by nature — callers should catch
 * ConsumetLookupError and degrade to "no watch link" rather than
 * failing the whole page.
 */
export async function fetchWatchEpisodes(anilistId: string): Promise<StrippedEpisode[]> {
  let info: any
  try {
    info = await getProvider().fetchAnimeInfo(anilistId)
  } catch (err) {
    throw new ConsumetLookupError(`Consumet fetchAnimeInfo failed for AniList id "${anilistId}"`, err)
  }

  if (!info) {
    throw new ConsumetLookupError(`No watch-link data found for AniList id "${anilistId}"`)
  }

  const episodesRaw = Array.isArray(info.episodes) ? info.episodes : []

  return episodesRaw.map((ep: any, index: number) => ({
    id: String(ep.id ?? `${anilistId}-ep-${index + 1}`),
    number: ep.number ?? index + 1,
    title: ep.title ?? null,
    image: ep.image ?? null,
    url: ep.url ?? null,
  }))
}
