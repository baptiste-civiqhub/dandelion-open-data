import type { BufferGeometry, Group, Mesh, MeshBasicMaterial, Quaternion, Shape, Vector2 } from 'three'

import {
  arcsAroundAxes,
  GARDEN,
  layoutChairs,
  layoutClippedTrees,
  layoutLamps,
  layoutStatues,
  layoutTrees,
  layoutWalkerPaths,
  PIGEON_HOMES,
  plazaBalustrades,
  pointOnCircle,
  type OrientedSpot,
  type Spot
} from '../lib/garden-layout'
import { WORLD_COLOR_SETS, type WorldColorName } from '../lib/world-colors'
import type { WorldZone } from '../lib/world-zones'
import {
  addInstanced,
  addMesh,
  addSlab,
  canvasTexture,
  lambert,
  pick,
  placeInstance,
  radialTexture,
  roundedRectShape,
  shimmerTexture,
  type WorldKit
} from './world-kit'

/** Ce que le jardin doit savoir du joueur et de la caméra à chaque image. */
export type PlayerView = { x: number; z: number; speed: number; heading: number }
export type GardenAnimator = {
  update: (
    dt: number,
    t: number,
    player: PlayerView,
    look: { x: number; z: number },
    cameraQuaternion: Quaternion
  ) => void
}

type Tree = { x: number; z: number; crownY: number; crownR: number }
type JetEmitter = {
  x: number
  z: number
  y0: number
  vy: [number, number]
  spread: [number, number]
  floor: number
  n: number
}

