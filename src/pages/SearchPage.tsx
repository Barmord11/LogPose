/**
 * SearchPage — Find Your Way
 * ──────────────────────────
 * Discovery hub: search bar hero → genre bento → filter chips → anime grid.
 *
 * Typing a query (2+ chars) switches the results grid to a LIVE AniList
 * search (GET /api/anime/search), debounced. Clicking a
 * live result opens the same details page as everything else
 * (AnimeDetailPage), just with source="live" so it fetches the real
 * AniList id instead of reading the mock catalogue.
 *
 * With an empty query, the page falls back to the original mock
 * catalogue browsing experience (genre bento + filter chips) — that
 * catalogue isn't wired to live data yet (see README "Known follow-ups").
 */

import { useEffect, useRef, useState } from 'react'
import type { NavProps } from '../App'
import { useApp } from '../context/AppContext'
import { animes, genres, filterChips, recentSearches, type Genre } from '../data/animes'
import { searchAnime, type AnimeSearchResult } from '../services/animeApi'
import AddDropdown, { AddDropdownView } from '../components/AddDropdown'
import AnchorRating, { AnchorRatingView } from '../components/AnchorRating'
import PlayButton   from '../components/PlayButton'
import StatusBadge  from '../components/StatusBadge'
import { useDragToAdd, DragDropZones } from '../components/DragToAdd'
import { getTrackerRow, upsertStatus, removeFromTracker, type TrackerRow, type TrackerStatus } from '../services/tracker'
import { getMyRating, setRating as submitRating, clearRating, type RatingValue } from '../services/ratings'
import { isFavorite as fetchIsFavorite, toggleFavorite } from '../services/favorites'

// ── Genre card badge colour map ──────────────────────────────
const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  orange: { bg: 'rgba(254,106,52,0.88)', color: '#fff' },
  navy:   { bg: 'rgba(0,43,91,0.88)',    color: '#a9c7ff' },
  cyan:   { bg: 'rgba(102,247,255,0.85)',color: '#002021' },
  light:  { bg: 'rgba(255,255,255,0.90)',color: 'var(--primary)' },
}

// ── Overlay tints per genre ──────────────────────────────────
const GENRE_OVERLAYS: Record<string, string> = {
  shonen:     'linear-gradient(135deg, rgba(0,23,54,0.6) 0%, rgba(64,95,145,0.55) 100%)',
  seinen:     'rgba(0,23,54,0.80)',
  isekai:     'rgba(0,49,52,0.65)',
  'slice-life':'rgba(247,249,251,0.35)',
  mystery:    'rgba(25,28,30,0.78)',
  fantasy:    'rgba(171,53,0,0.65)',
}

const MIN_QUERY_LENGTH = 2
// Long enough that a normal typing cadence never fires a request per
// keystroke — the search only goes out once the user actually pauses.
const DEBOUNCE_MS = 500

interface SearchPageProps extends NavProps {
  /** Query handed over from the global (desktop top bar) search */
  initialQuery?: string
}

