import { describe, expect, it } from 'vitest'

import type { Amendment, DandelionNode, TexteSnapshot } from '@/apis/texte/types'

import { buildTree } from './build-tree'
import { MAX_VISIBLE, OUTER_RADIUS_PX } from './constants'
import { cutTree } from './cut-tree'

const makeAmendment = (overrides: Partial<Amendment> = {}): Amendment => ({
  id: 'a1',
  numero: '1',
  article: 'Article 1',
  dispositif: 'Observation generale.',
  expose: null,
  parentId: null,
  discussionCommune: null,
  discussionIdentique: null,
  authorLabel: null,
  groupLabel: null,
  sort: null,
  ...overrides
})

const makeSnapshot = (amendments: Amendment[]): TexteSnapshot => ({
  id: 'ppl-1',
  titre: 'Proposition de loi test',
  sourceNom: 'Assemblée nationale',
  sourceUrl: 'https://data.assemblee-nationale.fr',
  licence: 'Licence Ouverte (Etalab)',
  amendments
})

const walk = (node: DandelionNode): DandelionNode[] => [node, ...node.children.flatMap(walk)]

describe('cutTree', () => {
  it('hides amendment leaves and stays within MAX_VISIBLE without focus', () => {
    const tree = buildTree(
      makeSnapshot([
        makeAmendment({ id: 'a', numero: '1', article: 'Article 1', dispositif: 'Supprimer cet article' }),
        makeAmendment({ id: 'b', numero: '2', article: 'Article 2', dispositif: 'Rédiger ainsi cet article' }),
        makeAmendment({ id: 'c', numero: '3', article: 'Article 2', dispositif: 'Compléter cet article' })
      ])
    )
    const cut = cutTree(tree, { focusId: null, budget: MAX_VISIBLE, outerRadiusPx: OUTER_RADIUS_PX })
    const nodes = walk(cut)
    expect(nodes.some((node) => node.kind === 'amendement')).toBe(false)
    expect(nodes.length).toBeLessThanOrEqual(MAX_VISIBLE)
  })

  it('emits one reste seed and respects the budget when an article has more than MAX_VISIBLE children', () => {
    const leaves: DandelionNode[] = Array.from({ length: MAX_VISIBLE + 5 }, (_, index) => ({
      id: `amendement:${index}`,
      kind: 'amendement',
      label: String(index),
      weight: 1,
      children: [],
      amendmentId: String(index)
    }))
    const article: DandelionNode = {
      id: 'article:A',
      kind: 'article',
      label: 'A',
      weight: leaves.length,
      children: leaves
    }
    const tree: DandelionNode = {
      id: 'texte:t',
      kind: 'texte',
      label: 'T',
      weight: leaves.length,
      children: [article]
    }
    const cut = cutTree(tree, { focusId: article.id, budget: MAX_VISIBLE, outerRadiusPx: OUTER_RADIUS_PX })
    const nodes = walk(cut)
    const restes = nodes.filter((node) => node.kind === 'reste')
    expect(restes).toHaveLength(1)
    expect(restes[0]?.children).toEqual([])
    expect(nodes.length).toBeLessThanOrEqual(MAX_VISIBLE)
    expect(nodes.find((node) => node.id === article.id)?.weight).toBe(article.weight)
  })

  it('does not add children to a leaf', () => {
    const leaf: DandelionNode = {
      id: 'amendement:1',
      kind: 'amendement',
      label: '1',
      weight: 1,
      children: [],
      amendmentId: '1'
    }
    const cut = cutTree(leaf, { focusId: leaf.id, budget: 10, outerRadiusPx: OUTER_RADIUS_PX })
    expect(cut.children).toEqual([])
  })
})
