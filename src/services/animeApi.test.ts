import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAnimeInfo, searchAnime, fetchTrending } from './animeApi'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchAnimeInfo', () => {
  it('fetches /api/anime/:id and returns the parsed body', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: '21', title: 'One Piece', image: null, totalEpisodes: 1000, episodes: [] }),
    } as Response)

    const result = await fetchAnimeInfo(21)

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/anime/21')
    expect(result.title).toBe('One Piece')
  })

  it('throws with the server-provided error message on failure', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({ error: 'No anime found for id "999"' }),
    } as Response)

    await expect(fetchAnimeInfo(999)).rejects.toThrow('No anime found for id "999"')
  })
})

describe('searchAnime', () => {
  it('fetches /api/anime/search?q=... and returns the results array', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }] }),
    } as Response)

    const results = await searchAnime('foo bar')

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/anime/search?q=foo%20bar', { signal: undefined })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Foo')
  })

  it('forwards an AbortSignal so a superseded search can be cancelled', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response)
    const controller = new AbortController()

    await searchAnime('foo', controller.signal)

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/anime/search?q=foo', { signal: controller.signal })
  })

  it('returns an empty array when the response has no results field', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    expect(await searchAnime('x')).toEqual([])
  })
})

describe('fetchTrending', () => {
  it('fetches /api/anime/trending and returns the results array', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }] }),
    } as Response)

    const results = await fetchTrending()

    expect(globalThis.fetch).toHaveBeenCalledWith('/api/anime/trending')
    expect(results).toHaveLength(1)
  })

  it('returns an empty array when the response has no results field', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    expect(await fetchTrending()).toEqual([])
  })
})
