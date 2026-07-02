import type { Page } from '../App'

interface DesktopTopBarProps {
  activePage: Page
  navigate: (page: Page) => void
}

const TOP_NAV = [
  { page: 'home'    as Page, label: 'Home'      },
  { page: 'mylist'  as Page, label: 'My List'   },
  { page: 'search'  as Page, label: 'Explore'   },
]

/** Desktop-only top navigation bar (offset by sidebar width).
 *  Hidden on mobile via CSS.
 */
export default function DesktopTopBar({ activePage, navigate }: DesktopTopBarProps) {
  return (
    <header className="desktop-topbar glass-nav">
      {/* Left: nav links + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <nav style={{ display: 'flex', gap: '24px' }}>
          {TOP_NAV.map(item => (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                fontFamily: 'var(--font)',
                cursor: 'pointer',
                color: activePage === item.page ? 'var(--secondary)' : 'var(--on-surface-variant)',
                borderBottom: activePage === item.page ? '2px solid var(--secondary)' : '2px solid transparent',
                paddingBottom: '4px',
                transition: 'color 0.2s, border-color 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: '20px', pointerEvents: 'none' }}
          >
            search
          </span>
          <input
            className="search-input-desktop"
            placeholder="Search the Grand Line..."
            type="text"
          />
        </div>
      </div>

      {/* Right: notification, history */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {['notifications', 'history'].map(icon => (
          <button
            key={icon}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--on-surface-variant)',
              cursor: 'pointer',
              transition: 'color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--on-surface-variant)')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{icon}</span>
          </button>
        ))}
      </div>
    </header>
  )
}
