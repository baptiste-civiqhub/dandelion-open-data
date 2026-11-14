import { describe, expect, it } from 'vitest'

import { syntheticSnapshot } from '@/features/texte/lib/synthetic'

import { indexCandidates, MAX_CANDIDATES, selectCandidates } from './candidates'
import { buildSystemPrompt } from './prompt'

const records = indexCandidates([
  { id: 'a', numero: '26', group: 'Article 1er', text: 'textiles de construction' },
  { id: 'b', numero: '27', group: 'Article 1er', text: 'textiles utilisant des fluoropolymères' },
  { id: 'c', numero: '2', group: 'Article 2', text: 'Supprimer cet article.' }
])

describe('selectCandidates', () => {
  it('puts exact numbers first and never confuses 2 with 26', () => {
    const ids = selectCandidates('Compare 26 et 2', records, []).map((entity) => entity.id)
    expect(ids.slice(0, 2).sort()).toEqual(['a', 'c'])
    expect(selectCandidates('Montre 2', records, []).map((entity) => entity.id)).toEqual(['c'])
  })

  it('adds lexical candidates', () => {
    expect(selectCandidates('fluoropolymères', records, []).map((entity) => entity.id)).toEqual(['b'])
  })

  it('keeps the prompt bounded on a synthetic 100k dataset', () => {
    const snapshot = syntheticSnapshot(100_000)
    const big = indexCandidates(
      snapshot.amendments.map((amendment) => ({
        id: amendment.id,
        numero: amendment.numero,
        group: amendment.article,
        text: amendment.dispositif
      }))
    )
    const structural = Array.from({ length: 500 }, (_, i) => ({ id: `article:${i}`, label: `Article ${i}` }))
    const entities = selectCandidates('texte synthétique S42 supprimer', big, structural)
    expect(entities.length).toBeLessThanOrEqual(40 + MAX_CANDIDATES)
    expect(entities.map((entity) => entity.id)).toContain('synthetic-41')
    expect(buildSystemPrompt({ entities }).length).toBeLessThan(16_000)
  })
})
