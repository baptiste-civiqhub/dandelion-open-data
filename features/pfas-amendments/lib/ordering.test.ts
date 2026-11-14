import { describe, expect, it } from 'vitest'

import type { PfasTargetPlacement } from '@/apis/pfas-amendments/types'

import { articleSortKey, compareAmendments, comparePlacements } from './ordering'
import { makeAmendment } from './test-fixtures'

const article = (label: string): PfasTargetPlacement => ({ kind: 'article', position: null, article: label })
const after = (label: string): PfasTargetPlacement => ({
  kind: 'additional-article',
  position: 'after',
  article: label
})
const before = (label: string): PfasTargetPlacement => ({
  kind: 'additional-article',
  position: 'before',
  article: label
})

describe('articleSortKey', () => {
  it('orders ordinal and latin suffixes', () => {
    expect(articleSortKey('Article 1er')).toEqual([1, 0])
    expect(articleSortKey('Article 1er bis')).toEqual([1, 2])
    expect(articleSortKey('Article 1er ter')).toEqual([1, 3])
    expect(articleSortKey('Article 10')).toEqual([10, 0])
  })

  it('returns null for unparseable labels', () => {
    expect(articleSortKey('Intitulé de la proposition de loi')).toBeNull()
    expect(articleSortKey(null)).toBeNull()
  })
})

describe('comparePlacements', () => {
  it('sorts articles numerically, not lexically', () => {
    const labels = ['Article 10', 'Article 2 bis', 'Article 1er ter', 'Article 2', 'Article 1er', 'Article 1er bis']
    const sorted = labels.map(article).sort(comparePlacements)
    expect(sorted.map((p) => p.article)).toEqual([
      'Article 1er',
      'Article 1er bis',
      'Article 1er ter',
      'Article 2',
      'Article 2 bis',
      'Article 10'
    ])
  })

  it('keeps additions distinct from the neighbouring article and places them around it', () => {
    const sorted = [
      after('Article 1er'),
      article('Article 1er bis'),
      article('Article 1er'),
      before('Article 1er')
    ].sort(comparePlacements)
    expect(sorted).toEqual([
      before('Article 1er'),
      article('Article 1er'),
      after('Article 1er'),
      article('Article 1er bis')
    ])
  })

  it('puts unknown placements last', () => {
    const unknown: PfasTargetPlacement = { kind: 'unknown', position: null, article: null }
    expect([unknown, article('Article 3')].sort(comparePlacements)[1]).toBe(unknown)
  })
})

describe('compareAmendments', () => {
  it('sorts numeric labels numerically and keeps rectified numbers in place', () => {
    const list = [
      makeAmendment({ number: '18', numberLabel: '18 rect.', rowIndex: 3 }),
      makeAmendment({ number: '2', numberLabel: '2 rect.', rowIndex: 1 }),
      makeAmendment({ number: '100', rowIndex: 0 }),
      makeAmendment({ number: '3', rowIndex: 2 })
    ]
    expect(list.sort(compareAmendments).map((a) => a.numberLabel)).toEqual(['2 rect.', '3', '18 rect.', '100'])
  })
})
