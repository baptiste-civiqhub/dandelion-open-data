import type { DandelionNode } from '@/apis/texte/types'

export type TreeIndex = {
  byId: Map<string, DandelionNode>
  parentOf: Map<string, string | null>
  nodeIdByAmendment: Map<string, string>
}

/** Index itératif (pas de récursion : arbres profonds) des nœuds, parents et feuilles amendement. */
export const indexTree = (tree: DandelionNode): TreeIndex => {
  const byId = new Map<string, DandelionNode>()
  const parentOf = new Map<string, string | null>()
  const nodeIdByAmendment = new Map<string, string>()
  const stack: Array<{ node: DandelionNode; parent: string | null }> = [{ node: tree, parent: null }]
  while (stack.length > 0) {
    const { node, parent } = stack.pop() as { node: DandelionNode; parent: string | null }
    if (byId.has(node.id)) continue
    byId.set(node.id, node)
    parentOf.set(node.id, parent)
    if (node.amendmentId) nodeIdByAmendment.set(node.amendmentId, node.id)
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const child = node.children[i]
      if (child) stack.push({ node: child, parent: node.id })
    }
  }
  return { byId, parentOf, nodeIdByAmendment }
}

/** Chemin racine → nœud (fil d'Ariane). Vide si l'identifiant est inconnu. */
export const pathTo = (index: TreeIndex, id: string | null): DandelionNode[] => {
  if (!id || !index.byId.has(id)) return []
  const path: DandelionNode[] = []
  let cursor: string | null = id
  while (cursor) {
    const node = index.byId.get(cursor)
    if (!node) break
    path.unshift(node)
    cursor = index.parentOf.get(cursor) ?? null
  }
  return path
}

/** Identifiant de nœud pour un identifiant d'amendement ou de nœud structurel ; `null` si inconnu. */
export const resolveNodeId = (index: TreeIndex, id: string): string | null =>
  index.nodeIdByAmendment.get(id) ?? (index.byId.has(id) ? id : null)
