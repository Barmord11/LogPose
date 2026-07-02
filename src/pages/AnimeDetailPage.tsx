import { useState } from 'react'
import type { NavProps } from '../App'
import { animes }    from '../data/animes'
import GlassCard     from '../components/GlassCard'
import StatCell      from '../components/StatCell'
import Badge         from '../components/Badge'
import TabBar        from '../components/TabBar'
import SunsetButton  from '../components/SunsetButton'
import SectionHeader from '../components/SectionHeader'

interface AnimeDetailPageProps extends NavProps {
  animeId: number
}

const TABS = ['Overview', 'Characters', 'Episodes', 'Reviews']

// ─────────────────────────────────────────────────────────────
// AnimeDetailPage — page-specific layout only.
// Shared UI: GlassCard, StatCell, Badge, TabBar, SunsetButton,
//   SectionHeader (all from components).
// Shared styling: glass-panel, ocean-gradient, sunset-gradient,
//   chip, tab-bar, btn-sunset, char-card (from index.css).
// ─────────────────────────────────────────────────────────────
export default function AnimeDetailPage({ animeId, navigate }: AnimeDetailPageProps) {
  const anime = animes.find(a => a.id === animeId) ?? animes[0]
  const [activeTab, setActiveTab] = useState('Overview')
  const [liked,     setLiked    ] = useState(false)
  const [disliked,  setDisliked ] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f7f9fb 0%, #eef2f7 100%)' }}>

      {/* ══ HERO BACKGROUND ═════════════════════════════════ */}
      <div style={{ position: 'relative', height: '55vh', overflow: 'hidden' }}>
        {/* Full-bleed cover image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${anime.cover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        {/* Fade vignette — uses universal .ocean-gradient class */}
        <div className="ocean-gradient" style={{ position: 'absolute', inset: 0 }} />

        {/* Back button overlay */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
          <button
            className="glass-panel btn-glass"
            style={{ width: '42px', height: '42px', padding: 0, borderRadius: '9999px' }}
            onClick={() => navigate('mylist')}
            aria-label="Go back"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
        </div>
      </div>

      {/* ══ CONTENT OVERLAY (overlaps hero) ═════════════════ */}
      <div
        style={{
          marginTop: '-120px',
          position: 'relative',
          zIndex: 20,
          padding: '0 16px 32px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '20px',
          }}
        >
          {/* ── LEFT / TOP: Poster + actions ─────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Poster */}
            <div
              style={{
                position: 'relative',
                aspectRatio: '2/3',
                width: '160px',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                border: '3px solid #fff',
              }}
            >
              <img
                src={anime.cover}
                alt={anime.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Type / Status badges on poster */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '8px',
                  right: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '4px',
                }}
              >
                <span className="chip chip-glass">{anime.type}</span>
                <span className="chip chip-glass">{anime.status === 'AIRING' ? 'Ongoing' : anime.status}</span>
              </div>
            </div>

            {/* Watch Now + Add — uses SunsetButton + btn-glass */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SunsetButton
                icon="play_arrow"
                iconFilled
                size="md"
                style={{ flex: 1, padding: '14px 0', justifyContent: 'center' }}
                onClick={() => {}}
              >
                Watch Now
              </SunsetButton>

              {/* Add dropdown trigger */}
              <div style={{ position: 'relative' }} className="add-dropdown-root">
                <button
                  className="btn-glass"
                  style={{ width: '48px', height: '48px', padding: 0, flexShrink: 0 }}
                  aria-label="Add to list"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* Rate this series — uses GlassCard */}
            <GlassCard
              radius="16px"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
              }}
            >
              <span className="text-label-bold text-on-surface-var">Rate this series</span>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[
                  { icon: 'thumb_up',   active: liked,    toggle: () => { setLiked(!liked); setDisliked(false) }, pct: anime.liked   },
                  { icon: 'thumb_down', active: disliked, toggle: () => { setDisliked(!disliked); setLiked(false) }, pct: anime.disliked },
                ].map(r => (
                  <button
                    key={r.icon}
                    onClick={r.toggle}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: r.active ? 'var(--secondary-container)' : 'var(--on-surface-variant)',
                      transition: 'color 0.2s, transform 0.15s',
                      fontFamily: 'var(--font)',
                    }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: r.active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {r.icon}
                    </span>
                    <span className="text-label-bold">{r.pct}%</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ── RIGHT / MAIN: Title, stats, content ─────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Genre badges — uses universal Badge component */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {anime.genres.map(g => <Badge key={g} label={g} variant="navy" />)}
            </div>

            {/* Titles */}
            <div>
              <h2
                className="text-headline-lg text-primary"
                style={{ lineHeight: 1.2, marginBottom: '4px' }}
              >
                {anime.title}
              </h2>
              <p
                className="text-body-lg text-on-surface-var"
                style={{ fontStyle: 'italic', fontSize: '14px' }}
              >
                Kōkai no Kiroku: The Mariner's Legacy
              </p>
            </div>

            {/* Stats grid — uses universal StatCell component */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <StatCell label="Rank"     value={`#${anime.rank}`} />
              <StatCell label="Score"    value={anime.score}  icon="star" />
              <StatCell label="Episodes" value={anime.episodes} />
              <StatCell label="Status"   value={anime.status} highlight />
            </div>

            {/* Tab bar — uses universal TabBar component */}
            <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

            {/* Tab content — page-specific */}
            {activeTab === 'Overview' && (
              <div
                className="text-body-lg text-on-surface"
                style={{ lineHeight: 1.75, whiteSpace: 'pre-line' }}
              >
                {anime.synopsis}
              </div>
            )}

            {activeTab !== 'Overview' && (
              <div
                style={{
                  padding: '32px 0',
                  textAlign: 'center',
                  color: 'var(--on-surface-variant)',
                  opacity: 0.6,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>
                  {activeTab === 'Characters' ? 'group' : activeTab === 'Episodes' ? 'video_library' : 'rate_review'}
                </span>
                <p className="text-label-bold">{activeTab} coming soon</p>
              </div>
            )}

            {/* Main Characters — uses universal SectionHeader + .char-card classes */}
            {anime.characters.length > 0 && activeTab === 'Overview' && (
              <div>
                <SectionHeader
                  variant="border"
                  title="Main Characters"
                  style={{ marginBottom: '16px' }}
                  right={
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--secondary)',
                        fontSize: '13px',
                        fontWeight: 700,
                        fontFamily: 'var(--font)',
                        cursor: 'pointer',
                      }}
                    >
                      View All
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </button>
                  }
                />
                <div
                  className="no-scrollbar"
                  style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}
                >
                  {anime.characters.map(char => (
                    <div key={char.id} className="char-card">
                      <div className="char-card__avatar">
                        <img src={char.image} alt={char.name} />
                      </div>
                      <p className="char-card__name">{char.name}</p>
                      <p className="char-card__role">{char.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
