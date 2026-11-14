import type { Group, Material, Mesh, MeshBasicMaterial } from 'three'

import type { WorldZone } from '../lib/world-zones'
import { addInstanced, addMesh, canvasTexture, lambert, placeInstance, type WorldKit } from './world-kit'

/** Ce que la scène anime sur chaque zone : la tête de la fleur (balancement, plongée) et l'anneau de focus. */
export type ZoneVisual = {
  zone: WorldZone
  head: Group
  headY: number
  /** Rayon de la tête au repos (aigrette ou corolle), pour que la caméra s'arrête au-dessus. */
  headRadius: number
  ring: MeshBasicMaterial
  phase: number
}

const TAU = Math.PI * 2

/**
 * Une zone = une clairière ronde (rayon de déclenchement) et un pissenlit au centre. Zone avec données : fleur en
 * graines (aigrette), haute. Zone de démonstration, sans données : fleur jaune, plus basse, anneau en pointillés.
 * La différence ne tient donc jamais à la seule couleur. Une plaque porte le nom de la zone.
 */
export function buildZones(kit: WorldKit, zones: readonly WorldZone[]): ZoneVisual[] {
  const { THREE } = kit
  return zones.map((zone, index) => {
    const accent = zone.hasData ? 'brand' : 'muted-foreground'
    addMesh(
      kit,
      new THREE.CylinderGeometry(zone.radius + 0.35, zone.radius + 0.35, 0.08, 64),
      lambert(kit, 'white'),
      zone.x,
      0.04,
      zone.z,
      false
    )
    addMesh(
      kit,
      new THREE.CylinderGeometry(zone.radius, zone.radius, 0.1, 64),
      lambert(kit, 'lawn'),
      zone.x,
      0.06,
      zone.z,
      false
    )
    const ring = new THREE.MeshBasicMaterial({
      color: kit.color(accent),
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    })
    if (zone.hasData) {
      addMesh(
        kit,
        new THREE.RingGeometry(zone.radius - 0.6, zone.radius - 0.2, 72).rotateX(-Math.PI / 2),
        ring,
        zone.x,
        0.13,
        zone.z,
        false
      )
    } else {
      const dashes = 20
      const dash = new THREE.BoxGeometry(0.4, 0.02, ((zone.radius - 0.4) * TAU) / dashes / 1.9)
      const im = addInstanced(kit, dash, ring, dashes, false)
      for (let k = 0; k < dashes; k++) {
        const a = (k / dashes) * TAU
        placeInstance(
          kit,
          im,
          k,
          zone.x + Math.cos(a) * (zone.radius - 0.4),
          0.13,
          zone.z - Math.sin(a) * (zone.radius - 0.4),
          -a + Math.PI / 2
        )
      }
    }
    const group = new THREE.Group()
    group.position.set(zone.x, 0, zone.z)
    kit.scene.add(group)
    addMesh(kit, new THREE.CylinderGeometry(1.2, 1.3, 0.3, 32), lambert(kit, 'white'), 0, 0.15, 0, true, group)
    addMesh(kit, new THREE.CylinderGeometry(0.5, 0.6, 0.4, 20), lambert(kit, accent), 0, 0.3, 0, true, group)
    const stemH = zone.hasData ? 7.4 : 4.6
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(0.25, stemH * 0.35, 0.1),
      new THREE.Vector3(-0.15, stemH * 0.7, 0),
      new THREE.Vector3(0.1, stemH, 0)
    ])
    addMesh(
      kit,
      new THREE.TubeGeometry(curve, 24, zone.hasData ? 0.12 : 0.1, 8),
      lambert(kit, 'stem'),
      0,
      0,
      0,
      true,
      group
    )
    const head = new THREE.Group()
    head.position.set(0.1, stemH + 0.15, 0)
    group.add(head)
    if (zone.hasData) buildPuff(kit, head)
    else buildBlossom(kit, head, group)
    buildPlaque(kit, zone, accent)
    kit.colliders.push({ kind: 'circle', x: zone.x, z: zone.z, r: 1.1 })
    return { zone, head, headY: stemH + 0.15, headRadius: zone.hasData ? 2.5 : 1.1, ring, phase: index * 1.7 }
  })
}

