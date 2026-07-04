import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HomePage from './HomePage'
import { AppProvider } from '../context/AppContext'
import * as tracker from '../services/tracker'
import * as animeApi from '../services/animeApi'
import * as ratings from '../services/ratings'
import * as favorites from '../services/favorites'
import type { TrackerRow } from '../services/tracker'
import type { AnimeSearchResult } from '../services/animeApi'

vi.mock('../services/tracker')
vi.mock('../services/animeApi')
vi.mock('../services/ratings')
vi.mock('../services/favorites')

function trackedRow(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    id: 1,
    anilistId: 21,
    title: 'One Piece',
    imageUrl: null,
    totalEpisodes: 1000,
    episodesWatched: 200,
    status: 'Plan to Watch',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <AppProvider>
      <HomePage navigate={vi.fn()} />
    </AppProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(tracker.getTrackerList).mockResolvedValue([])
  vi.mocked(animeApi.fetchTrending).mockResolvedValue([])
  // TrendingCard fetches its own status/rating/favorite on mount — give
  // every card a benign "signed out"-shaped default so mounting one
  // doesn't throw on an un-mocked promise.
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(null)
  vi.mocked(ratings.getMyRating).mockResolvedValue(null)
  vi.mocked(favorites.isFavorite).mockResolvedValue(false)
})

it('does not show the live sections when there is nothing to show', async () => {
  renderPage()
  await waitFor(() => expect(tracker.getTrackerList).toHaveBeenCalled())
  expect(screen.queryByText('Continue Your Voyage')).not.toBeInTheDocument()
  expect(screen.queryByText('Trending Now')).not.toBeInTheDocument()
})

it('shows Continue Your Voyage when the user has live in-progress series', async () => {
  vi.mocked(tracker.getTrackerList).mockResolvedValue([trackedRow()])

  renderPage()

  await waitFor(() => expect(screen.getByText('Continue Your Voyage')).toBeInTheDocument())
  expect(screen.getByText('One Piece')).toBeInTheDocument()
  expect(screen.getByText('200/1000 eps')).toBeInTheDocument()
})

it('requests only Plan to Watch rows for Continue Your Voyage', async () => {
  renderPage()
  await waitFor(() => expect(tracker.getTrackerList).toHaveBeenCalledWith('Plan to Watch'))
})

it('shows Trending Now when AniList returns live trending results', async () => {
  const result: AnimeSearchResult = { id: '30', title: 'Bar', image: null, releaseDate: null, totalEpisodes: 24 }
  vi.mocked(animeApi.fetchTrending).mockResolvedValue([result])

  renderPage()

  await waitFor(() => expect(screen.getByText('Trending Now')).toBeInTheDocument())
  expect(screen.getByText('Bar')).toBeInTheDocument()
})

it('fetches tracker status, rating and favorite state for each trending card', async () => {
  const result: AnimeSearchResult = { id: '30', title: 'Bar', image: null, releaseDate: null, totalEpisodes: 24 }
  vi.mocked(animeApi.fetchTrending).mockResolvedValue([result])

  renderPage()

  await waitFor(() => expect(screen.getByText('Bar')).toBeInTheDocument())
  await waitFor(() => {
    expect(tracker.getTrackerRow).toHaveBeenCalledWith(30)
    expect(ratings.getMyRating).toHaveBeenCalledWith(30)
    expect(favorites.isFavorite).toHaveBeenCalledWith(30)
  })
})

it('does not break the page when the trending fetch fails', async () => {
  vi.mocked(animeApi.fetchTrending).mockRejectedValue(new Error('AniList down'))

  renderPage()

  // The rest of the (mock) Home page still renders fine.
  await waitFor(() => expect(screen.getByText('Popular This Week')).toBeInTheDocument())
  expect(screen.queryByText('Trending Now')).not.toBeInTheDocument()
})
