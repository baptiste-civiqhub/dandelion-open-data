/**
 * Vue de dessus du jardin, dans le même repère que le monde (x vers l'est, y = z vers le sud).
 * Les formes reprennent le plan peint au sol : allées, parterre, bassins, palais. Les fleurs
 * restent posées par `worldZonesFromAreas`, donc au même endroit que dans le monde.
 */
import { arcsAroundAxes, GARDEN, pointOnCircle } from '@/features/world/lib/garden-layout'

export type GardenPlanFill = 'sand' | 'gravel' | 'white' | 'lawn' | 'water' | 'water-deep' | 'stone' | 'roof' | 'metal'

export type GardenPlanMark =
  | { kind: 'rect'; x: number; y: number; width: number; height: number; radius: number; fill: GardenPlanFill }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: GardenPlanFill }
  | { kind: 'polygon'; points: string; fill: GardenPlanFill }
  | {
      kind: 'stroke-rect'
      x: number
      y: number
      width: number
      height: number
      stroke: GardenPlanFill
      strokeWidth: number
    }
  | {
      kind: 'stroke-circle'
      cx: number
      cy: number
      r: number
      stroke: GardenPlanFill
      strokeWidth: number
      dash?: string
    }

export type GardenPlan = {
  viewBox: { x: number; y: number; width: number; height: number }
  marks: GardenPlanMark[]
}

export type AtlasLabelAnchor = 'start' | 'middle' | 'end'
export type AtlasLabelBaseline = 'auto' | 'middle' | 'hanging'

export type AtlasLabelPlacement = {
  x: number
  y: number
  anchor: AtlasLabelAnchor
  baseline: AtlasLabelBaseline
  fromX: number
  fromY: number
}

/** Noms des fleurs, repoussés hors du parterre pour ne pas se recouvrir. */
export const ATLAS_LABEL_RADIUS = 62

const round = (value: number) => Math.round(value * 100) / 100

const rectangle = (
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  fill: GardenPlanFill,
  radius = 0
): GardenPlanMark => ({
  kind: 'rect',
  x: round(Math.min(x0, x1)),
  y: round(Math.min(z0, z1)),
  width: round(Math.abs(x1 - x0)),
  height: round(Math.abs(z1 - z0)),
  radius,
  fill
})

const disc = (x: number, z: number, r: number, fill: GardenPlanFill): GardenPlanMark => ({
  kind: 'circle',
  cx: round(x),
  cy: round(z),
  r: round(r),
  fill
})

/** Allée droite, axe horizontal ou vertical : liseré clair puis gravier, comme sur le sol du monde. */
const alley = (x0: number, z0: number, x1: number, z1: number, width: number): GardenPlanMark[] => {
  const vertical = x0 === x1
  const horizontal = z0 === z1
  const band = (extra: number, fill: GardenPlanFill) =>
    rectangle(
      x0 - (vertical ? width / 2 + extra : 0),
      z0 - (horizontal ? width / 2 + extra : 0),
      x1 + (vertical ? width / 2 + extra : 0),
      z1 + (horizontal ? width / 2 + extra : 0),
      fill
    )
  return [band(0.5, 'white'), band(0, 'gravel')]
}

const octagonPoints = (cx: number, cz: number, radius: number) =>
  Array.from({ length: 8 }, (_, index) => {
    const angle = (index * Math.PI) / 4 + Math.PI / 8
    return `${round(cx + Math.cos(angle) * radius)},${round(cz + Math.sin(angle) * radius)}`
  }).join(' ')

const sectorPoints = (inner: number, outer: number, a0: number, a1: number) => {
  const steps = 10
  const ring: { x: number; z: number }[] = []
  for (let index = 0; index <= steps; index += 1) {
    ring.push(pointOnCircle(0, 0, outer, a0 + ((a1 - a0) * index) / steps))
  }
  for (let index = steps; index >= 0; index -= 1) {
    ring.push(pointOnCircle(0, 0, inner, a0 + ((a1 - a0) * index) / steps))
  }
  return ring.map((spot) => `${round(spot.x)},${round(spot.z)}`).join(' ')
}

/**
 * Plan du jardin du Luxembourg, du nord (palais, grand bassin) au sud (allée de l'Observatoire).
 * L'ordre des formes est l'ordre de peinture : le gravier passe sur le sable, l'eau sur la pierre.
 */
