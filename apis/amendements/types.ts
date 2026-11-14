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
  sort: string
}
