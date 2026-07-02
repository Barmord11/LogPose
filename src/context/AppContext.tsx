/**
 * AppContext — The Captain's Log
 * ─────────────────────────────
 * Global state management for LogPose.
 * All user interactions (lists, ratings, favorites, episode progress)
 * live here and are persisted to localStorage automatically.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'

// ── State Shape ──────────────────────────────────────────────
export interface AppState {
  /** Anime IDs the user has marked as "Watched" */
  watchedList: number[]
  /** Anime IDs the user intends to watch */
  planToWatchList: number[]
  /** Anime IDs the user has favorited (Heart) */
  favorites: number[]
  /** Per-anime Anchor Up / Down rating */
  ratings: Record<number, 'up' | 'down' | null>
  /** Per-anime list of watched episode numbers, e.g. { 1: [1,2,3] } */
  watchedEpisodes: Record<number, number[]>
}

// ── Actions ──────────────────────────────────────────────────
export type AppAction =
  | { type: 'ADD_TO_WATCHED';      id: number }
  | { type: 'ADD_TO_PLAN';         id: number }
  | { type: 'REMOVE_FROM_LIST';    id: number }
  | { type: 'TOGGLE_FAVORITE';     id: number }
  | { type: 'SET_RATING';          id: number; rating: 'up' | 'down' }
  | { type: 'TOGGLE_EPISODE';      animeId: number; episode: number }
  | { type: 'MARK_ALL_EPISODES';   animeId: number; total: number }
  | { type: 'CLEAR_ALL_EPISODES';  animeId: number }

// ── Default State ─────────────────────────────────────────────
export const DEFAULT_STATE: AppState = {
  watchedList:      [],
  planToWatchList:  [],
  favorites:        [],
  ratings:          {},
  watchedEpisodes:  {},
}

// ── Reducer ───────────────────────────────────────────────────
export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'ADD_TO_WATCHED':
      return {
        ...state,
        watchedList: state.watchedList.includes(action.id)
          ? state.watchedList
          : [...state.watchedList, action.id],
        planToWatchList: state.planToWatchList.filter(id => id !== action.id),
      }

    case 'ADD_TO_PLAN':
      return {
        ...state,
        planToWatchList: state.planToWatchList.includes(action.id)
          ? state.planToWatchList
          : [...state.planToWatchList, action.id],
        watchedList: state.watchedList.filter(id => id !== action.id),
      }

    case 'REMOVE_FROM_LIST':
      return {
        ...state,
        watchedList:     state.watchedList.filter(id => id !== action.id),
        planToWatchList: state.planToWatchList.filter(id => id !== action.id),
      }

    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.includes(action.id)
          ? state.favorites.filter(id => id !== action.id)
          : [...state.favorites, action.id],
      }

    case 'SET_RATING': {
      const current = state.ratings[action.id]
      // Clicking the same direction toggles it off
      const next = current === action.rating ? null : action.rating
      return {
        ...state,
        ratings: { ...state.ratings, [action.id]: next },
      }
    }

    case 'TOGGLE_EPISODE': {
      const current = state.watchedEpisodes[action.animeId] ?? []
      const has = current.includes(action.episode)
      return {
        ...state,
        watchedEpisodes: {
          ...state.watchedEpisodes,
          [action.animeId]: has
            ? current.filter(ep => ep !== action.episode)
            : [...current, action.episode].sort((a, b) => a - b),
        },
      }
    }

    case 'MARK_ALL_EPISODES': {
      const all = Array.from({ length: action.total }, (_, i) => i + 1)
      return {
        ...state,
        watchedEpisodes: { ...state.watchedEpisodes, [action.animeId]: all },
      }
    }

    case 'CLEAR_ALL_EPISODES':
      return {
        ...state,
        watchedEpisodes: { ...state.watchedEpisodes, [action.animeId]: [] },
      }

    default:
      return state
  }
}

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
    /** Navigator level: +1 every 3 series watched */
    level:           Math.max(1, Math.floor(seriesWatched / 3) + 1),
  }
}
