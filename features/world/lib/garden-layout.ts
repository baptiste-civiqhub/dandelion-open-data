/**
 * Plan du jardin du Luxembourg autour des zones. Les zones gardent les positions de l'atlas (`worldZonesFromAreas`,
 * spirale d'or au centre du monde) : le jardin se dessine AUTOUR d'elles. Le grand cercle et les deux axes de la
 * carte de l'atlas deviennent la balustrade du parterre et ses allées, si bien que l'atlas reste la vue de dessus
 * exacte du monde. Au nord : la place du Grand Bassin et le palais du Sénat ; au sud : l'allée de l'Observatoire ;
 * à l'est et à l'ouest : les bosquets. Repère : plan XZ, Y vers le haut, nord = -Z. Pur : données seulement.
 */
import type { Random } from './seeded-random'
import type { WorldZone } from './world-zones'

export type Spot = { x: number; z: number }
export type OrientedSpot = Spot & { rot: number }
export type TreeSpot = Spot & { scale: number }
export type WalkerPath = { points: Spot[]; closed: boolean; walkers: number; joggers: number }
export type Arc = { a0: number; a1: number }

export const GARDEN = {
  /** Balustrade du parterre : le cercle extérieur de l'atlas (rayon 46). */
  ringRadius: 46,
  /** Anneau de pelouse fleurie, à l'intérieur de la balustrade (les zones s'arrêtent au rayon 38). */
  lawnInner: 38.6,
  lawnOuter: 44,
  /** Allée circulaire autour du parterre. */
  alleeRadius: 52,
  alleeWidth: 6,
  /** Allées des deux axes (les axes de l'atlas). */
  axisWidth: 5,
  fountainRadius: 2.4,
  basin: { x: 0, z: -80, radius: 9.6 },
  palace: { x: 0, z: -124 },
  esplanadeZ: -108,
  plazaHalfWidth: 37.5,
  terraceX: 60,
  bosquetAlleeX: 90,
  avenue: { z0: 58, z1: 146, halfWidth: 23.5, alleeX: 11 },
  bottomAlleeZ: 148,
  medicis: { x0: 66, x1: 104, z: -100, grottoX: 110 },
  orangerie: { x0: -110, x1: -66, z0: -128, z1: -120 },
  kiosk: { x: -82, z: 104 },
  cafe: { x: 82, z: 104 },
  grille: { x: 120, z0: -136, z1: 156 },
  bounds: { x0: -116, x1: 116, z0: -133, z1: 152 },
  start: { x: 0, z: 50, heading: 0 }
} as const

const TAU = Math.PI * 2
const AXES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]

/** Arcs d'un anneau coupé par les quatre allées d'axe (angle 0 = +X, sens trigonométrique vers -Z). */
export function arcsAroundAxes(radius: number, halfGap: number): Arc[] {
  const gap = Math.asin(Math.min(1, halfGap / radius))
  return AXES.map((a) => ({ a0: a + gap, a1: a + Math.PI / 2 - gap }))
}

export const pointOnCircle = (cx: number, cz: number, r: number, a: number): Spot => ({
  x: cx + Math.cos(a) * r,
  z: cz - Math.sin(a) * r
})

/** Le sol est-il libre pour planter un arbre (hors parterre, allées, place, zones, fabriques) ? */
export function isTreeFree(x: number, z: number, zones: readonly WorldZone[]): boolean {
  const g = GARDEN
  const ax = Math.abs(x)
  if (Math.hypot(x, z) < g.alleeRadius + g.alleeWidth / 2 + 2.5) return false
  if (ax < 44 && z < -54) return false
  if (ax < g.avenue.halfWidth && z > 54) return false
  if (Math.abs(ax - g.terraceX) < 5 || Math.abs(ax - g.bosquetAlleeX) < 4.4) return false
  if (Math.abs(z) < 4.6 && ax > 50) return false
  if (Math.abs(z - g.bottomAlleeZ) < 4.6) return false
  if (x > 62 && x < 115 && z > -113 && z < -87) return false
  if (x < -62 && x > -115 && z < -86) return false
  for (const k of [g.kiosk, g.cafe]) if (Math.hypot(x - k.x, z - k.z) < 11.5) return false
  if (ax > 113 || z < -129 || z > 145.5) return false
  for (const zone of zones) if (Math.hypot(x - zone.x, z - zone.z) < zone.radius + 3) return false
  return true
}

