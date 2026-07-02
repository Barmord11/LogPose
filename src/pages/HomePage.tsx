import type { NavProps } from '../App'
import { animes } from '../data/animes'
import SectionHeader from '../components/SectionHeader'

// ────────────────────────────────────────────────────────────
// HomePage — uses codehome.html (mobile) + homePC.html (desktop)
//
// MOBILE:  hero banner → popular this week grid → bento spotlight
// DESKTOP: same layout, grid expands to 4/5 cols, bento has 2-col
// ────────────────────────────────────────────────────────────
export default function HomePage({ navigate }: NavProps) {
  const popularAnimes = [...animes, ...animes.slice(0, 1)] // pad to 5 for demo

  return (
    <div className="nautical-bg" style={{ minHeight: '100vh', paddingBottom: '24px' }}>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section className="hero-section">
        {/* Background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: "url('/images/detail-hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        {/* Gradients */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,23,54,1) 0%, rgba(0,23,54,0.4) 50%, rgba(0,23,54,0) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,23,54,0.4), transparent)' }} />

        {/* Hero content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 16px 40px',
            maxWidth: '800px',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              background: 'rgba(254,106,52,0.9)',
              backdropFilter: 'blur(8px)',
              marginBottom: '16px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff' }}>trending_up</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Most Popular This Week
            </span>
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            The Grand Fleet:<br />Eternal Voyages
          </h1>

          {/* Description */}
          <p style={{ fontFamily: 'var(--font)', fontSize: '15px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '520px' }}>
            Join the legendary crew as they navigate the uncharted waters of the Southern Abyss. A tale of mystery, high-stakes combat, and the pursuit of the ultimate treasure.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={() => navigate('detail', animes[0].id)}
              className="btn-sunset"
              style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '20px' }}>play_arrow</span>
              Watch Now
            </button>
            <button
              className="btn-glass"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              My List
            </button>
          </div>
        </div>
      </section>

      {/* ══ POPULAR THIS WEEK ═══════════════════════════════ */}
      <section
        style={{
          padding: '0 16px',
          maxWidth: '1280px',
          margin: '0 auto',
          marginTop: '-48px',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: 'var(--primary)' }}>
              Popular This Week
            </h2>
            <div style={{ height: '3px', width: '80px', background: 'linear-gradient(135deg, #fe6a34, #ab3500)', borderRadius: '9999px', marginTop: '6px' }} />
          </div>
          <button
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            View All
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        </div>

        {/* Anime grid */}
        <div className="anime-grid">
          {popularAnimes.slice(0, 5).map(anime => (
            <div
              key={anime.id}
              onClick={() => navigate('detail', anime.id)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '3/4',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '10px',
                  transition: 'transform 0.3s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <img
                  src={anime.cover}
                  alt={anime.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Hover overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,23,54,0.4)',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '12px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={e => e.stopPropagation()}
                      style={{ width: '28px', height: '28px', borderRadius: '9999px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => navigate('detail', anime.id)}
                      className="sunset-gradient"
                      style={{ width: '40px', height: '40px', borderRadius: '9999px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '22px' }}>play_arrow</span>
                    </button>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      {['thumb_up', 'thumb_down'].map(ic => (
                        <button key={ic} onClick={e => e.stopPropagation()} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{ic}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Episode badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Ep {anime.episodes}
                </div>
              </div>
              <h3 style={{ fontFamily: 'var(--font)', fontSize: '15px', fontWeight: 600, color: 'var(--primary)', lineHeight: 1.2, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {anime.title}
              </h3>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {anime.genres.slice(0, 2).join(' • ')}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ NEWLY RELEASED (BENTO SPOTLIGHT) ════════════════ */}
      <section
        style={{
          padding: '0 16px',
          maxWidth: '1280px',
          margin: '48px auto 0',
        }}
      >
        <SectionHeader variant="border" title="Newly Released" style={{ marginBottom: '24px' }} />

        <div className="bento-grid">
          {/* Main feature — spans 2 rows on desktop */}
          <div
            className="bento-main glass-card"
            style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', minHeight: '260px' }}
          >
            <img
              src={animes[0].cover}
              alt="Featured"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,23,54,0.85), transparent 50%)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 28px' }}>
              <span style={{ color: 'var(--secondary-container)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                Director's Choice
              </span>
              <h3 style={{ fontFamily: 'var(--font)', fontSize: '28px', fontWeight: 800, color: '#fff', marginTop: '4px', marginBottom: '8px' }}>
                The Abyss Raid
              </h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', maxWidth: '360px' }}>
                Watch the special 1-hour event where all captains unite for the first time.
              </p>
            </div>
          </div>

          {/* New Dubs tile */}
          <div
            style={{ borderRadius: '24px', padding: '24px', background: 'var(--tertiary-container)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px', overflow: 'hidden', position: 'relative' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--tertiary-fixed)', marginBottom: '8px' }}>auto_awesome</span>
            <div>
              <h4 style={{ fontFamily: 'var(--font)', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>New Dubs</h4>
              <p style={{ fontSize: '13px', color: 'rgba(0,161,170,0.85)', marginBottom: '16px' }}>Explore 15 new series now available in your language.</p>
            </div>
            <button style={{ background: 'var(--tertiary-fixed)', color: 'var(--tertiary-container)', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}>
              Browse Now
            </button>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '-16px', bottom: '-16px', fontSize: '120px', color: '#fff', opacity: 0.08 }}>language</span>
          </div>

          {/* Join the Fleet tile */}
          <div
            className="sunset-gradient"
            style={{ borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px', overflow: 'hidden', position: 'relative' }}
          >
            <div>
              <h4 style={{ fontFamily: 'var(--font)', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Join the Fleet</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>Premium members get early access to all seasonal premieres.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                $9.99<span style={{ fontSize: '11px', opacity: 0.6 }}>/mo</span>
              </span>
              <button style={{ background: '#fff', color: 'var(--secondary)', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Upgrade
              </button>
            </div>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '-24px', top: '-24px', fontSize: '150px', color: '#fff', opacity: 0.12 }}>military_tech</span>
          </div>
        </div>
      </section>

      {/* Desktop footer */}
      <footer className="desktop-footer" style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto' }}>
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
