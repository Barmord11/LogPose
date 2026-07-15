import type { Page } from '../App'

interface HeaderProps {
  navigate: (page: Page, animeId?: number) => void
  activePage: Page
}

/** Mobile-only sticky header.
 *  Uses .glass-nav from index.css for the glass effect.
 *  Hidden on desktop via the .mobile-header media query.
 */
export default function Header({ navigate, activePage }: HeaderProps) {
  return (
    <header
      className="glass-nav mobile-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        height: '64px',
        width: '100%',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('home')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        onMouseDown={e => (e.currentTarget.style.opacity = '0.7')}
        onMouseUp={e => (e.currentTarget.style.opacity = '1')}
        aria-label="Go to home"
      >
        <img
          src="/images/logo-compass.png"
          alt=""
          style={{ width: '36px', height: '36px', objectFit: 'contain' }}
        />
        <span
          className="site-title"
          style={{
            fontFamily: 'var(--font)',
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--primary)',
            lineHeight: 1,
          }}
        >
          LogPose
        </span>
      </button>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search icon */}
        <button
          onClick={() => navigate('search')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            transition: 'opacity 0.2s',
          }}
          aria-label="Search"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '24px',
              color: activePage === 'search' ? 'var(--primary)' : 'var(--on-surface-variant)',
            }}
          >
            search
          </span>
        </button>

        {/* Avatar → profile */}
        <button
          onClick={() => navigate('profile')}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            overflow: 'hidden',
            border: activePage === 'profile'
              ? '2px solid var(--secondary-container)'
              : '2px solid rgba(255,255,255,0.4)',
            cursor: 'pointer',
            background: 'none',
            padding: 0,
            flexShrink: 0,
            transition: 'border-color 0.2s, opacity 0.2s',
          }}
          aria-label="Profile"
        >
          <img
            src="/images/user-avatar.jpg"
            alt="Profile"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </button>
      </div>
    </header>
  )
}
