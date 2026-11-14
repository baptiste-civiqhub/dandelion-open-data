'use client'

import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { StageCurtain } from '@/components/shared/stage-curtain'
import { usePathname } from '@/i18n/navigation'
import { STAGE_TRANSITION, useStageTransitionStore } from '@/store/stage-transition'

/**
 * Rideau des transitions de page du Stage (`store/stage-transition.ts`), monté une fois dans la coque `(stage)` pour
 * survivre à la navigation : il masque l'écran de chargement et la mise en place de la page d'arrivée, puis s'efface
 * dès qu'elle se déclare prête (`useStageArrival`), au plus tard après `maxHoldMs`. Une navigation vers une autre
 * page que celle attendue le lève aussitôt.
 */
export function StageTransitionCurtain() {
  const pathname = usePathname()
  const { phase, path, frame, reveal, settle } = useStageTransitionStore(
    useShallow(({ phase, path, frame, reveal, settle }) => ({ phase, path, frame, reveal, settle }))
  )
  const lastPathname = useRef(pathname)

  useEffect(() => {
    if (pathname === lastPathname.current) return
    lastPathname.current = pathname
    if (pathname !== path) reveal()
  }, [pathname, path, reveal])

  useEffect(() => {
    if (phase === 'idle') return
    const timer = setTimeout(
      phase === 'holding' ? reveal : settle,
      STAGE_TRANSITION[phase === 'holding' ? 'maxHoldMs' : 'revealMs']
    )
    return () => clearTimeout(timer)
  }, [phase, reveal, settle])

  return frame ? <StageCurtain frame={frame} open={phase === 'holding'} /> : null
}
