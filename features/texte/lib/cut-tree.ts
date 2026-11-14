import type { DandelionNode } from '@/apis/texte/types'

import { assignAngles } from './angles'
import { EXPAND_ARC_PX, FOCUS_SHARE } from './constants'

type CutArgs = { focusId: string | null; budget: number; outerRadiusPx: number }

const countNodes = (node: DandelionNode): number => 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)

const contains = (node: DandelionNode, id: string | null): boolean => {
  if (!id) return false
  if (node.id === id) return true
  return node.children.some((child) => contains(child, id))
}

const ancestorIds = (node: DandelionNode, focusId: string, path: string[] = []): string[] | null => {
  if (node.id === focusId) return path
  for (const child of node.children) {
    const found = ancestorIds(child, focusId, [...path, node.id])
    if (found) return found
  }
  return null
}

const withoutChildren = (node: DandelionNode): DandelionNode => ({ ...node, children: [] })

const resteNode = (parent: DandelionNode, excluded: DandelionNode[]): DandelionNode => ({
  id: `${parent.id}/reste`,
  kind: 'reste',
  label: 'reste',
  weight: excluded.reduce((sum, node) => sum + node.weight, 0),
  children: []
})

export const cutTree = (tree: DandelionNode, args: CutArgs): DandelionNode => {
  const spans = assignAngles(tree, {
    focusId: args.focusId,
    focusShare: FOCUS_SHARE,
    outerRadiusPx: args.outerRadiusPx
  })
  const ancestors = new Set(args.focusId ? (ancestorIds(tree, args.focusId) ?? []) : [])

  const expandable = (node: DandelionNode): boolean => {
    if (node.children.length === 0) return false
    if (args.focusId && (node.id === args.focusId || ancestors.has(node.id))) return true
    if (node.kind === 'texte') return true
    if (node.kind === 'article') {
      const span = spans.get(node.id)
      if (!span) return false
      return (span.angle1 - span.angle0) * args.outerRadiusPx >= EXPAND_ARC_PX
    }
    return false
  }

  const structural = (node: DandelionNode): DandelionNode => {
    if (!expandable(node)) return withoutChildren(node)
    return { ...node, children: node.children.map(structural) }
  }

  const fit = (node: DandelionNode, slots: number): DandelionNode => {
    if (slots <= 1 || node.children.length === 0) return withoutChildren(node)
    const kids = node.children
    const room = slots - 1
    const order = kids
      .map((child, index) => ({ child, index }))
      .sort((a, b) => {
        const aFocus = contains(a.child, args.focusId) ? 1 : 0
        const bFocus = contains(b.child, args.focusId) ? 1 : 0
        if (aFocus !== bFocus) return bFocus - aFocus
        if (a.child.weight !== b.child.weight) return b.child.weight - a.child.weight
        return a.index - b.index
      })
      .map((item) => item.index)

    const taken = new Set<number>()
    let used = 0
    let partial: { index: number; slots: number } | null = null

    for (const index of order) {
      const child = kids[index]
      if (!child) continue
      const size = countNodes(child)
      const othersRemain = taken.size + 1 < kids.length
      const reserve = othersRemain ? 1 : 0
      if (used + size + reserve <= room) {
        taken.add(index)
        used += size
        continue
      }
      const childSlots = room - used - reserve
      if (childSlots >= 1) {
        partial = { index, slots: childSlots }
        used += childSlots
      }
      break
    }

    const included = new Set(taken)
    if (partial) included.add(partial.index)
    const excluded = kids.filter((_, index) => !included.has(index))
    const children: DandelionNode[] = []
    let restePlaced = false
    kids.forEach((child, index) => {
      if (taken.has(index)) {
        children.push(child)
        return
      }
      if (partial?.index === index) {
        children.push(fit(child, partial.slots))
        return
      }
      if (!restePlaced && excluded.length > 0) {
        children.push(resteNode(node, excluded))
        restePlaced = true
      }
    })
    return { ...node, children }
  }

  return fit(structural(tree), Math.max(args.budget, 1))
}
