import { create } from 'zustand'

import type { LandingIntroPhase } from '@/lib/landing-intro'

// Rideau de la landing uniquement. Le jardin lui-même reste dans le cache de la scène, pas ici.
type LandingIntroState = {
  phase: LandingIntroPhase
  setPhase: (phase: LandingIntroPhase) => void
}

export const useLandingIntroStore = create<LandingIntroState>((set) => ({
  phase: 'mark',
  setPhase: (phase) => set({ phase })
}))