export function layoutGardenPlan(): GardenPlan {
  const garden = GARDEN
  const { plan } = garden
  const marks: GardenPlanMark[] = []

  marks.push(rectangle(-120, -136, 120, 156, 'sand', 3))
  marks.push(rectangle(-44.6, -134, 44.6, -55.4, 'white', 2.5))
  marks.push(rectangle(-44, -134, 44, -56, 'gravel', 2))

  const alleyOuter = garden.alleeRadius + garden.alleeWidth / 2
  const alleyInner = garden.alleeRadius - garden.alleeWidth / 2
  marks.push(disc(0, 0, alleyOuter + 0.5, 'white'))
  marks.push(disc(0, 0, alleyOuter, 'gravel'))
  marks.push(disc(0, 0, alleyInner, 'white'))
  marks.push(disc(0, 0, alleyInner - 0.5, 'sand'))
  marks.push(disc(0, 0, garden.ringRadius - 0.4, 'gravel'))

  for (const radius of [16, 32]) {
    marks.push({ kind: 'stroke-circle', cx: 0, cy: 0, r: radius, stroke: 'white', strokeWidth: 0.5, dash: '1.4 2.2' })
  }
  marks.push({ kind: 'stroke-circle', cx: 0, cy: 0, r: garden.ringRadius, stroke: 'metal', strokeWidth: 0.7 })

  marks.push(
    ...alley(0, -garden.alleeRadius, 0, garden.alleeRadius, garden.axisWidth),
    ...alley(-garden.alleeRadius, 0, garden.alleeRadius, 0, garden.axisWidth),
    ...alley(0, -56, 0, -garden.alleeRadius, garden.axisWidth)
  )
  for (const side of [-1, 1]) {
    marks.push(
      ...alley(side * garden.terraceX, -130, side * garden.terraceX, garden.bottomAlleeZ, 7),
      ...alley(side * garden.bosquetAlleeX, -128, side * garden.bosquetAlleeX, garden.bottomAlleeZ, 6),
      ...alley(side * 55, 0, side * 120, 0, 6),
      ...alley(side * garden.avenue.alleeX, garden.avenue.z0 - 4, side * garden.avenue.alleeX, garden.bottomAlleeZ, 5)
    )
  }
  marks.push(...alley(-118, garden.bottomAlleeZ, 118, garden.bottomAlleeZ, 7))
  marks.push(rectangle(-8, garden.avenue.z0 + 3.4, 8, garden.avenue.z1 - 1.4, 'white', 2))
  marks.push(rectangle(-7.4, garden.avenue.z0 + 4, 7.4, garden.avenue.z1 - 2, 'lawn', 2))

  const medicis = garden.medicis
  marks.push(rectangle(medicis.x0 - 0.6, medicis.z - 4.4, medicis.x1 + 0.6, medicis.z + 4.4, 'white', 0.6))
  marks.push(rectangle(medicis.x0, medicis.z - 3.8, medicis.x1, medicis.z + 3.8, 'water-deep', 0.4))
  marks.push(rectangle(-98.6, -110.6, -67.4, -89.4, 'white', 1.8))
  marks.push(rectangle(-98, -110, -68, -90, 'lawn', 1.5))
  marks.push(disc(garden.kiosk.x, garden.kiosk.z, 8, 'gravel'))
  marks.push(disc(garden.cafe.x, garden.cafe.z, 8, 'gravel'))

  for (const arc of arcsAroundAxes(garden.lawnInner, garden.axisWidth / 2 + 1)) {
    marks.push({
      kind: 'polygon',
      points: sectorPoints(garden.lawnInner, garden.lawnOuter, arc.a0, arc.a1),
      fill: 'lawn'
    })
  }

  marks.push(disc(0, 0, garden.fountainRadius + 0.35, 'stone'))
  marks.push(disc(0, 0, garden.fountainRadius - 0.05, 'water'))

  const basin = garden.basin
  marks.push({ kind: 'polygon', points: octagonPoints(basin.x, basin.z, basin.radius + 0.7), fill: 'stone' })
  marks.push({ kind: 'polygon', points: octagonPoints(basin.x, basin.z, basin.radius - 0.15), fill: 'water' })

  const palace = garden.palace
  marks.push(rectangle(palace.x - 16, palace.z - 7.5, palace.x + 16, palace.z + 7.5, 'stone', 1))
  marks.push({
    kind: 'stroke-rect',
    x: palace.x - 16,
    y: palace.z - 7.5,
    width: 32,
    height: 15,
    stroke: 'metal',
    strokeWidth: 0.7
  })
  marks.push(disc(palace.x, palace.z + 1.5, 3.6, 'roof'))

  marks.push({
    kind: 'stroke-rect',
    x: -garden.grille.x,
    y: garden.grille.z0,
    width: garden.grille.x * 2,
    height: garden.grille.z1 - garden.grille.z0,
    stroke: 'metal',
    strokeWidth: 0.6
  })

  return {
    viewBox: {
      x: plan.x0,
      y: plan.z0,
      width: plan.x1 - plan.x0,
      height: plan.z1 - plan.z0
    },
    marks
  }
}

/**
 * Nom d'une fleur, poussé vers l'extérieur du parterre dans la direction de la fleur.
 */
export function placeAtlasLabel(x: number, z: number, radius = ATLAS_LABEL_RADIUS): AtlasLabelPlacement {
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return { x: 0, y: radius, anchor: 'middle', baseline: 'hanging', fromX: 0, fromY: 0 }
  }
  const length = Math.hypot(x, z)
  const ux = length < 0.5 ? 0 : x / length
  const uz = length < 0.5 ? 1 : z / length
  const edge = Math.min(radius - 4, length + 7)
  return {
    x: round(ux * radius),
    y: round(uz * radius),
    anchor: ux > 0.3 ? 'start' : ux < -0.3 ? 'end' : 'middle',
    baseline: uz > 0.55 ? 'hanging' : uz < -0.55 ? 'auto' : 'middle',
    fromX: round(ux * edge),
    fromY: round(uz * edge)
  }
}

/** Rotation SVG (sens horaire, degrés) pour qu'une flèche pointant vers le haut regarde `heading` (0 = nord). */
export function poseMarkerRotation(heading: number): number {
  if (!Number.isFinite(heading)) return 0
  const degrees = ((-heading * 180) / Math.PI) % 360
  const rounded = Math.round(degrees * 100) / 100
  return rounded === 0 ? 0 : rounded
}
