import type { Page } from '../App'
import { useProfileStats } from '../context/AppContext'

interface SidebarProps {
  activePage: Page
  navigate: (page: Page) => void
}

/* Same destinations + labels as mobile BottomNav — one nav model everywhere */
const NAV_ITEMS = [
  { page: 'home'    as Page, icon: 'home',          label: 'Home'    },
  { page: 'search'  as Page, icon: 'search',        label: 'Search'  },
  { page: 'mylist'  as Page, icon: 'subscriptions', label: 'My List' },
  { page: 'profile' as Page, icon: 'person',        label: 'Profile' },
]

/** Desktop-only sidebar navigation.
 *  Hidden on mobile via CSS (.sidebar { display: none } until md breakpoint).
 */
export default function Sidebar({ activePage, navigate }: SidebarProps) {
  const { level } = useProfileStats()
  return (
    <aside className="sidebar glass-nav">

      {/* Logo — clickable, returns to Home like every other nav item */}
      <button
        className="sidebar-logo"
        onClick={() => navigate('home')}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
        aria-label="Go to home"
      >
        <img
          src="/images/logo-compass.png"
          alt=""
          style={{ width: '46px', height: '46px', objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <h1 style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--primary)', lineHeight: 1 }}>
            LogPose
          </h1>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--outline)', marginTop: '2px' }}>
            Grand Line Voyager
          </p>
        </div>
      </button>

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

      {/* User card at bottom → profile */}
      <button
        className="sidebar-user"
        onClick={() => navigate('profile')}
        style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
        aria-label="Open profile"
      >
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
            Lvl {level} Navigator
          </p>
        </div>
      </button>
    </aside>
  )
}
