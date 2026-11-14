import { describe, expect, it } from 'vitest'

import { ATLAS_SIZE, layoutAtlas, shortenAtlasLabel } from './atlas-layout'

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('layoutAtlas', () => {
  it('returns no placement without areas', () => {
    expect(layoutAtlas([])).toEqual([])
  })

  it('puts a single area at the centre of the map', () => {
    expect(layoutAtlas(['only'])).toEqual([{ id: 'only', x: ATLAS_SIZE / 2, y: ATLAS_SIZE / 2 }])
  })

  it('keeps the order and the ids of the areas', () => {
    expect(layoutAtlas(['a', 'b', 'c']).map((placement) => placement.id)).toEqual(['a', 'b', 'c'])
  })

  it('is deterministic', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    expect(layoutAtlas(ids)).toEqual(layoutAtlas(ids))
  })

  it('keeps every area inside the padded square', () => {
    const padding = 18
    const ids = Array.from({ length: 40 }, (_, index) => `area-${index}`)
    for (const placement of layoutAtlas(ids, { padding })) {
      expect(placement.x).toBeGreaterThanOrEqual(padding)
      expect(placement.x).toBeLessThanOrEqual(ATLAS_SIZE - padding)
      expect(placement.y).toBeGreaterThanOrEqual(padding)
      expect(placement.y).toBeLessThanOrEqual(ATLAS_SIZE - padding)
    }
  })

  it('never stacks two areas on the same spot', () => {
    const placements = layoutAtlas(Array.from({ length: 12 }, (_, index) => `area-${index}`))
    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        expect(distance(placements[i], placements[j])).toBeGreaterThan(8)
      }
    }
  })

  it('scales with the size of the square', () => {
    const [first] = layoutAtlas(['a', 'b'], { size: 200, padding: 20 })
    expect(first.x).toBeCloseTo(100, 1)
    expect(first.y).toBeLessThan(100)
  })
})

describe('shortenAtlasLabel', () => {
  it('keeps a short label untouched', () => {
    expect(shortenAtlasLabel('École')).toBe('École')
  })

  it('cuts a long label on a word and adds an ellipsis', () => {
    const short = shortenAtlasLabel('Projet de loi de finances de fin de gestion pour 2026')
    expect(short).toBe('Projet de loi de…')
    expect(short.length).toBeLessThanOrEqual(22)
  })

  it('cuts inside a word when there is no usable space', () => {
    expect(shortenAtlasLabel('Anticonstitutionnellement long', 10)).toBe('Anticonst…')
  })
})
