import type { BufferGeometry, Group, Mesh, Shape } from 'three'

import { renderDandelionSvg } from '@/lib/brand/dandelion-svg'

import type { VehicleState } from '../lib/vehicle'
import { addMesh, canvasTexture, lambert, type WorldKit } from './world-kit'

export type CarRig = {
  car: Group
  pose: (state: VehicleState, dt: number) => void
}

const WHEEL_RADIUS = 0.5
const WHEEL_X = 0.95
const FRONT_AXLE = 1.3
const REAR_AXLE = -1.35

/** Profil de la caisse, en (s, y) : s vers l'avant (le monde a l'avant en -Z), y vers le haut. */
const CABIN = { sMin: -1.9, sMax: 0.85, yMin: 0.62, yMax: 1.98, bevel: 0.14, halfWidth: 0.75 }
const FRONT_DOOR = { front: 0.8, rear: -0.1 }
const REAR_DOOR = { front: -0.1, rear: -0.88 }
const BELT = 1.3

/**
 * Profil (s, y) extrudé sur la largeur, centré en x. Après rotation, s devient -z : le profil se dessine de côté,
 * avant à droite. Les faces latérales (groupe 0) gardent des UV en coordonnées du profil : une texture s'y pose à plat.
 */
function sideExtrusion(kit: WorldKit, shape: Shape, halfWidth: number, bevel: number): BufferGeometry {
  const geometry = new kit.THREE.ExtrudeGeometry(shape, {
    depth: halfWidth * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
    curveSegments: 24
  })
  geometry.translate(0, 0, -halfWidth)
  geometry.rotateY(Math.PI / 2)
  return geometry
}

function cabinShape(kit: WorldKit): Shape {
  const s = new kit.THREE.Shape()
  s.moveTo(CABIN.sMax, CABIN.yMin)
  s.lineTo(CABIN.sMax, 1.22)
  s.lineTo(0.42, 1.86)
  s.quadraticCurveTo(0.05, CABIN.yMax, -0.35, CABIN.yMax)
  s.bezierCurveTo(-1.1, CABIN.yMax, -1.75, 1.55, CABIN.sMin, 0.95)
  s.lineTo(-1.86, CABIN.yMin)
  s.lineTo(CABIN.sMax, CABIN.yMin)
  return s
}

const HOOD_TOP = { from: [0.7, 1.22], control: [1.4, 1.18], to: [1.88, 0.98] } as const

function hoodShape(kit: WorldKit): Shape {
  const s = new kit.THREE.Shape()
  s.moveTo(0.7, 0.62)
  s.lineTo(...HOOD_TOP.from)
  s.quadraticCurveTo(...HOOD_TOP.control, ...HOOD_TOP.to)
  s.lineTo(1.95, 0.9)
  s.lineTo(1.95, 0.66)
  s.lineTo(0.7, 0.62)
  return s
}

/** Aile avant : bombée au-dessus de la roue, elle file vers l'arrière jusqu'au marchepied. */
function frontWingShape(kit: WorldKit): Shape {
  const s = new kit.THREE.Shape()
  s.moveTo(2.0, 0.58)
  s.bezierCurveTo(2.02, 1.1, 1.65, 1.27, FRONT_AXLE, 1.27)
  s.bezierCurveTo(0.95, 1.27, 0.75, 0.85, 0.55, WHEEL_RADIUS)
  s.lineTo(0.7, WHEEL_RADIUS)
  s.absarc(FRONT_AXLE, WHEEL_RADIUS, 0.6, Math.PI, 0, true)
  s.lineTo(2.0, 0.58)
  return s
}

/** Aile arrière : jupe qui couvre le haut de la roue, bord inférieur droit à hauteur du moyeu. */
function rearWingShape(kit: WorldKit): Shape {
  const s = new kit.THREE.Shape()
  s.moveTo(-0.85, 0.58)
  s.bezierCurveTo(-0.86, 0.98, -0.98, 1.22, -1.3, 1.22)
  s.lineTo(-1.62, 1.2)
  s.bezierCurveTo(-1.92, 1.15, -2.0, 0.85, -1.94, 0.6)
  s.lineTo(-0.85, 0.58)
  return s
}