export default function SearchPage({ navigate, initialQuery = '' }: SearchPageProps) {
  const [query,       setQuery]       = useState(initialQuery)
  const [activeChip,  setActiveChip]  = useState<string | null>(null)
  const [activeGenre, setActiveGenre] = useState<Genre | null>(null)

  const [liveResults, setLiveResults] = useState<AnimeSearchResult[]>([])
  const [liveLoading, setLiveLoading] = useState(false)
  const [liveError,   setLiveError]   = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  const chip = filterChips.find(c => c.label === activeChip)

  // Mock-catalogue browsing (only used while the query is empty)
  const filteredMock = animes.filter(a => {
    const matchesChip  = !chip || chip.test(a)
    const matchesGenre = !activeGenre || a.genres.some(g => activeGenre.matchTags.includes(g))
    return matchesChip && matchesGenre
  })

  const hasActiveFilter = trimmedQuery !== '' || activeChip !== null || activeGenre !== null

  const scrollToResults = () => {
    document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickGenre = (genre: Genre) => {
    setActiveGenre(current => (current?.id === genre.id ? null : genre))
    scrollToResults()
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
              placeholder="Search real anime titles (live AniList search)..."
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

      {/* ══ POPULAR GENRES BENTO (mock catalogue, empty query only) ══ */}
      {!isLiveSearch && (
        <>
          <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontVariationSettings: "'FILL' 1", fontSize: '26px' }}>dashboard</span>
                Popular Genres
              </h2>
              <div style={{ height: '3px', width: '64px', background: 'linear-gradient(135deg, #fe6a34, #ab3500)', borderRadius: '9999px' }} />
            </div>

            {/* Bento grid: 2-col mobile, 4-col on desktop */}
            <div className="genre-grid-bento">
              {genres.map(genre => {
                const bs = BADGE_STYLES[genre.badgeVariant]
                const overlay = GENRE_OVERLAYS[genre.id] ?? 'rgba(0,23,54,0.6)'
                // Isekai and Slice of Life are wide
                const isWide  = genre.id === 'isekai' || genre.id === 'slice-life'
                const isActive = activeGenre?.id === genre.id
                return (
                  <div
                    key={genre.id}
                    className="genre-card"
                    onClick={() => pickGenre(genre)}
                    role="button"
                    aria-pressed={isActive}
                    style={{
                      gridColumn: isWide ? 'span 2' : 'span 1',
                      outline: isActive ? '3px solid var(--secondary-container)' : 'none',
                      outlineOffset: '2px',
                    }}
                  >
                    <div
                      className="genre-card__bg"
                      style={{ backgroundImage: `url(${genre.image})` }}
                    />
                    {/* Colour overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: overlay, zIndex: 1 }} />
                    {/* Content */}
                    <div className="genre-card__content">
                      <span
                        style={{
                          ...bs,
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.14em',
                          alignSelf: 'flex-start',
                          marginBottom: '10px',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {isActive ? '✓ FILTERING' : genre.badge}
                      </span>
                      <h3
                        style={{
                          fontFamily: 'var(--font)',
                          fontSize: isWide ? '28px' : '20px',
                          fontWeight: 800,
                          color: '#fff',
                          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        }}
                      >
                        {genre.label}
                      </h3>
                      {isWide && (
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginTop: '6px', lineHeight: 1.4 }}>
                          {genre.description}
                        </p>
                      )}
                      <div
                        className="genre-card__underline"
                        style={{ background: genre.badgeVariant === 'light' ? 'var(--primary)' : '#fff' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ══ FILTER CHIPS — "Narrow Your Compass" ════════════════ */}
          <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 48px' }}>
            <h2
              className="section-header--border"
              style={{ marginBottom: '20px', fontSize: '18px' }}
            >
              Narrow Your Compass
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {filterChips.map(c => (
                <button
                  key={c.label}
                  className={`filter-chip${activeChip === c.label ? ' active' : ''}`}
                  onClick={() => setActiveChip(activeChip === c.label ? null : c.label)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ══ RESULTS GRID ═══════════════════════════════════════ */}
      <section id="search-results" style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto', scrollMarginTop: '96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 700, color: 'var(--primary)' }}>
            {isLiveSearch
              ? `Results for "${trimmedQuery}"`
              : activeGenre
                ? `${activeGenre.label} Voyages`
                : activeChip ?? 'Trending This Season'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {hasActiveFilter && (
              <>
                <span style={{ fontSize: '13px', color: 'var(--outline)', fontWeight: 600 }}>
                  {isLiveSearch ? liveResults.length : filteredMock.length} found
                </span>
                <button
                  onClick={() => { setQuery(''); setActiveChip(null); setActiveGenre(null) }}
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
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--on-surface-variant)' }}>
              <p style={{ fontWeight: 600 }}>Searching the Grand Line…</p>
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
        ) : filteredMock.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '56px', opacity: 0.25, display: 'block', marginBottom: '12px' }}>
              explore_off
            </span>
            <p style={{ fontWeight: 600 }}>No voyages found</p>
          </div>
        ) : (
          <div className="anime-grid">
            {filteredMock.map(anime => (
              <SearchCard key={anime.id} anime={anime} navigate={navigate} />
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
   Favorite / Anchor rating / Watched / Plan to Watch are all real,
   Supabase-backed actions (same services LiveDetail uses), fetched
   once per card on mount. On touch devices the whole card can also be
   dragged up/down onto the "Plan to Watch" / "Watched" zones instead
   of tapping the small (+) button — see components/DragToAdd.tsx. */
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

          {/* Hover/tap action overlay */}
          <div className="search-card__overlay" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AnchorRatingView rating={rating} onSetRating={handleSetRating} size="sm" color="white" />
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

/* ── Mock catalogue card ── */
function SearchCard({ anime, navigate }: { anime: typeof animes[0]; navigate: NavProps['navigate'] }) {
  const { dispatch } = useApp()

  const { dragging, offsetY, zone, bind } = useDragToAdd({
    onPlan: () => dispatch({ type: 'ADD_TO_PLAN', id: anime.id }),
    onWatched: () => dispatch({ type: 'ADD_TO_WATCHED', id: anime.id }),
    onTap: () => navigate('detail', anime.id),
  })

  return (
    <>
      <div
        className="search-card"
        {...bind}
        style={dragging ? { transform: `translateY(${offsetY}px)`, transition: 'none', position: 'relative', zIndex: 5 } : undefined}
      >
        <div className="search-card__img-wrap">
          <img src={anime.cover} alt={anime.title} />

          {/* Hover action overlay */}
          <div className="search-card__overlay" onClick={e => e.stopPropagation()}>
            {/* Play button — centred large */}
            <PlayButton watchUrl={anime.watchUrl} variant="icon" />

            {/* Bottom row: AnchorRating + AddDropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AnchorRating animeId={anime.id} size="sm" color="white" />
              <AddDropdown  animeId={anime.id} variant="overlay" size="sm" />
            </div>
          </div>

          <StatusBadge status={anime.status} />
          <EpisodeCountBadge count={anime.episodes} />
        </div>

        <div className="search-card__body">
          <h3 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
            {anime.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.