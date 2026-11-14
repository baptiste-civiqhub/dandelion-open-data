'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { AmendementSummary } from '@/apis/amendements/types'
import { useGetAmendementAnalysis } from '@/apis/amendement-analysis'
import type { SingleAnalysis } from '@/apis/amendement-analysis/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { useAnalysisLocale, useSelectedAmendement } from '../hooks/use-selected-amendement'
import { useViewStore } from '../hooks/use-sunburst-store'
import { AnalysisOutcome } from './analysis-outcome'
import { PointList } from './point-list'

const TITLE_ID = 'analysis-title'

/**
 * Lecture par IA de l'amendement sélectionné : résumé, effet recherché, points clés et thèmes, produits par le route
 * handler d'analyse. Ne part qu'au clic ; une lecture déjà obtenue réapparaît sans nouvel appel.
 */
export function AnalysisWidget() {
  const t = useTranslations('dataviz.analysis')
  const tree = useViewStore((state) => state.tree)
  const amendement = useSelectedAmendement()
  if (!tree) return null

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <WidgetTitle id={TITLE_ID}>{t('title')}</WidgetTitle>
        <WidgetDescription>
          {amendement ? t('description', { numero: amendement.numeroLong }) : t('hint')}
        </WidgetDescription>
      </WidgetHeader>
      {amendement ? <AnalysisPanel key={amendement.id} amendement={amendement} /> : null}
    </Widget>
  )
}

function AnalysisPanel({ amendement }: { amendement: AmendementSummary }) {
  const t = useTranslations('dataviz.analysis')
  const locale = useAnalysisLocale()
  const [isRequested, setIsRequested] = useState(false)
  const query = useGetAmendementAnalysis(
    { mode: 'single', amendementIds: [amendement.id], locale },
    { enabled: isRequested }
  )
  const isIdle = !query.data && !query.isFetching && !query.isError

  return (
    <WidgetContent>
      {isIdle ? (
        <Button size='sm' variant='secondary' className='w-fit' onClick={() => setIsRequested(true)}>
          <Sparkles />
          {t('run')}
        </Button>
      ) : null}
      <AnalysisOutcome query={query} onRetry={() => void query.refetch()}>
        {(response) =>
          response.analysis.kind === 'single' ? <SingleAnalysisView analysis={response.analysis} /> : null
        }
      </AnalysisOutcome>
    </WidgetContent>
  )
}

function SingleAnalysisView({ analysis }: { analysis: SingleAnalysis }) {
  const t = useTranslations('dataviz.analysis')
  return (
    <div className='flex flex-col gap-2'>
      <Badge variant='secondary'>{t(`intent.${analysis.intent}`)}</Badge>
      <p>{analysis.summary}</p>
      <PointList title={t('keyPoints')} points={analysis.keyPoints} />
      {analysis.themes.length ? (
        <div className='flex flex-col gap-1'>
          <p className='text-muted-foreground text-xs font-medium'>{t('themes')}</p>
          <div className='flex flex-wrap gap-1'>
            {analysis.themes.map((theme, index) => (
              <Badge key={`${index}-${theme}`} variant='outline'>
                {theme}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
