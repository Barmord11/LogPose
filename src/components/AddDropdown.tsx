/**
 * AddDropdown — The Navigator's Log Entry
 * ────────────────────────────────────────
 * A glass-morphic dropdown that lets users add a series to either
 * "Watched" or "Plan to Watch". The main button shows a (+) when
 * not added, and a checkmark when already in any list.
 * Hovering/clicking the button opens the dropdown.
 *
 * `AddDropdownView` is the presentational piece, controlled entirely
 * by props — it doesn't care where the status comes from or how it's
 * persisted (same split as AnchorRating/AnchorRatingView). `AddDropdown`
 * (default export) is a thin wrapper around it for the mock catalogue
 * (Home/My List), backed by the local AppContext reducer. Live
 * (API-backed) series use `AddDropdownView` directly, backed by
 * Supabase (src/services/tracker.ts) instead — real MAL ids aren't
 * safe to key into the local reducer.
 */

import { useState, useRef, useEffect } from 'react'
import { useApp, useAnimeStatus } from '../context/AppContext'

// How long the green "added" confirmation pulse stays visible after
// logging a series - long enough to register as deliberate feedback,
// short enough that it doesn't linger and get confused with the
// permanent "already added" state (which the checkmark icon already
// conveys indefinitely via `isAdded`).
const ADDED_FEEDBACK_MS = 1600

export interface AddDropdownViewProps {
  inWatched: boolean
  inPlan: boolean
  onAddWatched: () => void
  onAddPlan: () => void
  onRemove: () => void
  /** 'overlay' = white text for dark poster backgrounds; 'glass' = dark for light UI */
  variant?: 'overlay' | 'glass'
  size?: 'sm' | 'md'
  /** Disables the trigger while a mutation is in flight (live variant only). */
  disabled?: boolean
}

export function AddDropdownView({
  inWatched,
  inPlan,
  onAddWatched,
  onAddPlan,
  onRemove,
  variant = 'overlay',
  size = 'md',
  disabled = false,
}: AddDropdownViewProps) {
  const [open, setOpen] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAdded = inWatched || inPlan
  const btnSize = size === 'sm' ? '28px' : '36px'
  const iconSize = size === 'sm' ? '16px' : '20px'

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Clear the pending feedback timer on unmount so it doesn't fire
  // setState on an unmounted card (e.g. a search result that scrolled
  // out and got removed right after being tapped).
  useEffect(() => () => {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current)
  }, [])

  function flashAdded() {
    setJustAdded(true)
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current)
    feedbackTimeout.current = setTimeout(() => setJustAdded(false), ADDED_FEEDBACK_MS)
  }

  function addToWatched() {
    onAddWatched()
    setOpen(false)
    flashAdded()
  }
  function addToPlan() {
    onAddPlan()
    setOpen(false)
    flashAdded()
  }
  function removeFromList() {
    onRemove()
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      style={{ position: 'relative', flexShrink: 0 }}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Trigger button ──
          The `added-pulse` class briefly rings the button green right
          after logging a series - contained within the button's own
          box (a ~10px ring), unlike the dropdown panel below, so it
          stays visible even inside a poster wrapper with
          overflow:hidden. */}
      <button
        title={isAdded ? 'Logged — click to change' : 'Log this voyage'}
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className={justAdded ? 'added-pulse' : undefined}
        style={{
          width: btnSize,
          height: btnSize,
          borderRadius: '9999px',
          border: isAdded
            ? '1px solid var(--secondary-container)'
            : variant === 'overlay'
            ? '1px solid rgba(255,255,255,0.40)'
            : '1px solid rgba(255,255,255,0.50)',
          background: isAdded
            ? 'var(--secondary-container)'
            : variant === 'overlay'
            ? 'rgba(255,255,255,0.20)'
            : 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'wait' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          color: isAdded ? '#fff' : variant === 'overlay' ? '#fff' : 'var(--primary)',
          transition: 'background 0.25s, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
        onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.88)' }}
        onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: iconSize,
            fontVariationSettings: isAdded ? "'FILL' 1" : "'FILL' 0",
            transition: 'transform 0.3s',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          {isAdded ? 'check' : 'add'}
        </span>
      </button>

      {/* ── Dropdown panel ──
          Opens BELOW the trigger (not above it) - the trigger sits at
          the top edge of a poster/card whose wrapper has
          overflow:hidden (for the rounded-corner image), so a panel
          opening upward rendered entirely outside that box and was
          invisible/clipped. Opening downward keeps it inside the
          card's own bounds on every card variant (Home's TrendingCard,
          Search's LiveSearchCard, and the hero). */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '176px',
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.55)',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0,23,54,0.18)',
            padding: '8px',
            zIndex: 200,
            animation: 'dropDown 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <DropItem
            icon="check_circle"
            label="Watched"
            sublabel="Already seen it"
            active={inWatched}
            activeColor="var(--secondary)"
            onClick={inWatched ? removeFromList : addToWatched}
            className="drop-item--dark-accent"
          />
          <DropItem
            icon="bookmark"
            label="Plan to Watch"
            sublabel="On the horizon"
            active={inPlan}
            activeColor="var(--on-tertiary-container)"
            onClick={inPlan ? removeFromList : addToPlan}
            className="drop-item--dark-accent"
          />
          {isAdded && (
            <button
              onClick={removeFromList}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--outline)',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--error-container)'; (e.currentTarget as HTMLElement).style.color = 'var(--error)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--outline)' }}
            >
              Remove from Log
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface AddDropdownProps {
  animeId: number
  /** 'overlay' = white text for dark poster backgrounds; 'glass' = dark for light UI */
  variant?: 'overlay' | 'glass'
  size?: 'sm' | 'md'
}

/** Mock-catalogue wrapper — reads/writes the local AppContext reducer, same as before. */
export default function AddDropdown({
  animeId,
  variant = 'overlay',
  size = 'md',
}: AddDropdownProps) {
  const { dispatch } = useApp()
  const { inWatched, inPlan } = useAnimeStatus(animeId)

  return (
    <AddDropdownView
      inWatched={inWatched}
      inPlan={inPlan}
      onAddWatched={() => dispatch({ type: 'ADD_TO_WATCHED', id: animeId })}
      onAddPlan={() => dispatch({ type: 'ADD_TO_PLAN', id: animeId })}
      onRemove={() => dispatch({ type: 'REMOVE_FROM_LIST', id: animeId })}
      variant={variant}
      size={size}
    />
  )
}

/* ── Helper sub-component ── */
function DropItem({
  icon, label, sublabel, active, activeColor, onClick, className,
}: {
  icon: string
  label: string
  sublabel: string
  active: boolean
  activeColor: string
  onClick: () => void
  /** The dropdown panel's own background is a fixed near-white
   *  regardless of theme - fine for the default var(--on-surface)/
   *  var(--outline) text in light mode, but that same text flips to
   *  near-white in dark mode and disappears against the still-white
   *  panel. "Plan to Watch" passes drop-item--plan here so a plain CSS
   *  dark-mode override (see index.css) can force it orange - both the
   *  default text color and the (JS-driven) hover background, since a
   *  stylesheet !important rule beats a plain inline style either way. */
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '10px',
        background: active ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-low)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: '20px',
          color: active ? activeColor : 'var(--outline)',
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 700, color: active ? activeColor : 'var(--on-surface)', lineHeight: 1.2, margin: 0 }}>
          {label}
        </p>
        <p style={{ fontSize: '10px', color: 'var(--outline)', lineHeight: 1, marginTop: '2px' }}>
          {sublabel}
        </p>
      </div>
    </button>
  )
}
