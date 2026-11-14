'use client'

import { ArrowDown, GitBranch } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMemo, useState, type ComponentType } from 'react'

import type { PfasAmendment } from '@/apis/pfas-amendments/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildAmendmentGraph } from '../lib/graph'
import { buildHierarchy } from '../lib/hierarchy'
import type { GraphCanvasProps } from './graph-canvas-types'
import { NativeGraphCanvas } from './native-graph-canvas'
import { OutcomeBadge } from './outcome-badge'
import { SourceLink } from './source-link'

type Props = {
  amendments: PfasAmendment[]
  focusedId: string | null
  selectedIds: string[]
  onFocus: (id: string | null) => void
  onToggleSelect: (id: string) => void
  Canvas?: ComponentType<GraphCanvasProps>
  animated?: boolean
}

export function AmendmentGraph({
  amendments,
  focusedId,
  selectedIds,
  onFocus,
  onToggleSelect,
  Canvas = NativeGraphCanvas,
  animated = false
}: Props) {
  const t = useTranslations('pfasExperiment.graph')
  const [subdivision, setSubdivision] = useState('')
  const graph = useMemo(() => buildAmendmentGraph(amendments, subdivision), [amendments, subdivision])
  const groups = useMemo(() => buildHierarchy(amendments), [amendments])
  const focused = amendments.find((amendment) => amendment.id === focusedId) ?? null
  const selected = focused ? selectedIds.includes(focused.id) : false
  const canvasLabels = {
    loading: t('loading'),
    error: t('error'),
    zoomIn: t('zoomIn'),
    zoomOut: t('zoomOut'),
    reset: t('reset'),
    pause: t('pause'),
    resume: t('resume'),
    canvas: t('canvas')
  }

  const focusNode = (id: string) => {
    const node = graph.nodes.find((item) => item.id === id)
    if (node?.kind === 'amendment') onFocus(id)
    else {
      setSubdivision(node?.subdivision ?? '')
      onFocus(null)
    }
  }

  return (
    <section aria-labelledby='pfas-graph-title' className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div>
          <h2 id='pfas-graph-title' className='flex items-center gap-2 text-xl font-semibold'>
            <GitBranch aria-hidden='true' className='text-chart-1 size-5' />
            {t('title')}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>{t('intro')}</p>
        </div>
        <div className='flex flex-col gap-1 text-sm font-medium'>
          <label htmlFor='pfas-graph-filter'>{t('filter')}</label>
          <select
            id='pfas-graph-filter'
            value={subdivision}
            onChange={(event) => {
              setSubdivision(event.target.value)
              onFocus(null)
            }}
            className='bg-background focus-visible:ring-ring/50 max-w-full rounded-md border px-3 py-2 outline-none focus-visible:ring-3'
          >
            <option value=''>{t('allArticles')}</option>
            {groups.map((group) => (
              <option key={group.subdivision} value={group.subdivision}>
                {group.subdivision}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className='grid min-w-0 gap-4 lg:grid-cols-4'>
        <div className='min-w-0 lg:col-span-3'>
          <Canvas
            key={animated ? 'cosmograph' : subdivision}
            graph={graph}
            focusedId={focusedId}
            selectedIds={selectedIds}
            onFocus={focusNode}
            labels={canvasLabels}
          />
          <div className='text-muted-foreground mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm'>
            <span className='flex items-center gap-2'>
              <span className='border-chart-2 bg-muted size-3 rounded-full border-2' />
              {t('articleLegend')}
            </span>
            <span className='flex items-center gap-2'>
              <span className='border-chart-1 size-3 rounded-full border-2' />
              {t('amendmentLegend')}
            </span>
            <span className='flex items-center gap-2'>
              <span className={cn('border-chart-3 w-6 border-t-2', !animated && 'border-dashed')} />
              {t('parentLegend')}
            </span>
            <span aria-live='polite'>
              {t('visibleCount', { count: graph.nodes.filter((node) => node.kind === 'amendment').length })}
            </span>
          </div>
        </div>
        <aside
          className='bg-muted flex min-w-0 flex-col gap-4 rounded-lg border p-4'
          aria-live='polite'
          data-testid='graph-inspector'
        >
          {focused ? (
            <>
              <div>
                <p className='text-muted-foreground text-sm'>{focused.subdivision}</p>
                <h3 className='mt-1 text-lg font-semibold'>{t('amendment', { number: focused.numberLabel })}</h3>
              </div>
              <div>
                <OutcomeBadge outcome={focused.outcomeRaw} />
              </div>
              {focused.parentRelation && (
                <p className='text-sm font-medium'>{t('parent', { number: focused.parentRelation.parentNumber })}</p>
              )}
              <p className='line-clamp-6 text-sm leading-relaxed whitespace-pre-line'>{focused.proposalText}</p>
              <SourceLink url={focused.sourceUrl} number={focused.numberLabel} />
              <Button
                variant='outline'
                disabled={!selected && selectedIds.length >= 2}
                onClick={() => onToggleSelect(focused.id)}
              >
                {t(selected ? 'remove' : 'add')}
              </Button>
            </>
          ) : (
            <>
              <h3 className='text-lg font-semibold'>{t('choose')}</h3>
              <p className='text-muted-foreground text-sm'>{t('help')}</p>
            </>
          )}
          <div className='mt-auto flex flex-col gap-2 border-t pt-3'>
            <p className='text-sm'>{t('selection', { count: selectedIds.length })}</p>
            <Button
              variant='outline'
              disabled={selectedIds.length !== 2}
              onClick={() =>
                document
                  .getElementById('pfas-comparison-title')
                  ?.scrollIntoView({ behavior: 'instant', block: 'start' })
              }
            >
              <ArrowDown aria-hidden='true' />
              {t('compare')}
            </Button>
          </div>
        </aside>
      </div>
      <p className='text-muted-foreground text-sm'>{t('meaning')}</p>
    </section>
  )
}
