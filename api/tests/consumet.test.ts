import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchWatchEpisodes, ConsumetLookupError } from '../_lib/consumet.js'

const mockMalInstance = {
  fetchAnimeInfo: vi.fn(),
}

vi.mock('@consumet/extensions', () => ({
  META: {
    // Must be a regular function (not an arrow fn) - consumet.ts calls
    // `new META.Myanimelist(new ANIME.AnimeKai())`, and arrow functions
    // can't be constructors.
    Myanimelist: vi.fn(function MyanimelistMock() {
      return mockMalInstance
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

describe('fetchWatchEpisodes', () => {
  it('returns the episode list with outbound AnimeKai urls, by MAL id', async () => {
    mockMalInstance.fetchAnimeInfo.mockResolvedValue({
      id: 21,
      title: { romaji: 'One Piece' },
      episodes: [
        { id: 'ep-1', number: 1, title: 'Romance Dawn', image: 'https://img/ep1.jpg', url: 'https://watch.example/ep1' },
      ],
    })

    const result = await fetchWatchEpisodes('21')

    expect(result).toEqual([
      { id: 'ep-1', number: 1, title: 'Romance Dawn', image: 'https://img/ep1.jpg', url: 'https://watch.example/ep1' },
    ])
  })

  it('defaults episode url to null when the provider has none', async () => {
    mockMalInstance.fetchAnimeInfo.mockResolvedValue({
      id: 1, episodes: [{ id: 'e1', number: 1 }],
    })
    const result = await fetchWatchEpisodes('1')
    expect(result[0].url).toBeNull()
  })

  it('returns an empty array when the provider has no episodes', async () => {
    mockMalInstance.fetchAnimeInfo.mockResolvedValue({ id: 1 })
    expect(await fetchWatchEpisodes('1')).toEqual([])
  })

  it('throws ConsumetLookupError when the provider throws (e.g. AnimeKai is down)', async () => {
    mockMalInstance.fetchAnimeInfo.mockRejectedValue(new Error('Cloudflare 522'))
    await expect(fetchWatchEpisodes('999')).rejects.toBeInstanceOf(ConsumetLookupError)
  })

  it('throws ConsumetLookupError when the provider returns nothing', async () => {
    mockMalInstance.fetchAnimeInfo.mockResolvedValue(null)
    await expect(fetchWatchEpisodes('999')).rejects.toBeInstanceOf(ConsumetLookupError)
  })
})
