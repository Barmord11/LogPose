import { it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle'
import { ThemeProvider } from '../context/ThemeContext'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

it('renders all three stacked layers, with toggle-neutral.png as the permanent base', () => {
  renderToggle()
  // These are decorative (alt="") crossfade layers, not meaningful
  // content, so they intentionally don't expose an accessible "img"
  // role - query the raw <img> elements directly instead.
  const layers = Array.from(document.querySelectorAll('.theme-toggle img'))
  const srcs = layers.map(img => img.getAttribute('src'))
  expect(srcs).toEqual(
    expect.arrayContaining([
      '/images/toggle-neutral.png',
      '/images/toggledark.png',
      '/images/togglelight.png',
    ]),
  )
})

it('starts in light mode with the light layer visible and the dark layer hidden', () => {
  renderToggle()
  const button = screen.getByRole('switch')
  expect(button).toHaveAttribute('aria-checked', 'false')

  const darkLayer = document.querySelector('.theme-toggle__layer--dark')
  const lightLayer = document.querySelector('.theme-toggle__layer--light')
  expect(darkLayer).not.toHaveClass('is-visible')
  expect(lightLayer).toHaveClass('is-visible')
})

it('clicking crossfades to the dark layer and flips the switch state', () => {
  renderToggle()
  fireEvent.click(screen.getByRole('switch'))

  const button = screen.getByRole('switch')
  expect(button).toHaveAttribute('aria-checked', 'true')

  const darkLayer = document.querySelector('.theme-toggle__layer--dark')
  const lightLayer = document.querySelector('.theme-toggle__layer--light')
  expect(darkLayer).toHaveClass('is-visible')
  expect(lightLayer).not.toHaveClass('is-visible')
})

it('clicking twice returns to light mode', () => {
  renderToggle()
  const button = screen.getByRole('switch')

  fireEvent.click(button)
  fireEvent.click(button)

  expect(button).toHaveAttribute('aria-checked', 'false')
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('tooltip names the mode you are about to switch TO, not the current one', () => {
  renderToggle()
  const button = screen.getByRole('switch')

  // Starts light - hovering shows the villain pitch for turning dark on.
  expect(button).toHaveAttribute('title', 'Dark Villain Mode')

  fireEvent.click(button)
  // Now dark - hovering shows the hero pitch for turning light back on.
  expect(button).toHaveAttribute('title', 'Light Hero Mode')
})
