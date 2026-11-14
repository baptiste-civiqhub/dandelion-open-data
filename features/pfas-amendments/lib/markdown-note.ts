import type { PfasAmendment, PfasProvenance } from '@/apis/pfas-amendments/types'

import { diffTexts, uniquePassages } from './lexical-diff'
import { toSafeSenateUrl } from './source-url'

export type MarkdownNoteLabels = {
  title: (numbers: string) => string
  snapshotWarning: string
  corpus: string
  dataset: string
  retrievedAt: string
  sha256: string
  licence: string
  parser: string
  amendment: (number: string) => string
  id: string
  nature: string
  subdivision: string
  paragraph: string
  author: string
  filedOn: string
  outcome: string
  outcomeRecordedAt: string
  parent: (number: string) => string
  parentEvidence: string
  source: string
  noSource: string
  notRecorded: string
  proposalText: string
  emptyText: string
  differences: string
  onlyIn: (number: string) => string
  noUniqueWords: string
  comparisonUnavailable: string
  typographyIgnored: (ignored: boolean) => string
  limitations: string
  limitationItems: string[]
}

export type MarkdownNoteInput = {
  amendments: [PfasAmendment, PfasAmendment]
  provenance: PfasProvenance
  generatedAt: string
  ignoreTypography: boolean
  labels: MarkdownNoteLabels
}

// Le texte source est une donnée non fiable : on neutralise la syntaxe Markdown/HTML active.
export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]<>|#]/g, (char) => `\\${char}`)
}

const quote = (text: string) =>
  text
    .split('\n')
    .map((line) => (line ? `> ${escapeMarkdown(line)}` : '>'))
    .join('\n')

const value = (raw: string | null, fallback: string) => (raw ? escapeMarkdown(raw) : fallback)

function amendmentSection(amendment: PfasAmendment, labels: MarkdownNoteLabels): string {
  const source = toSafeSenateUrl(amendment.sourceUrl)
  const lines = [
    `## ${labels.amendment(escapeMarkdown(amendment.numberLabel))}`,
    '',
    `- ${labels.id}: \`${amendment.id}\``,
    `- ${labels.nature}: ${value(amendment.nature, labels.notRecorded)}`,
    `- ${labels.subdivision}: ${value(amendment.subdivision, labels.notRecorded)}`,
    `- ${labels.paragraph}: ${value(amendment.paragraph, labels.notRecorded)}`,
    `- ${labels.author}: ${value([amendment.author, amendment.onBehalfOf].filter(Boolean).join(', ') || null, labels.notRecorded)}`,
    `- ${labels.filedOn}: ${value(amendment.filedOn, labels.notRecorded)}`,
    `- ${labels.outcome}: ${value(amendment.outcomeRaw, labels.notRecorded)}`,
    `- ${labels.outcomeRecordedAt}: ${value(amendment.outcomeRecordedAt, labels.notRecorded)}`
  ]
  if (amendment.parentRelation) {
    lines.push(
      `- ${labels.parent(escapeMarkdown(amendment.parentRelation.parentNumber))} — ${labels.parentEvidence}: ${escapeMarkdown(amendment.parentRelation.evidence)}`
    )
  }
  lines.push(`- ${labels.source}: ${source ? `<${source}>` : labels.noSource}`, '', `### ${labels.proposalText}`, '')
  lines.push(amendment.proposalText ? quote(amendment.proposalText) : `_${labels.emptyText}_`)
  return lines.join('\n')
}

/** Note Markdown concise, générée localement dans le navigateur : rien n'est envoyé. */
export function buildMarkdownNote({
  amendments,
  provenance,
  generatedAt,
  ignoreTypography,
  labels
}: MarkdownNoteInput): string {
  const [a, b] = amendments
  const diff = diffTexts(a.proposalText, b.proposalText, { ignoreTypography })
  const passages = (amendment: PfasAmendment, tokens: Parameters<typeof uniquePassages>[1] | undefined) => {
    if (!tokens) return `  - _${labels.comparisonUnavailable}_`
    const list = uniquePassages(amendment.proposalText, tokens)
    return list.length ? list.map((p) => `  - « ${escapeMarkdown(p)} »`).join('\n') : `  - _${labels.noUniqueWords}_`
  }
  const sections = [
    `# ${labels.title(`${escapeMarkdown(a.numberLabel)} / ${escapeMarkdown(b.numberLabel)}`)}`,
    '',
    `_${labels.snapshotWarning}_ (${generatedAt})`,
    '',
    `## ${labels.corpus}`,
    '',
    `- ${escapeMarkdown(provenance.text)}`,
    `- ${labels.dataset}: <${provenance.datasetUrl}>`,
    `- ${labels.retrievedAt}: ${provenance.retrievedAtUtc}`,
    `- ${labels.sha256}: \`${provenance.sha256}\``,
    `- ${labels.licence}: <${provenance.licenceUrl}>`,
    `- ${labels.parser}: ${provenance.importScript} v${provenance.parserVersion}`,
    '',
    amendmentSection(a, labels),
    '',
    amendmentSection(b, labels),
    '',
    `## ${labels.differences}`,
    '',
    `- ${labels.typographyIgnored(ignoreTypography)}`,
    `- ${labels.onlyIn(escapeMarkdown(a.numberLabel))}`,
    passages(a, diff?.a),
    `- ${labels.onlyIn(escapeMarkdown(b.numberLabel))}`,
    passages(b, diff?.b),
    '',
    `## ${labels.limitations}`,
    '',
    ...labels.limitationItems.map((item) => `- ${item}`),
    ''
  ]
  return sections.join('\n')
}
