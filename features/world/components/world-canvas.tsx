'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { StageCanvas } from '@/components/shared/stage-canvas'

import type { WorldZone } from '../lib/world-zones'
import { createWorldScene, type WorldSceneOptions } from '../scene/create-world-scene'

type WorldCanvasProps = {
  /** Référence stable : une nouvelle liste recrée la scène. */
  zones: readonly WorldZone[]
  /** Rappels stables (`useCallback`) pour la même raison. */
  onReady: WorldSceneOptions['onReady']
  onZoneFocus: WorldSceneOptions['onZoneFocus']
  onEnterZone: WorldSceneOptions['onEnterZone']
}

/** Canvas du monde navigable : héberge la scène et lui passe les zones et les rappels de `WorldScreen`. */
export function WorldCanvas({ zones, onReady, onZoneFocus, onEnterZone }: WorldCanvasProps) {
  const t = useTranslations('world')
  const scene = useMemo(
    () => createWorldScene({ zones, onReady, onZoneFocus, onEnterZone }),
    [zones, onReady, onZoneFocus, onEnterZone]
  )

  return <StageCanvas scene={scene} label={t('canvasLabel')} />
}
