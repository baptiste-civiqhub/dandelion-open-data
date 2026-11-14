import { describe, expect, it } from 'vitest'

import { computeStageSize, DEFAULT_MAX_PIXEL_RATIO, isSameStageSize } from './stage-scene'

describe('computeStageSize', () => {
  it('scales the drawing buffer by the device pixel ratio', () => {
    expect(computeStageSize(800, 600, 2)).toEqual({
      width: 800,
      height: 600,
      pixelRatio: 2,
      pixelWidth: 1600,
      pixelHeight: 1200
    })
  })

  it('caps the pixel ratio', () => {
    expect(computeStageSize(100, 100, 4).pixelRatio).toBe(DEFAULT_MAX_PIXEL_RATIO)
    expect(computeStageSize(100, 100, 4, 3).pixelWidth).toBe(300)
  })

  it('never goes below one pixel per CSS pixel nor below a 1×1 buffer', () => {
    expect(computeStageSize(100, 100, 0.5).pixelRatio).toBe(1)
    expect(computeStageSize(100, 100, 0).pixelRatio).toBe(1)
    const empty = computeStageSize(0, -10, 2)
    expect([empty.width, empty.height, empty.pixelWidth, empty.pixelHeight]).toEqual([0, 0, 1, 1])
  })

  it('rounds fractional sizes to whole pixels', () => {
    const size = computeStageSize(333.3, 100.4, 1.5)
    expect(Number.isInteger(size.pixelWidth) && Number.isInteger(size.pixelHeight)).toBe(true)
    expect(size.pixelWidth).toBe(500)
  })
})

describe('isSameStageSize', () => {
  it('compares drawing buffers, not CSS sizes', () => {
    expect(isSameStageSize(computeStageSize(100, 100, 2), computeStageSize(100.1, 100.1, 2))).toBe(true)
    expect(isSameStageSize(computeStageSize(100, 100, 2), computeStageSize(100, 100, 1))).toBe(false)
  })
})
