'use client'

import { Maximize2, Minus, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { graphViewBox } from '../lib/graph'
import type { GraphCanvasProps } from './graph-canvas-types'

export function NativeGraphCanvas({ graph, focusedId, selectedIds, onFocus, onReady, labels }: GraphCanvasProps) {
  const t = useTranslations('pfasExperiment.graph')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; pan: typeof pan; scale: number } | null>(null)
  const byId = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph])
  const reset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  useEffect(() => {
    const start = performance.now()
    const frame = requestAnimationFrame(() => onReady?.({ loadMs: performance.now() - start }))
    return () => cancelAnimationFrame(frame)
  }, [graph, onReady])

  return (
    <div
      className='bg-background relative min-w-0 overflow-hidden rounded-lg border'
      data-testid='native-graph'
      data-ready='true'
      data-node-count={graph.nodes.length}
      data-amendment-count={graph.nodes.filter((node) => node.kind === 'amendment').length}
    >
      <div className='bg-background absolute top-3 left-3 z-10 flex gap-1 rounded-md border p-1'>
        <Button
          variant='ghost'
          size='icon'
          aria-label={labels.zoomIn}
          onClick={() => setZoom((value) => Math.min(4, value * 1.3))}
        >
          <Plus aria-hidden='true' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          aria-label={labels.zoomOut}
          onClick={() => setZoom((value) => Math.max(0.75, value / 1.3))}
        >
          <Minus aria-hidden='true' />
        </Button>
        <Button variant='ghost' size='icon' aria-label={labels.reset} onClick={reset}>
          <Maximize2 aria-hidden='true' />
        </Button>
      </div>
      <svg
        role='group'
        aria-label={labels.canvas}
        data-testid='pfas-graph-svg'
        viewBox={graphViewBox(zoom, pan)}
        className='h-96 w-full touch-none select-none sm:h-128'
        onPointerDown={(event) => {
          if (event.button !== 0) return
          const rect = event.currentTarget.getBoundingClientRect()
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            pan,
            scale: Math.max(1000 / zoom / rect.width, 600 / zoom / rect.height)
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const start = drag.current
          if (start?.id === event.pointerId)
            setPan({
              x: start.pan.x - (event.clientX - start.x) * start.scale,
              y: start.pan.y - (event.clientY - start.y) * start.scale
            })
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
      >
        <title>{labels.canvas}</title>
        {graph.edges.map((edge) => {
          const source = byId.get(edge.source)
          const target = byId.get(edge.target)
          if (!source || !target) return null
          const highlighted = edge.source === focusedId || edge.target === focusedId
          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              data-testid={edge.kind === 'sub-amendment' ? 'graph-sub-amendment-edge' : undefined}
              data-source={edge.source}
              data-target={edge.target}
              strokeWidth={highlighted ? 3 : 1.5}
              strokeDasharray={edge.kind === 'sub-amendment' ? '5 4' : undefined}
              className={cn(
                edge.kind === 'sub-amendment' ? 'stroke-chart-3' : 'stroke-muted-foreground/40',
                focusedId && !highlighted && 'opacity-40'
              )}
            />
          )
        })}
        {graph.nodes.map((node) => {
          const selected = selectedIds.includes(node.id)
          const focused = node.id === focusedId
          const articleLabel = node.label
            .replace('art. add. après Article ', 'Après ')
            .replace('art. add. avant Article ', 'Avant ')
            .split(' ')
          return (
            <g
              key={node.id}
              role='button'
              tabIndex={0}
              aria-pressed={focused}
              aria-label={t(node.kind === 'amendment' ? 'inspect' : 'filterNode', { label: node.label })}
              data-testid={`graph-node-${node.id}`}
              className='group cursor-pointer outline-none'
              transform={`translate(${node.x} ${node.y})`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onFocus(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onFocus(node.id)
                }
              }}
            >
              <title>{node.label}</title>
              <circle
                r={node.radius + 6}
                strokeWidth={3}
                className={cn(
                  'group-focus-visible:stroke-ring fill-none stroke-transparent',
                  focused && 'stroke-primary'
                )}
              />
              <circle
                r={node.radius}
                strokeWidth={selected ? 3 : 2}
                className={cn(
                  node.kind === 'amendment'
                    ? 'fill-background stroke-chart-1'
                    : node.kind === 'article'
                      ? 'fill-muted stroke-chart-2'
                      : 'fill-foreground stroke-foreground',
                  selected && 'fill-primary stroke-primary'
                )}
              />
              <text
                textAnchor='middle'
                className={cn(
                  'pointer-events-none text-sm font-semibold',
                  node.kind === 'bill' || selected ? 'fill-primary-foreground' : 'fill-foreground'
                )}
              >
                {node.kind === 'article' ? (
                  <>
                    <tspan x={0} y={-3}>
                      {articleLabel[0]}
                    </tspan>
                    <tspan x={0} y={14}>
                      {articleLabel.slice(1).join(' ')}
                    </tspan>
                  </>
                ) : (
                  <tspan x={0} y={5}>
                    {node.kind === 'amendment' ? node.label.split(' ')[0] : node.label}
                  </tspan>
                )}
              </text>
              {selected && (
                <text x={node.radius + 4} y={-node.radius} className='fill-primary text-sm font-bold'>
                  ✓
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
