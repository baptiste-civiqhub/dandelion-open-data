import type {
  BufferGeometry,
  CanvasTexture,
  InstancedMesh,
  Material,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Scene,
  Shape
} from 'three'
import type { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

import type { Random } from '../lib/seeded-random'
import type { Collider } from '../lib/vehicle'
import type { SharedColorName, WorldColorName } from '../lib/world-colors'

export type Three = typeof import('three')
export type ColorName = WorldColorName | SharedColorName

/** Tout ce dont les constructeurs du monde ont besoin : moteur, scène, couleurs (tokens), obstacles, hasard. */
export type WorldKit = {
  THREE: Three
  scene: Scene
  color: (name: ColorName) => string
  fontFamily: string
  rnd: Random
  colliders: Collider[]
  occluders: Object3D[]
  RoundedBox: typeof RoundedBoxGeometry
  merge: typeof mergeGeometries
  anisotropy: number
  materials: Map<string, MeshLambertMaterial>
}

export function lambert(kit: WorldKit, name: ColorName): MeshLambertMaterial {
  const cached = kit.materials.get(name)
  if (cached) return cached
  const material = new kit.THREE.MeshLambertMaterial({ color: kit.color(name) })
  kit.materials.set(name, material)
  return material
}

export function addMesh(
  kit: WorldKit,
  geometry: BufferGeometry,
  material: Material,
  x = 0,
  y = 0,
  z = 0,
  shadow = true,
  parent: Object3D = kit.scene
): Mesh {
  const m = new kit.THREE.Mesh(geometry, material)
  m.position.set(x, y, z)
  m.castShadow = shadow
  m.receiveShadow = true
  parent.add(m)
  return m
}

export function addInstanced(
  kit: WorldKit,
  geometry: BufferGeometry,
  material: Material,
  count: number,
  shadow = true
): InstancedMesh {
  const im = new kit.THREE.InstancedMesh(geometry, material, Math.max(1, count))
  im.count = count
  im.castShadow = shadow
  im.receiveShadow = true
  kit.scene.add(im)
  return im
}

/** Pose une instance : position, lacet `ry`, échelle, puis tangage `rx` et roulis `rz` (ordre YXZ). */
export function placeInstance(
  kit: WorldKit,
  im: InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
  sx = 1,
  sy = sx,
  sz = sx,
  rx = 0,
  rz = 0
) {
  const m = scratch(kit)
  m.euler.set(rx, ry, rz, 'YXZ')
  m.quat.setFromEuler(m.euler)
  m.matrix.compose(m.pos.set(x, y, z), m.quat, m.scale.set(sx, sy, sz))
  im.setMatrixAt(i, m.matrix)
}

type Scratch = {
  euler: InstanceType<Three['Euler']>
  quat: InstanceType<Three['Quaternion']>
  matrix: InstanceType<Three['Matrix4']>
  pos: InstanceType<Three['Vector3']>
  scale: InstanceType<Three['Vector3']>
}
const scratchByKit = new WeakMap<WorldKit, Scratch>()
function scratch(kit: WorldKit): Scratch {
  let s = scratchByKit.get(kit)
  if (!s) {
    const { THREE } = kit
    s = {
      euler: new THREE.Euler(),
      quat: new THREE.Quaternion(),
      matrix: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      scale: new THREE.Vector3()
    }
    scratchByKit.set(kit, s)
  }
  return s
}

/** Dalle extrudée posée au sol. La forme est tracée en (x, -z) : après rotation, v devient -z. */
export function addSlab(kit: WorldKit, shape: Shape, depth: number, material: Material, y = 0, shadow = false): Mesh {
  const geometry = new kit.THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 })
  geometry.rotateX(-Math.PI / 2)
  const m = new kit.THREE.Mesh(geometry, material)
  m.position.y = y
  m.receiveShadow = true
  m.castShadow = shadow
  kit.scene.add(m)
  return m
}

export function canvasTexture(
  kit: WorldKit,
  width: number,
  height: number,
  draw: (c: CanvasRenderingContext2D) => void,
  repeat = false
): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const c = canvas.getContext('2d')
  if (c) draw(c)
  const texture = new kit.THREE.CanvasTexture(canvas)
  texture.colorSpace = kit.THREE.SRGBColorSpace
  texture.anisotropy = kit.anisotropy
  if (repeat) texture.wrapS = texture.wrapT = kit.THREE.RepeatWrapping
  return texture
}

/** Halo radial (couleur d'un token, alpha décroissant), écrit pixel par pixel : aucune couleur littérale. */
export function radialTexture(kit: WorldKit, name: ColorName, size = 128): CanvasTexture {
  const col = new kit.THREE.Color(kit.color(name))
  return canvasTexture(kit, size, size, (c) => {
    const img = c.createImageData(size, size)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2)
        const a = Math.max(0, 1 - d)
        const i = (y * size + x) * 4
        img.data[i] = Math.round(Math.min(1, col.r * 1.05) * 255)
        img.data[i + 1] = Math.round(col.g * 255)
        img.data[i + 2] = Math.round(col.b * 255)
        img.data[i + 3] = Math.round(255 * a * a * (0.6 + 0.4 * a))
      }
    c.putImageData(img, 0, 0)
  })
}

/** Reflets d'eau : traits clairs semi-transparents, texture répétée. */
export function shimmerTexture(kit: WorldKit): CanvasTexture {
  return canvasTexture(
    kit,
    256,
    256,
    (c) => {
      c.strokeStyle = kit.color('white')
      c.lineCap = 'round'
      for (let i = 0; i < 70; i++) {
        const x = kit.rnd() * 256
        const y = kit.rnd() * 256
        const l = 6 + kit.rnd() * 22
        c.globalAlpha = 0.5 + kit.rnd() * 0.4
        c.lineWidth = 1 + kit.rnd() * 2.2
        c.beginPath()
        c.moveTo(x, y)
        c.quadraticCurveTo(x + l / 2, y - 3, x + l, y)
        c.stroke()
      }
    },
    true
  )
}

/** Rectangle aux coins arrondis centré sur (cx, cz), en coordonnées de dalle (x, -z). */
export function roundedRectShape(kit: WorldKit, x0: number, z0: number, x1: number, z1: number, r: number): Shape {
  const s = new kit.THREE.Shape()
  const ax = Math.min(x0, x1)
  const bx = Math.max(x0, x1)
  const av = Math.min(-z0, -z1)
  const bv = Math.max(-z0, -z1)
  s.moveTo(ax + r, av)
  s.lineTo(bx - r, av)
  s.quadraticCurveTo(bx, av, bx, av + r)
  s.lineTo(bx, bv - r)
  s.quadraticCurveTo(bx, bv, bx - r, bv)
  s.lineTo(ax + r, bv)
  s.quadraticCurveTo(ax, bv, ax, bv - r)
  s.lineTo(ax, av + r)
  s.quadraticCurveTo(ax, av, ax + r, av)
  return s
}

export const pick = <T>(rnd: Random, list: readonly T[]): T => list[Math.floor(rnd() * list.length)]
