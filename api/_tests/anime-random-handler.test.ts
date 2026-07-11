import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/random.js'
import { fetchRandomAnime, AnilistLookupError } from '../_lib/anilist.js'

vi.mock('../_lib/anilist.js', () => ({
  fetchRandomAnime: vi.fn(),
  AnilistLookupError: class AnilistLookupError extends Error {},
}))

function mockRes() {
  const res = {} as VercelResponse
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/anime/random', () => {
  it('returns 200 with { result } and explicitly opts out of caching', async () => {
    const result = { id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }
    vi.mocked(fetchRandomAnime).mockResolvedValue(result)

    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ result })
    // Must never be cached/reused - the whole point is a fresh pick
    // every time, for every caller.
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })

  it('rejects non-GET methods with 405', async () => {
    const req = { method: 'POST' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('502s when the AniList random fetch fails', async () => {
    vi.mocked(fetchRandomAnime).mockRejectedValue(new AnilistLookupError('random failed'))
    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(fetchRandomAnime).mockRejectedValue(new Error('boom'))
    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch a random anime' })
  })
})
