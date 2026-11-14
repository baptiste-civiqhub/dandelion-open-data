import { describe, expect, it } from 'vitest'

import {
  applyOrbit,
  blendIntro,
  createOrbit,
  dragOrbit,
  fogForDistance,
  fromSpherical,
  INTRO,
  introWeight,
  lookAhead,
  ORBIT,
  relaxOrbit,
  resetOrbit,
  toSpherical,
  zoomOrbit,
  zoomOrbitBySteps,
  type CameraPose,
  type Orbit
} from './camera-rig'

const CHASE_OFFSET = { x: 7, y: 21, z: 27 }
const close = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6)
  expect(a.y).toBeCloseTo(b.y, 6)
  expect(a.z).toBeCloseTo(b.z, 6)
}

describe('toSpherical / fromSpherical', () => {
  it('round-trips a vector', () => {
    close(fromSpherical(toSpherical(CHASE_OFFSET)), CHASE_OFFSET)
  })

  it('handles the zero vector', () => {
    expect(toSpherical({ x: 0, y: 0, z: 0 })).toEqual({ r: 0, phi: 0, theta: 0 })
  })
})

describe('applyOrbit', () => {
  it('leaves the chase offset unchanged with a fresh orbit', () => {
    close(applyOrbit(CHASE_OFFSET, createOrbit()), CHASE_OFFSET)
  })

  it('scales the distance with the zoom', () => {
    const zoomed = applyOrbit(CHASE_OFFSET, { ...createOrbit(), zoom: 2 })
    expect(Math.hypot(zoomed.x, zoomed.y, zoomed.z)).toBeCloseTo(2 * Math.hypot(7, 21, 27), 6)
  })

  it('never goes under the ground nor straight overhead', () => {
    for (const pitch of [-5, 5]) {
      const { phi } = toSpherical(applyOrbit(CHASE_OFFSET, { ...createOrbit(), pitch }))
      expect(phi).toBeGreaterThanOrEqual(ORBIT.minPhi - 1e-9)
      expect(phi).toBeLessThanOrEqual(ORBIT.maxPhi + 1e-9)
    }
  })
})

describe('dragOrbit / zoomOrbit', () => {
  it('turns with a horizontal drag and marks a gesture', () => {
    const o = dragOrbit(createOrbit(), 100, 0)
    expect(o.yaw).toBeCloseTo(-100 * ORBIT.yawPerPixel)
    expect(o.idle).toBe(0)
  })

  it('clamps the zoom', () => {
    expect(zoomOrbit(createOrbit(), 1e6).zoom).toBe(ORBIT.maxZoom)
    expect(zoomOrbit(createOrbit(), -1e6).zoom).toBe(ORBIT.minZoom)
  })

  it('zooms in with negative key steps', () => {
    expect(zoomOrbitBySteps(createOrbit(), -1).zoom).toBeLessThan(1)
    expect(zoomOrbitBySteps(createOrbit(), 1).zoom).toBeGreaterThan(1)
  })

  it('resets to the chase camera', () => {
    expect(resetOrbit()).toMatchObject({ yaw: 0, pitch: 0, zoom: 1, idle: 0 })
  })
})

describe('lookAhead', () => {
  it('looks ahead of the vehicle with the chase camera', () => {
    expect(lookAhead(createOrbit())).toBe(1)
  })

  it('pivots around the vehicle when the user turns the camera', () => {
    expect(lookAhead({ ...createOrbit(), yaw: 1 })).toBe(0)
    expect(lookAhead({ ...createOrbit(), yaw: 2 * Math.PI })).toBeCloseTo(1)
  })

  it('pivots around the vehicle when fully zoomed in', () => {
    expect(lookAhead({ ...createOrbit(), zoom: ORBIT.minZoom })).toBe(0)
    expect(lookAhead({ ...createOrbit(), zoom: ORBIT.maxZoom })).toBe(1)
  })
})

describe('relaxOrbit', () => {
  const turned = { ...createOrbit(), yaw: 1.2, idle: 0 }

  it('keeps the user angle while parked', () => {
    expect(relaxOrbit(turned, 5, false).yaw).toBe(1.2)
  })

  it('keeps the user angle right after a gesture, even when driving', () => {
    expect(relaxOrbit(turned, 0.5, true).yaw).toBe(1.2)
  })

  it('brings the camera back behind the vehicle when driving after the delay', () => {
    let o: Orbit = { ...turned, idle: ORBIT.recenterDelay }
    for (let i = 0; i < 300; i++) o = relaxOrbit(o, 1 / 60, true)
    expect(Math.abs(o.yaw)).toBeLessThan(0.02)
    expect(o.pitch).toBe(0)
    expect(o.zoom).toBe(1)
  })
})

describe('introWeight', () => {
  it('holds the wide shot, then reaches the chase camera', () => {
    expect(introWeight(0)).toBe(1)
    expect(introWeight(INTRO.holdMs)).toBe(1)
    expect(introWeight(INTRO.durationMs)).toBe(0)
    expect(introWeight(INTRO.durationMs * 3)).toBe(0)
  })

  it('decreases over time', () => {
    const mid = (INTRO.holdMs + INTRO.durationMs) / 2
    expect(introWeight(mid)).toBeGreaterThan(0)
    expect(introWeight(mid)).toBeLessThan(1)
    expect(introWeight(mid + 500)).toBeLessThan(introWeight(mid))
  })
})

describe('blendIntro', () => {
  const chase: CameraPose = { position: { x: 7, y: 21, z: 77 }, look: { x: 0, y: 0, z: 50 } }

  it('returns the chase camera when the weight is 0', () => {
    expect(blendIntro(chase, INTRO.durationMs, 0)).toBe(chase)
  })

  it('frames the whole garden from afar when the weight is 1', () => {
    const pose = blendIntro(chase, 0, 1)
    close(pose.look, INTRO.center)
    const d = Math.hypot(pose.position.x - pose.look.x, pose.position.y - pose.look.y, pose.position.z - pose.look.z)
    expect(d).toBeCloseTo(INTRO.radius, 6)
    expect(pose.position.y).toBeGreaterThan(100)
  })

  it('stays between the two distances halfway', () => {
    const pose = blendIntro(chase, 3000, 0.5)
    const d = Math.hypot(pose.position.x - pose.look.x, pose.position.y - pose.look.y, pose.position.z - pose.look.z)
    expect(d).toBeGreaterThan(Math.hypot(7, 21, 27))
    expect(d).toBeLessThan(INTRO.radius)
  })
})

describe('fogForDistance', () => {
  it('keeps the regular fog close to the vehicle', () => {
    expect(fogForDistance(35)).toEqual({ near: 130, far: 300, cameraFar: 600 })
  })

  it('pushes the fog and the far plane away for the wide shot', () => {
    const fog = fogForDistance(INTRO.radius)
    expect(fog.near).toBeGreaterThan(INTRO.radius)
    expect(fog.cameraFar).toBeGreaterThan(fog.far)
  })
})
