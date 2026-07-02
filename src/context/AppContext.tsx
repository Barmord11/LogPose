/**
 * AppContext — The Captain's Log
 * ─────────────────────────────
 * Global state management for LogPose.
 * All user interactions (lists, ratings, favorites, episode progress)
 * live here and are persisted to localStorage automatically.
 * Pure state logic lives in ./reducer.ts (unit-tested there).
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import { reducer, DEFAULT_STATE, navigatorLevel, type AppState, type AppAction } from './reducer'

export type { AppState, AppAction }

// ── Context ───────────────────────────────────────────────────
const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

const STORAGE_KEY = 'logpose-v1'

// ── Provider ──────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    reducer,
    DEFAULT_STATE,
    (init) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? { ...init, ...JSON.parse(raw) } : init
      } catch {
        return init
      }
    },
  )

  // Persist on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full — silently skip */
    }
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within <AppProvider>')
  return ctx
}

// ── Per-anime selector hook ────────────────────────────────────
export function useAnimeStatus(id: number) {
  const { state } = useApp()
  return {
    inWatched:   state.watchedList.includes(id),
    inPlan:      state.planToWatchList.includes(id),
    isFavorite:  state.favorites.includes(id),
    rating:      state.ratings[id] ?? null,
    watchedEps:  state.watchedEpisodes[id] ?? [],
  }
}

// ── Global aggregated stats ────────────────────────────────────
export function useProfileStats() {
  const { state } = useApp()
  const totalEpisodes = Object.values(state.watchedEpisodes)
    .reduce((sum, eps) => sum + eps.length, 0)
  const seriesWatched = state.watchedList.length
  return {
    seriesWatched,
    planCount:       state.planToWatchList.length,
    favoritesCount:  state.favorites.length,
    totalEpisodes,
    level:           navigatorLevel(seriesWatched),
  }
}
