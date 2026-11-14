import type { Amendment } from '@/apis/texte/types'
import type { AssistantPlan } from '@/features/dataviz-assistant/lib/plan'
import { isQuestionTooLong, normalizeQuestion } from '@/features/dataviz-assistant/lib/question'

export type FlowerGuideIntent = 'focus' | 'compare' | 'zoom' | 'reset'
export type FlowerGuideAbstention =
  | 'empty'
  | 'too-long'
  | 'out-of-scope'
  | 'unsupported'
  | 'missing'
  | 'ambiguous'
  | 'too-many'
  | 'too-few'

export type FlowerGuideResult =
  | { status: 'plan'; intent: FlowerGuideIntent; plan: AssistantPlan; amendmentIds: string[] }
  | { status: 'abstain'; reason: FlowerGuideAbstention; numbers: string[] }

const OUT_OF_SCOPE =
  /\b(econom\w*|cout\w*|emplois?|prix|impacts?|effets?|consequences?|en vigueur|actuel\w*|aujourd hui|predi\w*|interet\w*|intentions? politiques?|avis)\b/
const RESET = /\b(vue globale|vue d ensemble|reinitialis\w*|tout le texte|retour global)\b/
const ZOOM_IN = /\b(zoom\w*|agrandi\w*|rapproche\w*)\b/
const ZOOM_OUT = /\b(dezoom\w*|reduire|reduis|eloigne\w*)\b/
const COMPARE = /\b(compar\w*|differen\w*|ecarts?|versus|vs)\b/
const FOCUS =
  /\b(montre\w*|affiche\w*|ouvr\w*|voir|vois|detail\w*|selectionne\w*|trouve\w*|cherche\w*|ou est|revele\w*)\b/
const NUMERO_TOKEN = /\b(?:[a-z]{1,4}\d+|\d+)\b/g

const plan = (actions: AssistantPlan['actions']): AssistantPlan => ({ schemaVersion: 1, actions })

/** Jetons « numéro » exacts d'une question normalisée (`cl36`, `26`), dédoublonnés, zéros initiaux retirés. */
export const numeroTokens = (normalized: string): string[] => {
  const tokens = (normalized.match(NUMERO_TOKEN) ?? []).filter((token) => !/^\d+er$/.test(token))
  const cleaned = tokens.map((token) => token.replace(/^([a-z]*)0+(\d)/, '$1$2'))
  return [...new Set(cleaned)]
}

/** Commandes de vue sans numéro : vue globale, zoom avant/arrière. */
export const interpretViewCommand = (question: string): FlowerGuideResult | null => {
  const q = normalizeQuestion(question)
  if (numeroTokens(q).length > 0) return null
  if (RESET.test(q)) return { status: 'plan', intent: 'reset', plan: plan([{ type: 'reset-view' }]), amendmentIds: [] }
  if (ZOOM_OUT.test(q))
    return { status: 'plan', intent: 'zoom', plan: plan([{ type: 'zoom', direction: 'out' }]), amendmentIds: [] }
  if (ZOOM_IN.test(q))
    return { status: 'plan', intent: 'zoom', plan: plan([{ type: 'zoom', direction: 'in' }]), amendmentIds: [] }
  return null
}

/**
 * Guide déterministe générique (sans modèle) : numéros exacts uniquement (`36` ne trouve pas `CL36`, `2` ne trouve
 * pas `26`), abstention hors périmètre, aucun identifiant fabriqué.
 */
export const interpretFlowerQuestion = (question: string, amendments: Amendment[]): FlowerGuideResult => {
  if (question.trim() === '') return { status: 'abstain', reason: 'empty', numbers: [] }
  if (isQuestionTooLong(question)) return { status: 'abstain', reason: 'too-long', numbers: [] }
  const q = normalizeQuestion(question)
  const numbers = numeroTokens(q)
  if (OUT_OF_SCOPE.test(q)) return { status: 'abstain', reason: 'out-of-scope', numbers }
  const view = interpretViewCommand(question)
  if (view) return view
  const compare = COMPARE.test(q)
  if (!compare && !FOCUS.test(q) && numbers.length === 0) return { status: 'abstain', reason: 'unsupported', numbers }
  if (compare && numbers.length > 2) return { status: 'abstain', reason: 'too-many', numbers }
  if (compare && numbers.length < 2) return { status: 'abstain', reason: 'too-few', numbers }
  if (!compare && numbers.length !== 1)
    return { status: 'abstain', reason: numbers.length === 0 ? 'missing' : 'too-many', numbers }
  const ids: string[] = []
  for (const number of numbers) {
    const matches = amendments.filter((amendment) => amendment.numero.toLowerCase() === number)
    if (matches.length === 0) return { status: 'abstain', reason: 'missing', numbers }
    if (matches.length > 1) return { status: 'abstain', reason: 'ambiguous', numbers }
    ids.push((matches[0] as Amendment).id)
  }
  if (compare) {
    const [a, b] = ids as [string, string]
    return { status: 'plan', intent: 'compare', plan: plan([{ type: 'compare', ids: [a, b] }]), amendmentIds: ids }
  }
  const [id] = ids as [string]
  return { status: 'plan', intent: 'focus', plan: plan([{ type: 'focus', id }]), amendmentIds: ids }
}
