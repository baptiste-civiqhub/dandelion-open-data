import { describe, expect, it } from 'vitest'

import type { Area } from '@/apis/areas/types'
import type { Tag } from '@/apis/tags/types'

import { countAreasByTag, filterAreas, normalizeSearchText } from './filter-areas'

const makeTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 'tag',
  slug: 'tag',
  label: 'Tag',
  category: 'theme',
  description: null,
  ...overrides
})

const makeArea = (overrides: Partial<Area> = {}): Area => ({
  id: 'area',
  slug: 'area',
  name: 'Area',
  description: null,
  texteCount: 0,
  tagIds: [],
  ...overrides
})

const budget = makeTag({ id: 't-budget', slug: 'budget', label: 'Budget' })
const sante = makeTag({ id: 't-sante', slug: 'sante', label: 'Santé' })
const projet = makeTag({ id: 't-projet', slug: 'projet', label: 'Projet de loi', category: 'type' })
const tags = [budget, sante, projet]

const finances = makeArea({ id: 'a1', slug: 'plffg-2026', name: 'Finances de fin de gestion', tagIds: ['t-budget'] })
const secu = makeArea({
  id: 'a2',
  slug: 'plfss-2027',
  name: 'Sécurité sociale',
  description: 'Financement des branches',
  tagIds: ['t-sante', 't-projet']
})
const ecole = makeArea({ id: 'a3', slug: 'ecole', name: 'École' })
const areas = [finances, secu, ecole]

describe('normalizeSearchText', () => {
  it('strips accents, case and repeated spaces', () => {
    expect(normalizeSearchText('  Sécurité   SOCIALE ')).toBe('securite sociale')
  })
})

describe('filterAreas', () => {
  it('returns every area when the filter is empty', () => {
    expect(filterAreas(areas, tags, { query: '', tagIds: [] })).toEqual(areas)
  })

  it('matches the query without accents or case, across name, slug and description', () => {
    expect(filterAreas(areas, tags, { query: 'securite', tagIds: [] })).toEqual([secu])
    expect(filterAreas(areas, tags, { query: 'PLFFG', tagIds: [] })).toEqual([finances])
    expect(filterAreas(areas, tags, { query: 'branches', tagIds: [] })).toEqual([secu])
    expect(filterAreas(areas, tags, { query: 'ecole', tagIds: [] })).toEqual([ecole])
  })

  it('matches the label of a tag carried by the area', () => {
    expect(filterAreas(areas, tags, { query: 'sante', tagIds: [] })).toEqual([secu])
  })

  it('requires every word of the query', () => {
    expect(filterAreas(areas, tags, { query: 'securite budget', tagIds: [] })).toEqual([])
    expect(filterAreas(areas, tags, { query: 'sociale financement', tagIds: [] })).toEqual([secu])
  })

  it('widens within a tag category', () => {
    expect(filterAreas(areas, tags, { query: '', tagIds: ['t-budget', 't-sante'] })).toEqual([finances, secu])
  })

  it('narrows across tag categories', () => {
    expect(filterAreas(areas, tags, { query: '', tagIds: ['t-budget', 't-sante', 't-projet'] })).toEqual([secu])
  })

  it('combines the query and the tags', () => {
    expect(filterAreas(areas, tags, { query: 'gestion', tagIds: ['t-sante'] })).toEqual([])
  })

  it('keeps no area for a selected tag nobody carries, even when the tag is unknown', () => {
    expect(filterAreas(areas, tags, { query: '', tagIds: ['t-unknown'] })).toEqual([])
  })
})

describe('countAreasByTag', () => {
  it('counts the areas carrying each tag and ignores duplicate links', () => {
    const twice = makeArea({ id: 'a4', tagIds: ['t-budget', 't-budget'] })
    expect(countAreasByTag([...areas, twice])).toEqual({ 't-budget': 2, 't-sante': 1, 't-projet': 1 })
  })

  it('returns an empty record without areas', () => {
    expect(countAreasByTag([])).toEqual({})
  })
})
