import { useState } from 'react'
import type { Page } from '../App'
import { animes } from '../data/animes'

interface BottomNavProps {
  navigate: (page: Page, animeId?: number) => void
  activePage: Page
}

const NAV_ITEMS = [
  { page: 'home'    as Page, icon: 'home',         label: 'Home'    },
  { page: 'search'  as Page, icon: 'search',        label: 'Search'  },
  { page: 'mylist'  as Page, icon: 'subscriptions', label: 'My List' },
  { page: 'profile' as Page, icon: 'person',        label: 'Profile' },
]

/** Universal bottom navigation bar.
 *  Uses .glass-nav from index.css for the backdrop blur surface.
 *  Uses .compass-active + .ocean-glow for the central FAB.
 */
export default function BottomNav({ navigate, activePage }: BottomNavProps) {
  const [spin, setSpin] = useState(false)

  /** Compass = "chart a random course": opens a random anime's detail page.
   *  (Home already has its own nav item — no duplicate feature.) */
  const handleCompass = () => {
    setSpin(true)
    setTimeout(() => setSpin(false), 700)
    const random = animes[Math.floor(Math.random() * animes.length)]
    navigate('detail', random.id)
  }

  return (
    <nav
      className="glass-nav bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.20)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
        borderRadius: '20px 20px 0 0',
      }}
      aria-label="Main navigation"
    >
      {/* Left half */}
      {NAV_ITEMS.slice(0, 2).map(item => (
        <NavButton
          key={item.page}
          icon={item.icon}
          label={item.label}
          active={activePage === item.page}
          onClick={() => navigate(item.page)}
        />
      ))}

      {/* Central Compass FAB — uses .compass-active + .ocean-glow + .sunset-gradient */}
      <div style={{ position: 'relative', top: '-24px', flexShrink: 0 }}>
        <button
          onClick={handleCompass}
          className="sunset-gradient ocean-glow compass-active"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            border: '4px solid var(--background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          aria-label="Open a random anime"
          title="Chart a random course"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '28px',
              color: '#fff',
              transform: spin ? 'rotate(405deg)' : 'rotate(45deg)',
              transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            explore
          </span>
        </button>
      </div>

      {/* Right half */}
      {NAV_ITEMS.slice(2).map(item => (
        <NavButton
          key={item.page}
          icon={item.icon}
          label={item.label}
          active={activePage === item.page}
          onClick={() => navigate(item.page)}
          fillWhenActive
        />
      ))}
    </nav>
  )
}

/* ── Inner NavButton — shared nav item style ─────────────── */
function NavButton({
  icon, label, active, onClick, fillWhenActive = false,
}: {
  icon: string
  label: string
  active: boolean
  onClick: () => void
  fillWhenActive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--secondary)' : 'var(--outline)',
        opacity: active ? 1 : 0.65,
        transform: active ? 'scale(1.1)' : 'scale(1)',
        transition: 'color 0.2s, opacity 0.2s, transform 0.2s',
        minWidth: '48px',
        padding: 0,
        fontFamily: 'var(--font)',
      }}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className="material-symbols-outlin