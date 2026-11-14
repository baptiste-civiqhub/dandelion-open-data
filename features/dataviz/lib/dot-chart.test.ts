import { describe, expect, it } from 'vitest'

import { groupAmendementsByArticle, layoutDots, stagePlotInsets, type AmendementColumn } from './dot-chart'

const articles = [
  { id: 'art-2', ordre: 2 },
  { id: 'art-1', ordre: 1 },
  { id: 'art-3', ordre: 3 }
]

describe('groupAmendementsByArticle', () => {
  it('builds one column per article, in text order, keeping empty articles', () => {
    const columns = groupAmendementsByArticle(articles, [
      { articleId: 'art-2', sort: 'adopte' },
      { articleId: 'art-1', sort: 'rejete' },
      { articleId: 'art-2', sort: 'rejete' }
    ])
    expect(columns).toEqual([
      { articleId: 'art-1', sortCodes: ['rejete'] },
      { articleId: 'art-2', sortCodes: ['adopte', 'rejete'] },
      { articleId: 'art-3', sortCodes: [] }
    ])
  })

  it('gathers amendments without a known article in a last column', () => {
    const columns = groupAmendementsByArticle(articles, [
      { articleId: null, sort: 'tombe' },
      { articleId: 'art-missing', sort: 'retire' }
    ])
    expect(columns.at(-1)).toEqual({ articleId: null, sortCodes: ['tombe', 'retire'] })
    expect(columns).toHaveLength(4)
  })

  it('adds no extra column when every amendment has its article', () => {
    expect(groupAmendementsByArticle(articles, [{ articleId: 'art-1', sort: 'adopte' }])).toHaveLength(3)
  })

  it('returns no column without articles nor amendments', () => {
    expect(groupAmendementsByArticle([], [])).toEqual([])
  })
})

describe('stagePlotInsets', () => {
  it('keeps the side widget columns clear on a wide stage', () => {
    expect(stagePlotInsets(1440)).toEqual({ insetX: 403, insetTop: 112, insetBottom: 48 })
  })

  it('uses the whole width when the columns stack', () => {
    expect(stagePlotInsets(1023).insetX).toBe(24)
    expect(stagePlotInsets(390).insetX).toBe(24)
  })
})

const makeColumn = (count: number, articleId: string | null = 'art'): AmendementColumn => ({
  articleId,
  sortCodes: Array.from({ length: count }, () => 'adopte')
})

const options = { width: 1000, height: 600, insetX: 100, insetTop: 100, insetBottom: 50 }

describe('layoutDots', () => {
  it('draws one dot per amendment', () => {
    expect(layoutDots([makeColumn(7), makeColumn(0), makeColumn(3)], options)).toHaveLength(10)
  })

  it('returns nothing without columns or without room', () => {
    expect(layoutDots([], options)).toEqual([])
    expect(layoutDots([makeColumn(3)], { ...options, width: 150 })).toEqual([])
    expect(layoutDots([makeColumn(3)], { ...options, height: 120 })).toEqual([])
  })

  it('keeps the dots inside the plot area when they fit', () => {
    const dots = layoutDots([makeColumn(40), makeColumn(12), makeColumn(90)], options)
    for (const dot of dots) {
      expect(dot.x - dot.radius).toBeGreaterThanOrEqual(options.insetX)
      expect(dot.x + dot.radius).toBeLessThanOrEqual(options.width - options.insetX)
      expect(dot.y - dot.radius).toBeGreaterThanOrEqual(options.insetTop)
      expect(dot.y + dot.radius).toBeLessThanOrEqual(options.height - options.insetBottom)
    }
  })

  it('stacks each column from the bottom, without two dots on the same spot', () => {
    const dots = layoutDots([makeColumn(25)], options)
    expect(dots[0].y + dots[0].radius).toBeCloseTo(options.height - options.insetBottom)
    expect(new Set(dots.map((dot) => `${dot.x}:${dot.y}`)).size).toBe(dots.length)
  })

  it('keeps the columns apart, left to right', () => {
    const dots = layoutDots([makeColumn(30), makeColumn(30)], options)
    const maxFirst = Math.max(...dots.filter((dot) => dot.column === 0).map((dot) => dot.x + dot.radius))
    const minSecond = Math.min(...dots.filter((dot) => dot.column === 1).map((dot) => dot.x - dot.radius))
    expect(maxFirst).toBeLessThan(minSecond)
  })

  it('shrinks the dots as the tallest column grows, down to the minimum size', () => {
    const small = layoutDots([makeColumn(10)], options)[0].radius
    const large = layoutDots([makeColumn(4000)], options)[0].radius
    expect(small).toBe(7)
    expect(large).toBeLessThan(small)
    expect(layoutDots([makeColumn(400000)], { ...options, minDotSize: 4 })[0].radius).toBe(2)
  })
})
