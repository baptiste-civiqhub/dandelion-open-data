import type { StoreApi } from 'zustand'

import type { StageSceneFactory, StageSize } from '@/lib/stage/stage-scene'

import type { HoverStoreState, ViewStoreState } from '../hooks/use-sunburst-store'
import { matchesFilters, NO_FILTERS } from '../lib/sunburst-filters'
import {
  diskLayout,
  easeInOutCubic,
  hitTest,
  lerpWindow,
  TAU,
  windowOf,
  type Disk,
  type ViewWindow
} from '../lib/sunburst-geometry'
import { pathTo, type SunburstNode, type SunburstTree } from '../lib/sunburst-tree'

export type SunburstSceneOptions = {
  /** `null` pendant le chargement : le disque montre des anneaux vides (AC-P1). */
  tree: SunburstTree | null
  view: StoreApi<ViewStoreState>
  hover: StoreApi<HoverStoreState>
  /** Variable CSS de la couleur d'un sort (série `chart-*`). */
  sortColorVariable: (sort: string) => string
  /** Textes déjà traduits dessinés au centre du disque. */
  text: { count: (count: number) => string; noAmendment: string; up: string }
}

/** Réglages du mouvement (§ 8). Durées en ms, amplitudes en px. */
const MOTION = {
  zoomMs: 520,
  revealMs: 750,
  revealRingStagger: 0.12,
  enterTau: 40,
  leaveTau: 75,
  liftPx: 5,
  pressPx: 3,
  pathStaggerMs: 45,
  dim: 0.26,
  filteredOut: 0.14
}

const LABEL_FONT_PX = 12
const CENTER_LABEL_PX = 15

/**
 * Le disque « pissenlit » (sunburst) de la page de zone. Canvas 2D dans `StageCanvas` : seuls les secteurs visibles
 * sont parcourus (recherche dichotomique par profondeur), et rien n'est redessiné quand rien ne bouge. L'état vient
 * de deux stores : la vue épinglée (focus, sélection, filtres) et le survol, que la scène lit sans passer par React.
 */
