import { diskLayout } from '@/features/dataviz/lib/sunburst-geometry'

/**
 * Transition d'entrée dans une zone : la caméra passe au-dessus du pissenlit et se pose à la verticale, la fleur
 * grandit, le reste du jardin se voile. À la fin, la tête de la fleur occupe exactement le disque du sunburst de la
 * page de zone (même viewport) : la page suivante ouvre ses anneaux à cet endroit, la fleur devient la dataviz.
 */
export type Vec3 = { x: number; y: number; z: number }

/** Cercle à l'écran, en px CSS, origine en haut à gauche du canvas. */
export type ScreenCircle = { cx: number; cy: number; r: number }

export type Viewport = { width: number; height: number }

/** Pose de caméra complète : `up` est la direction du monde qui apparaît en haut de l'image (vecteur unitaire). */
export type LandingPose = { position: Vec3; look: Vec3; up: Vec3 }

export const DIVE_DURATION_MS = 1400

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t)
})

/** Échelle maximale de la tête de la fleur en fin de plongée. */
export const DIVE_MAX_SCALE = 2.2

/**
 * Voile `--color-background` posé sur le jardin à la fin de la plongée, hors du disque de la fleur. Même opacité que
 * le voile du fond de la page de zone (`StageBackdrop`, `bg-background/70`) : au passage d'une page à l'autre, seul
 * le flou change autour du disque.
 */
export const EXIT_VEIL_OPACITY = 0.7

/** Largeur du fondu entre le disque resté net et le voile, en px CSS. */
export const EXIT_WINDOW_FEATHER_PX = 40

/** Le disque du sunburst de la page de zone (`diskLayout`), contour compris : là où la fleur se pose. */
export function landingOnSunburst({ width, height }: Viewport): ScreenCircle {
  const disk = diskLayout(width, height)
  return { cx: disk.cx, cy: disk.cy, r: disk.r1 }
}

/** Cercle de repli quand l'application n'en fournit pas : centré, un peu plus d'un tiers du petit côté. */
export const centeredLanding = ({ width, height }: Viewport): ScreenCircle => ({
  cx: width / 2,
  cy: height / 2,
  r: Math.min(width, height) * 0.36
})

/**
 * Pose finale de la plongée : caméra à la verticale, regard vers le bas, `heading` (direction horizontale) en haut de
 * l'image. La tête de la fleur, sphère de centre `head` et de rayon `radius` (échelle finale), se projette exactement
 * sur `target` : son centre en (cx, cy), son contour au rayon r. `fovY` en degrés, comme `PerspectiveCamera.fov`.
 */
export function diveLanding({
  head,
  radius,
  heading,
  target,
  viewport,
  fovY
}: {
  head: Vec3
  radius: number
  heading: { x: number; z: number }
  target: ScreenCircle
  viewport: Viewport
  fovY: number
}): LandingPose {
  const tanHalf = Math.tan((fovY * Math.PI) / 360)
  const height = Math.max(1, viewport.height)
  const aspect = viewport.width / height
  const focal = height / 2 / tanHalf
  // Contour apparent d'une sphère vue à la distance d : tan(angle) = radius / √(d² − radius²).
  const distance = radius * Math.sqrt(1 + (focal / Math.max(1, target.r)) ** 2)
  const length = Math.hypot(heading.x, heading.z) || 1
  const up = { x: heading.x / length, y: 0, z: heading.z / length }
  const right = { x: -up.z, y: 0, z: up.x }
  const along = (1 - (2 * target.cy) / height) * distance * tanHalf
  const across = ((2 * target.cx) / Math.max(1, viewport.width) - 1) * distance * tanHalf * aspect
  const look = {
    x: head.x - right.x * across - up.x * along,
    y: head.y,
    z: head.z - right.z * across - up.z * along
  }
  return { position: { x: look.x, y: head.y + distance, z: look.z }, look, up }
}

