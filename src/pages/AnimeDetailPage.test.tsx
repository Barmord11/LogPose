import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AnimeDetailPage from './AnimeDetailPage'
import * as animeApi from '../services/animeApi'
import * as tracker from '../services/tracker'
import * as ratings from '../services/ratings'
import * as favorites from '../services/favorites'
import type { AnimeInfo } from '../services/animeApi'
import type { TrackerRow } from '../services/tracker'

vi.mock('../services/animeApi')
vi.mock('../services/tracker')
vi.mock('../services/ratings')
vi.mock('../services/favorites')

const mockAnime: AnimeInfo = {
  id: '21',
  title: 'One Piece',
  image: null,
  genres: ['Action', 'Adventure'],
  description: 'A pirate goes on an adventure.',
  status: 'Currently Airing',
  format: 'TV',
  score: 8.73,
  characters: [],
  totalEpisodes: 3,
  episodes: [
    { id: 'e1', number: 1, title: 'Romance Dawn', image: null, url: 'https://watch.example/ep1' },
    { id: 'e2', number: 2, title: 'That Little Girl...', image: null, url: null },
  ],
}

function trackedRow(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    id: 1,
    malId: 21,
    title: 'One Piece',
    imageUrl: null,
    totalEpisodes: 3,
    episodesWatched: 2,
    status: 'Plan to Watch',
    ...overrides,
  }
}

async function renderLive() {
  render(<AnimeDetailPage animeId={21} source="live" navigate={vi.fn()} />)
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
}

function openEpisodesTab() {
  fireEvent.click(screen.getByRole('button', { name: /Episodes/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(animeApi.fetchAnimeInfo).mockResolvedValue(mockAnime)
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(null)
  vi.mocked(ratings.getMyRating).mockResolvedValue(null)
  vi.mocked(ratings.getRatingSummary).mockResolvedValue({ upCount: 0, downCount: 0 })
  vi.mocked(favorites.isFavorite).mockResolvedValue(false)
})

it('shows a loading state, then the anime title once fetched', async () => {
  render(<AnimeDetailPage animeId={21} source="live" navigate={vi.fn()} />)
  expect(screen.getByText(/charting this voyage/i)).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('One Piece')).toBeInTheDocument())
})

it('shows the MyAnimeList score as-is (already 0-10, not divided)', async () => {
  await renderLive()
  expect(screen.getByText('★ 8.7')).toBeInTheDocument()
})

it('renders an outbound watch link on the Episodes tab for episodes with a Consumet url', async () => {
  await renderLive()
  openEpisodesTab()

  const watchLink = screen.getByTitle('Watch episode 1 on AnimeKai')
  expect(watchLink.tagName).toBe('A')
  expect(watchLink).toHaveAttribute('href', 'https://watch.example/ep1')
  expect(watchLink).toHaveAttribute('target', '_blank')
  expect(watchLink).toHaveAttribute('rel', expect.stringContaining('noopener'))
})

it('shows a disabled tile (not a dead link) when Consumet has no url for that episode', async () => {
  await renderLive()
  openEpisodesTab()

  const disabledTile = screen.getByTitle('Episode 2 — no watch link available')
  expect(disabledTile.tagName).toBe('BUTTON')
  expect(disabledTile).toBeDisabled()
})

it('shows "no watch link available" for the Play button when Consumet returns no episodes at all', async () => {
  vi.mocked(animeApi.fetchAnimeInfo).mockResolvedValue({ ...mockAnime, episodes: [] })
  await renderLive()
  expect(screen.getByText('No watch link available')).toBeInTheDocument()
})

it('only offers Watched and Plan to Watch - there is no Watching status', async () => {
  await renderLive()
  expect(screen.getByRole('button', { name: 'Watched' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Plan to Watch' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Watching$/ })).not.toBeInTheDocument()
})

it('prompts to add the series before the progress counter is usable', async () => {
  await renderLive()
  expect(screen.getByText(/add this series to your list/i)).toBeInTheDocument()
})

it('increments episodes_watched through the backend once tracked', async () => {
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(trackedRow({ episodesWatched: 2 }))
  vi.mocked(tracker.updateProgress).mockResolvedValue(trackedRow({ episodesWatched: 3, status: 'Watched' }))

  await renderLive()
  fireEvent.click(screen.getByRole('button', { name: /increment episodes watched/i }))

  await waitFor(() => expect(tracker.updateProgress).toHaveBeenCalledWith(21, 3))
  await waitFor(() => expect(screen.getByRole('button', { name: /increment episodes watched/i })).toBeDisabled())
})

it('never lets the counter request go above totalEpisodes', async () => {
  vi.mocked(tracker.getTrackerRow).mockResolvedValue(trackedRow({ episodesWatched: 3, status: 'Watched' }))

  await renderLive()
  expect(screen.getByRole('button', { name: /increment episodes watched/i })).toBeDisabled()
  expect(tracker.updateProgress).not.toHaveBeenCalled()
})

it('shows "no ratings yet" and lets a signed-in user cast an Anchor Up vote', async () => {
  vi.mocked(ratings.setRating).mockResolvedValue(undefined)
  vi.mocked(ratings.getRatingSummary)
    .mockResolvedValueOnce({ upCount: 0, downCount: 0 })
    .mockResolvedValueOnce({ upCount: 1, downCount: 0 })

  await renderLive()
  expect(screen.getByText(/no ratings yet/i)).toBeInTheDocument()

  fireEvent.click(screen.getByTitle(/anchor up/i))

  await waitFor(() => expect(ratings.setRating).toHaveBeenCalledWith(21, 'up'))
  await waitFor(() => expect(screen.getByText(/100% positive · 1 vote/i)).toBeInTheDocument())
})

it('clicking the same rating again clears the vote', async () => {
  vi.mocked(ratings.getMyRating).mockResolvedValue('up')
  vi.mocked(ratings.clearRating).mockResolvedValue(undefined)
  vi.mocked(ratings.getRatingSummary)
    .mockResolvedValueOnce({ upCount: 1, downCount: 0 })
    .mockResolvedValueOnce({ upCount: 0, downCount: 0 })

  await renderLive()
  await waitFor(() => expect(screen.getByText(/100% positive · 1 vote/i)).toBeInTheDocument())

  fireEvent.click(screen.getByTitle(/anchor up/i))

  await waitFor(() => expect(ratings.clearRating).toHaveBeenCalledWith(21))
  await waitFor(() => expect(screen.getByText(/no ratings yet/i)).toBeInTheDocument())
})

it('lets a signed-in user favorite and unfavorite a live series', async () => {
  vi.mocked(favorites.toggleFavorite).mockResolvedValueOnce(true).mockResolvedValueOnce(false)

  await renderLive()
  const heartBtn = screen.getByTitle('Favorite')

  fireEvent.click(heartBtn)
  await waitFor(() =>
    expect(favorites.toggleFavorite).toHaveBeenCalledWith(false, { malId: 21, title: 'One Piece', imageUrl: null }),
  )
  await waitFor(() => expect(screen.getByTitle('Unfavorite')).toBeInTheDocument())

  fireEvent.click(screen.getByTitle('Unfavorite'))
  await waitFor(() =>
    expect(favorites.toggleFavorite).toHaveBeenLastCalledWith(true, { malId: 21, title: 'One Piece', imageUrl: null }),
  )
  await waitFor(() => expect(screen.getByTitle('Favorite')).toBeInTheDocument())
})
