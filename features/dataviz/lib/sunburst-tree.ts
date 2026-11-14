import type { AmendementSummary } from '@/apis/amendements/types'
import type { Article } from '@/apis/articles/types'

export type SunburstNodeKind = 'texte' | 'article' | 'additional' | 'other' | 'whole' | 'alinea' | 'amendement'

export type SunburstNode = {
  id: string
  /** Rang dans `SunburstTree.nodes` : index des tableaux d'animation de la scène. */
  index: number
  kind: SunburstNodeKind
  label: string
  /** Amendements contenus, sous-amendements compris (BR-S2). Un amendement se compte lui-même. */
  value: number
  depth: number
  /** Étendue sur le tour complet du texte, en fraction de tour, depuis midi en sens horaire (BR-S3). */
  x0: number
  x1: number
  parent: SunburstNode | null
  children: SunburstNode[]
  amendement: AmendementSummary | null
  /** Article additionnel : bord en pointillé (BR-S5). */
  dashed: boolean
}

export type SunburstTree = {
  root: SunburstNode
  nodes: SunburstNode[]
  byId: Map<string, SunburstNode>
  /** Nœuds de chaque profondeur, par `x0` croissant : recherche du secteur sous le curseur. */
  byDepth: SunburstNode[][]
  amendementCount: number
}

export type SunburstLabels = {
  texte: string
  whole: string
  other: string
  alinea: (numero: number) => string
  additional: (designation: string, position: 'AVANT' | 'APRES') => string
}

export const ROOT_ID = 'texte'

export const nodeId = {
  article: (id: string) => `art.${id}`,
  whole: (articleId: string) => `whole.${articleId}`,
  alinea: (id: string) => `al.${id}`,
  additional: (articleId: string, position: 'AVANT' | 'APRES') => `add.${articleId}.${position}`,
  other: 'other',
  amendement: (id: string) => `am.${id}`
}

const byTextOrder = (a: AmendementSummary, b: AmendementSummary) =>
  (a.rang ?? Number.MAX_SAFE_INTEGER) - (b.rang ?? Number.MAX_SAFE_INTEGER) ||
  a.numeroLong.localeCompare(b.numeroLong, 'fr', { numeric: true })

type Draft = Omit<SunburstNode, 'index' | 'depth' | 'x0' | 'x1' | 'parent'>

const container = (id: string, kind: SunburstNodeKind, label: string, children: Draft[], dashed = false): Draft => ({
  id,
  kind,
  label,
  value: children.reduce((sum, child) => sum + child.value, 0),
  children: children as SunburstNode[],
  amendement: null,
  dashed
})

/**
 * Hiérarchie du disque (BR-S1 à BR-S6) : texte → articles (avec leurs articles additionnels avant et après) →
 * « Article entier » puis alinéas → amendements → sous-amendements. Les amendements sans article résolu vont dans
 * « Autres emplacements », en fin de tour. Les étendues angulaires sont calculées une fois pour tout le texte.
 */
