import { describe, expect, it } from 'vitest'

import type { AmendementSummary } from '@/apis/amendements/types'

import { countBySort, hasActiveFilters, matchesFilters, NO_FILTERS, toggleExcludedSort } from './sunburst-filters'

const amendement = (patch: Partial<AmendementSummary>): AmendementSummary => ({
  id: 'x',
  numeroLong: '12',
  articleId: null,
  alineaId: null,
  parentId: null,
  divisionAvantApres: 'A',
  rang: 1,
  sort: 'adopte',
  groupePolitiqueRef: 'PO800490',
  discussionCommune: null,
  discussionIdentique: null,
  tagListId: 'tl',
  ...patch
})

describe('sunburst filters', () => {
  it('lets everything through without filters', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false)
    expect(matchesFilters(amendement({}), NO_FILTERS)).toBe(true)
  })

  it('combines values of one family with OR', () => {
    const tags = new Map([['tl', ['t2']]])
    const filters = { ...NO_FILTERS, tagIds: ['t1', 't2'] }
    expect(matchesFilters(amendement({}), filters, tags)).toBe(true)
    expect(matchesFilters(amendement({ tagListId: 'other' }), filters, tags)).toBe(false)
  })

  it('combines families with AND', () => {
    const filters = { ...NO_FILTERS, excludedSorts: ['rejete'], query: '12' }
    expect(matchesFilters(amendement({}), filters)).toBe(true)
    expect(matchesFilters(amendement({ sort: 'rejete' }), filters)).toBe(false)
    expect(matchesFilters(amendement({ numeroLong: '40' }), filters)).toBe(false)
  })

  it('searches numbers and groups without case or accents', () => {
    expect(matchesFilters(amendement({}), { ...NO_FILTERS, query: 'po8004' })).toBe(true)
  })

  it('counts by sort and toggles excluded sorts', () => {
    expect([...countBySort([{ sort: 'a' }, { sort: 'b' }, { sort: 'a' }])]).toEqual([
      ['a', 2],
      ['b', 1]
    ])
    expect(toggleExcludedSort(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleExcludedSort(['a', 'b'], 'a')).toEqual(['b'])
  })
})
