'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import type { AmendementSummary } from '@/apis/amendements/types'
import { useGetAmendementAnalysis } from '@/apis/amendement-analysis'
import type { AnalysisOverlap, ComparisonAnalysis } from '@/apis/amendement-analysis/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { useAnalysisLocale, useSelectedAmendement } from '../hooks/use-selected-amendement'
import { findAmendementByNumero, findRelatedAmendements } from '../lib/related-amendements'
import { AnalysisOutcome } from './analysis-outcome'
import { PointList } from './point-list'

const TITLE_ID = 'comparison-title'
const NUMBER_INPUT_ID = 'comparison-number'

/**
 * Comparaison de l'amendement sélectionné avec un amendement lié par la source (parent, identiques,
 * sous-amendements, discussion commune) ou choisi par son numéro. Le recouvrement lexical est calculé sans IA et
 * affiché à part de la lecture du modèle. Rien ne part avant le clic sur « Compare ».
 */
export function ComparisonWidget({ amendements }: { amendements: readonly AmendementSummary[] }) {
  const t = useTranslations('dataviz.comparison')
  const amendement = useSelectedAmendement()
  if (!amendement) return null

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <WidgetTitle id={TITLE_ID}>{t('title')}</WidgetTitle>
        <WidgetDescription>{t('description', { numero: amendement.numeroLong })}</WidgetDescription>
      </WidgetHeader>
      <ComparisonPanel key={amendement.id} amendement={amendement} amendements={amendements} />
    </Widget>
  )
}

function ComparisonPanel({
  amendement,
  amendements
}: {
  amendement: AmendementSummary
  amendements: readonly AmendementSummary[]
}) {
  const t = useTranslations('dataviz.comparison')
  const locale = useAnalysisLocale()
  const related = useMemo(() => findRelatedAmendements(amendement, amendements), [amendement, amendements])
  const [other, setOther] = useState<AmendementSummary | null>(null)
  const [numero, setNumero] = useState('')
  const [missingNumero, setMissingNumero] = useState<string | null>(null)
  const query = useGetAmendementAnalysis(
    other ? { mode: 'compare', amendementIds: [amendement.id, other.id], locale } : null
  )

  const submitNumero = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = findAmendementByNumero(amendements, numero)
    if (!found || found.id === amendement.id) return setMissingNumero(numero.trim())
    setMissingNumero(null)
    setOther(found)
  }

  return (
    <WidgetContent>
      <div className='flex flex-col gap-1'>
        <p className='text-muted-foreground text-xs font-medium'>{t('related')}</p>
        {related.length ? (
          <ul className='flex max-h-40 flex-col gap-1 overflow-y-auto'>
            {related.map(({ amendement: item, relation }) => (
              <li
                key={item.id}
                className={cn('flex items-center gap-2 rounded-sm px-1', other?.id === item.id && 'bg-secondary')}
              >
                <span className='font-medium tabular-nums'>{t('amendment', { numero: item.numeroLong })}</span>
                <Badge variant='outline'>{t(`relation.${relation}`)}</Badge>
                <Button
                  size='sm'
                  variant='ghost'
                  className='ml-auto'
                  aria-pressed={other?.id === item.id}
                  aria-label={t('compareWith', { numero: item.numeroLong })}
                  onClick={() => setOther(item)}
                >
                  {t('compare')}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-muted-foreground text-xs'>{t('noRelated')}</p>
        )}
      </div>
      <form className='flex flex-col gap-1' onSubmit={submitNumero}>
        <label htmlFor={NUMBER_INPUT_ID} className='text-muted-foreground text-xs font-medium'>
          {t('numberLabel')}
        </label>
        <div className='flex gap-2'>
          <Input
            id={NUMBER_INPUT_ID}
            value={numero}
            onChange={(event) => setNumero(event.target.value)}
            placeholder={t('numberPlaceholder')}
            aria-invalid={missingNumero !== null}
            autoComplete='off'
          />
          <Button type='submit' size='sm' variant='secondary' className='h-9' disabled={!numero.trim()}>
            <GitCompareArrows />
            {t('compare')}
          </Button>
        </div>
        {missingNumero !== null ? (
          <p role='alert' className='text-muted-foreground text-xs'>
            {t('notFound', { numero: missingNumero })}
          </p>
        ) : null}
      </form>
      {other ? (
        <div className='flex flex-col gap-3 border-t pt-3'>
          <p className='font-medium'>{t('pair', { first: amendement.numeroLong, second: other.numeroLong })}</p>
          {query.data?.overlap ? <OverlapFacts overlap={query.data.overlap} /> : null}
          <AnalysisOutcome query={query} onRetry={() => void query.refetch()}>
            {(response) =>
              response.analysis.kind === 'compare' ? <ComparisonView analysis={response.analysis} /> : null
            }
          </AnalysisOutcome>
        </div>
      ) : null}
    </WidgetContent>
  )
}

function OverlapFacts({ overlap }: { overlap: AnalysisOverlap }) {
  const t = useTranslations('dataviz.comparison')
  const format = useFormatter()
  const percent = (value: number) => format.number(value, { style: 'percent', maximumFractionDigits: 0 })
  const lines = [
    overlap.dispositif
      ? overlap.dispositif.isIdentical
        ? t('identicalDispositif')
        : t('overlapDispositif', { percent: percent(overlap.dispositif.similarity) })
      : null,
    overlap.expose
      ? overlap.expose.isIdentical
        ? t('identicalExpose')
        : t('overlapExpose', { percent: percent(overlap.expose.similarity) })
      : null
  ].filter((line): line is string => line !== null)
  if (!lines.length) return null

  return (
    <div className='flex flex-col gap-1'>
      <Badge variant='outline'>{t('computed')}</Badge>
      {lines.map((line) => (
        <p key={line} className='text-muted-foreground text-xs'>
          {line}
        </p>
      ))}
    </div>
  )
}

function ComparisonView({ analysis }: { analysis: ComparisonAnalysis }) {
  const t = useTranslations('dataviz.comparison')
  return (
    <div className='flex flex-col gap-2'>
      <Badge variant='secondary'>{t(`verdict.${analysis.relation}`)}</Badge>
      <p>{analysis.summary}</p>
      <PointList title={t('similarities')} points={analysis.similarities} />
      <PointList title={t('differences')} points={analysis.differences} />
    </div>
  )
}
