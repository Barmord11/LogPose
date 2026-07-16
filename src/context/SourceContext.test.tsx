import { it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SourceProvider, useSource, WATCH_SOURCES } from './SourceContext'

function Probe() {
  const { sourceId, source, setSourceId, buildWatchUrl } = useSource()
  return (
    <div>
      <p>sourceId={sourceId}</p>
      <p>domain={source.domain}</p>
      <p>url={buildWatchUrl('One Piece')}</p>
      {WATCH_SOURCES.map(s => (
        <button key={s.id} onClick={() => setSourceId(s.id)}>pick {s.name}</button>
      ))}
    </div>
  )
}

function renderProbe() {
  return render(
    <SourceProvider>
      <Probe />
    </SourceProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

it('defaults to AniKoto when nothing is saved', () => {
  renderProbe()
  expect(screen.getByText('sourceId=anikoto')).toBeInTheDocument()
  expect(screen.getByText('domain=anikototv.to')).toBeInTheDocument()
  expect(screen.getByText('url=https://anikototv.to/filter?keyword=One+Piece')).toBeInTheDocument()
})

it('switches source and rebuilds the watch URL against the new domain', () => {
  renderProbe()
  fireEvent.click(screen.getByText('pick AniChi'))
  expect(screen.getByText('sourceId=anichi')).toBeInTheDocument()
  expect(screen.getByText('url=https://anichi.to/filter?keyword=One+Piece')).toBeInTheDocument()
})

it('persists the chosen source to localStorage and restores it on the next mount', () => {
  const { unmount } = renderProbe()
  fireEvent.click(screen.getByText('pick AniChi'))
  expect(localStorage.getItem('logpose-watch-source')).toBe('anichi')
  unmount()

  renderProbe()
  expect(screen.getByText('sourceId=anichi')).toBeInTheDocument()
})

it('ignores an unknown/corrupted saved source id and falls back to the default', () => {
  localStorage.setItem('logpose-watch-source', 'not-a-real-source')
  renderProbe()
  expect(screen.getByText('sourceId=anikoto')).toBeInTheDocument()
})

it('useSource falls back to the default source outside a SourceProvider, instead of throwing - components that build watch links (AnimeDetailPage, HomePage) are rendered without a provider in their own tests', () => {
  render(<Probe />)
  expect(screen.getByText('sourceId=anikoto')).toBeInTheDocument()
  expect(screen.getByText('url=https://anikototv.to/filter?keyword=One+Piece')).toBeInTheDocument()
})
