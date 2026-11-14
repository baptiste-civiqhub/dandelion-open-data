import type { AmendementSummary } from '@/apis/amendements/types'
import type { Sort } from '@/apis/sorts/types'

export type OutcomeCount = {
  code: string
  label: string
  colorToken: string
  count: number
}

/**
 * Nombre d'amendements par sort, dans l'ordre de la légende. Tous les sorts connus sont rendus, même à zéro.
 * Un code absent de la légende (donnée incohérente) est ajouté à la fin sous son propre code, pour rester visible.
 */
export function summarizeOutcomes(
  sorts: readonly Sort[],
  amendements: readonly Pick<AmendementSummary, 'sort'>[]
): OutcomeCount[] {
  const counts = new Map<string, number>()
  for (const amendement of amendements) {
    counts.set(amendement.sort, (counts.get(amendement.sort) ?? 0) + 1)
  }

  const known = [...sorts]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((sort) => ({
      code: sort.code,
      label: sort.label,
      colorToken: sort.colorToken,
      count: counts.get(sort.code) ?? 0
    }))

  const knownCodes = new Set(sorts.map((sort) => sort.code))
  const unknown = [...counts.entries()]
    .filter(([code]) => !knownCodes.has(code))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, count]) => ({ code, label: code, colorToken: '', count }))

  return [...known, ...unknown]
}
