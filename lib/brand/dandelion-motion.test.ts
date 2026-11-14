import { describe, expect, it } from 'vitest'

import {
  buildPetalMotion,
  DANDELION_MOTION_PARAMS,
  DANDELION_PETALS,
  normalizePointer,
  petalCssVars,
  pointerOffsets
} from './dandelion-motion'

const length = (v: { x: number; y: number }) => Math.hypot(v.x, v.y)
const RECT = { left: 100, top: 200, width: 48, height: 48 }

describe('buildPetalMotion', () => {
  it('gives one motion per chevron, with unit axes', () => {
    expect(DANDELION_PETALS).toHaveLength(5)
    for (const { axis } of DANDELION_PETALS) expect(length(axis)).toBeCloseTo(1, 6)
  })

  it('ranks the petals 0 to 4 clockwise from twelve o’clock', () => {
    expect(DANDELION_PETALS.map(({ order }) => order).sort()).toEqual([0, 1, 2, 3, 4])
    const byOrder = [...DANDELION_PETALS].sort((a, b) => a.order - b.order)
    for (let i = 1; i < byOrder.length; i++) expect(byOrder[i].angle).toBeGreaterThan(byOrder[i - 1].angle)
  })

  it('spreads the petals all around the mark (the wave goes full circle)', () => {
    const angles = DANDELION_PETALS.map(({ angle }) => angle).sort((a, b) => a - b)
    const gaps = angles.map((angle, i) =>
      i === 0 ? angles[0] + 360 - angles[angles.length - 1] : angle - angles[i - 1]
    )
    expect(Math.max(...gaps)).toBeLessThan(120)
  })

  it('drifts every petal outward by the bloom distance', () => {
    for (const { axis, drift } of DANDELION_PETALS) {
      expect(length(drift)).toBeCloseTo(DANDELION_MOTION_PARAMS.bloomDrift, 1)
      expect(drift.x * axis.x + drift.y * axis.y).toBeGreaterThan(0)
    }
  })

  it('is deterministic', () => {
    expect(buildPetalMotion()).toEqual(buildPetalMotion())
  })
})

describe('normalizePointer', () => {
  it('maps the centre of the element to the origin', () => {
    expect(normalizePointer({ x: 124, y: 224 }, RECT)).toEqual({ x: 0, y: 0 })
  })

  it('maps the middle of an edge to a unit vector', () => {
    expect(normalizePointer({ x: 148, y: 224 }, RECT)).toEqual({ x: 1, y: 0 })
    expect(normalizePointer({ x: 124, y: 200 }, RECT)).toEqual({ x: 0, y: -1 })
  })

  it('clamps corners and outside points to the unit circle', () => {
    expect(length(normalizePointer({ x: 148, y: 248 }, RECT))).toBeCloseTo(1, 6)
    expect(length(normalizePointer({ x: 900, y: -900 }, RECT))).toBeCloseTo(1, 6)
  })

  it('stays at rest on an empty rectangle', () => {
    expect(normalizePointer({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('pointerOffsets', () => {
  it('does not move anything when the pointer is at the centre', () => {
    for (const offset of pointerOffsets({ x: 0, y: 0 })) expect(offset).toEqual({ x: 0, y: 0 })
  })

  it('opens the petal facing the pointer the most', () => {
    for (const target of DANDELION_PETALS) {
      const offsets = pointerOffsets(target.axis)
      const along = offsets.map(
        (offset, i) => offset.x * DANDELION_PETALS[i].axis.x + offset.y * DANDELION_PETALS[i].axis.y
      )
      const facing = DANDELION_PETALS.indexOf(target)
      expect(Math.max(...along)).toBe(along[facing])
    }
  })

  it('leans the whole mark toward the pointer', () => {
    const offsets = pointerOffsets({ x: 1, y: 0 })
    const mean = offsets.reduce((sum, { x }) => sum + x, 0) / offsets.length
    expect(mean).toBeGreaterThan(0)
  })

  it('stays within the documented amplitude', () => {
    const { hoverLean, hoverOpen } = DANDELION_MOTION_PARAMS
    for (let deg = 0; deg < 360; deg += 15) {
      const pointer = { x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) }
      for (const offset of pointerOffsets(pointer))
        expect(length(offset)).toBeLessThanOrEqual(hoverLean + hoverOpen + 0.01)
    }
  })
})

describe('petalCssVars', () => {
  it('exposes order and drift as CSS custom properties in user units', () => {
    const vars = petalCssVars(DANDELION_PETALS[0])
    expect(vars['--dm-order']).toMatch(/^[0-4]$/)
    expect(vars['--dm-drift-x']).toMatch(/^-?\d+(\.\d+)?px$/)
    expect(vars['--dm-drift-y']).toMatch(/^-?\d+(\.\d+)?px$/)
  })
})
