import { describe, expect, it } from 'vitest'

import { toPlainText } from './plain-text'
import { clockAngle, diskLayout, hitTest, lerpWindow } from './sunburst-geometry'
import { buildSunburstTree, nodeId } from './sunburst-tree'

const tree = buildSunburstTree(
  [
    { id: 'a1', designation: 'ART. 1', titre: null, ordre: 1, alineas: [] },
    { id: 'a2', designation: 'ART. 2', titre: null, ordre: 2, alineas: [] }
  ],
  [],
  { texte: 'T', whole: 'W', other: 'O', alinea: (n) => `${n}`, additional: (d) => d }
)

describe('sunburst geometry', () => {
  it('keeps the disk inside the centre column at 1440 px', () => {
    const disk = diskLayout(1440, 900)
    const columnWidth = (1440 - 48 - 11 * 24) / 12
    const centreLeft = 24 + 3 * (columnWidth + 24)
    expect(disk.cx - disk.r1).toBeGreaterThanOrEqual(centreLeft)
    expect(disk.cy - disk.r1).toBeGreaterThanOrEqual(96)
  })

  it('measures angles clockwise from noon', () => {
    expect(clockAngle(0, -1)).toBe(0)
    expect(clockAngle(1, 0)).toBeCloseTo(Math.PI / 2)
    expect(clockAngle(-1, 0)).toBeCloseTo((3 * Math.PI) / 2)
  })

  it('finds the centre, a sector or the void', () => {
    const disk = { cx: 0, cy: 0, r0: 10, r1: 100 }
    const view = { x0: 0, x1: 1, depth: 0 }
    expect(hitTest(tree, disk, view, 2, 0, 0)).toEqual({ kind: 'center' })
    expect(hitTest(tree, disk, view, 2, 0, 200)).toEqual({ kind: 'empty' })
    const right = hitTest(tree, disk, view, 2, 30, -1)
    expect(right.kind === 'node' && right.node.id).toBe(nodeId.article('a1'))
    const left = hitTest(tree, disk, view, 2, -30, 1)
    expect(left.kind === 'node' && left.node.id).toBe(nodeId.article('a2'))
  })

  it('interpolates the view window', () => {
    expect(lerpWindow({ x0: 0, x1: 1, depth: 0 }, { x0: 0.5, x1: 1, depth: 1 }, 0.5)).toEqual({
      x0: 0.25,
      x1: 1,
      depth: 0.5
    })
  })

  it('turns source HTML into readable text', () => {
    expect(toPlainText('<p>Supprimer&nbsp;l’alinéa&#160;2.</p><p>Second &amp; dernier</p>')).toBe(
      'Supprimer l’alinéa 2.\nSecond & dernier'
    )
  })
})
