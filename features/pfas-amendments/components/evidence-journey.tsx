'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'

import type { PfasAmendment } from '@/apis/pfas-amendments/types'
import { useGetPfasEvidenceContext } from '@/apis/pfas-evidence'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveEvidencePreset, type EvidencePresetKey } from '@/features/pfas-amendments/lib/evidence-presets'
import { cn } from '@/lib/utils'

import { focusHeading } from './evidence-focus'
import { EvidenceSources } from './evidence-sources'
import { EvidenceTrail } from './evidence-trail'
import { OutcomeBadge } from './outcome-badge'
import { SourceLink } from './source-link'

type QuestionKey = EvidencePresetKey | 'trail'
const QUESTIONS: QuestionKey[] = ['wording', 'parent', 'trail']

type EvidenceJourneyProps = {
  amendments: PfasAmendment[]
  onApply: (selectedIds: string[], focusedId: string) => void
  /** Incrémenté par un hôte (assistant) pour ouvrir la question C et les sources. */
  trailRequest?: number
}

export function EvidenceJourney({ amendments, onApply, trailRequest = 0 }: EvidenceJourneyProps) {
  const t = useTranslations('pfasExperiment.evidence')
  const [active, setActive] = useState<QuestionKey | null>(null)
  const [contextRequested, setContextRequested] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [seenTrailRequest, setSeenTrailRequest] = useState(trailRequest)
  if (trailRequest !== seenTrailRequest) {
    setSeenTrailRequest(trailRequest)
    setActive('trail')
    setContextRequested(true)
  }
  const amendmentIds = useMemo(() => amendments.map((amendment) => amendment.id), [amendments])
  const context = useGetPfasEvidenceContext(amendmentIds, contextRequested)
  const presets = useMemo(
    () => ({
      wording: resolveEvidencePreset(amendments, 'wording'),
      parent: resolveEvidencePreset(amendments, 'parent')
    }),
    [amendments]
  )

  const recordLabel = useCallback(
    (id: string) => {
      const amendment = amendments.find((item) => item.id === id)
      if (amendment) return t('note.amendment', { number: amendment.numberLabel })
      const record =
        context.data?.documents.find((document) => document.id === id) ??
        context.data?.sources.find((source) => source.id === id)
      return record?.title ?? id
    },
    [amendments, context.data, t]
  )

  const choose = (key: QuestionKey) => {
    setActive(key)
    if (key === 'trail') return setContextRequested(true)
    const preset = presets[key]
    if (preset.status === 'available') onApply(preset.selectedIds, preset.focusedId)
  }

  const renderContext = (render: (data: NonNullable<typeof context.data>) => React.ReactNode) => {
    if (context.isPending) return <Skeleton className='h-24 w-full' aria-label={t('trail.loading')} />
    if (context.isError || !context.data)
      return (
        <div role='alert' className='flex flex-wrap items-center gap-3 text-sm' data-testid='evidence-error'>
          {t('trail.error')}
          <Button variant='outline' size='sm' onClick={() => context.refetch()}>
            {t('trail.retry')}
          </Button>
        </div>
      )
    return render(context.data)
  }

  const renderResult = () => {
    if (!active) return null
    if (active === 'trail')
      return (
        <>
          <h3 className='text-base font-semibold'>{t('trail.title')}</h3>
          {renderContext((data) => (
            <EvidenceTrail context={data} recordLabel={recordLabel} />
          ))}
        </>
      )
    const preset = presets[active]
    if (preset.status === 'unavailable')
      return (
        <p role='alert' className='text-sm' data-testid='evidence-unavailable'>
          {t(`unavailable.${preset.reason}`, { numbers: preset.numbers.join(', ') })}
        </p>
      )
    if (active === 'wording')
      return (
        <>
          <p className='text-sm'>{t('wording.result')}</p>
          <ul className='flex flex-col gap-2'>
            {preset.amendments.map((amendment) => (
              <li key={amendment.id} className='flex flex-wrap items-center gap-2 text-sm'>
                <span className='font-medium'>{t('note.amendment', { number: amendment.numberLabel })}</span>
                <OutcomeBadge outcome={amendment.outcomeRaw} />
                <SourceLink url={amendment.sourceUrl} number={amendment.numberLabel} />
              </li>
            ))}
          </ul>
          <p className='text-muted-foreground text-sm'>{t('wording.caution')}</p>
          <Button
            variant='outline'
            size='sm'
            className='w-fit'
            onClick={() => {
              onApply(preset.selectedIds, preset.focusedId)
              requestAnimationFrame(() => focusHeading('pfas-comparison-title'))
            }}
          >
            {t('wording.action')}
          </Button>
        </>
      )
    const [child, parent] = preset.amendments
    const relation = child.parentRelation
    return (
      <>
        <p className='text-sm'>{t('parent.result', { child: child.numberLabel, parent: parent.numberLabel })}</p>
        {relation && (
          <>
            <p lang='fr' className='text-sm break-words'>
              {t('parent.evidence', { evidence: relation.evidence })}
            </p>
            <p className='text-muted-foreground text-sm break-words'>
              {t('parent.method', { method: relation.method })}
            </p>
          </>
        )}
        <ul className='flex flex-col gap-2'>
          {preset.amendments.map((amendment) => (
            <li key={amendment.id} className='flex flex-wrap items-center gap-2 text-sm'>
              <span className='font-medium'>{t('note.amendment', { number: amendment.numberLabel })}</span>
              <OutcomeBadge outcome={amendment.outcomeRaw} />
              <SourceLink url={amendment.sourceUrl} number={amendment.numberLabel} />
            </li>
          ))}
        </ul>
        <Button
          variant='outline'
          size='sm'
          className='w-fit'
          onClick={() => {
            onApply(preset.selectedIds, preset.focusedId)
            requestAnimationFrame(() => focusHeading('pfas-detail-title'))
          }}
        >
          {t('parent.action', { child: child.numberLabel })}
        </Button>
      </>
    )
  }

  return (
    <Card aria-labelledby='evidence-title' data-testid='evidence-journey'>
      <CardHeader>
        <CardTitle id='evidence-title' role='heading' aria-level={2}>
          {t('title')}
        </CardTitle>
        <CardDescription>{t('scope')}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div role='group' aria-label={t('questionsLabel')} className='grid gap-2 md:grid-cols-3'>
          {QUESTIONS.map((key) => {
            const preset = key === 'trail' ? null : presets[key]
            return (
              <Button
                key={key}
                variant={active === key ? 'secondary' : 'outline'}
                aria-pressed={active === key}
                aria-describedby={`evidence-hint-${key}`}
                data-testid={`evidence-question-${key}`}
                data-available={preset ? preset.status === 'available' : undefined}
                onClick={() => choose(key)}
                className={cn('h-auto flex-col items-start gap-1 py-3 text-left whitespace-normal')}
              >
                <span>{t(`${key}.question`)}</span>
                <span id={`evidence-hint-${key}`} className='text-muted-foreground text-xs font-normal'>
                  {t(`${key}.hint`)}
                </span>
              </Button>
            )
          })}
        </div>
        {active && (
          <section
            aria-label={t('active')}
            aria-live='polite'
            className='flex flex-col gap-3 rounded-md border p-4'
            data-testid='evidence-result'
          >
            {renderResult()}
          </section>
        )}
        <details
          className='rounded-md border p-3'
          data-testid='evidence-disclosure'
          onToggle={(event) => {
            const open = event.currentTarget.open
            setSourcesOpen(open)
            if (open) setContextRequested(true)
          }}
        >
          <summary className='focus-visible:ring-ring/50 cursor-pointer rounded-sm text-sm font-semibold outline-none focus-visible:ring-3'>
            {t('sources.title')}
            <span className='text-muted-foreground block text-xs font-normal'>{t('sources.summary')}</span>
          </summary>
          <div className='pt-3'>
            {sourcesOpen && renderContext((data) => <EvidenceSources context={data} recordLabel={recordLabel} />)}
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
