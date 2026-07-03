import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAnimeInfo, searchAnime, ConsumetLookupError } from '../_lib/consumet.js'

const mockAnilistInstance = {
  fetchAnimeInfo: vi.fn(),
  search: vi.fn(),
}

vi.mock('@consumet/extensions', () => ({
  META: {
    // Must be a regular function (not an arrow fn) - consumet.ts calls
    // `new META.Anilist(new ANIME.AnimeKai())`, and arrow functions
    // can't be constructors.
    Anilist: vi.fn(function AnilistMock() {
      return mockAnilistInstance
    }),
  },
  ANIME: {
    AnimeKai: vi.fn(function AnimeKaiMock() {
      return {}
    }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchAnimeInfo', () => {
  it('strips the payload to the details fields plus episodes with outbound urls', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({
      id: 21,
      title: { romaji: 'One Piece', english: 'One Piece' },
      image: 'https://img/one-piece.jpg',
      genres: ['Action', 'Adventure', 'Fantasy'],
      description: 'Luffy sets sail.<br><br>He wants to be the <i>Pirate King</i> &amp; find One Piece.',
      status: 'ONGOING',
      type: 'TV',
      rating: 88,
      characters: [
        { id: 1, role: 'MAIN', name: { full: 'Monkey D. Luffy' }, image: 'https://img/luffy.jpg' },
      ],
      totalEpisodes: 1000,
      episodes: [
        { id: 'ep-1', number: 1, title: 'Romance Dawn', image: 'https://img/ep1.jpg', url: 'https://watch.example/ep1' },
      ],
      relations: [{ huge: 'payload' }],
      studios: ['Toei Animation'],
    })

    const result = await fetchAnimeInfo('21')

    expect(result).toEqual({
      id: '21',
      title: 'One Piece',
      image: 'https://img/one-piece.jpg',
      genres: ['Action', 'Adventure', 'Fantasy'],
      description: 'Luffy sets sail.\n\nHe wants to be the Pirate King & find One Piece.',
      status: 'ONGOING',
      format: 'TV',
      rating: 88,
      characters: [
        { id: '1', name: 'Monkey D. Luffy', role: 'MAIN', image: 'https://img/luffy.jpg' },
      ],
      totalEpisodes: 1000,
      episodes: [
        { id: 'ep-1', number: 1, title: 'Romance Dawn', image: 'https://img/ep1.jpg', url: 'https://watch.example/ep1' },
      ],
    })
    expect(result).not.toHaveProperty('relations')
    expect(result).not.toHaveProperty('studios')
  })

  it('falls back to romaji when english title is missing', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({ id: 5, title: { romaji: 'Foo' }, episodes: [] })
    const result = await fetchAnimeInfo('5')
    expect(result.title).toBe('Foo')
  })

  it('defaults genres/description/status/format/rating/characters when the provider omits them', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({ id: 1, title: 'X', episodes: [] })
    const result = await fetchAnimeInfo('1')
    expect(result.genres).toEqual([])
    expect(result.description).toBeNull()
    expect(result.status).toBeNull()
    expect(result.format).toBeNull()
    expect(result.rating).toBeNull()
    expect(result.characters).toEqual([])
  })

  it('falls back to first/last name and an index-based id when a character has no full name or id', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({
      id: 1,
      title: 'X',
      episodes: [],
      characters: [{ role: 'SUPPORTING', name: { first: 'Jane', last: 'Doe' }, image: null }],
    })
    const result = await fetchAnimeInfo('1')
    expect(result.characters).toEqual([{ id: 'char-0', name: 'Jane Doe', role: 'SUPPORTING', image: null }])
  })

  it('caps characters to the first 12', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({
      id: 1,
      title: 'X',
      episodes: [],
      characters: Array.from({ length: 20 }, (_, i) => ({ id: i, name: { full: `Char ${i}` } })),
    })
    const result = await fetchAnimeInfo('1')
    expect(result.characters).toHaveLength(12)
  })

  it('passes each episode url through untouched - LogPose never hosts video', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({
      id: 1,
      title: 'X',
      episodes: [{ id: 'e1', number: 1, url: 'https://external-site.example/watch' }],
    })
    const result = await fetchAnimeInfo('1')
    expect(result.episodes[0].url).toBe('https://external-site.example/watch')
  })

  it('defaults episode url to null when the provider has none', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({
      id: 1, title: 'X', episodes: [{ id: 'e1', number: 1 }],
    })
    const result = await fetchAnimeInfo('1')
    expect(result.episodes[0].url).toBeNull()
  })

  it('throws ConsumetLookupError when the provider throws', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockRejectedValue(new Error('network down'))
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(ConsumetLookupError)
  })

  it('throws ConsumetLookupError when no anime is found', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue(null)
    await expect(fetchAnimeInfo('999')).rejects.toBeInstanceOf(ConsumetLookupError)
  })
})

describe('searchAnime', () => {
  it('strips search results to card-sized data', async () => {
    mockAnilistInstance.search.mockResolvedValue({
      results: [{ id: 1, title: { english: 'Foo' }, image: 'img', releaseDate: 2020, totalEpisodes: 12, hugeField: {} }],
    })
    const results = await searchAnime('foo')
    expect(results).toEqual([{ id: '1', title: 'Foo', image: 'img', releaseDate: 2020, totalEpisodes: 12 }])
  })

  it('returns an empty array when there are no results', async () => {
    mockAnilistInstance.search.mockResolvedValue({ results: [] })
    expect(await searchAnime('nothing')).toEqual([])
  })

  it('throws ConsumetLookupError when the provider throws', async () => {
    mockAnilistInstance.search.mockRejectedValue(new Error('boom'))
    await expect(searchAnime('x')).rejects.toBeInstanceOf(ConsumetLookupError)
  })
})
