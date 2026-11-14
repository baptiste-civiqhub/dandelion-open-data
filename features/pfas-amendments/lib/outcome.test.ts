import { describe, expect, it } from 'vitest'

import { classifyOutcome } from './outcome'

describe('classifyOutcome', () => {
  it('keeps the official Senate labels distinct', () => {
    expect(classifyOutcome('Adopté')).toBe('adopted')
    expect(classifyOutcome('Rejeté')).toBe('rejected')
    expect(classifyOutcome('Retiré')).toBe('withdrawn')
    expect(classifyOutcome('Irrecevable art. 40 C')).toBe('inadmissible')
  })

  it('never turns a withdrawn amendment into a rejection', () => {
    expect(classifyOutcome('Retiré')).not.toBe('rejected')
  })

  it('does not infer a vote from a missing outcome', () => {
    expect(classifyOutcome(null)).toBe('none')
    expect(classifyOutcome('  ')).toBe('none')
  })

  it('preserves unknown labels as other', () => {
    expect(classifyOutcome('Satisfait')).toBe('other')
  })
})
