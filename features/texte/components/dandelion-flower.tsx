'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import type { Intention, LayoutNode } from '@/apis/texte/types'
import { LABEL_ARC_PX } from '@/features/texte/lib/constants'

const TAU = Math.PI * 2

const INTENTION_FILL: Record<Intention, string> = {
  supprimer: 'var(--chart-1)',
  reecrire: 'var(--chart-2)',
  ajouter: 'var(--chart-3)',
  modifier: 'var(--chart-4)',
  autre: 'var(--chart-5)'
}

type DandelionFlowerProps = {
  nodes: LayoutNode[]
  width: number
  height: number
  outerRadiusPx: number
  focusId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  onBackground: () => void
}

const pointAt = (radius: number, angle: number) => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle)
})

const sectorPath = (inner: number, outer: number, angle0: number, angle1: number): string => {
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
  return `M ${parent.x} ${parent.y} Q ${control.x} ${control.y} ${child.x} ${child.y}`
}

const isIntention = (label: string): label is Intention => label in INTENTION_FILL

export function DandelionFlower({
  nodes,
  width,
  height,
  outerRadiusPx,
  focusId,
  onHover,
  onSelect,
  onBackground
}: DandelionFlowerProps) {
  const t = useTranslations('texte')
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
      if (current.kind === 'intention' && isIntention(current.label)) return INTENTION_FILL[current.label]
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return 'var(--muted)'
  }

  const labelFor = (node: LayoutNode): string => {
    if (node.kind === 'intention' && isIntention(node.label)) return t(`intentions.${node.label}`)
    if (node.kind === 'reste') return t('reste')
    if (node.kind === 'discussion' && node.label === '') return t('sansDiscussion')
    if (node.kind === 'doublon' && node.label === '') return t('sansDoublon')
    return node.label
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
      <g transform={`translate(${width / 2} ${height / 2})`}>
        {nodes.map((node) => {
          const parent = node.parentId ? byId.get(node.parentId) : undefined
          if (!parent) return null
          const opacity = !focusId || lineage.has(node.id) ? 1 : 0.3
          return (
            <motion.path
              key={`${node.id}-stem`}
              d={stemPath(parent, node)}
              fill='none'
              stroke='var(--muted-foreground)'
              strokeWidth={1}
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
          const arcPx = (node.angle1 - node.angle0) * outerRadiusPx
          const label = labelFor(node)
          const mid = (node.angle0 + node.angle1) / 2
          const labelPoint = pointAt(((parent?.radius ?? 0) + node.radius) / 2, mid)
          return (
            <g key={node.id}>
              <motion.path
                d={path}
                fill={fillFor(node)}
                stroke='var(--border)'
                strokeWidth={1}
                className='cursor-pointer'
                role='button'
                tabIndex={0}
                aria-label={label}
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
              {arcPx >= LABEL_ARC_PX ? (
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor='middle'
                  dominantBaseline='middle'
                  className='fill-foreground pointer-events-none text-xs'
                >
                  {label.length > 22 ? `${label.slice(0, 21)}…` : label}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
