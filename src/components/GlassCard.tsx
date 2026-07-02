import type { ReactNode, CSSProperties } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  radius?: string
  /** 'card' = 12px blur (default) | 'panel' = 16px blur | 'nav' = 20px blur */
  variant?: 'card' | 'panel' | 'nav'
}

/** Universal frosted-glass container.
 *  Use for: search bars, stat cells, modals, list items, profile sections.
 *  Do NOT replicate glass CSS in pages — import this instead.
 */
export default function GlassCard({
  children,
  className = '',
  style,
  onClick,
  variant = 'card',
  radius = '16px',
}: GlassCardProps) {
  const variantClass =
    variant === 'panel' ? 'glass-panel' :
    variant === 'nav'   ? 'glass-nav'   :
                          'glass-card'

  return (
    <div
      className={`${variantClass} ${className}`}
      style={{ borderRadius: radius, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
