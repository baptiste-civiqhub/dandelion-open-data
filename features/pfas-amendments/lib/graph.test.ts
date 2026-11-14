import { describe, expect, it } from 'vitest'

import type { PfasSnapshot } from '@/apis/pfas-amendments/types'
import snapshotJson from '@/data/pfas/amendments.json'

import { buildAmendmentGraph, graphViewBox } from './graph'
import { makeAmendment } from './test-fixtures'

const amendments = (snapshotJson as PfasSnapshot).amendments

describe('buildAmendmentGraph', () => {
  it('keeps all 32 amendments and the eight article placements as distinct nodes', () => {
    const graph = buildAmendmentGraph(amendments)
    expect(graph.nodes.filter((node) => node.kind === 'amendment')).toHaveLength(32)
    expect(graph.nodes.filter((node) => node.kind === 'article')).toHaveLength(8)
    expect(graph.nodes.filter((node) => node.kind === 'bill')).toHaveLength(1)
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length)
    const ids = new Set(graph.nodes.map((node) => node.id))
    expect(graph.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
  })

  it('draws the sourced 14 to 32 relationship and does not invent similarity edges', () => {
    const graph = buildAmendmentGraph(amendments)
    const sub = graph.edges.filter((edge) => edge.kind === 'sub-amendment')
    expect(sub).toHaveLength(1)
    expect(sub[0]).toMatchObject({
      source: 'senat-2023-2024-620-amdt-14',
      target: 'senat-2023-2024-620-amdt-32',
      sourceUrl: 'https://www.senat.fr/amendements/2023-2024/620/Amdt_32.html'
    })
    expect(graph.edges).toHaveLength(40)
  })

  it('filters Article 1er without losing its sub-amendment or including additional articles', () => {
    const graph = buildAmendmentGraph(amendments, 'Article 1er')
    expect(graph.nodes.filter((node) => node.kind === 'amendment')).toHaveLength(17)
    expect(graph.nodes.filter((node) => node.kind === 'article')).toHaveLength(1)
    expect(graph.edges.filter((edge) => edge.kind === 'sub-amendment')).toHaveLength(1)
    expect(graph.nodes.every((node) => node.subdivision === 'Article 1er')).toBe(true)
  })

  it('produces stable finite positions inside the canvas without mutating the source', () => {
    const before = JSON.stringify(amendments)
    const graph = buildAmendmentGraph(amendments)
    expect(buildAmendmentGraph(amendments)).toEqual(graph)
    expect(JSON.stringify(amendments)).toBe(before)
    for (const node of graph.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(node.radius)
      expect(node.x).toBeLessThanOrEqual(1000 - node.radius)
      expect(node.y).toBeGreaterThanOrEqual(node.radius)
      expect(node.y).toBeLessThanOrEqual(600 - node.radius)
    }
  })

  it('keeps an orphan visible without drawing a fabricated parent link', () => {
    const graph = buildAmendmentGraph([makeAmendment({ parentId: 'missing' })])
    expect(graph.nodes.filter((node) => node.kind === 'amendment')).toHaveLength(1)
    expect(graph.edges.some((edge) => edge.source === 'missing')).toBe(false)
  })

  it('handles an empty or unmatched corpus', () => {
    expect(buildAmendmentGraph([])).toEqual({ nodes: [], edges: [] })
    expect(buildAmendmentGraph(amendments, 'absent')).toEqual({ nodes: [], edges: [] })
  })
})

describe('graphViewBox', () => {
  it('zooms around the centre and clamps invalid or extreme controls', () => {
    expect(graphViewBox(1, { x: 0, y: 0 })).toBe('0 0 1000 600')
    expect(graphViewBox(2, { x: 0, y: 0 })).toBe('250 150 500 300')
    expect(graphViewBox(Infinity, { x: NaN, y: Infinity })).toBe('0 0 1000 600')
    expect(graphViewBox(20, { x: 0, y: 0 })).toBe(graphViewBox(4, { x: 0, y: 0 }))
  })
})
