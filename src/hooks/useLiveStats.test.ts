import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLiveStats } from './useLiveStats'
import * as tracker from '../services/tracker'
import * as favorites from '../services/favorites'
import type { TrackerRow } from '../services/tracker'
import type { FavoriteRow } from '../services/favorites'

vi.mock('../services/tracker')
vi.mock('../services/favorites')

function row(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    id: 1,
    anilistId: 21,
    title: 'One Piece',
    imageUrl: null,
    totalEpisodes: 1000,
    episodesWatched: 0,
    status: 'Plan to Watch',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useLiveStats', () => {
  it('starts loading with everything at zero', async () => {
    vi.mocked(tracker.getTrackerList).mockResolvedValue([])
    vi.mocked(favorites.listFavorites).mockResolvedValue([])

    const { result } = renderHook(() => useLiveStats())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('sums episodes_watched across every tracked row, regardless of status', async () => {
    vi.mocked(tracker.getTrackerList).mockResolvedValue([
      row({ episodesWatched: 1000, status: 'Watched' }),
      row({ episodesWatched: 30, status: 'Plan to Watch' }),
    ])
    vi.mocked(favorites.listFavorites).mockResolvedValue([])

    const { result } = renderHook(() => useLiveStats())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalEpisodes).toBe(1030)
  })

  it('counts Watched and Plan to Watch rows into separate tallies', async () => {
    vi.mocked(tracker.getTrackerList).mockResolvedValue([
      row({ status: 'Watched' }),
      row({ status: 'Watched' }),
      row({ status: 'Plan to Watch' }),
    ])
    vi.mocked(favorites.listFavorites).mockResolvedValue([])

    const { result } = renderHook(() => useLiveStats())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.seriesWatched).toBe(2)
    expect(result.current.planCount).toBe(1)
  })

  it('counts favorited rows', async () => {
    vi.mocked(tracker.getTrackerList).mockResolvedValue([])
    const favs: FavoriteRow[] = [
      { anilistId: 1, title: 'A', imageUrl: null },
      { anilistId: 2, title: 'B', imageUrl: null },
    ]
    vi.mocked(favorites.listFavorites).mockResolvedValue(favs)

    const { result } = renderHook(() => useLiveStats())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.favoritesCount).toBe(2)
  })

  it('degrades to all-zero (not loading forever) when not signed in / a fetch fails', async () => {
    vi.mocked(tracker.getTrackerList).mockRejectedValue(new Error('RLS denied'))
    vi.mocked(favorites.listFavorites).mockResolvedValue([])

    const { result } = renderHook(() => useLiveStats())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current).toEqual({ totalEpisodes: 0, seriesWatched: 0, planCount: 0, favoritesCount: 0, loading: false })
  })
})
