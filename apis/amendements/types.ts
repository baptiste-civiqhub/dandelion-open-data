/** Forme légère d'un amendement : de quoi le placer dans l'arbre et le compter, sans son texte. */
export type AmendementSummary = {
  id: string
  numeroLong: string
  articleId: string | null
  alineaId: string | null
  parentId: string | null
  /** `A` (à l'article), `AVANT` ou `APRES` (article additionnel). */
  divisionAvantApres: string
  rang: number | null
  /** Code de sort : clé de la légende (`apis/sorts`). */
  dateDepot?: string | null
  typeAuteur?: string | null
  sourceUrl?: string | null
  sort: string
  groupePolitiqueRef?: string | null
  discussionCommune?: string | null
  discussionIdentique?: string | null
  tagListId?: string
}

export type AmendementDetail = {
  id: string
  texteId: string
  uid: string
  numeroLong: string
  dispositif: string | null
  exposeSommaire: string | null
  signataires: string | null
  sort: string
  sourceUrl: string | null
}

export type SunburstAmendementDetail = {
  id: string
  numeroLong: string
  sort: string
  signataires: string | null
  groupePolitiqueRef: string | null
  /** Textes longs, tels que servis par la source (balisage HTML possible). */
  dispositif: string | null
  exposeSommaire: string | null
  documentUri: string | null
  articleDesignation: string | null
  alineaNumero: number | null
  divisionAvantApres: string
}
