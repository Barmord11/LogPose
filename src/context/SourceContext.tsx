/**
 * SourceContext — Watch-link source preference
 * ───────────────────────────────────────────
 * Tracks which external streaming site the app's "Watch Now" / play
 * buttons should send the user to (AniKoto by default), persists the
 * choice to localStorage, and exposes buildWatchUrl(title) so callers
 * don't need to know the current source's domain at all.
 *
 * Every source listed here shares the same `/filter?keyword=<title>`
 * search-by-title URL shape (that's how AniKoto already worked, and
 * how AniChi works too), so adding a new source is just adding one
 * entry to WATCH_SOURCES - no per-source URL logic needed.
 *
 * Unlike ThemeContext, useSource() deliberately does NOT throw when
 * used outside a <SourceProvider> - it falls back to the default
 * source instead. AnimeDetailPage and HomePage (which build the real
 * watch links) are both rendered directly in their test files without
 * any provider wrapper, and their tests already assert against the
 * literal default AniKoto URL - a throwing context would break those
 * tests for no real benefit, since the actual app is always wrapped
 * in main.tsx anyway.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface WatchSource {
  id: string
  name: string
  /** Host that serves this site's title-search filter page. */
  domain: string
}

export const WATCH_SOURCES: WatchSource[] = [
  { id: 'anikoto', name: 'AniKoto', domain: 'anikototv.to' },
  { id: 'anichi',  name: 'AniChi',  domain: 'anichi.to' },
]

const DEFAULT_SOURCE = WATCH_SOURCES[0]
const STORAGE_KEY = 'logpose-watch-source'

function buildUrlForSource(source: WatchSource, title: string): string {
  return `https://${source.domain}/filter?${new URLSearchParams({ keyword: title }).toString()}`
}

interface SourceContextValue {
  sourceId: string
  source: WatchSource
  setSourceId: (id: string) => void
  buildWatchUrl: (title: string) => string
}

const SourceContext = createContext<SourceContextValue | null>(null)

/** Reads a previously saved choice; falls back to AniKoto if nothing's
 *  saved, or the saved id no longer matches a known source. */
function getInitialSourceId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && WATCH_SOURCES.some(s => s.id === saved)) return saved
  } catch {
    /* localStorage unavailable — fall through */
  }
  return DEFAULT_SOURCE.id
}

export function SourceProvider({ children }: { children: ReactNode }) {
  const [sourceId, setSourceIdState] = useState<string>(getInitialSourceId)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sourceId)
    } catch {
      /* storage full/unavailable — choice still works for this session */
    }
  }, [sourceId])

  function setSourceId(id: string) {
    if (WATCH_SOURCES.some(s => s.id === id)) setSourceIdState(id)
  }

  const source = WATCH_SOURCES.find(s => s.id === sourceId) ?? DEFAULT_SOURCE

  const value: SourceContextValue = {
    sourceId,
    source,
    setSourceId,
    buildWatchUrl: title => buildUrlForSource(source, title),
  }

  return <SourceContext.Provider value={value}>{children}</SourceContext.Provider>
}

const FALLBACK_VALUE: SourceContextValue = {
  sourceId: DEFAULT_SOURCE.id,
  source: DEFAULT_SOURCE,
  setSourceId: () => {},
  buildWatchUrl: title => buildUrlForSource(DEFAULT_SOURCE, title),
}

export function useSource(): SourceContextValue {
  const ctx = useContext(SourceContext)
  return ctx ?? FALLBACK_VALUE
}
