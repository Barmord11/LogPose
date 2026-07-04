import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/search.js'
import { searchAnime, AnilistLookupError } from '../_lib/anilist.js'

vi.mock('../_lib/anilist.js', () => ({
  searchAnime: vi.fn(),
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

describe('GET /api/anime/search', () => {
  it('returns 200 with { results }', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(searchAnime).mockResolvedValue(results)

    const req = { method: 'GET', query: { q: 'foo' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(searchAnime).toHaveBeenCalledWith('foo')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
  })

  it('rejects non-GET methods with 405', async () => {
    const req = { method: 'DELETE', query: {} } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('400s when q is missing or blank', async () => {
    const req = { method: 'GET', query: { q: '   ' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(searchAnime).not.toHaveBeenCalled()
  })

  it('502s when the AniList search fails', async () => {
    vi.mocked(searchAnime).mockRejectedValue(new AnilistLookupError('search failed'))
    const req = { method: 'GET', query: { q: 'foo' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})
