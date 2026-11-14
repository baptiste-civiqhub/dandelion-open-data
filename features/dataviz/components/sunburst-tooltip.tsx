'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import type { Sort } from '@/apis/sorts/types'
import { floatingSurface } from '@/components/shared/floating-surface'
import { cn } from '@/lib/utils'

import { useHoverStore, useSunburstStores, useViewStore } from '../hooks/use-sunburst-store'
import { pathTo } from '../lib/sunburst-tree'
import { SortSwatch } from './sort-swatch'

const OFFSET = 16
const FOLLOW = 0.3

/**
 * Infobulle du disque (AC-M4) : nom, nombre d'amendements, sort et emplacement d'un amendement. Elle suit le
 * curseur avec une légère inertie et reste dans la fenêtre. Sa position est écrite hors de React, à chaque image.
 */
export function SunburstTooltip({ sortsByCode }: { sortsByCode: ReadonlyMap<string, Sort> }) {
  const t = useTranslations('dataviz')
  const { hover } = useSunburstStores()
  const tree = useViewStore((state) => state.tree)
  const nodeId = useHoverStore((state) => (state.source === 'disk' ? state.nodeId : null))
  const node = nodeId ? tree?.byId.get(nodeId) : undefined
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!node) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let x = Number.NaN
    let y = Number.NaN
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const element = ref.current
      const pointer = hover.getState().pointer
      if (!element || !pointer) return
      const width = element.offsetWidth
      const height = element.offsetHeight
      let tx = pointer.x + OFFSET
      let ty = pointer.y + OFFSET
      if (tx + width > window.innerWidth - 8) tx = pointer.x - OFFSET - width
      if (ty + height > window.innerHeight - 8) ty = pointer.y - OFFSET - height
      if (Number.isNaN(x) || reduce) {
        x = tx
        y = ty
      } else {
        x += (tx - x) * FOLLOW
        y += (ty - y) * FOLLOW
      }
      element.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [node, hover])

  if (!node) return null
  const sort = node.amendement ? sortsByCode.get(node.amendement.sort) : undefined
  const location = pathTo(node)
    .slice(1, -1)
    .map((step) => step.label)
    .join(' › ')

  return (
    <div
      ref={ref}
      role='tooltip'
      className={cn(
        floatingSurface({ shape: 'panel' }),
        'pointer-events-none fixed top-0 left-0 z-50 flex max-w-64 flex-col gap-1 px-3 py-2 text-sm'
      )}
    >
      <span className='font-semibold'>
        {node.amendement ? t('fiche.amendment', { numero: node.label }) : node.label}
      </span>
      {sort ? (
        <span className='flex items-center gap-2'>
          <SortSwatch colorToken={sort.colorToken} />
          {sort.label}
        </span>
      ) : null}
      <span className='text-muted-foreground text-xs'>
        {node.amendement && location ? `${location} · ` : ''}
        {t('sunburst.count', { count: node.value })}
      </span>
    </div>
  )
}
