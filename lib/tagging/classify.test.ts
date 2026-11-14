import { describe, expect, it } from 'vitest'

import {
  buildClassifierRequest,
  DISPOSITIF_CHARACTER_BUDGET,
  parseClassifierAnswers,
  splitVocabulary,
  truncateDispositif,
  unionArticleTags,
  type TagDefinition
} from './classify'

const makeTag = (overrides: Partial<TagDefinition> = {}): TagDefinition => ({
  slug: 'budget',
  label: 'Budget',
  category: 'budget',
  rule: 'The article opens a state expenditure.',
  ...overrides
})

const FIXTURE: readonly TagDefinition[] = [
  makeTag(),
  makeTag({ slug: 'sante', label: 'Health', category: 'sante', rule: 'The article changes hospital funding.' }),
  makeTag({ slug: 'ecole', label: 'School', category: 'savoir', rule: 'The article changes compulsory schooling.' })
]

describe('truncateDispositif', () => {
  it('keeps a short text and a null text', () => {
    expect(truncateDispositif(null)).toBeNull()
    expect(truncateDispositif('court')).toBe('court')
  })

  it('cuts at the budget and returns an empty string when the budget is zero', () => {
    expect(truncateDispositif('abcdef', 3)).toBe('abc')
    expect(truncateDispositif('abcdef', 0)).toBe('')
    const atBudget = truncateDispositif('a'.repeat(DISPOSITIF_CHARACTER_BUDGET))
    if (atBudget === null) throw new Error('expected a string')
    expect(atBudget).toHaveLength(DISPOSITIF_CHARACTER_BUDGET)
  })
})

describe('splitVocabulary', () => {
  it('returns one wave under the limit and two waves of fifty for a hundred tags', () => {
    expect(splitVocabulary(FIXTURE)).toHaveLength(1)
    expect(splitVocabulary([])).toEqual([])
    expect(
      splitVocabulary(
        Array.from({ length: 100 }, (_, index) => index),
        50
      )
    ).toEqual([Array.from({ length: 50 }, (_, index) => index), Array.from({ length: 50 }, (_, index) => index + 50)])
  })

  it('returns nothing when the wave size is not positive', () => {
    expect(splitVocabulary(FIXTURE, 0)).toEqual([])
  })
})

describe('buildClassifierRequest', () => {
  it('asks one yes or no question per tag and maps the article fields', () => {
    const article = { designation: 'ART. 2', title: 'Plafond', dispositif: 'Le plafond est abaissé.' }
    const request = buildClassifierRequest(FIXTURE, article, 'featherless-ai/Qwen3.5-4B-classifier')

    expect(request.model).toBe('featherless-ai/Qwen3.5-4B-classifier')
    expect(request.state).toEqual({
      designation: 'ART. 2',
      titre: 'Plafond',
      dispositif: 'Le plafond est abaissé.'
    })
    expect(request.questions.budget).toEqual({
      type: 'noul',
      instructions: "Ce sujet s'applique-t-il à cet article de loi ?",
      criteria: {
        true: 'The article opens a state expenditure.',
        false: "L'article ne porte pas sur ce sujet."
      }
    })
    expect(Object.keys(request.questions)).toEqual(['budget', 'sante', 'ecole'])
  })

  it('truncates only the copy sent to the classifier', () => {
    const article = { designation: null, title: null, dispositif: 'abcdef' }
    const request = buildClassifierRequest(FIXTURE, article, 'model', { truncateDispositif: true })

    expect(request.state.dispositif).toBe('abcdef')
    expect(
      buildClassifierRequest([makeTag()], { ...article, dispositif: 'abcdefghij' }, 'model', {
        truncateDispositif: true
      }).state.dispositif
    ).toBe('abcdefghij')
  })

  it('uses the character budget when truncation is requested', () => {
    const dispositif = 'x'.repeat(DISPOSITIF_CHARACTER_BUDGET + 25)
    const request = buildClassifierRequest([makeTag()], { designation: null, title: null, dispositif }, 'model', {
      truncateDispositif: true
    })

    expect(request.state.dispositif).toHaveLength(DISPOSITIF_CHARACTER_BUDGET)
    expect(dispositif).toHaveLength(DISPOSITIF_CHARACTER_BUDGET + 25)
  })
})

describe('parseClassifierAnswers', () => {
  it('keeps known tags at or above the threshold', () => {
    expect(
      parseClassifierAnswers(
        {
          budget: { type: 'noul', noul: 0.5 },
          sante: { type: 'noul', noul: 0.91 }
        },
        FIXTURE
      )
    ).toEqual([
      { slug: 'budget', confidence: 0.5 },
      { slug: 'sante', confidence: 0.91 }
    ])
  })

  it('drops unknown slugs, low scores, and answers that are not a finite noul score', () => {
    expect(
      parseClassifierAnswers(
        {
          budget: { type: 'noul', noul: 0.49 },
          sante: { type: 'choice', noul: 0.9 },
          ecole: { type: 'noul', noul: '0.8' },
          inconnu: { type: 'noul', noul: 0.99 },
          hors: { type: 'noul', noul: Number.NaN }
        },
        FIXTURE
      )
    ).toEqual([])
  })

  it('returns nothing for an empty payload or a payload that is not an object', () => {
    expect(parseClassifierAnswers(null, FIXTURE)).toEqual([])
    expect(parseClassifierAnswers([], FIXTURE)).toEqual([])
    expect(parseClassifierAnswers({}, FIXTURE)).toEqual([])
  })
})

describe('unionArticleTags', () => {
  it('keeps the highest confidence for a tag shared by several articles', () => {
    expect(
      unionArticleTags([
        { tags: [{ slug: 'budget', confidence: 0.62 }] },
        {
          tags: [
            { slug: 'budget', confidence: 0.81 },
            { slug: 'sante', confidence: 0.7 }
          ]
        }
      ])
    ).toEqual([
      { slug: 'budget', confidence: 0.81 },
      { slug: 'sante', confidence: 0.7 }
    ])
  })

  it('returns nothing when no article carries a tag', () => {
    expect(unionArticleTags([{ tags: [] }, { tags: [] }])).toEqual([])
    expect(unionArticleTags([])).toEqual([])
  })

  it('keeps a numeric confidence when another article has none', () => {
    expect(
      unionArticleTags([
        { tags: [{ slug: 'budget', confidence: null }] },
        { tags: [{ slug: 'budget', confidence: 0.66 }] }
      ])
    ).toEqual([{ slug: 'budget', confidence: 0.66 }])
  })
})