/** Bosquets en quinconce, platanes de la fontaine Médicis et arbres des parterres d'entrée. */
export function layoutTrees(zones: readonly WorldZone[], rnd: Random): TreeSpot[] {
  const g = GARDEN
  const trees: TreeSpot[] = []
  const step = 7.3
  for (let row = 0, z = g.bounds.z0; z < g.bounds.z1; z += step * 0.88, row++) {
    for (let x = g.bounds.x0 + (row % 2) * (step / 2); x < g.bounds.x1; x += step) {
      const tx = x + (rnd() - 0.5) * 1.6
      const tz = z + (rnd() - 0.5) * 1.6
      const skip = rnd() < 0.12
      const scale = 0.85 + rnd() * 0.32
      if (!skip && isTreeFree(tx, tz, zones)) trees.push({ x: tx, z: tz, scale })
    }
  }
  for (let x = g.medicis.x0 + 2; x <= g.medicis.x1 - 2; x += 6.5)
    for (const dz of [-9.5, 9.5]) trees.push({ x, z: g.medicis.z + dz, scale: 1.25 })
  for (const [x, z] of [
    [-50, -62],
    [50, -62],
    [-104, -82],
    [-70, -82],
    [112, -82]
  ] as const)
    trees.push({ x, z, scale: 1.1 })
  return trees
}

/** Arbres taillés en rideau de l'allée de l'Observatoire. */
export function layoutClippedTrees(): Spot[] {
  const spots: Spot[] = []
  for (let z = GARDEN.avenue.z0 + 4; z < GARDEN.avenue.z1 - 2; z += 5.6)
    for (const x of [-20.5, -16, 16, 20.5]) spots.push({ x, z })
  return spots
}

/** Lampadaires : autour du parterre, le long des allées, de la place du bassin et des fabriques. */
export function layoutLamps(): Spot[] {
  const g = GARDEN
  const lamps: Spot[] = []
  for (let k = 0; k < 12; k++) {
    const a = (k * TAU) / 12 + TAU / 24
    lamps.push(pointOnCircle(0, 0, g.alleeRadius + g.alleeWidth / 2 + 0.8, a))
  }
  for (const sx of [-1, 1]) {
    for (let z = -120; z < 144; z += 16) if (Math.abs(z) > 7) lamps.push({ x: sx * (g.terraceX + 4.3), z })
    for (let z = g.avenue.z0 + 6; z < g.avenue.z1; z += 16) lamps.push({ x: sx * (g.avenue.alleeX + 2.9), z })
    for (let x = 70; x < 114; x += 15) if (Math.abs(x - g.bosquetAlleeX) > 6) lamps.push({ x: sx * x, z: -3.6 })
    lamps.push({ x: sx * 36, z: g.esplanadeZ - 4 })
  }
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4])
    lamps.push(pointOnCircle(g.basin.x, g.basin.z, 16.8, a))
  lamps.push({ x: -96, z: g.orangerie.z1 + 2.4 }, { x: -80, z: g.orangerie.z1 + 2.4 })
  for (const k of [g.kiosk, g.cafe]) lamps.push({ x: k.x - 7, z: k.z - 6 }, { x: k.x + 7, z: k.z - 6 })
  return lamps
}

/** Statues des Reines de France : autour de la balustrade du parterre et le long de la place du bassin. */
export function layoutStatues(): OrientedSpot[] {
  const g = GARDEN
  const statues: OrientedSpot[] = []
  for (let k = 0; k < 24; k++) {
    const a = (k * TAU) / 24
    if (AXES.some((axis) => Math.abs(Math.atan2(Math.sin(a - axis), Math.cos(a - axis))) < 0.14)) continue
    const p = pointOnCircle(0, 0, g.ringRadius + 1.9, a)
    statues.push({ ...p, rot: Math.atan2(-p.x, -p.z) })
  }
  for (const sx of [-1, 1]) {
    for (let z = -112; z <= -60; z += 9.6) {
      if (Math.abs(z + 98) < 4.5 || Math.abs(z + 70) < 4.5) continue
      statues.push({ x: sx * (g.plazaHalfWidth + 3.1), z, rot: sx < 0 ? Math.PI / 2 : -Math.PI / 2 })
    }
  }
  return statues
}

