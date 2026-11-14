import { describe, expect, it } from 'vitest'

import { createVehicleState, NO_INPUT, resolveCollisions, stepVehicle, VEHICLE_PARAMS } from './vehicle'

const BOUNDS = { x0: -100, x1: 100, z0: -100, z1: 100 }

describe('stepVehicle', () => {
  it('moves forward towards -Z when heading is 0', () => {
    const s = createVehicleState(0, 0, 0)
    for (let i = 0; i < 60; i++) stepVehicle(s, { ...NO_INPUT, up: true }, 1 / 60, VEHICLE_PARAMS.car)
    expect(s.z).toBeLessThan(-5)
    expect(Math.abs(s.x)).toBeLessThan(1e-6)
  })

  it('never exceeds the max speed (boost included)', () => {
    const s = createVehicleState(0, 0, 0)
    for (let i = 0; i < 600; i++) stepVehicle(s, { ...NO_INPUT, up: true, boost: true }, 1 / 60, VEHICLE_PARAMS.car)
    expect(s.speed).toBeLessThanOrEqual(VEHICLE_PARAMS.car.maxSpeed * 1.4 + 1e-9)
  })

  it('slows down to a stop without input', () => {
    const s = createVehicleState(0, 0, 0)
    s.speed = 10
    for (let i = 0; i < 600; i++) stepVehicle(s, NO_INPUT, 1 / 60, VEHICLE_PARAMS.horse)
    expect(Math.abs(s.speed)).toBeLessThan(0.01)
  })
})

describe('resolveCollisions', () => {
  it('pushes the vehicle out of a circle', () => {
    const s = createVehicleState(0.5, 0, 0)
    expect(resolveCollisions(s, [{ kind: 'circle', x: 0, z: 0, r: 1 }], BOUNDS, 1.6)).toBe(true)
    expect(Math.hypot(s.x, s.z)).toBeCloseTo(2.6, 5)
  })

  it('pushes the vehicle out of a box', () => {
    const s = createVehicleState(0, 1, 0)
    resolveCollisions(s, [{ kind: 'box', x: 0, z: 0, rot: 0, hw: 4, hd: 0.5 }], BOUNDS, 1.6)
    expect(s.z).toBeCloseTo(2.1, 5)
  })

  it('keeps the vehicle inside the bounds', () => {
    const s = createVehicleState(150, -150, 0)
    resolveCollisions(s, [], BOUNDS)
    expect(s.x).toBe(100)
    expect(s.z).toBe(-100)
  })
})
