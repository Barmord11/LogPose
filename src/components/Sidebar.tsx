import type { Page } from '../App'

interface SidebarProps {
  activePage: Page
  navigate: (page: Page) => void
}

const NAV_ITEMS = [
  { page: 'home'    as Page, icon: 'home',          label: 'Home'    },
  { page: 'search'  as Page, icon: 'explore',        label: 'Trending'},
  { page: 'mylist'  as Page, icon: 'movie',          label: 'Library' },
  { page: 'profile' as Page, icon: 'manage_accounts',label: 'Settings'},
]

/** Desktop-only sidebar navigation.
 *  Hidden on mobile via CSS (.sidebar { display: none } until md breakpoint).
 */
export default function Sidebar({ activePage, navigate }: SidebarProps) {
  return (
    <aside className="sidebar glass-nav">

      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo__icon">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
          >
            explore
          </span>
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--primary)', lineHeight: 1 }}>
            LogPose
          </h1>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--outline)', marginTop: '2px' }}>
            Grand Line Voyager
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.page}
            className={`sidebar-item${activePage === item.page ? ' active' : ''}`}
            onClick={() => navigate(item.page)}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '22px',
                fontVariationSettings: activePage === item.page ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User card at bottom */}
      <div className="sidebar-user">
        <img
          src="/images/user-avatar.jpg"
          alt="Profile"
          style={{ width: '40px', height: '40px', borderRadius: '9999px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.5)', flexShrink: 0 }}
        />
        <div style={{ overflow: 'hidden' }}>
          <p style={{ fontFamily: 'var(--font)', fontSize: '14px', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Captain's Cabin
          </p>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--outline)' }}>
            Lvl 14 Navigator
          </p>
        </div>
      </div>
    </aside>
  )
}
