/**
 * HomePage — The Grand Departure
 * ──────────────────────────────
 * Hero banner → Favorites → Popular This Week → Trending Now →
 * Newly Released → Voyage Tools (New Dubs / Captain's Log)
 * All four anime sections (Favorites, Popular, Trending, Newly
 * Released) share the same anime-grid card layout and a frosted
 * "liquid glass" header panel (see .glass-header in index.css).
 * Mobile: 2-col grid. Desktop: 4-5 col grid.
 */

import { useEffect, useState } from 'react'
import type { NavProps } from '../App'
import { useProfileStats } from '../context/AppContext'
import { navigatorLevel } from '../context/reducer'
import { useLiveStats }   from '../hooks/useLiveStats'
import CardSkeleton       from '../components/CardSkeleton'
import { AddDropdownView } from '../components/AddDropdown'
import { AnchorRatingView } from '../components/AnchorRating'
import PlayButton          from '../components/PlayButton'
import { useDragToAdd, DragDropZones } from '../components/DragToAdd'
import { getTrackerRow, upsertStatus, removeFromTracker, type TrackerRow, type TrackerStatus } from '../services/tracker'
import { fetchTrending, fetchPopular, fetchNewReleases, fetchAnimeInfo, type AnimeSearchResult, type AnimeInfo } from '../services/animeApi'
import { getMyRating, setRating as submitRating, clearRating, type RatingValue } from '../services/ratings'
import { isFavorite as fetchIsFavorite, toggleFavorite, listFavorites, removeFavorite, type FavoriteRow } from '../services/favorites'

