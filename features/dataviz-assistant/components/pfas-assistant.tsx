'use client'

import { useTranslations } from 'next-intl'
import { useId, useMemo, useState, type FormEvent } from 'react'

import type { PfasAmendment } from '@/apis/pfas-amendments/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { applyPlan, type DatavizAssistantAdapter } from '@/features/dataviz-assistant/lib/adapter'
import { createRegistry, MAX_QUESTION_LENGTH, type AssistantAction } from '@/features/dataviz-assistant/lib/plan'
import { focusHeading } from '@/features/pfas-amendments/components/evidence-focus'
import { OutcomeBadge } from '@/features/pfas-amendments/components/outcome-badge'
import { SourceLink } from '@/features/pfas-amendments/components/source-link'
import { interpretPfasQuestion, type GuideResult } from '@/features/pfas-amendments/lib/assistant-guide'
import { toSafeSenateUrl } from '@/features/pfas-amendments/lib/source-url'

const EXAMPLES = ['compare', 'parent', 'evidence'] as const

type Answer = {
  run: number
  question: string
  result: GuideResult | { status: 'invalid-plan' }
  actions: AssistantAction[]
}

type PfasAssistantProps = { amendments: PfasAmendment[]; adapter: DatavizAssistantAdapter }

export function PfasAssistant({ amendments, adapter }: PfasAssistantProps) {
  const t = useTranslations('datavizAssistant')
  const inputId = useId()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  // PFAS n'enregistre aucun lieu : un plan « open-location » est donc toujours refusé ici.
  const registry = useMemo(() => createRegistry(amendments.map((amendment) => amendment.id)), [amendments])

  const ask = (text: string): boolean => {
    const result = interpretPfasQuestion(text, amendments)
    const run = (answer?.run ?? 0) + 1
    if (result.status === 'abstain') {
      setAnswer({ run, question: text, result, actions: [] })
      return false
    }
    const applied = applyPlan(result.plan, adapter, registry)
    setAnswer(
      applied.ok
        ? { run, question: text, result, actions: applied.applied }
        : { run, question: text, result: { status: 'invalid-plan' }, actions: [] }
    )
    return applied.ok
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(question)
  }

  const label = (id: string) => amendments.find((amendment) => amendment.id === id)?.numberLabel ?? id

  return (
    <Card aria-labelledby='assistant-title' data-testid='assistant'>
      <CardHeader>
        <div className='flex flex-wrap items-center gap-2'>
          <CardTitle id='assistant-title' role='heading' aria-level={2}>
            {t('title')}
          </CardTitle>
          <Badge variant='outline' data-testid='assistant-engine'>
            {t('badge')}
          </Badge>
        </div>
        <CardDescription>{t('description')}</CardDescription>
        <p className='text-muted-foreground text-xs'>{t('engine')}</p>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <form onSubmit={submit} className='flex flex-col gap-2' data-testid='assistant-form'>
          <label htmlFor={inputId} className='text-sm font-medium'>
            {t('inputLabel')}
          </label>
          <div className='flex flex-col gap-2 sm:flex-row'>
            <textarea
              id={inputId}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              maxLength={MAX_QUESTION_LENGTH}
              rows={2}
              aria-describedby={`${inputId}-hint`}
              data-testid='assistant-input'
              className='bg-background focus-visible:ring-ring/50 min-w-0 flex-1 rounded-md border p-2 text-sm outline-none focus-visible:ring-3'
            />
            <Button type='submit' className='sm:self-start' data-testid='assistant-submit'>
              {t('submit')}
            </Button>
          </div>
          <p id={`${inputId}-hint`} className='text-muted-foreground text-xs'>
            {t('inputHint')}
          </p>
        </form>
        <div className='flex flex-col gap-2'>
          <p className='text-foreground-secondary text-xs font-medium'>{t('examplesLabel')}</p>
          <ul className='flex flex-wrap gap-2'>
            {EXAMPLES.map((key) => (
              <li key={key}>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-auto text-left whitespace-normal'
                  data-testid={`assistant-example-${key}`}
                  onClick={() => {
                    setQuestion(t(`examples.${key}`))
                    ask(t(`examples.${key}`))
                  }}
                >
                  {t(`examples.${key}`)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <section aria-label={t('responseLabel')} aria-live='polite' data-testid='assistant-response'>
          {answer && (
            <AnswerView
              key={answer.run}
              answer={answer}
              amendments={amendments}
              label={label}
              onNavigate={(headingId) => {
                if (ask(answer.question)) requestAnimationFrame(() => focusHeading(headingId))
              }}
            />
          )}
        </section>
      </CardContent>
    </Card>
  )
}

function AnswerView({
  answer,
  amendments,
  label,
  onNavigate
}: {
  answer: Answer
  amendments: PfasAmendment[]
  label: (id: string) => string
  onNavigate: (headingId: string) => void
}) {
  const t = useTranslations('datavizAssistant')
  const { result } = answer

  if (result.status !== 'plan') {
    const reason = result.status === 'invalid-plan' ? 'invalid-plan' : result.reason
    const numbers = result.status === 'abstain' ? result.numbers.join(', ') : ''
    return (
      <div
        className='bg-muted flex flex-col gap-1 rounded-md p-3 text-sm'
        data-testid='assistant-abstain'
        data-reason={reason}
      >
        <p className='text-muted-foreground text-xs'>{t('question', { question: answer.question })}</p>
        <p className='font-medium'>{t('abstain.title')}</p>
        <p>{t(`abstain.${reason}`, { numbers })}</p>
        <p className='text-foreground-secondary'>{t('abstain.suggest')}</p>
      </div>
    )
  }

  const records = result.records
  const [first, second] = records
  const parentUrl = result.intent === 'parent' ? toSafeSenateUrl(first.parentRelation?.sourceUrl ?? null) : null
  const summary = {
    focus: () =>
      t('answers.focus', { number: first.numberLabel, nature: first.nature, subdivision: first.subdivision }),
    compare: () => t('answers.compare', { first: first.numberLabel, second: second.numberLabel }),
    parent: () => t('answers.parent', { child: first.numberLabel, parent: second.numberLabel }),
    evidence: () => t('answers.evidence')
  }[result.intent]()

  return (
    <div
      className='flex flex-col gap-3 rounded-md border p-3 text-sm'
      data-testid='assistant-answer'
      data-intent={result.intent}
    >
      <p className='text-muted-foreground text-xs'>{t('question', { question: answer.question })}</p>
      <p className='font-medium' data-testid='assistant-summary'>
        {summary}
      </p>
      {records.length > 0 && (
        <ul className='flex flex-col gap-2'>
          {records.map((record) => (
            <li key={record.id} className='flex flex-wrap items-center gap-2' data-testid='assistant-record'>
              <span className='font-medium'>{record.numberLabel}</span>
              <span className='text-foreground-secondary'>{t('record.outcome')}</span>
              <OutcomeBadge outcome={record.outcomeRaw} />
              {record.sourceUrl ? (
                <SourceLink url={record.sourceUrl} number={record.numberLabel} />
              ) : (
                <span className='text-muted-foreground'>{t('record.noUrl')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {result.intent === 'parent' && first.parentRelation && (
        <p className='text-foreground-secondary' data-testid='assistant-parent-evidence'>
          {t('parentEvidence', { evidence: first.parentRelation.evidence, method: first.parentRelation.method })}{' '}
          {parentUrl && (
            <a
              href={parentUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary focus-visible:ring-ring/50 rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3'
            >
              {t('parentSource')}
            </a>
          )}
        </p>
      )}
      <p className='text-muted-foreground text-xs' data-testid='assistant-caveat'>
        {t(`caveats.${result.intent}`)}
      </p>
      <div className='flex flex-col gap-1'>
        <p className='text-foreground-secondary text-xs font-medium'>{t('actionsLabel')}</p>
        <ul className='text-xs' data-testid='assistant-actions'>
          {answer.actions.map((action, index) => (
            <li key={index}>
              {action.type === 'focus' && t('actions.focus', { number: label(action.id) })}
              {action.type === 'compare' &&
                t('actions.compare', { first: label(action.ids[0]), second: label(action.ids[1]) })}
              {action.type === 'show-evidence' && t('actions.showEvidence')}
            </li>
          ))}
        </ul>
      </div>
      {result.intent !== 'evidence' && amendments.length > 0 && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='self-start'
          onClick={() => onNavigate(result.intent === 'focus' ? 'pfas-detail-title' : 'pfas-comparison-title')}
        >
          {result.intent === 'focus' ? t('goToDetail') : t('goToComparison')}
        </Button>
      )}
    </div>
  )
}
