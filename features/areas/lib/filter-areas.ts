import type { Area } from '@/apis/areas/types'
import type { Tag } from '@/apis/tags/types'

export type AreaFilter = {
  query: string
  tagIds: readonly string[]
}

/** Texte comparable : sans accent, en minuscules, espaces réduits (« Sécurité  sociale » → « securite sociale »). */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Zones qui passent le filtre. Recherche : chaque mot doit apparaître dans le nom, le slug, la description ou le
 * libellé d'un tag de la zone. Tags : au moins un des tags choisis par catégorie, toutes les catégories choisies
 * devant être satisfaites (deux thèmes élargissent, un thème et un type restreignent).
 */
export function filterAreas(areas: readonly Area[], tags: readonly Tag[], filter: AreaFilter): Area[] {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))
  const terms = normalizeSearchText(filter.query).split(' ').filter(Boolean)

  const selectedByCategory = new Map<string, Set<string>>()
  for (const tagId of filter.tagIds) {
    const category = tagById.get(tagId)?.category ?? ''
    const selected = selectedByCategory.get(category)
    if (selected) selected.add(tagId)
    else selectedByCategory.set(category, new Set([tagId]))
  }

  return areas.filter((area) => {
    for (const selected of selectedByCategory.values()) {
      if (!area.tagIds.some((tagId) => selected.has(tagId))) return false
    }
    if (terms.length === 0) return true

    const tagLabels = area.tagIds.map((tagId) => tagById.get(tagId)?.label ?? '')
    const haystack = normalizeSearchText([area.name, area.slug, area.description ?? '', ...tagLabels].join(' '))
    return terms.every((term) => haystack.includes(term))
  })
}

/** Nombre de zones portant chaque tag, par identifiant de tag. Un tag absent du résultat n'est porté par aucune zone. */
export function countAreasByTag(areas: readonly Area[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const area of areas) {
    for (const tagId of new Set(area.tagIds)) {
      counts[tagId] = (counts[tagId] ?? 0) + 1
    }
  }
  return counts
}
