import { describe, expect, it } from 'vitest'

import { contrastRatio, hexToRgb, relativeLuminance } from './contrast'

describe('hexToRgb', () => {
  it('parses long and short hex notations', () => {
    expect(hexToRgb('#2C448B')).toEqual([44, 68, 139])
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })

  it('rejects anything that is not an opaque hex colour', () => {
    expect(() => hexToRgb('rgba(0, 0, 0, 0.08)')).toThrow()
  })
})

describe('contrastRatio', () => {
  it('gives 21:1 between black and white, whatever the order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
  })

  it('gives 1:1 for identical colours', () => {
    expect(contrastRatio('#666666', '#666666')).toBe(1)
  })

  it('matches the published ratio of a known pair', () => {
    expect(contrastRatio('#666666', '#FFFFFF')).toBeCloseTo(5.74, 2)
    expect(relativeLuminance('#FFFFFF')).toBe(1)
  })
})
