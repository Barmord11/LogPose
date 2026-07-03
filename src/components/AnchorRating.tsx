/**
 * AnchorRating — The Voyager's Verdict
 * ─────────────────────────────────────
 * Replaces standard like/dislike with nautical Anchor Up / Anchor Down.
 * Anchor UP  = approve, glows green when active.
 * Anchor DOWN = disapprove, glows red when active.
 * Clicking the same direction again toggles it off.
 */

import { useApp, useAnimeStatus } from '../context/AppContext'

interface AnchorRatingProps {
  animeId: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'white' | 'dark'
}

const ICON_SIZES = { sm: '18px', md: '22px', lg: '26px' }

// Anchor Up "approve" accent — kept local since there's no green token
// in the shared design system (navy/orange/teal only).
const ANCHOR_UP_COLOR = '#1b8a4a'

export default function AnchorRating({
  animeId,
  size = 'md',
  color = 'dark',
}: AnchorRatingProps) {
  const { dispatch } = useApp()
  const { rating } = useAnimeStatus(animeId)

  const iconSize = ICON_SIZES[size]
  const baseColor = color === 'white' ? 'rgba(255,255,255,0.8)' : 'var(--on-surface-variant)'

  const toggle = (r: 'up' | 'down') => {
    dispatch({ type: 'SET_RATING', id: animeId, rating: r })
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Anchor Up (Like) ── */}
      <button
        title="Anchor Up — this voyage sets sail!"
        onClick={() => toggle('up')}
        style={{
          width:  size === 'sm' ? '28px' : '36px',
          height: size === 'sm' ? '28px' : '36px',
          borderRadius: '9999px',
          border: rating === 'up'
            ? '1px solid rgba(27,138,74,0.35)'
            : '1px solid transparent',
          background: rating === 'up'
            ? 'rgba(27,138,74,0.12)'
            : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: rating === 'up' ? ANCHOR_UP_COLOR : baseColor,
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15) translateY(-2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)' }}
        onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)' }}
        onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1) translateY(-2px)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: iconSize,
            fontVariationSettings: rating === 'up' ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          anchor
        </span>
      </button>

      {/* ── Anchor Down (Dislike) — flipped ── */}
      <button
        title="Anchor Down — this ship stays docked."
        onClick={() => toggle('down')}
        style={{
          width:  size === 'sm' ? '28px' : '36px',
          height: size === 'sm' ? '28px' : '36px',
          borderRadius: '9999px',
          border: rating === 'down'
            ? '1px solid rgba(186,26,26,0.35)'
            : '1px solid transparent',
          background: rating === 'down'
            ? 'rgba(186,26,26,0.10)'
            : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: rating === 'down' ? 'var(--error)' : baseColor,
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15) translateY(2px)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)' }}
        onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.9)' }}
        onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: iconSize,
            fontVariationSettings: rating === 'down' ? "'FILL' 1" : "'FILL' 0",
            display: 'inline-block',
            transform: 'rotate(180deg)',
          }}
        >
          anchor
        </span>
      </button>
    </div>
  )
}
