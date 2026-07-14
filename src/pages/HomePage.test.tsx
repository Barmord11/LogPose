import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import HomePage from './HomePage'
import { AppProvider } from '../context/AppContext'
import * as tracker from '../services/tracker'
import * as animeApi from '../services/animeApi'
import * as ratings from '../services/ratings'
import * as favorites from '../services/favorites'
import type { AnimeSearchResult, AnimeInfo } from '../services/animeApi'

vi.mock('../services/tracker')
vi.mock('../services/animeApi')
vi.mock('../services/ratings')
vi.mock('../services/favorites')

function animeInfo(overrides: Partial<AnimeInfo> = {}): AnimeInfo {
  return {
    id: '1',
    title: 'Untitled',
    image: null,
    bannerImage: null,
    genres: [],
    description: null,
    status: null,
    format: null,
    score: null,
    characters: [],
    totalEpisodes: 0,
    episodes: [],
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
  // Real AniList "popular" data now drives the hero + Popular This Week
  // grid (replacing the old mock catalogue) - default to empty so
  // mounting the page doesn't throw on an un-mocked promise.
  vi.mocked(animeApi.fetchPopular).mockResolvedValue([])
  vi.mocked(animeApi.fetchNewReleases).mockResolvedValue([])
  vi.mocked(animeApi.fetchAnimeInfo).mockResolvedValue(animeInfo())
  // TrendingCard/LiveHero fetch their own status/rating/favorite on
  // mount - give every card a benign "signed out"-shaped default so
  // mounting one doesn't throw on an un-mocked promise.
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(null)
  vi.mocked(ratings.getMyRating).mockResolvedValue(null)
  vi.mocked(favorites.isFavorite).mockResolvedValue(false)
  // useLiveStats() fetches these on every render to fold live tracked/
  // favorited series into the Captain's Log tile - default to "nothing
  // live yet" so mounting the page doesn't throw on an un-mocked call.
  vi.mocked(favorites.listFavorites).mockResolvedValue([])
})

it('does not show the live sections when there is nothing to show', async () => {
  renderPage()
  await waitFor(() => expect(tracker.getTrackerList).toHaveBeenCalled())
  expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
  expect(screen.queryByText('Trending Now')).not.toBeInTheDocument()
})

it('shows a Favorites section (replacing Continue Your Voyage) when the user has favorited live series', async () => {
  vi.mocked(favorites.listFavorites).mockResolvedValue([
    { anilistId: 21, title: 'One Piece', imageUrl: null },
  ])

  renderPage()

  await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
  expect(screen.getByText('One Piece')).toBeInTheDocument()
  expect(screen.queryByText('Continue Your Voyage')).not.toBeInTheDocument()
})

it("opens a favorited series' AnikotoTV watch link from its hover play button, without navigating to the detail page", async () => {
  vi.mocked(favorites.listFavorites).mockResolvedValue([
    { anilistId: 21, title: 'One Piece', imageUrl: null },
  ])
  const navigate = vi.fn()

  render(
    <AppProvider>
      <HomePage navigate={navigate} />
    </AppProvider>,
  )

  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  screen.getByTitle('Watch Now').click()

  expect(openSpy).toHaveBeenCalledWith('https://anikototv.to/filter?keyword=One+Piece', '_blank', 'noopener,noreferrer')
  expect(navigate).not.toHaveBeenCalled()
})

it('removes a favorite from the Home Favorites section in place, without navigating to the detail page', async () => {
  vi.mocked(favorites.listFavorites).mockResolvedValue([
    { anilistId: 21, title: 'One Piece', imageUrl: null },
  ])
  vi.mocked(favorites.removeFavorite).mockResolvedValue(undefined)
  const navigate = vi.fn()

  render(
    <AppProvider>
      <HomePage navigate={navigate} />
    </AppProvider>,
  )

  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
  screen.getByTitle('Remove from favorites').click()

  await waitFor(() => expect(favorites.removeFavorite).toHaveBeenCalledWith(21))
  await waitFor(() => expect(screen.queryByText('One Piece')).not.toBeInTheDocument())
  expect(navigate).not.toHaveBeenCalled()
})

it('Favorites starts collapsed (mobile) and the header toggle opens/closes the card grid', async () => {
  vi.mocked(favorites.listFavorites).mockResolvedValue([
    { anilistId: 21, title: 'One Piece', imageUrl: null },
  ])

  renderPage()

  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
  const grid = screen.getByText('One Piece').closest('.favorites-grid')
  expect(grid).not.toHaveClass('is-open')

  fireEvent.click(screen.getByRole('button', { name: /favorites/i }))
  expect(grid).toHaveClass('is-open')

  fireEvent.click(screen.getByRole('button', { name: /favorites/i }))
  expect(grid).not.toHaveClass('is-open')
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

it('renders the hero and Popular This Week grid from real AniList popular data', async () => {
  const popular: AnimeSearchResult[] = [
    { id: '1', title: 'Most Popular Show', image: null, releaseDate: 2024, totalEpisodes: 12 },
    { id: '2', title: 'Second Popular Show', image: null, releaseDate: 2023, totalEpisodes: 24 },
  ]
  vi.mocked(animeApi.fetchPopular).mockResolvedValue(popular)
  vi.mocked(animeApi.fetchAnimeInfo).mockResolvedValue(animeInfo({ id: '1', title: 'Most Popular Show', episodes: [] }))

  renderPage()

  // The #1 popular result's title appears twice — once in the hero (via
  // LiveHero's fetched info) and once as its own card in the grid below.
  await waitFor(() => expect(screen.getAllByText('Most Popular Show').length).toBeGreaterThanOrEqual(2))
  expect(screen.getAllByText('Second Popular Show').length).toBeGreaterThanOrEqual(1)
})

it('shows Newly Released when AniList returns new-release results', async () => {
  const result: AnimeSearchResult = { id: '40', title: 'Fresh Show', image: null, releaseDate: 2026, totalEpisodes: 12 }
  vi.mocked(animeApi.fetchNewReleases).mockResolvedValue([result])

  renderPage()

  await waitFor(() => expect(screen.getByText('Newly Released')).toBeInTheDocument())
  expect(screen.getByText('Fresh Show')).toBeInTheDocument()
})

it('does not break the page when the new-releases fetch fails', async () => {
  vi.mocked(animeApi.fetchNewReleases).mockRejectedValue(new Error('AniList down'))

  renderPage()

  await waitFor(() => expect(screen.getByText('Popular This Week')).toBeInTheDocument())
  expect(screen.queryByText('Newly Released')).not.toBeInTheDocument()
})

it('falls back to a friendly message when the popular fetch fails, without crashing', async () => {
  vi.mocked(animeApi.fetchPopular).mockRejectedValue(new Error('AniList down'))

  renderPage()

  await waitFor(() => expect(screen.getByText('Discover Your Next Voyage')).toBeInTheDocument())
})