/** Balustrades droites de la place du bassin, avec deux escaliers de chaque côté. */
export function plazaBalustrades(): { x: number; z0: number; z1: number }[] {
  const x = GARDEN.plazaHalfWidth
  const spans: [number, number][] = [
    [-114, -101],
    [-95, -73],
    [-67, -58]
  ]
  return [-1, 1].flatMap((sx) => spans.map(([z0, z1]) => ({ x: sx * x, z0, z1 })))
}

/** Chaises vertes : autour du bassin (face à l'eau) et en petits groupes sur l'allée du parterre. */
export function layoutChairs(rnd: Random): OrientedSpot[] {
  const g = GARDEN
  const chairs: OrientedSpot[] = []
  for (let k = 0; k < 40; k++) {
    const a = rnd() * TAU
    const r = 11.3 + rnd() * 1.7
    const p = pointOnCircle(g.basin.x, g.basin.z, r, a)
    chairs.push({ ...p, rot: Math.atan2(g.basin.x - p.x, g.basin.z - p.z) + (rnd() - 0.5) * 0.8 })
  }
  for (let c = 0; c < 10; c++) {
    const a = ((c + 0.5) * TAU) / 10
    if (AXES.some((axis) => Math.abs(Math.atan2(Math.sin(a - axis), Math.cos(a - axis))) < 0.2)) continue
    for (let k = 0; k < 3; k++) {
      const p = pointOnCircle(0, 0, g.alleeRadius - 1.6 + rnd() * 0.6, a + (k - 1) * 0.022)
      chairs.push({ ...p, rot: Math.atan2(-p.x, -p.z) + (rnd() - 0.5) * 0.6 })
    }
  }
  return chairs
}

const circle = (cx: number, cz: number, r: number, n = 40): Spot[] =>
  Array.from({ length: n }, (_, k) => pointOnCircle(cx, cz, r, (k * TAU) / n))

/** Itinéraires des promeneurs : boucles fermées ou allers-retours. */
export function layoutWalkerPaths(): WalkerPath[] {
  const g = GARDEN
  const E = g.bottomAlleeZ
  const paths: WalkerPath[] = [
    { points: circle(0, 0, g.alleeRadius, 64), closed: true, walkers: 14, joggers: 3 },
    { points: circle(g.basin.x, g.basin.z, 14.6, 40), closed: true, walkers: 12, joggers: 0 },
    { points: circle(0, 0, 36.6, 56), closed: true, walkers: 6, joggers: 0 },
    {
      points: [
        { x: -g.avenue.alleeX, z: g.avenue.z0 },
        { x: g.avenue.alleeX, z: g.avenue.z0 },
        { x: g.avenue.alleeX, z: E },
        { x: -g.avenue.alleeX, z: E }
      ],
      closed: true,
      walkers: 10,
      joggers: 0
    }
  ]
  for (const sx of [-1, 1]) {
    paths.push({
      points: [
        { x: sx * g.terraceX, z: -124 },
        { x: sx * g.terraceX, z: E }
      ],
      closed: false,
      walkers: 6,
      joggers: 1
    })
    paths.push({
      points: [
        { x: sx * 56, z: 0 },
        { x: sx * 116, z: 0 }
      ],
      closed: false,
      walkers: 3,
      joggers: 0
    })
    paths.push({
      points: [
        { x: sx * g.bosquetAlleeX, z: -124 },
        { x: sx * g.bosquetAlleeX, z: E }
      ],
      closed: false,
      walkers: 3,
      joggers: 0
    })
  }
  for (const dz of [-6.6, 6.6])
    paths.push({
      points: [
        { x: g.medicis.x0, z: g.medicis.z + dz },
        { x: g.medicis.x1, z: g.medicis.z + dz }
      ],
      closed: false,
      walkers: 3,
      joggers: 0
    })
  paths.push({
    points: [
      { x: -106, z: -114 },
      { x: -64, z: -114 }
    ],
    closed: false,
    walkers: 3,
    joggers: 0
  })
  return paths
}

/** Lieux où picorent les pigeons : sur le gravier, hors des pelouses et des zones. */
export const PIGEON_HOMES: readonly Spot[] = [
  { x: -16, z: -66 },
  { x: 14, z: -63 },
  { x: 0, z: -100 },
  { x: 30, z: 20 },
  { x: -26, z: -20 }
]
