import { describe, expect, it } from 'vitest'

import type { PfasProvenance } from '@/apis/pfas-amendments/types'

import { buildMarkdownNote, escapeMarkdown, type MarkdownNoteLabels } from './markdown-note'
import { makeAmendment } from './test-fixtures'

const provenance = {
  datasetUrl: 'https://www.senat.fr/amendements/2023-2024/620/jeu_complet_2023-2024_620.csv',
  licenceUrl: 'https://data.senat.fr/licence/',
  retrievedAtUtc: '2026-11-13T21:43:06.239210+00:00',
  sha256: '08ed07be',
  text: 'PPL 620',
  importScript: 'scripts/import-pfas.py',
  parserVersion: '1.0.0'
} as PfasProvenance

const labels: MarkdownNoteLabels = {
  title: (n) => `Note ${n}`,
  snapshotWarning: 'Dated snapshot',
  corpus: 'Corpus',
  dataset: 'Dataset',
  retrievedAt: 'Retrieved',
  sha256: 'SHA-256',
  licence: 'Licence',
  parser: 'Parser',
  amendment: (n) => `Amendment ${n}`,
  id: 'Id',
  nature: 'Nature',
  subdivision: 'Subdivision',
  paragraph: 'Paragraph',
  author: 'Author',
  filedOn: 'Filed',
  outcome: 'Official outcome',
  outcomeRecordedAt: 'Recorded',
  parent: (n) => `Sub-amendment of ${n}`,
  parentEvidence: 'evidence',
  source: 'Source',
  noSource: 'none',
  notRecorded: 'not recorded',
  proposalText: 'Proposal',
  emptyText: 'empty',
  differences: 'Lexical differences',
  onlyIn: (n) => `Only in ${n}`,
  noUniqueWords: 'nothing',
  comparisonUnavailable: 'Comparison unavailable: texts exceed the comparison limit.',
  typographyIgnored: (i) => `typography ignored: ${i}`,
  limitations: 'Limitations',
  limitationItems: ['Does not simulate legal or environmental outcomes.']
}

const a26 = makeAmendment({
  id: 'senat-26',
  number: '26',
  numberLabel: '26',
  outcomeRaw: 'Retiré',
  sourceUrl: 'https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html',
  proposalText: 'insérer les mots :\n\n, des textiles de construction'
})
const a27 = makeAmendment({
  id: 'senat-27',
  number: '27',
  numberLabel: '27',
  outcomeRaw: 'Retiré',
  sourceUrl: 'https://evil.example/Amdt_27.html',
  proposalText: 'insérer les mots :\n\n, des textiles de construction utilisant des fluoropolymères'
})

describe('buildMarkdownNote', () => {
  const note = buildMarkdownNote({
    amendments: [a26, a27],
    provenance,
    generatedAt: '2026-11-14T00:00:00.000Z',
    ignoreTypography: false,
    labels
  })

  it('includes ids, raw outcomes, provenance and the limitation', () => {
    expect(note).toContain('`senat-26`')
    expect(note).toContain('Official outcome: Retiré')
    expect(note).toContain('SHA-256: `08ed07be`')
    expect(note).toContain('2026-11-13T21:43:06.239210+00:00')
    expect(note).toContain('- Does not simulate legal or environmental outcomes.')
  })

  it('links only validated Senate sources', () => {
    expect(note).toContain('<https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html>')
    expect(note).not.toContain('evil.example')
  })

  it('quotes the French proposal text verbatim and lists unique passages', () => {
    expect(note).toContain('> , des textiles de construction utilisant des fluoropolymères')
    expect(note).toContain('« utilisant des fluoropolymères »')
  })

  it('states the parent of a sub-amendment', () => {
    const child = makeAmendment({
      number: '32',
      numberLabel: '32',
      parentRelation: {
        parentNumber: '14',
        relation: 'sub-amendment',
        sourceUrl: null,
        evidence: 'Amendement n° 14',
        method: 'manual',
        officialPageCheck: null
      }
    })
    const withParent = buildMarkdownNote({
      amendments: [child, a26],
      provenance,
      generatedAt: 'x',
      ignoreTypography: false,
      labels
    })
    expect(withParent).toContain('Sub-amendment of 14')
  })

  it('reports an unavailable comparison instead of no differences when texts exceed the limit', () => {
    const oversized = buildMarkdownNote({
      amendments: [
        makeAmendment({ proposalText: 'alpha '.repeat(2100) }),
        makeAmendment({ proposalText: 'beta '.repeat(2100) })
      ],
      provenance,
      generatedAt: '2026-11-14T00:00:00.000Z',
      ignoreTypography: false,
      labels
    })
    expect(oversized.includes(labels.comparisonUnavailable)).toBe(true)
    expect(oversized.includes(`_${labels.noUniqueWords}_`)).toBe(false)
  })
})

describe('escapeMarkdown', () => {
  it('neutralises links and inline HTML from untrusted text', () => {
    expect(escapeMarkdown('[x](javascript:1) <img>')).toBe('\\[x\\](javascript:1) \\<img\\>')
  })
})
