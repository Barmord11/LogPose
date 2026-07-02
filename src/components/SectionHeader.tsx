import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  /** 'border' = left accent bar | 'icon' = material icon + orange right line */
  variant?: 'border' | 'icon'
  icon?: string
  /** Element rendered on the right side (e.g. "View All" link) */
  right?: ReactNode
  style?: React.CSSProperties
}

/** Universal section title.
 *  variant="border"  → used for "Narrow Your Compass", "Navigator Settings" etc.
 *  variant="icon"    → used for "Popular Genres", "Main Characters" etc.
 */
export default function SectionHeader({
  title,
  variant = 'border',
  icon,
  right,
  style,
}: SectionHeaderProps) {
  if (variant === 'icon') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...style,
        }}
      >
        <h3 className="section-header--icon">
          {icon && (
            <span
              className="material-symbols-outlined"
              style={{
                color: 'var(--secondary)',
                fontVariationSettings: "'FILL' 1",
                fontSize: '26px',
              }}
            >
              {icon}
            </span>
          )}
          {title}
        </h3>
        {right ?? (
          <div
            style={{
              height: '4px',
              width: '64px',
              background: 'linear-gradient(135deg, #fe6a34 0%, #ab3500 100%)',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      <h3 className="section-header--border">{title}</h3>
      {right}
    </div>
  )
}