/**
 * Direction horizontale du regard au départ de la plongée : elle finit en haut de l'image, si bien que la caméra
 * bascule vers le bas sans tourner sur elle-même. Regard déjà vertical : `fallback`.
 */
export function diveHeading(from: { position: Vec3; look: Vec3 }, fallback: { x: number; z: number }) {
  const x = from.look.x - from.position.x
  const z = from.look.z - from.position.z
  const horizontal = Math.hypot(x, z)
  return horizontal > 0.05 * Math.hypot(x, from.look.y - from.position.y, z) ? { x, z } : fallback
}

/**
 * Pose de la caméra à l'instant `e` (progression déjà adoucie) entre `from` et `to`. La caméra passe par-dessus la
 * fleur dans le plan vertical de `to.up` : angle depuis la verticale et distance (en logarithme) interpolés autour de
 * `head`, écart latéral linéaire. Le point regardé glisse de l'un à l'autre ; le haut de l'image reste `to.up`.
 */
export function divePose(from: { position: Vec3; look: Vec3 }, to: LandingPose, head: Vec3, e: number): LandingPose {
  const forward = to.up
  const right = { x: -forward.z, y: 0, z: forward.x }
  const polar = (position: Vec3) => {
    const offset = sub(position, head)
    const back = -dot(offset, forward)
    return {
      angle: Math.atan2(back, offset.y),
      distance: Math.max(1e-3, Math.hypot(back, offset.y)),
      side: dot(offset, right)
    }
  }
  const a = polar(from.position)
  const b = polar(to.position)
  const angle = lerp(a.angle, b.angle, e)
  const distance = Math.exp(lerp(Math.log(a.distance), Math.log(b.distance), e))
  const side = lerp(a.side, b.side, e)
  const back = Math.sin(angle) * distance
  return {
    position: {
      x: head.x - forward.x * back + right.x * side,
      y: head.y + Math.cos(angle) * distance,
      z: head.z - forward.z * back + right.z * side
    },
    look: lerpVec(from.look, to.look, e),
    up: forward
  }
}

/**
 * Projection perspective d'un point du monde, en px CSS (même convention que `PerspectiveCamera` + `lookAt` avec
 * `up`). `depth` > 0 devant la caméra.
 */
export function projectToScreen(pose: LandingPose, fovY: number, viewport: Viewport, point: Vec3) {
  const backward = sub(pose.position, pose.look)
  const norm = (v: Vec3) => {
    const length = Math.hypot(v.x, v.y, v.z) || 1
    return { x: v.x / length, y: v.y / length, z: v.z / length }
  }
  const cross = (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  })
  const zAxis = norm(backward)
  const xAxis = norm(cross(pose.up, zAxis))
  const yAxis = cross(zAxis, xAxis)
  const v = sub(point, pose.position)
  const depth = -dot(v, zAxis)
  const tanHalf = Math.tan((fovY * Math.PI) / 360)
  const aspect = viewport.width / Math.max(1, viewport.height)
  const ndcX = dot(v, xAxis) / (depth * tanHalf * aspect)
  const ndcY = dot(v, yAxis) / (depth * tanHalf)
  return { x: ((ndcX + 1) / 2) * viewport.width, y: ((1 - ndcY) / 2) * viewport.height, depth }
}

/** Progression 0 → 1 de la plongée à `elapsedMs`. */
export const diveProgress = (elapsedMs: number) => clamp01(elapsedMs / DIVE_DURATION_MS)

/** Opacité du voile autour du disque : nulle jusqu'à la moitié de la plongée, `EXIT_VEIL_OPACITY` à la fin. */
export const diveFade = (t: number) => {
  const k = clamp01((t - 0.5) / 0.5)
  return EXIT_VEIL_OPACITY * k * k * (3 - 2 * k)
}

/** Échelle de la tête de la fleur pendant la plongée. */
export const diveFlowerScale = (t: number) => 1 + (DIVE_MAX_SCALE - 1) * easeInOutCubic(clamp01(t))
