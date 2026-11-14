'use client'

import type { Cosmograph, CosmographConfig } from '@cosmograph/cosmograph'
import { Maximize2, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { AmendmentGraph, AmendmentGraphNode } from '../lib/graph'
import type { GraphCanvasProps } from './graph-canvas-types'

type Status = 'loading' | 'ready' | 'error'

type Palette = Record<
  'bill' | 'article' | 'amendment' | 'link' | 'subLink' | 'background' | 'foreground' | 'ring',
  string
>

const PALETTE_TOKENS: Record<keyof Palette, string> = {
  bill: '--color-foreground',
  article: '--color-chart-2',
  amendment: '--color-chart-1',
  link: '--color-muted-foreground',
  subLink: '--color-chart-3',
  background: '--color-background',
  foreground: '--color-foreground',
  ring: '--color-ring'
}

const ZOOM_STEP = 1.5
// Keep framing immediate; the force animation has its own pause/resume control.
const ANIMATION_MS = 0

function hasWebGl(): boolean {
  const probe = document.createElement('canvas')
  return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
}

// Cosmograph needs concrete colour values: semantic tokens are resolved through a 1-pixel canvas into sRGB hex.
function resolvePalette(element: HTMLElement): Palette {
  const style = getComputedStyle(element)
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const context = probe.getContext('2d', { willReadFrequently: true })
  const resolve = (token: string) => {
    const value = style.getPropertyValue(token).trim()
    if (!context || !value) throw new Error(`Design token ${token} is not resolvable`)
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    return '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')
  }
  return Object.fromEntries(Object.entries(PALETTE_TOKENS).map(([key, token]) => [key, resolve(token)])) as Palette
}

function buildConfig(
  graph: AmendmentGraph,
  palette: Palette,
  callbacks: Pick<
    CosmographConfig,
    | 'onPointClick'
    | 'onLabelClick'
    | 'onGraphRebuilt'
    | 'onGraphRebuildError'
    | 'onSimulationPause'
    | 'onSimulationUnpause'
    | 'onSimulationEnd'
    | 'onSimulationStart'
    | 'onSimulationRestart'
  >
): CosmographConfig {
  const indexById = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const points = graph.nodes.map((node, index) => ({
    id: node.id,
    index,
    kind: node.kind,
    label: node.label,
    size: node.radius
  }))
  const links = graph.edges.flatMap((edge) => {
    const sourceIndex = indexById.get(edge.source)
    const targetIndex = indexById.get(edge.target)
    if (sourceIndex === undefined || targetIndex === undefined) return []
    return [{ id: edge.id, source: edge.source, target: edge.target, sourceIndex, targetIndex, kind: edge.kind }]
  })
  const colorOf = (kind: unknown) => palette[(kind as AmendmentGraphNode['kind']) ?? 'amendment'] ?? palette.amendment
  return {
    points,
    links,
    pointIdBy: 'id',
    pointIndexBy: 'index',
    pointLabelBy: 'label',
    pointColorBy: 'kind',
    pointColorByFn: colorOf,
    pointSizeBy: 'size',
    pointSizeByFn: (size: unknown) => Number(size),
    linkSourceBy: 'source',
    linkSourceIndexBy: 'sourceIndex',
    linkTargetBy: 'target',
    linkTargetIndexBy: 'targetIndex',
    linkColorBy: 'kind',
    linkColorByFn: (kind: unknown) => (kind === 'sub-amendment' ? palette.subLink : palette.link),
    linkWidthBy: 'kind',
    linkWidthByFn: (kind: unknown) => (kind === 'sub-amendment' ? 3 : 1),
    linkDefaultArrows: false,
    backgroundColor: palette.background,
    pointLabelColor: palette.foreground,
    pointLabelClassName: 'bg-background! text-foreground! rounded-sm border px-1 shadow-sm',
    hoveredPointLabelClassName: 'bg-background! text-foreground! rounded-sm border px-1 shadow-sm',
    pointLabelPosition: 'above',
    showLabels: true,
    showLabelsFor: graph.nodes.map((node) => node.id),
    showDynamicLabels: false,
    showTopLabels: false,
    showHoveredPointLabel: true,
    showSelectedLabels: true,
    showUnselectedPointLabels: true,
    focusedPointRingColor: palette.ring,
    hoveredPointRingColor: palette.ring,
    renderHoveredPointRing: true,
    hoveredPointCursor: 'pointer',
    pointGreyoutOpacity: 0.35,
    enableSimulation: true,
    randomSeed: 'pfas-senat-620',
    simulationLinkDistance: 12,
    simulationRepulsion: 1.2,
    simulationGravity: 0.2,
    fitViewOnInit: true,
    fitViewDelay: 800,
    fitViewPadding: 0.2,
    selectPointOnClick: false,
    selectPointOnLabelClick: false,
    focusPointOnClick: false,
    focusPointOnLabelClick: false,
    resetSelectionOnEmptyCanvasClick: false,
    statusIndicatorMode: false,
    ...callbacks
  }
}

