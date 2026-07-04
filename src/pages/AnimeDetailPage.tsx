/**
 * AnimeDetailPage — The Mariner's Log Entry
 * ──────────────────────────────────────────
 * The single details page for LogPose. Same hero/poster/stats/tab
 * layout everywhere; the data underneath depends on where you came
 * from:
 *
 *   - source="mock" (Home / My List) — the built-in demo catalogue,
 *     tracked locally via AppContext/localStorage. Unchanged from the
 *     original design.
 *
 *   - source="live" (Search) — a real AniList series, identified
 *     by its AniList id. Two independent sources, both server-side:
 *       1. DETAILS — title, image, genres, synopsis, status, format,
 *          score, characters, episode count — from AniList's official
 *          GraphQL API — no key required, no crawl-based rate limit.
 *       2. WATCH LINK — the "Watch Now" button opens episode 1's
 *          external AnimeKai link in a new tab, resolved via Consumet.
 *          LogPose never hosts or lists individual episodes — total
 *          episode count is shown as its own stat, separate from this
 *          outbound link. Best-effort: if AnimeKai/Consumet is down,
 *          the page still loads fine with no watch link, since that
 *          scraping step is kept separate from the (reliable) details
 *          fetch.
 *     List status (Watched / Plan to Watch), the isolated episode
 *     counter, and the Anchor Up/Down community rating are all
 *     LogPose's own data, read from and written to Supabase, scoped
 *     to the signed-in user.
 */

import { useEffect, useState } from 'react'
import type { NavProps, Page } from '../App'
import { animes } from '../data/animes'
import { useApp, useAnimeStatus } from '../context/AppContext'
import AnchorRating, { AnchorRatingView } from '../components/AnchorRating'
import AddDropdown from '../components/AddDropdown'
import PlayButton from '../components/PlayButton'
import { fetchAnimeInfo, type AnimeInfo } from '../services/animeApi'
import {
  getTrackerRow,
  upsertStatus,
  updateProgress,
  removeFromTracker,
  type TrackerRow,
  type TrackerStatus,
} from '../services/tracker'
import {
  getMyRating,
  setRating as submitRating,
  clearRating,
  getRatingSummary,
  type RatingValue,
} from '../services/ratings'
import { isFavorite as fetchIsFavorite, toggleFavorite } from '../services/favorites'

type DetailTab = 'overview' | 'characters' | 'episodes'

interface AnimeDetailPageProps extends NavProps {
  animeId: number
  /** Page to return to when the back button is pressed */
  backTo?: Page
  /** 'mock' (default) = the demo catalogue. 'live' = a real AniList id from Search. */
  source?: 'mock' | 'live'
}

export default function AnimeDetailPage({ animeId, navigate, backTo, source = 'mock' }: AnimeDetailPageProps) {
  if (source === 'live') {
    return <LiveDetail anilistId={animeId} navigate={navigate} backTo={backTo ?? 'search'} />
  }
  return <MockDetail animeId={animeId} navigate={navigate} backTo={backTo ?? 'home'} />
}

