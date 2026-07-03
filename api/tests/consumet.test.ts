import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAnimeInfo, searchAnime, ConsumetLookupError } from '../_lib/consumet.js'

const mockAnilistInstance = {
  fetchAnimeInfo: vi.fn(),
  search: vi.fn(),
}

vi.mock('@consumet/extensions', () => ({
  META: {
    // Must be a regular function (not an arrow fn) - consumet.ts calls
    // `new META.Anilist()`, and arrow functions can't be constructors.
    Anilist: vi.fn(function AnilistMock() {
      return mockAnilistInstance
    }),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchAnimeInfo', () => {
  it('strips the payload to id/title/image/totalEpisodes/episodes with outbound urls', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({
      id: 21,
      title: { romaji: 'One Piece', english: 'One Piece' },
      image: 'https://img/one-piece.jpg',
      totalEpisodes: 1000,
      episodes: [
        { id: 'ep-1', number: 1, title: 'Romance Dawn', image: 'https://img/ep1.jpg', url: 'https://watch.example/ep1' },
      ],
      relations: [{ huge: 'payload' }],
      studios: ['Toei Animation'],
      characters: [{ id: 1, name: 'Luffy' }],
    })

    const result = await fetchAnimeInfo('21')

    expect(result).toEqual({
      id: '21',
      title: 'One Piece',
      image: 'https://img/one-piece.jpg',
      totalEpisodes: 1000,
      episodes: [
        { id: 'ep-1', number: 1, title: 'Romance Dawn', image: 'https://img/ep1.jpg', url: 'https://watch.example/ep1' },
      ],
    })
    expect(result).not.toHaveProperty('relations')
    expect(result).not.toHaveProperty('studios')
    expect(result).not.toHaveProperty('characters')
  })

  it('falls back to romaji when english title is missing', async () => {
    mockAnilistInstance.fetchAnimeInfo.mockResolvedValue({ id: 5, title: { romaji: 'Foo' }, episodes: [] })
    const result = await fetchAnimeInfo('5')
    expect(result.title).toBe('Foo')
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
