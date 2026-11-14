'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { useGetAmendementsByTexte } from '@/apis/amendements'
import { AREA_NOT_FOUND, useGetAreaDetail } from '@/apis/areas'
import { useGetArticlesByTexte } from '@/apis/articles'
import { useGetSorts } from '@/apis/sorts'
import { Stage } from '@/components/shared/stage'
import { isNormalizedApiError } from '@/types/api-error'

import { groupAmendementsByArticle, type AmendementColumn } from '../lib/dot-chart'
import { summarizeOutcomes } from '../lib/outcome-summary'
import { chartTokenForSort } from '../lib/sort-colors'
import { AreaSummaryWidget } from './area-summary-widget'
import { DatavizCanvas } from './dataviz-canvas'
import { OutcomeLegendWidget } from './outcome-legend-widget'

const NO_COLUMNS: readonly AmendementColumn[] = []

/**
 * Page d'une zone (`/area/{areaId}`) : le graphique occupe le canvas de fond, la colonne gauche décrit la zone et
 * ses articles, la colonne droite porte la légende des sorts. Colonne centrale vide : on voit le graphique.
 * Une zone peut contenir plusieurs textes ; cette première version dessine le premier.
 */
export function DatavizScreen({ areaId }: { areaId: string }) {
  const t = useTranslations('dataviz')
  const areaQuery = useGetAreaDetail(areaId)
  const texteId = areaQuery.data?.textes[0]?.id
  const articlesQuery = useGetArticlesByTexte(texteId)
  const amendementsQuery = useGetAmendementsByTexte(texteId)
  const sortsQuery = useGetSorts()

  const articles = articlesQuery.data
  const amendements = amendementsQuery.data
  const sorts = sortsQuery.data

  const columns = useMemo(
    () => (articles && amendements ? groupAmendementsByArticle(articles, amendements) : NO_COLUMNS),
    [articles, amendements]
  )
  const chartTokenBySort = useMemo(
    () => Object.fromEntries((sorts ?? []).map((sort) => [sort.code, chartTokenForSort(sort.colorToken)])),
    [sorts]
  )
  const outcomes = useMemo(() => summarizeOutcomes(sorts ?? [], amendements ?? []), [sorts, amendements])

  const areaStatus = areaQuery.isPending
    ? 'pending'
    : areaQuery.isError
      ? isNormalizedApiError(areaQuery.error) && areaQuery.error.code === AREA_NOT_FOUND
        ? 'notFound'
        : 'error'
      : 'ready'
  const contentStatus = !texteId
    ? 'idle'
    : articlesQuery.isError || amendementsQuery.isError
      ? 'error'
      : articlesQuery.isPending || amendementsQuery.isPending
        ? 'pending'
        : 'ready'
  const legendStatus =
    sortsQuery.isError || contentStatus === 'error'
      ? 'error'
      : sortsQuery.isPending || areaStatus === 'pending' || contentStatus === 'pending'
        ? 'pending'
        : 'ready'

  return (
    <Stage
      canvas={
        <DatavizCanvas
          label={t('canvasLabel', { name: areaQuery.data?.name ?? areaId })}
          columns={columns}
          chartTokenBySort={chartTokenBySort}
        />
      }
      left={
        <AreaSummaryWidget
          status={areaStatus}
          area={areaQuery.data}
          articles={articles}
          columns={columns}
          contentStatus={contentStatus}
        />
      }
      right={areaStatus === 'ready' ? <OutcomeLegendWidget status={legendStatus} outcomes={outcomes} /> : undefined}
    />
  )
}
