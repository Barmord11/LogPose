import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/popular.js'
import { fetchPopular, AnilistLookupError } from '../_lib/anilist.js'

vi.mock('../_lib/anilist.js', () => ({
  fetchPopular: vi.fn(),
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

describe('GET /api/anime/popular', () => {
  it('returns 200 with { results }', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(fetchPopular).mockResolvedValue(results)

    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(fetchPopular).toHaveBeenCalledWith(10)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
    // Same for every visitor - safe (and worthwhile) to cache at the edge.
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('rejects non-GET methods with 405', async () => {
    const req = { method: 'POST' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('502s when the AniList popular fetch fails', async () => {
    vi.mocked(fetchPopular).mockRejectedValue(new AnilistLookupError('popular failed'))
    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(fetchPopular).mockRejectedValue(new Error('boom'))
    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch popular anime' })
  })
})
