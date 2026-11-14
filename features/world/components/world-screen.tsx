'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useGetAreas } from '@/apis/areas'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { Stage } from '@/components/shared/stage'
import { Widget } from '@/components/shared/widget'
import { PUBLIC_PATHS } from '@/constant/path'
import { useRouter } from '@/i18n/navigation'
import { useLandingIntroStore } from '@/store/landing-intro'
import { useStageTransitionStore } from '@/store/stage-transition'
import { useWorldPoseStore, type WorldPose } from '@/store/world-pose'

import { landingOnSunburst } from '../lib/dive'
import { worldZonesFromAreas, type WorldZone } from '../lib/world-zones'
import type { WorldExitFrames } from '../scene/create-world-scene'
import { LandingIntro } from './landing-intro'
import { WorldCanvas } from './world-canvas'
import { WorldControlsHint } from './world-controls-hint'

const NO_ZONES: readonly WorldZone[] = []

/**
 * Landing : le monde 3D occupe tout le Stage, sans colonne latérale. Un rideau de marque le couvre d'abord
 * (opaque, puis voile), jusqu'au premier geste. Quand le personnage est dans une zone, un bandeau en bas
 * invite à presser Entrée ; la scène navigue ensuite vers la page de la zone. La plongée pose la fleur sur le disque
 * du sunburst de cette page (`landingOnSunburst`) et lui laisse ses dernières images (rideau, fond flouté).
 * Si WebGL ne démarre pas, le titre de marque reste au centre une fois le rideau levé.
 */
export function WorldScreen() {
  const t = useTranslations('home')
  const tWorld = useTranslations('world')
  const router = useRouter()
  const { data: areas } = useGetAreas()
  const [ready, setReady] = useState(false)
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null)
  const phase = useLandingIntroStore((state) => state.phase)
  const setPose = useWorldPoseStore((state) => state.setPose)
  const clearPose = useWorldPoseStore((state) => state.clearPose)
  const onPose = useCallback((pose: WorldPose) => setPose(pose), [setPose])

  useEffect(() => {
    return () => clearPose()
  }, [clearPose])

  const zones = useMemo(() => (areas ? worldZonesFromAreas(areas) : NO_ZONES), [areas])
  const focused = zones.find((zone) => zone.slug === focusedSlug)
  const curtainOpen = phase === 'open'
  const showGarden = curtainOpen && ready

  const onReady = useCallback(() => setReady(true), [])
  const onEnterZone = useCallback((slug: string) => router.push(PUBLIC_PATHS.AREA_DETAIL(slug)), [router])
  const depart = useStageTransitionStore((state) => state.depart)
  const onExitFrames = useCallback(
    ({ slug, frame, scenery }: WorldExitFrames) => depart({ path: PUBLIC_PATHS.AREA_DETAIL(slug), frame, scenery }),
    [depart]
  )
  // Page de la zone préchargée dès qu'on y entre : la plongée finie, elle s'affiche sans écran de chargement.
  useEffect(() => {
    if (focusedSlug) router.prefetch(PUBLIC_PATHS.AREA_DETAIL(focusedSlug))
  }, [focusedSlug, router])

  return (
    <>
      <Stage
        canvas={
          <WorldCanvas
            zones={zones}
            onReady={onReady}
            onZoneFocus={setFocusedSlug}
            onEnterZone={onEnterZone}
            onPose={onPose}
            landing={landingOnSunburst}
            onExitFrames={onExitFrames}
          />
        }
        centerAlign={showGarden ? 'end' : 'center'}
      >
        {curtainOpen && !ready ? (
          <BrandLockup
            size='lg'
            titleAs='h1'
            name={t('title')}
            baseline={t('baseline')}
            className='motion-safe:animate-fade-up pointer-events-none'
          />
        ) : showGarden ? (
          <h1 className='sr-only'>{t('title')}</h1>
        ) : null}
        {showGarden && !focused ? <WorldControlsHint /> : null}
        <div aria-live='polite' className='flex justify-center'>
          {showGarden && focused ? (
            <Widget className='flex-row items-center gap-3 rounded-full px-5 py-3'>
              <span className='font-semibold'>{focused.name}</span>
              <span className='text-muted-foreground flex items-center gap-1 text-sm'>
                <CornerDownLeft aria-hidden className='size-4' />
                {tWorld('enterHint')}
              </span>
            </Widget>
          ) : null}
        </div>
      </Stage>
      <LandingIntro ready={ready} />
    </>
  )
}
