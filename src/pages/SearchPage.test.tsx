import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SearchPage from './SearchPage'
import { AppProvider } from '../context/AppContext'
import * as animeApi from '../services/animeApi'
import * as tracker from '../services/tracker'
import * as ratings from '../services/ratings'
import * as favorites from '../services/favorites'
import type { AnimeSearchResult } from '../services/animeApi'

vi.mock('../services/animeApi')
vi.mock('../services/tracker')
vi.mock('../services/ratings')
vi.mock('../services/favorites')

function renderPage(initialQuery = '') {
  return render(
    <AppProvider>
      <SearchPage navigate={vi.fn()} initialQuery={initialQuery} />
    </AppProvider>,
  )
}

const ONE_PIECE: AnimeSearchResult = { id: '21', title: 'One Piece', image: null, releaseDate: 1999, totalEpisodes: 1000 }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(null)
  vi.mocked(ratings.getMyRating).mockResolvedValue(null)
  vi.mocked(favorites.isFavorite).mockResolvedValue(false)
})

// The search box debounces for 500ms (see DEBOUNCE_MS in SearchPage.tsx)
// before firing the live search — these waitFor calls use a real timeout
// long enough to clear that, rather than faking timers.

it('renders favorite, rating and add-to-list controls on a live search result card', async () => {
  vi.mocked(animeApi.searchAnime).mockResolvedValue([ONE_PIECE])

  renderPage('one piece')

  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument(), { timeout: 2000 })
  await waitFor(() => expect(tracker.getTrackerRow).toHaveBeenCalledWith(21))
  expect(ratings.getMyRating).toHaveBeenCalledWith(21)
  expect(favorites.isFavorite).toHaveBeenCalledWith(21)

  expect(screen.getByTitle('Favorite')).toBeInTheDocument()
  expect(screen.getByTitle('Anchor Up — this voyage sets sail!')).toBeInTheDocument()
  expect(screen.getByTitle('Anchor Down — this ship stays docked.')).toBeInTheDocument()
  expect(screen.getByTitle('Log this voyage')).toBeInTheDocument()
})

it('shows the total episode count badge on a live result, not a watch-progress count', async () => {
  vi.mocked(animeApi.searchAnime).mockResolvedValue([ONE_PIECE])

  renderPage('one piece')

  await waitFor(() => expect(screen.getByText('1000 ep')).toBeInTheDocument(), { timeout: 2000 })
})

it('lets a signed-in user add a live result straight to Plan to Watch from the card', async () => {
  vi.mocked(animeApi.searchAnime).mockResolvedValue([ONE_PIECE])
  vi.mocked(tracker.upsertStatus).mockResolvedValue({
    id: 1, anilistId: 21, title: 'One Piece', imageUrl: null, totalEpisodes: 1000, episodesWatched: 0, status: 'Plan to Watch',
  })

  const { container } = renderPage('one piece')

  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument(), { timeout: 2000 })
  await waitFor(() => expect(tracker.getTrackerRow).toHaveBeenCalled())

  screen.getByTitle('Log this voyage').click()
  const planItem = await screen.findByText('Plan to Watch')
  planItem.closest('button')?.click()

  await waitFor(() => expect(tracker.upsertStatus).toHaveBeenCalledWith(
    expect.objectContaining({ anilistId: 21, status: 'Plan to Watch' }),
  ))
  expect(container).toBeTruthy()
})
