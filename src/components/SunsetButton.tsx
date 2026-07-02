import type { ReactNode, CSSProperties } from 'react'

interface SunsetButtonProps {
  children: ReactNode
  onClick?: () => void
  icon?: string
  iconFilled?: boolean
  /** 'full' = pill (default) | 'circle' = square aspect (for icon-only) */
  shape?: 'full' | 'circle'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  style?: CSSProperties
  className?: string
}

const sizeMap = {
  sm: { padding: '8px 18px',  fontSize: '12px', iconSize: '18px' },
  md: { padding: '12px 28px', fontSize: '14px', iconSize: '22px' },
  lg: { padding: '16px 32px', fontSize: '15px', iconSize: '24px' },
}

/** Primary CTA button — Sunset Orange gradient, pill shape, optional icon.
 *  Uses the universal .btn-sunset class.
 */
export default function SunsetButton({
  children,
  onClick,
  icon,
  iconFilled = true,
  shape = 'full',
  size = 'md',
  fullWidth = false,
  style,
  className = '',
}: SunsetButtonProps) {
  const sz = sizeMap[size]

  return (
    <button
      className={`btn-sunset ${className}`}
      onClick={onClick}
      style={{
        padding: shape === 'circle' ? sz.padding : sz.padding,
        fontSize: sz.fontSize,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
    >
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: sz.iconSize,
            fontVariationSettings: iconFilled ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          {icon}
        </span>
      )}
      {children}
    </button>
  )
}
