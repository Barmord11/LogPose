import { useState } from 'react'
import type { NavProps } from '../App'
import { animes }   from '../data/animes'
import AnimeCard     from '../components/AnimeCard'
import GlassCard     from '../components/GlassCard'

type Tab = 'watched' | 'plan'

// ─────────────────────────────────────────────────────────────
// MyListPage — page-specific layout only.
// Shared UI: AnimeCard, GlassCard (from components).
// Shared styling: glass-card, bg-oceanic, sunset-gradient,
//   active-tab-glow (from index.css).
// ─────────────────────────────────────────────────────────────
export default function MyListPage({ navigate }: NavProps) {
  const [tab, setTab] = useState<Tab>('watched')

  const watchedList = animes.filter(a => a.inList)
  const planList    = animes.filter(a => !a.inList)

  // pad plan list for demo purposes
  const displayed = tab === 'watched' ? watchedList : [...planList, ...animes.slice(0, 2)]

  return (
    <div
      className="bg-oceanic"
      style={{ minHeight: '100vh', paddingBottom: '32px' }}
    >
      <div style={{ padding: '32px 16px' }}>

        {/* ══ PAGE HEADER ════════════════════════════════════ */}
        <div style={{ marginBottom: '28px' }}>
          <span
            className="text-label-sm text-secondary"
            style={{ display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            Your Collection
          </span>
          <h2 className="text-display-lg text-primary">My Log</h2>
        </div>

        {/* ══ TAB TOGGLE — page-specific pill variant ════════ */}
        {/* (Pill toggle is different from underline TabBar, so it's inline here) */}
        <GlassCard
          radius="9999px"
          style={{
            display: 'inline-flex',
            padding: '6px',
            gap: '4px',
            marginBottom: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            alignItems: 'center',
          }}
        >
          {(['watched', 'plan'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? 'btn-sunset active-tab-glow' : ''}
              style={{
                padding: '8px 20px',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: tab === t ? undefined : 'transparent',
                color: tab === t ? '#fff' : 'var(--on-surface-variant)',
              }}
            >
              {t === 'watched' ? 'Watched' : 'Plan to Watch'}
            </button>
          ))}
        </GlassCard>

        {/* ══ ANIME GRID ══════════════════════════════════════ */}
        {/* Uses universal AnimeCard component */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
          }}
        >
          {displayed.map(anime => (
            <AnimeCard
              key={anime.id}
              title={anime.title}
              cover={anime.cover}
              onClick={() => navigate('detail', anime.id)}
            />
          ))}

          {displayed.length === 0 && (
            <div
              style={{
                gridColumn: 'span 2',
                textAlign: 'center',
                padding: '48px 0',
                color: 'var(--on-surface-variant)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '48px', opacity: 0.25, display: 'block', marginBottom: '12px' }}
              >
                bookmark_border
              </span>
              <p style={{ fontWeight: 600, lineHeight: 1.6 }}>
                Nothing here yet.<br />Start exploring to build your log!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
