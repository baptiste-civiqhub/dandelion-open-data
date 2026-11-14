'use client'

import { useTranslations } from 'next-intl'
import { useId, useState, type FormEvent } from 'react'

import type { Amendment } from '@/apis/texte/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { applyPlan, type DatavizAssistantAdapter } from '@/features/dataviz-assistant/lib/adapter'
import { MAX_QUESTION_LENGTH, type AssistantRegistry } from '@/features/dataviz-assistant/lib/plan'
import { interpretFlowerQuestion, type FlowerGuideResult } from '@/features/texte/lib/flower-guide'

type FlowerGuidePanelProps = {
  amendments: Amendment[]
  adapter: DatavizAssistantAdapter
  registry: AssistantRegistry
  sourceUrls: Record<string, string | null>
  examples: string[]
}

/** Guide déterministe (sans modèle) pour un jeu sans parcours de preuves dédié. */
export function FlowerGuidePanel({ amendments, adapter, registry, sourceUrls, examples }: FlowerGuidePanelProps) {
  const t = useTranslations('flower.guide')
  const tt = useTranslations('texte')
  const inputId = useId()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<{ result: FlowerGuideResult | { status: 'invalid-plan' }; run: number } | null>(
    null
  )

  const ask = (text: string) => {
    const result = interpretFlowerQuestion(text, amendments)
    const run = (answer?.run ?? 0) + 1
    if (result.status === 'plan' && !applyPlan(result.plan, adapter, registry).ok) {
      setAnswer({ result: { status: 'invalid-plan' }, run })
      return
    }
    setAnswer({ result, run })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(question)
  }

  const records =
    answer?.result.status === 'plan'
      ? answer.result.amendmentIds.flatMap((id) => amendments.filter((amendment) => amendment.id === id))
      : []

  return (
    <Widget aria-labelledby='flower-guide-title' data-testid='flower-guide'>
      <WidgetHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <WidgetTitle id='flower-guide-title'>{t('title')}</WidgetTitle>
          <Badge variant='outline'>{t('badge')}</Badge>
        </div>
        <WidgetDescription>{t('description')}</WidgetDescription>
      </WidgetHeader>
      <WidgetContent>
        <form onSubmit={submit} className='flex flex-col gap-2'>
          <label htmlFor={inputId} className='font-medium'>
            {t('inputLabel')}
          </label>
          <input
            id={inputId}
            value={question}
            maxLength={MAX_QUESTION_LENGTH}
            onChange={(event) => setQuestion(event.target.value)}
            className='bg-background focus-visible:ring-ring/50 rounded-md border px-3 py-2 outline-none focus-visible:ring-3'
          />
          <Button type='submit' size='sm' className='w-fit'>
            {t('submit')}
          </Button>
        </form>
        <div className='flex flex-wrap gap-2'>
          {examples.map((example) => (
            <Button
              key={example}
              size='sm'
              variant='outline'
              onClick={() => {
                setQuestion(example)
                ask(example)
              }}
            >
              {example}
            </Button>
          ))}
        </div>
        <div aria-live='polite' data-testid='flower-guide-answer'>
          {answer ? (
            answer.result.status === 'plan' ? (
              <div className='flex flex-col gap-2'>
                <p>{t(`intent.${answer.result.intent}`)}</p>
                {records.map((record) => (
                  <p key={record.id} className='text-muted-foreground'>
                    {t('record', {
                      numero: record.numero,
                      article: record.article,
                      sort: record.sort ?? tt('unknown')
                    })}{' '}
                    {sourceUrls[record.id] ? null : t('noSource')}
                  </p>
                ))}
              </div>
            ) : answer.result.status === 'invalid-plan' ? (
              <p>{t('invalidPlan')}</p>
            ) : (
              <p>{t(`abstain.${answer.result.reason}`)}</p>
            )
          ) : null}
        </div>
      </WidgetContent>
    </Widget>
  )
}
