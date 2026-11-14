'use client'

import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import type { PfasAmendment, PfasProvenance } from '@/apis/pfas-amendments/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { diffTexts, toSegments } from '@/features/pfas-amendments/lib/lexical-diff'
import { buildMarkdownNote, type MarkdownNoteLabels } from '@/features/pfas-amendments/lib/markdown-note'

import { OfficialText } from './official-text'
import { OutcomeBadge } from './outcome-badge'
import { SourceLink } from './source-link'

type AmendmentComparisonProps = {
  amendments: PfasAmendment[]
  provenance: PfasProvenance
}

function useNoteLabels(): MarkdownNoteLabels {
  const t = useTranslations('pfasExperiment')
  return {
    title: (numbers) => t('note.title', { numbers }),
    snapshotWarning: t('note.snapshotWarning'),
    corpus: t('note.corpus'),
    dataset: t('note.dataset'),
    retrievedAt: t('snapshot.retrievedAt'),
    sha256: t('snapshot.sha256'),
    licence: t('snapshot.licence'),
    parser: t('snapshot.import'),
    amendment: (number) => t('amendment.number', { number }),
    id: t('note.id'),
    nature: t('amendment.nature'),
    subdivision: t('amendment.subdivision'),
    paragraph: t('amendment.paragraph'),
    author: t('amendment.author'),
    filedOn: t('amendment.filedOn'),
    outcome: t('amendment.outcome'),
    outcomeRecordedAt: t('amendment.outcomeRecordedAt'),
    parent: (number) => t('amendment.parentTitle', { number }),
    parentEvidence: t('amendment.parentEvidence'),
    source: t('amendment.source'),
    noSource: t('amendment.noSource'),
    notRecorded: t('amendment.notRecorded'),
    proposalText: t('amendment.proposalText'),
    emptyText: t('amendment.empty'),
    differences: t('comparison.title'),
    onlyIn: (number) => t('note.onlyIn', { number }),
    noUniqueWords: t('note.noUniqueWords'),
    comparisonUnavailable: t('comparison.tooLong'),
    typographyIgnored: (ignored) => t(ignored ? 'note.typographyIgnored' : 'note.typographyKept'),
    limitations: t('note.limitations'),
    limitationItems: [t('note.limitation1'), t('note.limitation2'), t('note.limitation3'), t('note.limitation4')]
  }
}

