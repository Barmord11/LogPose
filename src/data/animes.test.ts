import { describe, it, expect } from 'vitest'
import { animes, genres, filterChips } from './animes'

describe('catalogue integrity', () => {
  it('anime ids are unique', () => {
    const ids = animes.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every anime has a watch link, cover, and at least one genre', () => {
    for (const a of animes) {
      expect(a.watchUrl).toMatch(/^https:\/\//)
      expect(a.cover.length).toBeGreaterThan(0)
      expect(a.genres.length).toBeGreaterThan(0)
    }
  })

  it('liked/disliked always sums to 100', () => {
    for (const a of animes) expect(a.liked + a.disliked).toBe(100)
  })
})

describe('genre cards as filters', () => {
  it('every genre card matches at least one anime (no dead filters)', () => {
    for (const g of genres) {
      const matches = animes.filter(a => a.genres.some(tag => g.matchTags.includes(tag)))
      expect(matches.length, `genre "${g.label}" matches nothing`).toBeGreaterThan(0)
    }
  })
})

describe('filter chips as filters', () => {
  it('every chip matches at least one anime (no dead filters)', () => {
    for (const chip of filterChips) {
      const matches = animes.filter(chip.test)
      expect(matches.length, `chip "${chip.label}" matches nothing`).toBeGreaterThan(0)
    }
  })

  it('chip labels are unique', () => {
    const labels = filterChips.map(c => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
