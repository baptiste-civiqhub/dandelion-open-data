import { describe, expect, it } from 'vitest'

import { resolveEvidencePreset } from './evidence-presets'
import { makeAmendment } from './test-fixtures'

const parentRelation = {
  parentNumber: '14',
  relation: 'sub-amendment',
  sourceUrl: null,
  evidence: 'Amendement n° 14',
  method: 'export',
  officialPageCheck: null
}
const corpus = () => [
  makeAmendment({ number: '2', numberLabel: '2 rect.' }),
  makeAmendment({ number: '14' }),
  makeAmendment({ number: '26', outcomeRaw: 'Retiré' }),
  makeAmendment({ number: '27', outcomeRaw: 'Retiré' }),
  makeAmendment({ number: '32', parentId: 'amdt-14', parentRelation })
]

describe('resolveEvidencePreset', () => {
  it('selects 26 and 27 by exact number and focuses 26', () => {
    const result = resolveEvidencePreset(corpus(), 'wording')
    expect(result).toMatchObject({ status: 'available', selectedIds: ['amdt-26', 'amdt-27'], focusedId: 'amdt-26' })
  })

  it('never matches by substring (2 is not 26, 14 is not 140)', () => {
    const amendments = corpus().filter((a) => a.number !== '26')
    amendments.push(makeAmendment({ number: '260' }))
    expect(resolveEvidencePreset(amendments, 'wording')).toEqual({
      status: 'unavailable',
      key: 'wording',
      reason: 'missing',
      numbers: ['26']
    })
  })

  it('reports ambiguous duplicates instead of picking one', () => {
    const amendments = [...corpus(), makeAmendment({ number: '27', id: 'amdt-27-bis' })]
    expect(resolveEvidencePreset(amendments, 'wording')).toMatchObject({ status: 'unavailable', reason: 'ambiguous' })
  })

  it('selects 32 and 14 and focuses 32 when the sourced parent relation matches', () => {
    expect(resolveEvidencePreset(corpus(), 'parent')).toMatchObject({
      status: 'available',
      selectedIds: ['amdt-32', 'amdt-14'],
      focusedId: 'amdt-32'
    })
  })

  it('refuses the parent preset when the relation is absent or contradicts the reference', () => {
    const missing = corpus().map((a) => (a.number === '32' ? { ...a, parentId: null, parentRelation: null } : a))
    expect(resolveEvidencePreset(missing, 'parent')).toMatchObject({ status: 'unavailable', reason: 'parent-mismatch' })
    const contradictory = corpus().map((a) => (a.number === '32' ? { ...a, parentId: 'amdt-2' } : a))
    expect(resolveEvidencePreset(contradictory, 'parent')).toMatchObject({ reason: 'parent-mismatch' })
    const wrongNumber = corpus().map((a) =>
      a.number === '32' ? { ...a, parentRelation: { ...parentRelation, parentNumber: '13' } } : a
    )
    expect(resolveEvidencePreset(wrongNumber, 'parent')).toMatchObject({ reason: 'parent-mismatch' })
    expect(
      resolveEvidencePreset(
        corpus().filter((a) => a.number !== '14'),
        'parent'
      )
    ).toMatchObject({
      reason: 'missing',
      numbers: ['14']
    })
  })
})
