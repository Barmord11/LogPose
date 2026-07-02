import { describe, it, expect } from 'vitest'
import { reducer, DEFAULT_STATE, navigatorLevel, formatWatchTime, type AppState } from './reducer'

const base = (): AppState => structuredClone(DEFAULT_STATE)

describe('list membership', () => {
  it('adds to watched', () => {
    const s = reducer(base(), { type: 'ADD_TO_WATCHED', id: 1 })
    expect(s.watchedList).toEqual([1])
  })

  it('does not duplicate in watched', () => {
    let s = reducer(base(), { type: 'ADD_TO_WATCHED', id: 1 })
    s = reducer(s, { type: 'ADD_TO_WATCHED', id: 1 })
    expect(s.watchedList).toEqual([1])
  })

  it('moving to watched removes from plan (mutually exclusive lists)', () => {
    let s = reducer(base(), { type: 'ADD_TO_PLAN', id: 1 })
    s = reducer(s, { type: 'ADD_TO_WATCHED', id: 1 })
    expect(s.planToWatchList).toEqual([])
    expect(s.watchedList).toEqual([1])
  })

  it('moving to plan removes from watched', () => {
    let s = reducer(base(), { type: 'ADD_TO_WATCHED', id: 1 })
    s = reducer(s, { type: 'ADD_TO_PLAN', id: 1 })
    expect(s.watchedList).toEqual([])
    expect(s.planToWatchList).toEqual([1])
  })

  it('REMOVE_FROM_LIST clears both lists', () => {
    let s = reducer(base(), { type: 'ADD_TO_WATCHED', id: 1 })
    s = reducer(s, { type: 'ADD_TO_PLAN', id: 2 })
    s = reducer(s, { type: 'REMOVE_FROM_LIST', id: 1 })
    s = reducer(s, { type: 'REMOVE_FROM_LIST', id: 2 })
    expect(s.watchedList).toEqual([])
    expect(s.planToWatchList).toEqual([])
  })
})

describe('favorites', () => {
  it('toggles on and off', () => {
    let s = reducer(base(), { type: 'TOGGLE_FAVORITE', id: 3 })
    expect(s.favorites).toEqual([3])
    s = reducer(s, { type: 'TOGGLE_FAVORITE', id: 3 })
    expect(s.favorites).toEqual([])
  })
})

describe('ratings', () => {
  it('sets a rating', () => {
    const s = reducer(base(), { type: 'SET_RATING', id: 1, rating: 'up' })
    expect(s.ratings[1]).toBe('up')
  })

  it('same direction twice toggles off', () => {
    let s = reducer(base(), { type: 'SET_RATING', id: 1, rating: 'up' })
    s = reducer(s, { type: 'SET_RATING', id: 1, rating: 'up' })
    expect(s.ratings[1]).toBeNull()
  })

  it('opposite direction replaces', () => {
    let s = reducer(base(), { type: 'SET_RATING', id: 1, rating: 'up' })
    s = reducer(s, { type: 'SET_RATING', id: 1, rating: 'down' })
    expect(s.ratings[1]).toBe('down')
  })
})

describe('episode tracking', () => {
  it('toggles an episode on and off', () => {
    let s = reducer(base(), { type: 'TOGGLE_EPISODE', animeId: 1, episode: 3 })
    expect(s.watchedEpisodes[1]).toEqual([3])
    s = reducer(s, { type: 'TOGGLE_EPISODE', animeId: 1, episode: 3 })
    expect(s.watchedEpisodes[1]).toEqual([])
  })

  it('keeps episodes sorted', () => {
    let s = base()
    for (const ep of [5, 1, 3]) s = reducer(s, { type: 'TOGGLE_EPISODE', animeId: 1, episode: ep })
    expect(s.watchedEpisodes[1]).toEqual([1, 3, 5])
  })

  it('marks and clears all episodes', () => {
    let s = reducer(base(), { type: 'MARK_ALL_EPISODES', animeId: 2, total: 4 })
    expect(s.watchedEpisodes[2]).toEqual([1, 2, 3, 4])
    s = reducer(s, { type: 'CLEAR_ALL_EPISODES', animeId: 2 })
    expect(s.watchedEpisodes[2]).toEqual([])
  })
})

describe('immutability', () => {
  it('never mutates the input state', () => {
    const s = base()
    const frozen = Object.freeze(structuredClone(s))
    reducer(s, { type: 'ADD_TO_WATCHED', id: 1 })
    reducer(s, { type: 'TOGGLE_EPISODE', animeId: 1, episode: 1 })
    expect(s).toEqual(frozen)
  })
})

describe('navigatorLevel', () => {
  it('starts at 1 and gains a level every 3 series', () => {
    expect(navigatorLevel(0)).toBe(1)
    expect(navigatorLevel(2)).toBe(1)
    expect(navigatorLevel(3)).toBe(2)
    expect(navigatorLevel(9)).toBe(4)
  })
})

describe('formatWatchTime (Time at Sea)', () => {
  it('formats minutes under an hour', () => {
    expect(formatWatchTime(0)).toBe('0m')
    expect(formatWatchTime(2)).toBe('46m')
  })

  it('formats hours with remainder minutes', () => {
    expect(formatWatchTime(3)).toBe('1h 9m')     // 69 min
    expect(formatWatchTime(12)).toBe('4h 36m')   // 276 min
  })

  it('drops zero remainders', () => {
    expect(formatWatchTime(60)).toBe('23h')      // 1380 min exactly
  })

  it('formats days once past 24h', () => {
    expect(formatWatchTime(63)).toBe('1d')       // 1449 min = 24h9m → 24h floor → 1d 0h → "1d"
    expect(formatWatchTime(100)).toBe('1d 14h')  // 2300 min = 38h20m → 38h → 1d 14h
  })
})
