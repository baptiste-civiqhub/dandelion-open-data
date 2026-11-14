'use client'

import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { EvidenceJoinRelation, PfasEvidenceContext } from '@/apis/pfas-evidence/types'
import { Badge } from '@/components/ui/badge'
import { sortEvidenceDocuments } from '@/features/pfas-amendments/lib/evidence-context'

import { EvidenceReferences } from './evidence-references'

const RELATION_VARIANT: Record<EvidenceJoinRelation, 'info' | 'secondary' | 'outline'> = {
  'official-reference': 'info',
  'source-url-match': 'secondary',
  context: 'outline'
}

export function EvidenceExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-primary focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-sm text-sm font-medium break-words underline underline-offset-4 outline-none focus-visible:ring-3'
    >
      {children}
      <ExternalLink aria-hidden='true' className='size-3.5 shrink-0' />
    </a>
  )
}

export function EvidenceTrail({
  context,
  recordLabel
}: {
  context: PfasEvidenceContext
  recordLabel: (id: string) => string
}) {
  const t = useTranslations('pfasExperiment.evidence')
  const documents = sortEvidenceDocuments(context.documents)
  return (
    <div className='flex flex-col gap-4' data-testid='evidence-trail'>
      <p className='text-muted-foreground text-sm'>{t('trail.caution')}</p>
      {documents.length === 0 ? (
        <p className='text-sm'>{t('trail.empty')}</p>
      ) : (
        <section aria-labelledby='evidence-documents-title' className='flex flex-col gap-2'>
          <h4 id='evidence-documents-title' className='text-sm font-semibold'>
            {t('trail.documents')}
          </h4>
          <ol className='flex flex-col gap-2 border-l pl-4'>
            {documents.map((document) => (
              <li key={document.id} className='flex flex-col gap-1' data-testid='evidence-document'>
                <span className='text-muted-foreground text-xs'>
                  {document.date ? <time dateTime={document.date}>{document.date}</time> : t('trail.undated')} ·{' '}
                  {document.kind}
                </span>
                <EvidenceExternalLink href={document.url}>{document.title}</EvidenceExternalLink>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section aria-labelledby='evidence-joins-title' className='flex flex-col gap-2'>
        <h4 id='evidence-joins-title' className='text-sm font-semibold'>
          {t('trail.joins')}
        </h4>
        {context.joins.length === 0 ? (
          <p className='text-muted-foreground text-sm'>{t('trail.noJoins')}</p>
        ) : (
          <ul className='flex flex-col gap-3'>
            {context.joins.map((join) => (
              <li key={join.id} className='flex flex-col gap-1 rounded-md border p-3' data-testid='evidence-join'>
                <Badge variant={RELATION_VARIANT[join.relation]}>{t(`relation.${join.relation}`)}</Badge>
                <p className='text-sm font-medium break-words'>
                  {recordLabel(join.fromId)} → {recordLabel(join.toId)}
                </p>
                <p className='text-muted-foreground text-sm break-words'>
                  {t('trail.method')} : {join.method}
                </p>
                <p className='text-sm break-words'>
                  {t('trail.evidence')} : {join.evidence}
                </p>
                <EvidenceReferences sourceIds={join.sourceIds} sources={context.sources} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {context.facts.length > 0 && (
        <section aria-labelledby='evidence-facts-title' className='flex flex-col gap-2'>
          <h4 id='evidence-facts-title' className='text-sm font-semibold'>
            {t('trail.facts')}
          </h4>
          <ul className='flex flex-col gap-2'>
            {context.facts.map((fact) => (
              <li key={fact.id} className='text-sm break-words' data-testid='evidence-fact'>
                <span className='font-medium'>{fact.title}</span> : {fact.text}
                <span className='text-muted-foreground block'>
                  {t('trail.limitation')} : {fact.limitation}
                </span>
                <EvidenceReferences sourceIds={fact.sourceIds} sources={context.sources} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
