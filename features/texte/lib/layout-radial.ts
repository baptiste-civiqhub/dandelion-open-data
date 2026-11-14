import type { DandelionNode, LayoutNode } from '@/apis/texte/types'

import { assignAngles } from './angles'

type LayoutArgs = { focusId: string | null; focusShare: number; outerRadiusPx: number }

const depthOf = (node: DandelionNode, depth: number): number => {
  if (node.children.length === 0) return depth
  return Math.max(...node.children.map((child) => depthOf(child, depth + 1)))
}

export const layoutRadial = (visible: DandelionNode, args: LayoutArgs): LayoutNode[] => {
  const spans = assignAngles(visible, {
    focusId: args.focusId,
    focusShare: args.focusShare,
    outerRadiusPx: args.outerRadiusPx
  })
  const maxDepth = depthOf(visible, 0)

  const flatten = (node: DandelionNode, parentId: string | null, depth: number): LayoutNode[] => {
    const span = spans.get(node.id) ?? { angle0: 0, angle1: 0 }
    const radius = maxDepth === 0 ? 0 : (depth / maxDepth) * args.outerRadiusPx
    const mid = (span.angle0 + span.angle1) / 2
    const self: LayoutNode = {
      id: node.id,
      kind: node.kind,
      label: node.label,
      weight: node.weight,
      depth,
      angle0: span.angle0,
      angle1: span.angle1,
      radius,
      x: radius * Math.cos(mid),
      y: radius * Math.sin(mid),
      parentId,
      ...(node.amendmentId ? { amendmentId: node.amendmentId } : {})
    }
    return [self, ...node.children.flatMap((child) => flatten(child, node.id, depth + 1))]
  }

  return flatten(visible, null, 0)
}
