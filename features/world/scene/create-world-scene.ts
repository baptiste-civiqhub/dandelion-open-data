import type { Material, Mesh, Object3D, Texture } from 'three'

import type { StageSceneFactory, StageSize } from '@/lib/stage/stage-scene'

import {
  applyOrbit,
  blendIntro,
  createOrbit,
  dragOrbit,
  fogForDistance,
  INTRO,
  introWeight,
  lookAhead,
  relaxOrbit,
  resetOrbit,
  zoomOrbit,
  zoomOrbitBySteps
} from '../lib/camera-rig'
import { diveFade, diveFlowerScale, diveProgress, diveTarget, easeInOutCubic, lerpVec, type Vec3 } from '../lib/dive'
import { GARDEN } from '../lib/garden-layout'
import { createRandom } from '../lib/seeded-random'
import {
  createVehicleState,
  resolveCollisions,
  stepVehicle,
  VEHICLE_PARAMS,
  type VehicleInput,
  type VehicleKind
} from '../lib/vehicle'
import { zoneAt, type WorldZone } from '../lib/world-zones'
import { buildGarden } from './build-garden'
import { buildVehicles } from './build-vehicles'
import { buildZones, type ZoneVisual } from './build-zones'
import { readWorldPalette } from './world-palette'
import type { WorldKit } from './world-kit'

/**
 * Contrat entre le monde 3D et l'application (features/world/README.md). Le monde ne connaît ni le routeur, ni les
 * URL, ni le DOM de l'interface : il reçoit des zones et rend trois événements. `WorldScreen` fait le reste.
 */
export type WorldSceneOptions = {
  /** Zones à poser au sol, positions comprises (`worldZonesFromAreas`). Liste vide pendant le chargement. */
  zones: readonly WorldZone[]
  /**
   * Le monde dessine sa première image : l'interface retire alors le titre de marque centré (il reste pour les
   * lecteurs d'écran). Appelé une fois. Jamais appelé si WebGL est indisponible : la landing garde son titre.
   */
  onReady: () => void
  /**
   * Le personnage entre dans une zone (`slug`) ou en sort (`null`). L'interface affiche alors « Entrée pour ouvrir ».
   * N'appeler que lors d'un changement.
   */
  onZoneFocus: (slug: string | null) => void
  /**
   * L'utilisateur a pressé Entrée dans une zone et la transition (zoom sur la zone) est terminée : l'application
   * navigue vers `/area/{slug}`. Avec `reducedMotion`, appeler sans transition.
   */
  onEnterZone: (slug: string) => void
}

