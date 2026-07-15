/**
 * ThemeToggle — Light/Dark mode switch
 * ─────────────────────────────────────
 * Renders as three images stacked directly on top of each other with
 * CSS absolute positioning, not a single <img> whose src gets swapped
 * (that causes a harsh blink the instant the browser finishes loading
 * the new file). toggle-neutral.png is the permanent base layer;
 * toggledark.png/togglelight.png sit above it and crossfade their own
 * opacity between 0 and 1 depending on which theme is active, so the
 * base is always visible underneath and the two state layers simply
 * fade in/out over it.
 */

import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Light Hero Mode' : 'Dark Villain Mode'}
      title={isDark ? 'Light Hero Mode' : 'Dark Villain Mode'}
    >
      {/* Base layer — always visible, everything else fades over it */}
      <img src="/images/toggle-neutral.png" alt="" className="theme-toggle__layer" />

      {/* Dark-state layer — fades to opacity 1 only while dark is active */}
      <img
        src="/images/toggledark.png"
        alt=""
        className={`theme-toggle__layer theme-toggle__layer--dark${isDark ? ' is-visible' : ''}`}
      />

      {/* Light-state layer — fades to opacity 1 only while light is active */}
      <img
        src="/images/togglelight.png"
        alt=""
        className={`theme-toggle__layer theme-toggle__layer--light${isDark ? '' : ' is-visible'}`}
      />
    </button>
  )
}
