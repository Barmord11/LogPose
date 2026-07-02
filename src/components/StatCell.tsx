interface StatCellProps {
  label: string
  value: string | number
  /** Optional icon rendered next to the value (e.g. star for score) */
  icon?: string
  iconColor?: string
  /** When true value renders in orange (e.g. AIRING status) */
  highlight?: boolean
}

/** Universal stats cell — used in Anime Detail page rank/score/episodes/status grid.
 *  Pairs with .glass-panel and .stat-cell CSS classes.
 */
export default function StatCell({ label, value, icon, iconColor, highlight }: StatCellProps) {
  return (
    <div className="stat-cell glass-panel">
      <span className="stat-cell__label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {icon && (
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '16px',
              color: iconColor ?? 'var(--secondary)',
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {icon}
          </span>
        )}
        <span
          className={highlight ? 'stat-cell__value--highlight' : 'stat-cell__value'}
          style={highlight ? { marginTop: '2px' } : undefined}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