export function AmendmentComparison({ amendments, provenance }: AmendmentComparisonProps) {
  const t = useTranslations('pfasExperiment.comparison')
  const tExport = useTranslations('pfasExperiment.export')
  const tAmendment = useTranslations('pfasExperiment.amendment')
  const labels = useNoteLabels()
  const [ignoreTypography, setIgnoreTypography] = useState(false)
  const [exportedNote, setExportedNote] = useState<{ key: string; markdown: string } | null>(null)
  const pair = amendments.length === 2 ? (amendments as [PfasAmendment, PfasAmendment]) : null
  const noteKey = JSON.stringify([amendments.map((amendment) => amendment.id), ignoreTypography])
  const note = exportedNote?.key === noteKey ? exportedNote.markdown : null

  const diff = useMemo(
    () => (pair ? diffTexts(pair[0].proposalText, pair[1].proposalText, { ignoreTypography }) : null),
    [pair, ignoreTypography]
  )

  if (!pair) {
    return (
      <Card>
        <CardHeader>
          <CardTitle role='heading' aria-level={2}>
            {t('title')}
          </CardTitle>
          <CardDescription>{amendments.length === 1 ? t('one') : t('empty')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const exportNote = () => {
    const markdown = buildMarkdownNote({
      amendments: pair,
      provenance,
      generatedAt: new Date().toISOString(),
      ignoreTypography,
      labels
    })
    setExportedNote({ key: noteKey, markdown })
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `pfas-amendments-${pair[0].number}-${pair[1].number}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const sides = diff ? [diff.a, diff.b] : [null, null]
  const uniqueCounts = diff ? [diff.onlyInA, diff.onlyInB] : [null, null]

  return (
    <Card aria-labelledby='pfas-comparison-title' data-testid='pfas-comparison'>
      <CardHeader>
        <CardTitle id='pfas-comparison-title' role='heading' aria-level={2}>
          {t('title')}
        </CardTitle>
        <CardDescription>{t('disclaimer')}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2 rounded-md border p-3 text-sm'>
          <span className='font-semibold'>{t('legend')}</span>
          <span>{t('legendShared')}</span>
          <span>
            <mark className='bg-editorial-yellow text-foreground rounded-sm underline decoration-2'>
              {t('legendSample')}
            </mark>{' '}
            {t('legendUnique')}
          </span>
          <label className='flex items-center gap-2'>
            <input
              type='checkbox'
              className='accent-primary size-4'
              checked={ignoreTypography}
              onChange={(event) => setIgnoreTypography(event.target.checked)}
            />
            {t('ignoreTypography')}
          </label>
        </div>
        {!diff && <p className='text-muted-foreground text-sm'>{t('tooLong')}</p>}
        <div className='grid gap-4 md:grid-cols-2'>
          {pair.map((amendment, index) => {
            const tokens = sides[index]
            return (
              <section
                key={amendment.id}
                aria-labelledby={`pfas-compare-${amendment.id}`}
                data-testid={`pfas-compare-${amendment.number}`}
                className='flex min-w-0 flex-col gap-3 rounded-md border p-3'
              >
                <h3
                  id={`pfas-compare-${amendment.id}`}
                  className='flex flex-wrap items-center gap-2 text-sm font-semibold'
                >
                  {tAmendment('number', { number: amendment.numberLabel })}
                  <OutcomeBadge outcome={amendment.outcomeRaw} />
                </h3>
                <p className='text-muted-foreground text-xs'>
                  <span lang='fr'>{amendment.subdivision}</span>
                  {amendment.parentRelation &&
                    ` · ${tAmendment('parentTitle', { number: amendment.parentRelation.parentNumber })}`}
                </p>
                <SourceLink url={amendment.sourceUrl} number={amendment.numberLabel} />
                {uniqueCounts[index] !== null && (
                  <p className='text-foreground-secondary text-xs'>
                    {t('uniqueCount', { count: uniqueCounts[index] })}
                  </p>
                )}
                <h4 className='text-xs font-semibold'>{tAmendment('proposalText')}</h4>
                <OfficialText
                  text={amendment.proposalText}
                  segments={tokens ? toSegments(amendment.proposalText, tokens) : undefined}
                />
              </section>
            )
          })}
        </div>
        <section aria-labelledby='pfas-explanatory-title' className='flex flex-col gap-2'>
          <h3 id='pfas-explanatory-title' className='text-sm font-semibold'>
            {t('explanatoryTitle')}
          </h3>
          <p className='text-muted-foreground text-xs'>{t('explanatoryHint')}</p>
          <div className='grid gap-4 md:grid-cols-2'>
            {pair.map((amendment) => (
              <details key={amendment.id} className='rounded-md border p-3'>
                <summary className='focus-visible:ring-ring/50 cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-3'>
                  {tAmendment('number', { number: amendment.numberLabel })}
                </summary>
                <OfficialText text={amendment.explanatoryText} className='mt-2' />
              </details>
            ))}
          </div>
        </section>
        <div className='flex flex-col gap-2 border-t pt-4'>
          <div className='flex flex-wrap items-center gap-3'>
            <Button variant='outline' onClick={exportNote}>
              <Download aria-hidden='true' />
              {tExport('button')}
            </Button>
            <span className='text-muted-foreground text-xs'>{tExport('local')}</span>
          </div>
          {note && (
            <label className='flex flex-col gap-1 text-sm'>
              <span className='font-medium'>{tExport('preview')}</span>
              <textarea
                readOnly
                value={note}
                rows={12}
                data-testid='pfas-note'
                className='bg-muted focus-visible:ring-ring/50 w-full rounded-md border p-2 font-mono text-xs outline-none focus-visible:ring-3'
              />
            </label>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
