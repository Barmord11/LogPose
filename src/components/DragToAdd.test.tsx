import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragToAdd } from './DragToAdd'

/** Drag zones are 96px bands at top/bottom of a mocked 800px-tall viewport. */
function mockPointerEnv(coarse: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: coarse }))
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
}

function fakeEvent(overrides: { clientY: number; pointerType?: string; target?: Element }) {
  return {
    clientX: 0,
    clientY: overrides.clientY,
    pointerType: overrides.pointerType ?? 'touch',
    pointerId: 1,
    target: overrides.target ?? document.createElement('div'),
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.PointerEvent
}

function fakeClick() {
  return { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent
}

describe('useDragToAdd', () => {
  beforeEach(() => {
    mockPointerEnv(true)
  })

  it('treats a small-movement touch press as a tap, not a drag', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400 }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 405 })) // 5px — under the drag threshold
      result.current.bind.onPointerUp(fakeEvent({ clientY: 405 }))
    })
    act(() => { result.current.bind.onClick(fakeClick()) })

    expect(onTap).toHaveBeenCalledTimes(1)
    expect(onPlan).not.toHaveBeenCalled()
    expect(onWatched).not.toHaveBeenCalled()
    expect(result.current.dragging).toBe(false)
  })

  it('dragging into the top zone and releasing calls onPlan, and suppresses the trailing click', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400 }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 40 })) // past threshold, inside the top 96px band
    })
    expect(result.current.dragging).toBe(true)
    expect(result.current.zone).toBe('plan')

    act(() => { result.current.bind.onPointerUp(fakeEvent({ clientY: 40 })) })
    expect(onPlan).toHaveBeenCalledTimes(1)
    expect(onWatched).not.toHaveBeenCalled()
    expect(result.current.dragging).toBe(false)

    // Browsers fire a synthetic click after pointerup — it must not also navigate.
    act(() => { result.current.bind.onClick(fakeClick()) })
    expect(onTap).not.toHaveBeenCalled()
  })

  it('dragging into the bottom zone and releasing calls onWatched', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400 }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 780 })) // inside the bottom 96px band
    })
    expect(result.current.zone).toBe('watched')

    act(() => { result.current.bind.onPointerUp(fakeEvent({ clientY: 780 })) })
    expect(onWatched).toHaveBeenCalledTimes(1)
    expect(onPlan).not.toHaveBeenCalled()
  })

  it('dropping outside either zone calls neither list handler', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400 }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 350 })) // moved, but stayed mid-screen
    })
    expect(result.current.zone).toBeNull()

    act(() => { result.current.bind.onPointerUp(fakeEvent({ clientY: 350 })) })
    expect(onPlan).not.toHaveBeenCalled()
    expect(onWatched).not.toHaveBeenCalled()
  })

  it('ignores a press that starts on a nested button/link so its own onClick still works', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))
    const button = document.createElement('button')

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400, target: button }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 40 }))
    })
    expect(result.current.dragging).toBe(false)
  })

  it('is a no-op for mouse pointers — a plain click still fires onTap', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400, pointerType: 'mouse' }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 40, pointerType: 'mouse' }))
    })
    expect(result.current.dragging).toBe(false)

    act(() => { result.current.bind.onClick(fakeClick()) })
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('is a no-op on a fine (non-touch) pointer environment even for a touch-typed event', () => {
    mockPointerEnv(false)
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400 }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 40 }))
    })
    expect(result.current.dragging).toBe(false)
  })

  it('does nothing while disabled', () => {
    const onTap = vi.fn(), onPlan = vi.fn(), onWatched = vi.fn()
    const { result } = renderHook(() => useDragToAdd({ onPlan, onWatched, onTap, disabled: true }))

    act(() => {
      result.current.bind.onPointerDown(fakeEvent({ clientY: 400 }))
      result.current.bind.onPointerMove(fakeEvent({ clientY: 40 }))
      result.current.bind.onPointerUp(fakeEvent({ clientY: 40 }))
    })
    expect(result.current.dragging).toBe(false)
    expect(onPlan).not.toHaveBeenCalled()
    expect(onWatched).not.toHaveBeenCalled()
  })
})
