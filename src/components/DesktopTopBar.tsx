import { useState } from 'react'
import type { Page } from '../App'

interface DesktopTopBarProps {
  activePage: Page
  navigate: (page: Page) => void
  onSearch: (query: string) => void
}

/** Desktop-only top bar (offset by sidebar width). Hidden on mobile via CSS.
 *  Page navigation lives in the Sidebar — this bar only hosts global search
 *  and the profile shortcut, so no features are duplicated.
 */
export default function DesktopTopBar({ activePage, navigate, onSearch }: DesktopTopBarProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    onSearch(value.trim())
    setValue('')
  }

  return (
    <header className="desktop-topbar glass-nav">
      {/* Global search — hidden on the Search page (it has its own hero search) */}
      <div style={{ position: 'relative', visibility: activePage === 'search' ? 'hidden' : 'visible' }}>
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
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          aria-label="Search anime"
        />
      </div>

      {/* Profile shortcut */}
      <button
        onClick={() => navigate('profile')}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          overflow: 'hidden',
          border: activePage === 'profile'
            ? '2px solid var(--secondary-container)'
            : '2px solid rgba(255,255,255,0.4)',
          cursor: 'pointer',
          background: 'none',
          padding: 0,
          flexShrink: 0,
          transition: 'border-color 0.2s',
        }}
        aria-label="Profile"
      >
        <img
          src="/images/user-avatar.jpg"
          alt="Profile"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </button>
    </header>
  )
}
