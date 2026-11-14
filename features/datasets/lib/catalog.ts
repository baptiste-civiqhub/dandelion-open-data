import type { FlowerDatasetId } from '@/features/texte/lib/datasets'

export type CatalogEntry = { id: FlowerDatasetId; records: number; keywords: string[] }

/** Jeux réellement branchés à la fleur. Les effectifs sont vérifiés par catalog.test.ts contre les fixtures. */
export const CATALOG: CatalogEntry[] = [
  { id: 'pfas-senat-620', records: 32, keywords: ['pfas', 'senat', 'sénat', 'polluants', 'amendements'] },
  {
    id: 'police-municipale-an-2464',
    records: 392,
    keywords: ['police', 'municipale', 'assemblee', 'assemblée', 'hemicycle', 'hémicycle', 'amendements']
  }
]

const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/** Filtre du catalogue par la recherche du header : identifiant, mots-clés ou nom affiché. */
export const filterCatalog = (
  entries: CatalogEntry[],
  query: string | undefined,
  nameOf: (id: FlowerDatasetId) => string
) => {
  const q = fold(query ?? '')
  if (!q) return entries
  return entries.filter((entry) =>
    [entry.id, nameOf(entry.id), ...entry.keywords].some((value) => fold(value).includes(q))
  )
}
