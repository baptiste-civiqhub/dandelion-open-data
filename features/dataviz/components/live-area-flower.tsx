'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { AmendementSummary } from '@/apis/amendements/types'
import type { AreaDetail, AreaTexte } from '@/apis/areas/types'
import type { Article } from '@/apis/articles/types'
import type { Sort } from '@/apis/sorts/types'
import { FlowerExplorer } from '@/features/texte/components/flower-explorer'
import { areaToFlowerDataset } from '../lib/area-flower'
import { summarizeOutcomes } from '../lib/outcome-summary'
import { chartCssVariable, chartTokenForSort } from '../lib/sort-colors'
import { OutcomeLegendWidget } from './outcome-legend-widget'
import { LiveAmendmentRecords } from './live-amendment-records'

export function LiveAreaFlower({
  area,
  texte,
  articles,
  amendments,
  sorts,
  onTexte
}: {
  area: AreaDetail
  texte: AreaTexte
  articles: Article[]
  amendments: AmendementSummary[]
  sorts: Sort[]
  onTexte: (id: string) => void
}) {
  const t = useTranslations('liveArea')
  const dataset = useMemo(
    () => areaToFlowerDataset(area, texte, articles, amendments, sorts),
    [area, texte, articles, amendments, sorts]
  )
  const labels = useMemo(() => Object.fromEntries(sorts.map((s) => [s.code, s.label])), [sorts])
  const fill = useMemo(
    () =>
      Object.fromEntries(
        amendments.map((a) => [
          a.id,
          `var(${chartCssVariable(chartTokenForSort(sorts.find((s) => s.code === a.sort)?.colorToken ?? ''))})`
        ])
      ),
    [amendments, sorts]
  )
  const outcomes = useMemo(() => summarizeOutcomes(sorts, amendments), [sorts, amendments])
  return (
    <FlowerExplorer
      dataset={dataset}
      pfas={null}
      fillByAmendment={fill}
      headerExtra={
        <>
          <label className='flex flex-col gap-1'>
            <span>{t('texte')}</span>
            <select
              value={texte.id}
              onChange={(e) => onTexte(e.target.value)}
              className='bg-background w-full rounded-md border p-2'
            >
              {area.textes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titre}
                  {item.etapeTexte ? ` · ${item.etapeTexte}` : ''}
                </option>
              ))}
            </select>
          </label>
          <p className='text-muted-foreground text-xs'>{t('stageNote')}</p>
        </>
      }
      rightExtra={<OutcomeLegendWidget status='ready' outcomes={outcomes} />}
      renderRecords={(state) => <LiveAmendmentRecords texteId={texte.id} state={state} sortLabels={labels} />}
    />
  )
}
