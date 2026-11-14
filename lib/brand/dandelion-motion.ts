/**
 * Mouvement du pictogramme Dandelion : la partie « espace » (directions, amplitudes, ordre des pétales).
 * La partie « temps » (durées, courbes, keyframes) vit dans design-system/motion.css. Voir design-system/MOTION.md.
 *
 * Chaque pétale (chevron) a un axe : la demi-droite qui part du centre de construction P et passe par son encoche.
 * Tout mouvement d'un pétale se fait le long de cet axe (plus un léger déport global au survol) : le picto ne pivote
 * jamais, ne se déforme jamais, et ses proportions restent celles de la géométrie de référence.
 */
import { DANDELION_MARK, type DandelionGeometry, type Vec } from './dandelion-geometry'

export type MotionParams = {
  /** Loader « Bloom » : distance parcourue par un pétale vers l'extérieur à son pic, en unités du viewBox. */
  bloomDrift: number
  /** Survol « Lean » : déport du picto entier vers le pointeur, en unités du viewBox. */
  hoverLean: number
  /** Survol : ouverture des pétales tournés vers le pointeur, en unités du viewBox. */
  hoverOpen: number
  /** Survol : resserrement des pétales opposés, en fraction de `hoverOpen`. */
  hoverSettle: number
}

/** Amplitudes volontairement faibles (≤ 4 % du viewBox) : le mouvement se remarque, il ne se regarde pas. */
export const DANDELION_MOTION_PARAMS: MotionParams = {
  bloomDrift: 2.4,
  hoverLean: 1.2,
  hoverOpen: 2.8,
  hoverSettle: 0.3
}

export type PetalMotion = {
  /** Vecteur unitaire de l'axe du pétale (de P vers l'extérieur). */
  axis: Vec
  /** Angle de l'axe en degrés, mesuré dans le sens horaire depuis midi (0 = haut). */
  angle: number
  /** Rang du pétale dans la vague du loader : 0 … 4, sens horaire en partant de midi. */
  order: number
  /** Déplacement du pétale au pic du loader. */
  drift: Vec
}

/** Variables CSS posées sur un pétale et consommées par design-system/motion.css. */
export type PetalCssVars = {
  '--dm-order': string
  '--dm-drift-x': string
  '--dm-drift-y': string
}

const round = (value: number) => Math.round(value * 100) / 100 || 0

/** Axe, rang et dérive de chaque pétale, dans l'ordre des chevrons de la géométrie (donc l'ordre du DOM). */
export function buildPetalMotion(
  geometry: DandelionGeometry = DANDELION_MARK,
  params: MotionParams = DANDELION_MOTION_PARAMS
): PetalMotion[] {
  const petals = geometry.chevrons.map(({ notch }) => {
    const dx = notch.x - geometry.burstCenter.x
    const dy = notch.y - geometry.burstCenter.y
    const length = Math.hypot(dx, dy)
    const axis = { x: dx / length, y: dy / length }
    const angle = ((((Math.atan2(axis.y, axis.x) * 180) / Math.PI + 90) % 360) + 360) % 360
    return { axis, angle }
  })

  const ranks = petals
    .map((petal, index) => ({ index, angle: petal.angle }))
    .sort((a, b) => a.angle - b.angle)
    .reduce<number[]>((acc, { index }, rank) => {
      acc[index] = rank
      return acc
    }, [])

  return petals.map(({ axis, angle }, index) => ({
    axis,
    angle,
    order: ranks[index],
    drift: { x: round(axis.x * params.bloomDrift), y: round(axis.y * params.bloomDrift) }
  }))
}

export const DANDELION_PETALS = buildPetalMotion()

/**
 * Position du pointeur ramenée au disque unité centré sur le picto : (0, 0) au centre, longueur 1 sur le bord
 * du cadre et au-delà. Le rectangle est celui de l'élément (getBoundingClientRect).
 */
export function normalizePointer(
  pointer: Vec,
  rect: { left: number; top: number; width: number; height: number }
): Vec {
  const half = Math.min(rect.width, rect.height) / 2
  if (half <= 0) return { x: 0, y: 0 }
  const x = (pointer.x - (rect.left + rect.width / 2)) / half
  const y = (pointer.y - (rect.top + rect.height / 2)) / half
  const length = Math.hypot(x, y)
  return length > 1 ? { x: x / length, y: y / length } : { x, y }
}

/**
 * Décalage de chaque pétale pour un pointeur normalisé (disque unité) :
 * tout le picto se penche vers le pointeur, les pétales qui lui font face s'ouvrent, ceux qui lui tournent le dos
 * se resserrent légèrement. Pointeur au centre → aucun décalage.
 */
export function pointerOffsets(
  pointer: Vec,
  petals: PetalMotion[] = DANDELION_PETALS,
  params: MotionParams = DANDELION_MOTION_PARAMS
): Vec[] {
  return petals.map(({ axis }) => {
    const facing = pointer.x * axis.x + pointer.y * axis.y
    const spread = facing > 0 ? facing * params.hoverOpen : facing * params.hoverOpen * params.hoverSettle
    return {
      x: round(pointer.x * params.hoverLean + axis.x * spread),
      y: round(pointer.y * params.hoverLean + axis.y * spread)
    }
  })
}

/** Variables CSS d'un pétale pour le loader (unités du viewBox exprimées en px, l'unité utilisateur SVG). */
export function petalCssVars(petal: PetalMotion): PetalCssVars {
  return {
    '--dm-order': String(petal.order),
    '--dm-drift-x': `${petal.drift.x}px`,
    '--dm-drift-y': `${petal.drift.y}px`
  }
}
