import { it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function Probe() {
  const { theme, toggleTheme, setTheme } = useTheme()
  return (
    <div>
      <p>theme={theme}</p>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme('dark')}>force dark</button>
    </div>
  )
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

it('defaults to light when nothing is saved and there is no matchMedia preference', () => {
  renderProbe()
  expect(screen.getByText('theme=light')).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('toggleTheme flips between light and dark, and mirrors the value onto <html data-theme>', () => {
  renderProbe()

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('theme=dark')).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe('dark')

  fireEvent.click(screen.getByText('toggle'))
  expect(screen.getByText('theme=light')).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('persists the chosen theme to localStorage and restores it on the next mount', () => {
  const { unmount } = renderProbe()
  fireEvent.click(screen.getByText('force dark'))
  expect(localStorage.getItem('logpose-theme')).toBe('dark')
  unmount()

  renderProbe()
  expect(screen.getByText('theme=dark')).toBeInTheDocument()
})

it('reads an OS-level dark preference via matchMedia when nothing is saved yet', () => {
  const matchMediaMock = vi.fn().mockReturnValue({ matches: true })
  vi.stubGlobal('matchMedia', matchMediaMock)

  renderProbe()
  expect(screen.getByText('theme=dark')).toBeInTheDocument()

  vi.unstubAllGlobals()
})

it('useTheme throws when used outside a ThemeProvider', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Probe />)).toThrow('useTheme must be used within <ThemeProvider>')
  spy.mockRestore()
})
