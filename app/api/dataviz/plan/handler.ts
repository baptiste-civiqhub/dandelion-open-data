import { z } from 'zod'

import type { DatavizPlanResponse, PlanRecordFact } from '@/apis/dataviz-plan/types'
import type { DandelionNode } from '@/apis/texte/types'
import { indexCandidates, selectCandidates, type IndexedRecord } from '@/features/dataviz-assistant/lib/candidates'
import { createRegistry, MAX_QUESTION_LENGTH, parseModelResponse } from '@/features/dataviz-assistant/lib/plan'
import { buildSystemPrompt } from '@/features/dataviz-assistant/lib/prompt'
import { buildTree } from '@/features/texte/lib/build-tree'
import { FLOWER_DATASET_IDS, type FlowerDataset, type FlowerDatasetId } from '@/features/texte/lib/datasets'

export const MAX_PROMPT_CHARS = 16_000

const bodySchema = z
  .object({ question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH), datasetId: z.enum(FLOWER_DATASET_IDS) })
  .strict()

export type PreparedDataset = {
  dataset: FlowerDataset
  indexed: IndexedRecord[]
  structural: Array<{ id: string; label: string }>
  entityIds: Set<string>
}

/** Prépare une fois par jeu : nœuds structurels (texte, articles) et enregistrements normalisés. */
export const prepareDataset = (dataset: FlowerDataset): PreparedDataset => {
  const tree = buildTree(dataset.snapshot)
  const structural = [tree, ...tree.children.filter((node: DandelionNode) => node.kind === 'article')].map((node) => ({
    id: node.id,
    label: `${node.kind} · ${node.label} · ${node.weight} amendements`
  }))
  const indexed = indexCandidates(
    dataset.snapshot.amendments.map((amendment) => ({
      id: amendment.id,
      numero: amendment.numero,
      group: amendment.article,
      text: amendment.dispositif
    }))
  )
  const entityIds = new Set([...structural.map((node) => node.id), ...indexed.map((record) => record.id)])
  return { dataset, indexed, structural, entityIds }
}

export type PlanDeps = {
  /** `null` = aucun fournisseur configuré (pas de clé) : mode déterministe côté client. */
  complete: ((system: string, user: string) => Promise<string>) | null
  model: string
  load: (id: FlowerDatasetId) => PreparedDataset
}

export type PlanOutcome = { status: number; body: DatavizPlanResponse }

const isTimeout = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  ['ECONNABORTED', 'ETIMEDOUT'].includes(String(error.code))

export const factsFor = (prepared: PreparedDataset, ids: string[]): PlanRecordFact[] => {
  const byId = new Map(prepared.dataset.snapshot.amendments.map((amendment) => [amendment.id, amendment]))
  return ids.flatMap((id) => {
    const amendment = byId.get(id)
    if (!amendment) return []
    return [
      {
        id,
        numero: amendment.numero,
        article: amendment.article,
        outcome: amendment.sort,
        sourceUrl: prepared.dataset.sourceUrls[id] ?? null,
        hasText: amendment.dispositif.trim() !== ''
      }
    ]
  })
}

export const buildProviderPrompt = (prepared: PreparedDataset, question: string) => {
  const entities = selectCandidates(question, prepared.indexed, prepared.structural)
  let system = buildSystemPrompt({ entities, capabilities: ['zoom', 'reset-view'] })
  let kept = entities.length
  while (system.length > MAX_PROMPT_CHARS && kept > 1) {
    kept -= 1
    system = buildSystemPrompt({ entities: entities.slice(0, kept), capabilities: ['zoom', 'reset-view'] })
  }
  return { system, user: JSON.stringify({ question }), entityIds: entities.slice(0, kept).map((entity) => entity.id) }
}

/** Logique de la route /api/dataviz/plan, testable avec un fournisseur simulé. */
export const planQuestion = async (raw: unknown, deps: PlanDeps): Promise<PlanOutcome> => {
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return { status: 400, body: { mode: 'rejected', code: 'invalid-request' } }
  if (!deps.complete) return { status: 200, body: { mode: 'unconfigured' } }
  const prepared = deps.load(parsed.data.datasetId)
  const prompt = buildProviderPrompt(prepared, parsed.data.question)
  let content: string
  try {
    content = await deps.complete(prompt.system, prompt.user)
  } catch (error) {
    const code = isTimeout(error) ? 'timeout' : 'provider-error'
    return { status: 200, body: { mode: 'provider', status: 'error', model: deps.model, code } }
  }
  const registry = createRegistry(prompt.entityIds)
  const response = parseModelResponse(content, registry)
  if (response.kind === 'abstain')
    return { status: 200, body: { mode: 'provider', status: 'abstain', model: deps.model } }
  if (response.kind === 'invalid') {
    return { status: 200, body: { mode: 'provider', status: 'error', model: deps.model, code: 'invalid-response' } }
  }
  const ids = response.plan.actions.flatMap((action) =>
    action.type === 'focus' ? [action.id] : action.type === 'compare' ? [...action.ids] : []
  )
  return {
    status: 200,
    body: { mode: 'provider', status: 'plan', model: deps.model, plan: response.plan, records: factsFor(prepared, ids) }
  }
}
