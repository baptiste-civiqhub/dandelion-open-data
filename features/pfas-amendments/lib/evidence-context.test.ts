import { describe, expect, it } from 'vitest'

import { EvidenceContextError, parseEvidenceContext, sortEvidenceDocuments } from './evidence-context'
import { makeEvidenceContext } from './evidence-fixtures'

const parse = (raw: unknown) => () => parseEvidenceContext(raw, ['amdt-1'])

describe('parseEvidenceContext', () => {
  it('accepts a consistent context whose joins resolve to documents or known amendments', () => {
    expect(parseEvidenceContext(makeEvidenceContext(), ['amdt-1']).documents).toHaveLength(3)
  })

  it('rejects a join pointing to an unknown record instead of inventing it', () => {
    expect(parseEvidenceContext.bind(null, makeEvidenceContext())).toThrow(/unknown record amdt-1/)
  })

  it('rejects unresolved source references in documents, joins and facts', () => {
    const base = makeEvidenceContext()
    expect(parse({ ...base, documents: [{ ...base.documents[0], sourceId: 'nope' }] })).toThrow(/unknown source nope/)
    expect(parse({ ...base, joins: [{ ...base.joins[0], sourceIds: ['ghost'] }] })).toThrow(/unknown source ghost/)
    expect(parse({ ...base, facts: [{ ...base.facts[0], sourceIds: ['ghost'] }] })).toThrow(EvidenceContextError)
    expect(parse({ ...base, facts: [{ ...base.facts[0], sourceIds: [] }] })).toThrow(EvidenceContextError)
  })

  it('rejects duplicate ids across collections', () => {
    const base = makeEvidenceContext()
    expect(parse({ ...base, facts: [{ ...base.facts[0], id: 'doc-a' }] })).toThrow(/duplicate id doc-a/)
  })

  it('rejects non-https and malformed urls', () => {
    const base = makeEvidenceContext()
    expect(parse({ ...base, documents: [{ ...base.documents[0], url: 'http://example.test/x' }] })).toThrow(/https/)
    expect(parse({ ...base, sources: [{ ...base.sources[0], url: 'javascript:alert(1)' }] })).toThrow(
      EvidenceContextError
    )
    expect(parse({ ...base, sources: [{ ...base.sources[0], licenceUrl: 'ftp://x' }] })).toThrow(EvidenceContextError)
  })

  it('rejects negative counts, matchedRows above rows and unverifiable snapshots', () => {
    const base = makeEvidenceContext()
    expect(parse({ ...base, hemicycle: { ...base.hemicycle, rows: -1 } })).toThrow(EvidenceContextError)
    expect(parse({ ...base, hemicycle: { ...base.hemicycle, rows: 2, matchedRows: 3 } })).toThrow(/matchedRows/)
    expect(parse({ ...base, hemicycle: { ...base.hemicycle, status: 'verified-snapshot' } })).toThrow(/requires/)
    expect(parse({ ...base, hemicycle: { ...base.hemicycle, sourceId: 'ghost' } })).toThrow(/unknown source ghost/)
  })

  it('rejects unknown schema versions, relations and extra fields', () => {
    const base = makeEvidenceContext()
    expect(parse({ ...base, schemaVersion: 2 })).toThrow(EvidenceContextError)
    expect(parse({ ...base, joins: [{ ...base.joins[0], relation: 'causes' }] })).toThrow(EvidenceContextError)
    expect(parse({ ...base, html: '<b>x</b>' })).toThrow(EvidenceContextError)
    expect(parse(null)).toThrow(EvidenceContextError)
  })
})

describe('sortEvidenceDocuments', () => {
  it('orders dated documents chronologically and keeps undated ones last', () => {
    expect(sortEvidenceDocuments(makeEvidenceContext().documents).map((d) => d.id)).toEqual([
      'doc-a',
      'doc-b',
      'doc-undated'
    ])
  })
})
