export type Intention = 'supprimer' | 'reecrire' | 'ajouter' | 'modifier' | 'autre'

export type Amendment = {
  id: string
  numero: string
  article: string
  dispositif: string
  expose: string | null
  parentId: string | null
  discussionCommune: string | null
  discussionIdentique: string | null
  authorLabel: string | null
  groupLabel: string | null
  sort: string | null
}

export type TexteSnapshot = {
  id: string
  titre: string
  sourceNom: string
  sourceUrl: string
  licence: string
  amendments: Amendment[]
}

export type NodeKind = 'texte' | 'article' | 'intention' | 'discussion' | 'doublon' | 'amendement' | 'reste'

export type DandelionNode = {
  id: string
  kind: NodeKind
  label: string
  weight: number
  children: DandelionNode[]
  amendmentId?: string
}

export type LayoutNode = {
  id: string
  kind: NodeKind
  label: string
  weight: number
  depth: number
  angle0: number
  angle1: number
  radius: number
  x: number
  y: number
  parentId: string | null
  amendmentId?: string
}
