/**
 * MyListPage — The Captain's Log
 * ───────────────────────────────
 * Main column: "Watched" | "Plan to Watch" tabs with progress cards.
 * Right side: Favorites panel — hearts live apart from the watch lists.
 * Each card: cover image (→ detail), title, progress bar, action bar
 */

import { useEffect, useState } from 'react'
import type { NavProps } from '../App'
import { animes }        from '../data/animes'
import { useApp, useAnimeStatus } from '../context/AppContext'
import { getTrackerList, removeFromTracker, type TrackerRow, type TrackerStatus } from '../services/tracker'
import { listFavorites, removeFavorite, type FavoriteRow } from '../services/favorites'
import AnchorRating from '../components/AnchorRating'
import AddDropdown  from '../components/AddDropdown'
import PlayButton   from '../components/PlayButton'
import StatusBadge  from '../components/StatusBadge'

type ListTab = 'watched' | 'plan'

/** Maps a My List tab to the matching anime_tracker status. */
const TAB_STATUS: Record<ListTab, TrackerStatus> = {
  watched: 'Watched',
  plan: 'Plan to Watch',
}

export default function MyListPage({ navigate }: NavProps) {
  const { state } = useApp()
  const [activeTab, setActiveTab] = useState<ListTab>('watched')

  // Live (API-backed) series added from Search — kept separate from the
  // mock catalogue's local reducer, and merged in at render time so both
  // sources show up side by side until the mock catalogue is retired.
  const [liveRows, setLiveRows] = useState<TrackerRow[]>([])

  useEffect(() => {
    let cancelled = false
    getTrackerList()
      .then(rows => { if (!cancelled) setLiveRows(rows) })
      .catch(() => { /* not signed in yet, or RLS denied — just show the mock list */ })
    return () => { cancelled = true }
  }, [])

  function handleLiveRemoved(anilistId: number) {
    setLiveRows(rows => rows.filter(r => r.anilistId !== anilistId))
  }

  const ids = activeTab === 'watched' ? state.watchedList : state.planToWatchList
  const mockList = animes.filter(a => ids.includes(a.id))
  const liveList = liveRows.filter(r => r.status === TAB_STATUS[activeTab])

  const liveWatchedCount = liveRows.filter(r => r.status === 'Watched').length
  const livePlanCount = liveRows.filter(r => r.status === 'Plan to Watch').length

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px' }}>

      {/* ══ TITLE / TOGGLE / FAVORITES / MAIN LIST ══════════════
          A single grid whose areas are reordered per breakpoint (see
          .mylist-grid in responsive.css): mobile stacks Favorites above
          the watch/plan toggle; desktop keeps title+toggle on one row
          with Favorites as a sidebar beside the main list. */}
      <div
        className="mylist-grid page-enter"
        style={{ padding: '32px 16px 24px', maxWidth: '1280px', margin: '0 auto' }}
      >
        <div className="mylist-grid__title">
          <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            My Log
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
            Your personal navigation chart — {state.watchedList.length + state.planToWatchList.length + liveRows.length} voyages logged
          </p>
        </div>

        {/* Tab toggle pill — watch lists only; favorites live in their own panel */}
        <div
          className="mylist-grid__toggle"
          style={{
            display: 'flex',
            background: 'var(--surface-container)',
            borderRadius: '9999px',
            padding: '4px',
            border: '1px solid rgba(196,198,208,0.2)',
            width: 'fit-content',
          }}
        >
          {([
            { key: 'watched', label: 'Watched',       count: state.watchedList.length + liveWatchedCount },
            { key: 'plan',    label: 'Plan to Watch', count: state.planToWatchList.length + livePlanCount },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                border: 'none',
                fontFamily: 'var(--font)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === tab.key ? '#fff' : 'transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--on-surface-variant)',
                boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,23,54,0.10)' : 'none',
                transition: 'all 0.25s ease',
              }}
            >
              {tab.label}
              <span
                style={{
                  minWidth: '20px',
                  height: '20px',
                  borderRadius: '9999px',
                  background: activeTab === tab.key
                    ? 'linear-gradient(135deg, #fe6a34, #ab3500)'
                    : 'var(--surface-container-high)',
                  color: activeTab === tab.key ? '#fff' : 'var(--outline)',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  transition: 'all 0.25s',
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Favorites panel — collapsible strip above the toggle on mobile, sidebar on desktop */}
        <FavoritesPanel navigate={navigate} />

        {/* Main column: active watch list (mock catalogue + live tracked series) */}
        <section className="mylist-grid__main">
          {mockList.length === 0 && liveList.length === 0 ? (
            <EmptyState tab={activeTab} navigate={navigate} />
          ) : (
            <div style={{ display: 'grid', gap: '16px' }} className="mylist-responsive-grid">
              {liveList.map(row => (
                <LiveMyListCard key={`live-${row.anilistId}`} row={row} navigate={navigate} onRemoved={handleLiveRemoved} />
              ))}
              {mockList.map(anime => (
                <MyListCard key={anime.id} anime={anime} navigate={navigate} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* ── Favorites side panel — mock catalogue hearts + live favorites ── */
function FavoritesPanel({ navigate }: { navigate: NavProps['navigate'] }) {
  const { state, dispatch } = useApp()
  const favs = animes.filter(a => state.favorites.includes(a.id))

  const [liveFavs, setLiveFavs] = useState<FavoriteRow[]>([])
  // Below the 1024px breakpoint (see .mylist-grid in responsive.css) this
  // panel sits above the watch/plan toggle as a collapsible strip instead
  // of a sidebar, so it defaults collapsed to keep the watch list itself
  // reachable without extra scrolling. Desktop ignores this via the
  // matching CSS and always shows the panel body.
  const [favoritesOpen, setFavoritesOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listFavorites()
      .then(rows => { if (!cancelled) setLiveFavs(rows) })
      .catch(() => { /* not signed in yet, or RLS denied */ })
    return () => { cancelled = true }
  }, [])

  async function handleRemoveLiveFav(e: React.MouseEvent, anilistId: number) {
    e.stopPropagation()
    await removeFavorite(anilistId)
    setLiveFavs(rows => rows.filter(r => r.anilistId !== anilistId))
  }

  const totalCount = favs.length + liveFavs.length

  return (
    <aside
      className="glass-card mylist-grid__favorites"
      style={{
        borderRadius: '20px',
        padding: '18px',
        alignSelf: 'start',
        position: 'sticky',
        top: '96px',
      }}
    >
      {/* role="button" (not a real <button>) so the visible <h2> title
         inside stays valid markup. Desktop hides the chevron and ignores
         clicks entirely via .mylist-favorites-toggle in responsive.css. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFavoritesOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFavoritesOpen(o => !o)
          }
        }}
        className="mylist-favorites-toggle"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', cursor: 'pointer' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#e84393', fontVariationSettings: "'FILL' 1" }}>
          favorite
        </span>
        <h2 style={{ fontFamily: 'var(--font)', fontSize: '16px', fontWeight: 800, color: 'var(--primary)', flex: 1 }}>
          Favorites
        </h2>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--outline)' }}>{totalCount}</span>
        <span
          className="material-symbols-outlined mylist-favorites-toggle__chevron"
          style={{ fontSize: '20px', color: 'var(--on-surface-variant)', transform: favoritesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          expand_more
        </span>
      </div>

      <div className={`mylist-favorites-body${favoritesOpen ? ' is-open' : ''}`}>
      {totalCount === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
          Tap the heart on any series to keep your most treasured voyages here.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {liveFavs.map(fav => (
            <div
              key={`live-${fav.anilistId}`}
              onClick={() => navigate('detail', fav.anilistId, 'live')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,67,147,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {fav.imageUrl ? (
                <img
                  src={fav.imageUrl}
                  alt={fav.title}
                  style={{ width: '42px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '42px', height: '56px', borderRadius: '8px', background: 'var(--surface-container)', flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="mylist-fav-item__title" style={{ fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fav.title}
                </p>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                  LogPose Live
                </p>
              </div>
              <button
                className="heart-btn active"
                title="Remove from favorites"
                onClick={e => handleRemoveLiveFav(e, fav.anilistId)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </button>
            </div>
          ))}
          {favs.map(anime => (
            <div
              key={anime.id}
              onClick={() => navigate('detail', anime.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(232,67,147,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <img
                src={anime.cover}
                alt={anime.title}
                style={{ width: '42px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="mylist-fav-item__title" style={{ fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {anime.title}
                </p>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                  {anime.genres[0]} · ★ {anime.score}
                </p>
              </div>
              <button
                className="heart-btn active"
                title="Remove from favorites"
                onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_FAVORITE', id: anime.id }) }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </aside>
  )
}

/* ── My List Card ── */
function MyListCard({ anime, navigate }: { anime: typeof animes[0]; navigate: NavProps['navigate'] }) {
  const { dispatch } = useApp()
  const { isFavorite, watchedEps } = useAnimeStatus(anime.id)
  const progress = Math.round((watchedEps.length / anime.episodes) * 100)

  return (
    <div className="mylist-card glass-card">
      {/* Cover image — click → detail */}
      <div
        className="mylist-card__img-wrap"
        onClick={() => navigate('detail', anime.id)}
        style={{ cursor: 'pointer' }}
      >
        <img src={anime.cover} alt={anime.title} />
        <div className="mylist-card__overlay" />

        {/* Hover actions overlay */}
        <div className="mylist-card__hover-actions">
          <PlayButton watchUrl={anime.watchUrl} variant="icon" />
        </div>

        <StatusBadge status={anime.status} />
      </div>

      {/* Card body */}
      <div className="mylist-card__body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              onClick={() => navigate('detail', anime.id)}
              style={{
                fontFamily: 'var(--font)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                marginBottom: '2px',
              }}
            >
              {anime.title}
            </h3>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {anime.episodes} eps
            </span>
          </div>
          <AddDropdown animeId={anime.id} variant="glass" size="sm" />
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {watchedEps.length}/{anime.episodes} eps
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
            {progress}%
          </span>
        </div>

        {/* Action bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(196,198,208,0.2)',
          }}
        >
          {/* Heart */}
          <button
            className={`heart-btn${isFavorite ? ' active' : ''}`}
            title={isFavorite ? 'Unfavorite' : 'Favorite'}
            onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_FAVORITE', id: anime.id }) }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '20px', fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>

          {/* Play */}
          <PlayButton watchUrl={anime.watchUrl} variant="mini" />

          {/* Anchor Up / Down */}
          <AnchorRating animeId={anime.id} size="sm" />
        </div>
      </div>
    </div>
  )
}

/* ── Live (API-backed) My List Card — reads straight from anime_tracker ── */
function LiveMyListCard({ row, navigate, onRemoved }: { row: TrackerRow; navigate: NavProps['navigate']; onRemoved: (anilistId: number) => void }) {
  const [busy, setBusy] = useState(false)
  const progress = row.totalEpisodes > 0 ? Math.round((row.episodesWatched / row.totalEpisodes) * 100) : 0

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      await removeFromTracker(row.anilistId)
      onRemoved(row.anilistId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mylist-card glass-card">
      {/* Cover image — click → the live details page */}
      <div
        className="mylist-card__img-wrap"
        onClick={() => navigate('detail', row.anilistId, 'live')}
        style={{ cursor: 'pointer' }}
      >
        {row.imageUrl ? (
          <img src={row.imageUrl} alt={row.title} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--surface-container)' }} />
        )}
        <div className="mylist-card__overlay" />
      </div>

      {/* Card body */}
      <div className="mylist-card__body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              onClick={() => navigate('detail', row.anilistId, 'live')}
              style={{
                fontFamily: 'var(--font)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                marginBottom: '2px',
              }}
            >
              {row.title}
            </h3>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {row.totalEpisodes} eps
            </span>
          </div>
          <button
            onClick={handleRemove}
            disabled={busy}
            title="Remove from list"
            className="heart-btn"
            style={{ opacity: busy ? 0.5 : 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className="progress-bar__fill"
            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {row.episodesWatched}/{row.totalEpisodes} eps
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
            {progress}%
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Empty state ── */
const EMPTY_COPY: Record<ListTab, { icon: string; title: string; body: string }> = {
  watched: {
    icon: 'check_circle',
    title: 'No voyages completed yet',
    body: 'Start watching and mark episodes as you go — your completed series will appear here.',
  },
  plan: {
    icon: 'bookmark',
    title: 'The horizon is empty',
    body: 'Add series to your Plan to Watch list and chart your next adventure.',
  },
}

function EmptyState({ tab, navigate }: { tab: ListTab; navigate: NavProps['navigate'] }) {
  const copy = EMPTY_COPY[tab]
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '80px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '9999px',
          background: 'linear-gradient(135deg, rgba(254,106,52,0.12), rgba(0,23,54,0.06))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '8px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--secondary-container)', fontVariationSettings: "'FILL' 1" }}>
          {copy.icon}
        </span>
      </div>
      <h2 className="mylist-empty-title" style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 700, color: 'var(--primary)' }}>
        {copy.title}
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--on-surface-variant)', maxWidth: '320px', lineHeight: 1.6 }}>
        {copy.body}
      </p>
      <button
        onClick={() => navigate('search')}
        className="btn-sunset"
        style={{ padding: '12px 28px', marginTop: '8px', fontSize: '14px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>explore</span>
        Explore Series
      </button>
    </div>
  )
}
