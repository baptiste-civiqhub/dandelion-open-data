import { describe, expect, it } from 'vitest'

import type { AmendementSummary } from '@/apis/amendements/types'
import type { Article } from '@/apis/articles/types'

import {
  buildSunburstTree,
  containerOf,
  isContainer,
  nodeAt,
  nodeId,
  pathTo,
  ROOT_ID,
  type SunburstLabels
} from './sunburst-tree'

const labels: SunburstLabels = {
  texte: 'Texte',
  whole: 'Article entier',
  other: 'Autres emplacements',
  alinea: (numero) => `Al. ${numero}`,
  additional: (designation, position) => `${position === 'AVANT' ? 'Avant' : 'Après'} ${designation}`
}

const articles: Article[] = [
  { id: 'a2', designation: 'ART. 2', titre: null, ordre: 2, alineas: [] },
  {
    id: 'a1',
    designation: 'ART. 1',
    titre: null,
    ordre: 1,
    alineas: [
      { id: 'al2', numero: 2 },
      { id: 'al1', numero: 1 }
    ]
  }
]

let rang = 0
const am = (id: string, patch: Partial<AmendementSummary> = {}): AmendementSummary => ({
  id,
  numeroLong: id,
  articleId: 'a1',
  alineaId: null,
  parentId: null,
  divisionAvantApres: 'A',
  rang: ++rang,
  sort: 'adopte',
  groupePolitiqueRef: null,
  discussionCommune: null,
  discussionIdentique: null,
  tagListId: `tl-${id}`,
  ...patch
})

const amendements = [
  am('whole1'),
  am('al1-a', { alineaId: 'al1' }),
  am('al2-a', { alineaId: 'al2' }),
  am('al2-sub', { alineaId: 'al2', parentId: 'al2-a', rang: 99 }),
  am('add-after', { divisionAvantApres: 'APRES' }),
  am('a2-x', { articleId: 'a2' }),
  am('orphan', { articleId: null }),
  am('unknown-article', { articleId: 'zz' })
]

describe('buildSunburstTree', () => {
  const tree = buildSunburstTree(articles, amendements, labels)
  const ids = (nodes: { id: string }[]) => nodes.map((node) => node.id)

  it('orders the ring in text order, additional articles next to their article, other locations last', () => {
    expect(ids(tree.root.children)).toEqual([
      nodeId.article('a1'),
      nodeId.additional('a1', 'APRES'),
      nodeId.article('a2'),
      nodeId.other
    ])
    expect(tree.byId.get(nodeId.additional('a1', 'APRES'))?.dashed).toBe(true)
  })

  it('puts amendments without alinea in a "whole article" sector before the alineas', () => {
    expect(ids(tree.byId.get(nodeId.article('a1'))!.children)).toEqual([
      nodeId.whole('a1'),
      nodeId.alinea('al1'),
      nodeId.alinea('al2')
    ])
  })

  it('nests sub-amendments under their parent and counts them in every ancestor', () => {
    const parent = tree.byId.get(nodeId.amendement('al2-a'))!
    expect(ids(parent.children)).toEqual([nodeId.amendement('al2-sub')])
    expect(parent.value).toBe(2)
    expect(tree.byId.get(nodeId.alinea('al2'))!.value).toBe(2)
    expect(tree.root.value).toBe(amendements.length)
  })

  it('sends unresolved articles to "other locations"', () => {
    expect(ids(tree.byId.get(nodeId.other)!.children)).toEqual([
      nodeId.amendement('orphan'),
      nodeId.amendement('unknown-article')
    ])
  })

  it('gives each sector an angle proportional to its amendments, clockwise from noon', () => {
    const article1 = tree.byId.get(nodeId.article('a1'))!
    expect(article1.x0).toBe(0)
    expect(article1.x1).toBeCloseTo(4 / 8)
    const parent = tree.byId.get(nodeId.amendement('al2-a'))!
    const sub = parent.children[0]
    expect(sub.x1 - sub.x0).toBeCloseTo((parent.x1 - parent.x0) / 2)
    const last = tree.root.children.at(-1)!
    expect(last.x1).toBeCloseTo(1)
  })

  it('finds the sector under an angle at a given depth', () => {
    expect(nodeAt(tree, 1, 0.1)?.id).toBe(nodeId.article('a1'))
    expect(nodeAt(tree, 1, 0.99)?.id).toBe(nodeId.other)
  })

  it('splits a text without amendments evenly so its articles stay visible', () => {
    const empty = buildSunburstTree(articles, [], labels)
    expect(empty.root.children.map((node) => node.x1 - node.x0)).toEqual([0.5, 0.5])
  })

  it('builds a text of several thousand amendments quickly, with every sector findable', () => {
    const bigArticles: Article[] = Array.from({ length: 60 }, (_, i) => ({
      id: `big-a${i}`,
      designation: `ART. ${i + 1}`,
      titre: null,
      ordre: i + 1,
      alineas: Array.from({ length: 4 }, (_, k) => ({ id: `big-a${i}-al${k}`, numero: k + 1 }))
    }))
    const big = Array.from({ length: 4000 }, (_, i) =>
      am(`big-${i}`, {
        articleId: `big-a${i % 60}`,
        alineaId: i % 3 === 0 ? null : `big-a${i % 60}-al${i % 4}`,
        parentId: i % 10 === 9 ? `big-${i - 1}` : null,
        sort: ['adopte', 'rejete', 'retire'][i % 3]
      })
    )
    const started = performance.now()
    const bigTree = buildSunburstTree(bigArticles, big, labels)
    expect(performance.now() - started).toBeLessThan(500)
    expect(bigTree.root.value).toBe(4000)
    for (let depth = 1; depth < bigTree.byDepth.length; depth++)
      for (const node of bigTree.byDepth[depth].filter((n) => n.x1 > n.x0).slice(0, 200))
        expect(nodeAt(bigTree, depth, (node.x0 + node.x1) / 2)).toBe(node)
  })

  it('exposes the path, containers and focusable nodes', () => {
    const sub = tree.byId.get(nodeId.amendement('al2-sub'))!
    expect(ids(pathTo(sub))).toEqual([
      ROOT_ID,
      nodeId.article('a1'),
      nodeId.alinea('al2'),
      nodeId.amendement('al2-a'),
      nodeId.amendement('al2-sub')
    ])
    expect(containerOf(sub).id).toBe(nodeId.amendement('al2-a'))
    expect(isContainer(tree.byId.get(nodeId.amendement('al2-a'))!)).toBe(true)
    expect(isContainer(sub)).toBe(false)
  })
})
