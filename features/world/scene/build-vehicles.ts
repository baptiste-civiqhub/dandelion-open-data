import type { Group } from 'three'

import type { VehicleKind, VehicleState } from '../lib/vehicle'
import { addMesh, canvasTexture, lambert, type WorldKit } from './world-kit'

export type VehicleRig = {
  setKind: (kind: VehicleKind) => void
  /** Pose la voiture ou le cheval sur l'état calculé par `stepVehicle` (roues, suspension, foulée). */
  pose: (state: VehicleState, dt: number) => void
}

/** Petite voiture de maquette et cheval, au choix (touche V). */
export function buildVehicles(kit: WorldKit): VehicleRig {
  const { THREE } = kit
  const car = new THREE.Group()
  const body = new THREE.Group()
  car.add(body)
  const paint = lambert(kit, 'primary')
  const dark = lambert(kit, 'car-dark')
  addMesh(kit, new kit.RoundedBox(2.3, 0.8, 4.2, 3, 0.28), paint, 0, 1.0, 0, true, body)
  addMesh(kit, new kit.RoundedBox(2.0, 0.85, 2.2, 3, 0.25), paint, 0, 1.75, 0.35, true, body)
  addMesh(kit, new kit.RoundedBox(2.06, 0.5, 1.9, 2, 0.15), lambert(kit, 'car-glass'), 0, 1.82, 0.35, false, body)
  addMesh(kit, new kit.RoundedBox(1.9, 0.12, 1.8, 2, 0.05), dark, 0, 2.25, 0.35, true, body)
  for (const x of [-0.7, 0, 0.7]) addMesh(kit, new THREE.BoxGeometry(0.08, 0.16, 1.9), dark, x, 2.36, 0.35, true, body)
  addMesh(kit, new kit.RoundedBox(2.4, 0.35, 0.5, 2, 0.12), dark, 0, 0.75, -2.15, true, body)
  addMesh(kit, new kit.RoundedBox(2.4, 0.35, 0.5, 2, 0.12), dark, 0, 0.75, 2.15, true, body)
  for (const x of [-0.75, 0.75]) {
    addMesh(
      kit,
      new kit.RoundedBox(0.5, 0.22, 0.1, 2, 0.05),
      new THREE.MeshBasicMaterial({ color: kit.color('car-light') }),
      x,
      1.08,
      -2.12,
      false,
      body
    )
    addMesh(
      kit,
      new kit.RoundedBox(0.45, 0.2, 0.1, 2, 0.05),
      new THREE.MeshBasicMaterial({ color: kit.color('car-tail') }),
      x,
      1.08,
      2.12,
      false,
      body
    )
  }
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(kit, 256, 256, (c) => {
        c.strokeStyle = kit.color('car-dark')
        c.fillStyle = kit.color('car-dark')
        c.lineWidth = 8
        c.lineCap = 'round'
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2
          c.beginPath()
          c.moveTo(128, 128)
          c.lineTo(128 + Math.cos(a) * 90, 128 + Math.sin(a) * 90)
          c.stroke()
        }
        c.beginPath()
        c.arc(128, 128, 22, 0, 7)
        c.fill()
      }),
      transparent: true,
      opacity: 0.75
    })
  )
  decal.rotation.x = -Math.PI / 2
  decal.position.set(0, 1.41, -1.3)
  body.add(decal)
  const tire = new THREE.CylinderGeometry(0.58, 0.58, 0.5, 18)
  tire.rotateZ(Math.PI / 2)
  const rim = new THREE.CylinderGeometry(0.3, 0.3, 0.52, 12)
  rim.rotateZ(Math.PI / 2)
  const wheels: { pivot: Group; spin: Group; front: boolean }[] = []
  for (const [x, z, front] of [
    [-1.15, -1.35, true],
    [1.15, -1.35, true],
    [-1.15, 1.45, false],
    [1.15, 1.45, false]
  ] as const) {
    const pivot = new THREE.Group()
    pivot.position.set(x, 0.58, z)
    const spin = new THREE.Group()
    pivot.add(spin)
    addMesh(kit, tire, dark, 0, 0, 0, true, spin)
    addMesh(kit, rim, lambert(kit, 'brand'), 0, 0, 0, true, spin)
    car.add(pivot)
    wheels.push({ pivot, spin, front })
  }
  kit.scene.add(car)

  const horse = new THREE.Group()
  const hBody = new THREE.Group()
  horse.add(hBody)
  const coat = lambert(kit, 'horse')
  const mane = lambert(kit, 'horse-mane')
  addMesh(kit, new kit.RoundedBox(1.25, 1.15, 2.7, 3, 0.45), coat, 0, 2.05, 0, true, hBody)
  addMesh(kit, new kit.RoundedBox(0.62, 1.5, 0.75, 2, 0.25), coat, 0, 2.85, -1.25, true, hBody).rotation.x = -0.55
  addMesh(kit, new kit.RoundedBox(0.55, 0.6, 1.15, 2, 0.22), coat, 0, 3.45, -1.95, true, hBody).rotation.x = 0.35
  addMesh(kit, new kit.RoundedBox(0.5, 0.42, 0.4, 2, 0.15), lambert(kit, 'stone-warm'), 0, 3.18, -2.42, true, hBody)
  for (const sx of [-0.17, 0.17]) addMesh(kit, new THREE.ConeGeometry(0.09, 0.32, 4), coat, sx, 3.85, -1.7, true, hBody)
  addMesh(kit, new kit.RoundedBox(0.16, 1.35, 0.5, 2, 0.06), mane, 0, 3.0, -1.05, true, hBody).rotation.x = -0.55
  addMesh(kit, new THREE.ConeGeometry(0.22, 1.3, 6), mane, 0, 1.75, 1.6, true, hBody).rotation.x = 0.5
  addMesh(kit, new kit.RoundedBox(1.32, 0.22, 1.1, 2, 0.08), lambert(kit, 'primary'), 0, 2.68, 0.1, true, hBody)
  addMesh(kit, new kit.RoundedBox(1.36, 0.08, 1.2, 2, 0.03), lambert(kit, 'brand'), 0, 2.58, 0.1, true, hBody)
  const legGeo = new kit.RoundedBox(0.28, 1.55, 0.3, 2, 0.1)
  legGeo.translate(0, -0.78, 0)
  const hoofGeo = new kit.RoundedBox(0.32, 0.2, 0.36, 2, 0.06)
  hoofGeo.translate(0, -1.6, 0)
  const legs: { pivot: Group; ph: number }[] = []
  for (const [x, z, ph] of [
    [-0.42, -0.95, 0],
    [0.42, -0.95, Math.PI],
    [-0.42, 1.0, Math.PI],
    [0.42, 1.0, 0]
  ] as const) {
    const pivot = new THREE.Group()
    pivot.position.set(x, 1.7, z)
    addMesh(kit, legGeo, coat, 0, 0, 0, true, pivot)
    addMesh(kit, hoofGeo, lambert(kit, 'horse-dark'), 0, 0, 0, true, pivot)
    hBody.add(pivot)
    legs.push({ pivot, ph })
  }
  horse.visible = false
  kit.scene.add(horse)

  let kind: VehicleKind = 'car'
  return {
    setKind(next) {
      kind = next
      car.visible = next === 'car'
      horse.visible = next === 'horse'
    },
    pose(state, dt) {
      const rig = kind === 'horse' ? horse : car
      rig.position.set(state.x, 0, state.z)
      rig.rotation.y = state.heading
      if (kind === 'horse') {
        const amp = Math.min(Math.abs(state.speed) / 6, 1)
        for (const l of legs) l.pivot.rotation.x = Math.sin(state.gait + l.ph) * 0.65 * amp
        hBody.position.y = Math.abs(Math.sin(state.gait)) * 0.14 * amp
        hBody.rotation.set(state.pitch * 0.5 + Math.sin(state.gait * 2) * 0.02 * amp, 0, state.roll * 0.6)
      } else {
        body.rotation.set(state.pitch, 0, state.roll)
        body.position.y = Math.abs(Math.sin(state.distance * 1.7)) * Math.min(Math.abs(state.speed) / 17, 1) * 0.05
        for (const w of wheels) {
          w.spin.rotation.x -= (state.speed * dt) / 0.58
          if (w.front) w.pivot.rotation.y = state.steer * 0.7
        }
      }
    }
  }
}
