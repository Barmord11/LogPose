import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/trending.js'
import { fetchTrending, AnilistLookupError } from '../_lib/anilist.js'

vi.mock('../_lib/anilist.js', () => ({
  fetchTrending: vi.fn(),
  AnilistLookupError: class AnilistLookupError extends Error {},
}))

function mockRes() {
  const res = {} as VercelResponse
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/anime/trending', () => {
  it('returns 200 with { results }', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(fetchTrending).mockResolvedValue(results)

    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(fetchTrending).toHaveBeenCalledWith(10)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
  })

  it('rejects non-GET methods with 405', async () => {
    const req = { method: 'POST' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('502s when the AniList trending fetch fails', async () => {
    vi.mocked(fetchTrending).mockRejectedValue(new AnilistLookupError('trending failed'))
    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(fetchTrending).mockRejectedValue(new Error('boom'))
    const req = { method: 'GET' } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch trending anime' })
  })
})
