import { describe, expect, it } from 'vitest'

import {
  LANDING_INTRO_MARK_MS,
  isLandingHeaderParked,
  landingIntroPhaseAfter,
  landingVeilOpacityClass,
  type LandingIntroContext
} from './landing-intro'

const waiting: LandingIntroContext = { holdElapsed: false, worldReady: false }
const held: LandingIntroContext = { holdElapsed: true, worldReady: false }
const drawn: LandingIntroContext = { holdElapsed: false, worldReady: true }
const ready: LandingIntroContext = { holdElapsed: true, worldReady: true }

describe('landingIntroPhaseAfter', () => {
  it('keeps the mark solid until the hold has elapsed and the garden has drawn', () => {
    expect(landingIntroPhaseAfter('mark', 'sync', waiting)).toBe('mark')
    expect(landingIntroPhaseAfter('mark', 'sync', held)).toBe('mark')
    expect(landingIntroPhaseAfter('mark', 'sync', drawn)).toBe('mark')
  })

  it('sheers the field once both the hold and the first frame are done', () => {
    expect(landingIntroPhaseAfter('mark', 'sync', ready)).toBe('veil')
    expect(landingIntroPhaseAfter('veil', 'sync', ready)).toBe('veil')
  })

  it('opens on a key from either phase, even before the garden is ready', () => {
    expect(landingIntroPhaseAfter('mark', 'key', waiting)).toBe('open')
    expect(landingIntroPhaseAfter('veil', 'key', ready)).toBe('open')
  })

  it('stays open once the curtain is lifted', () => {
    expect(landingIntroPhaseAfter('open', 'sync', waiting)).toBe('open')
    expect(landingIntroPhaseAfter('open', 'key', ready)).toBe('open')
  })
})

describe('isLandingHeaderParked', () => {
  it('parks the header only on the home page while the curtain is up', () => {
    expect(isLandingHeaderParked(true, 'mark')).toBe(true)
    expect(isLandingHeaderParked(true, 'veil')).toBe(true)
    expect(isLandingHeaderParked(true, 'open')).toBe(false)
    expect(isLandingHeaderParked(false, 'mark')).toBe(false)
  })
})

describe('landingVeilOpacityClass', () => {
  it('is solid for the mark and sheer once the garden may be guessed', () => {
    expect(landingVeilOpacityClass('mark')).toBe('opacity-100')
    expect(landingVeilOpacityClass('veil')).toBe('opacity-90')
    expect(landingVeilOpacityClass('open')).toBe('opacity-90')
  })
})

describe('LANDING_INTRO_MARK_MS', () => {
  it('holds the mark between one and two seconds', () => {
    expect(LANDING_INTRO_MARK_MS).toBeGreaterThanOrEqual(1000)
    expect(LANDING_INTRO_MARK_MS).toBeLessThanOrEqual(2000)
  })
})
