'use client'

import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { RotateCcw, Sparkles } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import type { AmendementAnalysisResponse, AnalysisDegradedReason } from '@/apis/amendement-analysis/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type InferredAnalysis = Extract<AmendementAnalysisResponse, { status: 'inferred' }>

const DEGRADED_KEYS: Record<AnalysisDegradedReason, string> = {
  unconfigured: 'unconfigured',
  timeout: 'timeout',
  'provider-error': 'providerError',
  'invalid-response': 'invalidResponse',
  abstained: 'abstained'
}

const RETRYABLE: ReadonlySet<AnalysisDegradedReason> = new Set(['timeout', 'provider-error', 'invalid-response'])

/**
 * États d'une analyse demandée, communs aux widgets d'IA : attente, échec de la requête, réponse dégradée (sans
 * inférence) et inférence. Une inférence est toujours précédée de sa mention (modèle, heure, limites) pour ne jamais
 * passer pour une donnée officielle ; `children` n'en rend que le contenu.
 */
export function AnalysisOutcome({
  query,
  onRetry,
  children
}: {
  query: UseQueryResult<AmendementAnalysisResponse>
  onRetry: () => void
  children: (analysis: InferredAnalysis) => ReactNode
}) {
  const t = useTranslations('dataviz.analysis')
  const format = useFormatter()
  const retry = (
    <Button size='sm' variant='outline' className='w-fit' onClick={onRetry}>
      <RotateCcw />
      {t('retry')}
    </Button>
  )

  if (query.isFetching) {
    return (
      <div role='status' aria-busy className='flex flex-col gap-2'>
        <p className='text-muted-foreground text-xs'>{t('pending')}</p>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </div>
    )
  }
  if (query.isError) {
    return (
      <div role='alert' className='flex flex-col gap-2'>
        <p className='text-muted-foreground'>{t('error')}</p>
        {retry}
      </div>
    )
  }
  const response = query.data
  if (!response) return null
  if (response.status === 'degraded') {
    return (
      <div role='status' className='flex flex-col gap-2'>
        <Badge variant='warning'>{t('degradedBadge')}</Badge>
        <p className='text-muted-foreground'>{t(`degraded.${DEGRADED_KEYS[response.reason]}`)}</p>
        {RETRYABLE.has(response.reason) ? retry : null}
      </div>
    )
  }
  return (
    <div role='status' className='flex flex-col gap-3'>
      <div className='flex flex-col gap-1'>
        <Badge variant='info'>
          <Sparkles />
          {t('inferenceBadge')}
        </Badge>
        <p className='text-muted-foreground text-xs'>
          {t('inferenceNotice', {
            model: response.model,
            time: format.dateTime(new Date(response.generatedAt), { hour: '2-digit', minute: '2-digit' })
          })}
        </p>
      </div>
      {children(response)}
    </div>
  )
}
