'use client'

import { Minus, Plus, Scan } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import type { PfasSnapshot } from '@/apis/pfas-amendments/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Stage } from '@/components/shared/stage'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { PfasAssistant } from '@/features/dataviz-assistant/components/pfas-assistant'
import { applyPlan, type DatavizAssistantAdapter } from '@/features/dataviz-assistant/lib/adapter'
import { createRegistry } from '@/features/dataviz-assistant/lib/plan'
import { AmendmentComparison } from '@/features/pfas-amendments/components/amendment-comparison'
import { focusHeading } from '@/features/pfas-amendments/components/evidence-focus'
import { EvidenceJourney } from '@/features/pfas-amendments/components/evidence-journey'
import { buildTree } from '@/features/texte/lib/build-tree'
import { FOCUS_SHARE, MAX_VISIBLE } from '@/features/texte/lib/constants'
import { cutTree } from '@/features/texte/lib/cut-tree'
import { datasetGaps, isFlowerDatasetId, type FlowerDataset } from '@/features/texte/lib/datasets'
import { layoutRadial } from '@/features/texte/lib/layout-radial'
import {
  buildOverviewTour,
  buildPfasTour,
  IDLE_TOUR,
  TOUR_STEP_MS,
  tourReducer,
  type TourEvent
} from '@/features/texte/lib/tour'
import { indexTree, pathTo, resolveNodeId } from '@/features/texte/lib/tree-index'
import { canZoom, focusView, INITIAL_VIEW, viewOffset, zoomView, type ZoomDirection } from '@/features/texte/lib/view'

import { AmendmentCard } from './amendment-card'
import { DandelionFlower } from './dandelion-flower'
import { FlowerGuidePanel } from './flower-guide-panel'
import { FlowerProviderPanel } from './flower-provider-panel'
import { FlowerTour } from './flower-tour'
import { useNodeLabel } from './use-node-label'

const PFAS_ARTICLE_NODE = 'article:Article 1er'
const SEARCH_LIMIT = 8

export type ExplorerRecords = {
  openId: string | null
  selectedIds: string[]
  close: () => void
  compare: (id: string) => void
}
type FlowerExplorerProps = {
  dataset: FlowerDataset
  pfas: PfasSnapshot | null
  renderRecords?: (state: ExplorerRecords) => ReactNode
  headerExtra?: ReactNode
  rightExtra?: ReactNode
  fillByAmendment?: Record<string, string>
}

