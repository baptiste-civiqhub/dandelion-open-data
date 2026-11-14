import type { PfasAmendment, PfasTargetPlacement } from '@/apis/pfas-amendments/types'

import { compareAmendments, comparePlacements } from './ordering'

export type PfasTreeNode = {
  amendment: PfasAmendment
  children: PfasTreeNode[]
  /** `parentId` renseigné mais absent du corpus : affiché à la racine, jamais rattaché à un voisin. */
  missingParent: boolean
}

export type PfasTreeGroup = {
  subdivision: string
  placement: PfasTargetPlacement
  nodes: PfasTreeNode[]
  total: number
}

const countNodes = (nodes: PfasTreeNode[]): number =>
  nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0)

/**
 * Texte → subdivision → amendement → sous-amendement. Un enfant n'est rattaché que par un `parentId` explicite
 * (relation sourcée), jamais par proximité de numéro ou de position.
 */
export function buildHierarchy(amendments: PfasAmendment[]): PfasTreeGroup[] {
  const byId = new Map(amendments.map((a) => [a.id, a]))
  const childrenOf = new Map<string, PfasAmendment[]>()
  const roots: { amendment: PfasAmendment; missingParent: boolean }[] = []

  for (const amendment of amendments) {
    if (amendment.parentId && amendment.parentId !== amendment.id && byId.has(amendment.parentId)) {
      const siblings = childrenOf.get(amendment.parentId) ?? []
      siblings.push(amendment)
      childrenOf.set(amendment.parentId, siblings)
    } else {
      roots.push({ amendment, missingParent: Boolean(amendment.parentId) })
    }
  }

  const visited = new Set<string>()
  const toNode = (amendment: PfasAmendment, missingParent: boolean): PfasTreeNode => {
    visited.add(amendment.id)
    const children = (childrenOf.get(amendment.id) ?? [])
      .filter((child) => !visited.has(child.id))
      .sort(compareAmendments)
      .map((child) => toNode(child, false))
    return { amendment, children, missingParent }
  }

  const rootNodes = roots
    .sort((a, b) => compareAmendments(a.amendment, b.amendment))
    .map((r) => toNode(r.amendment, r.missingParent))
  // Cycle de parentId (donnée incohérente) : les membres restent visibles à la racine.
  for (const amendment of [...amendments].sort(compareAmendments)) {
    if (!visited.has(amendment.id)) rootNodes.push(toNode(amendment, true))
  }

  const groups = new Map<string, PfasTreeGroup>()
  for (const node of rootNodes) {
    const { subdivision, targetPlacement } = node.amendment
    const group = groups.get(subdivision) ?? { subdivision, placement: targetPlacement, nodes: [], total: 0 }
    group.nodes.push(node)
    groups.set(subdivision, group)
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      nodes: group.nodes.sort((a, b) => compareAmendments(a.amendment, b.amendment)),
      total: countNodes(group.nodes)
    }))
    .sort((a, b) => comparePlacements(a.placement, b.placement) || a.subdivision.localeCompare(b.subdivision, 'fr'))
}

export function findAmendment(amendments: PfasAmendment[], id: string | null): PfasAmendment | null {
  return amendments.find((a) => a.id === id) ?? null
}