export default function HomePage({ navigate }: NavProps) {
  // Mock catalogue's local stats + live (Supabase-backed) stats are
  // additive - the Captain's Log tile below should count a series
  // marked Watched from a real Search result exactly like a mock one.
  const mockStats = useProfileStats()
  const liveStats = useLiveStats()
  const stats = {
    totalEpisodes: mockStats.totalEpisodes + liveStats.totalEpisodes,
    seriesWatched: mockStats.seriesWatched + liveStats.seriesWatched,
    level: navigatorLevel(mockStats.seriesWatched + liveStats.seriesWatched),
  }

  // Live (API-backed) sections — additive to the mock-catalogue design
  // below, and best-effort: if either fails or comes back empty, that
  // section just doesn't render rather than breaking the page.
  const [favorites, setFavorites] = useState<FavoriteRow[]>([])
  const [trending, setTrending] = useState<AnimeSearchResult[]>([])
  // Real AniList data (replaces the old hardcoded mock catalogue for the
  // hero + "Popular This Week" grid) — all-time most-popular series, not
  // limited to currently-airing like `trending` above.
  const [popular, setPopular] = useState<AnimeSearchResult[]>([])
  const [popularLoading, setPopularLoading] = useState(true)
  const [newReleases, setNewReleases] = useState<AnimeSearchResult[]>([])

  useEffect(() => {
    let cancelled = false

    listFavorites()
      .then(rows => { if (!cancelled) setFavorites(rows) })
      .catch(() => { /* not signed in yet, or RLS denied - just skip the section */ })

    fetchTrending()
      .then(results => { if (!cancelled) setTrending(results) })
      .catch(err => console.error('fetchTrending failed', err))

    fetchPopular()
      .then(results => { if (!cancelled) { setPopular(results); setPopularLoading(false) } })
      .catch(err => {
        console.error('fetchPopular failed', err)
        if (!cancelled) setPopularLoading(false)
      })

    fetchNewReleases()
      .then(results => { if (!cancelled) setNewReleases(results) })
      .catch(err => console.error('fetchNewReleases failed', err))

    return () => { cancelled = true }
  }, [])

  function handleFavoriteRemoved(anilistId: number) {
    setFavorites(rows => rows.filter(r => r.anilistId !== anilistId))
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '32px' }}>

      {/* ══ HERO (live AniList — all-time most popular #1) ═══════ */}
      <section style={{ position: 'relative', width: '100%', height: '72vh', minHeight: '420px', overflow: 'hidden', background: 'var(--surface-container)' }}>
        {popular[0] ? (
          <LiveHero result={popular[0]} navigate={navigate} />
        ) : popularLoading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '0 16px 40px' }}>
            <div style={{ width: '55%', maxWidth: '480px' }}>
              <div style={{ height: '20px', width: '55%', borderRadius: '9999px', background: 'rgba(255,255,255,0.12)', marginBottom: '16px' }} />
              <div style={{ height: '40px', width: '85%', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', marginBottom: '12px' }} />
              <div style={{ height: '14px', width: '95%', borderRadius: '8px', background: 'rgba(255,255,255,0.10)' }} />
            </div>
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '0 16px 40px' }}>
            <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
              Discover Your Next Voyage
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '20px' }}>
              Couldn't reach AniList right now — try Search instead.
            </p>
            <button onClick={() => navigate('search')} className="btn-sunset" style={{ padding: '13px 24px', fontSize: '14px', borderRadius: '9999px', border: 'none' }}>
              Browse Search
            </button>
          </div>
        )}
      </section>

      {/* ══ FAVORITES (quick access to saved series' watch links) ═
         margin-top is a small positive gap (not the -40px "float over
         the hero" treatment Popular This Week uses below) - Favorites
         sits directly under the hero on every page load whenever it's
         shown, so overlapping it risked the header landing partly
         under the hero's own bottom gradient/content and reading as
         "hidden". Popular This Week only ever overlaps when Favorites
         is empty, i.e. it's always the first thing under the hero in
         that case, same reasoning, just inverted. */}
      {favorites.length > 0 && (
        <section
          style={{
            padding: '0 16px',
            maxWidth: '1280px',
            margin: '24px auto 32px',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <div className="glass-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 700, color: 'var(--primary)' }}>
              Favorites
            </h2>
          </div>
          <div className="anime-grid">
            {favorites.slice(0, 5).map(fav => (
              <FavoriteCard key={fav.anilistId} fav={fav} navigate={navigate} onRemoved={handleFavoriteRemoved} />
            ))}
          </div>
        </section>
      )}

      {/* ══ POPULAR THIS WEEK ═══════════════════════════════════ */}
      <section
        style={{
          padding: '0 16px',
          maxWidth: '1280px',
          margin: `${favorites.length > 0 ? '0' : '-40px'} auto 48px`,
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div className="glass-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: 'var(--primary)' }}>
              Popular This Week
            </h2>
            <div style={{ height: '3px', width: '72px', background: 'linear-gradient(135deg, #fe6a34, #ab3500)', borderRadius: '9999px', marginTop: '6px' }} />
          </div>
          <button
            onClick={() => navigate('search')}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            Explore All <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>

        <div className="anime-grid">
          {popular.length > 0
            ? popular.map(result => <TrendingCard key={`popular-${result.id}`} result={result} navigate={navigate} />)
            : popularLoading
              ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
              : <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>Couldn't load popular anime right now — try again later.</p>}
        </div>
      </section>

      {/* ══ TRENDING NOW (live AniList trending) ═══════════ */}
      {trending.length > 0 && (
        <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 48px' }}>
          <div className="glass-header" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: 'var(--primary)' }}>
              Trending Now
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
              Live from AniList — currently airing, ranked by trending score
            </p>
          </div>
          <div className="anime-grid">
            {trending.slice(0, 10).map(result => (
              <TrendingCard key={result.id} result={result} navigate={navigate} />
            ))}
          </div>
        </section>
      )}

      {/* ══ NEWLY RELEASED (live AniList, most recent start dates) ═
         Same anime-grid + TrendingCard layout as Popular This Week and
         Trending Now above (was previously a 3-tile bento box of promo
         tiles that didn't actually show newly released series at all -
         see the "Voyage Tools" strip below for where those tiles
         landed). */}
      {newReleases.length > 0 && (
        <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 48px' }}>
          <div className="glass-header" style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: 'var(--primary)' }}>
              Newly Released
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
              Live from AniList — newest series to start airing
            </p>
          </div>
          <div className="anime-grid">
            {newReleases.slice(0, 10).map(result => (
              <TrendingCard key={`new-${result.id}`} result={result} navigate={navigate} />
            ))}
          </div>
        </section>
      )}

      {/* ══ VOYAGE TOOLS ════════════════════════════════════════
         The two promo tiles that used to live inside the "Newly
         Released" bento box (that box's actual anime grid is above
         now, wired to real newest-start-date data) - kept here as
         their own compact row so Captain's Log's real level/episode
         stats don't disappear, without forcing the Newly Released
         section itself into a different-looking layout than every
         other category on this page. */}
      <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* New Dubs tile */}
          <div
            style={{
              borderRadius: '24px',
              padding: '24px',
              background: 'var(--tertiary-container)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--tertiary-fixed)', marginBottom: '8px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <div>
              <h4 style={{ fontFamily: 'var(--font)', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>New Dubs</h4>
              <p style={{ fontSize: '12px', color: 'rgba(0,161,170,0.85)', marginBottom: '16px', lineHeight: 1.5 }}>Fresh dubbed voyages dock here regularly.</p>
            </div>
            <button onClick={() => navigate('search')} style={{ background: 'var(--tertiary-fixed)', color: 'var(--tertiary-container)', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
              Browse Now
            </button>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '-16px', bottom: '-16px', fontSize: '110px', color: '#fff', opacity: 0.07, fontVariationSettings: "'FILL' 1" }}>language</span>
          </div>

          {/* Captain's Log tile — live stats from global state */}
          <div
            className="sunset-gradient"
            style={{
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '120px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div>
              <h4 style={{ fontFamily: 'var(--font)', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Captain's Log</h4>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '16px', lineHeight: 1.5 }}>
                {stats.totalEpisodes > 0
                  ? `${stats.totalEpisodes} episodes logged across ${stats.seriesWatched} series. Keep sailing!`
                  : 'Your voyage log is empty — track episodes as you watch.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                Lv {stats.level}<span style={{ fontSize: '11px', opacity: 0.6 }}> navigator</span>
              </span>
              <button
                onClick={() => navigate('mylist')}
                style={{ background: '#fff', color: 'var(--secondary)', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Open My Log
              </button>
            </div>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '-24px', top: '-24px', fontSize: '140px', color: '#fff', opacity: 0.10, fontVariationSettings: "'FILL' 1" }}>military_tech</span>
          </div>
        </div>
      </section>

      {/* Desktop footer */}
      <footer className="desktop-footer" style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', padding: '24px 16px 0' }}>
        <p>© 742 LogPose Navigational Systems. Set Sail into Adventure.</p>
        <div style={{ display: 'flex', gap: '32px' }}>
          <a href="#">Terms of Service</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Contact Support</a>
        </div>
      </footer>
    </div>
  )
}

/* ── Favorites card — square "box" layout (not the 3/4 rectangle used
   everywhere else) built for one purpose: quick access to a saved
   series' watch link. A play button appears over the box on hover
   (always visible on touch, same as .search-card__overlay elsewhere)
   and opens AnikotoTV's search results for the title directly, so
   there's no need to visit the detail page first just to watch. The
   heart in the corner unfavorites in place. Clicking the rest of the
   box still goes to the detail page, same as every other card. ── */
function FavoriteCard({ fav, navigate, onRemoved }: { fav: FavoriteRow; navigate: NavProps['navigate']; onRemoved: (anilistId: number) => void }) {
  const [removing, setRemoving] = useState(false)
  const watchUrl = `https://anikototv.to/filter?${new URLSearchParams({ keyword: fav.title }).toString()}`

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (removing) return
    setRemoving(true)
    try {
      await removeFavorite(fav.anilistId)
      onRemoved(fav.anilistId)
    } catch (err) {
      console.error('removeFavorite failed', err)
      setRemoving(false)
    }
  }

  return (
    <div className="search-card" onClick={() => navigate('detail', fav.anilistId, 'live')}>
      <div className="search-card__img-wrap" style={{ aspectRatio: '1/1' }}>
        {fav.imageUrl ? (
          <img src={fav.imageUrl} alt={fav.title} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--surface-container)' }} />
        )}

        {/* Hover overlay - a single centered play button, unlike the
           top-right action rail used elsewhere, since watching is the
           only action this card exists for. */}
        <div
          className="search-card__overlay"
          style={{ alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.stopPropagation()}
        >
          <PlayButton watchUrl={watchUrl} variant="icon" color="orange" />
        </div>

        <button
          className="heart-btn active"
          title="Remove from favorites"
          onClick={handleRemove}
          disabled={removing}
          style={{
            position: 'absolute', top: '8px', right: '8px', zIndex: 2,
            width: '28px', height: '28px', borderRadius: '9999px',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            color: '#fff', opacity: removing ? 0.5 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
            favorite
          </span>
        </button>
      </div>
      <div className="search-card__body">
        <h3 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fav.title}
        </h3>
      </div>
    </div>
  )
}

/* ── Trending Now card — live AniList trending result. Favorite,
   Anchor rating and Watched/Plan status are real Supabase-backed
   actions, same as LiveSearchCard, fetched once per card on mount. ── */
function TrendingCard({ result, navigate }: { result: AnimeSearchResult; navigate: NavProps['navigate'] }) {
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
      {/* Reuses SearchPage's .search-card classes (not the old bespoke
         .anime-card__* ones) so Home's cards are pixel-identical in size
         to Search's. The hover action rail is vertical, pinned to the
         card's top-right corner (see .search-card__overlay /
         .search-card__action-rail) instead of a centered horizontal
         row, so the Add-to-list dropdown (which opens downward from
         the top item in the rail) always has the rest of the card free
         below it. */}
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

          <div style={{
            position: 'absolute', bottom: '8px', right: '8px', zIndex: 2,
            display: 'flex', alignItems: 'center', gap: '3px',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, color: '#fff',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>schedule</span>
            {result.totalEpisodes ? `${result.totalEpisodes} ep` : 'TBA'}
          </div>
        </div>
        <div className="search-card__body">
          <h3 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
            {result.title}
          </h3>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {result.totalEpisodes ? `${result.totalEpisodes} episodes` : 'Episodes TBA'}
          </span>
        </div>
      </div>
      <DragDropZones dragging={dragging} zone={zone} />
    </>
  )
}

/* ── Live Hero — real AniList series (all-time most popular #1).
   Fetches full details (for synopsis + outbound watch link via Consumet)
   plus the same tracker/rating/favorite state as TrendingCard, so the
   hero's Add/Rate/Favorite controls are fully live. ── */
function LiveHero({ result, navigate }: { result: AnimeSearchResult; navigate: NavProps['navigate'] }) {
  const anilistId = Number(result.id)

  const [info, setInfo] = useState<AnimeInfo | null>(null)
  const [tracker, setTracker] = useState<TrackerRow | null>(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [rating, setRatingValue] = useState<RatingValue | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAnimeInfo(anilistId).then(i => { if (!cancelled) setInfo(i) }).catch(err => console.error('hero fetchAnimeInfo failed', err))
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
    const next = rating === value ? null : value
    try {
      if (next === null) await clearRating(anilistId)
      else await submitRating(anilistId, next)
      setRatingValue(next)
    } catch (err) {
      console.error('setRating/clearRating failed', err)
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

  // "Watch Now" opens episode 1's outbound AnimeKai link (best-effort, via
  // Consumet) — same source LogPose uses everywhere else. LogPose never
  // hosts episodes itself.
  const playEpisode = info?.episodes.find(ep => ep.number === 1 && ep.url) ?? info?.episodes.find(ep => ep.url) ?? null
  const heroImage = info?.bannerImage ?? info?.image ?? result.image

  return (
    <>
      {heroImage && (
        <img
          src={heroImage}
          alt={info?.title ?? result.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,23,54,1) 0%, rgba(0,23,54,0.35) 50%, transparent 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,23,54,0.3), transparent 60%)' }} />

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            borderRadius: '9999px',
            background: 'rgba(254,106,52,0.88)',
            backdropFilter: 'blur(8px)',
            marginBottom: '16px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>trending_up</span>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Most Popular — Live from AniList
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font)',
            fontSize: 'clamp(28px, 5vw, 58px)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: '12px',
            maxWidth: '640px',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}
        >
          {info?.title ?? result.title}
        </h1>

        {info?.description && (
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '480px' }}>
            {info.description.slice(0, 140)}…
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {playEpisode?.url ? (
            <a
              href={playEpisode.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-sunset active-glow"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 24px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.03em', borderRadius: '9999px', textDecoration: 'none', color: '#fff' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              Watch Now
            </a>
          ) : null}
          <button
            onClick={() => navigate('detail', anilistId, 'live')}
            className="btn-glass"
            style={{ padding: '13px 24px', fontSize: '14px', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
            More Info
          </button>
          <AddDropdownView
            inWatched={tracker?.status === 'Watched'}
            inPlan={tracker?.status === 'Plan to Watch'}
            onAddWatched={() => handleSetStatus('Watched')}
            onAddPlan={() => handleSetStatus('Plan to Watch')}
            onRemove={handleRemove}
            variant="overlay"
            size="md"
            disabled={statusBusy}
          />
          <AnchorRatingView rating={rating} onSetRating={handleSetRating} size="md" color="white" />
          <button
            className={`heart-btn${favorite ? ' active' : ''}`}
            title={favorite ? 'Unfavorite' : 'Favorite'}
            onClick={handleToggleFavorite}
            disabled={favoriteBusy}
            style={{ color: '#fff', opacity: favoriteBusy ? 0.6 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}>
              favorite
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
