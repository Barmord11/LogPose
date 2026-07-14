/**
 * SearchPage — Find Your Way
 * ──────────────────────────
 * Discovery hub: search bar hero → results grid.
 *
 * Typing a query (2+ chars) switches the results grid to a LIVE AniList
 * search (GET /api/anime/search), debounced. With no query, the grid
 * shows AniList's all-time most popular series (GET /api/anime/popular)
 * — real data, not a hardcoded mock catalogue. Every result card opens
 * the same details page (AnimeDetailPage) with source="live", and every
 * card's Favorite / Anchor rating / Watched / Plan to Watch controls
 * are real, Supabase-backed actions.
 *
 * (The genre bento that used to sit here - static local tile art with a
 * live fetchByGenre() query behind each click - was removed: it read as
 * leftover mock content sitting above the live results. The genre
 * endpoint itself (services/animeApi.ts fetchByGenre, api/anime/genre.ts)
 * is untouched in case genre browsing gets a real entry point later.)
 */

import { useEffect, useRef, useState } from 'react'
import type { NavProps } from '../App'
import { recentSearches } from '../data/animes'
import { searchAnime, fetchPopular, type AnimeSearchResult } from '../services/animeApi'
import { AddDropdownView } from '../components/AddDropdown'
import { AnchorRatingView } from '../components/AnchorRating'
import { useDragToAdd, DragDropZones } from '../components/DragToAdd'
import CardSkeleton from '../components/CardSkeleton'
import { getTrackerRow, upsertStatus, removeFromTracker, type TrackerRow, type TrackerStatus } from '../services/tracker'
import { getMyRating, setRating as submitRating, clearRating, type RatingValue } from '../services/ratings'
import { isFavorite as fetchIsFavorite, toggleFavorite } from '../services/favorites'

const MIN_QUERY_LENGTH = 2
// Long enough that a normal typing cadence never fires a request per
// keystroke — the search only goes out once the user actually pauses.
const DEBOUNCE_MS = 500

interface SearchPageProps extends NavProps {
  /** Query handed over from the global (desktop top bar) search */
  initialQuery?: string
}

