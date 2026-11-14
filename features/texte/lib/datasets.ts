import type { PfasSnapshot } from '@/apis/pfas-amendments/types'
import type { Amendment, TexteSnapshot } from '@/apis/texte/types'

export const FLOWER_DATASET_IDS = ['police-municipale-an-2464', 'pfas-senat-620'] as const
export type FlowerDatasetId = (typeof FLOWER_DATASET_IDS)[number]

export const isFlowerDatasetId = (value: string): value is FlowerDatasetId =>
  (FLOWER_DATASET_IDS as readonly string[]).includes(value)

export type FlowerProvenance = {
  publisher: string
  sourceUrl: string
  licence: string
  /** `hemicycle-team` : instantané Hémicycle enregistré par l'équipe ; `senat-csv` : export public daté du Sénat. */
  origin: 'hemicycle-team' | 'senat-csv'
  retrievedAtUtc: string | null
  sha256: string | null
}

export type FlowerDataset = {
  id: FlowerDatasetId
  snapshot: TexteSnapshot
  /** URL officielle par identifiant d'amendement ; `null` = absente de la source, jamais reconstruite. */
  sourceUrls: Record<string, string | null>
  provenance: FlowerProvenance
}

export type DatasetGaps = { total: number; missingText: number; missingUrl: number; missingExpose: number }

/** Jeu de l'équipe (polices municipales) : aucune URL par amendement n'existe dans la fixture. */
export const teamToFlowerDataset = (snapshot: TexteSnapshot): FlowerDataset => ({
  id: 'police-municipale-an-2464',
  snapshot,
  sourceUrls: Object.fromEntries(snapshot.amendments.map((amendment) => [amendment.id, null])),
  provenance: {
    publisher: snapshot.sourceNom,
    sourceUrl: snapshot.sourceUrl,
    licence: snapshot.licence,
    origin: 'hemicycle-team',
    retrievedAtUtc: null,
    sha256: null
  }
})

/** Instantané PFAS → contrat de la fleur, identifiants et liens officiels conservés tels quels. */
export const pfasToFlowerDataset = (pfas: PfasSnapshot): FlowerDataset => {
  const amendments: Amendment[] = pfas.amendments.map((item) => ({
    id: item.id,
    numero: item.number,
    article: item.subdivision,
    dispositif: item.proposalText,
    expose: item.explanatoryText.length > 0 ? item.explanatoryText : null,
    parentId: item.parentId,
    discussionCommune: null,
    discussionIdentique: null,
    authorLabel: item.author,
    groupLabel: null,
    sort: item.outcomeRaw
  }))
  return {
    id: 'pfas-senat-620',
    snapshot: {
      id: 'senat-2023-2024-620',
      titre: pfas.provenance.text,
      sourceNom: pfas.provenance.publisher,
      sourceUrl: pfas.provenance.referencePageUrl,
      licence: pfas.provenance.licenceUrl,
      amendments
    },
    sourceUrls: Object.fromEntries(pfas.amendments.map((item) => [item.id, item.sourceUrl])),
    provenance: {
      publisher: pfas.provenance.publisher,
      sourceUrl: pfas.provenance.referencePageUrl,
      licence: pfas.provenance.licenceUrl,
      origin: 'senat-csv',
      retrievedAtUtc: pfas.provenance.retrievedAtUtc,
      sha256: pfas.provenance.sha256
    }
  }
}

export const datasetGaps = (dataset: FlowerDataset): DatasetGaps => {
  const { amendments } = dataset.snapshot
  return {
    total: amendments.length,
    missingText: amendments.filter((amendment) => amendment.dispositif.trim() === '').length,
    missingUrl: amendments.filter((amendment) => !dataset.sourceUrls[amendment.id]).length,
    missingExpose: amendments.filter((amendment) => !amendment.expose).length
  }
}
