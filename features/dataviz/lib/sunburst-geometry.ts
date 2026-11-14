import { nodeAt, type SunburstNode, type SunburstTree } from './sunburst-tree'

export type Disk = { cx: number; cy: number; r0: number; r1: number }

/** Fenêtre affichée : l'étendue du focus sur le tour complet, et sa profondeur. Interpolée pendant le zoom. */
export type ViewWindow = { x0: number; x1: number; depth: number }

const LG = 1024
const GUTTER = 24
const HEADER_SPACE = 96
const VIEW_BAR_SPACE = 56
const BOTTOM_SPACE = 24
const CENTER_RATIO = 0.24

/**
 * Le disque tient dans la colonne centrale du `Stage` (grille 3 · 6 · 3 dès `lg`), sous le header et la barre de
 * vue : les widgets latéraux ne le recouvrent jamais (BR-P1).
 */
export function diskLayout(width: number, height: number): Disk {
  const top = HEADER_SPACE + VIEW_BAR_SPACE
  const availableHeight = Math.max(0, height - top - BOTTOM_SPACE)
  const columnWidth = (width - 2 * GUTTER - 11 * GUTTER) / 12
  const availableWidth = width >= LG ? 6 * columnWidth + 5 * GUTTER : width - 2 * 16
  const r1 = Math.max(40, Math.min(availableWidth, availableHeight) / 2 - 8)
  return { cx: width / 2, cy: top + availableHeight / 2, r0: r1 * CENTER_RATIO, r1 }
}

export const TAU = Math.PI * 2

/** Angle depuis midi, sens horaire, dans [0, 2π). */
export function clockAngle(dx: number, dy: number): number {
  const angle = Math.atan2(dx, -dy)
  return angle < 0 ? angle + TAU : angle
}

export type Hit = { kind: 'center' } | { kind: 'node'; node: SunburstNode } | { kind: 'empty' }

/** Ce qui est sous le point (`px`, `py`) : le centre, un secteur, ou le vide. */
export function hitTest(tree: SunburstTree, disk: Disk, view: ViewWindow, rings: number, px: number, py: number): Hit {
  const dx = px - disk.cx
  const dy = py - disk.cy
  const radius = Math.hypot(dx, dy)
  if (radius < disk.r0) return { kind: 'center' }
  if (radius > disk.r1) return { kind: 'empty' }
  const ringWidth = (disk.r1 - disk.r0) / rings
  const ring = Math.min(rings, Math.floor((radius - disk.r0) / ringWidth) + 1)
  const x = view.x0 + (clockAngle(dx, dy) / TAU) * (view.x1 - view.x0)
  const node = nodeAt(tree, Math.round(view.depth) + ring, x)
  return node ? { kind: 'node', node } : { kind: 'empty' }
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const lerpWindow = (from: ViewWindow, to: ViewWindow, t: number): ViewWindow => ({
  x0: from.x0 + (to.x0 - from.x0) * t,
  x1: from.x1 + (to.x1 - from.x1) * t,
  depth: from.depth + (to.depth - from.depth) * t
})

export const windowOf = (node: SunburstNode): ViewWindow => ({ x0: node.x0, x1: node.x1, depth: node.depth })
