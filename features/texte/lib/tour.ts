import type { AssistantPlan } from '@/features/dataviz-assistant/lib/plan'

export type TourStep = { id: string; plan: AssistantPlan }

export type TourStatus = 'idle' | 'playing' | 'paused' | 'done'
export type TourState = { status: TourStatus; index: number }
export type TourEvent = 'start' | 'pause' | 'resume' | 'stop' | 'tick' | 'next' | 'interrupt'

export const TOUR_STEP_MS = 4000
export const IDLE_TOUR: TourState = { status: 'idle', index: 0 }

/** Machine d'état du parcours : rien ne démarre sans `start` ; toute manipulation (`interrupt`) met en pause. */
export const tourReducer = (state: TourState, event: TourEvent, length: number): TourState => {
  if (length <= 0) return IDLE_TOUR
  switch (event) {
    case 'start':
      return { status: 'playing', index: 0 }
    case 'stop':
      return IDLE_TOUR
    case 'pause':
    case 'interrupt':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state
    case 'tick':
      if (state.status !== 'playing') return state
      return state.index + 1 >= length ? { status: 'done', index: length - 1 } : { ...state, index: state.index + 1 }
    case 'next':
      if (state.status === 'idle' || state.status === 'done') return state
      return state.index + 1 >= length ? { status: 'done', index: length - 1 } : { ...state, index: state.index + 1 }
  }
}

/** L'étape à appliquer quand l'état change : seulement pendant un parcours actif. */
export const activeStep = (state: TourState, steps: TourStep[]): TourStep | null =>
  state.status === 'idle' ? null : (steps[state.index] ?? null)

type TourAmendment = { id: string; numero: string }

const uniqueByNumero = (amendments: TourAmendment[], numero: string): string | null => {
  const matches = amendments.filter((amendment) => amendment.numero === numero)
  return matches.length === 1 && matches[0] ? matches[0].id : null
}

/**
 * Parcours PFAS : vue d'ensemble → article 1er → 26/27 → comparaison → sources → vue globale.
 * Renvoie `[]` si un identifiant attendu manque : pas de parcours sur des données incomplètes.
 */
export const buildPfasTour = (amendments: TourAmendment[], articleNodeId: string | null): TourStep[] => {
  const a = uniqueByNumero(amendments, '26')
  const b = uniqueByNumero(amendments, '27')
  if (!a || !b || !articleNodeId) return []
  return [
    { id: 'overview', plan: { schemaVersion: 1, actions: [{ type: 'reset-view' }] } },
    { id: 'article', plan: { schemaVersion: 1, actions: [{ type: 'focus', id: articleNodeId }] } },
    {
      id: 'pair',
      plan: {
        schemaVersion: 1,
        actions: [
          { type: 'focus', id: a },
          { type: 'zoom', direction: 'in' }
        ]
      }
    },
    { id: 'comparison', plan: { schemaVersion: 1, actions: [{ type: 'compare', ids: [a, b] }] } },
    { id: 'sources', plan: { schemaVersion: 1, actions: [{ type: 'show-evidence' }] } },
    { id: 'global', plan: { schemaVersion: 1, actions: [{ type: 'reset-view' }] } }
  ]
}

/** Parcours générique : vue d'ensemble → article le plus amendé → zoom → vue globale. */
export const buildOverviewTour = (articleNodeId: string | null): TourStep[] =>
  articleNodeId
    ? [
        { id: 'overview', plan: { schemaVersion: 1, actions: [{ type: 'reset-view' }] } },
        { id: 'heaviest', plan: { schemaVersion: 1, actions: [{ type: 'focus', id: articleNodeId }] } },
        { id: 'zoom', plan: { schemaVersion: 1, actions: [{ type: 'zoom', direction: 'in' }] } },
        { id: 'global', plan: { schemaVersion: 1, actions: [{ type: 'reset-view' }] } }
      ]
    : []
