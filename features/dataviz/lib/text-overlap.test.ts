import { describe, expect, it } from 'vitest'

import { countWords, textOverlap, wordsOf } from './text-overlap'

describe('wordsOf / countWords', () => {
  it('splits on letters and digits, lowercased, accents kept', () => {
    expect(wordsOf("Supprimer l'alinéa 3 du II.")).toEqual(['supprimer', 'l', 'alinéa', '3', 'du', 'ii'])
    expect(countWords(null)).toBe(0)
    expect(countWords('  ')).toBe(0)
  })
})

describe('textOverlap', () => {
  it('reports identical texts regardless of punctuation and case', () => {
    expect(textOverlap('Supprimer cet article.', 'supprimer  cet article')).toEqual({
      similarity: 1,
      sharedWords: 3,
      onlyInFirst: 0,
      onlyInSecond: 0,
      isIdentical: true
    })
  })

  it('counts distinct shared and specific words (3 letters or more)', () => {
    const overlap = textOverlap('Le taux est porté à 20 %', 'Le taux est porté à 30 % en 2027')
    expect(overlap).toMatchObject({ sharedWords: 3, onlyInFirst: 0, onlyInSecond: 1, isIdentical: false })
    expect(overlap?.similarity).toBeCloseTo(3 / 4)
  })

  it('keeps amounts and years as distinct words', () => {
    expect(textOverlap('jusqu’en 2026', 'jusqu’en 2030')?.isIdentical).toBe(false)
  })

  it('returns null when a text is missing', () => {
    expect(textOverlap('texte', '')).toBeNull()
    expect(textOverlap(null, 'texte')).toBeNull()
  })
})
