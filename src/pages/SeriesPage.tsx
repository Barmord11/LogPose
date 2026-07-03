/**
 * SeriesPage — The Mariner's Log Entry (LIVE)
 * ─────────────────────────────────────────────
 * The real, Consumet-backed series page (as opposed to AnimeDetailPage,
 * which still shows the mock catalogue). On mount, fetches:
 *   1. Anime info from Consumet (via /api/anime/:id — title, image,
 *      totalEpisodes, episodes[] with each episode's external watch url)
 *   2. This user's tracker row from Supabase (status + episodes_watched)
 *
 * Business rules enforced here:
 *   - NO VIDEO HOSTING: every "Watch" button opens episode.url in a new
 *     tab (target="_blank"). LogPose never embeds or proxies video.
 *   - RESTRICTED LISTS: status can only be 'Watched' or 'Plan to Watch'.
 *   - ISOLATED PROGRESS TRACKING: the episodes_watched counter lives
 *     only on this page — nowhere else in the app edits it.
 */

import { useEffect, useState } from 'react'
import type { NavProps, Page } from '../App'
import { fetchAnimeInfo, type AnimeInfo } from '../services/animeApi'
import { getTrackerRow, upsertStatus, updateProgress, removeFromTracker, type TrackerRow, type TrackerStatus } from '../services/tracker'

interface SeriesPageProps extends NavProps {
  anilistId: number
  backTo?: Page
}

export default function SeriesPage({ anilistId, navigate, backTo = 'search' }: SeriesPageProps) {
  const [anime, setAnime] = useState<AnimeInfo | null>(null)
  const [animeError, setAnimeError] = useState<string | null>(null)
  const [loadingAnime, setLoadingAnime] = useState(true)

  const [tracker, setTracker] = useState<TrackerRow | null>(null)
  const [loadingTracker, setLoadingTracker] = useState(true)

  const [statusBusy, setStatusBusy] = useState(false)
  const [progressBusy, setProgressBusy] = useState(false)

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
        <button
          onClick={() => navigate(backTo)}
          aria-label="Go back"
          style={{
            position: 'absolute', top: '20px', left: '16px', width: '40px', height: '40px', borderRadius: '9999px',
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface)', cursor: 'pointer', zIndex: 10,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
      </div>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px 48px' }}>
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '-140px', position: 'relative', zIndex: 20 }}>

          {/* ── LEFT COLUMN: Poster + status + progress ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '280px' }}>
            <div style={{ aspectRatio: '2/3', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,23,54,0.25)', border: '4px solid #fff', width: '100%', background: 'var(--surface-container)' }}>
              {anime.image && <img src={anime.image} alt={anime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
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
                  <CounterButton
                    icon="remove"
                    disabled={progressBusy || watchedCount <= 0}
                    onClick={() => handleProgressChange(watchedCount - 1)}
                  />
                  <span style={{ fontFamily: 'var(--font)', fontSize: '22px', fontWeight: 800, color: 'var(--primary)', minWidth: '32px', textAlign: 'center' }}>
                    {watchedCount}
                  </span>
                  <CounterButton
                    icon="add"
                    disabled={progressBusy || atMax}
                    onClick={() => handleProgressChange(watchedCount + 1)}
                  />
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

          {/* ── RIGHT COLUMN: Title + Episodes ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h1 style={{ fontFamily: 'var(--font)', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {anime.title}
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxWidth: '320px' }}>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Episodes</p>
                <p style={{ fontFamily: 'var(--font)', fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{anime.totalEpisodes}</p>
              </div>
              <div className="glass-panel" style={{ borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Status</p>
                <p style={{ fontFamily: 'var(--font)', fontSize: '20px', fontWeight: 800, color: 'var(--secondary-container)' }}>{tracker?.status ?? '—'}</p>
              </div>
            </div>

            {/* Episode list — mapped from Consumet, each with an outbound "Watch" anchor */}
            <div>
              <h2 style={{ fontFamily: 'var(--font)', fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>
                Episodes ({anime.episodes.length})
              </h2>
              {anime.episodes.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                  No episode list available yet from Consumet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {anime.episodes.map(ep => (
                    <div
                      key={ep.id}
                      className="glass-panel"
                      style={{ borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                          Episode {ep.number}
                        </p>
                        {ep.title && (
                          <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ep.title}
                          </p>
                        )}
                      </div>

                      {/* NO VIDEO HOSTING: outbound link only, opened in a new tab. */}
                      {ep.url ? (
                        <a
                          href={ep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sunset"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                            textDecoration: 'none',
                          }}
                        >
                          Watch
                        </a>
                      ) : (
                        // No watch link without an href isn't a real link
                        // (screen readers / keyboard nav would skip it) —
                        // render an explicitly disabled button instead.
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="btn-sunset"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                            opacity: 0.4,
                            cursor: 'not-allowed',
                            border: 'none',
                          }}
                        >
                          Watch
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
