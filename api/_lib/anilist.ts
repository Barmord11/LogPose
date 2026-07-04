/**
 * Server-side wrapper around the official AniList GraphQL API
 * (https://graphql.anilist.co) — no API key, generous rate limit
 * (roughly 90 req/min per IP), and a single query can pull details +
 * characters in one round trip. Replaces Jikan (see git history for
 * api/_lib/jikan.ts): Jikan's ~60 req/min *and* ~3 req/sec burst limit
 * meant that ordinary use — a detail page (2 REST calls: info +
 * characters) plus Home's trending/continue-watching calls — tripped
 * 429s constantly and made the app feel broken. AniList's GraphQL
 * shape also means LogPose no longer needs a second request just for
 * the character list.
 *
 * This is LogPose's DETAILS + SEARCH source (title, image, genres,
 * synopsis, status, format, score, characters, episode count) — see
 * api/_lib/consumet.ts for the separate WATCH LINK job, which is
 * unrelated and best-effort.
 *
 * Series are identified by their AniList id everywhere in the app and
 * database (`anilist_id`) — not a MyAnimeList id. Consumet's own
 * Anilist meta-provider (`META.Anilist`) accepts that same id
 * directly, so no id crosswalk between the two sources is needed.
 */

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

// AniList's rate limit is per-IP and far more forgiving than Jikan's,
// but a short in-memory cache still absorbs bursts (e.g. Home calling
// trending + continue-watching back to back) within one warm
// serverless instance. Keyed by the exact query+variables pair.
const CACHE_TTL_MS = 5 * 60 * 1000
const responseCache = new Map<string, { expires: number; value: any }>()

function cacheKey(query: string, variables: Record<string, unknown>): string {
  return `${query}::${JSON.stringify(variables)}`
}

function getCached(key: string): any | undefined {
  const entry = responseCache.get(key)
  if (!entry) return undefined
  if (entry.expires < Date.now()) {
    responseCache.delete(key)
    return undefined
  }
  return entry.value
}

function setCached(key: string, value: any): void {
  responseCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
}

/** Test-only escape hatch — clears the in-memory cache so tests reusing the same query/variables don't leak stale responses across cases. Not used in production code. */
export function __resetAnilistCacheForTests(): void {
  responseCache.clear()
}

export interface AnilistCharacter {
  id: string
  name: string
  role: string | null
  image: string | null
}

export interface AnilistAnimeInfo {
  id: string
  title: string
  image: string | null
  bannerImage: string | null
  genres: string[]
  description: string | null
  status: string | null
  format: string | null
  /** Normalized to a 0-10 scale (AniList's averageScore is 0-100). */
  score: number | null
  characters: AnilistCharacter[]
  totalEpisodes: number
}

export interface AnilistSearchResult {
  id: string
  title: string
  image: string | null
  releaseDate: number | null
  totalEpisodes: number | null
}

export class AnilistLookupError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'AnilistLookupError'
  }
}

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<any> {
  const key = cacheKey(query, variables)
  const cached = getCached(key)
  if (cached !== undefined) return cached

  let res: Response
  try {
    res = await fetch(ANILIST_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    throw new AnilistLookupError('Network error calling AniList', err)
  }

  const body: any = await res.json().catch(() => null)

  if (!res.ok || body?.errors) {
    const message = body?.errors?.[0]?.message ?? `AniList returned ${res.status}`
    throw new AnilistLookupError(message)
  }

  setCached(key, body)
  return body
}

function pickTitle(title: { english?: string | null; romaji?: string | null } | null | undefined): string {
  return title?.english || title?.romaji || 'Untitled'
}

// AniList descriptions are HTML fragments (<br>, <i>, <b>, the
// occasional <a>) — strip tags and collapse <br> into real newlines so
// the UI can render it as plain text, same as the old Jikan synopsis.
function cleanDescription(description: unknown): string | null {
  if (typeof description !== 'string' || description.length === 0) return null
  const withBreaks = description.replace(/<br\s*\/?>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, '').trim()
  return stripped.length > 0 ? stripped : null
}

// AniList's MediaStatus enum -> the same human-readable strings the UI
// already expected from Jikan, so no downstream display code needed
// to change.
const STATUS_LABELS: Record<string, string> = {
  RELEASING: 'Currently Airing',
  FINISHED: 'Finished Airing',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'On Hiatus',
}

function mapStatus(status: unknown): string | null {
  if (typeof status !== 'string') return null
  return STATUS_LABELS[status] ?? status
}

// AniList's MediaFormat enum -> a friendlier label (TV_SHORT -> "TV Short").
const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
}