/** Fleur radiale de l'équipe dans le Stage, pilotée par boutons, clavier, recherche, guide et parcours. */
export function FlowerExplorer({
  dataset,
  pfas,
  renderRecords,
  headerExtra,
  rightExtra,
  fillByAmendment
}: FlowerExplorerProps) {
  const t = useTranslations('flower')
  const nodeLabel = useNodeLabel()
  const reducedMotion = useReducedMotion() ?? false
  const frameRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState(INITIAL_VIEW)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [trailRequest, setTrailRequest] = useState(0)
  const [search, setSearch] = useState('')
  const [tour, setTour] = useState(IDLE_TOUR)
  const [readingMode, setReadingMode] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const { amendments } = dataset.snapshot
  const tree = useMemo(() => buildTree(dataset.snapshot, { groupOperations: !dataset.detailsOnDemand }), [dataset])
  const index = useMemo(() => indexTree(tree), [tree])
  const gaps = useMemo(() => datasetGaps(dataset), [dataset])
  const focusId = view.focusId ?? hoveredId
  const outerRadiusPx = Math.max(1, 0.4 * Math.min(size.width, size.height))
  const visible = useMemo(
    () => (size.width > 0 ? cutTree(tree, { focusId, budget: MAX_VISIBLE, outerRadiusPx }) : null),
    [tree, focusId, outerRadiusPx, size.width]
  )
  const layout = useMemo(
    () => (visible ? layoutRadial(visible, { focusId, focusShare: FOCUS_SHARE, outerRadiusPx }) : []),
    [visible, focusId, outerRadiusPx]
  )
  const registry = useMemo(
    () => createRegistry([...amendments.map((amendment) => amendment.id), ...index.byId.keys()]),
    [amendments, index]
  )
  const steps = useMemo(() => {
    if (pfas) return buildPfasTour(amendments, index.byId.has(PFAS_ARTICLE_NODE) ? PFAS_ARTICLE_NODE : null)
    const heaviest = [...tree.children].filter((node) => node.kind === 'article').sort((a, b) => b.weight - a.weight)[0]
    return buildOverviewTour(heaviest?.id ?? null)
  }, [pfas, amendments, index, tree])

  const dispatch = useCallback(
    (event: TourEvent) => setTour((state) => tourReducer(state, event, steps.length)),
    [steps.length]
  )
  const interrupt = () => dispatch('interrupt')

  const pfasById = useMemo(() => new Map((pfas?.amendments ?? []).map((item) => [item.id, item])), [pfas])
  const byId = useMemo(() => new Map(amendments.map((amendment) => [amendment.id, amendment])), [amendments])

  const adapter: DatavizAssistantAdapter = {
    focusEntity: (id) => {
      const nodeId = resolveNodeId(index, id)
      if (!nodeId) return
      setReadingMode(false)
      setView((current) => focusView(current, nodeId))
      const amendmentId = index.byId.get(nodeId)?.amendmentId
      if (amendmentId) {
        setOpenId(amendmentId)
        if (pfas) setSelectedIds([amendmentId])
      }
    },
    compareEntities: (ids) => {
      setReadingMode(true)
      setSelectedIds([...ids])
      setOpenId(null)
      setView((current) => focusView(current, resolveNodeId(index, ids[0])))
      if (pfas) requestAnimationFrame(() => focusHeading('pfas-comparison-title'))
    },
    showEvidence: () => {
      if (!pfas) return
      setReadingMode(true)
      setTrailRequest((value) => value + 1)
      requestAnimationFrame(() => focusHeading('evidence-title'))
    },
    zoom: (direction) => setView((current) => zoomView(current, direction)),
    resetView: () => {
      setReadingMode(false)
      setView(INITIAL_VIEW)
      setHoveredId(null)
      setOpenId(null)
    }
  }
  const adapterRef = useRef(adapter)
  useEffect(() => {
    adapterRef.current = adapter
  })

  const userAdapter: DatavizAssistantAdapter = {
    focusEntity: (id) => (interrupt(), adapter.focusEntity(id)),
    compareEntities: (ids) => (interrupt(), adapter.compareEntities(ids)),
    showEvidence: () => (interrupt(), adapter.showEvidence()),
    zoom: (direction) => (interrupt(), adapter.zoom?.(direction)),
    resetView: () => (interrupt(), adapter.resetView?.())
  }

  const tourActive = tour.status !== 'idle'
  useEffect(() => {
    if (!tourActive) return
    const step = steps[tour.index]
    if (step) applyPlan(step.plan, adapterRef.current, registry)
  }, [tour.index, tourActive, steps, registry])

  useEffect(() => {
    if (tour.status !== 'playing' || reducedMotion) return
    const timer = window.setTimeout(() => dispatch('tick'), TOUR_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [tour.status, tour.index, reducedMotion, dispatch])

  const focusNode = layout.find((node) => node.id === view.focusId) ?? null
  const offset = viewOffset(view, focusNode)
  const breadcrumb = pathTo(index, view.focusId)
  const open = openId ? (byId.get(openId) ?? null) : null
  const comparedPfas = selectedIds.flatMap((id) =>
    pfasById.has(id) ? [pfasById.get(id) as NonNullable<ReturnType<typeof pfasById.get>>] : []
  )
  const comparedTeam =
    !pfas && selectedIds.length === 2 ? selectedIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])) : []

  const query = search.trim().toLowerCase()
  const results = query
    ? amendments
        .filter((amendment) => amendment.numero.toLowerCase().startsWith(query))
        .sort((a, b) => Number(b.numero.toLowerCase() === query) - Number(a.numero.toLowerCase() === query))
        .slice(0, SEARCH_LIMIT)
    : []

  const onSelect = (id: string) => {
    interrupt()
    setReadingMode(false)
    const node = layout.find((item) => item.id === id)
    setView((current) => focusView(current, id))
    if (node?.kind === 'amendement' && node.amendmentId) {
      setOpenId(node.amendmentId)
      if (pfas)
        setSelectedIds((current) =>
          current.includes(node.amendmentId as string) ? current : [...current, node.amendmentId as string].slice(-2)
        )
    }
  }

  const goUp = () => {
    interrupt()
    setReadingMode(false)
    const parent = view.focusId ? (index.parentOf.get(view.focusId) ?? null) : null
    setOpenId(null)
    setView((current) => focusView(current, parent && parent !== tree.id ? parent : null))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const zoomKeys: Record<string, ZoomDirection> = { '+': 'in', '=': 'in', '-': 'out', '0': 'fit' }
    const direction = zoomKeys[event.key]
    if (direction) {
      event.preventDefault()
      userAdapter.zoom?.(direction)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      goUp()
    }
  }

  const provenanceLine =
    dataset.provenance.origin === 'senat-csv'
      ? t('provenance.senat', {
          date: dataset.provenance.retrievedAtUtc?.slice(0, 10) ?? '—',
          hash: dataset.provenance.sha256?.slice(0, 12) ?? '—'
        })
      : dataset.detailsOnDemand
        ? t('live.provenance', { date: dataset.provenance.retrievedAtUtc?.slice(0, 10) ?? '—' })
        : t('provenance.hemicycle')

  const left = (
    <div className='pointer-events-auto flex flex-col gap-4 lg:max-h-full lg:overflow-y-auto'>
      <Widget aria-labelledby='flower-dataset-title' data-testid='flower-dataset'>
        <WidgetHeader>
          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {dataset.detailsOnDemand ? t('live.eyebrow') : t(`datasets.${dataset.id}.eyebrow`)}
          </p>
          <h1 id='flower-dataset-title' className='text-lg font-semibold tracking-tight'>
            {dataset.detailsOnDemand ? dataset.snapshot.titre : t(`datasets.${dataset.id}.name`)}
          </h1>
          <WidgetDescription lang='fr'>{dataset.snapshot.titre}</WidgetDescription>
        </WidgetHeader>
        <WidgetContent>
          {headerExtra}
          <p data-testid='flower-counts'>
            {t('counts', { visible: layout.length, total: tree.weight, budget: MAX_VISIBLE })}
          </p>
          <p className='text-muted-foreground'>{provenanceLine}</p>
          <p className='text-muted-foreground'>
            {t('provenance.publisher', { publisher: dataset.provenance.publisher })}{' '}
            {dataset.provenance.sourceUrl ? (
              <a
                href={dataset.provenance.sourceUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline'
              >
                {t('provenance.source')}
              </a>
            ) : null}
            {' · '}
            {dataset.provenance.licence.startsWith('http') ? (
              <a
                href={dataset.provenance.licence}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline'
              >
                {t('provenance.licence')}
              </a>
            ) : (
              dataset.provenance.licence
            )}
          </p>
          <div className='bg-muted flex flex-col gap-1 rounded-md p-2' data-testid='flower-gaps'>
            <p className='font-medium'>{t('gaps.title')}</p>
            <p>
              {dataset.detailsOnDemand
                ? t('live.lazyText')
                : t('gaps.text', { count: gaps.missingText, total: gaps.total })}
            </p>
            <p>{t('gaps.url', { count: gaps.missingUrl, total: gaps.total })}</p>
          </div>
          <p className='text-muted-foreground text-xs'>
            {dataset.detailsOnDemand ? t('live.structureNote') : t('lexicalNote')}
          </p>
        </WidgetContent>
      </Widget>
      <Widget aria-labelledby='flower-nav-title' data-testid='flower-nav'>
        <WidgetHeader>
          <WidgetTitle id='flower-nav-title'>{t('nav.title')}</WidgetTitle>
          <WidgetDescription>{t('nav.keyboard')}</WidgetDescription>
        </WidgetHeader>
        <WidgetContent>
          <nav aria-label={t('nav.breadcrumb')}>
            <ol className='flex flex-wrap items-center gap-1' data-testid='flower-breadcrumb'>
              <li>
                <Button
                  size='sm'
                  variant={view.focusId ? 'ghost' : 'secondary'}
                  onClick={() => userAdapter.resetView?.()}
                  aria-current={view.focusId ? undefined : 'location'}
                >
                  {t('nav.global')}
                </Button>
              </li>
              {breadcrumb.slice(1).map((node, position, list) => (
                <li key={node.id} className='flex items-center gap-1'>
                  <span aria-hidden='true'>›</span>
                  <Button
                    size='sm'
                    variant={position === list.length - 1 ? 'secondary' : 'ghost'}
                    aria-current={position === list.length - 1 ? 'location' : undefined}
                    onClick={() => userAdapter.focusEntity(node.id)}
                  >
                    {nodeLabel(node).slice(0, 28)}
                  </Button>
                </li>
              ))}
            </ol>
          </nav>
          <div className='flex flex-wrap gap-2' role='group' aria-label={t('nav.zoomGroup')}>
            <Button
              size='sm'
              variant='outline'
              onClick={() => userAdapter.zoom?.('in')}
              disabled={!canZoom(view, 'in')}
              aria-label={t('nav.zoomIn')}
            >
              <Plus aria-hidden='true' />
              {t('nav.zoomInShort')}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => userAdapter.zoom?.('out')}
              disabled={!canZoom(view, 'out')}
              aria-label={t('nav.zoomOut')}
            >
              <Minus aria-hidden='true' />
              {t('nav.zoomOutShort')}
            </Button>
            <Button size='sm' variant='outline' onClick={() => userAdapter.zoom?.('fit')} aria-label={t('nav.fit')}>
              <Scan aria-hidden='true' />
              {t('nav.fitShort')}
            </Button>
            <Badge variant='outline' data-testid='flower-scale'>
              {t('nav.scale', { scale: Math.round(view.scale * 100) })}
            </Badge>
          </div>
          <label className='flex flex-col gap-1'>
            <span className='font-medium'>{t('nav.search')}</span>
            <input
              type='search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className='bg-background focus-visible:ring-ring/50 rounded-md border px-3 py-2 outline-none focus-visible:ring-3'
            />
          </label>
          {query ? (
            <ul className='flex flex-col gap-1' data-testid='flower-search-results'>
              {results.length === 0 ? <li className='text-muted-foreground'>{t('nav.noResult')}</li> : null}
              {results.map((amendment) => (
                <li key={amendment.id}>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-auto w-full justify-start text-left whitespace-normal'
                    onClick={() => userAdapter.focusEntity(amendment.id)}
                  >
                    {t('nav.result', { numero: amendment.numero, article: amendment.article })}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </WidgetContent>
      </Widget>
    </div>
  )

  const right = (
    <div className='pointer-events-auto flex flex-col gap-4 lg:max-h-full lg:overflow-y-auto' lang='fr'>
      {pfas ? (
        <PfasAssistant amendments={pfas.amendments} adapter={userAdapter} />
      ) : (
        <FlowerGuidePanel
          amendments={amendments}
          adapter={userAdapter}
          registry={registry}
          sourceUrls={dataset.sourceUrls}
          examples={
            dataset.detailsOnDemand
              ? [
                  ...(amendments[0] ? [t('live.focusExample', { numero: amendments[0].numero })] : []),
                  ...(amendments[1]
                    ? [t('live.compareExample', { a: amendments[0].numero, b: amendments[1].numero })]
                    : []),
                  t('guide.examples.global')
                ]
              : [t('guide.examples.focus'), t('guide.examples.compare'), t('guide.examples.global')]
          }
        />
      )}
      <FlowerTour steps={steps} state={tour} reducedMotion={reducedMotion} onEvent={dispatch} />
      {renderRecords?.({
        openId,
        selectedIds,
        close: () => {
          setOpenId(null)
          setSelectedIds([])
        },
        compare: (id) => {
          setSelectedIds((current) => [...new Set([...current, id])].slice(-2))
          setReadingMode(true)
        }
      })}
      {!renderRecords && open ? (
        <AmendmentCard
          amendment={open}
          sourceUrl={dataset.sourceUrls[open.id] ?? null}
          onClose={() => setOpenId(null)}
        />
      ) : null}
      {!renderRecords &&
        comparedTeam.map((amendment) => (
          <AmendmentCard
            key={amendment.id}
            amendment={amendment}
            sourceUrl={dataset.sourceUrls[amendment.id] ?? null}
            onClose={() => setSelectedIds([])}
          />
        ))}
      {pfas ? (
        <>
          <AmendmentComparison amendments={comparedPfas} provenance={pfas.provenance} />
          <EvidenceJourney
            amendments={pfas.amendments}
            trailRequest={trailRequest}
            onApply={(ids, focus) => {
              interrupt()
              setSelectedIds(ids)
              setView((current) => focusView(current, resolveNodeId(index, focus)))
            }}
          />
        </>
      ) : null}
      {rightExtra}
      {isFlowerDatasetId(dataset.id) ? (
        <FlowerProviderPanel datasetId={dataset.id} adapter={userAdapter} registry={registry} />
      ) : null}
    </div>
  )

  return (
    <Stage
      left={left}
      right={right}
      rightExpanded={readingMode}
      className='h-auto min-h-dvh overflow-visible lg:h-dvh lg:overflow-hidden'
    >
      <div
        ref={frameRef}
        onKeyDown={onKeyDown}
        className='bg-card/60 pointer-events-auto relative h-96 min-h-80 w-full overflow-hidden rounded-xl border sm:h-128 lg:h-full'
        data-testid='flower-frame'
      >
        {size.width > 0 ? (
          <DandelionFlower
            fillByAmendment={fillByAmendment}
            nodes={layout}
            width={size.width}
            height={size.height}
            outerRadiusPx={outerRadiusPx}
            focusId={focusId}
            scale={view.scale}
            offset={offset}
            onHover={setHoveredId}
            onSelect={onSelect}
            onBackground={goUp}
          />
        ) : null}
      </div>
    </Stage>
  )
}
