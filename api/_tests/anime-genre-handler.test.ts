import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/genre.js'
import { searchByGenre, AnilistLookupError } from '../_lib/anilist.js'

vi.mock('../_lib/anilist.js', () => ({
  searchByGenre: vi.fn(),
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

describe('GET /api/anime/genre', () => {
  it('returns 200 with { results }, parsing comma-separated genres', async () => {
    const results = [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }]
    vi.mocked(searchByGenre).mockResolvedValue(results)

    const req = { method: 'GET', query: { g: 'Action,Adventure' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(searchByGenre).toHaveBeenCalledWith(['Action', 'Adventure'])
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ results })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('s-maxage'))
  })

  it('trims whitespace and drops empty entries from the genre list', async () => {
    vi.mocked(searchByGenre).mockResolvedValue([])
    const req = { method: 'GET', query: { g: ' Action , , Adventure ' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(searchByGenre).toHaveBeenCalledWith(['Action', 'Adventure'])
  })

  it('rejects non-GET methods with 405', async () => {
    const req = { method: 'POST', query: {} } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('400s when the g query parameter is missing', async () => {
    const req = { method: 'GET', query: {} } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(searchByGenre).not.toHaveBeenCalled()
  })

  it('400s when the g query parameter is empty', async () => {
    const req = { method: 'GET', query: { g: '' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('502s when the AniList genre fetch fails', async () => {
    vi.mocked(searchByGenre).mockRejectedValue(new AnilistLookupError('genre failed'))
    const req = { method: 'GET', query: { g: 'Mystery' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('502s with a generic message on an unexpected error', async () => {
    vi.mocked(searchByGenre).mockRejectedValue(new Error('boom'))
    const req = { method: 'GET', query: { g: 'Mystery' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch anime by genre' })
  })
})
