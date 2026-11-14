import { describe, expect, it } from 'vitest'

import { extractNumbers, isQuestionTooLong, normalizeQuestion } from './question'

describe('normalizeQuestion', () => {
  it('lowercases, strips accents and turns punctuation and apostrophes into spaces', () => {
    expect(normalizeQuestion('  Montre l’amendement n°32 ?! ')).toBe('montre l amendement n 32')
    expect(normalizeQuestion('Différences ÉCARTS')).toBe('differences ecarts')
  })
})

describe('extractNumbers', () => {
  it('keeps standalone numbers in order, deduplicated, never parts of ordinals', () => {
    expect(extractNumbers('compare 26 et 2 puis 26')).toEqual(['26', '2'])
    expect(extractNumbers('article 1er amendement 032')).toEqual(['32'])
  })
})

describe('isQuestionTooLong', () => {
  it('enforces the 600 character limit', () => {
    expect(isQuestionTooLong('a'.repeat(600))).toBe(false)
    expect(isQuestionTooLong('a'.repeat(601))).toBe(true)
  })
})
