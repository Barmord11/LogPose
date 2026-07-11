import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../[...path].js'
import {
  fetchAnimeInfo,
  fetchPopular,
  fetchTrending,
  fetchRandomAnime,
  searchAnime,
  searchByGenre,
  AnilistLookupError,
} from '../_lib/anilist.js'
import { fetchWatchEpisodes, ConsumetLookupError } from '../_lib/consumet.js'

vi.mock('../_lib/anilist.js', () => ({
  fetchAnimeInfo: vi.fn(),
  fetchPopular: vi.fn(),
  fetchTrending: vi.fn(),
  fetchRandomAnime: vi.fn(),
  searchAnime: vi.fn(),
  searchByGenre: vi.fn(),
  AnilistLookupError: class AnilistLookupError extends Error {},
}))

vi.mock('../_lib/consumet.js', () => ({
  fetchWatchEpisodes: vi.fn(),
  ConsumetLookupError: class ConsumetLookupError extends Error {},
}))

function mockRes() {
  const res = {} as VercelResponse
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  return res
}

/** Builds a request the same shape Vercel gives a catch-all [...path]
 * function - the segments after /api/ land in query.path as an array,
 * alongside any real query-string params. */
function reqFor(pathSegments: string[], extraQuery: Record<string, string> = {}, method = 'GET') {
  return { method, query: { path: pathSegments, ...extraQuery } } as unknown as VercelRequest
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('single /api/[...path] router', () => {
  it('rejects non-GET methods with 405 before any routing happens', async () => {
    const req = reqFor(['anime', 'popular'], {}, 'POST')
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('404s a path that is not under /api/anime/*', async () => {
    const req = reqFor(['foo', 'bar'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('404s /api/anime with no further segment', async () => {
    const req = reqFor(['anime'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('GET /api/anime/:id', () => {
  const detailsPayload = {
    id: '21',
    title: 'One Piece',
    image: null,
    bannerImage: null,
    genres: ['Action'],
    description: null,
    status: 'Currently Airing',
    format: 'TV',
    score: 8.7,
    characters: [],
    totalEpisodes: 1000,
  }

  it('merges AniList details with Consumet episodes into one payload', async () => {
    vi.mocked(fetchAnimeInfo).mockResolvedValue(detailsPayload)
    vi.mocked(fetchWatchEpisodes).mockResolvedValue([
      { id: 'e1', number: 1, title: null, image: null, url: 'https://watch.example/ep1' },
    ])

    const req = reqFor(['anime', '21'])
    const res = mockRes()
    await handler(req, res)

    expect(fetchAnimeInfo).toHaveBeenCalledWith('21')
    expect(fetchWatchEpisodes).toHaveBeenCalledWith('21')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      ...detailsPayload,
      episodes: [{ id: 'e1', number: 1, title: null, image: null, url: 'https://watch.example/ep1' }],
    })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('degrades to an empty episode list when Consumet/AnimeKai fails, without failing the request', async () => {
    vi.mocked(fetchAnimeInfo).mockResolvedValue(detailsPayload)
    vi.mocked(fetchWatchEpisodes).mockRejectedValue(new ConsumetLookupError('Cloudflare 522'))

    const req = reqFor(['anime', '21'])
    const res = mockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ...detailsPayload, episodes: [] })
  })

  it('404s when the AniList lookup fails with AnilistLookupError', async () => {
    vi.mocked(fetchAnimeInfo).mockRejectedValue(new AnilistLookupError('not found'))
    const req = reqFor(['anime', '999'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(fetchWatchEpisodes).not.toHaveBeenCalled()
  })

  it('502s on an unexpected AniList error', async () => {
    vi.mocked(fetchAnimeInfo).mockRejectedValue(new Error('boom'))
    const req = reqFor(['anime', '999'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})

describe('GET /api/anime/popular', () => {
  it('returns 200 with { results }', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(fetchPopular).mockResolvedValue(results)

    const req = reqFor(['anime', 'popular'])
    const res = mockRes()
    await handler(req, res)

    expect(fetchPopular).toHaveBeenCalledWith(10)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('502s when the AniList popular fetch fails', async () => {
    vi.mocked(fetchPopular).mockRejectedValue(new AnilistLookupError('popular failed'))
    const req = reqFor(['anime', 'popular'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(fetchPopular).mockRejectedValue(new Error('boom'))
    const req = reqFor(['anime', 'popular'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch popular anime' })
  })
})

describe('GET /api/anime/trending', () => {
  it('returns 200 with { results }', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(fetchTrending).mockResolvedValue(results)

    const req = reqFor(['anime', 'trending'])
    const res = mockRes()
    await handler(req, res)

    expect(fetchTrending).toHaveBeenCalledWith(10)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(fetchTrending).mockRejectedValue(new Error('boom'))
    const req = reqFor(['anime', 'trending'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch trending anime' })
  })
})

describe('GET /api/anime/random', () => {
  it('returns 200 with { result } and explicitly opts out of caching', async () => {
    const result = { id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }
    vi.mocked(fetchRandomAnime).mockResolvedValue(result)

    const req = reqFor(['anime', 'random'])
    const res = mockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ result })
    // Must never be cached/reused - the whole point is a fresh pick
    // every time, for every caller.
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(fetchRandomAnime).mockRejectedValue(new Error('boom'))
    const req = reqFor(['anime', 'random'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch a random anime' })
  })
})

describe('GET /api/anime/search', () => {
  it('returns 200 with { results }', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(searchAnime).mockResolvedValue(results)

    const req = reqFor(['anime', 'search'], { q: 'foo' })
    const res = mockRes()
    await handler(req, res)

    expect(searchAnime).toHaveBeenCalledWith('foo')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('400s when q is missing or blank', async () => {
    const req = reqFor(['anime', 'search'], { q: '   ' })
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(searchAnime).not.toHaveBeenCalled()
  })

  it('502s when the AniList search fails', async () => {
    vi.mocked(searchAnime).mockRejectedValue(new AnilistLookupError('search failed'))
    const req = reqFor(['anime', 'search'], { q: 'foo' })
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})

describe('GET /api/anime/genre', () => {
  it('returns 200 with { results }, parsing comma-separated genres', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(searchByGenre).mockResolvedValue(results)

    const req = reqFor(['anime', 'genre'], { g: 'Action,Adventure' })
    const res = mockRes()
    await handler(req, res)

    expect(searchByGenre).toHaveBeenCalledWith(['Action', 'Adventure'])
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('trims whitespace and drops empty entries from the genre list', async () => {
    vi.mocked(searchByGenre).mockResolvedValue([])
    const req = reqFor(['anime', 'genre'], { g: ' Action , , Adventure ' })
    const res = mockRes()
    await handler(req, res)
    expect(searchByGenre).toHaveBeenCalledWith(['Action', 'Adventure'])
  })

  it('400s when the g query parameter is missing', async () => {
    const req = reqFor(['anime', 'genre'])
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(searchByGenre).not.toHaveBeenCalled()
  })

  it('502s when the AniList genre fetch fails', async () => {
    vi.mocked(searchByGenre).mockRejectedValue(new AnilistLookupError('genre failed'))
    const req = reqFor(['anime', 'genre'], { g: 'Mystery' })
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})
