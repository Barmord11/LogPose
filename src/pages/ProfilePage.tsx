/**
 * ProfilePage — The Captain's Cabin
 * ───────────────────────────────────
 * User dashboard with live-computed stats from global state, plus the
 * real signed-in account (captain name + email) from Supabase Auth.
 * - Episodes Watched: sum of all individually tracked episodes
 * - Time at Sea: watch time derived from tracked episodes
 * Captain name is editable and persisted to the `profiles` table.
 */

import { useState } from 'react'
import type { NavProps } from '../App'
import { useProfileStats } from '../context/AppContext'
import { formatWatchTime, EPISODE_MINUTES, navigatorLevel } from '../context/reducer'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useLiveStats } from '../hooks/useLiveStats'

export default function ProfilePage({ navigate }: NavProps) {
  // Mock catalogue's local stats + live (Supabase-backed) stats from
  // series added via real Search results are additive - a series
  // marked Watched from either source counts toward the same tallies.
  const mockStats = useProfileStats()
  const liveStats = useLiveStats()
  const stats = {
    seriesWatched:  mockStats.seriesWatched + liveStats.seriesWatched,
    planCount:      mockStats.planCount + liveStats.planCount,
    favoritesCount: mockStats.favoritesCount + liveStats.favoritesCount,
    totalEpisodes:  mockStats.totalEpisodes + liveStats.totalEpisodes,
    level:          navigatorLevel(mockStats.seriesWatched + liveStats.seriesWatched),
  }
  const { user, profile, logout, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const [saving, setSaving]   = useState(false)

  const name = profile?.captainName ?? 'Navigator'

  const startEdit = () => {
    setDraft(name)
    setEditing(true)
  }

  const saveEdit = async () => {
    const next = draft.trim()
    if (!next || !user) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await supabase.from('profiles').update({ captain_name: next }).eq('id', user.id)
      await refreshProfile()
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const actionItems = [
    { icon: 'edit',          label: 'Edit Profile',     sub: 'Change your captain name',             onClick: startEdit },
    { icon: 'subscriptions', label: 'My Watched List',  sub: `${stats.seriesWatched} series`,        onClick: () => navigate('mylist') },
    { icon: 'bookmark',      label: 'Plan to Watch',    sub: `${stats.planCount} series queued`,     onClick: () => navigate('mylist') },
    { icon: 'favorite',      label: 'Favourites',       sub: `${stats.favoritesCount} series saved`, onClick: () => navigate('mylist') },
    { icon: 'logout',        label: 'Sign Out',         sub: user?.email ?? '',                      onClick: () => { void logout() } },
  ]

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Full-bleed on mobile (edge-to-edge banner, like a typical mobile
         profile header) - on desktop .profile-hero-wrap constrains this
         to the same 1280px content column every other section on the
         site uses (see index.css), so the banner reads as a proper card
         instead of a flat stripe stretched across an arbitrarily wide
         browser window. */}
      <div className="profile-hero-wrap">

      {/* ══ AVATAR HERO CARD ═══════════════════════════════════ */}
      <div style={{ position: 'relative', paddingBottom: '60px' }}>
        {/* Banner gradient */}
        <div
          className="profile-hero-banner"
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

          {/* LogPose mark — top-left of the banner, noticeably bigger than
             the 46px sidebar/homepage logo since this is a hero moment. */}
          <img
            src="/images/logo-compass.png"
            alt="LogPose"
            style={{
              position: 'absolute',
              top: '20px',
              left: '24px',
              width: '76px',
              height: '76px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.3))',
            }}
          />

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
        {editing ? (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '4px' }}>
            <input
              autoFocus
              value={draft}
              maxLength={28}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void saveEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              aria-label="Captain name"
              style={{
                fontFamily: 'var(--font)',
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--primary)',
                textAlign: 'center',
                border: '2px solid var(--secondary-container)',
                borderRadius: '12px',
                padding: '4px 12px',
                outline: 'none',
                background: 'rgba(255,255,255,0.85)',
                maxWidth: '280px',
              }}
            />
            <button
              onClick={() => void saveEdit()}
              disabled={saving}
              className="btn-sunset"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="btn-glass"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <h1 style={{ fontFamily: 'var(--font)', fontSize: '26px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {name}
          </h1>
        )}
        <p style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--secondary-container)' }}>
          Navigator · Level {stats.level}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '8px', lineHeight: 1.5 }}>
          {user?.email}
        </p>
      </div>
      </div>

      {/* ══ LIVE STATS GRID ════════════════════════════════════
         Column count itself comes entirely from the .profile-stats-grid
         CSS class (2-col mobile -> 4-col desktop, see responsive.css) -
         no gridTemplateColumns here. An inline style on the same
         property always wins over a stylesheet rule regardless of any
         media query in that stylesheet, so a hardcoded 2-column inline
         value here previously froze this grid at 2 columns even on
         wide desktop screens where the CSS was already trying to make
         it 4. */}
      <section style={{ padding: '0 16px 32px', maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{ display: 'grid', gap: '12px' }}
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
            value={String(stats.seriesWatched)}
            icon="check_circle"
            gradient="linear-gradient(135deg, rgba(254,106,52,0.12), rgba(171,53,0,0.06))"
            accent="var(--secondary)"
          />

          {/* Plan to Watch */}
          <StatCard
            label="On the Horizon"
            value={String(stats.planCount)}
            icon="bookmark"
            gradient="linear-gradient(135deg, rgba(0,49,52,0.10), rgba(102,247,255,0.05))"
            accent="var(--on-tertiary-container)"
          />

          {/* Favourites */}
          <StatCard
            label="Favourites"
            value={String(stats.favoritesCount)}
            icon="favorite"
            gradient="linear-gradient(135deg, rgba(232,67,147,0.10), rgba(232,67,147,0.04))"
            accent="#e84393"
          />

          {/* Time at Sea — watch time derived from tracked episodes */}
          <StatCard
            label="Time at Sea"
            value={formatWatchTime(stats.totalEpisodes)}
            sub={`~${EPISODE_MINUTES} min per episode`}
            icon="sailing"
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
              onClick={item.onClick}
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
  label, value, icon, gradient, accent, sub,
}: {
  label: string; value: string; icon: string; gradient: string; accent: string; sub?: string;
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
      {sub && (
        <p style={{ fontSize: '9px', color: 'var(--outline)', fontWeight: 600, marginTop: '2px' }}>{sub}</p>
      )}
    </div>
  )
}
