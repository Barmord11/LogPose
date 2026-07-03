import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SeriesPage from './SeriesPage'
import * as animeApi from '../services/animeApi'
import * as tracker from '../services/tracker'
import type { AnimeInfo } from '../services/animeApi'
import type { TrackerRow } from '../services/tracker'

vi.mock('../services/animeApi')
vi.mock('../services/tracker')

const mockAnime: AnimeInfo = {
  id: '21',
  title: 'One Piece',
  image: null,
  totalEpisodes: 3,
  episodes: [
    { id: 'e1', number: 1, title: 'Romance Dawn', image: null, url: 'https://watch.example/ep1' },
    { id: 'e2', number: 2, title: 'That Little Girl...', image: null, url: null },
  ],
}

function trackedRow(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    id: 1,
    anilistId: 21,
    title: 'One Piece',
    imageUrl: null,
    totalEpisodes: 3,
    episodesWatched: 2,
    status: 'Plan to Watch',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(animeApi.fetchAnimeInfo).mockResolvedValue(mockAnime)
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(null)
})

it('shows a loading state, then the anime title once fetched', async () => {
  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  expect(screen.getByText(/charting this voyage/i)).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
})

it('renders an outbound watch link for episodes with a Consumet url (never embedded video)', async () => {
  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  const watchLinks = screen.getAllByRole('link', { name: 'Watch' })
  expect(watchLinks).toHaveLength(1)
  expect(watchLinks[0]).toHaveAttribute('href', 'https://watch.example/ep1')
  expect(watchLinks[0]).toHaveAttribute('target', '_blank')
  expect(watchLinks[0]).toHaveAttribute('rel', expect.stringContaining('noopener'))
})

it('shows a disabled Watch button (not a dead link) when Consumet has no url for that episode', async () => {
  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  // Exact name 'Watch' - avoids matching the 'Watched' status button.
  expect(screen.getAllByRole('link', { name: 'Watch' })).toHaveLength(1)
  const disabledButtons = screen.getAllByRole('button', { name: 'Watch' })
  expect(disabledButtons).toHaveLength(1)
  expect(disabledButtons[0]).toBeDisabled()
})

it('only offers Watched and Plan to Watch - there is no Watching status', async () => {
  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  expect(screen.getByRole('button', { name: 'Watched' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Plan to Watch' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Watching$/ })).not.toBeInTheDocument()
})

it('prompts to add the series before the progress counter is usable', async () => {
  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
  expect(screen.getByText(/add this series to your list/i)).toBeInTheDocument()
})

it('increments episodes_watched through the backend once tracked', async () => {
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(trackedRow({ episodesWatched: 2 }))
  vi.mocked(tracker.updateProgress).mockResolvedValue(trackedRow({ episodesWatched: 3, status: 'Watched' }))

  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /increment episodes watched/i }))

  await waitFor(() => expect(tracker.updateProgress).toHaveBeenCalledWith(21, 3))
  // Once the backend confirms 3/3, the + button disables (isolated to this page).
  await waitFor(() => expect(screen.getByRole('button', { name: /increment episodes watched/i })).toBeDisabled())
})

it('never lets the counter request go above totalEpisodes', async () => {
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(trackedRow({ episodesWatched: 3, status: 'Watched' }))

  render(<SeriesPage anilistId={21} navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())

  // Already at 3/3 - the increment button must be disabled, so clicking
  // it (if it somehow fired) should never call updateProgress(21, 4).
  expect(screen.getByRole('button', { name: /increment episodes watched/i })).toBeDisabled()
  expect(tracker.updateProgress).not.toHaveBeenCalled()
})
