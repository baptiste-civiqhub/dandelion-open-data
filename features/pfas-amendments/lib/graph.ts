import type { PfasAmendment } from '@/apis/pfas-amendments/types'

import { buildHierarchy } from './hierarchy'
import { compareAmendments } from './ordering'

export type AmendmentGraphNode = {
  id: string
  kind: 'bill' | 'article' | 'amendment'
  label: string
  subdivision: string | null
  x: number
  y: number
  radius: number
}

export type AmendmentGraphEdge = {
  id: string
  source: string
  target: string
  kind: 'membership' | 'sub-amendment'
  sourceUrl: string | null
}

export type AmendmentGraph = { nodes: AmendmentGraphNode[]; edges: AmendmentGraphEdge[] }

/** Radial navigation layout: positions carry no political, semantic or causal meaning. */
export function buildAmendmentGraph(amendments: PfasAmendment[], subdivision?: string): AmendmentGraph {
  const visible = amendments.filter((amendment) => !subdivision || amendment.subdivision === subdivision)
  if (!visible.length) return { nodes: [], edges: [] }
  const groups = buildHierarchy(visible)
  const nodes: AmendmentGraphNode[] = []
  const edges: AmendmentGraphEdge[] = []
  const visibleIds = new Set(visible.map((amendment) => amendment.id))
  const multipleGroups = groups.length > 1
  const billId = 'bill:620'
  if (multipleGroups) {
    nodes.push({ id: billId, kind: 'bill', label: 'PFAS', subdivision: null, x: 500, y: 300, radius: 36 })
  }
  const weights = groups.map((group) => Math.max(3, group.total))
  const weightTotal = weights.reduce((sum, value) => sum + value, 0)
  let offset = 0
  groups.forEach((group, groupIndex) => {
    const articleId = `article:${group.subdivision}`
    const members = visible.filter((amendment) => amendment.subdivision === group.subdivision).sort(compareAmendments)
    const angle = ((offset + weights[groupIndex] / 2) / weightTotal) * Math.PI * 2 - Math.PI / 2
    nodes.push({
      id: articleId,
      kind: 'article',
      label: group.subdivision,
      subdivision: group.subdivision,
      x: multipleGroups ? 500 + Math.cos(angle) * 240 : 500,
      y: multipleGroups ? 300 + Math.sin(angle) * 130 : 300,
      radius: 32
    })
    if (multipleGroups)
      edges.push({
        id: `${billId}:${articleId}`,
        source: billId,
        target: articleId,
        kind: 'membership',
        sourceUrl: null
      })
    members.forEach((amendment, index) => {
      const fraction = multipleGroups
        ? (offset + ((index + 0.5) / members.length) * weights[groupIndex]) / weightTotal
        : (index + 0.5) / members.length
      const theta = fraction * Math.PI * 2 - Math.PI / 2
      nodes.push({
        id: amendment.id,
        kind: 'amendment',
        label: amendment.numberLabel,
        subdivision: amendment.subdivision,
        x: 500 + Math.cos(theta) * 410,
        y: 300 + Math.sin(theta) * 230,
        radius: 18
      })
      const sourcedParent =
        amendment.parentId && amendment.parentRelation?.sourceUrl && visibleIds.has(amendment.parentId)
          ? amendment.parentId
          : null
      edges.push({
        id: `edge:${amendment.id}`,
        source: sourcedParent ?? articleId,
        target: amendment.id,
        kind: sourcedParent ? 'sub-amendment' : 'membership',
        sourceUrl: sourcedParent ? amendment.parentRelation!.sourceUrl : amendment.sourceUrl
      })
    })
    offset += weights[groupIndex]
  })
  return { nodes, edges }
}

export function graphViewBox(zoom: number, pan: { x: number; y: number }): string {
  const scale = Number.isFinite(zoom) ? Math.min(4, Math.max(0.75, zoom)) : 1
  const width = 1000 / scale
  const height = 600 / scale
  const x = Number.isFinite(pan.x) ? Math.min(1000, Math.max(-1000, pan.x)) : 0
  const y = Number.isFinite(pan.y) ? Math.min(600, Math.max(-600, pan.y)) : 0
  return `${500 - width / 2 + x} ${300 - height / 2 + y} ${width} ${height}`
}
