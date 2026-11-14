import type { AssistantPlan } from '@/features/dataviz-assistant/lib/plan'
import type { FlowerDatasetId } from '@/features/texte/lib/datasets'

export type DatavizPlanRequest = { question: string; datasetId: FlowerDatasetId }

/** Faits tirés des enregistrements du serveur, jamais de la prose du modèle. */
export type PlanRecordFact = {
  id: string
  numero: string
  article: string
  outcome: string | null
  sourceUrl: string | null
  hasText: boolean
}

export type DatavizPlanErrorCode = 'timeout' | 'provider-error' | 'invalid-response'

export type DatavizPlanResponse =
  | { mode: 'provider'; status: 'plan'; model: string; plan: AssistantPlan; records: PlanRecordFact[] }
  | { mode: 'provider'; status: 'abstain'; model: string }
  | { mode: 'provider'; status: 'error'; model: string; code: DatavizPlanErrorCode }
  | { mode: 'unconfigured' }
  | { mode: 'rejected'; code: 'invalid-request' }
