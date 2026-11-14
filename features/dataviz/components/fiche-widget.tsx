'use client'

import { ExternalLink, Maximize2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useGetAmendementDetail } from '@/apis/amendements'
import type { Sort } from '@/apis/sorts/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { useHoverStore, useSunburstStores, useViewStore } from '../hooks/use-sunburst-store'
import { toPlainText } from '../lib/plain-text'
import { containerOf, pathTo, type SunburstNode } from '../lib/sunburst-tree'
import { SortSwatch } from './sort-swatch'

const TITLE_ID = 'fiche-title'

/**
 * Fiche (F5) : sans sélection, le focus ; avec sélection, l'amendement complet, dont les textes longs se chargent au
 * clic (R7). Le survol d'un secteur montre un aperçu, marqué comme tel, construit avec la seule donnée déjà chargée
 * (BR-H1, BR-H2) ; la fiche épinglée revient telle quelle à la sortie du survol.
 */
export function FicheWidget({ sortsByCode }: { sortsByCode: ReadonlyMap<string, Sort> }) {
  const t = useTranslations('dataviz')
  const tree = useViewStore((state) => state.tree)
  const focusId = useViewStore((state) => state.focusId)
  const selectionId = useViewStore((state) => state.selectionId)
  const hoverId = useHoverStore((state) => state.nodeId)
  if (!tree) return null

  const focus = tree.byId.get(focusId) ?? tree.root
  const selection = selectionId ? tree.byId.get(selectionId) : undefined
  const hovered = hoverId ? tree.byId.get(hoverId) : undefined
  const pinned = selection ?? focus
  const preview = hovered && hovered !== pinned ? hovered : undefined
  const subject = preview ?? pinned

  return (
    <Widget aria-labelledby={TITLE_ID} aria-live='polite'>
      <WidgetHeader>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-muted-foreground text-xs font-medium'>{t('fiche.title')}</p>
          {preview ? <Badge variant='outline'>{t('fiche.preview')}</Badge> : null}
        </div>
        <WidgetTitle id={TITLE_ID} className={cn(preview && 'text-muted-foreground')}>
          {subject.amendement ? t('fiche.amendment', { numero: subject.label }) : subject.label}
        </WidgetTitle>
      </WidgetHeader>
      {subject.amendement ? (
        <AmendementFiche node={subject} sortsByCode={sortsByCode} full={!preview} />
      ) : (
        <ContainerFiche node={subject} />
      )}
    </Widget>
  )
}

function ContainerFiche({ node }: { node: SunburstNode }) {
  const t = useTranslations('dataviz')
  const articles = node.children.filter((child) => child.kind === 'article').length
  const alineas = node.children.filter((child) => child.kind === 'alinea').length
  return (
    <WidgetContent>
      <p className='text-muted-foreground'>
        {[
          articles ? t('fiche.articles', { count: articles }) : null,
          alineas ? t('fiche.alineas', { count: alineas }) : null,
          t('sunburst.count', { count: node.value })
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p className='text-muted-foreground text-xs'>{t('fiche.hint')}</p>
    </WidgetContent>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <dt className='text-muted-foreground text-xs'>{label}</dt>
      <dd className='text-sm'>{children}</dd>
    </div>
  )
}

function AmendementFiche({
  node,
  sortsByCode,
  full
}: {
  node: SunburstNode
  sortsByCode: ReadonlyMap<string, Sort>
  full: boolean
}) {
  const t = useTranslations('dataviz')
  const { view } = useSunburstStores()
  const amendement = node.amendement!
  const sort = sortsByCode.get(amendement.sort)
  const container = containerOf(node)
  const location = pathTo(node).slice(1, -1)
  const detail = useGetAmendementDetail(full ? amendement.id : null)
  const subs = node.children.length

  return (
    <WidgetContent className='gap-3'>
      <dl className='flex flex-col gap-2'>
        <Field label={t('fiche.outcome')}>
          <span className='flex items-center gap-2'>
            {sort ? <SortSwatch colorToken={sort.colorToken} /> : null}
            {sort?.label ?? amendement.sort}
          </span>
        </Field>
        <Field label={t('fiche.location')}>
          {full ? (
            <button
              type='button'
              onClick={() => view.getState().focus(container.id)}
              className='focus-visible:ring-ring/50 text-left underline-offset-4 outline-none hover:underline focus-visible:ring-3'
            >
              {location.map((step) => step.label).join(' › ')}
            </button>
          ) : (
            location.map((step) => step.label).join(' › ')
          )}
        </Field>
        {subs ? <Field label={t('fiche.subAmendments', { count: subs })}>{null}</Field> : null}
        {amendement.groupePolitiqueRef ? <Field label={t('fiche.group')}>{amendement.groupePolitiqueRef}</Field> : null}
        {full ? (
          detail.isPending ? (
            <div aria-busy className='flex flex-col gap-2'>
              <Skeleton className='h-4 w-1/2' />
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
            </div>
          ) : detail.isError ? (
            <p role='alert' className='text-muted-foreground text-sm'>
              {t('fiche.detailError')}
            </p>
          ) : (
            <>
              {detail.data.signataires ? (
                <Field label={t('fiche.author')}>
                  <span className='block max-h-16 overflow-y-auto'>{detail.data.signataires}</span>
                </Field>
              ) : null}
              {detail.data.dispositif ? (
                <Field label={t('fiche.dispositif')}>
                  <span className='block max-h-40 overflow-y-auto whitespace-pre-line'>
                    {toPlainText(detail.data.dispositif)}
                  </span>
                </Field>
              ) : null}
              {detail.data.exposeSommaire ? (
                <Field label={t('fiche.expose')}>
                  <span className='block max-h-40 overflow-y-auto whitespace-pre-line'>
                    {toPlainText(detail.data.exposeSommaire)}
                  </span>
                </Field>
              ) : null}
            </>
          )
        ) : null}
      </dl>
      {full ? (
        <div className='flex flex-wrap gap-2'>
          {subs ? (
            <Button size='sm' variant='outline' onClick={() => view.getState().focus(node.id)}>
              <Maximize2 className='size-4' />
              {t('fiche.open')}
            </Button>
          ) : null}
          {detail.data?.documentUri ? (
            <Button size='sm' variant='outline' asChild>
              <a href={detail.data.documentUri} target='_blank' rel='noreferrer'>
                <ExternalLink className='size-4' />
                {t('fiche.official')}
              </a>
            </Button>
          ) : null}
          <Button size='sm' variant='ghost' onClick={() => view.getState().select(null)}>
            <X className='size-4' />
            {t('fiche.clearSelection')}
          </Button>
        </div>
      ) : null}
      {!full ? <WidgetDescription>{t('fiche.hint')}</WidgetDescription> : null}
    </WidgetContent>
  )
}
