'use client'

import { useMemo } from 'react'
import { useFormatter, useTranslations } from 'next-intl'

import type { Sort } from '@/apis/sorts/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { usePerimeter } from '../hooks/use-perimeter'
import { useHoverStore, useSunburstStores, useViewStore } from '../hooks/use-sunburst-store'
import { summarizeOutcomes } from '../lib/outcome-summary'
import { swatchClass } from './sort-swatch'

const TITLE_ID = 'repartition-title'

/**
 * Répartition des sorts du périmètre (F6) : barre empilée et pourcentages. Survoler un segment met ses amendements
 * en avant dans le disque ; cliquer a le même effet que la case du sort dans la légende.
 */
export function RepartitionWidget({ sorts }: { sorts: Sort[] }) {
  const t = useTranslations('dataviz')
  const format = useFormatter()
  const { view, hover } = useSunburstStores()
  const excludedSorts = useViewStore((state) => state.excludedSorts)
  const hoverSort = useHoverStore((state) => state.sort)
  const { tree, subject, preview, hovered, amendements } = usePerimeter()
  const outcomes = useMemo(
    () => summarizeOutcomes(sorts, amendements).filter((outcome) => outcome.count > 0),
    [sorts, amendements]
  )
  const total = outcomes.reduce((sum, outcome) => sum + outcome.count, 0)
  const litSort = hoverSort ?? hovered?.amendement?.sort ?? null
  if (!tree || !subject) return null

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <div className='flex items-center justify-between gap-2'>
          <WidgetTitle id={TITLE_ID}>{t('repartition.title')}</WidgetTitle>
          {preview ? <Badge variant='outline'>{t('legend.preview')}</Badge> : null}
        </div>
        <WidgetDescription className={cn('truncate', preview && 'italic')}>
          {subject !== tree.root ? t('legend.scopeNode', { name: subject.label }) : t('legend.scopeText')}
          {excludedSorts.length ? ` · ${t('repartition.filtered')}` : ''}
        </WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        {total === 0 ? (
          <p className='text-muted-foreground'>{t('repartition.empty')}</p>
        ) : (
          <>
            <div
              className='flex h-4 w-full gap-px overflow-hidden rounded-full'
              onPointerLeave={() => hover.getState().leave()}
            >
              {outcomes.map((outcome) => {
                const excluded = excludedSorts.includes(outcome.code)
                const percent = format.number(outcome.count / total, { style: 'percent', maximumFractionDigits: 0 })
                return (
                  <button
                    key={outcome.code}
                    type='button'
                    aria-pressed={!excluded}
                    aria-label={t('repartition.segment', { label: outcome.label, count: outcome.count, percent })}
                    title={t('repartition.segment', { label: outcome.label, count: outcome.count, percent })}
                    onClick={() => view.getState().toggleSort(outcome.code)}
                    onPointerEnter={() => hover.getState().hoverSort(outcome.code, 'repartition')}
                    onFocus={() => hover.getState().hoverSort(outcome.code, 'repartition')}
                    onBlur={() => hover.getState().leave()}
                    className={cn(
                      'focus-visible:ring-ring/50 h-full min-w-1 transition-all duration-300 ease-out outline-none focus-visible:ring-3',
                      swatchClass(outcome.colorToken),
                      excluded && 'opacity-20',
                      litSort && litSort !== outcome.code && 'opacity-40',
                      litSort === outcome.code && 'scale-y-125'
                    )}
                    style={{ flexGrow: outcome.count }}
                  />
                )
              })}
            </div>
            <ul className='flex flex-col gap-1 text-xs'>
              {outcomes.map((outcome) => (
                <li
                  key={outcome.code}
                  className={cn(
                    'flex items-center gap-2 rounded-sm px-1 transition-colors',
                    litSort === outcome.code && 'bg-secondary',
                    excludedSorts.includes(outcome.code) && 'text-muted-foreground'
                  )}
                >
                  <span aria-hidden className={cn('size-2 shrink-0 rounded-full', swatchClass(outcome.colorToken))} />
                  <span className='min-w-0 flex-1 truncate'>{outcome.label}</span>
                  <span className='tabular-nums'>
                    {format.number(outcome.count / total, { style: 'percent', maximumFractionDigits: 0 })}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </WidgetContent>
    </Widget>
  )
}