const G = GARDEN
const TAU = Math.PI * 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Le plan peint au sol (sert aussi de vue d'avion). */
const PLAN = { x0: -126, x1: 126, z0: -142, z1: 160 }

/**
 * Construit tout le décor du jardin du Luxembourg autour des zones et rend l'animateur des éléments vivants : jets
 * d'eau, voiliers, feuilles qui tombent, promeneurs, pigeons, graines de pissenlit.
 */
export function buildGarden(kit: WorldKit, zones: readonly WorldZone[]): GardenAnimator {
  const { THREE, rnd } = kit
  const trees: Tree[] = []
  const jets: JetEmitter[] = []
  const shimmers: { material: MeshBasicMaterial; sx: number; sy: number }[] = []
  const cascades: MeshBasicMaterial[] = []
  const stone = lambert(kit, 'stone')
  const circle = (x: number, z: number, r: number) => kit.colliders.push({ kind: 'circle', x, z, r })
  const box = (x: number, z: number, rot: number, hw: number, hd: number) =>
    kit.colliders.push({ kind: 'box', x, z, rot, hw, hd })

  /* ---------- sol peint et socle de maquette */
  {
    const W = PLAN.x1 - PLAN.x0
    const H = PLAN.z1 - PLAN.z0
    const S = 4096 / H
    const X = (x: number) => (x - PLAN.x0) * S
    const Y = (z: number) => (z - PLAN.z0) * S
    const tex = canvasTexture(kit, Math.round(W * S), 4096, (c) => {
      const fill = (name: WorldColorName | 'white') => (c.fillStyle = kit.color(name))
      const rect = (x0: number, z0: number, x1: number, z1: number, name: WorldColorName | 'white', r = 0) => {
        fill(name)
        c.beginPath()
        c.roundRect(X(Math.min(x0, x1)), Y(Math.min(z0, z1)), Math.abs(x1 - x0) * S, Math.abs(z1 - z0) * S, r * S)
        c.fill()
      }
      const disc = (x: number, z: number, r: number, name: WorldColorName | 'white') => {
        fill(name)
        c.beginPath()
        c.arc(X(x), Y(z), r * S, 0, TAU)
        c.fill()
      }
      const allee = (x0: number, z0: number, x1: number, z1: number, w: number) => {
        rect(
          x0 - (x0 === x1 ? w / 2 + 0.5 : 0),
          z0 - (z0 === z1 ? w / 2 + 0.5 : 0),
          x1 + (x0 === x1 ? w / 2 + 0.5 : 0),
          z1 + (z0 === z1 ? w / 2 + 0.5 : 0),
          'white'
        )
        rect(
          x0 - (x0 === x1 ? w / 2 : 0),
          z0 - (z0 === z1 ? w / 2 : 0),
          x1 + (x0 === x1 ? w / 2 : 0),
          z1 + (z0 === z1 ? w / 2 : 0),
          'gravel'
        )
      }
      fill('ground')
      c.fillRect(0, 0, c.canvas.width, c.canvas.height)
      rect(-120, -136, 120, 156, 'sand', 3)
      // place du Grand Bassin et palais
      rect(-44.6, -134, 44.6, -55.4, 'white', 2.5)
      rect(-44, -134, 44, -56, 'gravel', 2)
      // parterre circulaire : allée, balustrade, gravier, plan de l'atlas tracé au sol
      disc(0, 0, G.alleeRadius + G.alleeWidth / 2 + 0.5, 'white')
      disc(0, 0, G.alleeRadius + G.alleeWidth / 2, 'gravel')
      disc(0, 0, G.alleeRadius - G.alleeWidth / 2, 'white')
      disc(0, 0, G.alleeRadius - G.alleeWidth / 2 - 0.5, 'sand')
      disc(0, 0, G.ringRadius - 0.4, 'gravel')
      c.strokeStyle = kit.color('white')
      c.lineWidth = 0.5 * S
      c.setLineDash([1.4 * S, 2.2 * S])
      for (const r of [16, 32]) {
        c.beginPath()
        c.arc(X(0), Y(0), r * S, 0, TAU)
        c.stroke()
      }
      c.setLineDash([])
      // allées des axes, terrasses, bosquets, avenue
      allee(0, -G.alleeRadius, 0, G.alleeRadius, G.axisWidth)
      allee(-G.alleeRadius, 0, G.alleeRadius, 0, G.axisWidth)
      allee(0, -56, 0, -G.alleeRadius, G.axisWidth)
      for (const sx of [-1, 1]) {
        allee(sx * G.terraceX, -130, sx * G.terraceX, G.bottomAlleeZ, 7)
        allee(sx * G.bosquetAlleeX, -128, sx * G.bosquetAlleeX, G.bottomAlleeZ, 6)
        allee(sx * 55, 0, sx * 120, 0, 6)
        allee(sx * G.avenue.alleeX, G.avenue.z0 - 4, sx * G.avenue.alleeX, G.bottomAlleeZ, 5)
      }
      allee(-118, G.bottomAlleeZ, 118, G.bottomAlleeZ, 7)
      rect(-8, G.avenue.z0 + 3.4, 8, G.avenue.z1 - 1.4, 'white', 2)
      rect(-7.4, G.avenue.z0 + 4, 7.4, G.avenue.z1 - 2, 'lawn', 2)
      // fabriques
      rect(G.medicis.x0 - 0.6, G.medicis.z - 4.4, G.medicis.x1 + 0.6, G.medicis.z + 4.4, 'white', 0.6)
      rect(G.medicis.x0, G.medicis.z - 3.8, G.medicis.x1, G.medicis.z + 3.8, 'water-deep', 0.4)
      rect(-98.6, -110.6, -67.4, -89.4, 'white', 1.8)
      rect(-98, -110, -68, -90, 'lawn', 1.5)
      for (const k of [G.kiosk, G.cafe]) disc(k.x, k.z, 8, 'gravel')
      for (const zone of zones) disc(zone.x, zone.z, zone.radius + 0.5, 'white')
    })
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshLambertMaterial({ map: tex }))
    plane.rotation.x = -Math.PI / 2
    plane.position.set((PLAN.x0 + PLAN.x1) / 2, 0, (PLAN.z0 + PLAN.z1) / 2)
    plane.receiveShadow = true
    kit.scene.add(plane)
    addMesh(kit, new THREE.BoxGeometry(W + 1.2, 6, H + 1.2), stone, plane.position.x, -3.02, plane.position.z, false)
  }

  /* ---------- outils de jardin */
  const lawnMat = lambert(kit, 'lawn')
  const flowerSpots: Spot[] = []
  const inset = (pts: Vector2[], k: number) => {
    let cx = 0
    let cy = 0
    for (const p of pts) {
      cx += p.x
      cy += p.y
    }
    cx /= pts.length
    cy /= pts.length
    return pts.map((p) => {
      const dx = cx - p.x
      const dy = cy - p.y
      const L = Math.hypot(dx, dy) || 1
      return { x: p.x + (dx / L) * k, z: -(p.y + (dy / L) * k) }
    })
  }
  const flowerBorder = (shape: Shape, n: number) => {
    const pts = shape.getSpacedPoints(n)
    for (const k of [0.55, 1.05])
      for (const p of inset(pts, k)) flowerSpots.push({ x: p.x + (rnd() - 0.5) * 0.2, z: p.z + (rnd() - 0.5) * 0.2 })
  }
  const arcShape = (r0: number, r1: number, a0: number, a1: number) => {
    const s = new THREE.Shape()
    s.absarc(0, 0, r1, a0, a1, false)
    s.absarc(0, 0, r0, a1, a0, true)
    s.closePath()
    return s
  }
  const lathe = (pts: [number, number][], seg = 12) =>
    new THREE.LatheGeometry(
      pts.map(([a, b]) => new THREE.Vector2(a, b)),
      seg
    )

  /* ---------- parterre circulaire : pelouse fleurie, balustrade, statues, vasque centrale */
  for (const arc of arcsAroundAxes(G.lawnInner, G.axisWidth / 2 + 1)) {
    addSlab(kit, arcShape(G.lawnInner, G.lawnOuter, arc.a0, arc.a1), 0.14, lawnMat, 0.01)
    for (const r of [G.lawnInner + 0.55, G.lawnInner + 1.05, G.lawnOuter - 0.55, G.lawnOuter - 1.05]) {
      const n = Math.round(((arc.a1 - arc.a0) * r) / 0.42)
      for (let i = 0; i <= n; i++)
        flowerSpots.push(pointOnCircle(0, 0, r + (rnd() - 0.5) * 0.15, lerp(arc.a0, arc.a1, i / n)))
    }
  }
  const balusters: Spot[] = []
  const rails: OrientedSpot[] = []
  const pillars: Spot[] = []
  for (const arc of arcsAroundAxes(G.ringRadius, G.axisWidth / 2 + 1.1)) {
    const n = Math.round(((arc.a1 - arc.a0) * G.ringRadius) / 0.42)
    for (let i = 0; i <= n; i++) balusters.push(pointOnCircle(0, 0, G.ringRadius, lerp(arc.a0, arc.a1, i / n)))
    const m = Math.round(((arc.a1 - arc.a0) * G.ringRadius) / 0.5)
    for (let i = 0; i < m; i++) {
      const a = lerp(arc.a0, arc.a1, (i + 0.5) / m)
      const p = pointOnCircle(0, 0, G.ringRadius, a)
      rails.push({ ...p, rot: -a })
    }
    for (let i = 0; i <= 4; i++) pillars.push(pointOnCircle(0, 0, G.ringRadius, lerp(arc.a0, arc.a1, i / 4)))
    const c = Math.round(((arc.a1 - arc.a0) * G.ringRadius) / 1.1)
    for (let i = 0; i <= c; i++) {
      const p = pointOnCircle(0, 0, G.ringRadius, lerp(arc.a0, arc.a1, i / c))
      circle(p.x, p.z, 0.45)
    }
  }
  for (const b of plazaBalustrades()) {
    for (let z = b.z0 + 0.5; z < b.z1 - 0.3; z += 0.42) balusters.push({ x: b.x, z })
    const m = Math.round((b.z1 - b.z0) / 0.5)
    for (let i = 0; i < m; i++) rails.push({ x: b.x, z: lerp(b.z0, b.z1, (i + 0.5) / m), rot: 0 })
    pillars.push({ x: b.x, z: b.z0 }, { x: b.x, z: b.z1 })
    box(b.x, (b.z0 + b.z1) / 2, 0, 0.35, (b.z1 - b.z0) / 2)
  }
  {
    const bi = addInstanced(
      kit,
      lathe(
        [
          [0, 0],
          [0.11, 0],
          [0.07, 0.1],
          [0.13, 0.33],
          [0.06, 0.52],
          [0.09, 0.6],
          [0.09, 0.66],
          [0, 0.66]
        ],
        8
      ),
      stone,
      balusters.length
    )
    balusters.forEach((p, i) => placeInstance(kit, bi, i, p.x, 0.18, p.z))
    const railGeo = new THREE.BoxGeometry(0.62, 0.16, 0.52)
    const top = addInstanced(kit, railGeo, stone, rails.length)
    const base = addInstanced(kit, railGeo, stone, rails.length, false)
    rails.forEach((p, i) => {
      placeInstance(kit, top, i, p.x, 0.88, p.z, p.rot)
      placeInstance(kit, base, i, p.x, 0.09, p.z, p.rot, 1, 1.1, 1)
    })
    const pi = addInstanced(kit, new THREE.BoxGeometry(0.75, 1.05, 0.75), stone, pillars.length)
    const vi = addInstanced(
      kit,
      lathe(
        [
          [0, 0],
          [0.16, 0],
          [0.1, 0.1],
          [0.3, 0.4],
          [0.36, 0.55],
          [0.3, 0.6],
          [0, 0.6]
        ],
        14
      ),
      stone,
      pillars.length
    )
    pillars.forEach((p, i) => {
      placeInstance(kit, pi, i, p.x, 0.52, p.z)
      placeInstance(kit, vi, i, p.x, 1.05, p.z)
    })
  }
  {
    const parts: BufferGeometry[] = []
    const add = (g: BufferGeometry, y: number) => {
      g.translate(0, y, 0)
      const ng = g.index ? g.toNonIndexed() : g
      ng.deleteAttribute('uv')
      parts.push(ng)
    }
    add(new THREE.BoxGeometry(1.1, 1.5, 1.1), 0.75)
    add(new THREE.BoxGeometry(1.3, 0.16, 1.3), 1.58)
    add(new THREE.ConeGeometry(0.52, 1.6, 14), 2.45)
    add(new THREE.CylinderGeometry(0.17, 0.27, 0.6, 12), 3.4)
    add(new THREE.SphereGeometry(0.18, 12, 9), 3.82)
    add(new THREE.CylinderGeometry(0.15, 0.13, 0.12, 10), 4.0)
    const statues = layoutStatues()
    const st = addInstanced(kit, kit.merge(parts), lambert(kit, 'stone-warm'), statues.length)
    statues.forEach((s, i) => {
      placeInstance(kit, st, i, s.x, 0, s.z, s.rot)
      circle(s.x, s.z, 0.75)
    })
  }
  {
    addMesh(kit, new THREE.TorusGeometry(G.fountainRadius, 0.22, 8, 36).rotateX(Math.PI / 2), stone, 0, 0.32, 0)
    const w = addMesh(
      kit,
      new THREE.CircleGeometry(G.fountainRadius - 0.05, 36).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: kit.color('water') }),
      0,
      0.26,
      0,
      false
    )
    w.receiveShadow = true
    addMesh(kit, new THREE.CylinderGeometry(0.35, 0.5, 0.9, 16), stone, 0, 0.45, 0)
    jets.push({ x: 0, z: 0, y0: 0.95, vy: [4.2, 5.0], spread: [0.15, 0.55], floor: 0.28, n: 90 })
    circle(0, 0, G.fountainRadius + 0.2)
  }

  /* ---------- place du Grand Bassin : bassin octogonal, voiliers, pelouses, orangers, chaises */
  const { basin } = G
  const ripples: { mesh: Mesh; material: MeshBasicMaterial; phase: number }[] = []
  const boats: { group: Group; r: number; a: number; w: number; ph: number }[] = []
  let foam: Mesh | null = null
  {
    const octagon = (R: number) => {
      const s = new THREE.Shape()
      for (let k = 0; k < 8; k++) {
        const t = (k * Math.PI) / 4 + Math.PI / 8
        if (k) s.lineTo(Math.cos(t) * R, Math.sin(t) * R)
        else s.moveTo(Math.cos(t) * R, Math.sin(t) * R)
      }
      s.closePath()
      return s
    }
    const rim = octagon(basin.radius + 0.7)
    const hole = new THREE.Path()
    for (let k = 7; k >= 0; k--) {
      const t = (k * Math.PI) / 4 + Math.PI / 8
      if (k === 7) hole.moveTo(Math.cos(t) * (basin.radius - 0.2), Math.sin(t) * (basin.radius - 0.2))
      else hole.lineTo(Math.cos(t) * (basin.radius - 0.2), Math.sin(t) * (basin.radius - 0.2))
    }
    hole.closePath()
    rim.holes.push(hole)
    addSlab(kit, rim, 0.55, stone, 0, true).position.set(basin.x, 0, basin.z)
    const water = addMesh(
      kit,
      new THREE.ShapeGeometry(octagon(basin.radius - 0.15)).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: kit.color('water') }),
      basin.x,
      0.32,
      basin.z,
      false
    )
    water.receiveShadow = true
    const shMat = new THREE.MeshBasicMaterial({
      map: shimmerTexture(kit),
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    })
    shMat.map?.repeat.set(2.4, 2.4)
    addMesh(
      kit,
      new THREE.ShapeGeometry(octagon(basin.radius - 0.2)).rotateX(-Math.PI / 2),
      shMat,
      basin.x,
      0.34,
      basin.z,
      false
    )
    shimmers.push({ material: shMat, sx: 0.018, sy: 0.011 })
    circle(basin.x, basin.z, basin.radius + 0.5)
    addMesh(kit, new THREE.CylinderGeometry(1.25, 1.45, 0.7, 24), stone, basin.x, 0.35, basin.z)
    addMesh(kit, new THREE.CylinderGeometry(0.75, 0.45, 0.35, 24), stone, basin.x, 0.85, basin.z)
    const column = new THREE.MeshLambertMaterial({
      color: kit.color('white'),
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    })
    addMesh(kit, new THREE.CylinderGeometry(0.06, 0.16, 3.2, 10, 1, true), column, basin.x, 2.55, basin.z, false)
    jets.push({ x: basin.x, z: basin.z, y0: 1.0, vy: [6.6, 7.8], spread: [0.25, 0.95], floor: 0.33, n: 220 })
    foam = addMesh(
      kit,
      new THREE.TorusGeometry(1.75, 0.18, 8, 36).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: kit.color('white'), transparent: true, opacity: 0.7 }),
      basin.x,
      0.36,
      basin.z,
      false
    )
    for (let k = 0; k < 4; k++) {
      const material = new THREE.MeshBasicMaterial({
        color: kit.color('white'),
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
      const mesh = addMesh(
        kit,
        new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2),
        material,
        basin.x,
        0.35,
        basin.z,
        false
      )
      ripples.push({ mesh, material, phase: k / 4 })
    }
    const sails = ['brand', 'primary', 'brand-gradient-to', 'white', 'chart-2', 'chart-3'] as const
    const sailGeo = new THREE.ShapeGeometry(
      new THREE.Shape([new THREE.Vector2(0, 0.12), new THREE.Vector2(0, 1.55), new THREE.Vector2(0.95, 0.12)])
    )
    const jibGeo = new THREE.ShapeGeometry(
      new THREE.Shape([new THREE.Vector2(0, 0.25), new THREE.Vector2(0, 1.3), new THREE.Vector2(-0.6, 0.25)])
    )
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group()
      addMesh(
        kit,
        new kit.RoundedBox(0.48, 0.26, 1.35, 2, 0.12),
        lambert(kit, i % 2 ? 'stone' : 'boat-hull'),
        0,
        0.05,
        0,
        true,
        g
      )
      addMesh(kit, new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6), lambert(kit, 'mast'), 0, 0.95, 0.05, true, g)
      const sail = new THREE.Mesh(
        sailGeo,
        new THREE.MeshLambertMaterial({ color: kit.color(sails[i]), side: THREE.DoubleSide })
      )
      sail.rotation.y = Math.PI / 2
      sail.position.set(0, 0.12, 0.05)
      sail.castShadow = true
      g.add(sail)
      const jib = new THREE.Mesh(
        jibGeo,
        new THREE.MeshLambertMaterial({ color: kit.color('white'), side: THREE.DoubleSide })
      )
      jib.rotation.y = Math.PI / 2
      jib.position.set(0, 0.12, -0.05)
      g.add(jib)
      kit.scene.add(g)
      boats.push({
        group: g,
        r: 3.4 + (i % 3) * 1.9 + rnd() * 0.6,
        a: rnd() * TAU,
        w: (0.1 + rnd() * 0.08) * (i % 2 ? 1 : -1),
        ph: rnd() * 6
      })
    }
    for (const sx of [-1, 1]) {
      const front = roundedRectShape(kit, sx * 4, -104, sx * 18, -96, 1.5)
      addSlab(kit, front, 0.14, lawnMat, 0.01)
      flowerBorder(front, 90)
      const lobe = new THREE.Shape()
      lobe.absarc(
        sx * 21,
        -basin.z,
        12,
        sx < 0 ? Math.PI / 2 : -Math.PI / 2,
        sx < 0 ? Math.PI * 1.5 : Math.PI / 2,
        false
      )
      lobe.closePath()
      addSlab(kit, lobe, 0.14, lawnMat, 0.01)
      flowerBorder(lobe, 110)
    }
    const ox = [7, 13, 19, 25, 31].flatMap((x) => [x, -x])
    const caisse = addInstanced(kit, new kit.RoundedBox(1.15, 1.0, 1.15, 2, 0.08), stone, ox.length)
    const trunk = addInstanced(kit, new THREE.CylinderGeometry(0.07, 0.09, 1.1, 6), lambert(kit, 'mast'), ox.length)
    const crown = addInstanced(kit, new THREE.IcosahedronGeometry(0.85, 2), lambert(kit, 'orange-crown'), ox.length)
    const fruits: [number, number, number][] = []
    ox.forEach((x, i) => {
      placeInstance(kit, caisse, i, x, 0.5, G.esplanadeZ)
      placeInstance(kit, trunk, i, x, 1.5, G.esplanadeZ)
      placeInstance(kit, crown, i, x, 2.55, G.esplanadeZ, rnd() * 6)
      circle(x, G.esplanadeZ, 0.75)
      for (let k = 0; k < 7; k++) {
        const a = rnd() * TAU
        const b = rnd() * 1.2 - 0.3
        fruits.push([
          x + Math.cos(a) * Math.cos(b) * 0.82,
          2.55 + Math.sin(b) * 0.8,
          G.esplanadeZ + Math.sin(a) * Math.cos(b) * 0.82
        ])
      }
    })
    const fr = addInstanced(kit, new THREE.SphereGeometry(0.09, 8, 6), lambert(kit, 'fruit'), fruits.length, false)
    fruits.forEach(([x, y, z], i) => placeInstance(kit, fr, i, x, y, z))
  }

  /* ---------- palais du Sénat, façade sur le jardin */
  {
    const p = G.palace
    const g = new THREE.Group()
    const cream = lambert(kit, 'stone')
    const slate = lambert(kit, 'roof')
    addMesh(kit, new kit.RoundedBox(30, 8, 12, 2, 0.3), lambert(kit, 'stone-cool'), 0, 4, -1, true, g)
    const win = new kit.RoundedBox(1.2, 1.5, 0.3, 2, 0.12)
    for (let f = 0; f < 2; f++)
      for (let i = 0; i < 10; i++) {
        const x = -15 + (i + 0.5) * 3
        if (f === 0 && Math.abs(x) < 1.4) continue
        addMesh(kit, win, lambert(kit, 'window'), x, 0.5 + f * 3.75 + 2.06, 5.05, false, g)
      }
    for (const sx of [-13, 13]) {
      addMesh(kit, new kit.RoundedBox(6, 10, 13, 2, 0.3), cream, sx, 5, -0.5, true, g)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3.4, 4), slate)
      roof.position.set(sx, 11.7, -0.5)
      roof.rotation.y = Math.PI / 4
      roof.scale.z = 1.4
      roof.castShadow = true
      g.add(roof)
    }
    addMesh(kit, new kit.RoundedBox(9, 11, 9, 2, 0.3), cream, 0, 5.5, 1.5, true, g)
    addMesh(kit, new THREE.CylinderGeometry(3.4, 3.8, 3, 20), cream, 0, 12.5, 1.5, true, g)
    const dome = addMesh(kit, new THREE.SphereGeometry(3.6, 24, 12, 0, TAU, 0, Math.PI / 2), slate, 0, 14, 1.5, true, g)
    dome.scale.y = 1.15
    addMesh(kit, new THREE.CylinderGeometry(0.5, 0.7, 1.6, 10), cream, 0, 18.6, 1.5, true, g)
    for (let i = 0; i < 3; i++)
      addMesh(kit, new kit.RoundedBox(12 - i, 0.4, 4 - i, 2, 0.1), cream, 0, 0.2 + i * 0.4, 7 - i * 0.4, true, g)
    for (const sx of [-3, -1, 1, 3])
      addMesh(kit, new THREE.CylinderGeometry(0.4, 0.45, 6.4, 12), cream, sx, 4.4, 6.2, true, g)
    const frieze = canvasTexture(kit, 1024, 140, (c) => {
      c.fillStyle = kit.color('stone')
      c.fillRect(0, 0, 1024, 140)
      c.fillStyle = kit.color('primary')
      c.font = `700 100px ${kit.fontFamily}`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('SÉNAT', 512, 74)
    })
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.1), new THREE.MeshLambertMaterial({ map: frieze }))
    fr.position.set(0, 8.4, 6.03)
    g.add(fr)
    g.position.set(p.x, 0, p.z)
    kit.scene.add(g)
    kit.occluders.push(g)
    box(p.x, p.z, 0, 16, 7.5)
    box(p.x, p.z + 6, 0, 6.2, 2)
  }

  /* ---------- arbres : bosquets d'automne, rideaux de l'allée de l'Observatoire */
  {
    const list = layoutTrees(zones, rnd)
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 2.7, 8)
    trunkGeo.translate(0, 1.35, 0)
    const clipped = layoutClippedTrees()
    const trunks = addInstanced(kit, trunkGeo, lambert(kit, 'trunk'), list.length + clipped.length)
    const crownA = addInstanced(kit, new THREE.IcosahedronGeometry(1.95, 2), lambert(kit, 'white'), list.length)
    const crownB = addInstanced(kit, new THREE.IcosahedronGeometry(1.35, 2), lambert(kit, 'white'), list.length)
    const col = new THREE.Color()
    const col2 = new THREE.Color()
    list.forEach((t, i) => {
      const a = rnd() * TAU
      const name = rnd() < 0.58 ? pick(rnd, WORLD_COLOR_SETS.crownAutumn) : pick(rnd, WORLD_COLOR_SETS.crownGreen)
      placeInstance(kit, trunks, i, t.x, 0, t.z, 0, t.scale)
      placeInstance(kit, crownA, i, t.x, 4.1 * t.scale, t.z, a, t.scale, t.scale * 0.9, t.scale)
      placeInstance(
        kit,
        crownB,
        i,
        t.x + Math.cos(a) * 1.15 * t.scale,
        3.45 * t.scale,
        t.z + Math.sin(a) * 1.15 * t.scale,
        a,
        t.scale
      )
      col.set(kit.color(name))
      col2.copy(col).offsetHSL(0, 0, rnd() < 0.5 ? 0.04 : -0.035)
      crownA.setColorAt(i, col)
      crownB.setColorAt(i, col2)
      circle(t.x, t.z, 0.5 * t.scale)
      trees.push({ x: t.x, z: t.z, crownY: 4.0 * t.scale, crownR: 1.9 * t.scale })
    })
    const cc = addInstanced(kit, new kit.RoundedBox(2.0, 2.3, 4.5, 2, 0.45), lambert(kit, 'white'), clipped.length)
    clipped.forEach((t, i) => {
      placeInstance(kit, trunks, list.length + i, t.x, 0, t.z)
      placeInstance(kit, cc, i, t.x, 4.5, t.z)
      cc.setColorAt(i, col.set(kit.color(rnd() < 0.7 ? 'clipped-1' : 'clipped-2')))
      circle(t.x, t.z, 0.5)
      trees.push({ x: t.x, z: t.z, crownY: 4.4, crownR: 1.3 })
    })
    addSlab(kit, roundedRectShape(kit, -7.4, G.avenue.z0 + 4, 7.4, G.avenue.z1 - 2, 1.8), 0.12, lawnMat, 0.01)
  }

  /* ---------- fontaine Médicis : long bassin, vasques, grotte à colonnes */
  {
    const m = G.medicis
    const len = m.x1 - m.x0
    const cx = (m.x0 + m.x1) / 2
    const warm = lambert(kit, 'stone-warm')
    const water = addMesh(
      kit,
      new THREE.PlaneGeometry(len, 7.6).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: kit.color('water-deep') }),
      cx,
      0.28,
      m.z,
      false
    )
    water.receiveShadow = true
    const shMat = new THREE.MeshBasicMaterial({
      map: shimmerTexture(kit),
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    })
    shMat.map?.repeat.set(5, 1)
    addMesh(kit, new THREE.PlaneGeometry(len, 7.6).rotateX(-Math.PI / 2), shMat, cx, 0.3, m.z, false)
    shimmers.push({ material: shMat, sx: 0.01, sy: 0.004 })
    for (const dz of [-4.3, 4.3]) addMesh(kit, new THREE.BoxGeometry(len + 1, 0.5, 0.6), warm, cx, 0.25, m.z + dz)
    addMesh(kit, new THREE.BoxGeometry(0.6, 0.5, 9.2), warm, m.x0 - 0.3, 0.25, m.z)
    box(cx, m.z, 0, len / 2 + 0.6, 4.6)
    const urnGeo = lathe(
      [
        [0, 0],
        [0.22, 0],
        [0.14, 0.18],
        [0.42, 0.55],
        [0.5, 0.78],
        [0.42, 0.85],
        [0, 0.85]
      ],
      16
    )
    const urns: Spot[] = []
    for (let x = m.x0 + 3; x <= m.x1 - 2; x += 6.6) for (const dz of [-4.3, 4.3]) urns.push({ x, z: m.z + dz })
    const ui = addInstanced(kit, urnGeo, warm, urns.length)
    urns.forEach((u, i) => placeInstance(kit, ui, i, u.x, 0.5, u.z))
    const g = new THREE.Group()
    const dark = lambert(kit, 'roof')
    addMesh(kit, new THREE.BoxGeometry(3.2, 7.2, 12), warm, 0, 3.6, 0, true, g)
    addMesh(kit, new THREE.BoxGeometry(3.6, 0.6, 12.6), warm, 0, 7.3, 0, true, g)
    const ped = new THREE.ExtrudeGeometry(
      new THREE.Shape([new THREE.Vector2(-6.3, 0), new THREE.Vector2(6.3, 0), new THREE.Vector2(0, 1.6)]),
      { depth: 3, bevelEnabled: false }
    )
    ped.translate(0, 0, -1.5)
    ped.rotateY(Math.PI / 2)
    addMesh(kit, ped, warm, 0, 7.6, 0, true, g)
    addMesh(kit, new THREE.BoxGeometry(0.5, 4.6, 4.2), dark, -1.4, 2.6, 0, true, g)
    const arch = addMesh(
      kit,
      new THREE.CylinderGeometry(2.1, 2.1, 0.5, 24, 1, false, 0, Math.PI),
      dark,
      -1.4,
      4.9,
      0,
      true,
      g
    )
    arch.rotation.z = Math.PI / 2
    for (const dz of [-4.8, -3.4, 3.4, 4.8])
      addMesh(kit, new THREE.CylinderGeometry(0.32, 0.36, 5.6, 14), warm, -1.75, 3.1, dz, true, g)
    const white = lambert(kit, 'white')
    const bronze = lambert(kit, 'metal')
    addMesh(kit, new THREE.SphereGeometry(0.6, 14, 10), white, -1.9, 1.5, -0.5, true, g)
    addMesh(kit, new THREE.ConeGeometry(0.55, 1.4, 12), white, -1.9, 0.9, 0.6, true, g)
    addMesh(kit, new THREE.SphereGeometry(0.28, 12, 8), white, -1.9, 2.25, -0.5, true, g)
    addMesh(kit, new THREE.SphereGeometry(0.95, 14, 10), bronze, -1.6, 5.2, 0.4, true, g)
    addMesh(kit, new THREE.SphereGeometry(0.42, 12, 8), bronze, -2.0, 6.1, -0.3, true, g)
    addMesh(kit, new THREE.CylinderGeometry(2.2, 2.2, 0.6, 24, 1, false, Math.PI, Math.PI), warm, -1.6, 0.3, 0, true, g)
    const casMat = new THREE.MeshBasicMaterial({
      map: canvasTexture(
        kit,
        128,
        128,
        (c) => {
          c.strokeStyle = kit.color('white')
          for (let i = 0; i < 46; i++) {
            c.globalAlpha = 0.35 + rnd() * 0.5
            c.lineWidth = 2 + rnd() * 4
            const x = rnd() * 128
            c.beginPath()
            c.moveTo(x, 0)
            c.lineTo(x + (rnd() - 0.5) * 6, 128)
            c.stroke()
          }
        },
        true
      ),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    const sheet = addMesh(kit, new THREE.PlaneGeometry(1.4, 1.5), casMat, -1.72, 1.35, 0, false, g)
    sheet.rotation.y = -Math.PI / 2
    const lip = addMesh(kit, new THREE.PlaneGeometry(4.2, 0.42), casMat, -3.82, 0.45, 0, false, g)
    lip.rotation.y = -Math.PI / 2
    cascades.push(casMat)
    g.position.set(m.grottoX, 0, m.z)
    kit.scene.add(g)
    kit.occluders.push(g)
    box(m.grottoX, m.z, 0, 2, 6.4)
  }

  /* ---------- Orangerie, musée, parterre fleuri et vasque */
  {
    const o = G.orangerie
    const cx = (o.x0 + o.x1) / 2
    const cz = (o.z0 + o.z1) / 2
    const roof = lambert(kit, 'roof')
    const windows = (n: number, w: number, h: number, arch: boolean) =>
      canvasTexture(kit, w, h, (c) => {
        c.fillStyle = kit.color('stone')
        c.fillRect(0, 0, w, h)
        const cw = w / n
        for (let i = 0; i < n; i++) {
          const x = i * cw + cw * 0.18
          const ww = cw * 0.64
          const y = h * 0.18
          const hh = h * 0.7
          c.fillStyle = kit.color('window')
          c.beginPath()
          if (arch) {
            c.moveTo(x, y + hh)
            c.lineTo(x, y + ww / 2)
            c.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0)
            c.lineTo(x + ww, y + hh)
          } else c.rect(x, y, ww, hh)
          c.closePath()
          c.fill()
          c.strokeStyle = kit.color('white')
          c.lineWidth = 3
          c.beginPath()
          c.moveTo(x + ww / 2, y + 4)
          c.lineTo(x + ww / 2, y + hh)
          c.moveTo(x, y + hh * 0.55)
          c.lineTo(x + ww, y + hh * 0.55)
          c.stroke()
        }
      })
    addMesh(kit, new kit.RoundedBox(o.x1 - o.x0, 6.2, o.z1 - o.z0, 2, 0.2), stone, cx, 3.1, cz)
    addMesh(kit, new kit.RoundedBox(o.x1 - o.x0 + 1, 0.8, o.z1 - o.z0 + 1, 2, 0.2), roof, cx, 6.5, cz)
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(o.x1 - o.x0 - 1, 5.4),
      new THREE.MeshLambertMaterial({ map: windows(16, 2048, 256, true) })
    )
    f.position.set(cx, 3.0, o.z1 + 0.02)
    kit.scene.add(f)
    box(cx, cz, 0, (o.x1 - o.x0) / 2, (o.z1 - o.z0) / 2)
    addMesh(kit, new kit.RoundedBox(12, 8.5, 16, 2, 0.2), stone, -108, 4.25, -100)
    const mr = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 7.2, 2.6, 4, 1), roof)
    mr.rotation.y = Math.PI / 4
    mr.scale.set(1, 1, 1.4)
    mr.position.set(-108, 9.8, -100)
    mr.castShadow = true
    kit.scene.add(mr)
    const mf = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 6.6),
      new THREE.MeshLambertMaterial({ map: windows(6, 1024, 400, false) })
    )
    mf.position.set(-101.98, 4.2, -100)
    mf.rotation.y = Math.PI / 2
    kit.scene.add(mf)
    box(-108, -100, 0, 6, 8)
    const lawn = roundedRectShape(kit, -98, -110, -68, -90, 1.5)
    addSlab(kit, lawn, 0.12, lawnMat, 0.01)
    flowerBorder(lawn, 150)
    for (let k = 0; k < 26; k++) flowerSpots.push(pointOnCircle(-83, -100, 3.4, (k / 26) * TAU))
    addMesh(kit, new THREE.TorusGeometry(2.45, 0.22, 8, 36).rotateX(Math.PI / 2), stone, -83, 0.32, -100)
    addMesh(
      kit,
      new THREE.CircleGeometry(2.4, 36).rotateX(-Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: kit.color('water') }),
      -83,
      0.26,
      -100,
      false
    )
    addMesh(kit, new THREE.CylinderGeometry(0.35, 0.5, 0.9, 16), stone, -83, 0.45, -100)
    jets.push({ x: -83, z: -100, y0: 0.95, vy: [3.6, 4.4], spread: [0.15, 0.5], floor: 0.28, n: 60 })
    circle(-83, -100, 2.6)
  }

  /* ---------- fleurs (toutes les bordures en une seule instance) */
  {
    const flowers = addInstanced(
      kit,
      new THREE.IcosahedronGeometry(0.13, 1),
      lambert(kit, 'white'),
      flowerSpots.length,
      false
    )
    const col = new THREE.Color()
    flowerSpots.forEach((p, i) => {
      placeInstance(kit, flowers, i, p.x, 0.2 + rnd() * 0.08, p.z, rnd() * 6, 0.75 + rnd() * 0.5)
      flowers.setColorAt(i, col.set(kit.color(pick(rnd, WORLD_COLOR_SETS.flower))))
    })
  }

  /* ---------- chaises vertes, kiosque à musique, café sous les parasols */
  let chairGeo: BufferGeometry | null = null
  const chairs = (list: readonly OrientedSpot[]) => {
    if (!chairGeo) {
      const parts: BufferGeometry[] = []
      const add = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) => {
        const g = new THREE.BoxGeometry(w, h, d)
        if (rx) g.rotateX(rx)
        g.translate(x, y, z)
        parts.push(g)
      }
      add(0.5, 0.05, 0.48, 0, 0.47, 0)
      add(0.5, 0.5, 0.04, 0, 0.75, -0.24, -0.15)
      for (const [x, z] of [
        [-0.22, -0.21],
        [0.22, -0.21],
        [-0.22, 0.21],
        [0.22, 0.21]
      ])
        add(0.035, 0.47, 0.035, x, 0.235, z)
      chairGeo = kit.merge(parts)
    }
    const im = addInstanced(kit, chairGeo, lambert(kit, 'chair'), list.length)
    list.forEach((c, i) => placeInstance(kit, im, i, c.x, 0, c.z, c.rot))
  }
  const gardenChairs = layoutChairs(rnd)
  chairs(gardenChairs)
  const kioskChairs: OrientedSpot[] = []
  const cafeChairs: OrientedSpot[] = []
  {
    const k = G.kiosk
    const g = new THREE.Group()
    addMesh(kit, new THREE.CylinderGeometry(3.7, 3.9, 0.7, 8), stone, 0, 0.35, 0, true, g)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8
      addMesh(
        kit,
        new THREE.CylinderGeometry(0.1, 0.12, 3.1, 8),
        lambert(kit, 'metal'),
        Math.cos(a) * 3.3,
        2.25,
        Math.sin(a) * 3.3,
        true,
        g
      )
    }
    const roof = addMesh(kit, new THREE.ConeGeometry(4.5, 1.9, 8), lambert(kit, 'roof-green'), 0, 4.7, 0, true, g)
    roof.rotation.y = Math.PI / 8
    addMesh(kit, new THREE.CylinderGeometry(4.55, 4.55, 0.25, 8), lambert(kit, 'white'), 0, 3.85, 0, true, g)
    addMesh(kit, new THREE.SphereGeometry(0.22, 10, 8), lambert(kit, 'gold'), 0, 5.8, 0, true, g)
    g.position.set(k.x, 0, k.z)
    kit.scene.add(g)
    kit.occluders.push(g)
    circle(k.x, k.z, 4.1)
    for (let r = 0; r < 3; r++)
      for (let c = -3; c <= 3; c++) if (c) kioskChairs.push({ x: k.x + c * 0.9, z: k.z - (6.2 + r * 1.1), rot: 0 })
    chairs(kioskChairs)
    const c0 = G.cafe
    addMesh(kit, new kit.RoundedBox(6, 3.2, 4.2, 2, 0.2), lambert(kit, 'white'), c0.x + 3, 1.6, c0.z + 3.5)
    addMesh(kit, new kit.RoundedBox(6.6, 0.4, 4.8, 2, 0.15), lambert(kit, 'roof-green'), c0.x + 3, 3.35, c0.z + 3.5)
    box(c0.x + 3, c0.z + 3.5, 0, 3, 2.1)
    const stripes = canvasTexture(kit, 256, 32, (c) => {
      for (let i = 0; i < 12; i++) {
        c.fillStyle = kit.color(i % 2 ? 'white' : 'brand')
        c.fillRect((i * 256) / 12, 0, 256 / 12 + 1, 32)
      }
    })
    const umbrella = new THREE.ConeGeometry(1.55, 0.7, 12, 1, true)
    const umbrellaMat = new THREE.MeshLambertMaterial({ map: stripes, side: THREE.DoubleSide })
    for (const [dx, dz] of [
      [-3, -1.5],
      [0.6, -2.4],
      [-1.4, -4.6],
      [2.6, -5.2],
      [-4.4, -4.8],
      [1.0, 0.6]
    ]) {
      const x = c0.x + dx
      const z = c0.z + dz
      const u = new THREE.Mesh(umbrella, umbrellaMat)
      u.position.set(x, 2.55, z)
      u.castShadow = true
      kit.scene.add(u)
      addMesh(kit, new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), lambert(kit, 'metal'), x, 1.2, z)
      addMesh(kit, new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), lambert(kit, 'white'), x, 0.74, z)
      for (const a of [0.4, 2.6, 4.4])
        cafeChairs.push({ x: x + Math.sin(a) * 0.75, z: z + Math.cos(a) * 0.75, rot: a + Math.PI })
      circle(x, z, 0.5)
    }
    chairs(cafeChairs)
  }

  /* ---------- grille du jardin : barreaux, pointes dorées, piliers */
  {
    const bars: Spot[] = []
    const posts: Spot[] = []
    const rails: [number, number, number, number][] = []
    const line = (x1: number, z1: number, x2: number, z2: number) => {
      const L = Math.hypot(x2 - x1, z2 - z1)
      if (L < 1) return
      const n = Math.floor(L / 0.46)
      for (let i = 0; i <= n; i++) bars.push({ x: lerp(x1, x2, i / n), z: lerp(z1, z2, i / n) })
      for (let t = 0; t < L; t += 12) posts.push({ x: lerp(x1, x2, t / L), z: lerp(z1, z2, t / L) })
      posts.push({ x: x2, z: z2 })
      rails.push([x1, z1, x2, z2])
      box((x1 + x2) / 2, (z1 + z2) / 2, 0, Math.abs(x2 - x1) / 2 + 0.15, Math.abs(z2 - z1) / 2 + 0.15)
    }
    const X = G.grille.x
    const gaps: [number, number][] = [
      [-4.6, 4.6],
      [G.bottomAlleeZ - 4.6, G.bottomAlleeZ + 4.6]
    ]
    for (const sx of [-1, 1]) {
      let a: number = G.grille.z0
      for (const [g0, g1] of gaps) {
        line(sx * X, a, sx * X, g0)
        a = g1
      }
      line(sx * X, a, sx * X, G.grille.z1)
      line(sx * 14, G.grille.z1, sx * X, G.grille.z1)
    }
    line(-X, G.grille.z0, X, G.grille.z0)
    const bg = new THREE.CylinderGeometry(0.035, 0.035, 2.1, 5)
    bg.translate(0, 1.05, 0)
    const bi = addInstanced(kit, bg, lambert(kit, 'metal'), bars.length, false)
    const ti = addInstanced(kit, new THREE.ConeGeometry(0.075, 0.24, 6), lambert(kit, 'gold'), bars.length, false)
    bars.forEach((b, i) => {
      placeInstance(kit, bi, i, b.x, 0, b.z)
      placeInstance(kit, ti, i, b.x, 2.2, b.z)
    })
    const pg = new THREE.BoxGeometry(0.75, 2.7, 0.75)
    pg.translate(0, 1.35, 0)
    const pi = addInstanced(kit, pg, stone, posts.length)
    const vi = addInstanced(kit, new THREE.SphereGeometry(0.3, 10, 8), stone, posts.length)
    posts.forEach((p, i) => {
      placeInstance(kit, pi, i, p.x, 0, p.z)
      placeInstance(kit, vi, i, p.x, 2.95, p.z)
    })
    for (const [x1, z1, x2, z2] of rails)
      for (const y of [0.35, 1.85]) {
        const r = addMesh(
          kit,
          new THREE.BoxGeometry(0.08, 0.08, Math.hypot(x2 - x1, z2 - z1)),
          lambert(kit, 'metal'),
          (x1 + x2) / 2,
          y,
          (z1 + z2) / 2,
          false
        )
        r.rotation.y = Math.atan2(x2 - x1, z2 - z1)
      }
  }

  /* ---------- lampadaires allumés : lanterne, halo, flaque de lumière */
  {
    const lamps = layoutLamps()
    const n = lamps.length
    const metal = lambert(kit, 'metal')
    const base = addInstanced(kit, new THREE.CylinderGeometry(0.22, 0.3, 0.55, 10), metal, n)
    const post = addInstanced(kit, new THREE.CylinderGeometry(0.065, 0.1, 3.9, 8), metal, n)
    const lantern = addInstanced(
      kit,
      new THREE.CylinderGeometry(0.32, 0.19, 0.66, 6),
      new THREE.MeshBasicMaterial({ color: kit.color('lamp-glass'), toneMapped: false }),
      n,
      false
    )
    const cap = addInstanced(kit, new THREE.ConeGeometry(0.43, 0.42, 6), metal, n)
    const finial = addInstanced(kit, new THREE.SphereGeometry(0.09, 8, 6), lambert(kit, 'gold'), n, false)
    const poolGeo = new THREE.PlaneGeometry(6.5, 6.5)
    poolGeo.rotateX(-Math.PI / 2)
    const pool = addInstanced(
      kit,
      poolGeo,
      new THREE.MeshBasicMaterial({
        map: radialTexture(kit, 'lamp-glass'),
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -8,
        polygonOffsetUnits: -16
      }),
      n,
      false
    )
    pool.receiveShadow = false
    const halo: number[] = []
    lamps.forEach((l, i) => {
      placeInstance(kit, base, i, l.x, 0.27, l.z)
      placeInstance(kit, post, i, l.x, 2.45, l.z)
      placeInstance(kit, lantern, i, l.x, 4.68, l.z)
      placeInstance(kit, cap, i, l.x, 5.2, l.z)
      placeInstance(kit, finial, i, l.x, 5.46, l.z)
      placeInstance(kit, pool, i, l.x, 0.06, l.z)
      halo.push(l.x, 4.68, l.z)
      circle(l.x, l.z, 0.3)
    })
    const hg = new THREE.BufferGeometry()
    hg.setAttribute('position', new THREE.Float32BufferAttribute(halo, 3))
    kit.scene.add(
      new THREE.Points(
        hg,
        new THREE.PointsMaterial({
          map: radialTexture(kit, 'lamp-glow'),
          color: kit.color('lamp-glow'),
          size: 3,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.85,
          depthWrite: false
        })
      )
    )
  }

  /* ---------- feuilles mortes : au sol, et qui tombent des arbres */
  const leafTexture = canvasTexture(kit, 64, 64, (c) => {
    c.fillStyle = kit.color('white')
    c.beginPath()
    c.moveTo(32, 2.5)
    c.bezierCurveTo(61, 16, 59, 45, 32, 59)
    c.bezierCurveTo(5, 45, 3, 16, 32, 2.5)
    c.fill()
    c.strokeStyle = kit.color('leaf-5')
    c.globalAlpha = 0.45
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(32, 6)
    c.lineTo(32, 64)
    c.stroke()
  })
  {
    const N = 3400
    const geo = new THREE.PlaneGeometry(0.42, 0.42)
    geo.rotateX(-Math.PI / 2)
    const im = addInstanced(
      kit,
      geo,
      new THREE.MeshLambertMaterial({
        map: leafTexture,
        alphaTest: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -10
      }),
      N,
      false
    )
    const col = new THREE.Color()
    for (let i = 0; i < N; i++) {
      const t = trees[Math.floor(rnd() * trees.length)]
      const a = rnd() * TAU
      const r = Math.pow(rnd(), 0.6) * 4.2
      placeInstance(
        kit,
        im,
        i,
        t.x + Math.cos(a) * r,
        0.04 + rnd() * 0.01,
        t.z + Math.sin(a) * r,
        rnd() * TAU,
        0.7 + rnd() * 0.6
      )
      im.setColorAt(i, col.set(kit.color(pick(rnd, WORLD_COLOR_SETS.leaf))))
    }
  }
  type Leaf = {
    st: 0 | 1 | 2
    x: number
    y: number
    z: number
    vx: number
    vy: number
    vz: number
    rx: number
    ry: number
    rz: number
    wx: number
    wy: number
    wz: number
    t: number
    s: number
    ph: number
  }
  const leaves: Leaf[] = []
  const leafMesh = addInstanced(
    kit,
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshLambertMaterial({ map: leafTexture, alphaTest: 0.5, side: THREE.DoubleSide }),
    320,
    false
  )
  leafMesh.frustumCulled = false
  {
    const col = new THREE.Color()
    for (let i = 0; i < 320; i++) {
      leaves.push({
        st: 0,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: 0,
        rz: 0,
        wx: 0,
        wy: 0,
        wz: 0,
        t: rnd() * 8,
        s: 0.8 + rnd() * 0.5,
        ph: rnd() * 6
      })
      leafMesh.setColorAt(i, col.set(kit.color(WORLD_COLOR_SETS.leaf[i % WORLD_COLOR_SETS.leaf.length])))
      placeInstance(kit, leafMesh, i, 0, -10, 0, 0, 0.001)
    }
  }
  let nearTrees: number[] = []
  let nearTimer = 0
  const spawnLeaf = (L: Leaf) => {
    if (!nearTrees.length) {
      L.st = 0
      L.t = 0.5 + rnd()
      return
    }
    const t = trees[nearTrees[Math.floor(rnd() * nearTrees.length)]]
    const a = rnd() * TAU
    const r = rnd() * t.crownR
    L.x = t.x + Math.cos(a) * r
    L.z = t.z + Math.sin(a) * r
    L.y = t.crownY + (rnd() - 0.3) * 1.4
    L.vx = 0
    L.vy = -(0.55 + rnd() * 0.45)
    L.vz = 0
    L.rx = rnd() * 6
    L.ry = rnd() * 6
    L.rz = rnd() * 6
    L.wx = (rnd() - 0.5) * 5
    L.wy = (rnd() - 0.5) * 3
    L.wz = (rnd() - 0.5) * 5
    L.st = 1
  }

  /* ---------- promeneurs, joggeurs, chiens ; gens assis */
  type Path = { P: Spot[]; cum: number[]; L: number; closed: boolean }
  type Walker = {
    path: Path
    u: number
    dir: 1 | -1
    v: number
    jog: boolean
    off0: number
    off: number
    ph: number
    dog: number
  }
  const makePath = (points: readonly Spot[], closed: boolean): Path => {
    const P = closed ? [...points, points[0]] : [...points]
    const cum = [0]
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z))
    return { P, cum, L: cum[cum.length - 1], closed }
  }
  const sample = (path: Path, u: number) => {
    const { P, cum, L } = path
    const uu = ((u % L) + L) % L
    let i = 1
    while (i < cum.length - 1 && cum[i] < uu) i++
    const t = (uu - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])
    const a = P[i - 1]
    const b = P[i]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const l = Math.hypot(dx, dz) || 1
    return { x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), dx: dx / l, dz: dz / l }
  }
  const walkers: Walker[] = []
  for (const p of layoutWalkerPaths()) {
    const path = makePath(p.points, p.closed)
    for (let k = 0; k < p.walkers + p.joggers; k++) {
      const jog = k < p.joggers
      const off0 = (rnd() - 0.5) * 2.2
      walkers.push({
        path,
        u: rnd() * path.L,
        dir: p.closed && rnd() < 0.5 ? -1 : 1,
        v: jog ? 3.2 + rnd() * 0.6 : 1.05 + rnd() * 0.5,
        jog,
        off0,
        off: off0,
        ph: rnd() * 6,
        dog: -1
      })
    }
  }
  const sitters: { x: number; z: number; rot: number; y0: number }[] = []
  gardenChairs.forEach((c, i) => i % 3 === 0 && sitters.push({ ...c, y0: 0 }))
  kioskChairs.forEach((c, i) => i % 2 === 0 && sitters.push({ ...c, y0: 0 }))
  for (const dx of [-1.4, 0, 1.4]) sitters.push({ x: G.kiosk.x + dx, z: G.kiosk.z - 0.6, rot: Math.PI, y0: 0.7 })
  cafeChairs.forEach((c, i) => i % 2 === 1 && sitters.push({ ...c, y0: 0 }))
  const peopleCount = walkers.length + sitters.length
  const legGeo = new THREE.BoxGeometry(0.13, 0.55, 0.15)
  legGeo.translate(0, -0.275, 0)
  const body = addInstanced(kit, new THREE.CapsuleGeometry(0.27, 0.6, 4, 10), lambert(kit, 'white'), peopleCount)
  const head = addInstanced(kit, new THREE.SphereGeometry(0.17, 12, 10), lambert(kit, 'white'), peopleCount)
  const legs = addInstanced(kit, legGeo, lambert(kit, 'legs'), peopleCount * 2)
  body.frustumCulled = head.frustumCulled = legs.frustumCulled = false
  {
    const col = new THREE.Color()
    for (let i = 0; i < peopleCount; i++) {
      body.setColorAt(i, col.set(kit.color(pick(rnd, WORLD_COLOR_SETS.coat))))
      head.setColorAt(i, col.set(kit.color(pick(rnd, WORLD_COLOR_SETS.skin))))
    }
    sitters.forEach((s, k) => {
      const i = walkers.length + k
      const fx = Math.sin(s.rot)
      const fz = Math.cos(s.rot)
      placeInstance(kit, body, i, s.x - fx * 0.05, 0.9 + s.y0, s.z - fz * 0.05, s.rot, 1, 0.82, 1, -0.1)
      placeInstance(kit, head, i, s.x - fx * 0.12, 1.5 + s.y0, s.z - fz * 0.12, s.rot)
      for (const sd of [-1, 1])
        placeInstance(
          kit,
          legs,
          i * 2 + (sd > 0 ? 1 : 0),
          s.x + Math.cos(s.rot) * 0.11 * sd + fx * 0.05,
          0.5 + s.y0,
          s.z - Math.sin(s.rot) * 0.11 * sd + fz * 0.05,
          s.rot,
          1,
          1,
          1,
          -1.35
        )
    })
  }
  const dogWalkers = walkers.filter((w) => !w.jog).filter((_, i) => i % 9 === 4)
  const dogBody = addInstanced(
    kit,
    new kit.RoundedBox(0.26, 0.26, 0.62, 2, 0.08),
    lambert(kit, 'white'),
    dogWalkers.length
  )
  const dogHead = addInstanced(
    kit,
    new kit.RoundedBox(0.22, 0.22, 0.26, 2, 0.06),
    lambert(kit, 'white'),
    dogWalkers.length
  )
  dogBody.frustumCulled = dogHead.frustumCulled = false
  {
    const col = new THREE.Color()
    dogWalkers.forEach((w, i) => {
      col.set(kit.color(WORLD_COLOR_SETS.dog[i % WORLD_COLOR_SETS.dog.length]))
      dogBody.setColorAt(i, col)
      dogHead.setColorAt(i, col)
      w.dog = i
    })
  }

  /* ---------- pigeons */
  type Pigeon = {
    hx: number
    hz: number
    st: 0 | 1 | 2 | 3
    t: number
    x: number
    y: number
    z: number
    vx: number
    vy: number
    vz: number
    a: number
    ph: number
  }
  const pigeons: Pigeon[] = []
  for (const h of PIGEON_HOMES)
    for (let k = 0; k < 5; k++) {
      const hx = h.x + (rnd() - 0.5) * 3
      const hz = h.z + (rnd() - 0.5) * 3
      pigeons.push({
        hx,
        hz,
        st: 0,
        t: rnd() * 3,
        x: hx,
        y: 0,
        z: hz,
        vx: 0,
        vy: 0,
        vz: 0,
        a: rnd() * TAU,
        ph: rnd() * 6
      })
    }
  const pigeonGeo = new THREE.SphereGeometry(0.2, 10, 8)
  pigeonGeo.scale(0.8, 0.72, 1.3)
  const pigeonBody = addInstanced(kit, pigeonGeo, lambert(kit, 'pigeon'), pigeons.length)
  const pigeonHead = addInstanced(kit, new THREE.SphereGeometry(0.1, 8, 6), lambert(kit, 'pigeon-head'), pigeons.length)
  pigeonBody.frustumCulled = pigeonHead.frustumCulled = false

  /* ---------- gouttes des jets d'eau */
  type Drop = { j: JetEmitter; x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number }
  const drops: Drop[] = []
  for (const j of jets)
    for (let k = 0; k < j.n; k++) drops.push({ j, x: j.x, y: -5, z: j.z, vx: 0, vy: 0, vz: 0, t: rnd() * 1.6 })
  const dropMesh = addInstanced(
    kit,
    new THREE.IcosahedronGeometry(0.075, 0),
    new THREE.MeshBasicMaterial({ color: kit.color('white'), transparent: true, opacity: 0.9 }),
    drops.length,
    false
  )
  dropMesh.frustumCulled = false

  /* ---------- graines de pissenlit qui flottent autour de la caméra */
  const seedTexture = canvasTexture(kit, 64, 64, (c) => {
    c.strokeStyle = kit.color('white')
    c.globalAlpha = 0.95
    c.lineCap = 'round'
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(32, 62)
    c.lineTo(32, 30)
    c.stroke()
    c.lineWidth = 1.5
    for (let i = 0; i < 13; i++) {
      const a = Math.PI + (i / 12) * Math.PI
      c.beginPath()
      c.moveTo(32, 30)
      c.lineTo(32 + Math.cos(a) * 22, 30 + Math.sin(a) * 22)
      c.stroke()
    }
    c.fillStyle = kit.color('mast')
    c.beginPath()
    c.ellipse(32, 58, 2.5, 5, 0, 0, TAU)
    c.fill()
  })
  const seeds = addInstanced(
    kit,
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: kit.color('seed'),
      map: seedTexture,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.02
    }),
    160,
    false
  )
  seeds.frustumCulled = false
  const seedData = Array.from({ length: 160 }, () => ({
    x: (rnd() - 0.5) * 90,
    y: 0.4 + rnd() * 7,
    z: (rnd() - 0.5) * 90,
    vx: 0,
    vy: 0,
    vz: 0,
    ph: rnd() * 6,
    s: 0.5 + rnd() * 0.6
  }))
  const seedDummy = new THREE.Object3D()

  /* ---------- animation */
  const updateWater = (dt: number) => {
    for (const w of shimmers)
      if (w.material.map) {
        w.material.map.offset.x = (w.material.map.offset.x + w.sx * dt) % 1
        w.material.map.offset.y = (w.material.map.offset.y + w.sy * dt) % 1
      }
    for (const c of cascades) if (c.map) c.map.offset.y = (c.map.offset.y + dt * 1.2) % 1
  }
  const updateJets = (dt: number, t: number) => {
    drops.forEach((p, i) => {
      p.t -= dt
      if (p.y < p.j.floor || p.t < -3) {
        if (p.t > 0) {
          placeInstance(kit, dropMesh, i, 0, -10, 0, 0, 0.001)
          return
        }
        const a = rnd() * TAU
        const r = lerp(p.j.spread[0], p.j.spread[1], rnd())
        p.x = p.j.x
        p.z = p.j.z
        p.y = p.j.y0
        p.vx = Math.cos(a) * r
        p.vz = Math.sin(a) * r
        p.vy = lerp(p.j.vy[0], p.j.vy[1], rnd())
        p.t = 0
      }
      p.vy -= 9.8 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      placeInstance(kit, dropMesh, i, p.x, p.y, p.z, 0, p.vy < 0 ? 1.1 : 0.8)
    })
    dropMesh.instanceMatrix.needsUpdate = true
    if (foam) foam.scale.setScalar(1 + Math.sin(t * 3) * 0.06)
    for (const r of ripples) {
      const k = (t * 0.32 + r.phase) % 1
      r.mesh.scale.setScalar(1.8 + k * 7)
      r.material.opacity = (1 - k) * 0.45
    }
    for (const b of boats) {
      b.a += b.w * dt
      b.group.position.set(
        basin.x + Math.sin(b.a) * b.r,
        0.34 + Math.sin(t * 2 + b.ph) * 0.03,
        basin.z - Math.cos(b.a) * b.r
      )
      b.group.rotation.set(
        Math.sin(t * 1.3 + b.ph) * 0.05,
        Math.atan2(Math.cos(b.a) * b.w, Math.sin(b.a) * b.w),
        Math.sin(t * 0.9 + b.ph) * 0.12 + 0.1 * Math.sign(b.w),
        'YXZ'
      )
    }
  }
  const updateLeaves = (dt: number, t: number, player: PlayerView, look: { x: number; z: number }) => {
    nearTimer -= dt
    if (nearTimer < 0) {
      nearTimer = 0.35
      nearTrees = []
      trees.forEach((tr, i) => {
        if (Math.abs(tr.x - look.x) < 46 && Math.abs(tr.z - look.z) < 46) nearTrees.push(i)
      })
    }
    const wind = 0.5 + Math.sin(t * 0.21) * 0.35
    const wa = t * 0.03 + 0.6
    const wx = Math.cos(wa) * wind
    const wz = Math.sin(wa) * wind
    const sp = Math.abs(player.speed)
    leaves.forEach((L, i) => {
      if (L.st === 0) {
        L.t -= dt
        if (L.t < 0) spawnLeaf(L)
        if (L.st === 0) {
          placeInstance(kit, leafMesh, i, 0, -10, 0, 0, 0.001)
          return
        }
      }
      if (L.st === 1) {
        const fl = Math.sin(t * 2.3 + L.ph)
        L.x += (wx + fl * 0.9 + L.vx) * dt
        L.z += (wz + Math.cos(t * 1.9 + L.ph) * 0.7 + L.vz) * dt
        L.vx *= Math.pow(0.5, dt)
        L.vz *= Math.pow(0.5, dt)
        L.vy = Math.max(L.vy - 3 * dt, -0.6 - Math.abs(fl) * 0.45)
        L.y += L.vy * dt
        L.rx += L.wx * dt
        L.ry += L.wy * dt
        L.rz += L.wz * dt
        if (L.y <= 0.06) {
          L.y = 0.06
          L.st = 2
          L.t = 5 + rnd() * 6
        }
        placeInstance(kit, leafMesh, i, L.x, L.y, L.z, L.ry, L.s, L.s, L.s, L.rx, L.rz)
      } else {
        const dx = L.x - player.x
        const dz = L.z - player.z
        const d = Math.hypot(dx, dz)
        if (d < 3.4 && sp > 4) {
          L.st = 1
          L.vy = 2 + rnd() * 2.5
          L.vx = (dx / (d + 0.1)) * sp * 0.35 - Math.sin(player.heading) * sp * 0.25
          L.vz = (dz / (d + 0.1)) * sp * 0.35 - Math.cos(player.heading) * sp * 0.25
          L.wx = (rnd() - 0.5) * 10
          L.wz = (rnd() - 0.5) * 10
        }
        L.t -= dt
        const k = L.t < 0.6 ? Math.max(0.001, L.t / 0.6) : 1
        if (L.t < 0) {
          L.st = 0
          L.t = rnd() * 0.5
        }
        placeInstance(kit, leafMesh, i, L.x, 0.06, L.z, L.ry, L.s * k, L.s * k, L.s * k, -Math.PI / 2, 0)
      }
    })
    leafMesh.instanceMatrix.needsUpdate = true
  }
  const updatePeople = (dt: number, player: PlayerView) => {
    walkers.forEach((w, i) => {
      let v = w.v
      const p = sample(w.path, w.u)
      const fx = p.dx * w.dir
      const fz = p.dz * w.dir
      const nx = -fz
      const nz = fx
      const x = p.x + nx * w.off
      const z = p.z + nz * w.off
      const ddx = x - player.x
      const ddz = z - player.z
      const dist = Math.hypot(ddx, ddz)
      let target = w.off0
      if (dist < 5) {
        const side = Math.sign(ddx * nx + ddz * nz) || 1
        target = clamp(w.off0 + side * (5 - dist) * 0.9, -3.2, 3.2)
        if (dist < 2.6) v *= 0.25
      }
      w.off = lerp(w.off, target, 1 - Math.exp(-4 * dt))
      w.u += v * w.dir * dt
      if (!w.path.closed) {
        if (w.u > w.path.L) {
          w.u = w.path.L
          w.dir = -1
        } else if (w.u < 0) {
          w.u = 0
          w.dir = 1
        }
      }
      w.ph += dt * v * (w.jog ? 2.6 : 3.4)
      const a = Math.atan2(fx, fz)
      const swing = Math.sin(w.ph) * (w.jog ? 0.85 : 0.5)
      const bob = Math.abs(Math.cos(w.ph)) * (w.jog ? 0.12 : 0.04)
      placeInstance(kit, body, i, x, 0.98 + bob, z, a, 1, 1, 1, w.jog ? 0.18 : 0)
      placeInstance(kit, head, i, x + fx * (w.jog ? 0.12 : 0), 1.72 + bob, z + fz * (w.jog ? 0.12 : 0), a)
      const px = Math.cos(a) * 0.11
      const pz = -Math.sin(a) * 0.11
      placeInstance(kit, legs, i * 2, x + px, 0.55 + bob, z + pz, a, 1, 1, 1, swing)
      placeInstance(kit, legs, i * 2 + 1, x - px, 0.55 + bob, z - pz, a, 1, 1, 1, -swing)
      if (w.dog >= 0) {
        const ox = x + nx * 0.85 + fx * 0.55
        const oz = z + nz * 0.85 + fz * 0.55
        const hb = Math.abs(Math.sin(w.ph * 1.9)) * 0.06
        placeInstance(kit, dogBody, w.dog, ox, 0.36 + hb, oz, a)
        placeInstance(kit, dogHead, w.dog, ox + fx * 0.4, 0.55 + hb, oz + fz * 0.4, a)
      }
    })
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = true
    dogBody.instanceMatrix.needsUpdate = dogHead.instanceMatrix.needsUpdate = true
  }
  const hidePigeon = (i: number) => {
    placeInstance(kit, pigeonBody, i, 0, -20, 0, 0, 0.001)
    placeInstance(kit, pigeonHead, i, 0, -20, 0, 0, 0.001)
  }
  const updatePigeons = (dt: number, t: number, player: PlayerView) => {
    const sp = Math.abs(player.speed)
    pigeons.forEach((p, i) => {
      const dx = p.x - player.x
      const dz = p.z - player.z
      const d = Math.hypot(dx, dz)
      if (p.st === 0) {
        if (d < 7.5 && sp > 1) {
          p.st = 1
          p.vy = 4 + rnd() * 2
          p.vx = (dx / (d + 0.1)) * (4 + rnd() * 3)
          p.vz = (dz / (d + 0.1)) * (4 + rnd() * 3)
          p.a = Math.atan2(p.vx, p.vz)
        }
        p.t -= dt
        if (p.t < 0) {
          p.t = 1 + rnd() * 3
          p.a += (rnd() - 0.5) * 2
          const nx = p.x + Math.sin(p.a) * 0.4
          const nz = p.z + Math.cos(p.a) * 0.4
          if (Math.hypot(nx - p.hx, nz - p.hz) < 2.5) {
            p.x = nx
            p.z = nz
          }
        }
        const peck = Math.max(0, Math.sin(t * 6 + p.ph * 3)) * 0.12
        placeInstance(kit, pigeonBody, i, p.x, 0.2, p.z, p.a)
        placeInstance(kit, pigeonHead, i, p.x + Math.sin(p.a) * 0.24, 0.36 - peck, p.z + Math.cos(p.a) * 0.24, p.a)
      } else if (p.st === 1) {
        p.x += p.vx * dt
        p.z += p.vz * dt
        p.y += p.vy * dt
        p.vy += 0.6 * dt
        const flap = 1 + Math.sin(t * 40 + p.ph) * 0.35
        placeInstance(kit, pigeonBody, i, p.x, 0.2 + p.y, p.z, p.a, flap * 1.4, 1, 1)
        placeInstance(kit, pigeonHead, i, p.x + Math.sin(p.a) * 0.24, 0.38 + p.y, p.z + Math.cos(p.a) * 0.24, p.a)
        if (p.y > 16) {
          p.st = 2
          p.t = 6 + rnd() * 5
          hidePigeon(i)
        }
      } else if (p.st === 2) {
        p.t -= dt
        if (p.t < 0 && Math.hypot(p.hx - player.x, p.hz - player.z) > 12) {
          p.st = 3
          p.a = rnd() * TAU
          p.y = 9
          p.x = p.hx - Math.sin(p.a) * 9
          p.z = p.hz - Math.cos(p.a) * 9
        }
      } else {
        const k = Math.min(1, dt * 1.1)
        p.x = lerp(p.x, p.hx, k)
        p.z = lerp(p.z, p.hz, k)
        p.y = Math.max(0, p.y - 4.5 * dt)
        const flap = 1 + Math.sin(t * 32 + p.ph) * 0.3
        placeInstance(kit, pigeonBody, i, p.x, 0.2 + p.y, p.z, p.a, p.y > 0.05 ? flap * 1.4 : 1, 1, 1)
        placeInstance(kit, pigeonHead, i, p.x + Math.sin(p.a) * 0.24, 0.36 + p.y, p.z + Math.cos(p.a) * 0.24, p.a)
        if (p.y <= 0) {
          p.st = 0
          p.t = 1
        }
      }
    })
    pigeonBody.instanceMatrix.needsUpdate = pigeonHead.instanceMatrix.needsUpdate = true
  }
  const updateSeeds = (
    dt: number,
    t: number,
    player: PlayerView,
    look: { x: number; z: number },
    cameraQuaternion: Quaternion
  ) => {
    seedData.forEach((s, i) => {
      s.vx *= Math.pow(0.4, dt)
      s.vy *= Math.pow(0.5, dt)
      s.vz *= Math.pow(0.4, dt)
      const dx = s.x - player.x
      const dz = s.z - player.z
      const d = Math.hypot(dx, dz)
      if (d < 5 && Math.abs(player.speed) > 3 && s.y < 3.5) {
        const k = ((5 - d) / 5) * Math.abs(player.speed) * 0.25
        s.vx += (dx / (d + 0.1)) * k
        s.vz += (dz / (d + 0.1)) * k
        s.vy += k * 0.8
      }
      s.x += (0.7 + s.vx) * dt
      s.z += (0.25 + s.vz) * dt
      s.y += (Math.sin(t * 0.8 + s.ph) * 0.25 + s.vy - 0.05) * dt
      if (s.y < 0.3) s.y = 0.3
      if (s.y > 9) s.y = 0.4
      if (s.x - look.x > 45) s.x -= 90
      if (s.x - look.x < -45) s.x += 90
      if (s.z - look.z > 45) s.z -= 90
      if (s.z - look.z < -45) s.z += 90
      seedDummy.position.set(s.x, s.y, s.z)
      seedDummy.quaternion.copy(cameraQuaternion)
      seedDummy.rotateZ(Math.sin(t + s.ph) * 0.4)
      seedDummy.scale.setScalar(s.s)
      seedDummy.updateMatrix()
      seeds.setMatrixAt(i, seedDummy.matrix)
    })
    seeds.instanceMatrix.needsUpdate = true
  }
  return {
    update(dt, t, player, look, cameraQuaternion) {
      updateWater(dt)
      updateJets(dt, t)
      updateLeaves(dt, t, player, look)
      updatePeople(dt, player)
      updatePigeons(dt, t, player)
      updateSeeds(dt, t, player, look, cameraQuaternion)
    }
  }
}
