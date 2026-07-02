/**
 * ProfilePage — The Captain's Cabin
 * ───────────────────────────────────
 * User dashboard with live-computed stats from global state.
 * - Episodes Watched: sum of all individually tracked episodes
 * - Series Watched: total entries in watchedList
 * Both counters auto-update when any episode or list changes.
 */

import type { NavProps } from '../App'
import { useProfileStats } from '../context/AppContext'

export default function ProfilePage({ navigate }: NavProps) {
  const stats = useProfileStats()

  const actionItems = [
    { icon: 'subscriptions', label: 'My Watched List',    sub: `${stats.seriesWatched} series`,        page: 'mylist' as const },
    { icon: 'bookmark',      label: 'Plan to Watch',       sub: `${stats.planCount} series queued`,     page: 'mylist' as const },
    { icon: 'favorite',      label: 'Favourites',          sub: `${stats.favoritesCount} series saved`, page: 'mylist' as const },
    { icon: 'explore',       label: 'Discover New Series', sub: 'Chart your next voyage',               page: 'search' as const },
  ]

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

      {/* ══ AVATAR HERO CARD ═══════════════════════════════════ */}
      <div style={{ position: 'relative', paddingBottom: '60px' }}>
        {/* Banner gradient */}
        <div
          style={{
            height: '200px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #405f91 60%, rgba(0,49,52,0.8) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative nautical circles */}
          {[
            { size: 200, top: '-60px', right: '-40px', opacity: 0.08 },
            { size: 120, top: '30px',  right: '80px',  opacity: 0.06 },
            { size: 80,  top: '80px',  left: '40px',   opacity: 0.07 },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: c.size,
                height: c.size,
                borderRadius: '9999px',
                border: '2px solid rgba(255,255,255,0.9)',
                top: c.top,
                right: 'right' in c ? c.right : undefined,
                left: 'left' in c ? c.left : undefined,
                opacity: c.opacity,
              }}
            />
          ))}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '0 16px 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px', fontVariationSettings: "'FILL' 1" }}>
              anchor
            </span>
          </div>
        </div>

        {/* Avatar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '4px solid #fff',
              boxShadow: '0 8px 32px rgba(0,23,54,0.2)',
              background: 'var(--surface-container)',
            }}
          >
            <img
              src="/images/user-avatar.jpg"
              alt="Captain's avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      {/* ══ NAME & RANK ════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', padding: '16px 16px 24px', maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font)', fontSize: '26px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Grand Line Voyager
        </h1>
        <p style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--secondary-container)' }}>
          Navigator · Level {stats.level}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px', lineHeight: 1.5 }}>
          Charting unknown waters since the dawn of the Grand Line era.
        </p>
      </div>

      {/* ══ LIVE STATS GRID ════════════════════════════════════ */}
      <section style={{ padding: '0 16px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
          className="profile-stats-grid"
        >
          {/* Episodes Watched — PRIMARY stat, larger */}
          <div
            className="glass-card profile-stat"
            style={{
              gridColumn: 'span 2',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(0,23,54,0.96) 0%, rgba(64,95,145,0.92) 100%)',
              padding: '28px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                right: '-16px',
                bottom: '-16px',
                fontSize: '110px',
                color: 'rgba(255,255,255,0.05)',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              movie
            </span>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(169,199,255,0.8)', marginBottom: '8px' }}>
              Episodes Watched
            </p>
            <p
              className="profile-stat__value"
              style={{ fontSize: '52px', color: '#fff', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}
            >
              {stats.totalEpisodes.toLocaleString()}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
              across {stats.seriesWatched} series · updated live
            </p>
          </div>

          {/* Series Watched */}
          <StatCard
            label="Series Watched"
            value={stats.seriesWatched}
            icon="check_circle"
            gradient="linear-gradient(135deg, rgba(254,106,52,0.12), rgba(171,53,0,0.06))"
            accent="var(--secondary)"
          />

          {/* Plan to Watch */}
          <StatCard
            label="On the Horizon"
            value={stats.planCount}
            icon="bookmark"
            gradient="linear-gradient(135deg, rgba(0,49,52,0.10), rgba(102,247,255,0.05))"
            accent="var(--on-tertiary-container)"
          />

          {/* Favourites */}
          <StatCard
            label="Favourites"
            value={stats.favoritesCount}
            icon="favorite"
            gradient="linear-gradient(135deg, rgba(232,67,147,0.10), rgba(232,67,147,0.04))"
            accent="#e84393"
          />

          {/* Total tracked (episodes across all series in plan list) */}
          <StatCard
            label="Total Logged"
            value={stats.seriesWatched + stats.planCount}
            icon="auto_stories"
            gradient="linear-gradient(135deg, rgba(64,95,145,0.10), rgba(0,23,54,0.05))"
            accent="var(--on-primary-container)"
          />
        </div>
      </section>

      {/* ══ ACTION LIST ════════════════════════════════════════ */}
      <section style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto' }}>
        <h2
          className="section-header--border"
          style={{ fontSize: '17px', marginBottom: '16px' }}
        >
          Quick Navigation
        </h2>
        <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          {actionItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => navigate(item.page)}
              className="action-item"
              style={{
                borderBottom: i < actionItems.length - 1 ? '1px solid rgba(196,198,208,0.15)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(254,106,52,0.12), rgba(0,23,54,0.06))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--secondary-container)', fontVariationSettings: "'FILL' 1" }}>
                    {item.icon}
                  </span>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.3 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                    {item.sub}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--outline)' }}>
                chevron_right
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════ */}
      <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--outline)', marginTop: '40px', fontWeight: 600, letterSpacing: '0.08em' }}>
        © 742 LogPose Navigational Systems — Set Sail into Adventure
      </p>
    </div>
  )
}

/* ── Stat Card sub-component ── */
function StatCard({
  label, value, icon, gradient, accent,
}: {
  label: string; value: number; icon: string; gradient: string; accent: string;
}) {
  return (
    <div
      className="profile-stat glass-card"
      style={{ borderRadius: '18px', background: gradient, padding: '20px 16px' }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '28px', color: accent, fontVariationSettings: "'FILL' 1", marginBottom: '8px' }}
      >
        {icon}
      </span>
      <p className="profile-stat__value" style={{ color: 'var(--primary)', fontSize: '32px' }}>
        {value}
      </p>
      <p className="profile-stat__label">{label}</p>
    </div>
  )
}
