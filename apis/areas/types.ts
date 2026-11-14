/** Une zone de l'atlas : un jeu de données et ce qu'il faut pour la lister, la filtrer et la placer sur la carte. */
export type Area = {
  id: string
  /** Identifiant lisible, utilisé dans l'URL de la zone. */
  slug: string
  name: string
  description: string | null
  texteCount: number
  tagIds: string[]
}

export type AreaTexte = {
  id: string
  uid: string
  titre: string
  etapeTexte: string | null
}

export type AreaTag = {
  id: string
  slug: string
  label: string
  category: string
}

export type AreaDetail = {
  id: string
  slug: string
  name: string
  description: string | null
  sourceLabel: string
  license: string
  importedAt: string
  textes: AreaTexte[]
  tags: AreaTag[]
}
