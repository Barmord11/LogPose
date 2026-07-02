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
import './index.css'

export type Page = 'home' | 'search' | 'mylist' | 'detail' | 'profile'

export interface NavProps {
  navigate: (page: Page, animeId?: number) => void
}

function App() {
  const [activePage,      setActivePage]      = useState<Page>('home')
  const [selectedAnimeId, setSelectedAnimeId] = useState<number>(1)

  const navigate = (page: Page, animeId?: number) => {
    if (animeId !== undefined) setSelectedAnimeId(animeId)
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">

      {/* ── Desktop Sidebar (hidden on mobile via CSS) ── */}
      <Sidebar activePage={activePage} navigate={navigate} />

      {/* ── Desktop Top Bar (hidden on mobile via CSS) ── */}
      <DesktopTopBar activePage={activePage} navigate={navigate} />

      {/* ── Mobile Header (hidden on desktop via CSS) ── */}
      <Header navigate={navigate} activePage={activePage} />

      {/* ── Page Content ── */}
      <main className="app-main">
        <div className="page-enter" key={activePage}>
          {activePage === 'home'    && <HomePage    navigate={navigate} />}
          {activePage === 'search'  && <SearchPage  navigate={navigate} />}
          {activePage === 'mylist'  && <MyListPage  navigate={navigate} />}
          {activePage === 'profile' && <ProfilePage navigate={navigate} />}
          {activePage === 'detail'  && (
            <AnimeDetailPage animeId={selectedAnimeId} navigate={navigate} />
          )}
        </div>
      </main>

      {/* ── Mobile Bottom Nav (hidden on desktop via CSS) ── */}
      <BottomNav activePage={activePage} navigate={navigate} />
    </div>
  )
}

export default App
