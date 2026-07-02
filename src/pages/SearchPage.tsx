/**
 * SearchPage — Find Your Way
 * ──────────────────────────
 * Discovery hub: search bar hero → genre bento → filter chips → anime grid
 * Each anime card has the full action overlay: AddDropdown + AnchorRating + PlayButton
 */

import { useState }     from 'react'
import type { NavProps } from '../App'
import { animes, genres, filterChips, recentSearches } from '../data/animes'
import AddDropdown  from '../components/AddDropdown'
import AnchorRating from '../components/AnchorRating'
import PlayButton   from '../components/PlayButton'

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

export default function SearchPage({ navigate }: NavProps) {
  const [query,       setQuery]       = useState('')
  const [activeChip,  setActiveChip]  = useState<string | null>(null)

  const filtered = animes.filter(a =>
    query.trim() === '' || a.title.toLowerCase().includes(query.toLowerCase()),
  )

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
              placeholder="Search anime, manga, or creators..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font)',
                fontSize: '16px',
                color: 'var(--on-surface)',
                padding: '10px 12px',
              }}
            />
            <button
              className="btn-sunset"
              style={{ padding: '10px 24px', fontSize: '13px', borderRadius: 'var(--r-full)' }}
            >
              EXPLORE
            </button>
          </div>

          {/* Recent searches */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--outline)', alignSelf: 'center' }}>
              Recent:
            </span>
            {recentSearches.map(s => (
              <button
                key={s}
                onClick={() => setQuery(s)}
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

      {/* ══ POPULAR GENRES BENTO ═══════════════════════════════ */}
      {query.trim() === '' && (
        <>
          <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontVariationSettings: "'FILL' 1", fontSize: '26px' }}>dashboard</span>
                Popular Genres
              </h2>
              <div style={{ height: '3px', width: '64px', background: 'linear-gradient(135deg, #fe6a34, #ab3500)', borderRadius: '9999px' }} />
            </div>

            {/* Bento grid: 2×3 mobile, 4-col with spanning on desktop */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              {genres.map((genre, i) => {
                const bs = BADGE_STYLES[genre.badgeVariant]
                const overlay = GENRE_OVERLAYS[genre.id] ?? 'rgba(0,23,54,0.6)'
                // Isekai and Slice of Life are wide on desktop
                const isWide = genre.id === 'isekai' || genre.id === 'slice-life'
                return (
                  <div
                    key={genre.id}
                    className="genre-card"
                    style={{
                      gridColumn: isWide ? 'span 2' : 'span 1',
                    }}
                  >
                    <div
                      className="genre-card__bg"
                      style={{ backgroundImage: `url(${genre.image})` }}
                    />
                    {/* Colour overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: overlay, zIndex: 1 }} />
                    {/* Content */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
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
                        {genre.badge}
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
              {filterChips.map(chip => (
                <button
                  key={chip}
                  className={`filter-chip${activeChip === chip ? ' active' : ''}`}
                  onClick={() => setActiveChip(activeChip === chip ? null : chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ══ ANIME DISCOVERY GRID ═══════════════════════════════ */}
      <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 700, color: 'var(--primary)' }}>
            {query.trim() !== ''
              ? `Results for "${query}"`
              : 'Trending This Season'}
          </h2>
          {query.trim() !== '' && (
            <span style={{ fontSize: '13px', color: 'var(--outline)', fontWeight: 600 }}>
              {filtered.length} found
            </span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '56px', opacity: 0.25, display: 'block', marginBottom: '12px' }}>
              explore_off
            </span>
            <p style={{ fontWeight: 600 }}>No voyages found for "{query}"</p>
          </div>
        ) : (
          <div className="anime-grid">
            {filtered.map(anime => (
              <SearchCard key={anime.id} anime={anime} navigate={navigate} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* ── Search Card component ── */
function SearchCard({ anime, navigate }: { anime: typeof animes[0]; navigate: NavProps['navigate'] }) {
  return (
    <div className="search-card" onClick={() => navigate('detail', anime.id)}>
      <div className="search-card__img-wrap">
        <img src={anime.cover} alt={anime.title} />

        {/* Hover action overlay */}
        <div className="search-card__overlay" onClick={e => e.stopPropagation()}>
          {/* Play button — centred large */}
          <PlayButton watchUrl={anime.watchUrl} variant="icon" size="md" />

          {/* Bottom row: AnchorRating + AddDropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AnchorRating animeId={anime.id} size="sm" color="white" />
            <AddDropdown  animeId={anime.id} variant="overlay" size="sm" />
          </div>
        </div>

        {/* Status badge */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '9px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: anime.status === 'AIRING' ? 'var(--secondary-container)' : 'rgba(255,255,255,0.85)',
            color: anime.status === 'AIRING' ? '#fff' : 'var(--primary)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {anime.status}
        </div>
      </div>

      <div className="search-card__body">
        <h3 style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
          {anime.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {anime.genres.slice(0, 2).join(' • ')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--secondary)', fontVariationSettings: "'FILL' 1" }}>star</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>{anime.score}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
