/**
 * ThemeContext — Light/Dark mode
 * ───────────────────────────────
 * Tracks the app's color theme ('light' | 'dark'), persists the choice
 * to localStorage, and mirrors it onto <html data-theme="..."> so plain
 * CSS (see the `[data-theme='dark']` token overrides in index.css) can
 * reskin every component that already reads the --primary/--secondary/
 * etc. design tokens, without each component needing to know about
 * theme at all.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'logpose-theme'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
} | null>(null)

/** Reads a previously saved choice; otherwise the site always starts in
 *  light mode. Deliberately does NOT fall back to the OS-level
 *  prefers-color-scheme setting — a visitor whose system happens to be
 *  in dark mode should still see LogPose's normal light theme unless
 *  they've explicitly toggled it here before. */
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage unavailable — fall through */
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* storage full/unavailable — theme still works for this session */
    }
  }, [theme])

  function setTheme(next: Theme) {
    setThemeState(next)
  }

  function toggleTheme() {
    setThemeState(current => (current === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
