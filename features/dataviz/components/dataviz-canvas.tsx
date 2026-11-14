'use client'

import { useMemo } from 'react'

import { StageCanvas } from '@/components/shared/stage-canvas'

import type { AmendementColumn } from '../lib/dot-chart'
import type { ChartToken } from '../lib/sort-colors'
import { createDatavizScene } from '../scene/create-dataviz-scene'

type DatavizCanvasProps = {
  /** Nom accessible du graphique, déjà traduit. Le détail lisible des données vit dans les widgets. */
  label: string
  /** Références stables (`useMemo`) : une nouvelle référence recrée la scène. */
  columns: readonly AmendementColumn[]
  chartTokenBySort: Readonly<Record<string, ChartToken>>
}

export function DatavizCanvas({ label, columns, chartTokenBySort }: DatavizCanvasProps) {
  const scene = useMemo(() => createDatavizScene({ columns, chartTokenBySort }), [columns, chartTokenBySort])

  return <StageCanvas scene={scene} label={label} />
}
