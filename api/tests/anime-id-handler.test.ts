import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../anime/[id].js'
import { fetchAnimeInfo, JikanLookupError } from '../_lib/jikan.js'
import { fetchWatchEpisodes, ConsumetLookupError } from '../_lib/consumet.js'

vi.mock('../_lib/jikan.js', () => ({
  fetchAnimeInfo: vi.fn(),
  JikanLookupError: class JikanLookupError extends Error {},
}))

vi.mock('../_lib/consumet.js', () => ({
  fetchWatchEpisodes: vi.fn(),
  ConsumetLookupError: class ConsumetLookupError extends Error {},
}))

function mockRes() {
  const res = {} as VercelResponse
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

const detailsPayload = {
  id: '21',
  title: 'One Piece',
  image: null,
  genres: ['Action'],
  description: null,
  status: 'Currently Airing',
  format: 'TV',
  score: 8.7,
  characters: [],
  totalEpisodes: 1000,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/anime/:id', () => {
  it('merges Jikan details with Consumet episodes into one payload', async () => {
    vi.mocked(fetchAnimeInfo).mockResolvedValue(detailsPayload)
    vi.mocked(fetchWatchEpisodes).mockResolvedValue([
      { id: 'e1', number: 1, title: null, image: null, url: 'https://watch.example/ep1' },
    ])

    const req = { method: 'GET', query: { id: '21' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(fetchAnimeInfo).toHaveBeenCalledWith('21')
    expect(fetchWatchEpisodes).toHaveBeenCalledWith('21')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      ...detailsPayload,
      episodes: [{ id: 'e1', number: 1, title: null, image: null, url: 'https://watch.example/ep1' }],
    })
  })

  it('degrades to an empty episode list when Consumet/AnimeKai fails, without failing the request', async () => {
    vi.mocked(fetchAnimeInfo).mockResolvedValue(detailsPayload)
    vi.mocked(fetchWatchEpisodes).mockRejectedValue(new ConsumetLookupError('Cloudflare 522'))

    const req = { method: 'GET', query: { id: '21' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ...detailsPayload, episodes: [] })
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

  it('404s when the Jikan lookup fails with JikanLookupError', async () => {
    vi.mocked(fetchAnimeInfo).mockRejectedValue(new JikanLookupError('not found'))
    const req = { method: 'GET', query: { id: '999' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(fetchWatchEpisodes).not.toHaveBeenCalled()
  })

  it('502s on an unexpected Jikan error', async () => {
    vi.mocked(fetchAnimeInfo).mockRejectedValue(new Error('boom'))
    const req = { method: 'GET', query: { id: '999' } } as unknown as VercelRequest
    const res = mockRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})
