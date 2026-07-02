/**
 * AnimeDetailPage — The Mariner's Log Entry
 * ──────────────────────────────────────────
 * Full series view: hero banner, poster overlap, stats bento,
 * tab content (Overview / Characters / Episodes), action hub.
 * Episode tracker allows marking individual episodes as watched.
 */

import { useState } from 'react'
import type { NavProps } from '../App'
import { animes }        from '../data/animes'
import { useApp, useAnimeStatus } from '../context/AppContext'
import AnchorRating from '../components/AnchorRating'
import AddDropdown  from '../components/AddDropdown'
import PlayButton   from '../components/PlayButton'

type DetailTab = 'overview' | 'characters' | 'episodes'

interface AnimeDetailPageProps extends NavProps {
  animeId: number
}

export default function AnimeDetailPage({ animeId, navigate }: AnimeDetailPageProps) {
  const anime = animes.find(a => a.id === animeId) ?? animes[0]
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const { dispatch } = useApp()
  const { isFavorite, watchedEps } = useAnimeStatus(anime.id)

  const allEpisodes = Array.from({ length: anime.episodes }, (_, i) => i + 1)
  const watchProgress = Math.round((watchedEps.length / anime.episodes) * 100)
  const allWatched    = watchedEps.length === anime.episodes

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f7f9fb 0%, #eef2f7 100%)' }}>

      {/* ══ HERO BANNER ════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: '55vh', minHeight: '320px', overflow: 'hidden' }}>
        <img
          src={anime.cover}
          alt={anime.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(25,28,30,0) 0%, rgba(247,249,251,1) 90%)' }} />
        {/* Back button */}
        <button
          onClick={() => navigate('home')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '16px',
            width: '40px',
            height: '40px',
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--on-surface)',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 48px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
            marginTop: '-140px',
            position: 'relative',
            zIndex: 20,
          }}
          className="detail-grid"
        >

          {/* ── LEFT COLUMN: Poster + Actions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '280px' }}>
            {/* Poster */}
            <div
              style={{
                aspectRatio: '2/3',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,23,54,0.25)',
                border: '4px solid #fff',
                width: '100%',
              }}
            >
              <img src={anime.cover} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Watch now + Add */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <PlayButton watchUrl={anime.watchUrl} variant="primary" label="Watch Now" />
              <AddDropdown animeId={anime.id} variant="glass" size="md" />
            </div>

            {/* Rating + Favorite */}
            <div
              className="glass-panel"
              style={{
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                  Rate this voyage
                </p>
                <AnchorRating animeId={anime.id} size="md" />
              </div>
              <button
                className={`heart-btn${isFavorite ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', id: anime.id })}
                style={{ width: '44px', height: '44px', borderRadius: '9999px', background: isFavorite ? 'rgba(232,67,147,0.1)' : 'transparent' }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '26px', fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </span>
              </button>
            </div>

            {/* Episode progress bar */}
            <div className="glass-panel" style={{ borderRadius: '16px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
                  Your Progress
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--secondary)' }}>
                  {watchedEps.length}/{anime.episodes}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${watchProgress}%`, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '6px', textAlign: 'right' }}>
                {watchProgress}% complete
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Details ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Genre chips + title */}
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {anime.genres.map(g => (
                  <span key={g} className="chip chip-navy">{g}</span>
                ))}
              </div>
              <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                {anime.title}
              </h1>
              {anime.altTitle && (
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                  {anime.altTitle}
                </p>
              )}
            </div>

            {/* Stats bento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { label: 'Rank',    value: `#${anime.rank}`,      accent: false },
                { label: 'Score',   value: `★ ${anime.score}`,     accent: true  },
                { label: 'Episodes',value: String(anime.episodes), accent: false },
                { label: 'Status',  value: anime.status,          accent: true  },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="glass-panel"
                  style={{ borderRadius: '14px', padding: '14px', textAlign: 'center' }}
                >
                  <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                    {stat.label}
                  </p>
                  <p style={{ fontFamily: 'var(--font)', fontSize: '20px', fontWeight: 800, color: stat.accent ? 'var(--secondary-container)' : 'var(--primary)', lineHeight: 1 }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="tab-bar" style={{ marginBottom: '0' }}>
              {(['overview', 'characters', 'episodes'] as DetailTab[]).map(tab => (
                <button
                  key={tab}
                  className={`tab-bar__item${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tab === 'episodes' ? `Episodes (${anime.episodes})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
              <div className="page-enter">
                <p style={{ fontFamily: 'var(--font)', fontSize: '15px', lineHeight: 1.75, color: 'var(--on-surface)', whiteSpace: 'pre-line' }}>
                  {anime.synopsis}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                  {[
                    { icon: 'theaters',    label: anime.type },
                    { icon: 'schedule',    label: `${anime.episodes} episodes` },
                    { icon: 'thumb_up',    label: `${anime.liked}% positive` },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '9999px',
                        background: 'var(--surface-container)',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--on-surface-variant)',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="page-enter">
                {anime.characters.length === 0 ? (
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', fontStyle: 'italic' }}>
                    Character data is being charted…
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }} className="no-scrollbar">
                    {anime.characters.map(char => (
                      <div key={char.id} className="char-card" style={{ width: '100px' }}>
                        <div className="char-card__avatar">
                          <img src={char.image} alt={char.name} />
                        </div>
                        <p className="char-card__name">{char.name}</p>
                        <p className="char-card__role">{char.role}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'episodes' && (
              <div className="page-enter">
                {/* Progress header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font)', fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {watchedEps.length} of {anime.episodes} episodes watched
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                      Tap an episode to mark it as watched
                    </p>
                  </div>
                  {/* Mark all / Clear all */}
                  <button
                    onClick={() => {
                      if (allWatched) {
                        dispatch({ type: 'CLEAR_ALL_EPISODES', animeId: anime.id })
                      } else {
                        dispatch({ type: 'MARK_ALL_EPISODES', animeId: anime.id, total: anime.episodes })
                      }
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontFamily: 'var(--font)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: allWatched ? 'var(--error-container)' : 'var(--primary-fixed)',
                      color: allWatched ? 'var(--error)' : 'var(--on-primary-fixed)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {allWatched ? 'Clear All' : 'Mark All'}
                  </button>
                </div>

                {/* Episode grid */}
                <div className="ep-grid">
                  {allEpisodes.map(ep => {
                    const isWatched = watchedEps.includes(ep)
                    return (
                      <div
                        key={ep}
                        className={`ep-tile${isWatched ? ' watched' : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_EPISODE', animeId: anime.id, episode: ep })}
                        title={`Episode ${ep}`}
                      >
                        {isWatched ? (
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check</span>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: 800 }}>{ep}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
