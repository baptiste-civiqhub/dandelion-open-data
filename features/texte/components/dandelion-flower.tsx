'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import type { Intention, LayoutNode } from '@/apis/texte/types'
import { LABEL_ARC_PX } from '@/features/texte/lib/constants'

import { isIntention, useNodeLabel } from './use-node-label'

const TAU = Math.PI * 2

const INTENTION_FILL: Record<Intention, string> = {
  supprimer: 'var(--color-chart-1)',
  reecrire: 'var(--color-chart-2)',
  ajouter: 'var(--color-chart-3)',
  modifier: 'var(--color-chart-4)',
  autre: 'var(--color-chart-5)'
}

type DandelionFlowerProps = {
  fillByAmendment?: Record<string, string>
  nodes: LayoutNode[]
  width: number
  height: number
  outerRadiusPx: number
  focusId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  onBackground: () => void
  /** Zoom explicite (1 = vue ajustée) et décalage qui centre le nœud focal. */
  scale?: number
  offset?: { x: number; y: number }
}

// Arrondi : motion interpole l'attribut `d` et ne sait pas lire la notation exponentielle (ex. 6e-14).
const fixed = (value: number) => Math.round(value * 1000) / 1000

const pointAt = (radius: number, angle: number) => ({
  x: fixed(radius * Math.cos(angle)),
  y: fixed(radius * Math.sin(angle))
})

const sectorPath = (innerRadius: number, outerRadius: number, angle0: number, angle1: number): string => {
  const inner = fixed(innerRadius)
  const outer = fixed(outerRadius)
  const span = angle1 - angle0
  if (outer <= 0 || span <= 1e-4) return ''
  if (span >= TAU - 1e-3) {
    const mid = angle0 + Math.PI
    return `${sectorPath(inner, outer, angle0, mid)} ${sectorPath(inner, outer, mid, angle0 + TAU)}`
  }
  const outerStart = pointAt(outer, angle0)
  const outerEnd = pointAt(outer, angle1)
  const large = span > Math.PI ? 1 : 0
  if (inner <= 0.5) {
    return `M 0 0 L ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} Z`
  }
  const innerStart = pointAt(inner, angle0)
  const innerEnd = pointAt(inner, angle1)
  return `M ${innerStart.x} ${innerStart.y} L ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y} Z`
}

const stemPath = (parent: LayoutNode, child: LayoutNode) => {
  const mid = (child.angle0 + child.angle1) / 2
  const controlRadius = (parent.radius + child.radius) / 2
  const control = pointAt(controlRadius, mid)
  return `M ${fixed(parent.x)} ${fixed(parent.y)} Q ${fixed(control.x)} ${fixed(control.y)} ${fixed(child.x)} ${fixed(child.y)}`
}

export function DandelionFlower({
  nodes,
  fillByAmendment,
  width,
  height,
  focusId,
  onHover,
  onSelect,
  onBackground,
  scale = 1,
  offset = { x: 0, y: 0 }
}: DandelionFlowerProps) {
  const t = useTranslations('texte')
  const labelFor = useNodeLabel()
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const lineage = new Set<string>()
  let cursor = focusId
  while (cursor) {
    lineage.add(cursor)
    cursor = byId.get(cursor)?.parentId ?? null
  }

  const fillFor = (node: LayoutNode): string => {
    let current: LayoutNode | undefined = node
    while (current) {
      if (current.amendmentId && fillByAmendment?.[current.amendmentId]) return fillByAmendment[current.amendmentId]
      if (current.kind === 'intention' && isIntention(current.label)) return INTENTION_FILL[current.label]
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return 'var(--color-muted)'
  }

  return (
    <svg
      role='group'
      aria-label={t('flowerLabel')}
      width='100%'
      height='100%'
      viewBox={`0 0 ${width} ${height}`}
      onClick={onBackground}
      onPointerLeave={() => onHover(null)}
    >
      <g transform={`translate(${width / 2 + offset.x} ${height / 2 + offset.y}) scale(${scale})`}>
        {nodes.map((node) => {
          const parent = node.parentId ? byId.get(node.parentId) : undefined
          if (!parent) return null
          const opacity = !focusId || lineage.has(node.id) ? 1 : 0.3
          return (
            <motion.path
              key={`${node.id}-stem`}
              d={stemPath(parent, node)}
              fill='none'
              stroke='var(--color-muted-foreground)'
              strokeWidth={1}
              vectorEffect='non-scaling-stroke'
              initial={false}
              animate={{ d: stemPath(parent, node), strokeOpacity: opacity }}
              transition={{ duration: 0.35 }}
            />
          )
        })}
        {nodes.map((node) => {
          if (node.depth === 0) return null
          const parent = node.parentId ? byId.get(node.parentId) : undefined
          const path = sectorPath(parent?.radius ?? 0, node.radius, node.angle0, node.angle1)
          if (!path) return null
          const opacity = !focusId || lineage.has(node.id) ? 1 : 0.3
          const label = labelFor(node)
          const shortLabel = label.length > 22 ? `${label.slice(0, 21)}…` : label
          const mid = (node.angle0 + node.angle1) / 2
          const labelRadius = ((parent?.radius ?? 0) + node.radius) / 2
          const labelPoint = pointAt(labelRadius, mid)
          // L'espace disponible est celui de l'anneau du texte, pas celui du cercle extérieur.
          const arcPx = (node.angle1 - node.angle0) * labelRadius * scale
          const labelFits = arcPx >= Math.max(LABEL_ARC_PX, shortLabel.length * 7 * scale)
          return (
            <g key={node.id}>
              <motion.path
                d={path}
                fill={fillFor(node)}
                stroke='var(--color-border)'
                strokeWidth={1}
                vectorEffect='non-scaling-stroke'
                className='cursor-pointer'
                role='button'
                tabIndex={0}
                aria-label={node.kind === 'amendement' ? t('nodeAmendment', { label }) : label}
                data-node-id={node.id}
                aria-pressed={node.id === focusId}
                initial={false}
                animate={{ d: path, fillOpacity: opacity }}
                transition={{ duration: 0.35 }}
                onPointerEnter={() => onHover(node.id)}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(node.id)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onSelect(node.id)
                }}
              />
              <title>{label}</title>
              {labelFits ? (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor='middle'
                  dominantBaseline='middle'
                  className='fill-foreground pointer-events-none text-xs'
                >
                  {shortLabel}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
