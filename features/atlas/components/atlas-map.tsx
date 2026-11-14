'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import type { Area } from '@/apis/areas/types'
import { PUBLIC_PATHS } from '@/constant/path'
import { Link, usePathname } from '@/i18n/navigation'
import { isActivePath } from '@/lib/navigation/is-active-path'
import { cn } from '@/lib/utils'

import { ATLAS_SIZE, layoutAtlas, orderAtlasAreas, shortenAtlasLabel } from '../lib/atlas-layout'

type AtlasMapProps = {
  areas: Area[]
  /** Appelé quand l'utilisateur choisit une zone : la fenêtre de l'atlas se referme. */
  onNavigate?: () => void
  className?: string
}

const CENTER = ATLAS_SIZE / 2
const RINGS = [16, 32, 46]

/**
 * Carte de l'atlas en plan, vue de dessus : chaque zone est un lien posé sur une spirale (`layoutAtlas`). Une zone
 * qui a des données est pleine avec un cœur ; une zone vide est en pointillés : l'état ne tient jamais à la seule
 * couleur, et le nom accessible du lien le dit aussi. La zone de la page courante porte `aria-current`.
 */
export function AtlasMap({ areas, onNavigate, className }: AtlasMapProps) {
  const t = useTranslations('atlas')
  const pathname = usePathname()
  const ordered = useMemo(() => orderAtlasAreas(areas), [areas])
  const placements = useMemo(() => layoutAtlas(ordered.map((area) => area.id)), [ordered])

  return (
    <svg
      viewBox={`0 0 ${ATLAS_SIZE} ${ATLAS_SIZE}`}
      role='group'
      aria-label={t('mapLabel')}
      data-slot='atlas-map'
      className={cn('size-full', className)}
    >
      <g aria-hidden className='stroke-border fill-none' strokeWidth={0.3}>
        {RINGS.map((radius) => (
          <circle key={radius} cx={CENTER} cy={CENTER} r={radius} strokeDasharray='0.8 1.6' />
        ))}
        <line x1={CENTER} y1={4} x2={CENTER} y2={ATLAS_SIZE - 4} />
        <line x1={4} y1={CENTER} x2={ATLAS_SIZE - 4} y2={CENTER} />
      </g>
      {ordered.map((area, index) => {
        const { x, y } = placements[index]
        const href = PUBLIC_PATHS.AREA_DETAIL(area.slug)
        const current = isActivePath(pathname, href)
        const hasData = area.texteCount > 0

        return (
          <Link
            key={area.id}
            href={href}
            onClick={onNavigate}
            aria-label={t('zoneLabel', { name: area.name, count: area.texteCount })}
            aria-current={current ? 'page' : undefined}
            data-slot='atlas-zone'
            className='group outline-none'
          >
            <circle
              cx={x}
              cy={y}
              r={9}
              strokeWidth={0.8}
              className={cn(
                'group-focus-visible:stroke-ring fill-none',
                current ? 'stroke-foreground' : 'stroke-transparent'
              )}
            />
            <circle
              cx={x}
              cy={y}
              r={6}
              strokeWidth={0.5}
              strokeDasharray={hasData ? undefined : '1.4 1'}
              className={cn(
                'transition-colors',
                hasData
                  ? 'fill-brand-soft stroke-brand group-hover:fill-brand'
                  : 'fill-background stroke-muted-foreground group-hover:fill-secondary'
              )}
            />
            {hasData ? (
              <circle
                cx={x}
                cy={y}
                r={1.8}
                className='fill-brand group-hover:fill-brand-foreground transition-colors'
              />
            ) : null}
            <text x={x} y={y + 10.5} textAnchor='middle' fontSize={2.6} className='fill-foreground font-medium'>
              {shortenAtlasLabel(area.name)}
            </text>
          </Link>
        )
      })}
    </svg>
  )
}
