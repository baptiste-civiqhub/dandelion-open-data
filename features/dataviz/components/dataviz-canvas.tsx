'use client'

import { useMemo } from 'react'

import { StageCanvas } from '@/components/shared/stage-canvas'

import { createDatavizScene } from '../scene/create-dataviz-scene'

type DatavizCanvasProps = {
  datasetId: string
  /** Nom accessible du graphique, déjà traduit. Le détail lisible des données vit dans les widgets. */
  label: string
}

export function DatavizCanvas({ datasetId, label }: DatavizCanvasProps) {
  const scene = useMemo(() => createDatavizScene({ datasetId }), [datasetId])

  return <StageCanvas scene={scene} label={label} />
}
