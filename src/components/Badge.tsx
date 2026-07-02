type BadgeVariant = 'navy' | 'orange' | 'cyan' | 'glass' | 'airing' | 'completed'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variantClass: Record<BadgeVariant, string> = {
  navy:      'chip chip-navy',
  orange:    'chip chip-orange',
  cyan:      'chip chip-cyan',
  glass:     'chip chip-glass',
  airing:    'chip chip-airing',
  completed: 'chip chip-completed',
}

/** Universal genre / status badge chip.
 *  Use for: genre tags (ACTION, FANTASY), card badges (HIGH ENERGY), status labels.
 */
export default function Badge({ label, variant = 'navy' }: BadgeProps) {
  return <span className={variantClass[variant]}>{label}</span>
}
