import type { PfasAmendment } from '@/apis/pfas-amendments/types'
import type { AssistantPlan } from '@/features/dataviz-assistant/lib/plan'
import { extractNumbers, isQuestionTooLong, normalizeQuestion } from '@/features/dataviz-assistant/lib/question'

export type GuideIntent = 'compare' | 'focus' | 'parent' | 'evidence'

export type GuideAbstention =
  | 'empty'
  | 'too-long'
  | 'out-of-scope'
  | 'unsupported'
  | 'missing'
  | 'ambiguous'
  | 'parent-mismatch'
  | 'no-parent'
  | 'too-many'
  | 'too-few'

export type GuideResult =
  | { status: 'plan'; intent: GuideIntent; plan: AssistantPlan; records: PfasAmendment[] }
  | { status: 'abstain'; reason: GuideAbstention; numbers: string[] }

// Ordre important : le hors-périmètre l'emporte, une question « effet économique de l'amendement 26 » s'abstient.
const OUT_OF_SCOPE =
  /\b(econom\w*|cout\w*|emplois?|chiffre d affaires|prix|impacts?|effets?|consequences?|en vigueur|actuel\w*|aujourd hui|consolide\w*|predi\w*|adopt\w* demain|vot\w* demain|interet\w*|intention\w*)\b/
const EVIDENCE = /\b(sources?|parcours|preuves?|dossiers? legislatifs?|croisements?)\b/
const PARENT = /\b(parents?|rattache\w*|sous amendement \w+ de quoi)\b/
const COMPARE = /\b(compar\w*|differen\w*|ecarts?|versus|vs)\b/
const FOCUS =
  /\b(montre\w*|affiche\w*|ouvr\w*|voir|vois|detail\w*|selectionne\w*|focus\w*|zoom\w*|cible\w*|ou est|trouve\w*)\b/

type Lookup = { ok: true; records: PfasAmendment[] } | { ok: false; reason: 'missing' | 'ambiguous'; numbers: string[] }

function lookup(amendments: PfasAmendment[], numbers: string[]): Lookup {
  const records: PfasAmendment[] = []
  const missing: string[] = []
  const ambiguous: string[] = []
  for (const number of numbers) {
    const matches = amendments.filter((amendment) => amendment.number === number)
    if (matches.length === 0) missing.push(number)
    else if (matches.length > 1) ambiguous.push(number)
    else records.push(matches[0])
  }
  if (missing.length) return { ok: false, reason: 'missing', numbers: missing }
  if (ambiguous.length) return { ok: false, reason: 'ambiguous', numbers: ambiguous }
  return { ok: true, records }
}

/** Guide déterministe en français : règles locales, aucun modèle de langage. */
export function interpretPfasQuestion(question: string, amendments: PfasAmendment[]): GuideResult {
  const abstain = (reason: GuideAbstention, numbers: string[] = []): GuideResult => ({
    status: 'abstain',
    reason,
    numbers
  })
  if (isQuestionTooLong(question)) return abstain('too-long')
  const text = normalizeQuestion(question)
  if (!text) return abstain('empty')
  const numbers = extractNumbers(text)
  if (OUT_OF_SCOPE.test(text)) return abstain('out-of-scope', numbers)

  if (PARENT.test(text)) {
    if (numbers.length !== 1) return abstain(numbers.length ? 'too-many' : 'too-few', numbers)
    const found = lookup(amendments, numbers)
    if (!found.ok) return abstain(found.reason, found.numbers)
    const [child] = found.records
    if (!child.parentId && !child.parentRelation) return abstain('no-parent', numbers)
    const parents = amendments.filter((amendment) => amendment.id === child.parentId)
    const parent = parents.length === 1 ? parents[0] : null
    if (!parent || child.parentRelation?.parentNumber !== parent.number) return abstain('parent-mismatch', numbers)
    return plan('parent', [child, parent], [{ type: 'compare', ids: [child.id, parent.id] }])
  }

  if (COMPARE.test(text)) {
    if (numbers.length > 2) return abstain('too-many', numbers)
    if (numbers.length < 2) return abstain('too-few', numbers)
    const found = lookup(amendments, numbers)
    if (!found.ok) return abstain(found.reason, found.numbers)
    const [a, b] = found.records
    return plan('compare', found.records, [{ type: 'compare', ids: [a.id, b.id] }])
  }

  if (EVIDENCE.test(text) && numbers.length === 0) return plan('evidence', [], [{ type: 'show-evidence' }])

  if (FOCUS.test(text) || /\bamendements?\b/.test(text)) {
    if (numbers.length === 0) return abstain('unsupported')
    if (numbers.length > 1) return abstain('too-many', numbers)
    const found = lookup(amendments, numbers)
    if (!found.ok) return abstain(found.reason, found.numbers)
    return plan('focus', found.records, [{ type: 'focus', id: found.records[0].id }])
  }

  return abstain('unsupported', numbers)
}

function plan(intent: GuideIntent, records: PfasAmendment[], actions: AssistantPlan['actions']): GuideResult {
  return { status: 'plan', intent, records, plan: { schemaVersion: 1, actions } }
}
