'use client'

import { useTranslations } from 'next-intl'

import type { PfasAmendment } from '@/apis/pfas-amendments/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { OfficialText } from './official-text'
import { OutcomeBadge } from './outcome-badge'
import { SourceLink } from './source-link'

type AmendmentDetailProps = {
  amendment: PfasAmendment | null
  parent: PfasAmendment | null
  onFocus: (id: string) => void
}

function Field({ label, value }: { label: string; value: string | null }) {
  const t = useTranslations('pfasExperiment.amendment')
  return (
    <div className='flex flex-col'>
      <dt className='text-muted-foreground text-xs'>{label}</dt>
      <dd lang={value ? 'fr' : undefined} className='text-sm'>
        {value ?? t('notRecorded')}
      </dd>
    </div>
  )
}

export function AmendmentDetail({ amendment, parent, onFocus }: AmendmentDetailProps) {
  const t = useTranslations('pfasExperiment.amendment')
  if (!amendment) {
    return (
      <Card>
        <CardContent>
          <p className='text-muted-foreground text-sm'>{t('placeholder')}</p>
        </CardContent>
      </Card>
    )
  }
  const relation = amendment.parentRelation
  return (
    <Card aria-labelledby='pfas-detail-title' data-testid='pfas-detail'>
      <CardHeader>
        <CardTitle id='pfas-detail-title' className='flex flex-wrap items-center gap-2' role='heading' aria-level={2}>
          {t('number', { number: amendment.numberLabel })}
          <OutcomeBadge outcome={amendment.outcomeRaw} />
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <dl className='grid gap-3 sm:grid-cols-2'>
          <Field label={t('subdivision')} value={amendment.subdivision} />
          <Field label={t('paragraph')} value={amendment.paragraph} />
          <Field label={t('nature')} value={amendment.nature} />
          <Field
            label={t('author')}
            value={[amendment.author, amendment.onBehalfOf].filter(Boolean).join(', ') || null}
          />
          <Field label={t('filedOn')} value={amendment.filedOn} />
          <Field label={t('outcomeRecordedAt')} value={amendment.outcomeRecordedAt} />
        </dl>
        <div className='flex flex-col gap-1'>
          <span className='text-muted-foreground text-xs'>{t('outcome')}</span>
          <span lang='fr' className='text-sm font-medium' data-testid='pfas-detail-outcome'>
            {amendment.outcomeRaw ?? t('noOutcome')}
          </span>
        </div>
        <div className='flex flex-col gap-1'>
          <span className='text-muted-foreground text-xs'>{t('source')}</span>
          <SourceLink url={amendment.sourceUrl} number={amendment.numberLabel} />
        </div>
        {relation && (
          <section
            aria-labelledby='pfas-parent-title'
            className='bg-muted flex flex-col gap-2 rounded-md p-3'
            data-testid='pfas-parent'
          >
            <h3 id='pfas-parent-title' className='text-sm font-semibold'>
              {t('parentTitle', { number: relation.parentNumber })}
            </h3>
            <dl className='flex flex-col gap-2'>
              <Field label={t('parentEvidence')} value={relation.evidence} />
              <Field label={t('parentMethod')} value={relation.method} />
              <Field label={t('parentCheck')} value={relation.officialPageCheck} />
            </dl>
            <div className='flex flex-wrap items-center gap-3'>
              <SourceLink url={relation.sourceUrl} number={amendment.numberLabel} />
              {parent && (
                <Button variant='outline' size='sm' onClick={() => onFocus(parent.id)}>
                  {t('viewParent', { number: parent.numberLabel })}
                </Button>
              )}
            </div>
          </section>
        )}
        <section aria-labelledby='pfas-detail-proposal' className='flex flex-col gap-1'>
          <h3 id='pfas-detail-proposal' className='text-sm font-semibold'>
            {t('proposalText')}
          </h3>
          <OfficialText text={amendment.proposalText} />
        </section>
        <details className='group'>
          <summary className='focus-visible:ring-ring/50 cursor-pointer rounded-sm text-sm font-semibold outline-none focus-visible:ring-3'>
            {t('explanatoryText')}
          </summary>
          <OfficialText text={amendment.explanatoryText} className='mt-2' />
        </details>
      </CardContent>
    </Card>
  )
}