export function buildSunburstTree(
  articles: readonly Article[],
  amendements: readonly AmendementSummary[],
  labels: SunburstLabels
): SunburstTree {
  const ordered = [...amendements].sort(byTextOrder)
  const known = new Set(ordered.map((amendement) => amendement.id))
  const subsByParent = new Map<string, AmendementSummary[]>()
  const tops: AmendementSummary[] = []
  for (const amendement of ordered) {
    if (amendement.parentId && amendement.parentId !== amendement.id && known.has(amendement.parentId)) {
      const subs = subsByParent.get(amendement.parentId)
      if (subs) subs.push(amendement)
      else subsByParent.set(amendement.parentId, [amendement])
    } else tops.push(amendement)
  }

  const placed = new Set<string>()
  const amendementNode = (amendement: AmendementSummary): Draft => {
    placed.add(amendement.id)
    const children = (subsByParent.get(amendement.id) ?? []).filter((sub) => !placed.has(sub.id)).map(amendementNode)
    return {
      id: nodeId.amendement(amendement.id),
      kind: 'amendement',
      label: amendement.numeroLong,
      value: 1 + children.reduce((sum, child) => sum + child.value, 0),
      children: children as SunburstNode[],
      amendement,
      dashed: false
    }
  }

  const articleIds = new Set(articles.map((article) => article.id))
  const alineaArticle = new Map<string, string>()
  for (const article of articles) for (const alinea of article.alineas) alineaArticle.set(alinea.id, article.id)

  const whole = new Map<string, AmendementSummary[]>()
  const byAlinea = new Map<string, AmendementSummary[]>()
  const before = new Map<string, AmendementSummary[]>()
  const after = new Map<string, AmendementSummary[]>()
  const other: AmendementSummary[] = []
  const push = (map: Map<string, AmendementSummary[]>, key: string, amendement: AmendementSummary) => {
    const list = map.get(key)
    if (list) list.push(amendement)
    else map.set(key, [amendement])
  }
  for (const amendement of tops) {
    const articleId = amendement.articleId
    if (!articleId || !articleIds.has(articleId)) other.push(amendement)
    else if (amendement.divisionAvantApres === 'AVANT') push(before, articleId, amendement)
    else if (amendement.divisionAvantApres === 'APRES') push(after, articleId, amendement)
    else if (amendement.alineaId && alineaArticle.get(amendement.alineaId) === articleId)
      push(byAlinea, amendement.alineaId, amendement)
    else push(whole, articleId, amendement)
  }

  const rootChildren: Draft[] = []
  for (const article of [...articles].sort((a, b) => a.ordre - b.ordre)) {
    const additional = (position: 'AVANT' | 'APRES', list: AmendementSummary[] | undefined) => {
      if (list?.length)
        rootChildren.push(
          container(
            nodeId.additional(article.id, position),
            'additional',
            labels.additional(article.designation, position),
            list.map(amendementNode),
            true
          )
        )
    }
    additional('AVANT', before.get(article.id))
    const children: Draft[] = []
    const wholeList = whole.get(article.id)
    if (wholeList?.length)
      children.push(container(nodeId.whole(article.id), 'whole', labels.whole, wholeList.map(amendementNode)))
    for (const alinea of [...article.alineas].sort((a, b) => a.numero - b.numero)) {
      children.push(
        container(
          nodeId.alinea(alinea.id),
          'alinea',
          labels.alinea(alinea.numero),
          (byAlinea.get(alinea.id) ?? []).map(amendementNode)
        )
      )
    }
    rootChildren.push(container(nodeId.article(article.id), 'article', article.designation, children))
    additional('APRES', after.get(article.id))
  }
  if (other.length) rootChildren.push(container(nodeId.other, 'other', labels.other, other.map(amendementNode)))

  const root = container(ROOT_ID, 'texte', labels.texte, rootChildren) as SunburstNode
  const nodes: SunburstNode[] = []
  const byId = new Map<string, SunburstNode>()
  const byDepth: SunburstNode[][] = []

  const visit = (node: SunburstNode, parent: SunburstNode | null, depth: number, x0: number, x1: number) => {
    node.parent = parent
    node.depth = depth
    node.x0 = x0
    node.x1 = x1
    node.index = nodes.length
    nodes.push(node)
    byId.set(node.id, node)
    ;(byDepth[depth] ??= []).push(node)

    const total = node.children.reduce((sum, child) => sum + child.value, 0)
    let cursor = x0
    if (total === 0) {
      // Aucun amendement dessous (texte vide, AC-P3) : parts égales, pour que la structure reste lisible.
      const step = node.children.length ? (x1 - x0) / node.children.length : 0
      for (const child of node.children) {
        visit(child, node, depth + 1, cursor, cursor + step)
        cursor += step
      }
      return
    }
    // Un amendement garde la part de lui-même : ses sous-amendements n'occupent que leur propre part.
    const denominator = node.kind === 'amendement' ? node.value : total
    for (const child of node.children) {
      const span = ((x1 - x0) * child.value) / denominator
      visit(child, node, depth + 1, cursor, cursor + span)
      cursor += span
    }
  }
  visit(root, null, 0, 0, 1)

  return { root, nodes, byId, byDepth, amendementCount: amendements.length }
}

/** Le focus est toujours un conteneur (BR-N1) : tout sauf un amendement sans sous-amendement. */
export const isContainer = (node: SunburstNode) => node.kind !== 'amendement' || node.children.length > 0

export function isDescendantOrSelf(node: SunburstNode, ancestor: SunburstNode): boolean {
  for (let current: SunburstNode | null = node; current; current = current.parent) if (current === ancestor) return true
  return false
}

/** Chemin du texte jusqu'au nœud, racine comprise. */
export function pathTo(node: SunburstNode): SunburstNode[] {
  const path: SunburstNode[] = []
  for (let current: SunburstNode | null = node; current; current = current.parent) path.unshift(current)
  return path
}

/** Premier conteneur qui englobe le nœud (lui-même s'il en est un) : là où zoomer pour le montrer. */
export function containerOf(node: SunburstNode): SunburstNode {
  let current: SunburstNode | null = node.parent
  while (current && !isContainer(current)) current = current.parent
  return current ?? node
}

/** Amendements du sous-arbre (sous-amendements compris), dans l'ordre du texte. */
export function amendementsUnder(node: SunburstNode): AmendementSummary[] {
  const out: AmendementSummary[] = []
  const walk = (current: SunburstNode) => {
    if (current.amendement) out.push(current.amendement)
    for (const child of current.children) walk(child)
  }
  walk(node)
  return out
}

/** Nœud de la profondeur donnée dont l'étendue contient `x` (recherche dichotomique). */
export function nodeAt(tree: SunburstTree, depth: number, x: number): SunburstNode | null {
  const row = tree.byDepth[depth]
  if (!row) return null
  let lo = 0
  let hi = row.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const node = row[mid]
    if (x < node.x0) hi = mid - 1
    else if (x >= node.x1) lo = mid + 1
    else return node.x1 > node.x0 ? node : null
  }
  return null
}
