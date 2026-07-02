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
  const [previousPage,    setPreviousPage]    = useState<Page>('home')
  const [searchQuery,     setSearchQuery]     = useState('')

  const navigate = (page: Page, animeId?: number) => {
    if (animeId !== undefined) setSelectedAnimeId(animeId)
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
        <div className="page-enter" key={activePage}>
          {activePage === 'home'    && <HomePage    navigate={navigate} />}
          {activePage === 'search'  && <SearchPage  navigate={navigate} initialQuery={searchQuery} />}
          {activePage === 'mylist'  && <