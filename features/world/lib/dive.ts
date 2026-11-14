/** Transition d'entrée dans une zone : la caméra plonge à la verticale du pissenlit, la fleur grandit, le fond blanchit. */
export type Vec3 = { x: number; y: number; z: number }

export const DIVE_DURATION_MS = 1300

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t
})

/** Échelle maximale de la tête de la fleur en fin de plongée. */
export const DIVE_MAX_SCALE = 2.2

/** Pose finale : au-dessus de la tête de la fleur (de rayon `headRadius` au repos), regard vers le bas. */
export function diveTarget(
  zone: { x: number; z: number },
  headY: number,
  headRadius: number
): { position: Vec3; look: Vec3 } {
  return {
    position: { x: zone.x, y: headY + headRadius * DIVE_MAX_SCALE + 3.5, z: zone.z + 0.35 },
    look: { x: zone.x, y: headY, z: zone.z }
  }
}

/** Progression 0 → 1 de la plongée à `elapsedMs`. */
export const diveProgress = (elapsedMs: number) => clamp01(elapsedMs / DIVE_DURATION_MS)

/** Opacité du voile `--color-background` : nul jusqu'à 62 % de la plongée, plein à la fin. */
export const diveFade = (t: number) => clamp01((t - 0.62) / 0.38)

/** Échelle de la tête de la fleur pendant la plongée. */
export const diveFlowerScale = (t: number) => 1 + (DIVE_MAX_SCALE - 1) * easeInOutCubic(clamp01(t))
