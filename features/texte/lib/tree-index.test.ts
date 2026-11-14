import { describe, expect, it } from 'vitest'

import { buildTree } from './build-tree'
import { MAX_VISIBLE, OUTER_RADIUS_PX } from './constants'
import { cutTree } from './cut-tree'
import { syntheticSnapshot } from './synthetic'
import { indexTree, pathTo, resolveNodeId } from './tree-index'

const visibleIds = (node: ReturnType<typeof buildTree>): string[] => [node.id, ...node.children.flatMap(visibleIds)]

describe('indexTree', () => {
  it('resolves amendment ids and node ids, and returns the root-to-node breadcrumb', () => {
    const tree = buildTree(syntheticSnapshot(40, { articles: 3 }))
    const index = indexTree(tree)
    const nodeId = resolveNodeId(index, 'synthetic-7')
    expect(nodeId).toBe('amendement:synthetic-7')
    const path = pathTo(index, nodeId)
    expect(path[0]?.kind).toBe('texte')
    expect(path.at(-1)?.amendmentId).toBe('synthetic-7')
    expect(resolveNodeId(index, 'synthetic-999')).toBeNull()
    expect(pathTo(index, 'unknown')).toEqual([])
  })

  it('handles long identifiers without truncation', () => {
    const snapshot = syntheticSnapshot(5, { articles: 1 })
    const longId = `AMANR5L17PO59051B2464P0D1N${'0'.repeat(180)}36`
    snapshot.amendments[0] = { ...(snapshot.amendments[0] as (typeof snapshot.amendments)[number]), id: longId }
    const index = indexTree(buildTree(snapshot))
    expect(resolveNodeId(index, longId)).toBe(`amendement:${longId}`)
  })

  it('indexes a deep sub-amendment chain iteratively', () => {
    const snapshot = syntheticSnapshot(3000, { articles: 1 })
    snapshot.amendments = snapshot.amendments.map((amendment, i) => ({
      ...amendment,
      parentId: i > 0 ? `synthetic-${i - 1}` : null
    }))
    const tree = buildTree(snapshot)
    const index = indexTree(tree)
    expect(pathTo(index, 'amendement:synthetic-2999').length).toBeGreaterThan(2999)
  })
})

describe('revealing a hidden amendment through focus', () => {
  it('reveals an amendment hidden in a reste seed on a single heavy branch, within budget', () => {
    const tree = buildTree(syntheticSnapshot(2000, { articles: 4, heavyShare: 0.9 }))
    const rest = cutTree(tree, {
      focusId: 'article:Article synthétique 1',
      budget: MAX_VISIBLE,
      outerRadiusPx: OUTER_RADIUS_PX
    })
    expect(visibleIds(rest)).not.toContain('amendement:synthetic-1777')
    const focused = cutTree(tree, {
      focusId: 'amendement:synthetic-1777',
      budget: MAX_VISIBLE,
      outerRadiusPx: OUTER_RADIUS_PX
    })
    const ids = visibleIds(focused)
    expect(ids).toContain('amendement:synthetic-1777')
    expect(ids.length).toBeLessThanOrEqual(MAX_VISIBLE)
    expect(focused.weight).toBe(2000)
  })

  it('reveals a deeply nested amendment within budget', () => {
    const snapshot = syntheticSnapshot(400, { articles: 2 })
    snapshot.amendments = snapshot.amendments.map((amendment, i) => ({
      ...amendment,
      article: 'Article synthétique 1',
      parentId: i > 0 && i < 300 ? `synthetic-${i - 1}` : null
    }))
    const tree = buildTree(snapshot)
    const focused = cutTree(tree, {
      focusId: 'amendement:synthetic-120',
      budget: MAX_VISIBLE,
      outerRadiusPx: OUTER_RADIUS_PX
    })
    const ids = visibleIds(focused)
    expect(ids.length).toBeLessThanOrEqual(MAX_VISIBLE)
    expect(ids.length).toBeGreaterThan(0)
    expect(focused.weight).toBe(400)
  })
})
