import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAnimeInfo, searchAnime, fetchTrending, JikanLookupError, __resetJikanCacheForTests } from '../_lib/jikan.js'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

beforeEach(() => {
  vi.restoreAllMocks()
  // Jikan responses are cached in-memory for a few minutes (see jikan.ts) -
  // reset between tests so two cases hitting the same path/query don't
  // see each other's stubbed response.
  __resetJikanCacheForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAnimeInfo', () => {
  it('strips the Jikan payload to the details fields, merging in the character list', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        data: {
          mal_id: 21,
          title: 'One Piece',
          title_english: 'One Piece',
          images: { jpg: { large_image_url: 'https://img/one-piece.jpg' } },
          genres: [{ mal_id: 1, name: 'Action' }, { mal_id: 2, name: 'Adventure' }],
          synopsis: 'Luffy sets sail.\n\n[Written by MAL Rewrite]',
          status: 'Currently Airing',
          type: 'TV',
          score: 8.73,
          episodes: 1000,
        },
      }))
      .mockResolvedValueOnce(jsonResponse({
        data: [
          { character: { mal_id: 1, name: 'Monkey D. Luffy', images: { jpg: { image_url: 'https://img/luffy.jpg' } } }, role: 'Main' },
        ],
      })),
    )

    const result = await fetchAnimeInfo('21')

    expect(result).toEqual({
      id: '21',
      title: 'One Piece',
      image: 'https://img/one-piece.jpg',
      genres: ['Action', 'Adventure'],
      description: 'Luffy sets sail.',
      status: 'Currently Airing',
      format: 'TV',
      score: 8.73,
      characters: [{ id: '1', name: 'Monkey D. Luffy', role: 'Main', image: 'https://img/luffy.jpg' }],
      totalEpisodes: 1000,
    })
  })

  it('falls back to the romaji/default title when title_english is missing', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { mal_id: 5, title: 'Foo' } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] })),
    )
    const result = await fetchAnimeInfo('5')
    expect(result.title).toBe('Foo')
  })

  it('defaults genres/description/status/format/score/characters/totalEpisodes when Jikan omits them', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { mal_id: 1, title: 'X' } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] })),
    )
    const result = await fetchAnimeInfo('1')
    expect(result.genres).toEqual([])
    expect(result.description).toBeNull()
    expect(result.status).toBeNull()
    expect(result.format).toBeNull()
    expect(result.score).toBeNull()
    expect(result.characters).toEqual([])
    expect(result.totalEpisodes).toBe(0)
  })

  it('still returns details when the character sub-request fails (best-effort)', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { mal_id: 1, title: 'X' } }))
      .mockResolvedValueOnce(jsonResponse({}, false, 500)),
    )
    const result = await fetchAnimeInfo('1')
    expect(result.title).toBe('X')
    expect(result.characters).toEqual([])
  })

  it('throws JikanLookupError when the main request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(JikanLookupError)
  })

  it('throws JikanLookupError when no anime is found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ data: null })))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(JikanLookupError)
  })

  it('throws JikanLookupError on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network down')))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(JikanLookupError)
  })
})

describe('searchAnime', () => {
  it('strips search results to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: [{
        mal_id: 1,
        title_english: 'Foo',
        images: { jpg: { large_image_url: 'img' } },
        year: 2020,
        episodes: 12,
        hugeField: {},
      }],
    })))
    const results = await searchAnime('foo')
    expect(results).toEqual([{ id: '1', title: 'Foo', image: 'img', releaseDate: 2020, totalEpisodes: 12 }])
  })

  it('falls back to aired.prop.from.year when the top-level year is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: [{ mal_id: 1, title: 'Foo', aired: { prop: { from: { year: 1999 } } } }],
    })))
    const results = await searchAnime('foo')
    expect(results[0].releaseDate).toBe(1999)
  })

  it('returns an empty array when there are no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] })))
    expect(await searchAnime('nothing')).toEqual([])
  })

  it('throws JikanLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(searchAnime('x')).rejects.toBeInstanceOf(JikanLookupError)
  })
})

describe('fetchTrending', () => {
  it('strips the top-airing payload to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: [{ mal_id: 30, title: 'Bar', images: { jpg: { large_image_url: 'img' } }, year: 2024, episodes: 24 }],
    })))
    const results = await fetchTrending(10)
    expect(results).toEqual([{ id: '30', title: 'Bar', image: 'img', releaseDate: 2024, totalEpisodes: 24 }])
  })

  it('requests the given limit and the airing filter', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchTrending(5)
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('filter=airing&limit=5'))
  })

  it('throws JikanLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(fetchTrending()).rejects.toBeInstanceOf(JikanLookupError)
  })
})

describe('response caching', () => {
  it('serves a repeated call to the same path from cache instead of calling fetch again', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [{ mal_id: 1, title: 'Cached' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const first = await searchAnime('same-query')
    const second = await searchAnime('same-query')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('does not leak a cached response across different queries', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ mal_id: 1, title: 'A' }] }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ mal_id: 2, title: 'B' }] })),
    )

    const a = await searchAnime('query-a')
    const b = await searchAnime('query-b')

    expect(a[0].title).toBe('A')
    expect(b[0].title).toBe('B')
  })
})
