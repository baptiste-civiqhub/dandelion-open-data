'use client'

import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { Sort } from '@/apis/sorts/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { usePerimeter } from '../hooks/use-perimeter'
import { useHoverStore, useSunburstStores, useViewStore } from '../hooks/use-sunburst-store'
import { summarizeOutcomes } from '../lib/outcome-summary'
import { AnimatedNumber } from './animated-number'
import { swatchClass } from './sort-swatch'

const TITLE_ID = 'sort-legend-title'

/**
 * Légende des sorts (F4) : pastille, libellé, nombre dans le périmètre et petite barre. Cocher ou décocher filtre
 * le disque ; survoler une ligne met ses amendements en avant sans filtrer. Le titre nomme le périmètre compté, et
 * passe en « aperçu » quand on survole un secteur du disque.
 */
export function SortLegendWidget({ status, sorts }: { status: 'pending' | 'error' | 'ready'; sorts: Sort[] }) {
  const t = useTranslations('dataviz')
  const { view, hover } = useSunburstStores()
  const excludedSorts = useViewStore((state) => state.excludedSorts)
  const hoverSort = useHoverStore((state) => state.sort)
  const { tree, subject, preview, hovered, amendements } = usePerimeter()
  const outcomes = useMemo(() => summarizeOutcomes(sorts, amendements), [sorts, amendements])
  const max = Math.max(1, ...outcomes.map((outcome) => outcome.count))
  const litSort = hoverSort ?? hovered?.amendement?.sort ?? null

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <div className='flex items-center justify-between gap-2'>
          <WidgetTitle id={TITLE_ID}>{t('legend.title')}</WidgetTitle>
          {preview ? <Badge variant='outline'>{t('legend.preview')}</Badge> : null}
        </div>
        <WidgetDescription className={cn('truncate', preview && 'italic')}>
          {subject && tree && subject !== tree.root
            ? t('legend.scopeNode', { name: subject.label })
            : t('legend.scopeText')}
        </WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        {status === 'pending' || !tree ? (
          <div aria-busy className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        ) : status === 'error' ? (
          <p role='alert' className='text-muted-foreground'>
            {t('legend.error')}
          </p>
        ) : (
          <ul className='flex flex-col gap-1' onPointerLeave={() => hover.getState().leave()}>
            {outcomes.map((outcome) => {
              const checked = !excludedSorts.includes(outcome.code)
              const lit = litSort === outcome.code
              return (
                <li key={outcome.code}>
                  <button
                    type='button'
                    role='checkbox'
                    aria-checked={checked}
                    onClick={() => view.getState().toggleSort(outcome.code)}
                    onPointerEnter={() => hover.getState().hoverSort(outcome.code, 'legend')}
                    onFocus={() => hover.getState().hoverSort(outcome.code, 'legend')}
                    onBlur={() => hover.getState().leave()}
                    className={cn(
                      'focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded-md px-2 py-1 text-left transition-colors outline-none focus-visible:ring-3',
                      lit ? 'bg-secondary' : 'hover:bg-secondary',
                      !checked && 'text-muted-foreground'
                    )}
                  >
                    <span className='flex w-full items-start gap-2'>
                      <span
                        aria-hidden
                        className={cn(
                          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border',
                          checked ? 'bg-primary text-primary-foreground border-transparent' : 'bg-background'
                        )}
                      >
                        {checked ? <Check className='size-3' /> : null}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'mt-1 size-3 shrink-0 rounded-full',
                          swatchClass(outcome.colorToken),
                          !checked && 'opacity-40'
                        )}
                      />
                      <span className='min-w-0 flex-1 text-sm leading-snug'>{outcome.label}</span>
                      <AnimatedNumber value={outcome.count} className='text-sm font-medium' />
                    </span>
                    <span aria-hidden className='bg-muted ml-12 h-1 overflow-hidden rounded-full'>
                      <span
                        className={cn(
                          'block h-full rounded-full transition-all duration-300 ease-out',
                          swatchClass(outcome.colorToken),
                          !checked && 'opacity-40'
                        )}
                        style={{ width: `${(outcome.count / max) * 100}%` }}
                      />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className='text-muted-foreground text-xs'>{t('legend.hint')}</p>
      </WidgetContent>
    </Widget>
  )
}
