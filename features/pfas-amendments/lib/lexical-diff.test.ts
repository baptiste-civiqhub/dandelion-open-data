import { describe, expect, it } from 'vitest'

import { diffTexts, tokenize, toSegments, uniquePassages } from './lexical-diff'

const A26 =
  'Alinéa 9\n\nAprès les mots :\n\nutilisations essentielles\n\ninsérer les mots :\n\n, des textiles de construction'
const A27 = `${A26} utilisant des fluoropolymères`
const A28 = 'Alinéa 9\n\nAprès les mots :\n\nutilisations essentielles\n\ninsérer les mots :\n\n, des fluoropolymères'

describe('tokenize', () => {
  it('keeps punctuation, numbers and words with internal apostrophes', () => {
    expect(tokenize('l’importation, à compter du 1er janvier 2030.').map((t) => t.text)).toEqual([
      'l’importation',
      ',',
      'à',
      'compter',
      'du',
      '1er',
      'janvier',
      '2030',
      '.'
    ])
  })

  it('returns no token for an empty text', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('diffTexts', () => {
  it('reports only the words that 27 adds to 26', () => {
    const diff = diffTexts(A26, A27)!
    expect(diff.onlyInA).toBe(0)
    expect(uniquePassages(A27, diff.b)).toEqual(['utilisant des fluoropolymères'])
  })

  it('shows 26 and 28 as different scopes, not as the same exception', () => {
    const diff = diffTexts(A26, A28)!
    expect(uniquePassages(A26, diff.a)).toEqual(['textiles de construction'])
    expect(uniquePassages(A28, diff.b)).toEqual(['fluoropolymères'])
  })

  it('detects date and amount changes', () => {
    const diff = diffTexts('à compter du 1er janvier 2026', 'à compter du 1er janvier 2030')!
    expect(uniquePassages('à compter du 1er janvier 2026', diff.a)).toEqual(['2026'])
    expect(diffTexts('100 euros', '1 000 euros')!.onlyInB).toBe(2)
  })

  it('treats negation and punctuation as differences', () => {
    expect(diffTexts('est interdit', 'n’est pas interdit')!.onlyInB).toBe(2)
    expect(diffTexts('substitution,', 'substitution')!.onlyInA).toBe(1)
  })

  it('distinguishes ellipsis variants unless typography is ignored', () => {
    const a = '« …. – Sont interdites'
    const b = '«... – Sont interdites'
    expect(diffTexts(a, b)!.onlyInA).toBe(1)
    expect(diffTexts(a, b, { ignoreTypography: true })!.onlyInA).toBe(0)
    expect(diffTexts('l’usage', "l'usage", { ignoreTypography: true })!.onlyInA).toBe(0)
  })

  it('reports identical texts as fully shared', () => {
    const diff = diffTexts(A26, A26)!
    expect([diff.onlyInA, diff.onlyInB]).toEqual([0, 0])
    expect(diff.shared).toBe(tokenize(A26).length)
  })

  it('refuses inputs larger than the cell budget', () => {
    expect(diffTexts('a b c', 'a b c', { maxCells: 4 })).toBeNull()
  })
})

describe('toSegments', () => {
  it('reconstructs the original text exactly, paragraph breaks included', () => {
    const diff = diffTexts(A26, A27)!
    expect(
      toSegments(A27, diff.b)
        .map((s) => s.text)
        .join('')
    ).toBe(A27)
  })
})
