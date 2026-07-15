import { useState } from 'react'
import Header          from './components/Header'
import BottomNav       from './components/BottomNav'
import Sidebar         from './components/Sidebar'
import DesktopTopBar   from './components/DesktopTopBar'
import HomePage        from './pages/HomePage'
import SearchPage      from './pages/SearchPage'
import MyListPage      from './pages/MyListPage'
import AnimeDetailPage from './pages/AnimeDetailPage'
import ProfilePage     from './pages/ProfilePage'
import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import { useAuth }     from './context/AuthContext'
import './index.css'

export type Page = 'home' | 'search' | 'mylist' | 'detail' | 'profile'

/** Where a selected anime id came from: the demo catalogue, or a real MyAnimeList id (from Search). */
export type AnimeSource = 'mock' | 'live'

export interface NavProps {
  navigate: (page: Page, animeId?: number, source?: AnimeSource) => void
}

function App() {
  const { session, loading, initError } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'register'>('login')

  const [activePage,      setActivePage]      = useState<Page>('home')
  const [selectedAnimeId, setSelectedAnimeId] = useState<number>(1)
  const [selectedSource,  setSelectedSource]  = useState<AnimeSource>('mock')
  const [previousPage,    setPreviousPage]    = useState<Page>('home')
  const [searchQuery,     setSearchQuery]     = useState('')

  const navigate = (page: Page, animeId?: number, source: AnimeSource = 'mock') => {
    if (animeId !== undefined) {
      setSelectedAnimeId(animeId)
      setSelectedSource(source)
    }
    setActivePage(current => {
      if (current !== page) setPreviousPage(current)
      return page
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Global search (desktop top bar) → routes to the Search page */
  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query)
    navigate('search')
  }

  // ── Auth gate ─────────────────────────────────────────────
  // LogPose has real accounts (Supabase Auth). Nothing in the app is
  // reachable until the visitor is signed in.
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font)', fontWeight: 700, color: 'var(--primary)' }}>Charting the waters…</p>
      </div>
    )
  }

  // The initial Supabase session check failed outright (unreachable
  // project, bad credentials, etc.) — show this instead of silently
  // falling through to the login screen, which would look identical
  // to "just not signed in yet" and hide the real problem.
  if (initError) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', gap: '12px' }}>
        <p style={{ fontFamily: 'var(--font)', fontWeight: 700, color: 'var(--error)', fontSize: '18px' }}>
          Couldn't reach Supabase
        </p>
        <p style={{ maxWidth: '480px', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
          {initError}
        </p>
        <p style={{ maxWidth: '480px', color: 'var(--outline)', fontSize: '12px' }}>
          Check that your Supabase project is active (free-tier projects pause after inactivity)
          and that .env.local has the right VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, then reload.
        </p>
      </div>
    )
  }

  if (!session) {
    return authView === 'login'
      ? <LoginPage onSwitchToRegister={() => setAuthView('register')} />
      : <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
  }

  return (
    <div className="app-shell">

      {/* ── Desktop Sidebar (hidden on mobile via CSS) ── */}
      <Sidebar activePage={activePage} navigate={navigate} />

      {/* ── Desktop Top Bar (hidden on mobile via CSS) ── */}
      <DesktopTopBar activePage={activePage} navigate={navigate} onSearch={handleGlobalSearch} />

      {/* ── Mobile Header (hidden on desktop via CSS) ── */}
      <Header navigate={navigate} activePage={activePage} />

      {/* ── Page Content ── */}
      <main className="app-main">
        {/* Dark-mode background artwork (darkmode.png) - crossfades in via
           opacity under [data-theme='dark'], see .app-main__dark-overlay
           in index.css. Sits behind all real content (z-index:-1). */}
        <div className="app-main__dark-overlay" aria-hidden="true" />
        <div className="page-enter" key={activePage}>
          {activePage === 'home'    && <HomePage    navigate={navigate} />}
          {activePage === 'search'  && <SearchPage  navigate={navigate} initialQuery={searchQuery} />}
          {activePage === 'mylist'  && <MyListPage  navigate={navigate} />}
          {activePage === 'profile' && <ProfilePage navigate={navigate} />}
          {activePage === 'detail'  && (
            <AnimeDetailPage
              animeId={selectedAnimeId}
              source={selectedSource}
              navigate={navigate}
              backTo={previousPage === 'detail' ? (selectedSource === 'live' ? 'search' : 'home') : previousPage}
            />
          )}
        </div>
      </main>

      {/* ── Mobile Bottom Nav (hidden on desktop via CSS) ── */}
      <BottomNav activePage={activePage} navigate={navigate} />
    </div>
  )
}

export default App
