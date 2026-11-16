import { create } from 'zustand'

import type { StillFrameSource } from '@/components/shared/still-frame'

/**
 * Passage d'une page du Stage à la suivante avec continuité visuelle (monde 3D → page de zone). État UI seulement :
 * deux images gardées en mémoire côté client pendant la navigation, jamais de données serveur.
 *
 * - `holding` : la page de départ est partie ; le rideau (`StageTransitionCurtain`) tient sa dernière image, à
 *   l'identique, pendant que la page d'arrivée se charge dessous.
 * - `revealing` : la page d'arrivée est prête (`useStageArrival`) ; le rideau s'efface sur elle.
 * - `idle` : aucun rideau. `scenery` reste disponible pour le fond de la page d'arrivée (retour arrière compris).
 */
export type StageTransitionPhase = 'idle' | 'holding' | 'revealing'

/** Réglages, en ms. `revealMs` = durée de l'utilitaire `stage-crossfade` (design-system/motion.css). */
export const STAGE_TRANSITION = {
  /** Attente maximale de la page d'arrivée avant de lever le rideau quand même. */
  maxHoldMs: 1600,
  revealMs: 800
} as const

type State = {
  phase: StageTransitionPhase
  /** Chemin interne de la page d'arrivée (`PUBLIC_PATHS`). */
  path: string | null
  /** Dernière image de la page de départ, telle qu'affichée : le rideau. */
  frame: StillFrameSource | null
  /** La même vue sans voile, en basse définition : le fond flouté de la page d'arrivée. */
  scenery: StillFrameSource | null
}

type Actions = {
  depart: (departure: { path: string; frame: StillFrameSource; scenery: StillFrameSource }) => void
  /** La page d'arrivée est prête, ou l'attente a assez duré : le rideau s'efface. */
  reveal: () => void
  /** Le rideau est effacé : son image est libérée, `scenery` reste. */
  settle: () => void
}

export const useStageTransitionStore = create<State & Actions>((set, get) => ({
  phase: 'idle',
  path: null,
  frame: null,
  scenery: null,
  depart: ({ path, frame, scenery }) => set({ phase: 'holding', path, frame, scenery }),
  reveal: () => {
    if (get().phase === 'holding') set({ phase: 'revealing' })
  },
  settle: () => set({ phase: 'idle', frame: null })
}))
