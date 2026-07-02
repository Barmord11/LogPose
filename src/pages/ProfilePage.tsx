import type { NavProps } from '../App'
import GlassCard    from '../components/GlassCard'
import SunsetButton from '../components/SunsetButton'
import SectionHeader from '../components/SectionHeader'

// ─────────────────────────────────────────────────────────────
// ProfilePage — page-specific layout only.
// Shared UI: GlassCard, SunsetButton, SectionHeader (components).
// Shared styling: glass-card, profile-stat, action-item,
//   sunset-gradient, list-item-hover (from index.css).
// ─────────────────────────────────────────────────────────────
export default function ProfilePage({ navigate }: NavProps) {
  const actionItems = [
    { icon: 'person_edit',        label: 'Edit Details'              },
    { icon: 'notifications_active', label: 'Notification Preferences' },
    { icon: 'history',            label: 'Watch History'             },
    { icon: 'help_center',        label: 'Help Center'               },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        paddingBottom: '32px',
      }}
    >
      {/* Wave decoration — page-specific SVG */}
      <div style={{ position: 'relative', overflow: 'hidden', height: 0 }}>
        <svg
          viewBox="0 0 480 80"
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            opacity: 0.05,
            fill: 'var(--primary)',
          }}
        >
          <path d="M0,40L48,45C96,50,192,60,288,55C384,50,432,35,480,32L480,80L432,80C384,80,288,80,192,80C96,80,48,80,0,80Z" />
        </svg>
      </div>

      <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ══ PROFILE HERO CARD ══════════════════════════════ */}
        <GlassCard
          radius="20px"
          style={{
            padding: '28px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Avatar with gradient ring */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '9999px',
                padding: '3px',
                background: 'linear-gradient(135deg, var(--secondary-container), var(--tertiary-fixed-dim))',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <img
                  src="/images/user-avatar.jpg"
                  alt="Profile avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
            {/* Level badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--secondary)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '9999px',
                border: '2px solid #fff',
                fontFamily: 'var(--font)',
              }}
            >
              LV 14
            </div>
          </div>

          <div>
            <h2 className="text-headline-lg text-primary" style={{ fontSize: '22px' }}>Nakama Voyager</h2>
            <p
              className="text-label-sm text-on-surface-var"
              style={{ marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              Grand Line Rank: Rookie
            </p>
          </div>
        </GlassCard>

        {/* ══ STATS GRID ══════════════════════════════════════ */}
        {/* Uses universal .profile-stat CSS class */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <GlassCard
            radius="16px"
            style={{
              borderBottom: '4px solid var(--tertiary-fixed)',
              overflow: 'hidden',
            }}
          >
            <div className="profile-stat">
              <span
                className="profile-stat__value"
                style={{ color: 'var(--on-tertiary-fixed-variant)' }}
              >
                142
              </span>
              <span className="profile-stat__label">Series Watched</span>
            </div>
          </GlassCard>

          <GlassCard
            radius="16px"
            style={{
              borderBottom: '4px solid var(--secondary-container)',
              overflow: 'hidden',
            }}
          >
            <div className="profile-stat">
              <span
                className="profile-stat__value"
                style={{ color: 'var(--on-secondary-container)' }}
              >
                3,420
              </span>
              <span className="profile-stat__label">Episodes Seen</span>
            </div>
          </GlassCard>

          {/* Full-width time stat */}
          <GlassCard
            radius="16px"
            style={{ gridColumn: 'span 2' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '9999px',
                    background: 'rgba(0,43,91,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--on-primary-container)', fontSize: '20px' }}
                  >
                    schedule
                  </span>
                </div>
                <div>
                  <p
                    className="text-label-sm text-on-surface-var"
                    style={{ marginBottom: '2px', textTransform: 'uppercase' }}
                  >
                    Total Time At Sea
                  </p>
                  <p className="text-title-md text-primary">42 Days, 12h</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline">insights</span>
            </div>
          </GlassCard>
        </div>

        {/* ══ NAVIGATOR SETTINGS ══════════════════════════════ */}
        <SectionHeader
          variant="border"
          title="Navigator Settings"
          style={{ marginBottom: '8px' }}
        />

        {/* Action list — uses universal .action-item + .list-item-hover CSS classes */}
        <GlassCard
          radius="16px"
          style={{ overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', divideY: '1px solid rgba(255,255,255,0.2)' } as React.CSSProperties}>
            {actionItems.map((item, i) => (
              <button
                key={item.icon}
                className="action-item list-item-hover"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.22)' : 'none',
                  borderRadius: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span
                    className="material-symbols-outlined text-on-surface-var"
                    style={{ fontSize: '22px' }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font)',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--primary)',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-outline"
                  style={{ fontSize: '20px' }}
                >
                  chevron_right
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* ══ LOGOUT — uses SunsetButton ══════════════════════ */}
        <SunsetButton
          icon="logout"
          iconFilled={false}
          size="lg"
          fullWidth
          style={{ padding: '16px', marginTop: '8px', justifyContent: 'center' }}
          onClick={() => {}}
        >
          Logout from Voyage
        </SunsetButton>

        <p
          className="text-label-sm text-outline"
          style={{ textAlign: 'center', letterSpacing: '0.05em', opacity: 0.7, marginTop: '4px' }}
        >
          LogPose Engine v4.2.0 • Made for the Grand Line
        </p>
      </div>
    </div>
  )
}
