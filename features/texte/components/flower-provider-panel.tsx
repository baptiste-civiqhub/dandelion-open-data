'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { usePostDatavizPlan, type DatavizPlanResponse } from '@/apis/dataviz-plan'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { applyPlan, type DatavizAssistantAdapter } from '@/features/dataviz-assistant/lib/adapter'
import { MAX_QUESTION_LENGTH, type AssistantRegistry } from '@/features/dataviz-assistant/lib/plan'
import type { FlowerDatasetId } from '@/features/texte/lib/datasets'

type FlowerProviderPanelProps = {
  datasetId: FlowerDatasetId
  adapter: DatavizAssistantAdapter
  registry: AssistantRegistry
}

type Outcome = DatavizPlanResponse | { mode: 'client-refused' } | { mode: 'network' }

/** Fournisseur optionnel (serveur) : sans clé, la route répond « non configuré » et rien d'autre ne change. */
export function FlowerProviderPanel({ datasetId, adapter, registry }: FlowerProviderPanelProps) {
  const t = useTranslations('flower.provider')
  const [question, setQuestion] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const mutation = usePostDatavizPlan()

  const ask = () => {
    mutation.mutate(
      { question, datasetId },
      {
        onSuccess: (body) => {
          if (body.mode === 'provider' && body.status === 'plan' && !applyPlan(body.plan, adapter, registry).ok) {
            setOutcome({ mode: 'client-refused' })
            return
          }
          setOutcome(body)
        },
        onError: () => setOutcome({ mode: 'network' })
      }
    )
  }

  const message = (): string | null => {
    if (!outcome) return null
    if (outcome.mode === 'unconfigured') return t('unconfigured')
    if (outcome.mode === 'rejected') return t('rejected')
    if (outcome.mode === 'client-refused') return t('clientRefused')
    if (outcome.mode === 'network') return t('network')
    if (outcome.status === 'abstain') return t('abstain', { model: outcome.model })
    if (outcome.status === 'error') return t(`error.${outcome.code}`)
    return t('applied', { model: outcome.model, count: outcome.plan.actions.length })
  }

  return (
    <Widget aria-labelledby='flower-provider-title' data-testid='flower-provider'>
      <WidgetHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <WidgetTitle id='flower-provider-title'>{t('title')}</WidgetTitle>
          <Badge variant='outline'>{t('badge')}</Badge>
        </div>
        <WidgetDescription>{t('description')}</WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        <label className='flex flex-col gap-1'>
          <span className='font-medium'>{t('inputLabel')}</span>
          <input
            value={question}
            maxLength={MAX_QUESTION_LENGTH}
            onChange={(event) => setQuestion(event.target.value)}
            className='bg-background focus-visible:ring-ring/50 rounded-md border px-3 py-2 outline-none focus-visible:ring-3'
          />
        </label>
        <Button
          size='sm'
          variant='outline'
          className='w-fit'
          disabled={mutation.isPending || !question.trim()}
          onClick={ask}
        >
          {mutation.isPending ? t('pending') : t('submit')}
        </Button>
        <div aria-live='polite' data-testid='flower-provider-answer'>
          {message() ? <p>{message()}</p> : null}
          {outcome && outcome.mode === 'provider' && outcome.status === 'plan' ? (
            <ul className='text-muted-foreground flex flex-col gap-1'>
              {outcome.records.map((record) => (
                <li key={record.id}>
                  {t('record', { numero: record.numero, article: record.article, outcome: record.outcome ?? '—' })}
                  {record.sourceUrl ? null : ` ${t('noSource')}`}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </WidgetContent>
    </Widget>
  )
}
