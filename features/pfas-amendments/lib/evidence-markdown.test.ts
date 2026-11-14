import { describe, expect, it } from 'vitest'

import { makeEvidenceContext } from './evidence-fixtures'
import { buildEvidenceMarkdown, type EvidenceMarkdownLabels } from './evidence-markdown'

const labels: EvidenceMarkdownLabels = {
  title: 'Trail',
  generatedAt: 'Generated',
  scope: 'Scope',
  retrievedAt: 'Retrieved',
  documents: 'Documents',
  joins: 'Joins',
  facts: 'Facts',
  sources: 'Sources',
  hemicycle: 'Hemicycle',
  hemicycleStatus: (status) => `status=${status}`,
  hemicycleRows: (rows, matched) => `rows=${rows} matched=${matched}`,
  relation: (relation) => `relation=${relation}`,
  method: 'Method',
  evidence: 'Evidence',
  limitation: 'Limitation',
  undated: 'undated',
  sourceKind: (kind) => `kind=${kind}`,
  licence: 'Licence',
  none: 'none',
  limitations: 'Limits',
  limitationItems: ['No causality is implied.']
}

describe('buildEvidenceMarkdown', () => {
  it('exports documents chronologically with their sources, typed joins, facts and limitations', () => {
    const md = buildEvidenceMarkdown(makeEvidenceContext(), '2000-03-01T00:00:00Z', labels, (id) =>
      id === 'amdt-1' ? 'Amendment 1' : id
    )
    expect(md.indexOf('First doc')).toBeLessThan(md.indexOf('Second doc'))
    expect(md.indexOf('Second doc')).toBeLessThan(md.indexOf('undated · Dossier'))
    expect(md).toContain('<https://example.test/a>')
    expect(md).toContain('relation=source-url-match : Amendment 1 → doc-a')
    expect(md).toContain('  - Evidence: Same URL')
    expect(md).toContain('  - Limitation: Synthetic limit')
    expect(md).toContain('status=not-integrated')
    expect(md).toContain('rows=0 matched=0')
    expect(md).toContain('kind=official')
    expect(md).toContain('- No causality is implied.')
  })

  it('does not invent lineage when no join is recorded and escapes untrusted markup', () => {
    const md = buildEvidenceMarkdown(
      makeEvidenceContext({ joins: [], facts: [], scope: '<script>x</script> **bold**' }),
      'now',
      labels
    )
    expect(md).not.toContain('→')
    expect(md).toContain('## Joins\n\n- _none_')
    expect(md).toContain('\\<script\\>')
    expect(md).not.toContain('**bold**')
  })

  it('reports a verified Hémicycle snapshot with its real counts', () => {
    const base = makeEvidenceContext()
    const md = buildEvidenceMarkdown(
      {
        ...base,
        hemicycle: {
          ...base.hemicycle,
          status: 'verified-snapshot',
          rows: 12,
          matchedRows: 3,
          retrievedAtUtc: '2000-01-02',
          sourceId: 'src-test'
        }
      },
      'now',
      labels
    )
    expect(md).toContain('status=verified-snapshot')
    expect(md).toContain('rows=12 matched=3')
  })
})
