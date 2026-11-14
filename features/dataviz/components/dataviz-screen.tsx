'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { useGetAmendementsByTexte } from '@/apis/amendements'
import { AREA_NOT_FOUND, useGetAreaDetail } from '@/apis/areas'
import type { AreaTexte } from '@/apis/areas/types'
import { useGetArticlesByTexte } from '@/apis/articles'
import { useGetSorts } from '@/apis/sorts'
import { Stage } from '@/components/shared/stage'
import { Widget } from '@/components/shared/widget'
import { Button } from '@/components/ui/button'
import { isNormalizedApiError } from '@/types/api-error'

import { createHoverStore, createViewStore, SunburstStoresContext, useViewUrlSync } from '../hooks/use-sunburst-store'
import { chartCssVariable, chartTokenForSort } from '../lib/sort-colors'
import { buildSunburstTree, type SunburstLabels } from '../lib/sunburst-tree'
import { DEFAULT_VIEW, parseView, VIEW_PARAMS } from '../lib/view-url'
import { FicheWidget } from './fiche-widget'
import { RepartitionWidget } from './repartition-widget'
import { SortLegendWidget } from './sort-legend-widget'
import { SunburstCanvas } from './sunburst-canvas'
import { SunburstTooltip } from './sunburst-tooltip'
import { TexteWidget } from './texte-widget'
import { ViewBar } from './view-bar'

/**
 * Page d'une zone (`/area/{areaId}`) : le texte de loi en pissenlit (sunburst) au centre, « ce que l'on regarde »
 * à gauche, « ce que l'on a sous la main » à droite. Les trois colonnes lisent un seul état (focus, sélection,
 * filtres, profondeur dans l'URL ; survol à part) et ne se parlent jamais directement.
 */
export function DatavizScreen({ areaId }: { areaId: string }) {
  const t = useTranslations('dataviz')
  const searchParams = useSearchParams()
  const areaQuery = useGetAreaDetail(areaId)
  const textes = areaQuery.data?.textes
  const texteParam = searchParams.get(VIEW_PARAMS.texte)
  const texte = textes?.find((item) => item.uid === texteParam || item.id === texteParam) ?? textes?.[0]
  const articlesQuery = useGetArticlesByTexte(texte?.id)
  const amendementsQuery = useGetAmendementsByTexte(texte?.id)
  const sortsQuery = useGetSorts()

  const [stores] = useState(() => ({ view: createViewStore(parseView(searchParams)), hover: createHoverStore() }))
  useViewUrlSync(stores.view)

  const texteTitle = texte?.titre ?? areaQuery.data?.name ?? ''
  const labels = useMemo<SunburstLabels>(
    () => ({
      texte: texteTitle,
      whole: t('sunburst.whole'),
      other: t('sunburst.other'),
      alinea: (numero) => t('sunburst.alinea', { numero }),
      additional: (article, position) => t(position === 'AVANT' ? 'sunburst.before' : 'sunburst.after', { article })
    }),
    [t, texteTitle]
  )
  const articles = articlesQuery.data
  const amendements = amendementsQuery.data
  const sorts = sortsQuery.data
  const tree = useMemo(
    () => (articles && amendements && sorts ? buildSunburstTree(articles, amendements, labels) : null),
    [articles, amendements, sorts, labels]
  )
  useEffect(() => stores.view.getState().setTree(tree), [stores, tree])

  const sortsByCode = useMemo(() => new Map((sorts ?? []).map((sort) => [sort.code, sort])), [sorts])
  const sortColorVariable = useCallback(
    (code: string) => chartCssVariable(chartTokenForSort(sortsByCode.get(code)?.colorToken ?? '')),
    [sortsByCode]
  )
  const sceneText = useMemo(
    () => ({
      count: (count: number) => t('sunburst.count', { count }),
      noAmendment: t('sunburst.noAmendment'),
      up: t('sunburst.up')
    }),
    [t]
  )

  const selectTexte = useCallback(
    (next: AreaTexte) => {
      if (next.id === texte?.id) return
      stores.hover.getState().leave()
      stores.view.setState({ ...DEFAULT_VIEW })
      const params = new URLSearchParams({ [VIEW_PARAMS.texte]: next.uid })
      window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
    },
    [stores, texte?.id]
  )

  const areaStatus = areaQuery.isPending
    ? 'pending'
    : areaQuery.isError
      ? isNormalizedApiError(areaQuery.error) && areaQuery.error.code === AREA_NOT_FOUND
        ? 'notFound'
        : 'error'
      : 'ready'
  const contentError = articlesQuery.isError || amendementsQuery.isError || sortsQuery.isError
  const legendStatus = contentError ? 'error' : tree ? 'ready' : 'pending'
  const retryContent = () => {
    if (articlesQuery.isError) void articlesQuery.refetch()
    if (amendementsQuery.isError) void amendementsQuery.refetch()
    if (sortsQuery.isError) void sortsQuery.refetch()
  }

  return (
    <SunburstStoresContext.Provider value={stores}>
      <Stage
        canvas={
          <SunburstCanvas
            label={t('canvasLabel', { name: texteTitle || areaId })}
            tree={tree}
            sortColorVariable={sortColorVariable}
            text={sceneText}
          />
        }
        left={
          <>
            <TexteWidget
              status={areaStatus}
              area={areaQuery.data}
              texte={texte}
              onSelectTexte={selectTexte}
              onRetry={() => void areaQuery.refetch()}
            />
            {areaStatus === 'ready' && texte ? <SortLegendWidget status={legendStatus} sorts={sorts ?? []} /> : null}
          </>
        }
        right={
          tree ? (
            <>
              <FicheWidget sortsByCode={sortsByCode} />
              <RepartitionWidget sorts={sorts ?? []} />
            </>
          ) : undefined
        }
      >
        {contentError ? (
          <Widget role='alert' className='flex-row items-center gap-3 self-center rounded-full py-1 pr-1 pl-4 text-sm'>
            {t('view.loadError')}
            <Button size='sm' variant='outline' className='rounded-full' onClick={retryContent}>
              {t('view.retry')}
            </Button>
          </Widget>
        ) : areaStatus === 'ready' && !texte ? (
          <Widget className='self-center rounded-full px-4 py-2 text-sm'>{t('area.noText')}</Widget>
        ) : (
          <ViewBar />
        )}
      </Stage>
      <SunburstTooltip sortsByCode={sortsByCode} />
    </SunburstStoresContext.Provider>
  )
}
