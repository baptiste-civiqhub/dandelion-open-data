import { useTranslations } from 'next-intl'

import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { OutcomeCount } from '../lib/outcome-summary'
import { chartTokenForSort, type ChartToken } from '../lib/sort-colors'

type OutcomeLegendWidgetProps = {
  status: 'pending' | 'error' | 'ready'
  outcomes: OutcomeCount[]
}

const TITLE_ID = 'outcome-legend-title'

const SWATCH_CLASS: Record<ChartToken, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5'
}

/**
 * Widget de droite d'une page de zone : la légende des sorts, lue dans le backend, avec le nombre d'amendements de
 * chacun. Chaque couleur est accompagnée de son libellé et de son compte.
 */
export function OutcomeLegendWidget({ status, outcomes }: OutcomeLegendWidgetProps) {
  const t = useTranslations('dataviz')
  const total = outcomes.reduce((sum, outcome) => sum + outcome.count, 0)

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <WidgetTitle id={TITLE_ID}>{t('outcomes.title')}</WidgetTitle>
        <WidgetDescription>{t('outcomes.description')}</WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        {status === 'pending' ? (
          <div aria-busy className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-2/3' />
          </div>
        ) : status === 'error' ? (
          <p role='alert' className='text-muted-foreground'>
            {t('outcomes.error')}
          </p>
        ) : total === 0 ? (
          <p className='text-muted-foreground'>{t('outcomes.empty')}</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {outcomes.map((outcome) => (
              <li key={outcome.code} className='flex items-start gap-2'>
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 size-3 shrink-0 rounded-full',
                    SWATCH_CLASS[chartTokenForSort(outcome.colorToken)]
                  )}
                />
                <span className='min-w-0 flex-1'>{outcome.label}</span>
                <span className='text-muted-foreground shrink-0 tabular-nums'>{outcome.count}</span>
              </li>
            ))}
          </ul>
        )}
      </WidgetContent>
    </Widget>
  )
}
