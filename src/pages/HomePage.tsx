/**
 * HomePage — The Grand Departure
 * ──────────────────────────────
 * Hero banner → Popular This Week grid → Newly Released bento
 * Mobile: 2-col grid, single-col bento
 * Desktop: 4-5 col grid, 2-col bento with row-spanning feature tile
 */

import type { NavProps } from '../App'
import { animes }         from '../data/animes'
import { useProfileStats } from '../context/AppContext'
import SectionHeader      from '../components/SectionHeader'
import AddDropdown        from '../components/AddDropdown'
import PlayButton         from '../components/PlayButton'
import AnchorRating       from '../components/AnchorRating'

const FEATURED = animes[4] // Kōkai no Kiroku — most legendary

export default function HomePage({ navigate }: NavProps) {
  const stats = useProfileStats()
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '32px', background: 'var(--background)' }}>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', width: '100%', height: '72vh', minHeight: '420px', overflow: 'hidden' }}>
        <img
          src={FEATURED.cover}
          alt={FEATURED.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
        {/* Gradients */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,23,54,1) 0%, rgba(0,23,54,0.35) 50%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,23,54,0.3), transparent 60%)' }} />

        {/* Content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 16px 40px',
          }}
        >
          {/* Badge */}
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
              Most Popular This Season
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
            {FEATURED.title}
          </h1>

          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '480px' }}>
            {FEATURED.synopsis.slice(0, 140)}…
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <PlayButton watchUrl={FEATURED.watchUrl} variant="primary" label="Watch Now" />
            <button
              onClick={() => navigate('detail', FEATURED.id)}
              className="btn-glass"
              style={{ padding: '13px 24px', fontSize: '14px', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
              More Info
            </button>
            <AddDropdown animeId={FEATURED.id} variant="overlay" size="md" />
          </div>
        </div>
      </section>

      {/* ══ POPULAR THIS WEEK ═══════════════════════════════════ */}
      <section
        style={{
          padding: '0 16px',
          maxWidth: '1280px',
          margin: '-40px auto 48px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
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
          {animes.map(anime => (
            <PopularCard key={anime.id} anime={anime} navigate={navigate} />
          ))}
        </div>
      </section>

      {/* ══ NEWLY RELEASED BENTO ════════════════════════════════ */}
      <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto 32px' }}>
        <SectionHeader variant="border" title="Newly Released" style={{ marginBottom: '24px' }} />

        <div className="bento-grid">
          {/* Main feature */}
          <div
            className="bento-main glass-card"
            onClick={() => navigate('detail', animes[0].id)}
            style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              minHeight: '260px',
              cursor: 'pointer',
            }}
          >
            <img
              src={animes[0].cover}
              alt={animes[0].title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,23,54,0.85), transparent 50%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px' }}>
              <span style={{ color: 'var(--secondary-container)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                ✦ Director's Choice
              </span>
              <h3 style={{ fontFamily: 'var(--font)', fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px', marginBottom: '8px' }}>
                {animes[0].title}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.70)', maxWidth: '360px' }}>
                {animes[0].synopsis.slice(0, 90)}…
              </p>
            </div>
          </div>

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

/* ── Popular Card ── */
function PopularCard({ anime, navigate }: { anime: typeof animes[0]; navigate: NavProps['navigate'] }) {
  return (
    <div
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      <div
        onClick={() => navigate('detail', anime.id)}
        style={{
          position: 'relative',
          aspectRatio: '3/4',
          borderRadius: '14px',
          overflow: 'hidden',
          marginBottom: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          border: '1px solid rgba(255,255,255,0.4)',
          background: 'var(--surface-container)',
        }}
        className="anime-card__poster"
      >
        <img src={anime.cover} alt={anime.title} className="anime-card__img" />
        <div className="anime-card__overlay" onClick={e => e.stopPropagation()}>
          {/* Top row: add */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <AddDropdown animeId={anime.id} variant="overlay" size="sm" />
          </div>
          {/* Bottom row: play + rating */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <PlayButton watchUrl={anime.watchUrl} variant="icon" />
            <AnchorRating animeId={anime.id} size="sm" color="white" />
          </div>
        </div>
        {/* Episode count badge */}
        <div style={{
          position: 'absolute', bottom: '8px', right: '8px',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, color: '#fff',
        }}>
          {anime.episodes} ep
        </div>
      </div>

      <h3
        onClick={() => navigate('detail', anime.id)}
        style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px', cursor: 'pointer' }}
      >
        {anime.title}
      </h3>
      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {anime.genres.slice(0, 2).join(' • ')}
      </p>
    </div>
  )
}
