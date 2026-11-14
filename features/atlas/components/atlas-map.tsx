'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import type { Area } from '@/apis/areas/types'
import { PUBLIC_PATHS } from '@/constant/path'
import { worldZonesFromAreas } from '@/features/world/lib/world-zones'
import { Link, usePathname } from '@/i18n/navigation'
import { isActivePath } from '@/lib/navigation/is-active-path'
import { cn } from '@/lib/utils'
import { useWorldPoseStore } from '@/store/world-pose'

import { shortenAtlasLabel } from '../lib/atlas-layout'
import {
  layoutGardenPlan,
  placeAtlasLabel,
  poseMarkerRotation,
  type GardenPlanFill,
  type GardenPlanMark
} from '../lib/garden-plan'

type AtlasMapProps = {
  areas: Area[]
  /** Appelé quand l'utilisateur choisit une zone : la fenêtre de l'atlas se referme. */
  onNavigate?: () => void
  className?: string
}

const FILL_CLASS: Record<GardenPlanFill, string> = {
  sand: 'fill-world-sand',
  gravel: 'fill-world-gravel',
  white: 'fill-white',
  lawn: 'fill-world-lawn',
  water: 'fill-world-water',
  'water-deep': 'fill-world-water-deep',
  stone: 'fill-world-stone-cool',
  roof: 'fill-world-roof',
  metal: 'fill-world-metal'
}

const STROKE_CLASS: Record<GardenPlanFill, string> = {
  sand: 'stroke-world-sand',
  gravel: 'stroke-world-gravel',
  white: 'stroke-white',
  lawn: 'stroke-world-lawn',
  water: 'stroke-world-water',
  'water-deep': 'stroke-world-water-deep',
  stone: 'stroke-world-stone-cool',
  roof: 'stroke-world-roof',
  metal: 'stroke-world-metal'
}

const renderMark = (mark: GardenPlanMark, index: number) => {
  const key = `${mark.kind}-${index}`
  if (mark.kind === 'rect') {
    return (
      <rect
        key={key}
        x={mark.x}
        y={mark.y}
        width={mark.width}
        height={mark.height}
        rx={mark.radius}
        className={FILL_CLASS[mark.fill]}
      />
    )
  }
  if (mark.kind === 'circle') {
    return <circle key={key} cx={mark.cx} cy={mark.cy} r={mark.r} className={FILL_CLASS[mark.fill]} />
  }
  if (mark.kind === 'polygon') {
    return <polygon key={key} points={mark.points} className={FILL_CLASS[mark.fill]} />
  }
  if (mark.kind === 'stroke-rect') {
    return (
      <rect
        key={key}
        x={mark.x}
        y={mark.y}
        width={mark.width}
        height={mark.height}
        strokeWidth={mark.strokeWidth}
        className={cn('fill-none', STROKE_CLASS[mark.stroke])}
      />
    )
  }
  return (
    <circle
      key={key}
      cx={mark.cx}
      cy={mark.cy}
      r={mark.r}
      strokeWidth={mark.strokeWidth}
      strokeDasharray={mark.dash}
      className={cn('fill-none', STROKE_CLASS[mark.stroke])}
    />
  )
}

/**
 * Jardin vu de dessus : le plan du Luxembourg (allées, bassins, palais) et, au centre, une fleur par zone,
 * à la position du monde. La flèche est le joueur, quand le jardin tourne. Une zone avec des données est
 * pleine, une zone vide est en pointillés. La zone de la page courante porte `aria-current`.
 */
export function AtlasMap({ areas, onNavigate, className }: AtlasMapProps) {
  const t = useTranslations('atlas')
  const pathname = usePathname()
  const pose = useWorldPoseStore((state) => state.pose)
  const plan = useMemo(() => layoutGardenPlan(), [])
  const zones = useMemo(() => {
    const counts = new Map(areas.map((area) => [area.id, area.texteCount]))
    return worldZonesFromAreas(areas).map((zone) => ({ ...zone, texteCount: counts.get(zone.id) ?? 0 }))
  }, [areas])
  const { viewBox } = plan

  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      role='group'
      aria-label={t('mapLabel')}
      data-slot='atlas-map'
      className={cn('bg-world-ground size-full font-sans', className)}
    >
      <g aria-hidden>{plan.marks.map(renderMark)}</g>
      {zones.map((zone) => {
        const href = PUBLIC_PATHS.AREA_DETAIL(zone.slug)
        const current = isActivePath(pathname, href)
        const label = placeAtlasLabel(zone.x, zone.z)
        return (
          <Link
            key={zone.id}
            href={href}
            onClick={onNavigate}
            aria-label={t('zoneLabel', { name: zone.name, count: zone.texteCount })}
            aria-current={current ? 'page' : undefined}
            data-slot='atlas-zone'
            className='group outline-none'
          >
            <line
              x1={label.fromX}
              y1={label.fromY}
              x2={label.x}
              y2={label.y}
              strokeWidth={0.35}
              className='stroke-muted-foreground'
            />
            <circle cx={zone.x} cy={zone.z} r={11} className='fill-transparent' />
            <circle
              cx={zone.x}
              cy={zone.z}
              r={10}
              strokeWidth={0.9}
              className={cn(
                'group-focus-visible:stroke-ring fill-none',
                current ? 'stroke-foreground' : 'stroke-transparent'
              )}
            />
            <circle
              cx={zone.x}
              cy={zone.z}
              r={6.5}
              strokeWidth={0.6}
              strokeDasharray={zone.hasData ? undefined : '1.6 1.1'}
              className={cn(
                'transition-colors',
                zone.hasData
                  ? 'fill-brand-soft stroke-brand group-hover:fill-brand group-focus-visible:fill-brand'
                  : 'fill-background stroke-muted-foreground group-hover:fill-secondary group-focus-visible:fill-secondary'
              )}
            />
            {zone.hasData ? <circle cx={zone.x} cy={zone.z} r={1.8} className='fill-brand' /> : null}
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              dominantBaseline={label.baseline}
              fontSize={6.4}
              strokeWidth={1.6}
              paintOrder='stroke'
              className='fill-foreground stroke-world-sand font-medium'
            >
              {shortenAtlasLabel(zone.name, 18)}
            </text>
          </Link>
        )
      })}
      {pose ? (
        <g
          data-slot='atlas-pose'
          role='img'
          aria-label={t('youAreHere')}
          transform={`translate(${pose.x} ${pose.z}) rotate(${poseMarkerRotation(pose.heading)})`}
          className='pointer-events-none'
        >
          <circle r={4.4} strokeWidth={0.9} className='fill-background stroke-foreground' />
          <polygon points='0,-8.5 3.3,3.4 -3.3,3.4' className='fill-foreground' />
        </g>
      ) : null}
    </svg>
  )
}
