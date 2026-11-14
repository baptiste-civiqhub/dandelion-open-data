import type { PromptEntity } from './prompt'
import { extractNumbers, normalizeQuestion } from './question'

export type CandidateRecord = { id: string; numero: string; group: string; text: string }

export type CandidateOptions = { maxCandidates?: number; maxStructural?: number; excerptLength?: number }

export const MAX_CANDIDATES = 24
export const MAX_STRUCTURAL = 40
export const EXCERPT_LENGTH = 140

const STOP_WORDS = new Set([
  'amendement',
  'amendements',
  'article',
  'compare',
  'comparer',
  'montre',
  'quels',
  'quelle',
  'entre',
  'dans',
  'pour',
  'avec',
  'sont',
  'texte'
])

const words = (normalized: string) => normalized.split(' ').filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

export type IndexedRecord = CandidateRecord & { normalized: string; numeroKey: string }

/** Pré-normalise un jeu une fois (côté serveur) pour que chaque question reste linéaire et bornée. */
export const indexCandidates = (records: CandidateRecord[]): IndexedRecord[] =>
  records.map((record) => ({
    ...record,
    normalized: ` ${normalizeQuestion(record.text)} `,
    numeroKey: normalizeQuestion(record.numero)
  }))

/**
 * Liste blanche compacte pour le prompt : nœuds structurels bornés, puis numéros exacts cités, puis meilleurs
 * candidats lexicaux. La taille ne dépend pas de la taille du jeu.
 */
export const selectCandidates = (
  question: string,
  records: IndexedRecord[],
  structural: PromptEntity[],
  options: CandidateOptions = {}
): PromptEntity[] => {
  const max = options.maxCandidates ?? MAX_CANDIDATES
  const excerpt = options.excerptLength ?? EXCERPT_LENGTH
  const q = normalizeQuestion(question)
  const tokens = new Set([...extractNumbers(q), ...q.split(' ').filter((token) => /^[a-z]{1,4}\d+$/.test(token))])
  const exact = records.filter((record) => tokens.has(record.numeroKey))
  const terms = words(q)
  const scored: Array<{ record: IndexedRecord; score: number; index: number }> = []
  if (terms.length > 0) {
    records.forEach((record, index) => {
      let score = 0
      for (const term of terms) if (record.normalized.includes(` ${term}`)) score += 1
      if (score > 0) scored.push({ record, score, index })
    })
    scored.sort((a, b) => b.score - a.score || a.index - b.index)
  }
  const chosen = new Map<string, IndexedRecord>()
  for (const record of [...exact, ...scored.map((item) => item.record)]) {
    if (chosen.size >= max) break
    chosen.set(record.id, record)
  }
  const label = (record: IndexedRecord) =>
    `n° ${record.numero} · ${record.group} · ${record.text.replace(/\s+/g, ' ').slice(0, excerpt)}`
  return [
    ...structural.slice(0, options.maxStructural ?? MAX_STRUCTURAL),
    ...[...chosen.values()].map((record) => ({ id: record.id, label: label(record) }))
  ]
}
