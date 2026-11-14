export const LANDING_INTRO_PHASES = ['mark', 'veil', 'open'] as const

export type LandingIntroPhase = (typeof LANDING_INTRO_PHASES)[number]

export type LandingIntroEvent = 'key' | 'sync'

export type LandingIntroContext = {
  /** The solid mark has already stayed up for `LANDING_INTRO_MARK_MS`. */
  holdElapsed: boolean
  /** The garden has drawn a frame, so the veil has something to reveal. */
  worldReady: boolean
}

/**
 * Durée du plan marque sur fond opaque, avant que le jardin puisse transparaître.
 * Vit ici (pas dans le CSS) : c'est une porte de phase, pas une durée de transition.
 */
export const LANDING_INTRO_MARK_MS = 1600

/**
 * Marque sur fond plein, puis voile une fois le délai écoulé et le jardin dessiné, puis ouverture à la touche.
 * Une touche ouvre depuis n'importe quelle phase, même si le jardin n'est pas prêt.
 * `sync` ne referme jamais un rideau déjà levé.
 */
export function landingIntroPhaseAfter(
  phase: LandingIntroPhase,
  event: LandingIntroEvent,
  context: LandingIntroContext
): LandingIntroPhase {
  if (phase === 'open' || event === 'key') return 'open'
  if (phase === 'mark' && context.holdElapsed && context.worldReady) return 'veil'
  return phase
}

/** Le header flottant reste hors écran seulement tant que le rideau de l'accueil est encore là. */
export function isLandingHeaderParked(isHome: boolean, phase: LandingIntroPhase): boolean {
  return isHome && phase !== 'open'
}

/**
 * Opacité du champ blanc devant le jardin. Plein pendant la marque, puis 90 %.
 * Pendant le fondu de sortie, le voile reste à 90 % : c'est le parent qui s'efface.
 */
export function landingVeilOpacityClass(phase: LandingIntroPhase): 'opacity-100' | 'opacity-90' {
  return phase === 'mark' ? 'opacity-100' : 'opacity-90'
}
