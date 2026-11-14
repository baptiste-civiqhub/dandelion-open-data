'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

import { StageCanvas } from '@/components/shared/stage-canvas'
import { PUBLIC_PATHS } from '@/constant/path'
import { useRouter } from '@/i18n/navigation'

import { createWorldScene } from '../scene/create-world-scene'

/** Canvas du monde navigable : relie la scène WebGL au routeur (entrée dans une zone → page de la zone). */
export function WorldCanvas() {
  const t = useTranslations('world')
  const router = useRouter()
  const scene = useMemo(
    () => createWorldScene({ onEnterZone: (areaId) => router.push(PUBLIC_PATHS.AREA_DETAIL(areaId)) }),
    [router]
  )

  return <StageCanvas scene={scene} label={t('canvasLabel')} />
}
