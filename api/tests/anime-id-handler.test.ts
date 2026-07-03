import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/[id].js'
import { fetchAnimeInfo, ConsumetLookupError } from '../_lib/consumet.js'

vi.mock('../_lib/consumet.js', () => ({
  fetchAnimeInfo: vi.fn(),
  ConsumetLookupError: class ConsumetLookupError extends Error {},
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

describe('GET /api/anime/:id', () => {
  it('returns 200 with the stripped anime payload', async () => {
    const payload = { id: '21', title: 'One Piece', image: null, totalEpisodes: 1000, episodes: [] }
    vi.mocked(fetchAnimeInfo).mockResolvedValue(payload)

    const req = { method: 'GET', query: { id: '21' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(fetchAnimeInfo).toHaveBeenCalledWith('21')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(payload)
  })

  it('rejects non-GET methods with 405', async () => {
    const req = { method: 'POST', query: {} } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('400s when the id path parameter is missing', async () => {
    const req = { method: 'GET', query: {} } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(fetchAnimeInfo).not.toHaveBeenCalled()
  })

  it('404s when the anime lookup fails with ConsumetLookupError', async () => {
    vi.mocked(fetchAnimeInfo).mockRejectedValue(new ConsumetLookupError('not found'))
    const req = { method: 'GET', query: { id: '999' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('502s on an unexpected error', async () => {
    vi.mocked(fetchAnimeInfo).mockRejectedValue(new Error('boom'))
    const req = { method: 'GET', query: { id: '999' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})