const KEY_TO_INPUT: Record<string, keyof VehicleInput> = {
  ArrowUp: 'up',
  KeyW: 'up',
  KeyZ: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  KeyQ: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
  Space: 'brake'
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
const overlayOpen = () => document.querySelector('[data-slot=overlay-window]') !== null
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const ZOOM_KEYS: Record<string, number> = { Equal: -1, NumpadAdd: -1, Minus: 1, NumpadSubtract: 1 }

/**
 * Le survol d'introduction ne se joue qu'une fois par session. Il démarre à la première image dessinée (la
 * construction de la scène peut prendre une seconde) et son départ est mémorisé : la scène, recréée à l'arrivée des
 * zones, le reprend là où il en était au lieu de le relancer.
 */
const INTRO_KEY = 'dandelion:world-intro'
const INTRO_DONE = '0'
type IntroClock = number | 'fresh' | null
function readIntroClock(): IntroClock {
  try {
    const stored = sessionStorage.getItem(INTRO_KEY)
    if (stored === null) return 'fresh'
    const start = Number(stored)
    return Date.now() - start < INTRO.durationMs ? start : null
  } catch {
    return 'fresh'
  }
}
function writeIntro(value: string) {
  try {
    sessionStorage.setItem(INTRO_KEY, value)
  } catch {
    // Stockage indisponible (navigation privée) : le survol se rejouera à la recréation, sans gravité.
  }
}

/**
 * Monde WebGL de la landing : le jardin du Luxembourg derrière le Sénat. Les zones sont des pissenlits plantés en
 * spirale dans le parterre central, aux positions de l'atlas. Le joueur conduit une voiture ou monte à cheval
 * (touche V) ; Entrée dans une zone fait plonger la caméra sur la fleur, puis appelle `onEnterZone`.
 */
export function createWorldScene(options: WorldSceneOptions): StageSceneFactory {
  return async ({ canvas, size, reducedMotion }) => {
    const THREE = await import('three')
    const [{ RoundedBoxGeometry }, { mergeGeometries }] = await Promise.all([
      import('three/addons/geometries/RoundedBoxGeometry.js'),
      import('three/addons/utils/BufferGeometryUtils.js')
    ])

    let renderer: InstanceType<typeof THREE.WebGLRenderer>
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      return {}
    }
    renderer.setPixelRatio(size.pixelRatio)
    renderer.setSize(size.width, size.height, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const color = readWorldPalette()
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(color('sky'))
    const fog = new THREE.Fog(color('sky'), 130, 300)
    scene.fog = fog
    const camera = new THREE.PerspectiveCamera(34, size.width / Math.max(1, size.height), 1, 600)
    scene.add(camera)
    scene.add(new THREE.HemisphereLight(color('white'), color('hemi-ground'), 1.6))
    const sun = new THREE.DirectionalLight(color('sun'), 2.5)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.radius = 4
    Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 220 })
    sun.shadow.bias = -0.0008
    sun.shadow.normalBias = 0.04
    scene.add(sun, sun.target)
    {
      const geo = new THREE.SphereGeometry(450, 32, 16)
      const pos = geo.attributes.position
      const top = new THREE.Color(color('sky-top'))
      const horizon = new THREE.Color(color('sky'))
      const cols: number[] = []
      for (let i = 0; i < pos.count; i++) {
        const c = horizon.clone().lerp(top, Math.pow(Math.max(0, Math.min(1, pos.getY(i) / 450)), 0.6))
        cols.push(c.r, c.g, c.b)
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3))
      const sky = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
      )
      sky.userData.followCamera = true
      scene.add(sky)
    }

    const kit: WorldKit = {
      THREE,
      scene,
      color,
      fontFamily: getComputedStyle(document.body).fontFamily || 'sans-serif',
      rnd: createRandom(7),
      colliders: [],
      occluders: [],
      RoundedBox: RoundedBoxGeometry,
      merge: mergeGeometries,
      anisotropy: renderer.capabilities.getMaxAnisotropy(),
      materials: new Map()
    }
    const garden = buildGarden(kit, options.zones)
    const visuals = buildZones(kit, options.zones)
    const rig = buildVehicles(kit)
    const sky = scene.children.find((o) => o.userData.followCamera)

    const state = createVehicleState(GARDEN.start.x, GARDEN.start.z, GARDEN.start.heading)
    let kind: VehicleKind = 'car'
    const input: VehicleInput = { up: false, down: false, left: false, right: false, boost: false, brake: false }
    let focused: ZoneVisual | null = null
    let focusedSlug: string | null = null
    let dive: { visual: ZoneVisual; from: { position: Vec3; look: Vec3 }; elapsed: number } | null = null
    let entered = false
    let ready = false
    let clock = 0

    const CAM_OFF = new THREE.Vector3(7, 21, 27)
    const FOCUS_OFF = new THREE.Vector3(4, 10, 22)
    const Y_AXIS = new THREE.Vector3(0, 1, 0)
    const camTarget = new THREE.Vector3(state.x, 0, state.z - 9)
    const camLook = camTarget.clone()
    let camYaw = state.heading
    let focus = 0
    let orbit = createOrbit()
    let introStart: IntroClock = reducedMotion ? null : readIntroClock()
    let introCap = 1
    let introSkipped = false
    const ray = new THREE.Raycaster()
    const fade = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({
        color: color('background'),
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        fog: false
      })
    )
    fade.position.z = -1.1
    fade.renderOrder = 999
    fade.visible = false
    camera.add(fade)

    const startDive = (visual: ZoneVisual) => {
      if (entered) return
      entered = true
      if (reducedMotion) {
        options.onEnterZone(visual.zone.slug)
        return
      }
      dive = { visual, from: { position: { ...camera.position }, look: { ...camLook } }, elapsed: 0 }
      fade.visible = true
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || overlayOpen() || event.metaKey || event.ctrlKey || event.altKey || dive || entered)
        return
      skipIntro()
      const zoomStep = ZOOM_KEYS[event.code]
      if (zoomStep) {
        orbit = zoomOrbitBySteps(orbit, zoomStep)
        event.preventDefault()
        return
      }
      const key = KEY_TO_INPUT[event.code]
      if (key) {
        input[key] = true
        event.preventDefault()
        return
      }
      if (event.code === 'KeyV' && !event.repeat) {
        kind = kind === 'car' ? 'horse' : 'car'
        rig.setKind(kind)
      }
      if ((event.code === 'Enter' || event.code === 'NumpadEnter') && focused) {
        event.preventDefault()
        startDive(focused)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const key = KEY_TO_INPUT[event.code]
      if (key) input[key] = false
    }
    const releaseAll = () => {
      for (const key of Object.keys(input) as (keyof VehicleInput)[]) input[key] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', releaseAll)
    // Crochet de test (e2e) : `canvas.dispatchEvent(new CustomEvent('world:teleport', { detail: { x, z, heading } }))`.
    let teleported = false
    const onTeleport = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; z: number; heading?: number }>).detail
      if (!detail || dive || entered) return
      state.x = detail.x
      state.z = detail.z
      state.heading = detail.heading ?? state.heading
      state.speed = 0
      camYaw = state.heading
      resolveCollisions(state, kit.colliders, GARDEN.bounds)
      rig.pose(state, 0)
      teleported = true
    }
    canvas.addEventListener('world:teleport', onTeleport)

    const placeCamera = (dt: number, snap: boolean) => {
      const fx = -Math.sin(state.heading)
      const fz = -Math.cos(state.heading)
      const look = lookAhead(orbit)
      const ahead = (9 + Math.max(state.speed, 0) * 0.25) * look
      const wantFocus = focused && Math.abs(state.speed) < 4 ? 1 : 0
      focus = snap || reducedMotion ? wantFocus : lerp(focus, wantFocus, 1 - Math.exp(-2.5 * dt))
      let tx = state.x + fx * ahead
      let tz = state.z + fz * ahead
      let ty = (1 - look) * 1.2
      if (focused) {
        tx = lerp(tx, focused.zone.x, focus * 0.55)
        tz = lerp(tz, focused.zone.z, focus * 0.55)
        ty += focus * focused.headY * 0.6
      }
      const target = new THREE.Vector3(tx, ty, tz)
      if (snap || reducedMotion) camTarget.copy(target)
      else camTarget.lerp(target, 1 - Math.exp(-3.2 * dt))
      if (Math.abs(state.speed) > 1.5)
        camYaw += angleDiff(state.heading, camYaw) * (snap || reducedMotion ? 1 : 1 - Math.exp(-1.5 * dt))
      const offset = applyOrbit(CAM_OFF.clone().lerp(FOCUS_OFF, focus), orbit)
      camera.position
        .copy(camTarget)
        .addScaledVector(
          new THREE.Vector3(offset.x, offset.y, offset.z).applyAxisAngle(Y_AXIS, camYaw),
          1 + Math.max(state.speed, 0) * 0.008
        )
      const from = camTarget.clone()
      from.y += 2
      const dir = camera.position.clone().sub(from)
      const dist = dir.length()
      dir.normalize()
      ray.set(from, dir)
      ray.far = dist
      const hit = ray.intersectObjects(kit.occluders, true).find((h) => h.distance > 4)
      if (hit) camera.position.copy(from).addScaledVector(dir, Math.max(5, hit.distance - 1.5))
      camera.lookAt(camTarget)
      camLook.copy(camTarget)
    }

    const skipIntro = () => {
      if (introStart === null || introSkipped) return
      introSkipped = true
      writeIntro(INTRO_DONE)
    }
    const applyIntro = (dt: number) => {
      if (introStart === null) return
      if (introStart === 'fresh' && dt > 0) {
        introStart = Date.now()
        writeIntro(String(introStart))
      }
      const elapsed = introStart === 'fresh' ? 0 : Date.now() - introStart
      if (introSkipped) introCap *= Math.exp(-4 * dt)
      const w = introWeight(elapsed) * introCap
      let distance = camera.position.distanceTo(camTarget)
      if (w > 0.002) {
        const pose = blendIntro({ position: camera.position, look: camTarget }, elapsed, w)
        camera.position.set(pose.position.x, pose.position.y, pose.position.z)
        camLook.set(pose.look.x, pose.look.y, pose.look.z)
        camera.lookAt(camLook)
        distance = camera.position.distanceTo(camLook)
      } else {
        introStart = null
        writeIntro(INTRO_DONE)
      }
      const range = fogForDistance(distance)
      fog.near = range.near
      fog.far = range.far
      if (Math.abs(range.cameraFar - camera.far) > 1) {
        camera.far = range.cameraFar
        camera.updateProjectionMatrix()
      }
    }

    let drag: { id: number; x: number; y: number } | null = null
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || overlayOpen() || dive || entered) return
      skipIntro()
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      orbit = dragOrbit(orbit, event.clientX - drag.x, event.clientY - drag.y)
      drag.x = event.clientX
      drag.y = event.clientY
    }
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      drag = null
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    }
    const onWheel = (event: WheelEvent) => {
      if (overlayOpen() || dive || entered) return
      event.preventDefault()
      skipIntro()
      orbit = zoomOrbit(orbit, event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY)
    }
    const onDoubleClick = () => {
      if (!dive && !entered) orbit = resetOrbit()
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDoubleClick)

    const playerView = { x: state.x, z: state.z, speed: 0, heading: state.heading }
    const animate = (dt: number) => {
      if (!dive) {
        stepVehicle(
          state,
          entered ? { up: false, down: false, left: false, right: false, boost: false, brake: true } : input,
          dt,
          VEHICLE_PARAMS[kind]
        )
        resolveCollisions(state, kit.colliders, GARDEN.bounds)
        rig.pose(state, dt)
        const zone = zoneAt(options.zones, state.x, state.z)
        const slug = zone ? zone.slug : null
        if (slug !== focusedSlug) {
          focusedSlug = slug
          focused = visuals.find((v) => v.zone.slug === slug) ?? null
          options.onZoneFocus(slug)
        }
        orbit = relaxOrbit(orbit, dt, Math.abs(state.speed) > 1.5 && !drag)
        placeCamera(dt, teleported)
        applyIntro(dt)
        teleported = false
      } else {
        dive.elapsed += dt * 1000
        const t = diveProgress(dive.elapsed)
        const e = easeInOutCubic(t)
        const to = diveTarget(dive.visual.zone, dive.visual.headY, dive.visual.headRadius)
        const p = lerpVec(dive.from.position, to.position, e)
        const l = lerpVec(dive.from.look, to.look, e)
        camera.position.set(p.x, p.y, p.z)
        camLook.set(l.x, l.y, l.z)
        camera.lookAt(camLook)
        dive.visual.head.scale.setScalar(diveFlowerScale(t))
        ;(fade.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = diveFade(t)
        if (t >= 1) {
          const slug = dive.visual.zone.slug
          dive = null
          options.onEnterZone(slug)
        }
      }
      for (const v of visuals) {
        const on = v === focused
        v.ring.opacity = lerp(v.ring.opacity, on ? 1 : 0.45, reducedMotion ? 1 : 1 - Math.exp(-8 * dt))
        if (!reducedMotion && (!dive || dive.visual !== v)) {
          v.head.rotation.z = Math.sin(clock * 0.9 + v.phase) * 0.06
          v.head.rotation.x = Math.cos(clock * 0.7 + v.phase) * 0.04
        }
      }
      playerView.x = state.x
      playerView.z = state.z
      playerView.speed = state.speed
      playerView.heading = state.heading
      if (!reducedMotion) garden.update(dt, clock, playerView, camLook, camera.quaternion)
      sun.position.set(camLook.x + 36, 46, camLook.z + 24)
      sun.target.position.copy(camLook)
      if (sky) sky.position.copy(camera.position)
    }

    rig.setKind(kind)
    rig.pose(state, 0)
    placeCamera(0, true)
    applyIntro(0)
    garden.update(0, 0, playerView, camLook, camera.quaternion)

    const resize = (next: StageSize) => {
      renderer.setPixelRatio(next.pixelRatio)
      renderer.setSize(next.width, next.height, false)
      camera.aspect = next.width / Math.max(1, next.height)
      camera.updateProjectionMatrix()
    }

    return {
      resize,
      frame: ({ delta }) => {
        const dt = Math.min(delta / 1000, 0.05)
        clock += dt
        animate(dt)
        renderer.render(scene, camera)
        if (!ready) {
          ready = true
          options.onReady()
        }
      },
      dispose: () => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
        window.removeEventListener('blur', releaseAll)
        canvas.removeEventListener('world:teleport', onTeleport)
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerUp)
        canvas.removeEventListener('wheel', onWheel)
        canvas.removeEventListener('dblclick', onDoubleClick)
        const textures = new Set<Texture>()
        const materials = new Set<Material>()
        scene.traverse((object: Object3D) => {
          const mesh = object as Mesh
          mesh.geometry?.dispose()
          const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
          for (const m of list) {
            materials.add(m)
            const map = (m as Material & { map?: Texture | null }).map
            if (map) textures.add(map)
          }
        })
        for (const t of textures) t.dispose()
        for (const m of materials) m.dispose()
        // Le contexte WebGL survit à la scène (même canvas quand `zones` change) : sans remise à zéro, UNPACK_FLIP_Y
        // laissé par les textures canvas fait avertir le renderer suivant à son initialisation (texImage3D).
        renderer.resetState()
        renderer.dispose()
      }
    }
  }
}