export function createSunburstScene(options: SunburstSceneOptions): StageSceneFactory {
  return ({ canvas, size, reducedMotion }) => {
    const context = canvas.getContext('2d')
    if (!context) return {}
    const ctx: CanvasRenderingContext2D = context

    const styles = getComputedStyle(document.documentElement)
    const token = (name: string) => styles.getPropertyValue(name).trim()
    const colors = {
      background: token('--color-background'),
      foreground: token('--color-foreground'),
      muted: token('--color-muted'),
      mutedForeground: token('--color-muted-foreground'),
      border: token('--color-border')
    }
    const sortColor = new Map<string, string>()
    const colorOfSort = (sort: string) => {
      let value = sortColor.get(sort)
      if (value === undefined) {
        value = token(options.sortColorVariable(sort)) || colors.mutedForeground
        sortColor.set(sort, value)
      }
      return value
    }
    const fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif'

    const { tree, view, hover, text } = options
    const count = tree?.nodes.length ?? 0
    const lift = new Float32Array(count)
    const emph = new Float32Array(count).fill(1)
    const outline = new Float32Array(count)
    const filterAlpha = new Float32Array(count).fill(1)
    const filterTarget = new Float32Array(count).fill(1)
    const labelWidth = new Map<SunburstNode, number>()

    let size_: StageSize = size
    let disk: Disk = diskLayout(size.width, size.height)
    let rings = view.getState().depth
    const focusNode = () => tree?.byId.get(view.getState().focusId) ?? tree?.root ?? null
    let win: ViewWindow = focusNode() ? windowOf(focusNode()!) : { x0: 0, x1: 1, depth: 0 }
    let tween: { from: ViewWindow; to: ViewWindow; elapsed: number; ringsFrom: number; ringsTo: number } | null = null
    let ringsAnimated = rings
    let reveal = reducedMotion ? 1 : 0
    let pressed: SunburstNode | 'center' | null = null
    let pathNodes = new Set<SunburstNode>()
    let pathSince = 0
    let clock = 0
    let centerKey = ''
    let centerAlpha = 1
    let dirty = true
    let settled = false

    const computeFilters = () => {
      if (!tree) return
      const { excludedSorts } = view.getState()
      const filters = { ...NO_FILTERS, excludedSorts }
      const matched = new Int32Array(tree.nodes.length)
      for (let i = tree.nodes.length - 1; i >= 0; i--) {
        const node = tree.nodes[i]
        let total = node.amendement && matchesFilters(node.amendement, filters) ? 1 : 0
        for (const child of node.children) total += matched[child.index]
        matched[i] = total
      }
      for (const node of tree.nodes) {
        const ok = node.amendement
          ? matchesFilters(node.amendement, filters)
          : matched[node.index] > 0 || node.value === 0
        filterTarget[node.index] = ok ? 1 : MOTION.filteredOut
      }
      if (reducedMotion) filterAlpha.set(filterTarget)
    }
    computeFilters()

    const onHoverChange = () => {
      const { nodeId } = hover.getState()
      const node = nodeId && tree ? tree.byId.get(nodeId) : undefined
      const next = new Set(node ? pathTo(node) : [])
      if ([...next].some((n) => !pathNodes.has(n)) || next.size !== pathNodes.size) pathSince = clock
      pathNodes = next
      dirty = true
    }
    const unsubscribeHover = hover.subscribe((state, previous) => {
      if (state.nodeId !== previous.nodeId || state.sort !== previous.sort) onHoverChange()
    })
    const unsubscribeView = view.subscribe((state, previous) => {
      if (state.focusId !== previous.focusId || state.depth !== previous.depth) {
        const target = focusNode()
        if (target) {
          const to = windowOf(target)
          if (reducedMotion) {
            win = to
            ringsAnimated = state.depth
          } else tween = { from: win, to, elapsed: 0, ringsFrom: ringsAnimated, ringsTo: state.depth }
        }
        rings = state.depth
        hover.getState().leave()
      }
      if (state.excludedSorts !== previous.excludedSorts) computeFilters()
      dirty = true
    })

    // --- Pointeur ---------------------------------------------------------------------------------------------
    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const hitAt = (x: number, y: number) =>
      tree && !tween ? hitTest(tree, disk, windowOf(focusNode()!), rings, x, y) : ({ kind: 'empty' } as const)
    const onPointerMove = (event: PointerEvent) => {
      const { x, y } = local(event)
      hover.getState().setPointer({ x: event.clientX, y: event.clientY })
      const hit = hitAt(x, y)
      if (hit.kind === 'node') {
        hover.getState().hoverNode(hit.node.id, 'disk')
        canvas.style.cursor = 'pointer'
      } else {
        if (hover.getState().source === 'disk' || hover.getState().source === null) hover.getState().leave()
        canvas.style.cursor = hit.kind === 'center' && focusNode() !== tree?.root ? 'pointer' : 'default'
      }
    }
    const onPointerLeave = () => {
      hover.getState().setPointer(null)
      if (hover.getState().source === 'disk') hover.getState().leave()
      pressed = null
      dirty = true
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const { x, y } = local(event)
      const hit = hitAt(x, y)
      pressed = hit.kind === 'node' ? hit.node : hit.kind === 'center' ? 'center' : null
      dirty = true
    }
    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return
      const { x, y } = local(event)
      const hit = hitAt(x, y)
      const target = hit.kind === 'node' ? hit.node : hit.kind === 'center' ? 'center' : null
      const wasPressed = pressed
      pressed = null
      dirty = true
      if (target !== wasPressed) return
      const state = view.getState()
      if (target === 'center') state.up()
      else if (target === null) state.select(null)
      else if (target.kind === 'amendement') state.select(target.id)
      else state.focus(target.id)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const element = event.target as HTMLElement | null
      if (element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName))) return
      if (document.querySelector('[data-slot=overlay-window]')) return
      view.getState().up()
    }
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKeyDown)

    // --- Dessin -----------------------------------------------------------------------------------------------
    const approach = (value: number, target: number, dtMs: number) => {
      if (reducedMotion) return target
      const tau = target > value ? MOTION.enterTau : MOTION.leaveTau
      const next = value + (target - value) * (1 - Math.exp(-dtMs / tau))
      if (Math.abs(next - target) > 0.002) settled = false
      return Math.abs(next - target) < 0.002 ? target : next
    }

    const sector = (cx: number, cy: number, inner: number, outer: number, a0: number, a1: number) => {
      ctx.beginPath()
      ctx.arc(cx, cy, outer, a0 - Math.PI / 2, a1 - Math.PI / 2)
      ctx.arc(cx, cy, inner, a1 - Math.PI / 2, a0 - Math.PI / 2, true)
      ctx.closePath()
    }

    const drawEmptyRings = () => {
      const width = (disk.r1 - disk.r0) / rings
      ctx.fillStyle = colors.muted
      for (let ring = 0; ring < rings; ring++) {
        ctx.globalAlpha = 0.9 - ring * 0.2
        sector(disk.cx, disk.cy, disk.r0 + ring * width + 1, disk.r0 + (ring + 1) * width - 1, 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const draw = (dtMs: number) => {
      ctx.setTransform(size_.pixelRatio, 0, 0, size_.pixelRatio, 0, 0)
      ctx.clearRect(0, 0, size_.width, size_.height)
      if (!tree) {
        drawEmptyRings()
        return
      }

      const state = hover.getState()
      const hovered = state.nodeId ? tree.byId.get(state.nodeId) : undefined
      const hoverSort = state.sort
      const highlight = !!hovered || !!hoverSort
      const selected = view.getState().selectionId ? tree.byId.get(view.getState().selectionId!) : undefined
      const span = win.x1 - win.x0 || 1
      const ringWidth = (disk.r1 - disk.r0) / ringsAnimated
      const first = Math.max(1, Math.floor(win.depth))
      const last = Math.ceil(win.depth + ringsAnimated + 1)
      const { cx, cy, r0 } = disk

      const outlines: {
        node: SunburstNode
        inner: number
        outer: number
        a0: number
        a1: number
        ox: number
        oy: number
        width: number
        alpha: number
      }[] = []

      for (let depth = first; depth <= last; depth++) {
        const row = tree.byDepth[depth]
        if (!row) continue
        const ringF = depth - win.depth
        if (ringF <= 0) continue
        const ringAlpha = Math.min(1, ringF, ringsAnimated + 1 - ringF)
        if (ringAlpha <= 0) continue
        const revealLimit =
          Math.min(
            1,
            Math.max(0, (reveal - (ringF - 1) * MOTION.revealRingStagger) / (1 - MOTION.revealRingStagger * 2))
          ) * TAU
        if (revealLimit <= 0) continue
        const inner = Math.max(r0, r0 + (ringF - 1) * ringWidth) + 1
        const outer = Math.max(inner, r0 + ringF * ringWidth) - 1
        const midRadius = (inner + outer) / 2

        let lo = 0
        let hi = row.length
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (row[mid].x1 <= win.x0) lo = mid + 1
          else hi = mid
        }
        for (let k = lo; k < row.length; k++) {
          const node = row[k]
          if (node.x0 >= win.x1) break
          const i = node.index
          let a0 = Math.max(0, ((node.x0 - win.x0) / span) * TAU)
          let a1 = Math.min(TAU, ((node.x1 - win.x0) / span) * TAU)
          a1 = Math.min(a1, revealLimit)
          if (a1 - a0 < 0.0004) continue

          const inPath = hovered ? pathNodes.has(node) : false
          const underHovered = hovered && node.depth > hovered.depth && node.x0 >= hovered.x0 && node.x1 <= hovered.x1
          const lit = !highlight
            ? true
            : hovered
              ? inPath || underHovered
              : node.amendement
                ? node.amendement.sort === hoverSort
                : false
          emph[i] = approach(emph[i], lit ? 1 : MOTION.dim, dtMs)
          lift[i] = approach(lift[i], pressed === node ? -1 : hovered === node ? 1 : 0, dtMs)
          filterAlpha[i] = reducedMotion ? filterTarget[i] : approach(filterAlpha[i], filterTarget[i], dtMs * 0.6)
          const outlineDelay = (ringF - 1) * MOTION.pathStaggerMs
          const wantOutline = inPath && clock - pathSince >= outlineDelay / 1000 ? 1 : 0
          outline[i] = approach(outline[i], wantOutline, dtMs)

          const pad = Math.min(0.7 / midRadius, (a1 - a0) * 0.2)
          a0 += pad
          a1 -= pad
          const mid = (a0 + a1) / 2
          const offset = lift[i] * (lift[i] > 0 ? MOTION.liftPx : MOTION.pressPx)
          const ox = Math.sin(mid) * offset
          const oy = -Math.cos(mid) * offset

          ctx.globalAlpha = ringAlpha * emph[i] * filterAlpha[i] * (node.amendement ? 1 : 0.95)
          ctx.fillStyle = node.amendement ? colorOfSort(node.amendement.sort) : colors.muted
          sector(cx + ox, cy + oy, inner, outer, a0, a1)
          ctx.fill()
          if (node.dashed) {
            ctx.setLineDash([3, 3])
            ctx.strokeStyle = colors.mutedForeground
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.setLineDash([])
          }

          if (!node.amendement && outer - inner >= LABEL_FONT_PX + 6) {
            let width = labelWidth.get(node)
            ctx.font = `500 ${LABEL_FONT_PX}px ${fontFamily}`
            if (width === undefined) {
              width = ctx.measureText(node.label).width
              labelWidth.set(node, width)
            }
            const arc = (a1 - a0) * midRadius
            const chord = 2 * midRadius * Math.sin(Math.min(Math.PI / 2, (a1 - a0) / 2))
            if (Math.min(arc, chord) >= width + 12 && outer - inner >= LABEL_FONT_PX + 8) {
              ctx.fillStyle = colors.foreground
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(node.label, cx + ox + Math.sin(mid) * midRadius, cy + oy - Math.cos(mid) * midRadius)
            }
          }

          if (outline[i] > 0.01 || node === selected) {
            outlines.push({
              node,
              inner,
              outer,
              a0,
              a1,
              ox,
              oy,
              width: node === selected ? 2.5 : 1.5,
              alpha: ringAlpha * Math.max(outline[i], node === selected ? 1 : 0)
            })
          }
        }
      }

      ctx.strokeStyle = colors.foreground
      for (const o of outlines) {
        ctx.globalAlpha = o.alpha
        ctx.lineWidth = o.width
        sector(cx + o.ox, cy + o.oy, o.inner, o.outer, o.a0, o.a1)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      drawCenter(dtMs, hovered)
    }

    const drawCenter = (dtMs: number, hovered: SunburstNode | undefined) => {
      if (!tree) return
      const focus = focusNode()!
      const subject = hovered ?? focus
      const key = `${subject.id}`
      if (key !== centerKey) {
        centerKey = key
        centerAlpha = reducedMotion ? 1 : 0
      }
      centerAlpha = approach(centerAlpha, 1, dtMs)
      const { cx, cy, r0 } = disk
      ctx.globalAlpha = 1
      ctx.fillStyle = colors.background
      ctx.beginPath()
      ctx.arc(cx, cy, r0 - 2, 0, TAU)
      ctx.fill()
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.globalAlpha = centerAlpha
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = colors.foreground
      let labelSize = CENTER_LABEL_PX
      ctx.font = `600 ${labelSize}px ${fontFamily}`
      while (labelSize > 10 && ctx.measureText(subject.label).width > r0 * 1.7) {
        labelSize -= 1
        ctx.font = `600 ${labelSize}px ${fontFamily}`
      }
      let label = subject.label
      while (label.length > 4 && ctx.measureText(label).width > r0 * 1.7) label = `${label.slice(0, -2)}…`
      ctx.fillText(label, cx, cy - 8)
      ctx.font = `400 12px ${fontFamily}`
      ctx.fillStyle = colors.mutedForeground
      ctx.fillText(
        subject.value === 0 && subject === tree.root ? text.noAmendment : text.count(subject.value),
        cx,
        cy + 12
      )
      if (!hovered && focus !== tree.root) {
        ctx.font = `500 11px ${fontFamily}`
        ctx.fillText(text.up, cx, cy - r0 * 0.55)
      }
      ctx.globalAlpha = 1
    }

    const resize = (next: StageSize) => {
      size_ = next
      disk = diskLayout(next.width, next.height)
      dirty = true
    }

    return {
      resize,
      frame: ({ delta }) => {
        const dtMs = Math.min(delta, 50)
        clock += dtMs / 1000
        let moving = false
        if (reveal < 1) {
          reveal = Math.min(1, reveal + dtMs / MOTION.revealMs)
          moving = true
        }
        if (tween) {
          tween.elapsed += dtMs
          const t = Math.min(1, tween.elapsed / MOTION.zoomMs)
          const e = easeInOutCubic(t)
          win = lerpWindow(tween.from, tween.to, e)
          ringsAnimated = tween.ringsFrom + (tween.ringsTo - tween.ringsFrom) * e
          if (t >= 1) {
            win = tween.to
            ringsAnimated = tween.ringsTo
            tween = null
          }
          moving = true
        }
        if (!dirty && !moving && settled) return
        settled = true
        dirty = false
        draw(dtMs)
      },
      dispose: () => {
        unsubscribeHover()
        unsubscribeView()
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerleave', onPointerLeave)
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('keydown', onKeyDown)
        canvas.style.cursor = ''
      }
    }
  }
}
