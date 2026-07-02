/**
 * MyListPage — The Captain's Log
 * ───────────────────────────────
 * Renders the user's personal anime collection.
 * Tabs: "Watched" | "Plan to Watch" | "Favorites"
 * Each card: cover image (→ detail), title, progress bar, action bar
 */

import { useState } from 'react'
import type { NavProps } from '../App'
import { animes }        from '../data/animes'
import { useApp, useAnimeStatus } from '../context/AppContext'
import AnchorRating from '../components/AnchorRating'
import AddDropdown  from '../components/AddDropdown'
import PlayButton   from '../components/PlayButton'
import StatusBadge  from '../components/StatusBadge'

type ListTab = 'watched' | 'plan' | 'favorites'

export default function MyListPage({ navigate }: NavProps) {
  const { state } = useApp()
  const [activeTab, setActiveTab] = useState<ListTab>('watched')

  const ids =
    activeTab === 'watched' ? state.watchedList :
    activeTab === 'plan'    ? state.planToWatchList :
    state.favorites
  const list = animes.filter(a => ids.includes(a.id))

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '48px', background: 'var(--background)' }}>

      {/* ══ PAGE HEADER ════════════════════════════════════════ */}
      <section
        className="page-enter"
        style={{
          padding: '32px 16px 24px',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            My Log
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
            Your personal navigation chart — {state.watchedList.length + state.planToWatchList.length} voyages logged
          </p>
        </div>

        {/* Tab toggle pill */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            background: 'var(--surface-container)',
            borderRadius: '9999px',
            padding: '4px',
            border: '1px solid rgba(196,198,208,0.2)',
          }}
        >
          {([
            { key: 'watched',   label: 'Watched',       count: state.watchedList.length },
            { key: 'plan',      label: 'Plan to Watch', count: state.planToWatchList.length },
            { key: 'favorites', label: 'Favorites',     count: state.favorites.length },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px',
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
      </section>

      {/* ══ LIST GRID ══════════════════════════════════════════ */}
      <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto' }}>

        {list.length === 0 ? (
          <EmptyState tab={activeTab} navigate={navigate} />
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '16px',
            }}
            className="mylist-responsive-grid"
          >
            {list.map(anime => (
              <MyListCard key={anime.id} anime={anime} navigate={navigate} />
            ))}
          </div>
        )}
      </section>
    </div>
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
                color: 'var(--primary)',
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
  favorites: {
    icon: 'favorite',
    title: 'No favorites yet',
    body: 'Tap the heart on any series to keep your most treasured voyages here.',
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
      <h2 style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 700, color: 'var(--primary)' }}>
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
