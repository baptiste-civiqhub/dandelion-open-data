'use client'

import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState, type ComponentType } from 'react'

import { useGetPfasSnapshot } from '@/apis/pfas-amendments'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PUBLIC_PATHS } from '@/constant/path'
import { buildHierarchy, findAmendment } from '@/features/pfas-amendments/lib/hierarchy'
import { Link } from '@/i18n/navigation'

import { AmendmentComparison } from './amendment-comparison'
import { AmendmentDetail } from './amendment-detail'
import { AmendmentGraph } from './amendment-graph'
import { AmendmentTree } from './amendment-tree'
import { EvidenceJourney } from './evidence-journey'
import type { GraphCanvasProps } from './graph-canvas-types'
import { SnapshotNotice } from './snapshot-notice'

const INITIAL_SUBDIVISION = 'Article 1er'

type PfasScreenProps = { Canvas?: ComponentType<GraphCanvasProps>; engine?: 'native' | 'cosmograph' }

export function PfasScreen({ Canvas, engine = 'native' }: PfasScreenProps) {
  const t = useTranslations('pfasExperiment')
  const { data, isPending, isError, refetch } = useGetPfasSnapshot()
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const amendments = useMemo(() => data?.amendments ?? [], [data])
  const groups = useMemo(() => buildHierarchy(amendments), [amendments])
  const focused = findAmendment(amendments, focusedId)
  const parent = findAmendment(amendments, focused?.parentId ?? null)
  const selected = selectedIds.map((id) => findAmendment(amendments, id)).filter((a) => a !== null)

  const toggleSelect = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : current.length < 2 ? [...current, id] : current
    )

  return (
    <main lang='fr' className='bg-background min-h-dvh px-4 py-8 sm:px-6'>
      <div className='mx-auto flex max-w-7xl flex-col gap-6'>
        <header className='flex flex-col gap-2'>
          <Link
            href={PUBLIC_PATHS.HOME}
            className='text-muted-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-3'
          >
            <ArrowLeft aria-hidden='true' className='size-4' />
            {t('header.back')}
          </Link>
          <p className='text-foreground-secondary text-xs font-medium tracking-wide uppercase'>{t('header.eyebrow')}</p>
          <h1 className='text-2xl font-semibold'>{t('header.title')}</h1>
          <p className='text-foreground-secondary max-w-3xl text-sm'>{t('header.intro')}</p>
          <nav aria-label={t('views.label')} className='mt-2 flex flex-wrap gap-2'>
            {(['native', 'cosmograph'] as const).map((view) => (
              <Button key={view} asChild variant={view === engine ? 'default' : 'outline'} size='sm'>
                <Link
                  href={view === 'native' ? PUBLIC_PATHS.PFAS_EXPERIMENT : PUBLIC_PATHS.PFAS_COSMOGRAPH}
                  prefetch={false}
                  aria-current={view === engine ? 'page' : undefined}
                >
                  {t(`views.${view}`)}
                </Link>
              </Button>
            ))}
          </nav>
          <p className='text-muted-foreground text-xs'>{t(`views.${engine}Description`)}</p>
        </header>

        {isPending && (
          <div className='flex flex-col gap-3' aria-busy='true' aria-label={t('loading')}>
            <Skeleton className='h-24 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        )}

        {isError && (
          <div
            role='alert'
            className='bg-feedback-danger-soft flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm'
          >
            {t('error')}
            <Button variant='outline' size='sm' onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        )}

        {data && (
          <>
            <EvidenceJourney
              amendments={amendments}
              onApply={(ids, focus) => {
                setSelectedIds(ids)
                setFocusedId(focus)
              }}
            />
            <SnapshotNotice provenance={data.provenance} rows={data.counts.rows} />
            <AmendmentGraph
              Canvas={Canvas}
              animated={engine === 'cosmograph'}
              amendments={amendments}
              focusedId={focusedId}
              selectedIds={selectedIds}
              onFocus={setFocusedId}
              onToggleSelect={toggleSelect}
            />
            <div className='grid gap-6 lg:grid-cols-5'>
              <section aria-labelledby='pfas-explorer-title' className='flex min-w-0 flex-col gap-3 lg:col-span-2'>
                <div className='flex flex-col gap-1'>
                  <h2 id='pfas-explorer-title' className='text-lg font-semibold'>
                    {t('explorer.title')}
                  </h2>
                  <p lang='fr' className='text-muted-foreground text-xs'>
                    {data.provenance.text}
                  </p>
                  <p className='text-foreground-secondary text-sm'>
                    {t('explorer.summary', { groups: groups.length, count: amendments.length })}
                  </p>
                </div>
                <div
                  className='bg-muted flex flex-wrap items-center gap-2 rounded-md p-2 text-sm'
                  aria-live='polite'
                  data-testid='pfas-selection'
                >
                  <span>{t('explorer.selectionCount', { count: selected.length })}</span>
                  {selected.length > 0 && (
                    <span className='text-foreground-secondary'>({selected.map((a) => a.numberLabel).join(', ')})</span>
                  )}
                  {selected.length > 0 && (
                    <Button variant='ghost' size='sm' className='ml-auto' onClick={() => setSelectedIds([])}>
                      {t('explorer.clearSelection')}
                    </Button>
                  )}
                </div>
                <p className='text-muted-foreground text-xs'>{t('explorer.help')}</p>
                <AmendmentTree
                  groups={groups}
                  initiallyOpen={[INITIAL_SUBDIVISION]}
                  focusedId={focusedId}
                  selectedIds={selectedIds}
                  onFocus={setFocusedId}
                  onToggleSelect={toggleSelect}
                />
              </section>
              <div className='flex min-w-0 flex-col gap-6 lg:col-span-3'>
                <AmendmentDetail amendment={focused} parent={parent} onFocus={setFocusedId} />
                <AmendmentComparison amendments={selected} provenance={data.provenance} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