const quad = (a: number, b: number, c: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
const cubic = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d

/** Zone du toit couverte par l'autocollant de l'équipe : partie plate entre pare-brise et lunette. */
const ROOF_DECAL = { front: 0.22, rear: -0.88, halfWidth: 0.66 }

/** Inscriptions de l'autocollant (noms propres et date : décor, comme le fronton « SÉNAT »). */
const ROOF_LINES = [
  { text: 'Dandelion', weight: 800, size: 136, y: 410, color: 'foreground' },
  { text: 'Hackathon Swanbase', weight: 700, size: 80, y: 548, color: 'foreground' },
  { text: '14/11/2026', weight: 600, size: 72, y: 638, color: 'foreground' },
  { text: 'Hemicycle · Fatherless', weight: 600, size: 66, y: 790, color: 'muted-foreground' }
] as const

/**
 * Autocollant du toit : picto Dandelion (renderDandelionSvg, jamais redessiné), nom, hackathon, date et partenaires.
 * Bande courbe qui épouse la ligne de toit ; lisible depuis la caméra de poursuite (haut du texte vers l'avant).
 */
function roofDecal(kit: WorldKit): Mesh {
  const { THREE } = kit
  const profile: [number, number][] = []
  for (let i = 0; i <= 24; i++)
    profile.push([quad(0.42, 0.05, -0.35, i / 24), quad(1.86, CABIN.yMax, CABIN.yMax, i / 24)])
  for (let i = 1; i <= 48; i++)
    profile.push([cubic(-0.35, -1.1, -1.75, CABIN.sMin, i / 48), cubic(CABIN.yMax, CABIN.yMax, 1.55, 0.95, i / 48)])
  const strip = profile.filter(([s]) => s <= ROOF_DECAL.front && s >= ROOF_DECAL.rear)
  const { front, rear, halfWidth: hw } = ROOF_DECAL
  const position: number[] = []
  const uv: number[] = []
  const index: number[] = []
  strip.forEach(([s, y], i) => {
    for (const x of [-hw, hw]) {
      position.push(x, y + CABIN.bevel + 0.006, -s)
      uv.push((x + hw) / (2 * hw), (s - rear) / (front - rear))
    }
    if (i > 0) index.push(2 * i - 2, 2 * i, 2 * i - 1, 2 * i - 1, 2 * i, 2 * i + 1)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(index)
  geometry.computeVertexNormals()

  const cw = 1024
  const ch = Math.round((cw * (front - rear)) / (2 * hw))
  const texture = canvasTexture(kit, cw, ch, (c) => {
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    for (const line of ROOF_LINES) {
      c.fillStyle = kit.color(line.color)
      c.font = `${line.weight} ${line.size}px ${kit.fontFamily}`
      c.fillText(line.text, cw / 2, line.y)
    }
    c.fillStyle = kit.color('muted-foreground')
    c.fillRect(cw / 2 - 180, 712, 360, 4)
  })
  const canvas = texture.image as HTMLCanvasElement
  try {
    const logo = new Image()
    logo.onload = () => {
      canvas.getContext('2d')?.drawImage(logo, cw / 2 - 150, 20, 300, 300)
      texture.needsUpdate = true
    }
    logo.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(renderDandelionSvg({ ink: kit.color('brand') }))
  } catch {
    // Couleur de marque illisible (tokens non régénérés) : l'autocollant garde ses inscriptions, sans picto.
  }
  const decal = new THREE.Mesh(
    geometry,
    new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2
    })
  )
  decal.receiveShadow = true
  return decal
}

/**
 * Flancs de la caisse : portières en dégradé bleu, blanc, rouge, vitres, jours de portières, jonc chromé et poignées.
 * Dessinés en coordonnées du profil, puis posés à plat sur les deux faces latérales de l'extrusion.
 */
function cabinSideTexture(kit: WorldKit) {
  const W = CABIN.sMax - CABIN.sMin
  const H = CABIN.yMax - CABIN.yMin
  const cw = 1024
  const ch = Math.round((cw * H) / W)
  const X = (s: number) => ((s - CABIN.sMin) / W) * cw
  const Y = (y: number) => (1 - (y - CABIN.yMin) / H) * ch
  const blue = kit.color('car-blue')
  const white = kit.color('car-white')
  const red = kit.color('car-red')

  const texture = canvasTexture(kit, cw, ch, (c) => {
    c.fillStyle = white
    c.fillRect(0, 0, cw, ch)

    c.fillStyle = blue
    c.fillRect(X(CABIN.sMax), Y(BELT), X(FRONT_DOOR.front) - X(CABIN.sMax), ch - Y(BELT))
    const front = c.createLinearGradient(X(FRONT_DOOR.front), 0, X(FRONT_DOOR.rear), 0)
    front.addColorStop(0, blue)
    front.addColorStop(0.3, blue)
    front.addColorStop(1, white)
    c.fillStyle = front
    c.fillRect(X(FRONT_DOOR.front), Y(BELT), X(FRONT_DOOR.rear) - X(FRONT_DOOR.front), ch - Y(BELT))
    const rear = c.createLinearGradient(X(REAR_DOOR.front), 0, X(REAR_DOOR.rear), 0)
    rear.addColorStop(0, white)
    rear.addColorStop(0.7, red)
    rear.addColorStop(1, red)
    c.fillStyle = rear
    c.fillRect(X(REAR_DOOR.front), Y(BELT), X(REAR_DOOR.rear) - X(REAR_DOOR.front), ch - Y(BELT))

    const glass = (points: readonly (readonly [number, number])[]) => {
      c.beginPath()
      points.forEach(([s, y], i) => (i === 0 ? c.moveTo(X(s), Y(y)) : c.lineTo(X(s), Y(y))))
      c.closePath()
      c.fill()
    }
    c.fillStyle = kit.color('car-glass')
    glass([
      [0.72, BELT + 0.04],
      [0.42, 1.76],
      [-0.03, 1.83],
      [-0.03, BELT + 0.04]
    ])
    glass([
      [-0.17, BELT + 0.04],
      [-0.17, 1.83],
      [-0.55, 1.83],
      [-0.8, 1.76],
      [-0.8, BELT + 0.04]
    ])
    glass([
      [-0.98, BELT + 0.06],
      [-0.98, 1.68],
      [-1.22, 1.6],
      [-1.36, BELT + 0.06]
    ])

    c.strokeStyle = kit.color('car-dark')
    c.lineWidth = 4
    c.beginPath()
    for (const s of [FRONT_DOOR.front, FRONT_DOOR.rear, REAR_DOOR.rear]) {
      c.moveTo(X(s), Y(CABIN.yMin + 0.02))
      c.lineTo(X(s), Y(1.86))
    }
    c.moveTo(X(FRONT_DOOR.front), Y(CABIN.yMin + 0.03))
    c.lineTo(X(REAR_DOOR.rear), Y(CABIN.yMin + 0.03))
    c.stroke()

    c.fillStyle = kit.color('car-chrome')
    c.fillRect(X(CABIN.sMax), Y(BELT) - 3, X(REAR_DOOR.rear) - X(CABIN.sMax), 6)
    for (const s of [FRONT_DOOR.rear + 0.16, REAR_DOOR.front - 0.06]) c.fillRect(X(s), Y(BELT - 0.08), 18, 7)
  })
  texture.repeat.set(1 / W, 1 / H)
  texture.offset.set(-CABIN.sMin / W, -CABIN.yMin / H)
  return texture
}

/** Glace posée sur la caisse : centre (s, y) sur la surface, normale sortante (ns, ny), dimensions largeur × longueur. */
function addGlass(
  kit: WorldKit,
  parent: Group,
  s: number,
  y: number,
  ns: number,
  ny: number,
  width: number,
  length: number
) {
  const offset = CABIN.bevel + 0.008
  const pane = addMesh(
    kit,
    new kit.THREE.BoxGeometry(width, 0.03, length),
    lambert(kit, 'car-glass'),
    0,
    y + ny * offset,
    -(s + ns * offset),
    false,
    parent
  )
  pane.rotation.x = Math.atan2(-ns, ny)
}

/** Deux-chevaux tricolore : capot nervuré, ailes rapportées, phares sur les ailes, caisse qui prend du roulis. */
export function buildCar(kit: WorldKit): CarRig {
  const { THREE } = kit
  const car = new THREE.Group()
  const body = new THREE.Group()
  car.add(body)

  const white = lambert(kit, 'car-white')
  const chrome = lambert(kit, 'car-chrome')
  const dark = lambert(kit, 'car-dark')
  const sides = new THREE.MeshLambertMaterial({ map: cabinSideTexture(kit) })

  const cabin = new THREE.Mesh(sideExtrusion(kit, cabinShape(kit), CABIN.halfWidth, CABIN.bevel), [sides, white])
  cabin.castShadow = true
  cabin.receiveShadow = true
  body.add(cabin)
  body.add(roofDecal(kit))

  addMesh(kit, sideExtrusion(kit, hoodShape(kit), 0.55, 0.1), white, 0, 0, 0, true, body)
  for (const x of [-0.36, -0.18, 0, 0.18, 0.36]) {
    const points = [0.15, 0.35, 0.55, 0.75, 0.95].map((t) => {
      const s = quad(HOOD_TOP.from[0], HOOD_TOP.control[0], HOOD_TOP.to[0], t)
      const y = quad(HOOD_TOP.from[1], HOOD_TOP.control[1], HOOD_TOP.to[1], t)
      return new THREE.Vector3(x, y + 0.1, -s)
    })
    addMesh(kit, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.022, 6), white, 0, 0, 0, false, body)
  }

  const wing = (shape: Shape, name: 'car-blue' | 'car-red') => {
    const geometry = sideExtrusion(kit, shape, 0.12, 0.08)
    for (const side of [-1, 1]) addMesh(kit, geometry, lambert(kit, name), side * 0.94, 0, 0, true, body)
  }
  wing(frontWingShape(kit), 'car-blue')
  wing(rearWingShape(kit), 'car-red')

  addGlass(kit, body, 0.635, 1.54, 0.83, 0.557, 1.42, 0.66)
  addGlass(kit, body, -1.506, 1.572, -0.656, 0.755, 0.98, 0.48)
  addMesh(kit, new kit.RoundedBox(0.3, 0.06, 0.08, 2, 0.02), chrome, 0, 1.18, 1.94, false, body)

  addMesh(kit, new THREE.BoxGeometry(0.88, 0.26, 0.03), dark, 0, 0.78, -2.06, false, body)
  for (const y of [0.7, 0.78, 0.86])
    addMesh(kit, new THREE.BoxGeometry(0.9, 0.025, 0.04), chrome, 0, y, -2.07, false, body)

  const lamp = new THREE.CylinderGeometry(0.17, 0.15, 0.26, 20)
  lamp.rotateX(Math.PI / 2)
  const lens = new THREE.CircleGeometry(0.14, 20)
  lens.rotateY(Math.PI)
  const glow = new THREE.MeshBasicMaterial({ color: kit.color('car-light') })
  for (const side of [-1, 1]) {
    addMesh(kit, lamp, white, side * 0.76, 1.42, -1.62, true, body)
    addMesh(kit, new THREE.BoxGeometry(0.06, 0.16, 0.06), chrome, side * 0.76, 1.29, -1.6, false, body)
    addMesh(kit, lens, glow, side * 0.76, 1.42, -1.752, false, body)
    addMesh(
      kit,
      new THREE.BoxGeometry(0.14, 0.18, 0.06),
      new THREE.MeshBasicMaterial({ color: kit.color('car-tail') }),
      side * 0.94,
      0.92,
      2.03,
      false,
      body
    )
    addMesh(kit, new THREE.BoxGeometry(0.12, 0.05, 1.42), chrome, side * 0.92, 0.5, 0.15, false, body)
  }

  for (const z of [-2.13, 2.12]) {
    addMesh(kit, new kit.RoundedBox(1.9, 0.1, 0.1, 2, 0.04), chrome, 0, 0.58, z, true, body)
    for (const x of [-0.45, 0.45])
      addMesh(kit, new kit.RoundedBox(0.08, 0.26, 0.1, 2, 0.03), chrome, x, 0.62, z, false, body)
  }

  const tire = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.26, 24)
  tire.rotateZ(Math.PI / 2)
  const rim = new THREE.CylinderGeometry(0.33, 0.33, 0.28, 20)
  rim.rotateZ(Math.PI / 2)
  const hub = new THREE.CylinderGeometry(0.12, 0.15, 0.32, 14)
  hub.rotateZ(Math.PI / 2)
  const wheels: { pivot: Group; spin: Group; front: boolean }[] = []
  for (const [x, s, front] of [
    [-WHEEL_X, FRONT_AXLE, true],
    [WHEEL_X, FRONT_AXLE, true],
    [-WHEEL_X, REAR_AXLE, false],
    [WHEEL_X, REAR_AXLE, false]
  ] as const) {
    const pivot = new THREE.Group()
    pivot.position.set(x, WHEEL_RADIUS, -s)
    const spin = new THREE.Group()
    pivot.add(spin)
    addMesh(kit, tire, dark, 0, 0, 0, true, spin)
    addMesh(kit, rim, white, 0, 0, 0, false, spin)
    addMesh(kit, hub, chrome, 0, 0, 0, false, spin)
    car.add(pivot)
    wheels.push({ pivot, spin, front })
  }

  return {
    car,
    pose(state, dt) {
      // Le roulis exagéré de la caisse fait la signature de la deux-chevaux.
      body.rotation.set(state.pitch * 1.3, 0, state.roll * 1.8)
      body.position.y = Math.abs(Math.sin(state.distance * 1.7)) * Math.min(Math.abs(state.speed) / 17, 1) * 0.06
      for (const w of wheels) {
        w.spin.rotation.x -= (state.speed * dt) / WHEEL_RADIUS
        if (w.front) w.pivot.rotation.y = state.steer * 0.7
      }
    }
  }
}
