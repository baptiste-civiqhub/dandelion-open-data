import type { AmendementSummary } from '@/apis/amendements/types'

export type SunburstFilters = {
  /** Sorts décochés dans la légende. Vide : tous les sorts passent. */
  excludedSorts: readonly string[]
  /** Tags actifs : un amendement passe s'il porte l'un d'eux. */
  tagIds: readonly string[]
  /** Recherche libre sur le numéro ou le groupe. */
  query: string
}

export const NO_FILTERS: SunburstFilters = { excludedSorts: [], tagIds: [], query: '' }

export const hasActiveFilters = (filters: SunburstFilters) =>
  filters.excludedSorts.length > 0 || filters.tagIds.length > 0 || filters.query.trim() !== ''

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/**
 * Règle des filtres (BR-G2) : ET entre familles (sorts, tags, recherche), OU à l'intérieur d'une famille.
 * `tagIdsByList` relie `tag_list_id` aux tags posés (contrat R11) ; absent, la famille des tags ne retient rien.
 */
export function matchesFilters(
  amendement: AmendementSummary,
  filters: SunburstFilters,
  tagIdsByList?: ReadonlyMap<string, readonly string[]>
): boolean {
  if (filters.excludedSorts.length && filters.excludedSorts.includes(amendement.sort)) return false
  if (filters.tagIds.length) {
    const tags = tagIdsByList?.get(amendement.tagListId) ?? []
    if (!filters.tagIds.some((tagId) => tags.includes(tagId))) return false
  }
  const query = normalize(filters.query)
  if (query) {
    const haystack = [amendement.numeroLong, amendement.groupePolitiqueRef ?? ''].map(normalize)
    if (!haystack.some((value) => value.includes(query))) return false
  }
  return true
}

/** Nombre d'amendements par code de sort. */
export function countBySort(amendements: readonly Pick<AmendementSummary, 'sort'>[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const amendement of amendements) counts.set(amendement.sort, (counts.get(amendement.sort) ?? 0) + 1)
  return counts
}

/** Ajoute ou retire un sort de la liste des sorts décochés. */
export function toggleExcludedSort(excluded: readonly string[], code: string): string[] {
  return excluded.includes(code) ? excluded.filter((value) => value !== code) : [...excluded, code]
}