export default function SearchPage({ navigate, initialQuery = '' }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery)

  const [liveResults, setLiveResults] = useState<AnimeSearchResult[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError,   setLiveError]   = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Real AniList data (replaces the old hardcoded mock catalogue) for
  // the default (no query) browsing view.
  const [popularResults, setPopularResults] = useState<AnimeSearchResult[]>([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [popularError,   setPopularError]   = useState<string | null>(null)

  // Keep in sync when a new global search arrives
  useEffect(() => { setQuery(initialQuery) }, [initialQuery])

  const trimmedQuery = query.trim()
  const isLiveSearch = trimmedQuery.length >= MIN_QUERY_LENGTH

  // Debounced live AniList search. Nothing is sent to the
  // network until the user pauses typing for DEBOUNCE_MS — typing "one
  // piece" fires exactly one request, not one per letter. If a new
  // keystroke arrives before that fires, the pending timer AND any
  // still-in-flight request from the previous keystroke are both
  // cancelled, so a slow stale response can never clobber newer results.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (!isLiveSearch) {
      setLiveResults([])
      setLiveError(null)
      setLiveLoading(false)
      return
    }

    setLiveLoading(true)
    setLiveError(null)

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      searchAnime(trimmedQuery, controller.signal)
        .then(results => {
          setLiveResults(results)
          setLiveLoading(false)
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === 'AbortError') return // superseded — a newer search is already running
          setLiveError(err instanceof Error ? err.message : 'Search failed. Please try again.')
          setLiveResults([])
          setLiveLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [trimmedQuery, isLiveSearch])

  // Real AniList "most popular" browsing data — fetched once on mount,
  // shown whenever there's no active query.
  useEffect(() => {
    let cancelled = false
    fetchPopular()
      .then(results => {
        if (cancelled) return
        setPopularResults(results)
        setPopularLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        console.error('fetchPopular failed', err)
        setPopularError(err instanceof Error ? err.message : 'Failed to load popular anime.')
        setPopularLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const hasActiveFilter = trimmedQuery !== ''

  const scrollToResults = () => {
    // Optional chain on the method itself too, not just the element -
    // jsdom (unit tests) doesn't implement scrollIntoView at all.
    document.getElementById('search-results')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="search-hero" style={{ minHeight: '100vh', paddingBottom: '48px' }}>

      {/* ══ HERO SEARCH ════════════════════════════════════════ */}
      <section
        className="page-enter"
        style={{ padding: '48px 16px 40px', maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}
      >
        <h1
          style={{
            fontFamily: 'var(--font)',
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: 800,
            color: 'var(--primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: '12px',
          }}
        >
          Find Your Way
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--on-surface-variant)', marginBottom: '36px', maxWidth: '480px', margin: '0 auto 36px' }}>
          Charting the course through the vast sea of stories.
        </p>

        {/* Search bar */}
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="search-bar-wrap" style={{ padding: '6px 6px 6px 20px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--outline)', fontSize: '22px', flexShrink: 0 }}>
              search
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') scrollToResults() }}
              placeholder="Search real anime titles on LogPose..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font)',
                fontSize: '16px',
                color: 'var(--on-surface)',
                padding: '10px 12px',
                minWidth: 0,
              }}
            />
            <button
              className="btn-sunset search-bar-wrap__submit"
              onClick={scrollToResults}
            >
              EXPLORE
            </button>
          </div>

          {/* Quick searches */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--outline)', alignSelf: 'center' }}>
              Try:
            </span>
            {recentSearches.map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); scrollToResults() }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font)',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--secondary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--primary)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RESULTS GRID ═══════════════════════════════════════ */}
      <section id="search-results" style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto', scrollMarginTop: '96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 700, color: 'var(--primary)' }}>
            {isLiveSearch ? `Results for "${trimmedQuery}"` : 'Most Popular — Live on LogPose'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasActiveFilter && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--outline)', fontWeight: 600 }}>
                  {isLiveSearch ? liveResults.length : popularResults.length} found
                </span>
                <button
                  onClick={() => setQuery('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font)',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
                  Clear filters
                </button>
              </>
            )}
          </div>
        </div>

        {isLiveSearch ? (
          liveLoading ? (
            // A real .anime-grid of skeleton cards (not a plain
            // centered sentence) so the page's column count/width is
            // already correct on the very first paint - a short line
            // of text doesn't fill a wide desktop grid the way the
            // real results will, so on a slow connection this used to
            // make the page flash a much narrower-looking layout than
            // the one about to render.
            <div className="anime-grid">
              {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : liveError ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--error)' }}>
              <p style={{ fontWeight: 600 }}>{liveError}</p>
            </div>
          ) : liveResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '56px', opacity: 0.25, display: 'block', marginBottom: '12px' }}>
                explore_off
              </span>
              <p style={{ fontWeight: 600 }}>No voyages found for "{trimmedQuery}"</p>
            </div>
          ) : (
            <div className="anime-grid">
              {liveResults.map(result => (
                <LiveSearchCard key={result.id} result={result} navigate={navigate} />
              ))}
            </div>
          )
        ) : popularLoading ? (
          <div className="anime-grid">
            {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : popularError ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--error)' }}>
            <p style={{ fontWeight: 600 }}>{popularError}</p>
          </div>
        ) : popularResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '56px', opacity: 0.25, display: 'block', marginBottom: '12px' }}>
              explore_off
            </span>
            <p style={{ fontWeight: 600 }}>No voyages found</p>
          </div>
        ) : (
          <div className="anime-grid">
            {popularResults.map(result => (
              <LiveSearchCard key={result.id} result={result} navigate={navigate} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/** Small "N episodes" chip drawn on every result card — total series length, not watch progress. */
function EpisodeCountBadge({ count }: { count: number | null }) {
  return (
    <div
      style={{
        position: 'absolute', bottom: '8px', right: '8px', zIndex: 2,
        display: 'flex', alignItems: 'center', gap: '3px',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, color: '#fff',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule</span>
      {count ? `${count} ep` : 'TBA'}
    </div>
  )
}

/* ── Live AniList result card → opens the real details page ──
   Used for both search results and the default "most popular"
   browsing view - all real AniList data. Favorite / Anchor rating /
   Watched / Plan to Watch are all real, Supabase-backed actions,
   fetched once per card on mount. The hover overlay is a vertical
   action rail pinned to the card's top-right corner (Add-to-list on
   top, then Anchor rating, then favorite) rather than a centered
   horizontal row - this keeps the Add-to-list dropdown, which opens
   downward from its trigger, safely inside the card's own
   overflow:hidden bounds instead of getting clipped. On touch devices
   the whole card can also be dragged up/down onto the "Plan to Watch" /
   "Watched" zones instead of tapping the small (+) button — see
   components/DragToAdd.tsx. */
function LiveSearchCard({ result, navigate }: { result: AnimeSearchResult; navigate: NavProps['navigate'] }) {
  const anilistId = Number(result.id)

  const [tracker, setTracker] = useState<TrackerRow | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [rating, setRatingValue] = useState<RatingValue | null>(null)
  const [ratingBusy, setRatingBusy] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Not-signed-in resolves normally (null/false) inside these services -
    // it never reaches .catch(). Anything landing here is a real failure
    // (RLS denial, network error, schema mismatch, etc.) - log it instead
    // of silently pretending the series is untracked/unvoted/unfavorited.
    getTrackerRow(anilistId).then(row => { if (!cancelled) setTracker(row) }).catch(err => console.error('getTrackerRow failed', err))
    getMyRating(anilistId).then(r => { if (!cancelled) setRatingValue(r) }).catch(err => console.error('getMyRating failed', err))
    fetchIsFavorite(anilistId).then(f => { if (!cancelled) setFavorite(f) }).catch(err => console.error('isFavorite failed', err))
    return () => { cancelled = true }
  }, [anilistId])

  async function handleSetStatus(status: TrackerStatus) {
    if (statusBusy) return
    setStatusBusy(true)
    try {
      const row = await upsertStatus({ anilistId, status, title: result.title, imageUrl: result.image, totalEpisodes: result.totalEpisodes ?? 0 })
      setTracker(row)
    } catch (err) {
      console.error('upsertStatus failed', err)
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleRemove() {
    if (statusBusy) return
    setStatusBusy(true)
    try {
      await removeFromTracker(anilistId)
      setTracker(null)
    } catch (err) {
      console.error('removeFromTracker failed', err)
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleSetRating(value: RatingValue) {
    if (ratingBusy) return
    const next = rating === value ? null : value
    setRatingBusy(true)
    try {
      if (next === null) await clearRating(anilistId)
      else await submitRating(anilistId, next)
      setRatingValue(next)
    } catch (err) {
      console.error('setRating/clearRating failed', err)
    } finally {
      setRatingBusy(false)
    }
  }

  async function handleToggleFavorite() {
    if (favoriteBusy) return
    setFavoriteBusy(true)
    try {
      const next = await toggleFavorite(favorite, { anilistId, title: result.title, imageUrl: result.image })
      setFavorite(next)
    } catch (err) {
      console.error('toggleFavorite failed', err)
    } finally {
      setFavoriteBusy(false)
    }
  }

  const { dragging, offsetY, zone, bind } = useDragToAdd({
    onPlan: () => handleSetStatus('Plan to Watch'),
    onWatched: () => handleSetStatus('Watched'),
    onTap: () => navigate('detail', anilistId, 'live'),
  })

  return (
    <>
      <div
        className="search-card"
        {...bind}
        style={dragging ? { transform: `translateY(${offsetY}px)`, transition: 'none', position: 'relative', zIndex: 5 } : undefined}
      >
        <div className="search-card__img-wrap">
          {result.image ? (
            <img src={result.image} alt={result.title} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--surface-container)' }} />
          )}

          {/* Hover/tap action rail — vertical, pinned top-right (see .search-card__overlay) */}
          <div className="search-card__overlay" onClick={e => e.stopPropagation()}>
            <div className="search-card__action-rail">
              <AddDropdownView
                inWatched={tracker?.status === 'Watched'}
                inPlan={tracker?.status === 'Plan to Watch'}
                onAddWatched={() => handleSetStatus('Watched')}
                onAddPlan={() => handleSetStatus('Plan to Watch')}
                onRemove={handleRemove}
                variant="overlay"
                size="sm"
                disabled={statusBusy}
              />
              <AnchorRatingView rating={rating} onSetRating={handleSetRating} size="sm" color="white" direction="column" />
              <button
                className={`heart-btn${favorite ? ' active' : ''}`}
                title={favorite ? 'Unfavorite' : 'Favorite'}
                onClick={handleToggleFavorite}
                disabled={favoriteBusy}
                style={{ color: '#fff', opacity: favoriteBusy ? 0.6 : 1 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}>
                  favorite
                </span>
              </button>
            </div>
          </div>

          <EpisodeCountBadge count={result.totalEpisodes} />
        </div>
        <div className="search-card__body">
          <h3 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
            {result.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {result.totalEpisodes ? `${result.totalEpisodes} episodes` : 'Episodes TBA'}
            </span>
            {result.releaseDate && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>{result.releaseDate}</span>
            )}
          </div>
        </div>
      </div>
      <DragDropZones dragging={dragging} zone={zone} />
    </>
  )
}
