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
  sourceUrl?: string | null
  sort: string
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
