'use client'

import { useMemo } from 'react'
import { ArrowUp, ChevronRight, Minus, Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Widget } from '@/components/shared/widget'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useSunburstStores, useViewStore } from '../hooks/use-sunburst-store'
import { matchesFilters, NO_FILTERS } from '../lib/sunburst-filters'
import { amendementsUnder, pathTo } from '../lib/sunburst-tree'
import { MAX_DEPTH, MIN_DEPTH } from '../lib/view-url'

/**
 * Barre au-dessus du disque : chemin du texte au focus (chaque cran zoome), « Remonter », nombre d'anneaux, et
 * bandeau du filtre actif avec « Effacer » (AC-P4 quand plus rien ne correspond).
 */
export function ViewBar() {
  const t = useTranslations('dataviz.view')
  const { view, hover } = useSunburstStores()
  const tree = useViewStore((state) => state.tree)
  const focusId = useViewStore((state) => state.focusId)
  const depth = useViewStore((state) => state.depth)
  const excludedSorts = useViewStore((state) => state.excludedSorts)

  const focus = tree?.byId.get(focusId) ?? tree?.root
  const path = focus ? pathTo(focus) : []
  const filterActive = excludedSorts.length > 0
  const matching = useMemo(
    () =>
      focus && filterActive
        ? amendementsUnder(focus).filter((amendement) => matchesFilters(amendement, { ...NO_FILTERS, excludedSorts }))
            .length
        : null,
    [focus, filterActive, excludedSorts]
  )

  if (!tree || !focus) return null

  return (
    <div className='flex flex-col items-center gap-2'>
      <Widget className='max-w-full flex-row items-center gap-1 rounded-full px-2 py-1'>
        <Button
          variant='ghost'
          size='icon'
          className='size-8 rounded-full'
          disabled={!focus.parent}
          onClick={() => view.getState().up()}
          aria-label={t('up')}
          title={t('up')}
        >
          <ArrowUp className='size-4' />
        </Button>
        <nav aria-label={t('position')} className='min-w-0'>
          <ol className='flex min-w-0 items-center gap-1 text-sm'>
            {path.map((node, index) => {
              const current = index === path.length - 1
              return (
                <li key={node.id} className='flex min-w-0 items-center gap-1'>
                  {index > 0 ? <ChevronRight aria-hidden className='text-muted-foreground size-3 shrink-0' /> : null}
                  <button
                    type='button'
                    aria-current={current ? 'location' : undefined}
                    onClick={() => view.getState().focus(node.id)}
                    onPointerEnter={() => hover.getState().hoverNode(node.id, 'breadcrumb')}
                    onPointerLeave={() => hover.getState().leave()}
                    onFocus={() => hover.getState().hoverNode(node.id, 'breadcrumb')}
                    onBlur={() => hover.getState().leave()}
                    className={cn(
                      'focus-visible:ring-ring/50 truncate rounded-full px-2 py-1 outline-none focus-visible:ring-3',
                      index === 0 ? 'max-w-48' : 'max-w-32',
                      current ? 'bg-secondary font-medium' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {node.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
        <span aria-hidden className='bg-border mx-1 h-5 w-px shrink-0' />
        <Button
          variant='ghost'
          size='icon'
          className='size-8 rounded-full'
          disabled={depth <= MIN_DEPTH}
          onClick={() => view.getState().setDepth(depth - 1)}
          aria-label={t('fewerRings')}
          title={t('fewerRings')}
        >
          <Minus className='size-4' />
        </Button>
        <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{t('rings', { count: depth })}</span>
        <Button
          variant='ghost'
          size='icon'
          className='size-8 rounded-full'
          disabled={depth >= MAX_DEPTH}
          onClick={() => view.getState().setDepth(depth + 1)}
          aria-label={t('moreRings')}
          title={t('moreRings')}
        >
          <Plus className='size-4' />
        </Button>
      </Widget>
      {filterActive ? (
        <Widget role='status' className='flex-row items-center gap-2 rounded-full py-1 pr-1 pl-4 text-sm'>
          <span className='font-medium'>{matching === 0 ? t('noMatch') : t('filterActive')}</span>
          <Button variant='ghost' size='sm' className='rounded-full' onClick={() => view.getState().clearFilters()}>
            <X className='size-4' />
            {t('clear')}
          </Button>
        </Widget>
      ) : null}
    </div>
  )
}
