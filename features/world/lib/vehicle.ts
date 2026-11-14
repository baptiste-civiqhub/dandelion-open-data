/** Physique arcade du véhicule (voiture ou cheval) et collisions au sol. Pur : aucun moteur 3D, aucun DOM. */
export type VehicleKind = 'car' | 'horse'

export type VehicleParams = { acceleration: number; maxSpeed: number; turn: number }

export const VEHICLE_PARAMS: Record<VehicleKind, VehicleParams> = {
  car: { acceleration: 26, maxSpeed: 17, turn: 0.2 },
  horse: { acceleration: 22, maxSpeed: 14, turn: 0.3 }
}

export type VehicleInput = { up: boolean; down: boolean; left: boolean; right: boolean; boost: boolean; brake: boolean }

export const NO_INPUT: VehicleInput = { up: false, down: false, left: false, right: false, boost: false, brake: false }

/** `heading` : 0 = vers -Z (le nord du monde), sens trigonométrique. Avance = (-sin h, -cos h). */
export type VehicleState = {
  x: number
  z: number
  heading: number
  speed: number
  steer: number
  pitch: number
  roll: number
  prevSpeed: number
  distance: number
  gait: number
}

export function createVehicleState(x: number, z: number, heading: number): VehicleState {
  return { x, z, heading, speed: 0, steer: 0, pitch: 0, roll: 0, prevSpeed: 0, distance: 0, gait: 0 }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Avance d'un pas `dt` (secondes). Modifie et rend `state`. */
export function stepVehicle(state: VehicleState, input: VehicleInput, dt: number, params: VehicleParams): VehicleState {
  const boost = input.boost ? 1.4 : 1
  if (input.up) state.speed += params.acceleration * boost * dt
  if (input.down) state.speed -= (state.speed > 0.5 ? 40 : 16) * dt
  if (input.brake) state.speed *= Math.pow(0.04, dt)
  if (!input.up && !input.down) state.speed *= Math.pow(0.35, dt)
  state.speed = clamp(state.speed, -7, params.maxSpeed * boost)
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0)
  state.steer = lerp(state.steer, steerInput * 0.62, 1 - Math.exp(-10 * dt))
  state.heading += (state.steer * state.speed * dt * params.turn) / (1 + Math.abs(state.speed) * 0.025)
  state.x += -Math.sin(state.heading) * state.speed * dt
  state.z += -Math.cos(state.heading) * state.speed * dt
  const acceleration = (state.speed - state.prevSpeed) / Math.max(dt, 1e-3)
  state.prevSpeed = state.speed
  state.pitch = lerp(state.pitch, clamp(acceleration * 0.006, -0.09, 0.09), 1 - Math.exp(-6 * dt))
  state.roll = lerp(state.roll, clamp(-state.steer * state.speed * 0.012, -0.12, 0.12), 1 - Math.exp(-6 * dt))
  state.distance += state.speed * dt
  state.gait += state.speed * dt * 1.9
  return state
}

export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'box'; x: number; z: number; rot: number; hw: number; hd: number }

export type Bounds = { x0: number; x1: number; z0: number; z1: number }

/** Repousse le véhicule hors des obstacles et du cadre. Rend `true` s'il a touché (la vitesse est alors amortie). */
export function resolveCollisions(
  state: VehicleState,
  colliders: readonly Collider[],
  bounds: Bounds,
  radius = 1.6
): boolean {
  let hit = false
  for (const c of colliders) {
    if (c.kind === 'circle') {
      const dx = state.x - c.x
      const dz = state.z - c.z
      const d = Math.hypot(dx, dz)
      if (d < radius + c.r && d > 1e-4) {
        const k = (radius + c.r - d) / d
        state.x += dx * k
        state.z += dz * k
        hit = true
      }
      continue
    }
    const dx = state.x - c.x
    const dz = state.z - c.z
    const co = Math.cos(c.rot)
    const si = Math.sin(c.rot)
    const lx = dx * co - dz * si
    const lz = dx * si + dz * co
    const ox = lx - clamp(lx, -c.hw, c.hw)
    const oz = lz - clamp(lz, -c.hd, c.hd)
    const d = Math.hypot(ox, oz)
    if (d >= radius) continue
    let nx: number
    let nz: number
    let pen: number
    if (d > 1e-4) {
      nx = ox / d
      nz = oz / d
      pen = radius - d
    } else {
      const px = c.hw - Math.abs(lx)
      const pz = c.hd - Math.abs(lz)
      if (px < pz) {
        nx = Math.sign(lx) || 1
        nz = 0
        pen = px + radius
      } else {
        nx = 0
        nz = Math.sign(lz) || 1
        pen = pz + radius
      }
    }
    state.x += (nx * co + nz * si) * pen
    state.z += (-nx * si + nz * co) * pen
    hit = true
  }
  const x = clamp(state.x, bounds.x0, bounds.x1)
  const z = clamp(state.z, bounds.z0, bounds.z1)
  if (x !== state.x || z !== state.z) {
    state.x = x
    state.z = z
    hit = true
  }
  if (hit) state.speed *= 0.55
  return hit
}