/* ══════════════════════════════════════════════════════════════════
   Shared bits
   ══════════════════════════════════════════════════════════════════ */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Go back"
      style={{
        position: 'absolute',
        top: '20px',
        left: '16px',
        width: '40px',
        height: '40px',
        borderRadius: '9999px',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--on-surface)',
        cursor: 'pointer',
        zIndex: 10,
        transition: 'transform 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
    </button>
  )
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-panel" style={{ borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
      <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font)', fontSize: '20px', fontWeight: 800, color: accent ? 'var(--secondary-container)' : 'var(--primary)', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function TabBar({
  activeTab,
  setActiveTab,
  episodeCount,
  tabs = ['overview', 'characters', 'episodes'],
}: {
  activeTab: DetailTab
  setActiveTab: (t: DetailTab) => void
  episodeCount?: number
  /** Which tabs to show, in order. Defaults to all three (the mock catalogue's
   *  tap-to-mark-watched grid); live series omit 'episodes' entirely since
   *  LogPose never hosts or lists individual episodes — see LiveDetail. */
  tabs?: DetailTab[]
}) {
  return (
    <div className="tab-bar" style={{ marginBottom: '0' }}>
      {tabs.map(tab => (
        <button
          key={tab}
          className={`tab-bar__item${activeTab === tab ? ' active' : ''}`}
          onClick={() => setActiveTab(tab)}
          style={{ textTransform: 'capitalize' }}
        >
          {tab === 'episodes' ? `Episodes (${episodeCount ?? 0})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)' }}>
      {children}
    </div>
  )
}

function StatusButton({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '10px 8px',
        borderRadius: '9999px',
        border: active ? 'none' : '1px solid var(--outline-variant)',
        background: active ? 'var(--secondary-container)' : 'transparent',
        color: active ? '#fff' : 'var(--on-surface)',
        fontFamily: 'var(--font)',
        fontSize: '11px',
        fontWeight: 700,
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}

function CounterButton({ icon, disabled, onClick }: { icon: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={icon === 'add' ? 'Increment episodes watched' : 'Decrement episodes watched'}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '9999px',
        border: 'none',
        background: disabled ? 'var(--surface-container)' : 'var(--primary-fixed)',
        color: disabled ? 'var(--outline)' : 'var(--on-primary-fixed)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MOCK — the original catalogue-driven detail view (Home / My List)
   ══════════════════════════════════════════════════════════════════ */

function MockDetail({ animeId, navigate, backTo }: { animeId: number; navigate: NavProps['navigate']; backTo: Page }) {
  const anime = animes.find(a => a.id === animeId) ?? animes[0]
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const { dispatch } = useApp()
  const { isFavorite, watchedEps } = useAnimeStatus(anime.id)

  const allEpisodes = Array.from({ length: anime.episodes }, (_, i) => i + 1)
  const watchProgress = Math.round((watchedEps.length / anime.episodes) * 100)
  const allWatched = watchedEps.length === anime.episodes

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(247,249,251,0.55) 0%, rgba(238,242,247,0.75) 100%)' }}>

      {/* ══ HERO BANNER ════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: '55vh', minHeight: '320px', overflow: 'hidden' }}>
        <img
          src={anime.cover}
          alt={anime.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(25,28,30,0) 0%, rgba(247,249,251,1) 90%)' }} />
        <BackButton onClick={() => navigate(backTo)} />
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 48px' }}>
        <div
          style={{ position: 'relative', zIndex: 20 }}
          className="detail-grid"
        >

          {/* ── LEFT COLUMN: Poster + Actions ── */}
          <div className="detail-left-col">
            <div style={{ aspectRatio: '2/3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,23,54,0.25)', border: '4px solid #fff', width: '100%' }}>
              <img src={anime.cover} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <PlayButton watchUrl={anime.watchUrl} variant="primary" label="Watch Now" />
              <AddDropdown animeId={anime.id} variant="glass" size="md" />
            </div>

            <div className="glass-panel" style={{ borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                  Rate this voyage
                </p>
                <AnchorRating animeId={anime.id} size="md" />
              </div>
              <button
                className={`heart-btn${isFavorite ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', id: anime.id })}
                style={{ width: '44px', height: '44px', borderRadius: '9999px', background: isFavorite ? 'rgba(232,67,147,0.1)' : 'transparent' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '26px', fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
                  favorite
                </span>
              </button>
            </div>

            <div className="glass-panel" style={{ borderRadius: '16px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
                  Your Progress
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--secondary)' }}>
                  {watchedEps.length}/{anime.episodes}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${watchProgress}%`, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontSize: '10px', color: 'var(--outline)', marginTop: '6px', textAlign: 'right' }}>
                {watchProgress}% complete
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Details ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {anime.genres.map(g => (
                  <span key={g} className="chip chip-navy">{g}</span>
                ))}
              </div>
              <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '6px' }}>
                {anime.title}
              </h1>
              {anime.altTitle && (
                <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                  {anime.altTitle}
                </p>
              )}
            </div>

            <div className="stat-chip-grid">
              <StatChip label="Rank" value={`#${anime.rank}`} />
              <StatChip label="Score" value={`★ ${anime.score}`} accent />
              <StatChip label="Episodes" value={String(anime.episodes)} />
              <StatChip label="Status" value={anime.status} accent />
            </div>

            <TabBar activeTab={activeTab} setActiveTab={setActiveTab} episodeCount={anime.episodes} />

            {activeTab === 'overview' && (
              <div className="page-enter">
                <p style={{ fontFamily: 'var(--font)', fontSize: '15px', lineHeight: 1.75, color: 'var(--on-surface)', whiteSpace: 'pre-line' }}>
                  {anime.synopsis}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                  {[
                    { icon: 'theaters', label: anime.type },
                    { icon: 'schedule', label: `${anime.episodes} episodes` },
                    { icon: 'thumb_up', label: `${anime.liked}% positive` },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9999px', background: 'var(--surface-container)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="page-enter">
                {anime.characters.length === 0 ? (
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', fontStyle: 'italic' }}>
                    Character data is being charted…
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }} className="no-scrollbar">
                    {anime.characters.map(char => (
                      <div key={char.id} className="char-card">
                        <div className="char-card__avatar">
                          <img src={char.image} alt={char.name} />
                        </div>
                        <p className="char-card__name">{char.name}</p>
                        <p className="char-card__role">{char.role}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'episodes' && (
              <div className="page-enter">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font)', fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {watchedEps.length} of {anime.episodes} episodes watched
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                      Tap an episode to mark it as watched
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (allWatched) {
                        dispatch({ type: 'CLEAR_ALL_EPISODES', animeId: anime.id })
                      } else {
                        dispatch({ type: 'MARK_ALL_EPISODES', animeId: anime.id, total: anime.episodes })
                      }
                    }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      fontFamily: 'var(--font)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: allWatched ? 'var(--error-container)' : 'var(--primary-fixed)',
                      color: allWatched ? 'var(--error)' : 'var(--on-primary-fixed)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {allWatched ? 'Clear All' : 'Mark All'}
                  </button>
                </div>

                <div className="ep-grid">
                  {allEpisodes.map(ep => {
                    const isWatched = watchedEps.includes(ep)
                    return (
                      <div
                        key={ep}
                        className={`ep-tile${isWatched ? ' watched' : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_EPISODE', animeId: anime.id, episode: ep })}
                        title={`Episode ${ep}`}
                      >
                        {isWatched ? (
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>check</span>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: 800 }}>{ep}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   LIVE — real AniList details + Consumet watch links + Supabase tracker
   ══════════════════════════════════════════════════════════════════ */

function LiveDetail({ anilistId, navigate, backTo }: { anilistId: number; navigate: NavProps['navigate']; backTo: Page }) {
  const [anime, setAnime] = useState<AnimeInfo | null>(null)
  const [animeError, setAnimeError] = useState<string | null>(null)
  const [loadingAnime, setLoadingAnime] = useState(true)

  const [tracker, setTracker] = useState<TrackerRow | null>(null)
  const [loadingTracker, setLoadingTracker] = useState(true)

  const [statusBusy, setStatusBusy] = useState(false)
  const [progressBusy, setProgressBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  // LogPose's own community rating (Supabase), separate from AniList's score.
  const [myRating, setMyRating] = useState<RatingValue | null>(null)
  const [ratingSummary, setRatingSummary] = useState<{ upCount: number; downCount: number } | null>(null)
  const [ratingBusy, setRatingBusy] = useState(false)

  // Favorite (heart) flag — its own Supabase table, separate from anime_tracker.
  const [favorite, setFavorite] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    setLoadingAnime(true)
    setAnimeError(null)
    fetchAnimeInfo(anilistId)
      .then(info => { if (!cancelled) setAnime(info) })
      .catch(err => { if (!cancelled) setAnimeError(err instanceof Error ? err.message : 'Failed to load anime') })
      .finally(() => { if (!cancelled) setLoadingAnime(false) })

    setLoadingTracker(true)
    getTrackerRow(anilistId)
      .then(row => { if (!cancelled) setTracker(row) })
      .catch(() => { /* not signed in / RLS denies — treat as untracked */ })
      .finally(() => { if (!cancelled) setLoadingTracker(false) })

    getMyRating(anilistId)
      .then(rating => { if (!cancelled) setMyRating(rating) })
      .catch(() => { /* not signed in — treat as unvoted */ })

    getRatingSummary(anilistId)
      .then(summary => { if (!cancelled) setRatingSummary(summary) })
      .catch(() => { /* summary is best-effort — leave it null on failure */ })

    fetchIsFavorite(anilistId)
      .then(fav => { if (!cancelled) setFavorite(fav) })
      .catch(() => { /* not signed in — treat as not favorited */ })

    return () => { cancelled = true }
  }, [anilistId])

  async function handleSetStatus(status: TrackerStatus) {
    if (!anime || statusBusy) return
    setStatusBusy(true)
    try {
      const row = await upsertStatus({
        anilistId,
        status,
        title: anime.title,
        imageUrl: anime.image,
        totalEpisodes: anime.totalEpisodes,
      })
      setTracker(row)
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleRemove() {
    if (statusBusy) return
    setStatusBusy(true)
    try {
      await removeFromTracker(anilistId)
      setTracker(null)
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleProgressChange(next: number) {
    if (!anime || !tracker || progressBusy) return
    // Clamp client-side for instant feedback; the DB trigger is the
    // real source of truth and clamps again server-side.
    const clamped = Math.max(0, Math.min(next, anime.totalEpisodes))
    if (clamped === tracker.episodesWatched) return

    setProgressBusy(true)
    try {
      const row = await updateProgress(anilistId, clamped)
      setTracker(row)
    } finally {
      setProgressBusy(false)
    }
  }

  // Clicking the same direction again removes the vote — same UX as
  // the mock catalogue's local AnchorRating.
  async function handleSetRating(value: RatingValue) {
    if (ratingBusy) return
    const next = myRating === value ? null : value
    setRatingBusy(true)
    try {
      if (next === null) {
        await clearRating(anilistId)
      } else {
        await submitRating(anilistId, next)
      }
      setMyRating(next)
      const summary = await getRatingSummary(anilistId)
      setRatingSummary(summary)
    } finally {
      setRatingBusy(false)
    }
  }

  async function handleToggleFavorite() {
    if (!anime || favoriteBusy) return
    setFavoriteBusy(true)
    try {
      const next = await toggleFavorite(favorite, { anilistId, title: anime.title, imageUrl: anime.image })
      setFavorite(next)
    } finally {
      setFavoriteBusy(false)
    }
  }

  if (loadingAnime) {
    return <CenteredMessage>Charting this voyage…</CenteredMessage>
  }

  if (animeError || !anime) {
    return (
      <CenteredMessage>
        <p style={{ marginBottom: '16px' }}>{animeError ?? 'Anime not found.'}</p>
        <button className="btn-glass" onClick={() => navigate(backTo)}>Go back</button>
      </CenteredMessage>
    )
  }

  const isTracked = tracker !== null
  const watchedCount = tracker?.episodesWatched ?? 0
  const progressPct = anime.totalEpisodes > 0 ? Math.round((watchedCount / anime.totalEpisodes) * 100) : 0
  const atMax = isTracked && watchedCount >= anime.totalEpisodes && anime.totalEpisodes > 0

  const totalVotes = (ratingSummary?.upCount ?? 0) + (ratingSummary?.downCount ?? 0)
  const percentPositive = totalVotes > 0 ? Math.round(((ratingSummary?.upCount ?? 0) / totalVotes) * 100) : null

  // Play button: always opens episode 1's AnimeKai link (or the first
  // episode with a link, if episode 1 itself has none). Best-effort —
  // Consumet/AnimeKai being down just means no link today.
  const playEpisode = anime.episodes.find(ep => ep.number === 1 && ep.url) ?? anime.episodes.find(ep => ep.url) ?? null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, rgba(247,249,251,0.55) 0%, rgba(238,242,247,0.75) 100%)' }}>

      {/* ══ HERO BANNER ════════════════════════════════════════ */}
      <div style={{ position: 'relative', height: '55vh', minHeight: '320px', overflow: 'hidden' }}>
        {anime.image && (
          <img
            src={anime.image}
            alt={anime.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(25,28,30,0) 0%, rgba(247,249,251,1) 90%)' }} />
        <BackButton onClick={() => navigate(backTo)} />
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 48px' }}>
        <div className="detail-grid" style={{ position: 'relative', zIndex: 20 }}>

          {/* ── LEFT COLUMN: Poster + Watch + rating + status + progress ── */}
          <div className="detail-left-col">
            <div style={{ aspectRatio: '2/3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,23,54,0.25)', border: '4px solid #fff', width: '100%', background: 'var(--surface-container)' }}>
              {anime.image && <img src={anime.image} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>

            {/* Watch — outbound link to AnimeKai (episode 1), never embedded, best-effort. */}
            {playEpisode?.url ? (
              <a
                href={playEpisode.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-sunset active-glow"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 0', fontSize: '14px', fontWeight: 700, letterSpacing: '0.03em', borderRadius: '9999px', textDecoration: 'none', color: '#fff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                Watch Now
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="btn-sunset"
                style={{ padding: '14px 0', fontSize: '14px', fontWeight: 700, borderRadius: '9999px', opacity: 0.4, cursor: 'not-allowed', border: 'none' }}
              >
                No watch link available
              </button>
            )}

            {/* LogPose's own community rating — separate from AniList's score. */}
            <div className="glass-panel" style={{ borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                  Rate this voyage
                </p>
                <p style={{ fontSize: '11px', color: 'var(--outline)' }}>
                  {totalVotes > 0
                    ? `${percentPositive}% positive · ${totalVotes} vote${totalVotes === 1 ? '' : 's'}`
                    : 'No ratings yet — be the first!'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AnchorRatingView rating={myRating} onSetRating={handleSetRating} size="md" />
                <button
                  className={`heart-btn${favorite ? ' active' : ''}`}
                  title={favorite ? 'Unfavorite' : 'Favorite'}
                  onClick={handleToggleFavorite}
                  disabled={favoriteBusy}
                  style={{ width: '44px', height: '44px', borderRadius: '9999px', background: favorite ? 'rgba(232,67,147,0.1)' : 'transparent', opacity: favoriteBusy ? 0.6 : 1 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '26px', fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
              </div>
            </div>

            {/* Status control — RESTRICTED to Watched / Plan to Watch only */}
            <div className="glass-panel" style={{ borderRadius: '16px', padding: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-surface-variant)', marginBottom: '8px' }}>
                Your List
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <StatusButton
                  label="Plan to Watch"
                  active={tracker?.status === 'Plan to Watch'}
                  disabled={statusBusy || loadingTracker}
                  onClick={() => handleSetStatus('Plan to Watch')}
                />
                <StatusButton
                  label="Watched"
                  active={tracker?.status === 'Watched'}
                  disabled={statusBusy || loadingTracker}
                  onClick={() => handleSetStatus('Watched')}
                />
              </div>
              {isTracked && (
                <button
                  onClick={handleRemove}
                  disabled={statusBusy}
                  style={{ marginTop: '8px', width: '100%', background: 'none', border: 'none', fontSize: '11px', fontWeight: 700, color: 'var(--outline)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  Remove from list
                </button>
              )}
            </div>

            {/* Isolated episode counter — the ONLY place episodes_watched is edited */}
            <div className="glass-panel" style={{ borderRadius: '16px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
                  Your Progress
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--secondary)' }}>
                  {watchedCount}/{anime.totalEpisodes}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
              </div>

              {isTracked ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
                  <CounterButton icon="remove" disabled={progressBusy || watchedCount <= 0} onClick={() => handleProgressChange(watchedCount - 1)} />
                  <span style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 800, color: 'var(--primary)', minWidth: '32px', textAlign: 'center' }}>
                    {watchedCount}
                  </span>
                  <CounterButton icon="add" disabled={progressBusy || atMax} onClick={() => handleProgressChange(watchedCount + 1)} />
                </div>
              ) : (
                <p style={{ fontSize: '11px', color: 'var(--outline)', marginTop: '10px', textAlign: 'center' }}>
                  Add this series to your list to track progress
                </p>
              )}

              {atMax && (
                <p style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: 700, marginTop: '8px', textAlign: 'center' }}>
                  ✓ All episodes watched — marked as Watched
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Details ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              {anime.genres.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {anime.genres.map(g => (
                    <span key={g} className="chip chip-navy">{g}</span>
                  ))}
                </div>
              )}
              <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {anime.title}
              </h1>
            </div>

            <div className="stat-chip-grid">
              <StatChip label="AniList Score" value={anime.score != null ? `★ ${anime.score.toFixed(1)}` : '—'} accent />
              <StatChip label="Episodes" value={String(anime.totalEpisodes)} />
              <StatChip label="Status" value={anime.status ?? '—'} accent />
              <StatChip label="Format" value={anime.format ?? '—'} />
            </div>

            <TabBar activeTab={activeTab} setActiveTab={setActiveTab} tabs={['overview', 'characters']} />

            {activeTab === 'overview' && (
              <div className="page-enter">
                <p style={{ fontFamily: 'var(--font)', fontSize: '15px', lineHeight: 1.75, color: 'var(--on-surface)', whiteSpace: 'pre-line' }}>
                  {anime.description ?? 'No synopsis available yet from AniList.'}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                  {[
                    anime.format ? { icon: 'theaters', label: anime.format } : null,
                    { icon: 'schedule', label: `${anime.totalEpisodes} episodes` },
                    anime.score != null ? { icon: 'star', label: `${anime.score.toFixed(1)} AniList score` } : null,
                    totalVotes > 0 ? { icon: 'anchor', label: `${percentPositive}% positive on LogPose` } : null,
                  ].filter((item): item is { icon: string; label: string } => item !== null).map(item => (
                    <div
                      key={item.label}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '9999px', background: 'var(--surface-container)', fontSize: '12px', fontWeight: 700, color: 'var(--on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'characters' && (
              <div className="page-enter">
                {anime.characters.length === 0 ? (
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '14px', fontStyle: 'italic' }}>
                    Character data is being charted…
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }} className="no-scrollbar">
                    {anime.characters.map(char => (
                      <div key={char.id} className="char-card">
                        <div className="char-card__avatar">
                          {char.image && <img src={char.image} alt={char.name} />}
                        </div>
                        <p className="char-card__name">{char.name}</p>
                        {char.role && <p className="char-card__role">{char.role}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
