import type { TexteSnapshot } from '@/apis/texte/types'
import { ENVS } from '@/configs/env'
import pfasSnapshot from '@/data/pfas/amendments.json'
import teamSnapshot from '@/features/texte/fixtures/texte-amendements.json'
import { pfasToFlowerDataset, teamToFlowerDataset, type FlowerDatasetId } from '@/features/texte/lib/datasets'
import type { PfasSnapshot } from '@/apis/pfas-amendments/types'
import { createFeatherlessCompletion } from '@/services/featherless'

import { planQuestion, prepareDataset, type PreparedDataset } from './handler'

export const dynamic = 'force-dynamic'

const cache = new Map<FlowerDatasetId, PreparedDataset>()

const load = (id: FlowerDatasetId): PreparedDataset => {
  const cached = cache.get(id)
  if (cached) return cached
  const dataset =
    id === 'pfas-senat-620'
      ? pfasToFlowerDataset(pfasSnapshot as PfasSnapshot)
      : teamToFlowerDataset(teamSnapshot as TexteSnapshot)
  const prepared = prepareDataset(dataset)
  cache.set(id, prepared)
  return prepared
}

export async function POST(req: Request) {
  let body: unknown = null
  try {
    body = await req.json()
  } catch {
    body = null
  }
  const apiKey = ENVS.FEATHERLESS_API_KEY
  const complete = apiKey
    ? createFeatherlessCompletion({ apiKey, baseUrl: ENVS.FEATHERLESS_API_BASE, model: ENVS.FEATHERLESS_MODEL })
    : null
  const outcome = await planQuestion(body, { complete, model: ENVS.FEATHERLESS_MODEL, load })
  return Response.json(outcome.body, { status: outcome.status, headers: { 'Cache-Control': 'no-store' } })
}
