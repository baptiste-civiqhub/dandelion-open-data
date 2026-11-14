import type { AmendementSummary } from '@/apis/amendements/types'

/** Lien entre deux amendements, tel que la source le déclare (R5) : jamais déduit du texte. */
export type AmendementRelation = 'parent' | 'identical' | 'subAmendement' | 'jointDiscussion'

export type RelatedAmendement = { amendement: AmendementSummary; relation: AmendementRelation }

export const MAX_RELATED_AMENDEMENTS = 12

const RELATION_ORDER: readonly AmendementRelation[] = ['parent', 'identical', 'subAmendement', 'jointDiscussion']

const byDiscussionOrder = (a: AmendementSummary, b: AmendementSummary) =>
  (a.rang ?? Number.MAX_SAFE_INTEGER) - (b.rang ?? Number.MAX_SAFE_INTEGER) ||
  a.numeroLong.localeCompare(b.numeroLong, 'fr', { numeric: true })

const relationOf = (target: AmendementSummary, other: AmendementSummary): AmendementRelation | null => {
  if (target.parentId === other.id) return 'parent'
  if (target.discussionIdentique && other.discussionIdentique === target.discussionIdentique) return 'identical'
  if (other.parentId === target.id) return 'subAmendement'
  if (target.discussionCommune && other.discussionCommune === target.discussionCommune) return 'jointDiscussion'
  return null
}

/**
 * Amendements liés à `target` par les clés de la source : son parent, ses identiques, ses sous-amendements, puis ceux
 * de la même discussion commune. Chaque amendement n'apparaît qu'une fois, sous son lien le plus fort.
 */
export function findRelatedAmendements(
  target: AmendementSummary,
  amendements: readonly AmendementSummary[],
  limit = MAX_RELATED_AMENDEMENTS
): RelatedAmendement[] {
  const related: RelatedAmendement[] = []
  for (const other of amendements) {
    if (other.id === target.id) continue
    const relation = relationOf(target, other)
    if (relation) related.push({ amendement: other, relation })
  }
  return related
    .sort(
      (a, b) =>
        RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation) ||
        byDiscussionOrder(a.amendement, b.amendement)
    )
    .slice(0, limit)
}

/** Amendement d'un texte par son numéro affiché (`numeroLong`), sans tenir compte de la casse ni des espaces. */
export function findAmendementByNumero(
  amendements: readonly AmendementSummary[],
  numero: string
): AmendementSummary | null {
  const wanted = numero.replace(/\s+/g, '').toLowerCase()
  if (!wanted) return null
  return amendements.find((amendement) => amendement.numeroLong.replace(/\s+/g, '').toLowerCase() === wanted) ?? null
}
