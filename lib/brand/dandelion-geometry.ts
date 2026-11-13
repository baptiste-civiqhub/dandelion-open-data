/**
 * Géométrie du pictogramme Dandelion, construite comme sa grille de référence :
 *
 * 1. un cercle extérieur (centre C, rayon R) qui coupe toutes les branches ;
 * 2. un centre de construction P, décalé de C, d'où rayonnent 5 bandes droites d'épaisseur constante,
 *    espacées de 36° ; chaque bande passe à ±ρ de P (décalage alterné, d'où l'effet de rotation) ;
 * 3. chaque chevron réunit deux demi-bandes voisines : coin arrondi tourné vers P (coupé à une distance d),
 *    encoche intérieure là où les bords intérieurs se croisent, extrémités coupées par le cercle.
 *
 * Les branches d'une même bande sont alignées de part et d'autre du centre, comme sur la grille.
 * Pure et déterministe : le composant React, l'icône du site et tout export dérivent de cette source.
 */

export type Vec = { x: number; y: number }

export type MarkParams = {
  /** Côté du viewBox carré. */
  size: number
  /** Rayon du cercle extérieur, en unités du viewBox. */
  radius: number
  /** Décalage du centre de construction P par rapport au centre du cercle, en fractions de R. */
  burstOffset: Vec
  /** Orientation de la première bande, en degrés (repère SVG : sens horaire depuis l'axe x). */
  firstAngle: number
  /** Distance alternée ±ρ des bandes à P, en fraction de R. */
  stripeOffset: number
  /** Épaisseur des bandes, en fraction de R. */
  stripeWidth: number
  /** Distance de coupe du coin de chaque chevron depuis P, le long de sa bissectrice, en fraction de R. */
  cutDistance: number
  /** Rayon d'arrondi des coins, en fraction de R. */
  cornerRadius: number
  /** Rayon d'arrondi de l'encoche intérieure, en fraction de R. */
  notchRadius: number
}

export type Chevron = {
  path: string
  /** Points de construction, utiles aux tests et à la documentation. */
  notch: Vec
  corners: [Vec, Vec]
}

export type DandelionGeometry = {
  size: number
  center: Vec
  burstCenter: Vec
  radius: number
  stripeAngles: number[]
  chevrons: Chevron[]
}

/** Paramètres mesurés sur la grille de construction de référence. */
export const DANDELION_PARAMS: MarkParams = {
  size: 100,
  radius: 46,
  burstOffset: { x: 0.228, y: -0.03 },
  firstAngle: 30,
  stripeOffset: 0.049,
  stripeWidth: 0.152,
  cutDistance: 0.22,
  cornerRadius: 0.11,
  notchRadius: 0.014
}

const STRIPES = 5
const STRIPE_STEP = 180 / STRIPES

/** Paires de demi-bandes formant chaque chevron : [bande, sens] (+1 vers l'avant, -1 vers l'arrière). */
const CHEVRON_ARMS: Array<[[number, 1 | -1], [number, 1 | -1]]> = [
  [
    [4, -1],
    [0, 1]
  ],
  [
    [1, 1],
    [2, 1]
  ],
  [
    [3, 1],
    [4, 1]
  ],
  [
    [0, -1],
    [1, -1]
  ],
  [
    [2, -1],
    [3, -1]
  ]
]

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k })
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y
const cross = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x
const length = (a: Vec) => Math.hypot(a.x, a.y)
const normalize = (a: Vec): Vec => scale(a, 1 / length(a))
const direction = (deg: number): Vec => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) })
const round = (value: number) => Math.round(value * 100) / 100
const fmt = (p: Vec) => `${round(p.x)} ${round(p.y)}`

/** Intersection de deux droites (point + direction). */
export function intersectLines(p1: Vec, d1: Vec, p2: Vec, d2: Vec): Vec {
  const denominator = cross(d1, d2)
  if (Math.abs(denominator) < 1e-9) throw new Error('Droites parallèles')
  return add(p1, scale(d1, cross(sub(p2, p1), d2) / denominator))
}

/** Point où une demi-droite partie de l'intérieur du cercle le traverse. */
export function exitCircle(origin: Vec, dir: Vec, center: Vec, radius: number): Vec {
  const offset = sub(origin, center)
  const b = dot(offset, dir)
  const c = dot(offset, offset) - radius * radius
  return add(origin, scale(dir, -b + Math.sqrt(b * b - c)))
}

