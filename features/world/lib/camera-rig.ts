import { easeInOutCubic, type Vec3 } from './dive'

/**
 * Caméra du monde : orbite libre autour du véhicule (glisser, molette) et survol d'introduction. Pur : aucune
 * dépendance à three.js ni au DOM. Repère : Y vers le haut ; angles sphériques `phi` depuis la verticale, `theta`
 * autour de Y (0 = vers +Z).
 */

export type Spherical = { r: number; phi: number; theta: number }

export const toSpherical = (v: Vec3): Spherical => {
  const r = Math.hypot(v.x, v.y, v.z)
  if (r === 0) return { r: 0, phi: 0, theta: 0 }
  return { r, phi: Math.acos(Math.max(-1, Math.min(1, v.y / r))), theta: Math.atan2(v.x, v.z) }
}

export const fromSpherical = ({ r, phi, theta }: Spherical): Vec3 => ({
  x: r * Math.sin(phi) * Math.sin(theta),
  y: r * Math.cos(phi),
  z: r * Math.sin(phi) * Math.cos(theta)
})

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

/** Réglage de l'utilisateur, appliqué par-dessus la caméra de poursuite. */
export type Orbit = {
  /** Rotation autour du véhicule, en radians. */
  yaw: number
  /** Inclinaison ajoutée (positive = plus rasant), en radians. */
  pitch: number
  /** Facteur de distance (1 = distance de poursuite). */
  zoom: number
  /** Secondes depuis le dernier geste de l'utilisateur. */
  idle: number
}

export const ORBIT = {
  minPhi: 0.12,
  maxPhi: 1.42,
  minZoom: 0.35,
  maxZoom: 2.6,
  yawPerPixel: 0.006,
  pitchPerPixel: 0.004,
  zoomPerWheel: 0.0015,
  zoomPerKey: 0.15,
  /** Délai sans geste avant que la caméra revienne derrière le véhicule qui roule. */
  recenterDelay: 1.5,
  recenterRate: 1.4
} as const

export const createOrbit = (): Orbit => ({ yaw: 0, pitch: 0, zoom: 1, idle: Infinity })

export const dragOrbit = (o: Orbit, dx: number, dy: number): Orbit => ({
  ...o,
  yaw: o.yaw - dx * ORBIT.yawPerPixel,
  pitch: clamp(o.pitch + dy * ORBIT.pitchPerPixel, -1.2, 1.2),
  idle: 0
})

/** `delta` > 0 éloigne, < 0 rapproche (même signe que `WheelEvent.deltaY`). */
export const zoomOrbit = (o: Orbit, delta: number): Orbit => ({
  ...o,
  zoom: clamp(o.zoom * Math.exp(delta * ORBIT.zoomPerWheel), ORBIT.minZoom, ORBIT.maxZoom),
  idle: 0
})

export const zoomOrbitBySteps = (o: Orbit, steps: number): Orbit =>
  zoomOrbit(o, (steps * ORBIT.zoomPerKey) / ORBIT.zoomPerWheel)

export const resetOrbit = (): Orbit => ({ ...createOrbit(), idle: 0 })

/** Fait vieillir le geste ; quand le véhicule roule et que l'utilisateur ne touche à rien, la rotation revient à 0. */
export const relaxOrbit = (o: Orbit, dt: number, driving: boolean): Orbit => {
  const idle = o.idle + dt
  if (!driving || idle < ORBIT.recenterDelay) return { ...o, idle }
  const k = Math.exp(-ORBIT.recenterRate * dt)
  return { ...o, yaw: angleDiff(o.yaw, 0) * k, idle }
}

/**
 * Part du regard porté devant le véhicule (1 en poursuite). Elle s'annule quand l'utilisateur tourne autour ou zoome
 * près : la caméra pivote alors autour du véhicule lui-même, qui reste au centre de l'image.
 */
export const lookAhead = (o: Orbit): number => {
  const turned = Math.min(1, Math.abs(angleDiff(o.yaw, 0)) / 0.6 + Math.abs(o.pitch) / 0.6)
  const near = clamp((o.zoom - ORBIT.minZoom) / (1 - ORBIT.minZoom), 0, 1)
  return (1 - turned) * near
}

/** Décalage caméra → cible de poursuite, modifié par l'orbite (avant la rotation qui suit le cap du véhicule). */
export const applyOrbit = (offset: Vec3, o: Orbit): Vec3 => {
  const s = toSpherical(offset)
  return fromSpherical({
    r: s.r * o.zoom,
    phi: clamp(s.phi + o.pitch, ORBIT.minPhi, ORBIT.maxPhi),
    theta: s.theta + o.yaw
  })
}

/** Survol d'introduction : plan large fixe, puis descente en spirale jusqu'à la caméra de poursuite. */
export const INTRO = {
  holdMs: 900,
  durationMs: 6500,
  center: { x: 0, y: 0, z: -10 } as Vec3,
  radius: 290,
  phi: 0.62,
  theta: 0.9,
  /** Rotation du plan large pendant tout le survol, en radians. */
  spin: 1.3
} as const

/** Poids du survol : 1 au début (plan large), 0 à la fin (poursuite). */
export const introWeight = (elapsedMs: number): number => {
  const t = clamp((elapsedMs - INTRO.holdMs) / (INTRO.durationMs - INTRO.holdMs), 0, 1)
  return 1 - easeInOutCubic(t)
}

export type CameraPose = { position: Vec3; look: Vec3 }

/**
 * Mélange la caméra de poursuite et le plan large par coordonnées sphériques autour du point regardé : la distance
 * se mélange en logarithme (descente régulière), l'angle par le plus court chemin. `w` = 1 → plan large.
 */
export const blendIntro = (chase: CameraPose, elapsedMs: number, w: number): CameraPose => {
  if (w <= 0) return chase
  const c = toSpherical({
    x: chase.position.x - chase.look.x,
    y: chase.position.y - chase.look.y,
    z: chase.position.z - chase.look.z
  })
  const spin = INTRO.theta + INTRO.spin * clamp(elapsedMs / INTRO.durationMs, 0, 1)
  const look = {
    x: lerp(chase.look.x, INTRO.center.x, w),
    y: lerp(chase.look.y, INTRO.center.y, w),
    z: lerp(chase.look.z, INTRO.center.z, w)
  }
  const offset = fromSpherical({
    r: Math.exp(lerp(Math.log(Math.max(c.r, 1e-3)), Math.log(INTRO.radius), w)),
    phi: lerp(c.phi, INTRO.phi, w),
    theta: c.theta + angleDiff(spin, c.theta) * w
  })
  return { position: { x: look.x + offset.x, y: look.y + offset.y, z: look.z + offset.z }, look }
}

/** Brouillard et plan lointain adaptés à la distance caméra → point regardé (le plan large voit tout le jardin). */
export const fogForDistance = (distance: number): { near: number; far: number; cameraFar: number } => {
  const extra = Math.max(0, distance - 40)
  const near = 130 + extra * 1.05
  const far = 300 + extra * 1.7
  return { near, far, cameraFar: Math.max(600, far + 60) }
}
