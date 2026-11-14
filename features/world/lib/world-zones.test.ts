import { describe, expect, it } from 'vitest'

import type { Area } from '@/apis/areas/types'
import { layoutAtlas, orderAtlasAreas } from '@/features/atlas/lib/atlas-layout'

import { worldZonesFromAreas, zoneAt } from './world-zones'

const makeArea = (overrides: Partial<Area> = {}): Area => ({
  id: 'area',
  slug: 'area',
  name: 'Area',
  description: null,
  texteCount: 0,
  tagIds: [],
  ...overrides
})

const areas = [
  makeArea({ id: 'a', slug: 'demo-b' }),
  makeArea({ id: 'b', slug: 'plffg-2026', texteCount: 1, tagIds: ['t1'] }),
  makeArea({ id: 'c', slug: 'demo-a' })
]

describe('worldZonesFromAreas', () => {
  it('returns no zone without areas', () => {
    expect(worldZonesFromAreas([])).toEqual([])
  })

  it('puts the areas with data first, then sorts by slug, like the atlas', () => {
    expect(worldZonesFromAreas(areas).map((zone) => zone.slug)).toEqual(['plffg-2026', 'demo-a', 'demo-b'])
  })

  it('places each zone where the atlas draws it, centred on the origin', () => {
    const ordered = orderAtlasAreas(areas)
    const placements = layoutAtlas(ordered.map((area) => area.id))
    worldZonesFromAreas(areas).forEach((zone, index) => {
      expect(zone.x).toBeCloseTo(placements[index].x - 50)
      expect(zone.z).toBeCloseTo(placements[index].y - 50)
    })
  })

  it('scales positions and radius with the world size', () => {
    const [small] = worldZonesFromAreas(areas)
    const [large] = worldZonesFromAreas(areas, { worldSize: 200 })
    expect(large.z).toBeCloseTo(small.z * 2)
    expect(large.radius).toBeCloseTo(small.radius * 2)
  })

  it('keeps every zone inside the world', () => {
    const many = Array.from({ length: 30 }, (_, index) => makeArea({ id: `${index}`, slug: `zone-${index}` }))
    for (const zone of worldZonesFromAreas(many)) {
      expect(Math.abs(zone.x) + zone.radius).toBeLessThanOrEqual(50)
      expect(Math.abs(zone.z) + zone.radius).toBeLessThanOrEqual(50)
    }
  })

  it('marks the zones that have data and keeps their tags', () => {
    const [first, second] = worldZonesFromAreas(areas)
    expect(first).toMatchObject({ hasData: true, tagIds: ['t1'] })
    expect(second.hasData).toBe(false)
  })
})

describe('zoneAt', () => {
  const zones = worldZonesFromAreas(areas)

  it('finds the zone under a ground position', () => {
    expect(zoneAt(zones, zones[1].x, zones[1].z)?.slug).toBe(zones[1].slug)
    expect(zoneAt(zones, zones[1].x + zones[1].radius * 0.9, zones[1].z)?.slug).toBe(zones[1].slug)
  })

  it('returns null outside every zone', () => {
    expect(zoneAt(zones, 1000, 1000)).toBeNull()
    expect(zoneAt([], 0, 0)).toBeNull()
  })

  it('picks the closest zone when two overlap', () => {
    const overlap = [
      { ...zones[0], slug: 'far', x: 0, z: 0, radius: 10 },
      { ...zones[0], slug: 'near', x: 4, z: 0, radius: 10 }
    ]
    expect(zoneAt(overlap, 3, 0)?.slug).toBe('near')
  })
})
