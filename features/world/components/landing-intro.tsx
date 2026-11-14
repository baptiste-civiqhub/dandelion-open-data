'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { BrandLockup } from '@/components/brand/brand-lockup'
import {
  LANDING_INTRO_MARK_MS,
  landingIntroPhaseAfter,
  landingVeilOpacityClass,
  type LandingIntroContext
} from '@/lib/landing-intro'
import { cn } from '@/lib/utils'
import { useLandingIntroStore } from '@/store/landing-intro'

type LandingIntroProps = {
  /** The garden has drawn its first frame. The veil waits for this so the park is actually there to guess. */
  ready: boolean
}

const KEYS_THAT_MOVE_THE_PAGE = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Tab',
  'Enter',
  'NumpadEnter'
])

/**
 * Rideau de la landing, au-dessus du jardin déjà en train de tourner :
 * marque sur fond opaque, puis voile à 90 % pour laisser deviner le parc, puis fondu au premier geste.
 * L'écoute est en capture et stoppe l'événement : la scène traite aussi `window` `keydown`
 * (survol caméra, conduite) et ne doit pas recevoir la touche qui lève le rideau.
 */
export function LandingIntro({ ready }: LandingIntroProps) {
  const t = useTranslations('home')
  const phase = useLandingIntroStore((state) => state.phase)
  const setPhase = useLandingIntroStore((state) => state.setPhase)
  const [holdElapsed, setHoldElapsed] = useState(false)

  const lift = useCallback(() => {
    const context: LandingIntroContext = { holdElapsed: true, worldReady: true }
    setPhase(landingIntroPhaseAfter(useLandingIntroStore.getState().phase, 'key', context))
  }, [setPhase])

  useEffect(() => {
    if (useLandingIntroStore.getState().phase === 'open') return
    const id = window.setTimeout(() => setHoldElapsed(true), LANDING_INTRO_MARK_MS)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const context: LandingIntroContext = { holdElapsed, worldReady: ready }
    const current = useLandingIntroStore.getState().phase
    const next = landingIntroPhaseAfter(current, 'sync', context)
    if (next !== current) setPhase(next)
  }, [holdElapsed, ready, setPhase])

  useEffect(() => {
    if (phase === 'open') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select') !== null)
      ) {
        return
      }
      if (KEYS_THAT_MOVE_THE_PAGE.has(event.code)) event.preventDefault()
      event.stopImmediatePropagation()
      lift()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [phase, lift])

  const open = phase === 'open'

  return (
    <div
      data-slot='landing-intro'
      data-state={phase}
      aria-hidden={open || undefined}
      className={cn(
        'fixed inset-0 z-40 flex items-center justify-center',
        open ? 'pointer-events-none opacity-0' : 'opacity-100',
        'motion-safe:landing-veil'
      )}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        lift()
      }}
    >
      <div
        aria-hidden
        className={cn('bg-background motion-safe:landing-veil absolute inset-0', landingVeilOpacityClass(phase))}
      />
      <div className='motion-safe:animate-fade-up relative flex flex-col items-center gap-8 px-6'>
        <BrandLockup size='lg' titleAs={open ? 'p' : 'h1'} name={t('title')} baseline={t('baseline')} />
        {phase === 'mark' ? (
          <p className='sr-only'>{t('continueHint')}</p>
        ) : (
          <p
            className={cn(
              'text-muted-foreground text-center text-sm',
              phase === 'veil' && 'motion-safe:animate-fade-up'
            )}
          >
            {t('continueHint')}
          </p>
        )}
      </div>
    </div>
  )
}
