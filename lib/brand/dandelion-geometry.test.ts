import { describe, expect, it } from 'vitest'

import { buildDandelionMark, DANDELION_MARK, DANDELION_PARAMS, exitCircle, intersectLines } from './dandelion-geometry'

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('buildDandelionMark', () => {
  it('builds five stripes evenly spaced by 36 degrees', () => {
    expect(DANDELION_MARK.stripeAngles).toEqual([30, 66, 102, 138, 174])
  })

  it('draws five chevrons as closed paths', () => {
    expect(DANDELION_MARK.chevrons).toHaveLength(5)
    for (const { path } of DANDELION_MARK.chevrons) {
      expect(path.startsWith('M')).toBe(true)
      expect(path.endsWith('Z')).toBe(true)
    }
  })

  it('is deterministic', () => {
    expect(buildDandelionMark()).toEqual(buildDandelionMark())
  })

  it('keeps every construction point inside the outer circle', () => {
    for (const { notch, corners } of DANDELION_MARK.chevrons) {
      for (const point of [notch, ...corners]) {
        expect(distance(point, DANDELION_MARK.center)).toBeLessThan(DANDELION_MARK.radius)
      }
    }
  })

  it('keeps each chevron in one piece: the notch lies beyond the rounded corner', () => {
    for (const { notch, corners } of DANDELION_MARK.chevrons) {
      const cornerMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 }
      expect(distance(notch, DANDELION_MARK.burstCenter)).toBeGreaterThan(
        distance(cornerMid, DANDELION_MARK.burstCenter)
      )
    }
  })

  it('places the burst centre right of the circle centre, as on the reference grid', () => {
    expect(DANDELION_MARK.burstCenter.x).toBeGreaterThan(DANDELION_MARK.center.x)
  })

  it('reproduces the notches given by the reference construction lines', () => {
    // Reference grid (2000 px image): circle centre (999, 747.5), radius 246. Notches = intersections of
    // the inner edge lines measured on the grid: top-left chevron (990, 664), left chevron (963, 786).
    const toReference = ({ x, y }: { x: number; y: number }) => {
      const k = 246 / DANDELION_PARAMS.radius
      return { x: 999 + (x - DANDELION_MARK.center.x) * k, y: 747.5 + (y - DANDELION_MARK.center.y) * k }
    }
    const [, , left, topLeft] = DANDELION_MARK.chevrons
    expect(distance(toReference(topLeft.notch), { x: 990, y: 664 })).toBeLessThan(8)
    expect(distance(toReference(left.notch), { x: 963, y: 786 })).toBeLessThan(8)
  })
})

describe('geometry helpers', () => {
  it('intersects two lines', () => {
    expect(intersectLines({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: -1 }, { x: 0, y: 1 })).toEqual({ x: 2, y: 0 })
  })

  it('refuses parallel lines', () => {
    expect(() => intersectLines({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 })).toThrow()
  })

  it('finds where a ray leaves a circle', () => {
    expect(exitCircle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, 10)).toEqual({ x: 10, y: 0 })
  })
})
