import { describe, expect, it } from 'vitest'

import { buildHierarchy } from './hierarchy'
import { makeAmendment } from './test-fixtures'

describe('buildHierarchy', () => {
  it('returns no group for an empty corpus', () => {
    expect(buildHierarchy([])).toEqual([])
  })

  it('nests a sub-amendment only under its explicit parent', () => {
    const groups = buildHierarchy([
      makeAmendment({ id: 'a14', number: '14', rowIndex: 0 }),
      makeAmendment({ id: 'a15', number: '15', rowIndex: 1 }),
      makeAmendment({ id: 'a32', number: '32', nature: 'S/Amt', parentId: 'a14', rowIndex: 2 })
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].total).toBe(3)
    expect(groups[0].nodes.map((n) => n.amendment.id)).toEqual(['a14', 'a15'])
    expect(groups[0].nodes[0].children.map((n) => n.amendment.id)).toEqual(['a32'])
    expect(groups[0].nodes[1].children).toEqual([])
  })

  it('does not attach a sub-amendment without parentId to a neighbour', () => {
    const groups = buildHierarchy([
      makeAmendment({ id: 'a14', number: '14' }),
      makeAmendment({ id: 'a32', number: '32', nature: 'S/Amt' })
    ])
    expect(groups[0].nodes.map((n) => n.amendment.id)).toEqual(['a14', 'a32'])
  })

  it('keeps an amendment whose parent is missing at the root and flags it', () => {
    const groups = buildHierarchy([makeAmendment({ id: 'a32', number: '32', parentId: 'unknown' })])
    expect(groups[0].nodes[0].missingParent).toBe(true)
  })

  it('survives a parentId cycle without dropping rows', () => {
    const groups = buildHierarchy([
      makeAmendment({ id: 'x', number: '1', parentId: 'y' }),
      makeAmendment({ id: 'y', number: '2', parentId: 'x' })
    ])
    expect(groups[0].total).toBe(2)
  })

  it('separates additional articles from the article they follow', () => {
    const groups = buildHierarchy([
      makeAmendment({
        id: 'add',
        number: '9',
        subdivision: 'art. add. après Article 1er',
        targetPlacement: { kind: 'additional-article', position: 'after', article: 'Article 1er' }
      }),
      makeAmendment({
        id: 'bis',
        number: '1',
        subdivision: 'Article 1er bis',
        targetPlacement: { kind: 'article', position: null, article: 'Article 1er bis' }
      }),
      makeAmendment({ id: 'art', number: '2' })
    ])
    expect(groups.map((g) => g.subdivision)).toEqual(['Article 1er', 'art. add. après Article 1er', 'Article 1er bis'])
  })
})
