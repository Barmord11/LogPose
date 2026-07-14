import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchAnimeInfo, searchAnime, fetchTrending, fetchPopular, fetchNewReleases, searchByGenre, AnilistLookupError, __resetAnilistCacheForTests } from '../_lib/anilist.js'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

beforeEach(() => {
  vi.restoreAllMocks()
  // AniList responses are cached in-memory for a few minutes (see
  // anilist.ts) - reset between tests so two cases hitting the same
  // query/variables pair don't see each other's stubbed response.
  __resetAnilistCacheForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAnimeInfo', () => {
  it('strips the AniList Media payload to the details fields, including the character list from the same response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: {
        Media: {
          id: 21,
          title: { english: 'One Piece', romaji: 'One Piece' },
          coverImage: { extraLarge: 'https://img/one-piece.jpg' },
          bannerImage: 'https://img/one-piece-banner.jpg',
          description: 'Luffy sets sail.<br><br>Adventure awaits.',
          episodes: 1000,
          status: 'RELEASING',
          format: 'TV',
          averageScore: 87,
          genres: ['Action', 'Adventure'],
          characters: {
            edges: [
              { role: 'MAIN', node: { id: 1, name: { full: 'Monkey D. Luffy' }, image: { large: 'https://img/luffy.jpg' } } },
            ],
          },
        },
      },
    })))

    const result = await fetchAnimeInfo('21')

    expect(result).toEqual({
      id: '21',
      title: 'One Piece',
      image: 'https://img/one-piece.jpg',
      bannerImage: 'https://img/one-piece-banner.jpg',
      genres: ['Action', 'Adventure'],
      description: 'Luffy sets sail.\n\nAdventure awaits.',
      status: 'Currently Airing',
      format: 'TV',
      score: 8.7,
      characters: [{ id: '1', name: 'Monkey D. Luffy', role: 'MAIN', image: 'https://img/luffy.jpg' }],
      totalEpisodes: 1000,
    })
  })

  it('falls back to the romaji title when the English title is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: { Media: { id: 5, title: { romaji: 'Foo' } } },
    })))
    const result = await fetchAnimeInfo('5')
    expect(result.title).toBe('Foo')
  })

  it('defaults genres/description/status/format/score/characters/totalEpisodes when AniList omits them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: { Media: { id: 1, title: { romaji: 'X' } } },
    })))
    const result = await fetchAnimeInfo('1')
    expect(result.genres).toEqual([])
    expect(result.description).toBeNull()
    expect(result.status).toBeNull()
    expect(result.format).toBeNull()
    expect(result.score).toBeNull()
    expect(result.characters).toEqual([])
    expect(result.totalEpisodes).toBe(0)
  })

  it('passes the id to AniList as an Int variable', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Media: { id: 21, title: { romaji: 'X' } } } }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchAnimeInfo('21')
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.variables).toEqual({ id: 21 })
  })

  it('throws AnilistLookupError when the GraphQL response contains errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ errors: [{ message: 'Not Found.' }] }, false, 404)))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(AnilistLookupError)
  })

  it('throws AnilistLookupError when no Media is found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Media: null } })))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(AnilistLookupError)
  })

  it('throws AnilistLookupError on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network down')))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(AnilistLookupError)
  })
})

describe('searchAnime', () => {
  it('strips search results to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: {
        Page: {
          media: [{
            id: 1,
            title: { english: 'Foo', romaji: 'Fu' },
            coverImage: { extraLarge: 'img' },
            startDate: { year: 2020 },
            episodes: 12,
          }],
        },
      },
    })))
    const results = await searchAnime('foo')
    expect(results).toEqual([{ id: '1', title: 'Foo', image: 'img', releaseDate: 2020, totalEpisodes: 12 }])
  })

  it('excludes adult content by requesting isAdult: false in the query', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await searchAnime('foo')
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.query).toContain('isAdult: false')
  })

  it('returns an empty array when there are no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } })))
    expect(await searchAnime('nothing')).toEqual([])
  })

  it('throws AnilistLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(searchAnime('x')).rejects.toBeInstanceOf(AnilistLookupError)
  })
})

