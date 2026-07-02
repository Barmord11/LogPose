/**
 * PlayButton — Set Sail!
 * ──────────────────────
 * Routes to the anime's watch URL in a new tab.
 * Three variants: 'primary' (full pill CTA), 'icon' (circle), 'mini' (small circle)
 */

interface PlayButtonProps {
  watchUrl: string
  variant?: 'primary' | 'icon' | 'mini'
  label?: string
  color?: 'orange' | 'white'
}

export default function PlayButton({
  watchUrl,
  variant = 'icon',
  label = 'Watch Now',
  color = 'orange',
}: PlayButtonProps) {
  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation()
    window.open(watchUrl, '_blank', 'noopener,noreferrer')
  }

  /* ── Full pill CTA ── */
  if (variant === 'primary') {
    return (
      <button
        onClick={handlePlay}
        className="btn-sunset active-glow"
        style={{
          flex: 1,
          padding: '14px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.03em',
          borderRadius: '9999px',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
        >
          play_arrow
        </span>
        {label}
      </button>
    )
  }

  /* ── Icon circle ── */
  const size   = variant === 'mini' ? '32px' : '40px'
  const icon   = variant === 'mini' ? '18px' : '22px'
  const bg     = color === 'orange'
    ? 'linear-gradient(135deg, #fe6a34 0%, #ab3500 100%)'
    : 'rgba(255,255,255,0.22)'
  const shadow = color === 'orange'
    ? '0 4px 16px rgba(254,106,52,0.45)'
    : 'none'

  return (
    <button
      onClick={handlePlay}
      title="Watch Now"
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        border: color === 'white' ? '1px solid rgba(255,255,255,0.35)' : 'none',
        background: bg,
        backdropFilter: color === 'white' ? 'blur(12px)' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        cursor: 'pointer',
        boxShadow: shadow,
        transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.90)' }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: icon, fontVariationSettings: "'FILL' 1" }}
      >
        play_arrow
      </span>
    </button>
  )
}