/** Aigrette : sphère centrale, rayons et graines en spirale de Fibonacci. */
function buildPuff(kit: WorldKit, head: Group) {
  const { THREE } = kit
  addMesh(kit, new THREE.SphereGeometry(0.42, 16, 12), lambert(kit, 'puff-core'), 0, 0, 0, true, head)
  const N = 170
  const R = 2.4
  const rayGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 4)
  rayGeo.translate(0, 0.5, 0)
  const rays = new THREE.InstancedMesh(rayGeo, lambert(kit, 'white'), N)
  const tips = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), lambert(kit, 'white'), N)
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < N; i++) {
    const yy = 1 - ((i + 0.5) / N) * 1.75
    const r = Math.sqrt(Math.max(0, 1 - yy * yy))
    const th = i * 2.399963
    const dir = new THREE.Vector3(Math.cos(th) * r, yy, Math.sin(th) * r).normalize()
    q.setFromUnitVectors(up, dir)
    m.compose(new THREE.Vector3(), q, new THREE.Vector3(1, R, 1))
    rays.setMatrixAt(i, m)
    m.compose(dir.clone().multiplyScalar(R), q, new THREE.Vector3(1, 1, 1))
    tips.setMatrixAt(i, m)
  }
  rays.castShadow = tips.castShadow = true
  head.add(rays, tips)
}

/** Fleur jaune : cœur, deux couronnes de pétales légèrement relevés, trois feuilles au pied. */
function buildBlossom(kit: WorldKit, head: Group, group: Group) {
  const { THREE } = kit
  addMesh(kit, new THREE.CylinderGeometry(0.46, 0.4, 0.26, 20), lambert(kit, 'petal-core'), 0, 0.05, 0, true, head)
  const petal = new THREE.BoxGeometry(0.2, 0.05, 0.95)
  petal.translate(0, 0, 0.5)
  const petals = new THREE.InstancedMesh(petal, lambert(kit, 'brand-gradient-to'), 30)
  const tmp = new THREE.Object3D()
  for (let i = 0; i < 30; i++) {
    const inner = i >= 18
    const a = (i / (inner ? 12 : 18)) * TAU + (inner ? 0.13 : 0)
    tmp.position.set(0, inner ? 0.12 : 0.02, 0)
    tmp.rotation.set(0, a, 0, 'YXZ')
    tmp.rotateX(inner ? -0.55 : -0.2)
    tmp.scale.setScalar(inner ? 0.7 : 1)
    tmp.updateMatrix()
    petals.setMatrixAt(i, tmp.matrix)
  }
  petals.castShadow = true
  head.add(petals)
  for (let k = 0; k < 3; k++) {
    const leaf = addMesh(kit, new THREE.SphereGeometry(0.5, 10, 8), lambert(kit, 'stem'), 0, 0.35, 0, true, group)
    leaf.scale.set(0.35, 0.12, 1.6)
    leaf.rotation.y = (k / 3) * TAU
    leaf.translateZ(0.9)
  }
}

/** Plaque au bord de la clairière, côté sud (face à la caméra au départ) : le nom de la zone. */
function buildPlaque(kit: WorldKit, zone: WorldZone, accent: 'brand' | 'muted-foreground') {
  const { THREE } = kit
  const texture = canvasTexture(kit, 640, 150, (c) => {
    c.fillStyle = kit.color('white')
    c.fillRect(0, 0, 640, 150)
    c.fillStyle = kit.color(accent)
    c.fillRect(0, 0, 640, 12)
    c.fillStyle = kit.color('foreground')
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const words = zone.name.split(/\s+/)
    let size = 52
    let lines: string[] = [zone.name]
    for (; size >= 26; size -= 2) {
      c.font = `700 ${size}px ${kit.fontFamily}`
      lines = []
      let line = ''
      for (const w of words) {
        const next = line ? `${line} ${w}` : w
        if (c.measureText(next).width > 600 && line) {
          lines.push(line)
          line = w
        } else line = next
      }
      lines.push(line)
      if (lines.length <= 2 && lines.every((l) => c.measureText(l).width <= 610)) break
    }
    lines.slice(0, 2).forEach((l, i, all) => c.fillText(l, 320, 81 + (i - (all.length - 1) / 2) * size * 1.1))
  })
  const plaque = new THREE.Group()
  plaque.position.set(zone.x, 0, zone.z + zone.radius - 0.9)
  kit.scene.add(plaque)
  const post: Material = lambert(kit, 'post')
  addMesh(kit, new THREE.BoxGeometry(0.12, 1.2, 0.12), post, -1.75, 0.6, 0, true, plaque)
  addMesh(kit, new THREE.BoxGeometry(0.12, 1.2, 0.12), post, 1.75, 0.6, 0, true, plaque)
  addMesh(kit, new THREE.BoxGeometry(4.8, 1.25, 0.1), lambert(kit, 'white'), 0, 1.45, 0, true, plaque)
  const sign: Mesh = addMesh(
    kit,
    new THREE.PlaneGeometry(4.6, 1.08),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    0,
    1.45,
    0.06,
    false,
    plaque
  )
  sign.receiveShadow = false
}
