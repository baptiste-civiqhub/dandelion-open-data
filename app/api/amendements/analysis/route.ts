// Analyse sémantique d'amendements par inférence Featherless. La clé reste côté serveur (jamais NEXT_PUBLIC_, jamais
// journalisée) ; sans clé, la route répond en mode dégradé. Exclue du middleware next-intl via le segment `/api`.

import { getAmendementTexts } from '@/apis/amendement-analysis/server-request'
import type { AmendementAnalysisResponse } from '@/apis/amendement-analysis/types'
import { ENVS } from '@/configs/env'
import { createFeatherlessCompletion } from '@/services/featherless'

import { analyzeAmendements } from './handler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const cache = new Map<string, AmendementAnalysisResponse>()

export async function POST(request: Request) {
  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }
  const apiKey = ENVS.FEATHERLESS_API_KEY_1 ?? ENVS.FEATHERLESS_API_KEY
  const model = ENVS.FEATHERLESS_CHAT_MODEL
  const outcome = await analyzeAmendements(body, {
    complete: apiKey ? createFeatherlessCompletion({ apiKey, model }) : null,
    model,
    loadTexts: getAmendementTexts,
    cache
  })
  return Response.json(outcome.body, { status: outcome.status, headers: { 'Cache-Control': 'no-store' } })
}
