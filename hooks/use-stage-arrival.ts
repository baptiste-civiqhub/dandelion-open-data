'use client'

import { useEffect, useState } from 'react'

import { useStageTransitionStore } from '@/store/stage-transition'

/**
 * Côté page d'arrivée d'une transition de Stage (`store/stage-transition.ts`). `path` : chemin de la page ;
 * `isReady` : elle a de quoi s'afficher (données chargées, état vide ou d'erreur). Lève le rideau dès que la page est
 * prête. Rend `scenery`, l'image de la scène quittée pour le fond (`null` si l'on n'arrive pas d'une scène vers cette
 * page), et `isArriving`, figé au montage : la page s'ouvre sous le rideau, son entrée peut prolonger le geste.
 */
export function useStageArrival(path: string, isReady: boolean) {
  const phase = useStageTransitionStore((state) => state.phase)
  const isDestination = useStageTransitionStore((state) => state.path === path)
  const scenery = useStageTransitionStore((state) => (state.path === path ? state.scenery : null))
  const reveal = useStageTransitionStore((state) => state.reveal)
  const [isArriving] = useState(() => {
    const state = useStageTransitionStore.getState()
    return state.path === path && state.phase !== 'idle'
  })

  useEffect(() => {
    if (isReady && isDestination && phase === 'holding') reveal()
  }, [isReady, isDestination, phase, reveal])

  return { scenery, isArriving }
}
