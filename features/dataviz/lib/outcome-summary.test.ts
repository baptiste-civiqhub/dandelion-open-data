import { describe, expect, it } from 'vitest'

import type { Sort } from '@/apis/sorts/types'

import { summarizeOutcomes } from './outcome-summary'

const makeSort = (overrides: Partial<Sort> = {}): Sort => ({
  code: 'adopte',
  label: 'Adopté',
  displayOrder: 1,
  colorToken: '--sort-adopte',
  ...overrides
})

const sorts = [
  makeSort({ code: 'rejete', label: 'Rejeté', displayOrder: 2, colorToken: '--sort-rejete' }),
  makeSort(),
  makeSort({ code: 'en_attente', label: 'En attente', displayOrder: 7, colorToken: '--sort-en-attente' })
]

describe('summarizeOutcomes', () => {
  it('counts the amendments per outcome, in legend order', () => {
    const amendements = [{ sort: 'rejete' }, { sort: 'adopte' }, { sort: 'rejete' }]
    expect(summarizeOutcomes(sorts, amendements)).toEqual([
      { code: 'adopte', label: 'Adopté', colorToken: '--sort-adopte', count: 1 },
      { code: 'rejete', label: 'Rejeté', colorToken: '--sort-rejete', count: 2 },
      { code: 'en_attente', label: 'En attente', colorToken: '--sort-en-attente', count: 0 }
    ])
  })

  it('keeps every known outcome at zero without amendments', () => {
    expect(summarizeOutcomes(sorts, []).map((outcome) => outcome.count)).toEqual([0, 0, 0])
  })

  it('appends an outcome missing from the legend instead of dropping it', () => {
    const summary = summarizeOutcomes(sorts, [{ sort: 'inconnu' }, { sort: 'inconnu' }])
    expect(summary.at(-1)).toEqual({ code: 'inconnu', label: 'inconnu', colorToken: '', count: 2 })
  })

  it('returns only what the amendments carry when the legend is empty', () => {
    expect(summarizeOutcomes([], [{ sort: 'adopte' }])).toEqual([
      { code: 'adopte', label: 'adopte', colorToken: '', count: 1 }
    ])
  })
})
