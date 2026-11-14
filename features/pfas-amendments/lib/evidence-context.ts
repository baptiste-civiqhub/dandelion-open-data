import { z } from 'zod'

import type { PfasEvidenceContext } from '@/apis/pfas-evidence/types'

const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:', { message: 'URL must use https' })
const text = z.string().trim().min(1)
const sourceIds = z.array(text).min(1)

const contextSchema = z
  .object({
    schemaVersion: z.literal(1),
    retrievedAtUtc: text,
    scope: text,
    sources: z.array(
      z.object({
        id: text,
        title: text,
        url: httpsUrl,
        publisher: text,
        kind: z.enum(['official', 'api']),
        retrievedAtUtc: text,
        publishedAt: z.string().nullable(),
        licenceUrl: httpsUrl.nullable(),
        note: z.string()
      })
    ),
    documents: z.array(
      z.object({ id: text, title: text, kind: text, date: z.string().nullable(), url: httpsUrl, sourceId: text })
    ),
    joins: z.array(
      z.object({
        id: text,
        fromId: text,
        toId: text,
        relation: z.enum(['official-reference', 'source-url-match', 'context']),
        method: text,
        evidence: text,
        sourceIds
      })
    ),
    facts: z.array(z.object({ id: text, title: text, text, sourceIds, limitation: text })),
    hemicycle: z.object({
      status: z.enum(['verified-snapshot', 'not-integrated']),
      retrievedAtUtc: z.string().nullable(),
      dataset: z.string().nullable(),
      rows: z.number().int().nonnegative(),
      matchedRows: z.number().int().nonnegative(),
      sourceId: text.nullable(),
      note: z.string()
    })
  })
  .strict()

export class EvidenceContextError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid PFAS evidence context: ${issues.join('; ')}`)
    this.name = 'EvidenceContextError'
  }
}

/**
 * Valide le contexte documentaire à la frontière des données. Les extrémités d'un croisement peuvent
 * désigner un document, une source ou un identifiant d'amendement connu (`amendmentIds`).
 */
export function parseEvidenceContext(raw: unknown, amendmentIds: Iterable<string> = []): PfasEvidenceContext {
  const parsed = contextSchema.safeParse(raw)
  if (!parsed.success) {
    throw new EvidenceContextError(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`))
  }
  const context = parsed.data
  const issues: string[] = []
  const seen = new Set<string>()
  for (const { id } of [...context.sources, ...context.documents, ...context.joins, ...context.facts]) {
    if (seen.has(id)) issues.push(`duplicate id ${id}`)
    seen.add(id)
  }
  const sourceIdSet = new Set(context.sources.map((source) => source.id))
  const endpoints = new Set([...sourceIdSet, ...context.documents.map((document) => document.id), ...amendmentIds])
  const requireSource = (owner: string, id: string | null) => {
    if (id !== null && !sourceIdSet.has(id)) issues.push(`${owner} references unknown source ${id}`)
  }
  context.documents.forEach((document) => requireSource(`document ${document.id}`, document.sourceId))
  context.facts.forEach((fact) => fact.sourceIds.forEach((id) => requireSource(`fact ${fact.id}`, id)))
  for (const join of context.joins) {
    join.sourceIds.forEach((id) => requireSource(`join ${join.id}`, id))
    for (const end of [join.fromId, join.toId]) {
      if (!endpoints.has(end)) issues.push(`join ${join.id} references unknown record ${end}`)
    }
  }
  const { hemicycle } = context
  requireSource('hemicycle', hemicycle.sourceId)
  if (hemicycle.matchedRows > hemicycle.rows) issues.push('hemicycle.matchedRows exceeds hemicycle.rows')
  if (hemicycle.status === 'verified-snapshot' && (!hemicycle.retrievedAtUtc || !hemicycle.sourceId)) {
    issues.push('verified Hémicycle snapshot requires retrievedAtUtc and sourceId')
  }
  if (issues.length) throw new EvidenceContextError(issues)
  return context
}

/** Documents dans l'ordre chronologique (dates ISO), les documents non datés à la fin, ordre stable. */
export function sortEvidenceDocuments<T extends { date: string | null; id: string }>(documents: T[]): T[] {
  return [...documents].sort((a, b) => {
    if (a.date === b.date) return 0
    if (a.date === null) return 1
    if (b.date === null) return -1
    return a.date < b.date ? -1 : 1
  })
}
