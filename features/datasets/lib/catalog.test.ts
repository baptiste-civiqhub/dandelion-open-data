import { describe, expect, it } from 'vitest'

import pfasSnapshot from '@/data/pfas/amendments.json'
import teamSnapshot from '@/features/texte/fixtures/texte-amendements.json'

import { CATALOG, filterCatalog } from './catalog'

describe('CATALOG', () => {
  it('declares the real record counts of both distinct datasets', () => {
    const counts = Object.fromEntries(CATALOG.map((entry) => [entry.id, entry.records]))
    expect(counts['pfas-senat-620']).toBe(pfasSnapshot.amendments.length)
    expect(counts['police-municipale-an-2464']).toBe(teamSnapshot.amendments.length)
  })

  it('filters by keyword, accents ignored', () => {
    const name = (id: string) => id
    expect(filterCatalog(CATALOG, 'Sénat', name).map((entry) => entry.id)).toEqual(['pfas-senat-620'])
    expect(filterCatalog(CATALOG, 'hemicycle', name).map((entry) => entry.id)).toEqual(['police-municipale-an-2464'])
    expect(filterCatalog(CATALOG, '', name)).toHaveLength(2)
    expect(filterCatalog(CATALOG, 'zzz', name)).toEqual([])
  })
})
