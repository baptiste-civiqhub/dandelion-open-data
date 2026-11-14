'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import type { TourEvent, TourState, TourStep } from '@/features/texte/lib/tour'

type FlowerTourProps = {
  steps: TourStep[]
  state: TourState
  reducedMotion: boolean
  onEvent: (event: TourEvent) => void
}

export function FlowerTour({ steps, state, reducedMotion, onEvent }: FlowerTourProps) {
  const t = useTranslations('flower.tour')
  const step = state.status === 'idle' ? null : steps[state.index]
  if (steps.length === 0) return null

  return (
    <Widget aria-labelledby='flower-tour-title' data-testid='flower-tour'>
      <WidgetHeader>
        <WidgetTitle id='flower-tour-title'>{t('title')}</WidgetTitle>
        <WidgetDescription>{reducedMotion ? t('reducedMotion') : t('description')}</WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        <div aria-live='polite' className='flex flex-col gap-1' data-testid='flower-tour-step'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' data-testid='flower-tour-status'>
              {t(`status.${state.status}`)}
            </Badge>
            {step ? (
              <span className='text-muted-foreground text-xs'>
                {t('progress', { current: state.index + 1, total: steps.length })}
              </span>
            ) : null}
          </div>
          {step ? (
            <>
              <p className='font-semibold' data-testid='flower-tour-title-step'>
                {t(`steps.${step.id}.title`)}
              </p>
              <p className='text-muted-foreground'>{t(`steps.${step.id}.caption`)}</p>
            </>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          {state.status === 'idle' || state.status === 'done' ? (
            <Button size='sm' onClick={() => onEvent('start')}>
              {state.status === 'done' ? t('restart') : t('start')}
            </Button>
          ) : null}
          {state.status === 'playing' ? (
            <Button size='sm' variant='outline' onClick={() => onEvent('pause')}>
              {t('pause')}
            </Button>
          ) : null}
          {state.status === 'paused' ? (
            <Button size='sm' onClick={() => onEvent('resume')}>
              {t('resume')}
            </Button>
          ) : null}
          {state.status === 'playing' || state.status === 'paused' ? (
            <>
              <Button size='sm' variant='outline' onClick={() => onEvent('next')}>
                {t('next')}
              </Button>
              <Button size='sm' variant='ghost' onClick={() => onEvent('stop')}>
                {t('stop')}
              </Button>
            </>
          ) : null}
        </div>
      </WidgetContent>
    </Widget>
  )
}