describe('fetchTrending', () => {
  it('strips the trending payload to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: {
        Page: {
          media: [{ id: 30, title: { romaji: 'Bar' }, coverImage: { extraLarge: 'img' }, startDate: { year: 2024 }, episodes: 24 }],
        },
      },
    })))
    const results = await fetchTrending(10)
    expect(results).toEqual([{ id: '30', title: 'Bar', image: 'img', releaseDate: 2024, totalEpisodes: 24 }])
  })

  it('requests the given perPage limit', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchTrending(5)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.variables).toEqual({ perPage: 5 })
  })

  it('throws AnilistLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(fetchTrending()).rejects.toBeInstanceOf(AnilistLookupError)
  })
})

describe('fetchPopular', () => {
  it('strips the popular payload to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: {
        Page: {
          media: [{ id: 1, title: { romaji: 'Most Popular' }, coverImage: { extraLarge: 'img' }, startDate: { year: 2019 }, episodes: 100 }],
        },
      },
    })))
    const results = await fetchPopular(10)
    expect(results).toEqual([{ id: '1', title: 'Most Popular', image: 'img', releaseDate: 2019, totalEpisodes: 100 }])
  })

  it('requests popularity-desc sort with no status filter (unlike fetchTrending, not airing-only)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPopular(10)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.query).toContain('POPULARITY_DESC')
    expect(body.query).not.toContain('status:')
  })

  it('requests the given perPage limit', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPopular(5)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.variables).toEqual({ perPage: 5 })
  })

  it('throws AnilistLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(fetchPopular()).rejects.toBeInstanceOf(AnilistLookupError)
  })
})

describe('fetchNewReleases', () => {
  it('strips the new-releases payload to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: {
        Page: {
          media: [{ id: 40, title: { romaji: 'Fresh Show' }, coverImage: { extraLarge: 'img' }, startDate: { year: 2026 }, episodes: 12 }],
        },
      },
    })))
    const results = await fetchNewReleases(10)
    expect(results).toEqual([{ id: '40', title: 'Fresh Show', image: 'img', releaseDate: 2026, totalEpisodes: 12 }])
  })

  it('requests start-date-desc sort, excluding not-yet-released titles', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchNewReleases(10)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.query).toContain('START_DATE_DESC')
    expect(body.query).toContain('status_in: [RELEASING, FINISHED]')
  })

  it('requests the given perPage limit', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await fetchNewReleases(5)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.variables).toEqual({ perPage: 5 })
  })

  it('throws AnilistLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(fetchNewReleases()).rejects.toBeInstanceOf(AnilistLookupError)
  })
})

describe('searchByGenre', () => {
  it('strips the genre-filtered payload to card-sized data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({
      data: {
        Page: {
          media: [{ id: 7, title: { romaji: 'Fantasy Voyage' }, coverImage: { extraLarge: 'img' }, startDate: { year: 2021 }, episodes: 13 }],
        },
      },
    })))
    const results = await searchByGenre(['Fantasy'])
    expect(results).toEqual([{ id: '7', title: 'Fantasy Voyage', image: 'img', releaseDate: 2021, totalEpisodes: 13 }])
  })

  it('passes the given genre names as the genre_in variable', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await searchByGenre(['Action', 'Adventure'], 20)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.variables).toEqual({ genres: ['Action', 'Adventure'], perPage: 20 })
    expect(body.query).toContain('genre_in: $genres')
  })

  it('excludes adult content', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [] } } }))
    vi.stubGlobal('fetch', fetchMock)
    await searchByGenre(['Mystery'])
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body.query).toContain('isAdult: false')
  })

  it('throws AnilistLookupError when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false, 500)))
    await expect(searchByGenre(['Mystery'])).rejects.toBeInstanceOf(AnilistLookupError)
  })
})

describe('response caching', () => {
  it('serves a repeated call with the same query/variables from cache instead of calling fetch again', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [{ id: 1, title: { romaji: 'Cached' } }] } } }))
    vi.stubGlobal('fetch', fetchMock)

    const first = await searchAnime('same-query')
    const second = await searchAnime('same-query')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('does not leak a cached response across different queries', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [{ id: 1, title: { romaji: 'A' } }] } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { Page: { media: [{ id: 2, title: { romaji: 'B' } }] } } })),
    )

    const a = await searchAnime('query-a')
    const b = await searchAnime('query-b')

    expect(a[0].title).toBe('A')
    expect(b[0].title).toBe('B')
  })
})
