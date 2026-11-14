'use client'

import { Download } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { PfasEvidenceContext } from '@/apis/pfas-evidence/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildEvidenceMarkdown } from '@/features/pfas-amendments/lib/evidence-markdown'

import { EvidenceExternalLink } from './evidence-trail'

export function EvidenceHemicycleStatus({ hemicycle }: { hemicycle: PfasEvidenceContext['hemicycle'] }) {
  const t = useTranslations('pfasExperiment.evidence.hemicycle')
  return (
    <div className='flex flex-col gap-1 rounded-md border p-3' data-testid='evidence-hemicycle'>
      <p className='text-sm font-semibold'>{t('title')}</p>
      <Badge variant={hemicycle.status === 'verified-snapshot' ? 'info' : 'warning'} className='whitespace-normal'>
        {t(hemicycle.status)}
      </Badge>
      <p className='text-sm'>{t('rows', { rows: hemicycle.rows, matched: hemicycle.matchedRows })}</p>
      {hemicycle.dataset && (
        <p className='text-muted-foreground text-sm'>{t('dataset', { dataset: hemicycle.dataset })}</p>
      )}
      {hemicycle.note && <p className='text-muted-foreground text-sm break-words'>{hemicycle.note}</p>}
    </div>
  )
}

export function EvidenceSources({
  context,
  recordLabel
}: {
  context: PfasEvidenceContext
  recordLabel: (id: string) => string
}) {
  const t = useTranslations('pfasExperiment.evidence')

  const download = () => {
    const markdown = buildEvidenceMarkdown(
      context,
      new Date().toISOString(),
      {
        title: t('note.title'),
        generatedAt: t('note.generatedAt'),
        scope: t('note.scope'),
        retrievedAt: t('note.retrievedAt'),
        documents: t('note.documents'),
        joins: t('note.joins'),
        facts: t('note.facts'),
        sources: t('note.sources'),
        hemicycle: t('note.hemicycle'),
        hemicycleStatus: (status) => t(`hemicycle.${status}`),
        hemicycleRows: (rows, matched) => t('note.rows', { rows, matched }),
        relation: (relation) => t(`relation.${relation}`),
        method: t('note.method'),
        evidence: t('note.evidence'),
        limitation: t('note.limitation'),
        undated: t('note.undated'),
        sourceKind: (kind) => t(`sources.kind.${kind}`),
        licence: t('note.licence'),
        none: t('note.none'),
        limitations: t('note.limitations'),
        limitationItems: (['causality', 'law', 'official', 'snapshot'] as const).map((key) =>
          t(`note.limitationItems.${key}`)
        )
      },
      recordLabel
    )
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'pfas-parcours-documentaire.md'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className='flex flex-col gap-3' data-testid='evidence-sources'>
      <p className='text-sm'>{t('sources.retrievedAt', { date: context.retrievedAtUtc })}</p>
      <p className='text-muted-foreground text-sm break-words'>{t('sources.scope', { scope: context.scope })}</p>
      <EvidenceHemicycleStatus hemicycle={context.hemicycle} />
      <ul className='flex flex-col gap-3'>
        {context.sources.map((source) => (
          <li key={source.id} className='flex flex-col gap-1 text-sm' data-testid='evidence-source'>
            <span className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline'>{t(`sources.kind.${source.kind}`)}</Badge>
              <span className='text-muted-foreground'>{source.publisher}</span>
            </span>
            <EvidenceExternalLink href={source.url}>{source.title}</EvidenceExternalLink>
            <span className='text-muted-foreground text-xs break-all'>
              {t('sources.id', { id: source.id })} · {t('sources.retrievedAt', { date: source.retrievedAtUtc })}
            </span>
            {source.licenceUrl && (
              <EvidenceExternalLink href={source.licenceUrl}>{t('sources.licence')}</EvidenceExternalLink>
            )}
            {source.note && <span className='text-muted-foreground break-words'>{source.note}</span>}
          </li>
        ))}
      </ul>
      <p className='text-muted-foreground text-xs'>{t('sources.officialNote')}</p>
      <div className='flex flex-wrap items-center gap-3'>
        <Button variant='outline' size='sm' onClick={download} data-testid='evidence-export'>
          <Download aria-hidden='true' />
          {t('export.button')}
        </Button>
        <span className='text-muted-foreground text-xs'>{t('export.local')}</span>
      </div>
    </div>
  )
}
