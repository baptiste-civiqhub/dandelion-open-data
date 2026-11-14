'use client'

import { useCallback, useMemo, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useGetAreas } from '@/apis/areas'
import { BrandLockup } from '@/components/brand/brand-lockup'
import { Stage } from '@/components/shared/stage'
import { CatalogList } from '@/features/datasets/components/catalog-list'
import { CATALOG } from '@/features/datasets/lib/catalog'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { PUBLIC_PATHS } from '@/constant/path'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { worldZonesFromAreas, type WorldZone } from '../lib/world-zones'
import { WorldCanvas } from './world-canvas'
import { WorldControlsHint } from './world-controls-hint'

const NO_ZONES: readonly WorldZone[] = []

/**
 * Landing : le monde 3D occupe tout le Stage, sans colonne latérale. Le titre de marque centré s'affiche tant que
 * le monde ne dessine rien, puis ne reste que pour les lecteurs d'écran. Quand le personnage est dans une zone, un
 * bandeau en bas invite à presser Entrée ; la scène navigue ensuite vers la page de la zone.
 */
export function WorldScreen() {
  const t = useTranslations('home')
  const tWorld = useTranslations('world')
  const router = useRouter()
  const { data: areas } = useGetAreas()
  const [ready, setReady] = useState(false)
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null)

  const zones = useMemo(() => (areas ? worldZonesFromAreas(areas) : NO_ZONES), [areas])
  const focused = zones.find((zone) => zone.slug === focusedSlug)

  const onReady = useCallback(() => setReady(true), [])
  const onEnterZone = useCallback((slug: string) => router.push(PUBLIC_PATHS.AREA_DETAIL(slug)), [router])

  return (
    <Stage
      canvas={<WorldCanvas zones={zones} onReady={onReady} onZoneFocus={setFocusedSlug} onEnterZone={onEnterZone} />}
      centerAlign={ready ? 'end' : 'center'}
      className='h-auto min-h-dvh overflow-visible lg:h-dvh lg:overflow-hidden'
      left={
        !ready ? (
          <Widget aria-labelledby='home-catalog-title' className='pointer-events-auto' data-testid='home-catalog'>
            <WidgetHeader>
              <WidgetTitle id='home-catalog-title'>{t('catalog.title')}</WidgetTitle>
              <WidgetDescription>{t('catalog.description')}</WidgetDescription>
            </WidgetHeader>
            <WidgetContent>
              <CatalogList entries={CATALOG} />
              <p className='text-muted-foreground text-xs' data-testid='home-world-placeholder'>
                {t('catalog.worldPlaceholder')}
              </p>
            </WidgetContent>
          </Widget>
        ) : undefined
      }
    >
      <BrandLockup
        size='lg'
        titleAs='h1'
        name={t('title')}
        baseline={t('baseline')}
        className={cn('motion-safe:animate-fade-up pointer-events-none', ready && 'sr-only')}
      />
      {ready && !focused ? <WorldControlsHint /> : null}
      <div aria-live='polite' className='flex justify-center'>
        {focused ? (
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
  )
}
