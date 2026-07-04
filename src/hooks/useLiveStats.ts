import { useEffect, useState } from 'react'
import { getTrackerList } from '../services/tracker'
import { listFavorites } from '../services/favorites'

export interface LiveStats {
  /** Sum of episodes_watched across every live (AniList-backed) tracked series. */
  totalEpisodes: number
  /** Count of live tracked series with status 'Watched'. */
  seriesWatched: number
  /** Count of live tracked series with status 'Plan to Watch'. */
  planCount: number
  /** Count of live favorited series. */
  favoritesCount: number
  loading: boolean
}

const EMPTY: LiveStats = { totalEpisodes: 0, seriesWatched: 0, planCount: 0, favoritesCount: 0, loading: true }

/**
 * Aggregates the signed-in user's live (Supabase-backed) tracking data,
 * additive to the mock catalogue's local useProfileStats() (see
 * context/AppContext.tsx). Without this, Home's "Captain's Log" tile
 * and the Profile page's stat cards only ever reflected the demo
 * catalogue — a series added to Watched from a real Search result
 * never moved those numbers at all, even though it's tracked correctly
 * in the database.
 *
 * Best-effort: not being signed in, or an RLS/network failure, just
 * leaves these at zero rather than breaking the page that renders them.
 */
export function useLiveStats(): LiveStats {
  const [stats, setStats] = useState<LiveStats>(EMPTY)

  useEffect(() => {
    let cancelled = false

    Promise.all([getTrackerList(), listFavorites()])
      .then(([rows, favs]) => {
        if (cancelled) return
        const totalEpisodes = rows.reduce((sum, row) => sum + row.episodesWatched, 0)
        const seriesWatched = rows.filter(row => row.status === 'Watched').length
        const planCount = rows.filter(row => row.status === 'Plan to Watch').length
        setStats({ totalEpisodes, seriesWatched, planCount, favoritesCount: favs.length, loading: false })
      })
      .catch(() => {
        if (!cancelled) setStats({ ...EMPTY, loading: false })
      })

    return () => { cancelled = true }
  }, [])

  return stats
}