function mapFormat(format: unknown): string | null {
  if (typeof format !== 'string') return null
  return FORMAT_LABELS[format] ?? format
}

const DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { english romaji }
      coverImage { extraLarge }
      bannerImage
      description
      episodes
      status
      format
      averageScore
      genres
      characters(perPage: 12, sort: ROLE) {
        edges {
          role
          node { id name { full } image { large } }
        }
      }
    }
  }
`

/** Fetches details (info + character list, both in one request) for one series by its AniList id. */
export async function fetchAnimeInfo(anilistId: string | number): Promise<AnilistAnimeInfo> {
  const idNum = Number(anilistId)
  let body: any
  try {
    body = await anilistQuery(DETAILS_QUERY, { id: idNum })
  } catch (err) {
    if (err instanceof AnilistLookupError) throw err
    throw new AnilistLookupError(`AniList fetchAnimeInfo failed for id "${anilistId}"`, err)
  }

  const media = body?.data?.Media
  if (!media) {
    throw new AnilistLookupError(`No anime found for id "${anilistId}"`)
  }

  const characterEdges = Array.isArray(media.characters?.edges) ? media.characters.edges : []
  const characters: AnilistCharacter[] = characterEdges.map((edge: any, index: number) => ({
    id: String(edge?.node?.id ?? `char-${index}`),
    name: edge?.node?.name?.full ?? 'Unknown',
    role: typeof edge?.role === 'string' ? edge.role : null,
    image: edge?.node?.image?.large ?? null,
  }))

  return {
    id: String(media.id),
    title: pickTitle(media.title),
    image: media.coverImage?.extraLarge ?? null,
    bannerImage: media.bannerImage ?? null,
    genres: Array.isArray(media.genres) ? media.genres.filter(Boolean) : [],
    description: cleanDescription(media.description),
    status: mapStatus(media.status),
    format: mapFormat(media.format),
    score: typeof media.averageScore === 'number' ? media.averageScore / 10 : null,
    characters,
    totalEpisodes: typeof media.episodes === 'number' ? media.episodes : 0,
  }
}

const SEARCH_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, type: ANIME, isAdult: false) {
        id
        title { english romaji }
        coverImage { extraLarge }
        episodes
        startDate { year }
      }
    }
  }
`

function mapCardResult(m: any): AnilistSearchResult {
  return {
    id: String(m.id),
    title: pickTitle(m.title),
    image: m.coverImage?.extraLarge ?? null,
    releaseDate: m.startDate?.year ?? null,
    totalEpisodes: typeof m.episodes === 'number' ? m.episodes : null,
  }
}

/** Searches AniList by title (adult content excluded) and strips each result to card-sized data. */
export async function searchAnime(query: string): Promise<AnilistSearchResult[]> {
  let body: any
  try {
    body = await anilistQuery(SEARCH_QUERY, { search: query, perPage: 20 })
  } catch (err) {
    if (err instanceof AnilistLookupError) throw err
    throw new AnilistLookupError(`AniList search failed for query "${query}"`, err)
  }

  const results = Array.isArray(body?.data?.Page?.media) ? body.data.Page.media : []
  return results.map(mapCardResult)
}

const TRENDING_QUERY = `
  query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(type: ANIME, isAdult: false, status: RELEASING, sort: TRENDING_DESC) {
        id
        title { english romaji }
        coverImage { extraLarge }
        episodes
        startDate { year }
      }
    }
  }
`

/**
 * Currently-airing series ranked by trending score — feeds the Home
 * page's "Trending Now" section. Same card-sized shape as
 * searchAnime, so the frontend can reuse one result type for both.
 */
export async function fetchTrending(limit = 10): Promise<AnilistSearchResult[]> {
  let body: any
  try {
    body = await anilistQuery(TRENDING_QUERY, { perPage: limit })
  } catch (err) {
    if (err instanceof AnilistLookupError) throw err
    throw new AnilistLookupError('AniList trending fetch failed', err)
  }

  const results = Array.isArray(body?.data?.Page?.media) ? body.data.Page.media : []
  return results.map(mapCardResult)
}
