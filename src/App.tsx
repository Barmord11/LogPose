import { useState } from 'react'
import Header          from './components/Header'
import BottomNav       from './components/BottomNav'
import HomePage        from './pages/HomePage'
import MyListPage      from './pages/MyListPage'
import AnimeDetailPage from './pages/AnimeDetailPage'
import ProfilePage     from './pages/ProfilePage'
import './index.css'

export type Page = 'home' | 'search' | 'mylist' | 'detail' | 'profile'

export interface NavProps {
  navigate: (page: Page, animeId?: number) => void
}

function App() {
  const [activePage,      setActivePage     ] = useState<Page>('home')
  const [selectedAnimeId, setSelectedAnimeId] = useState<number>(1)

  const navigate = (page: Page, animeId?: number) => {
    if (animeId !== undefined) setSelectedAnimeId(animeId)
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      {/* Universal header — always rendered */}
      <Header navigate={navigate} activePage={activePage} />

      {/* Main content — page swap */}
      <main className="app-main">
        {activePage === 'home'    && <HomePage    navigate={navigate} />}
        {activePage === 'search'  && <HomePage    navigate={navigate} />}
        {activePage === 'mylist'  && <MyListPage  navigate={navigate} />}
        {activePage === 'profile' && <ProfilePage navigate={navigate} />}
        {activePage === 'detail'  && (
          <AnimeDetailPage animeId={selectedAnimeId} navigate={navigate} />
        )}
      </main>

      {/* Universal bottom nav — always rendered */}
      <BottomNav activePage={activePage} navigate={navigate} />
    </div>
  )
}

export default App
