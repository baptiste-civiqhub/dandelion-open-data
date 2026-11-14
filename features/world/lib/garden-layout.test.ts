import { describe, expect, it } from 'vitest'

import type { Area } from '@/apis/areas/types'

import {
  arcsAroundAxes,
  GARDEN,
  isTreeFree,
  layoutChairs,
  layoutLamps,
  layoutStatues,
  layoutTrees,
  layoutWalkerPaths,
  PIGEON_HOMES
} from './garden-layout'
import { createRandom } from './seeded-random'
import { worldZonesFromAreas } from './world-zones'

const area = (slug: string, texteCount = 0): Area => ({
  id: slug,
  slug,
  name: slug,
  description: null,
  texteCount,
  tagIds: []
})
const DEMO = worldZonesFromAreas([
  area('plffg-2026', 1),
  area('demo-plf-2027'),
  area('demo-plfss-2027'),
  area('demo-energie-climat'),
  area('demo-ecole')
])

describe('garden layout', () => {
  it('keeps every zone inside the flowered lawn ring, whatever the number of zones', () => {
    for (const n of [1, 2, 5, 12, 40]) {
      const zones = worldZonesFromAreas(Array.from({ length: n }, (_, i) => area(`z-${i}`, i % 2)))
      for (const z of zones) expect(Math.hypot(z.x, z.z) + z.radius).toBeLessThanOrEqual(GARDEN.lawnInner)
    }
  })

  it('never plants a tree on a zone, the parterre or the bounds edge', () => {
    const trees = layoutTrees(DEMO, createRandom(7))
    expect(trees.length).toBeGreaterThan(300)
    for (const t of trees) {
      expect(Math.hypot(t.x, t.z)).toBeGreaterThan(GARDEN.alleeRadius)
      for (const z of DEMO) expect(Math.hypot(t.x - z.x, t.z - z.z)).toBeGreaterThan(z.radius)
    }
  })

  it('keeps lamps, statues and chairs off the zones', () => {
    const things = [...layoutLamps(), ...layoutStatues(), ...layoutChairs(createRandom(3)), ...PIGEON_HOMES]
    for (const p of things)
      for (const z of DEMO) expect(Math.hypot(p.x - z.x, p.z - z.z)).toBeGreaterThan(z.radius + 0.5)
  })

  it('opens the ring on the four axes', () => {
    const arcs = arcsAroundAxes(GARDEN.ringRadius, 3.5)
    expect(arcs).toHaveLength(4)
    for (const arc of arcs) expect(arc.a1).toBeGreaterThan(arc.a0)
  })

  it('gives every walker path at least two points', () => {
    for (const p of layoutWalkerPaths()) expect(p.points.length).toBeGreaterThanOrEqual(2)
  })

  it('leaves the start position free', () => {
    expect(isTreeFree(GARDEN.start.x, GARDEN.start.z, DEMO)).toBe(false)
    for (const z of DEMO) expect(Math.hypot(GARDEN.start.x - z.x, GARDEN.start.z - z.z)).toBeGreaterThan(z.radius)
  })
})
