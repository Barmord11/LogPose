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

/** Reads a previously saved choice, then falls back to the OS-level
 *  preference, then finally to 'light'. Wrapped defensively since
 *  matchMedia isn't implemented in every test/SSR environment. */
function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* localStorage unavailable — fall through */
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  } catch {
    /* matchMedia unavailable — fall through */
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
