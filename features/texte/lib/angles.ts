import type { DandelionNode } from '@/apis/texte/types'

import { ANGLE_ORIGIN, LABEL_ARC_PX } from './constants'

const TAU = Math.PI * 2

export type AngleSpan = { angle0: number; angle1: number }

type AngleArgs = { focusId: string | null; focusShare: number; outerRadiusPx: number }

const contains = (node: DandelionNode, id: string | null): boolean => {
  if (!id) return false
  if (node.id === id) return true
  return node.children.some((child) => contains(child, id))
}

const focusArticleId = (node: DandelionNode, focusId: string | null): string | null => {
  if (!focusId) return null
  if (node.kind === 'article' && contains(node, focusId)) return node.id
  for (const child of node.children) {
    const found = focusArticleId(child, focusId)
    if (found) return found
  }
  return null
}

const widthsFor = (nodes: DandelionNode[], span: number, outerRadiusPx: number): number[] => {
  const count = nodes.length
  const floor = Math.min(LABEL_ARC_PX / outerRadiusPx, span / count)
  const extra = span - floor * count
  const weightSum = nodes.reduce((sum, node) => sum + node.weight, 0)
  return nodes.map((node) => floor + (weightSum <= 0 ? extra / count : extra * (node.weight / weightSum)))
}

export const assignAngles = (tree: DandelionNode, args: AngleArgs): Map<string, AngleSpan> => {
  const spans = new Map<string, AngleSpan>()
  const focusedArticle = focusArticleId(tree, args.focusId)

  const place = (node: DandelionNode, angle0: number, angle1: number) => {
    spans.set(node.id, { angle0, angle1 })
    if (node.children.length === 0) return
    const widths =
      node.kind === 'texte'
        ? articleWidths(node.children, angle1 - angle0)
        : proportionalWidths(node.children, angle1 - angle0)
    let cursor = angle0
    node.children.forEach((child, index) => {
      const width = widths[index] ?? 0
      place(child, cursor, cursor + width)
      cursor += width
    })
  }

  const proportionalWidths = (nodes: DandelionNode[], span: number): number[] => {
    const weightSum = nodes.reduce((sum, node) => sum + node.weight, 0)
    return nodes.map((node) => (weightSum <= 0 ? span / nodes.length : span * (node.weight / weightSum)))
  }

  const articleWidths = (articles: DandelionNode[], span: number): number[] => {
    if (articles.length === 1) return [span]
    const focusedIndex = articles.findIndex((article) => article.id === focusedArticle)
    if (focusedIndex === -1) return widthsFor(articles, span, args.outerRadiusPx)
    const focusSpan = Math.min(args.focusShare * TAU, span)
    const others = articles.filter((_, index) => index !== focusedIndex)
    const otherWidths = widthsFor(others, span - focusSpan, args.outerRadiusPx)
    let otherCursor = 0
    return articles.map((_, index) => {
      if (index === focusedIndex) return focusSpan
      const width = otherWidths[otherCursor] ?? 0
      otherCursor += 1
      return width
    })
  }

  place(tree, ANGLE_ORIGIN, ANGLE_ORIGIN + TAU)
  return spans
}
