/** Forme légère d'un amendement (contrat R5) : de quoi le placer dans l'arbre, le compter et le relier, sans son texte. */
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
  sort: string
  /** Référence du groupe politique de l'auteur (code Hémicycle), sans libellé en base. */
  groupePolitiqueRef: string | null
  /** Clés de regroupement : deux amendements de même valeur sont débattus ensemble, ou sont identiques. */
  discussionCommune: string | null
  discussionIdentique: string | null
  tagListId: string
}

/** Fiche complète d'un amendement (contrat R7), chargée au clic. */
export type AmendementDetail = {
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