/** Congé de rayon r au coin `corner` entre les segments prev→corner et corner→next. */
function fillet(prev: Vec, corner: Vec, next: Vec, radius: number) {
  const toPrev = normalize(sub(prev, corner))
  const toNext = normalize(sub(next, corner))
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(toPrev, toNext))))
  const maxTangent = Math.min(length(sub(prev, corner)), length(sub(next, corner))) / 2
  const tangent = Math.min(radius / Math.tan(angle / 2), maxTangent)
  const effectiveRadius = tangent * Math.tan(angle / 2)
  const sweep = cross(sub(corner, prev), sub(next, corner)) > 0 ? 1 : 0

  return {
    start: add(corner, scale(toPrev, tangent)),
    end: add(corner, scale(toNext, tangent)),
    command: (end: Vec) => `A${round(effectiveRadius)} ${round(effectiveRadius)} 0 0 ${sweep} ${fmt(end)}`
  }
}

function arcOnCircle(from: Vec, to: Vec, center: Vec, radius: number) {
  const sweep = cross(sub(from, center), sub(to, center)) > 0 ? 1 : 0
  return `A${round(radius)} ${round(radius)} 0 0 ${sweep} ${fmt(to)}`
}

export function buildDandelionMark(params: MarkParams = DANDELION_PARAMS): DandelionGeometry {
  const R = params.radius
  const center = { x: params.size / 2, y: params.size / 2 }
  const burstCenter = add(center, scale(params.burstOffset, R))
  const halfWidth = (params.stripeWidth * R) / 2

  const stripeAngles = Array.from({ length: STRIPES }, (_, k) => params.firstAngle + STRIPE_STEP * k)
  const stripes = stripeAngles.map((angle, k) => {
    const along = direction(angle)
    const normal = { x: -along.y, y: along.x }
    const offset = (k % 2 === 0 ? -1 : 1) * params.stripeOffset * R
    return { along, point: add(burstCenter, scale(normal, offset)) }
  })

  const chevrons = CHEVRON_ARMS.map(([[stripeA, senseA], [stripeB, senseB]]) => {
    const ua = scale(stripes[stripeA].along, senseA)
    const ub = scale(stripes[stripeB].along, senseB)
    const pa = stripes[stripeA].point
    const pb = stripes[stripeB].point

    const bisector = normalize(add(ua, ub))
    const towardInsideA = normalize(sub(ub, scale(ua, dot(ub, ua))))
    const towardInsideB = normalize(sub(ua, scale(ub, dot(ua, ub))))

    const innerA = add(pa, scale(towardInsideA, halfWidth))
    const outerA = sub(pa, scale(towardInsideA, halfWidth))
    const innerB = add(pb, scale(towardInsideB, halfWidth))
    const outerB = sub(pb, scale(towardInsideB, halfWidth))

    const notch = intersectLines(innerA, ua, innerB, ub)
    const cutPoint = add(burstCenter, scale(bisector, params.cutDistance * R))
    const cutDir = { x: -bisector.y, y: bisector.x }
    const cornerA = intersectLines(outerA, ua, cutPoint, cutDir)
    const cornerB = intersectLines(outerB, ub, cutPoint, cutDir)

    const outA = exitCircle(cornerA, ua, center, R)
    const inA = exitCircle(notch, ua, center, R)
    const outB = exitCircle(cornerB, ub, center, R)
    const inB = exitCircle(notch, ub, center, R)

    const filletA = fillet(outA, cornerA, cornerB, params.cornerRadius * R)
    const filletB = fillet(cornerA, cornerB, outB, params.cornerRadius * R)
    const filletNotch = fillet(inB, notch, inA, params.notchRadius * R)

    const path = [
      `M${fmt(outA)}`,
      `L${fmt(filletA.start)}`,
      filletA.command(filletA.end),
      `L${fmt(filletB.start)}`,
      filletB.command(filletB.end),
      `L${fmt(outB)}`,
      arcOnCircle(outB, inB, center, R),
      `L${fmt(filletNotch.start)}`,
      filletNotch.command(filletNotch.end),
      `L${fmt(inA)}`,
      arcOnCircle(inA, outA, center, R),
      'Z'
    ].join('')

    return { path, notch, corners: [cornerA, cornerB] as [Vec, Vec] }
  })

  return { size: params.size, center, burstCenter, radius: R, stripeAngles, chevrons }
}

export const DANDELION_MARK = buildDandelionMark()
