import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import MyListPage from './MyListPage'
import { AppProvider } from '../context/AppContext'
import * as tracker from '../services/tracker'
import * as favorites from '../services/favorites'
import type { TrackerRow } from '../services/tracker'
import type { FavoriteRow } from '../services/favorites'

vi.mock('../services/tracker')
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
      <MyListPage navigate={vi.fn()} />
    </AppProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(tracker.getTrackerList).mockResolvedValue([])
  vi.mocked(favorites.listFavorites).mockResolvedValue([])
})

it('shows the mock-catalogue empty state when nothing is tracked live or locally', async () => {
  renderPage()
  await waitFor(() => expect(screen.getByText(/no voyages completed yet/i)).toBeInTheDocument())
})

it('shows a live tracked series alongside the mock catalogue', async () => {
  vi.mocked(tracker.getTrackerList).mockResolvedValue([trackedRow({ status: 'Plan to Watch' })])

  renderPage()
  fireEvent.click(screen.getByRole('button', { name: /plan to watch/i }))

  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
  expect(screen.getByText('200/1000 eps')).toBeInTheDocument()
})

it('removes a live series from the list via the remove button', async () => {
  vi.mocked(tracker.getTrackerList).mockResolvedValue([trackedRow({ status: 'Plan to Watch' })])
  vi.mocked(tracker.removeFromTracker).mockResolvedValue(undefined)

  renderPage()
  fireEvent.click(screen.getByRole('button', { name: /plan to watch/i }))
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  fireEvent.click(screen.getByTitle('Remove from list'))

  await waitFor(() => expect(tracker.removeFromTracker).toHaveBeenCalledWith(21))
  await waitFor(() => expect(screen.queryByText('One Piece')).not.toBeInTheDocument())
})

it('shows live favorites in the Favorites panel', async () => {
  const fav: FavoriteRow = { anilistId: 42, title: 'Naruto', imageUrl: null }
  vi.mocked(favorites.listFavorites).mockResolvedValue([fav])

  renderPage()
  await waitFor(() => expect(screen.getByText('Naruto')).toBeInTheDocument())
})

it('Favorites panel starts collapsed and the header toggle opens/closes it', async () => {
  const fav: FavoriteRow = { anilistId: 42, title: 'Naruto', imageUrl: null }
  vi.mocked(favorites.listFavorites).mockResolvedValue([fav])

  renderPage()
  await waitFor(() => expect(screen.getByText('Naruto')).toBeInTheDocument())
  const body = screen.getByText('Naruto').closest('.mylist-favorites-body')
  expect(body).not.toHaveClass('is-open')

  fireEvent.click(screen.getByRole('button', { name: /favorites/i }))
  expect(body).toHaveClass('is-open')

  fireEvent.click(screen.getByRole('button', { name: /favorites/i }))
  expect(body).not.toHaveClass('is-open')
})
