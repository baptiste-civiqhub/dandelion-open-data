import type { EvidenceJoinRelation, PfasEvidenceContext } from '@/apis/pfas-evidence/types'

import { sortEvidenceDocuments } from './evidence-context'
import { escapeMarkdown } from './markdown-note'

export type EvidenceMarkdownLabels = {
  title: string
  generatedAt: string
  scope: string
  retrievedAt: string
  documents: string
  joins: string
  facts: string
  sources: string
  hemicycle: string
  hemicycleStatus: (status: PfasEvidenceContext['hemicycle']['status']) => string
  hemicycleRows: (rows: number, matchedRows: number) => string
  relation: (relation: EvidenceJoinRelation) => string
  method: string
  evidence: string
  limitation: string
  undated: string
  sourceKind: (kind: 'official' | 'api') => string
  licence: string
  none: string
  limitations: string
  limitationItems: string[]
}

const line = (value: string) => escapeMarkdown(value.replace(/\s+/g, ' ').trim())

/** Note Markdown du parcours documentaire, générée localement. Elle ne reformule ni ne relie rien au-delà du contexte. */
export function buildEvidenceMarkdown(
  context: PfasEvidenceContext,
  generatedAt: string,
  labels: EvidenceMarkdownLabels,
  recordLabel: (id: string) => string = (id) => id
): string {
  const sourceList = (ids: string[]) => ids.map((id) => `\`${id}\``).join(', ')
  const { hemicycle } = context
  const lines = [
    `# ${labels.title}`,
    '',
    `- ${labels.generatedAt}: ${generatedAt}`,
    `- ${labels.retrievedAt}: ${context.retrievedAtUtc}`,
    `- ${labels.scope}: ${line(context.scope)}`,
    '',
    `## ${labels.documents}`,
    ''
  ]
  const documents = sortEvidenceDocuments(context.documents)
  if (!documents.length) lines.push(`- _${labels.none}_`)
  for (const document of documents) {
    lines.push(
      `- ${document.date ?? labels.undated} · ${line(document.kind)} · ${line(document.title)} — <${document.url}> (\`${document.id}\`, ${sourceList([document.sourceId])})`
    )
  }
  lines.push('', `## ${labels.joins}`, '')
  if (!context.joins.length) lines.push(`- _${labels.none}_`)
  for (const join of context.joins) {
    lines.push(
      `- ${labels.relation(join.relation)} : ${line(recordLabel(join.fromId))} → ${line(recordLabel(join.toId))}`,
      `  - ${labels.method}: ${line(join.method)}`,
      `  - ${labels.evidence}: ${line(join.evidence)}`,
      `  - ${labels.sources}: ${sourceList(join.sourceIds)}`
    )
  }
  lines.push('', `## ${labels.facts}`, '')
  if (!context.facts.length) lines.push(`- _${labels.none}_`)
  for (const fact of context.facts) {
    lines.push(
      `- **${line(fact.title)}** : ${line(fact.text)}`,
      `  - ${labels.limitation}: ${line(fact.limitation)}`,
      `  - ${labels.sources}: ${sourceList(fact.sourceIds)}`
    )
  }
  lines.push(
    '',
    `## ${labels.hemicycle}`,
    '',
    `- ${labels.hemicycleStatus(hemicycle.status)}`,
    `- ${labels.hemicycleRows(hemicycle.rows, hemicycle.matchedRows)}`
  )
  if (hemicycle.dataset) lines.push(`- ${line(hemicycle.dataset)}`)
  if (hemicycle.retrievedAtUtc) lines.push(`- ${labels.retrievedAt}: ${hemicycle.retrievedAtUtc}`)
  if (hemicycle.note) lines.push(`- ${line(hemicycle.note)}`)
  lines.push('', `## ${labels.sources}`, '')
  for (const source of context.sources) {
    lines.push(
      `- \`${source.id}\` · ${labels.sourceKind(source.kind)} · ${line(source.publisher)} · ${line(source.title)} — <${source.url}>`,
      `  - ${labels.retrievedAt}: ${source.retrievedAtUtc}${source.licenceUrl ? ` · ${labels.licence}: <${source.licenceUrl}>` : ''}`
    )
    if (source.note) lines.push(`  - ${line(source.note)}`)
  }
  lines.push('', `## ${labels.limitations}`, '', ...labels.limitationItems.map((item) => `- ${item}`), '')
  return lines.join('\n')
}
