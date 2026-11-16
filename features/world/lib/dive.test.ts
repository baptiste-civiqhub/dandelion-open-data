import { describe, expect, it } from 'vitest'

import { diskLayout } from '@/features/dataviz/lib/sunburst-geometry'

import {
  centeredLanding,
  DIVE_DURATION_MS,
  DIVE_MAX_SCALE,
  diveFade,
  diveFlowerScale,
  diveHeading,
  diveLanding,
  divePose,
  diveProgress,
  easeInOutCubic,
  EXIT_VEIL_OPACITY,
  landingOnSunburst,
  lerpVec,
  projectToScreen,
  type LandingPose,
  type Vec3,
  type Viewport
} from './dive'

const FOV = 34
const HEAD: Vec3 = { x: 12.1, y: 7.55, z: -18 }
const RADIUS = 2.5 * DIVE_MAX_SCALE

/** Rayon apparent d'une sphère : le plus grand écart au centre projeté parmi des points de sa surface. */
function apparentRadius(pose: LandingPose, viewport: Viewport, center: Vec3, radius: number) {
  const c = projectToScreen(pose, FOV, viewport, center)
  let max = 0
  for (let i = 0; i <= 90; i++) {
    const phi = (i / 90) * Math.PI
    for (let j = 0; j < 180; j++) {
      const theta = (j / 180) * 2 * Math.PI
      const p = projectToScreen(pose, FOV, viewport, {
        x: center.x + radius * Math.sin(phi) * Math.cos(theta),
        y: center.y + radius * Math.cos(phi),
        z: center.z + radius * Math.sin(phi) * Math.sin(theta)
      })
      max = Math.max(max, Math.hypot(p.x - c.x, p.y - c.y))
    }
  }
  return max
}

describe('dive', () => {
  it('eases from 0 to 1', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6)
  })

  it.each<[string, Viewport]>([
    ['desktop', { width: 1440, height: 900 }],
    ['laptop', { width: 1280, height: 720 }],
    ['phone', { width: 390, height: 844 }]
  ])('lands the flower head exactly on the sunburst disk (%s)', (_, viewport) => {
    const disk = diskLayout(viewport.width, viewport.height)
    const pose = diveLanding({
      head: HEAD,
      radius: RADIUS,
      heading: { x: 0.3, z: -1 },
      target: landingOnSunburst(viewport),
      viewport,
      fovY: FOV
    })
    const center = projectToScreen(pose, FOV, viewport, HEAD)
    expect(center.x).toBeCloseTo(disk.cx, 6)
    expect(center.y).toBeCloseTo(disk.cy, 6)
    expect(center.depth).toBeGreaterThan(RADIUS)
    // Le contour de la tête (échantillonné) tombe sur le bord du disque, à 1 % près (perspective hors axe).
    expect(apparentRadius(pose, viewport, HEAD, RADIUS) / disk.r1).toBeCloseTo(1, 1)
  })

  it('looks straight down, with the heading at the top of the image', () => {
    const viewport = { width: 1440, height: 900 }
    const pose = diveLanding({
      head: HEAD,
      radius: RADIUS,
      heading: { x: 0, z: -2 },
      target: centeredLanding(viewport),
      viewport,
      fovY: FOV
    })
    expect(pose.position.x).toBeCloseTo(pose.look.x, 9)
    expect(pose.position.z).toBeCloseTo(pose.look.z, 9)
    expect(pose.up).toEqual({ x: 0, y: 0, z: -1 })
    const ahead = projectToScreen(pose, FOV, viewport, { ...HEAD, z: HEAD.z - 1 })
    const behind = projectToScreen(pose, FOV, viewport, { ...HEAD, z: HEAD.z + 1 })
    expect(ahead.y).toBeLessThan(behind.y)
    expect(projectToScreen(pose, FOV, viewport, HEAD).x).toBeCloseTo(720, 6)
  })

  it('takes its heading from the gaze, with a fallback when it is already vertical', () => {
    expect(diveHeading({ position: { x: 0, y: 10, z: 20 }, look: { x: 0, y: 0, z: 0 } }, { x: 1, z: 0 })).toEqual({
      x: 0,
      z: -20
    })
    expect(diveHeading({ position: { x: 0, y: 10, z: 0 }, look: { x: 0, y: 0, z: 0 } }, { x: 1, z: 0 })).toEqual({
      x: 1,
      z: 0
    })
  })

  it('swings over the flower from the chase camera to the landing pose', () => {
    const viewport = { width: 1440, height: 900 }
    const from = { position: { x: 15, y: 18, z: 4 }, look: { x: 12, y: 5, z: -14 } }
    const to = diveLanding({
      head: HEAD,
      radius: RADIUS,
      heading: diveHeading(from, { x: 0, z: -1 }),
      target: landingOnSunburst(viewport),
      viewport,
      fovY: FOV
    })
    const start = divePose(from, to, HEAD, 0)
    const end = divePose(from, to, HEAD, 1)
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(start.position[axis]).toBeCloseTo(from.position[axis], 9)
      expect(end.position[axis]).toBeCloseTo(to.position[axis], 9)
      expect(end.look[axis]).toBeCloseTo(to.look[axis], 9)
    }
    // À mi-course la caméra est au-dessus de la fleur, jamais plus près qu'au départ ou à l'arrivée.
    const middle = divePose(from, to, HEAD, 0.5)
    const distance = (p: Vec3) => Math.hypot(p.x - HEAD.x, p.y - HEAD.y, p.z - HEAD.z)
    expect(middle.position.y).toBeGreaterThan(from.position.y)
    expect(distance(middle.position)).toBeGreaterThan(Math.min(distance(from.position), distance(to.position)) - 1e-9)
  })

  it('veils the garden only at the end, to the opacity of the area page backdrop', () => {
    expect(diveFade(0.4)).toBe(0)
    expect(diveFade(0.75)).toBeGreaterThan(0)
    expect(diveFade(1)).toBe(EXIT_VEIL_OPACITY)
    expect(diveProgress(DIVE_DURATION_MS * 2)).toBe(1)
  })

  it('grows the flower', () => {
    expect(diveFlowerScale(0)).toBe(1)
    expect(diveFlowerScale(1)).toBeCloseTo(DIVE_MAX_SCALE, 6)
    expect(lerpVec({ x: 0, y: 0, z: 0 }, { x: 2, y: 4, z: 6 }, 0.5)).toEqual({ x: 1, y: 2, z: 3 })
  })
})
