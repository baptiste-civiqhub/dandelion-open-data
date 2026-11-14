import { describe, expect, it } from 'vitest'

import { OTHER_TAG, TAG_VOCABULARY, withOtherFallback } from './vocabulary'

describe('TAG_VOCABULARY', () => {
  it('lists fifty distinct subjects, five in each family', () => {
    expect(TAG_VOCABULARY).toHaveLength(50)
    expect(new Set(TAG_VOCABULARY.map((definition) => definition.slug)).size).toBe(50)

    const perCategory = new Map<string, number>()
    for (const definition of TAG_VOCABULARY) {
      expect(definition.slug.length).toBeGreaterThan(0)
      expect(definition.label.length).toBeGreaterThan(0)
      expect(definition.rule.length).toBeGreaterThan(0)
      expect(definition.category.length).toBeGreaterThan(0)
      perCategory.set(definition.category, (perCategory.get(definition.category) ?? 0) + 1)
    }

    expect([...perCategory.keys()].sort()).toEqual([
      'agriculture',
      'budget',
      'ecologie',
      'economie',
      'institutions',
      'sante',
      'savoir',
      'securite',
      'social',
      'travail'
    ])
    for (const count of perCategory.values()) expect(count).toBe(5)
  })

  it('keeps Autre outside the fifty subjects', () => {
    expect(OTHER_TAG).toEqual({
      category: 'autre',
      slug: 'autre',
      label: 'Autre',
      rule: "Aucun des sujets du vocabulaire ne s'applique à l'article."
    })
    expect(TAG_VOCABULARY.some((definition) => definition.slug === OTHER_TAG.slug)).toBe(false)
  })
})

describe('withOtherFallback', () => {
  it('keeps the subjects the classifier accepted', () => {
    const tags = [{ slug: 'budget', confidence: 0.8 }]
    expect(withOtherFallback(tags)).toEqual(tags)
  })

  it('assigns Autre when an article matches nothing', () => {
    expect(withOtherFallback([])).toEqual([{ slug: OTHER_TAG.slug, confidence: null }])
  })
})
