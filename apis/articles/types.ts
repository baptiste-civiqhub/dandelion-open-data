export type Alinea = {
  id: string
  numero: number
}

export type Article = {
  id: string
  designation: string
  titre: string | null
  ordre: number
  /** Alinéas de l'article, triés par `numero` (contrat R2). */
  alineas: Alinea[]
}
