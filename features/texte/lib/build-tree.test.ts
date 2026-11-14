import { describe, expect, it } from 'vitest'

import type { Amendment, DandelionNode, TexteSnapshot } from '@/apis/texte/types'

import { buildTree } from './build-tree'

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

describe('buildTree', () => {
  it('returns a texte node of weight 0 when there are no amendments', () => {
    expect(buildTree(makeSnapshot([]))).toEqual({
      id: 'texte:ppl-1',
      kind: 'texte',
      label: 'Proposition de loi test',
      weight: 0,
      children: []
    })
  })

  it('omits discussion and doublon levels when both fields are null', () => {
    const tree = buildTree(
      makeSnapshot([
        makeAmendment({ id: 'a', numero: '1' }),
        makeAmendment({ id: 'b', numero: '2', dispositif: 'Supprimer cet article' })
      ])
    )
    const kinds = new Set(walk(tree).map((node) => node.kind))
    expect(kinds.has('discussion')).toBe(false)
    expect(kinds.has('doublon')).toBe(false)
    expect(kinds.has('intention')).toBe(true)
  })

  it('attaches an amendment to its article when the parent is unknown', () => {
    const tree = buildTree(makeSnapshot([makeAmendment({ id: 'orphelin', parentId: 'absent', article: 'Article 3' })]))
    const article = tree.children[0]
    expect(article?.id).toBe('article:Article 3')
    const amendments = walk(tree).filter((node) => node.kind === 'amendement')
    expect(amendments).toHaveLength(1)
    expect(amendments[0]?.children).toEqual([])
    expect(amendments[0]?.amendmentId).toBe('orphelin')
    expect(article && walk(article).some((node) => node.amendmentId === 'orphelin')).toBe(true)
  })

  it('nests a sub-amendment under its parent amendment', () => {
    const tree = buildTree(
      makeSnapshot([
        makeAmendment({ id: 'parent', numero: '1', article: 'Article 1' }),
        makeAmendment({ id: 'enfant', numero: '2', article: 'Article 9', parentId: 'parent' })
      ])
    )
    expect(tree.children.map((node) => node.id)).toEqual(['article:Article 1'])
    const parent = walk(tree).find((node) => node.amendmentId === 'parent')
    expect(parent?.children.map((node) => node.amendmentId)).toEqual(['enfant'])
    expect(walk(tree).some((node) => node.id === 'article:Article 9')).toBe(false)
  })
})
