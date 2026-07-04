/**
 * DragToAdd — Chart a Course by Hand
 * ───────────────────────────────────
 * Touch-only "drag the card to a list" interaction, built to fix a real
 * mobile gap: the (+) add-to-list button lives inside a hover-revealed
 * overlay, and even once that overlay is forced visible on touch (see
 * .search-card__overlay / .anime-card__overlay mobile rules), tapping a
 * tiny icon on a phone is fiddly. Dragging the whole card is a bigger,
 * easier target.
 *
 * `useDragToAdd` is a small pointer-events state machine:
 *  - On mouse/desktop (or any non-coarse pointer) it's a no-op — the
 *    card's normal onClick (passed in as `onTap`) fires exactly like
 *    before, nothing changes for desktop users.
 *  - On touch, a press that moves less than DRAG_THRESHOLD px is still
 *    treated as a plain tap (onTap fires, e.g. open the details page).
 *  - A press that moves past the threshold becomes a drag: the card
 *    follows the finger vertically, and two colour-coded zones fade in
 *    at the top ("Plan to Watch", teal) and bottom ("Watched", orange)
 *    of the screen. Releasing over a zone adds the series to that list;
 *    releasing anywhere else snaps the card back and does nothing.
 *
 * `DragDropZones` is the presentational half — a fixed, portal-rendered
 * overlay so it's always anchored to the viewport regardless of any
 * `transform` on ancestor cards (which would otherwise break plain
 * `position: fixed` children).
 */

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type DragZone = 'plan' | 'watched'

interface UseDragToAddOptions {
  /** Add the series to "Plan to Watch" — fired on drop over the top zone. */
  onPlan: () => void
  /** Add the series to "Watched" — fired on drop over the bottom zone. */
  onWatched: () => void
  /** Fired on a genuine tap/click (no meaningful drag) — e.g. navigate to details. */
  onTap?: () => void
  disabled?: boolean
}

interface DragToAddState {
  dragging: boolean
  offsetY: number
  zone: DragZone | null
}

/** Px of movement before a touch press counts as a drag instead of a tap. */
const DRAG_THRESHOLD = 12
/** Height of each drop zone band, top and bottom of the viewport. */
export const DRAG_ZONE_HEIGHT = 96

function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)')?.matches
}

export function useDragToAdd({ onPlan, onWatched, onTap, disabled = false }: UseDragToAddOptions) {
  const [state, setState] = useState<DragToAddState>({ dragging: false, offsetY: 0, zone: null })
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const zoneRef = useRef<DragZone | null>(null)
  const wasDragRef = useRef(false)

  function reset() {
    startRef.current = null
    draggingRef.current = false
    zoneRef.current = null
    setState({ dragging: false, offsetY: 0, zone: null })
  }

  function onPointerDown(e: React.PointerEvent) {
    if (disabled || e.pointerType === 'mouse' || !isCoarsePointer()) return
    // Nested controls (heart, anchor rating, the add dropdown itself)
    // already stopPropagation on their own onClick — leave them alone
    // and don't start a drag from a press that landed on one of them.
    const target = e.target as HTMLElement
    if (target.closest('button, a, input')) return
    startRef.current = { x: e.clientX, y: e.clientY }
    draggingRef.current = false
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current || disabled) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    if (!draggingRef.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      draggingRef.current = true
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      } catch {
        /* pointer capture is best-effort */
      }
    }

    const zone: DragZone | null =
      e.clientY < DRAG_ZONE_HEIGHT ? 'plan'
      : e.clientY > window.innerHeight - DRAG_ZONE_HEIGHT ? 'watched'
      : null
    zoneRef.current = zone
    setState({ dragging: true, offsetY: dy, zone })
  }

  function onPointerUp(_e: React.PointerEvent) {
    if (draggingRef.current) {
      wasDragRef.current = true
      if (zoneRef.current === 'plan') onPlan()
      else if (zoneRef.current === 'watched') onWatched()
    }
    reset()
  }

  function onPointerCancel(_e: React.PointerEvent) {
    reset()
  }

  // The card's single onClick — swallows the synthetic click that
  // follows a drag-drop so it doesn't also trigger navigation, and
  // otherwise forwards to onTap exactly like a plain onClick would.
  function onClick(e: React.MouseEvent) {
    if (wasDragRef.current) {
      wasDragRef.current = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onTap?.()
  }

  return {
    dragging: state.dragging,
    offsetY: state.offsetY,
    zone: state.zone,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick },
  }
}

/** Portal-rendered top/bottom drop zones — only mounted while actively dragging. */
export function DragDropZones({ dragging, zone }: { dragging: boolean; zone: DragZone | null }) {
  if (!dragging || typeof document === 'undefined') return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: `${DRAG_ZONE_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: zone === 'plan' ? 'rgba(0,163,170,0.94)' : 'rgba(0,163,170,0.55)',
          color: '#fff',
          fontFamily: 'var(--font)',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'background 0.15s ease',
          boxShadow: zone === 'plan' ? '0 6px 24px rgba(0,163,170,0.5)' : 'none',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>bookmark</span>
        Plan to Watch
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: `${DRAG_ZONE_HEIGHT}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: zone === 'watched' ? 'rgba(254,106,52,0.94)' : 'rgba(254,106,52,0.55)',
          color: '#fff',
          fontFamily: 'var(--font)',
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'background 0.15s ease',
          boxShadow: zone === 'watched' ? '0 -6px 24px rgba(254,106,52,0.5)' : 'none',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        Watched
      </div>
    </div>,
    document.body,
  )
}
