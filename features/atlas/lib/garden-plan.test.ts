import { describe, expect, it } from 'vitest'

import type { Area } from '@/apis/areas/types'
import { GARDEN } from '@/features/world/lib/garden-layout'
import { worldZonesFromAreas } from '@/features/world/lib/world-zones'

import { layoutGardenPlan, placeAtlasLabel, poseMarkerRotation, type GardenPlanMark } from './garden-plan'

const area = (slug: string, texteCount = 0): Area => ({
  id: slug,
  slug,
  name: slug,
  description: null,
  texteCount,
  tagIds: []
})

const boxOf = (mark: GardenPlanMark) => {
  if (mark.kind === 'rect' || mark.kind === 'stroke-rect') {
    return { x0: mark.x, y0: mark.y, x1: mark.x + mark.width, y1: mark.y + mark.height }
  }
  if (mark.kind === 'circle' || mark.kind === 'stroke-circle') {
    return { x0: mark.cx - mark.r, y0: mark.cy - mark.r, x1: mark.cx + mark.r, y1: mark.cy + mark.r }
  }
  const pairs = mark.points.split(' ').map((pair) => pair.split(',').map(Number))
  const xs = pairs.map((pair) => pair[0])
  const ys = pairs.map((pair) => pair[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

describe('layoutGardenPlan', () => {
  const plan = layoutGardenPlan()

  it('frames the same rectangle as the ground painted in the world', () => {
    expect(plan.viewBox).toEqual({
      x: GARDEN.plan.x0,
      y: GARDEN.plan.z0,
      width: GARDEN.plan.x1 - GARDEN.plan.x0,
      height: GARDEN.plan.z1 - GARDEN.plan.z0
    })
  })

  it('keeps every shape inside that frame', () => {
    for (const mark of plan.marks) {
      const box = boxOf(mark)
      expect(box.x0).toBeGreaterThanOrEqual(plan.viewBox.x - 0.1)
      expect(box.y0).toBeGreaterThanOrEqual(plan.viewBox.y - 0.1)
      expect(box.x1).toBeLessThanOrEqual(plan.viewBox.x + plan.viewBox.width + 0.1)
      expect(box.y1).toBeLessThanOrEqual(plan.viewBox.y + plan.viewBox.height + 0.1)
    }
  })

  it('draws the grand basin where the garden puts it', () => {
    const water = plan.marks.filter((mark) => mark.kind === 'polygon' && mark.fill === 'water')
    expect(water).toHaveLength(1)
    const basin = water[0]
    if (basin.kind !== 'polygon') return
    const center = boxOf(basin)
    expect((center.x0 + center.x1) / 2).toBeCloseTo(GARDEN.basin.x, 1)
    expect((center.y0 + center.y1) / 2).toBeCloseTo(GARDEN.basin.z, 1)
  })

  it('draws a gravel path across the centre of the parterre', () => {
    const crosses = plan.marks.some(
      (mark) =>
        mark.kind === 'rect' &&
        mark.fill === 'gravel' &&
        mark.x <= 0 &&
        mark.x + mark.width >= 0 &&
        mark.y <= 0 &&
        mark.y + mark.height >= 0
    )
    expect(crosses).toBe(true)
  })

  it('keeps the five dataset flowers inside the parterre', () => {
    const parterre = plan.marks.find((mark) => mark.kind === 'circle' && mark.fill === 'gravel' && mark.r > 40)
    expect(parterre?.kind).toBe('circle')
    if (parterre?.kind !== 'circle') return
    const zones = worldZonesFromAreas([
      area('plffg-2026', 1),
      area('demo-plf-2027'),
      area('demo-plfss-2027'),
      area('demo-energie-climat'),
      area('demo-ecole')
    ])
    expect(zones).toHaveLength(5)
    for (const zone of zones) expect(Math.hypot(zone.x, zone.z) + zone.radius).toBeLessThanOrEqual(parterre.r)
  })

  it('is deterministic', () => {
    expect(layoutGardenPlan()).toEqual(plan)
  })
})

describe('placeAtlasLabel', () => {
  it('pushes a label outward, past the flower', () => {
    const label = placeAtlasLabel(20, 0)
    expect(label.x).toBeGreaterThan(20)
    expect(label.anchor).toBe('start')
    expect(label.fromX).toBeGreaterThan(20)
    expect(label.fromX).toBeLessThan(label.x)
  })

  it('puts the label of a northern flower further north', () => {
    const label = placeAtlasLabel(0, -12)
    expect(label.y).toBeLessThan(-12)
    expect(label.anchor).toBe('middle')
    expect(label.baseline).toBe('auto')
  })

  it('returns a finite placement for a broken position', () => {
    const label = placeAtlasLabel(Number.NaN, 4)
    expect(Number.isFinite(label.x)).toBe(true)
    expect(Number.isFinite(label.y)).toBe(true)
  })
})

describe('poseMarkerRotation', () => {
  it('points a north-facing arrow up when heading is 0', () => {
    expect(poseMarkerRotation(0)).toBe(0)
  })

  it('turns the arrow west when heading is a quarter turn', () => {
    expect(poseMarkerRotation(Math.PI / 2)).toBe(-90)
  })

  it('returns 0 for a heading that is not a number', () => {
    expect(poseMarkerRotation(Number.NaN)).toBe(0)
  })
})