/** Cosmograph (GPU) renderer for the PFAS amendment graph. Layout is a force simulation: positions carry no meaning. */
export function CosmographCanvas({ graph, focusedId, selectedIds, onFocus, onReady, labels }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<Cosmograph | null>(null)
  const paletteRef = useRef<Palette | null>(null)
  const graphRef = useRef(graph)
  const onFocusRef = useRef(onFocus)
  const onReadyRef = useRef(onReady)
  const loadStartRef = useRef(0)
  const [status, setStatus] = useState<Status>('loading')
  const [running, setRunning] = useState(true)
  const [counts, setCounts] = useState<{ points: number; links: number } | null>(null)

  useEffect(() => {
    graphRef.current = graph
    onFocusRef.current = onFocus
    onReadyRef.current = onReady
  })

  const callbacksRef = useRef<Parameters<typeof buildConfig>[2] | null>(null)
  if (!callbacksRef.current) {
    callbacksRef.current = {
      onLabelClick: (_index, id) => onFocusRef.current(id),
      onPointClick: (index) => {
        const instance = instanceRef.current
        if (!instance) return
        void instance.getPointIdsByIndices([index]).then((ids) => {
          const id = ids?.[0]
          if (id && instanceRef.current === instance) onFocusRef.current(id)
        })
      },
      onGraphRebuilt: (stats) => {
        setCounts({ points: stats.pointsCount, links: stats.linksCount })
        setStatus('ready')
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) instanceRef.current?.pause()
        setRunning(instanceRef.current?.isSimulationRunning ?? false)
        onReadyRef.current?.({ loadMs: Math.round(performance.now() - loadStartRef.current) })
      },
      onGraphRebuildError: () => setStatus('error'),
      onSimulationStart: () => setRunning(true),
      onSimulationRestart: () => setRunning(true),
      onSimulationUnpause: () => setRunning(true),
      onSimulationPause: () => setRunning(false),
      onSimulationEnd: () => setRunning(false)
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    // Each instance owns its host node so an async destroy can never remove a newer canvas.
    const host = document.createElement('div')
    host.className = 'absolute inset-0'
    container.appendChild(host)
    loadStartRef.current = performance.now()
    if (!hasWebGl()) {
      setStatus('error')
      host.remove()
      return
    }
    import('@cosmograph/cosmograph')
      .then(({ Cosmograph: CosmographClass }) => {
        if (cancelled || !callbacksRef.current) return
        paletteRef.current = resolvePalette(container)
        instanceRef.current = new CosmographClass(
          host,
          buildConfig(graphRef.current, paletteRef.current, callbacksRef.current)
        )
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      const instance = instanceRef.current
      instanceRef.current = null
      if (instance) void instance.destroy().finally(() => host.remove())
      else host.remove()
    }
  }, [])

  const lastGraphRef = useRef(graph)
  useEffect(() => {
    if (lastGraphRef.current === graph) return
    lastGraphRef.current = graph
    const instance = instanceRef.current
    if (!instance || !paletteRef.current || !callbacksRef.current) return
    loadStartRef.current = performance.now()
    setStatus('loading')
    instance.setConfig(buildConfig(graph, paletteRef.current, callbacksRef.current)).catch(() => setStatus('error'))
  }, [graph])

  const selectionKey = selectedIds.join('|')
  useEffect(() => {
    const instance = instanceRef.current
    if (!instance || status !== 'ready') return
    const indexById = new Map(graph.nodes.map((node, index) => [node.id, index]))
    const selected = selectionKey
      .split('|')
      .map((id) => indexById.get(id))
      .filter((index): index is number => index !== undefined)
    if (selected.length) instance.selectPoints(selected, false, false)
    else instance.unselectAllPoints()
    instance.setFocusedPoint(focusedId ? indexById.get(focusedId) : undefined)
  }, [graph, focusedId, selectionKey, status])

  const instance = () => (status === 'ready' ? instanceRef.current : null)
  const zoomBy = (factor: number) => {
    const current = instance()
    if (!current) return
    current.setZoomLevel((current.getZoomLevel() ?? 1) * factor, ANIMATION_MS)
  }
  const toggleSimulation = () => {
    const current = instance()
    if (!current) return
    if (current.isSimulationRunning) current.pause()
    // A stopped graph can report progress zero with alpha zero; unpause would immediately stop again.
    else current.start(0.3)
    setRunning(current.isSimulationRunning ?? false)
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label={labels.zoomIn}
          title={labels.zoomIn}
          disabled={status !== 'ready'}
          onClick={() => zoomBy(ZOOM_STEP)}
        >
          <ZoomIn aria-hidden />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label={labels.zoomOut}
          title={labels.zoomOut}
          disabled={status !== 'ready'}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        >
          <ZoomOut aria-hidden />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label={labels.reset}
          title={labels.reset}
          disabled={status !== 'ready'}
          onClick={() => instance()?.fitView(ANIMATION_MS, 0.2)}
        >
          <Maximize2 aria-hidden />
        </Button>
        <Button
          type='button'
          variant='outline'
          disabled={status !== 'ready'}
          aria-pressed={!running}
          onClick={toggleSimulation}
        >
          {running ? <Pause aria-hidden /> : <Play aria-hidden />}
          {running ? labels.pause : labels.resume}
        </Button>
      </div>
      <div
        ref={containerRef}
        role='img'
        aria-label={labels.canvas}
        aria-busy={status === 'loading'}
        data-renderer='cosmograph'
        data-status={status}
        data-points={counts?.points}
        data-links={counts?.links}
        data-simulation={running ? 'running' : 'paused'}
        className='bg-background relative h-120 w-full overflow-hidden rounded-lg border'
      >
        {status !== 'ready' && (
          <div
            role={status === 'error' ? 'alert' : 'status'}
            className={cn(
              'absolute inset-0 z-10 flex items-center justify-center p-4 text-center text-sm',
              status === 'error' ? 'bg-feedback-danger-soft text-foreground' : 'bg-background/80 text-muted-foreground'
            )}
          >
            {status === 'error' ? labels.error : labels.loading}
          </div>
        )}
      </div>
    </div>
  )
}
