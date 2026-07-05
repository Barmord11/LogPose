import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAnimeInfo, searchAnime, fetchTrending, __resetAnimeApiCacheForTests } from './animeApi'

const originalFetch = globalThis.fetch

beforeEach(() => {
  globalThis.fetch = vi.fn()
  // Each `it` below expects its own mocked fetch to actually be
  // called - without this, a cache entry from an earlier test (same
  // endpoint/query) would short-circuit later ones straight to a
  // stale mocked value.
  __resetAnimeApiCacheForTests()
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

describe('client-side caching', () => {
  it('serves a second call to the same endpoint from cache instead of hitting the network again', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: '1', title: 'Foo', image: null, releaseDate: null, totalEpisodes: null }] }),
    } as Response)

    await fetchTrending()
    await fetchTrending()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps separate cache entries per series id, per search query, and does not cache the random pick', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', title: 'One Piece', image: null, totalEpisodes: 1000, episodes: [] }),
    } as Response)

    await fetchAnimeInfo(1)
    await fetchAnimeInfo(2) // different id - must not reuse id 1's cached entry
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)

    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({ results: [] }) } as Response)
    await searchAnime('one piece')
    await searchAnime('ONE PIECE  ') // same query, different case/whitespace - should still hit cache
    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })

  it('resets cleanly via the test-only reset hook', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ({ results: [] }) } as Response)

    await fetchTrending()
    __resetAnimeApiCacheForTests()
    await fetchTrending()

    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
