'use client'

import { useMemo } from 'react'

import { StageCanvas } from '@/components/shared/stage-canvas'

import { useSunburstStores } from '../hooks/use-sunburst-store'
import type { SunburstTree } from '../lib/sunburst-tree'
import { createSunburstScene, type SunburstSceneOptions } from '../scene/create-sunburst-scene'

type SunburstCanvasProps = {
  label: string
  /** Références stables (`useMemo`) : une nouvelle référence recrée la scène. */
  tree: SunburstTree | null
  sortColorVariable: SunburstSceneOptions['sortColorVariable']
  text: SunburstSceneOptions['text']
}

export function SunburstCanvas({ label, tree, sortColorVariable, text }: SunburstCanvasProps) {
  const { view, hover } = useSunburstStores()
  const scene = useMemo(
    () => createSunburstScene({ tree, view, hover, sortColorVariable, text }),
    [tree, view, hover, sortColorVariable, text]
  )

  return <StageCanvas scene={scene} label={label} />
}
