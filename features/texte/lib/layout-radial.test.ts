import { describe, expect, it } from 'vitest'

import type { DandelionNode } from '@/apis/texte/types'

import { FOCUS_SHARE, OUTER_RADIUS_PX } from './constants'
import { layoutRadial } from './layout-radial'

const TAU = Math.PI * 2

const article = (id: string): DandelionNode => ({
  id,
  kind: 'article',
  label: id,
  weight: 1,
  children: [
    {
      id: `${id}/intention:autre`,
      kind: 'intention',
      label: 'autre',
      weight: 1,
      children: []
    }
  ]
})

const tree: DandelionNode = {
  id: 'texte:t',
  kind: 'texte',
  label: 'Texte',
  weight: 4,
  children: [article('article:a'), article('article:b'), article('article:c'), article('article:d')]
}

const articleOrder = (focusId: string | null): string[] =>
  layoutRadial(tree, { focusId, focusShare: FOCUS_SHARE, outerRadiusPx: OUTER_RADIUS_PX })
    .filter((node) => node.kind === 'article')
    .slice()
    .sort((a, b) => a.angle0 - b.angle0)
    .map((node) => node.id)

describe('layoutRadial', () => {
  it('keeps the same circular article order with and without focus', () => {
    expect(articleOrder('article:b')).toEqual(articleOrder(null))
  })

  it('gives the focused article a larger angle', () => {
    const resting = layoutRadial(tree, { focusId: null, focusShare: FOCUS_SHARE, outerRadiusPx: OUTER_RADIUS_PX })
    const focused = layoutRadial(tree, {
      focusId: 'article:b',
      focusShare: FOCUS_SHARE,
      outerRadiusPx: OUTER_RADIUS_PX
    })
    const restSpan = resting.find((node) => node.id === 'article:b')
    const focusSpan = focused.find((node) => node.id === 'article:b')
    expect(restSpan).toBeDefined()
    expect(focusSpan).toBeDefined()
    const focusedAngle = (focusSpan?.angle1 ?? 0) - (focusSpan?.angle0 ?? 0)
    const restingAngle = (restSpan?.angle1 ?? 0) - (restSpan?.angle0 ?? 0)
    expect(focusedAngle).toBeGreaterThan(restingAngle)
    expect(Math.abs(focusedAngle - FOCUS_SHARE * TAU)).toBeLessThan(1e-6)
  })

  it('keeps children inside the parent angle', () => {
    const nodes = layoutRadial(tree, { focusId: null, focusShare: FOCUS_SHARE, outerRadiusPx: OUTER_RADIUS_PX })
    const byId = new Map(nodes.map((node) => [node.id, node]))
    for (const node of nodes) {
      if (!node.parentId) continue
      const parent = byId.get(node.parentId)
      expect(parent).toBeDefined()
      expect(node.angle0).toBeGreaterThanOrEqual((parent?.angle0 ?? 0) - 1e-6)
      expect(node.angle1).toBeLessThanOrEqual((parent?.angle1 ?? 0) + 1e-6)
    }
  })
})
