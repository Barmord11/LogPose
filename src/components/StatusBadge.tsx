/**
 * StatusBadge — shared AIRING / COMPLETED / UPCOMING pill.
 * Used on every card that overlays a status on a cover image,
 * so the style lives in exactly one place.
 */

import type { Anime } from '../data/animes'

export default function StatusBadge({ status }: { status: Anime['status'] }) {
  const isAiring = status === 'AIRING'
  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '9px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        background: isAiring ? 'var(--secondary-container)' : 'rgba(255,255,255,0.85)',
        color: isAiring ? '#fff' : 'var(--primary)',
        backdropFilter: 'blur(8px)',
        zIndex: 2,
      }}
    >
      {status}
    </div>
  )
}
