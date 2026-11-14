import { describe, expect, it } from 'vitest'

import {
  DIVE_DURATION_MS,
  DIVE_MAX_SCALE,
  diveFade,
  diveFlowerScale,
  diveProgress,
  diveTarget,
  easeInOutCubic,
  lerpVec
} from './dive'

describe('dive', () => {
  it('eases from 0 to 1', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6)
  })

  it('ends right above the flower head, looking down', () => {
    const { position, look } = diveTarget({ x: 3, z: -4 }, 8, 2.4)
    expect(look).toEqual({ x: 3, y: 8, z: -4 })
    expect(position.y - look.y).toBeGreaterThan(2.4 * DIVE_MAX_SCALE)
    expect(Math.hypot(position.x - look.x, position.z - look.z)).toBeLessThan(0.5)
  })

  it('fades to the page background only at the end', () => {
    expect(diveFade(0.5)).toBe(0)
    expect(diveFade(1)).toBe(1)
    expect(diveProgress(DIVE_DURATION_MS * 2)).toBe(1)
  })

  it('grows the flower', () => {
    expect(diveFlowerScale(0)).toBe(1)
    expect(diveFlowerScale(1)).toBeCloseTo(DIVE_MAX_SCALE, 6)
    expect(lerpVec({ x: 0, y: 0, z: 0 }, { x: 2, y: 4, z: 6 }, 0.5)).toEqual({ x: 1, y: 2, z: 3 })
  })
})
