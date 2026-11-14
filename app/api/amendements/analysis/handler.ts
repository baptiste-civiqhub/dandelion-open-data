import { z } from 'zod'

import type { AmendementTexts } from '@/apis/amendement-analysis/server-request'
import type {
  AmendementAnalysisRejection,
  AmendementAnalysisResponse,
  AnalysisDegradedReason,
  AnalysisSource
} from '@/apis/amendement-analysis/types'
import { buildAnalysisPrompt, parseAnalysisResponse } from '@/features/dataviz/lib/amendement-analysis'
import { toPlainText } from '@/features/dataviz/lib/plain-text'
import { countWords, textOverlap } from '@/features/dataviz/lib/text-overlap'

const bodySchema = z
  .object({
    mode: z.enum(['single', 'compare']),
    amendementIds: z.array(z.string().uuid()).min(1).max(2),
    locale: z.enum(['en', 'fr'])
  })
  .strict()
  .refine((body) => body.amendementIds.length === (body.mode === 'single' ? 1 : 2), 'wrong number of amendments')
  .refine((body) => new Set(body.amendementIds).size === body.amendementIds.length, 'duplicate amendments')

export type AnalysisDeps = {
  /** `null` : aucune clé Featherless côté serveur, réponse dégradée sans appel. */
  complete: ((system: string, user: string) => Promise<string>) | null
  model: string
  loadTexts: (amendementIds: readonly string[]) => Promise<AmendementTexts[]>
  now?: () => Date
  /** Réponses inférées déjà servies (mêmes amendements, même mode, même langue, même modèle). */
  cache?: Map<string, AmendementAnalysisResponse>
}

export type AnalysisOutcome = { status: number; body: AmendementAnalysisResponse | AmendementAnalysisRejection }

export const MAX_CACHED_ANALYSES = 200

const reject = (status: number, code: AmendementAnalysisRejection['code']): AnalysisOutcome => ({
  status,
  body: { status: 'rejected', code }
})

const errorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''

const failureReason = (error: unknown): AnalysisDegradedReason =>
  ['ECONNABORTED', 'ETIMEDOUT'].includes(errorCode(error)) ? 'timeout' : 'provider-error'

/**
 * Logique de `POST /api/amendements/analysis`, testable avec un fournisseur et une base simulés. Le client n'envoie
 * que des identifiants : les textes sont relus côté serveur. Toute défaillance du modèle donne une réponse dégradée
 * (HTTP 200) qui garde les faits calculés ; seules une requête invalide ou une base injoignable sont des erreurs.
 * Les erreurs ne sont jamais journalisées : celles d'axios portent l'en-tête Authorization.
 */
export async function analyzeAmendements(raw: unknown, deps: AnalysisDeps): Promise<AnalysisOutcome> {
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return reject(400, 'invalid-request')
  const { mode, amendementIds, locale } = parsed.data

  let rows: AmendementTexts[]
  try {
    rows = await deps.loadTexts(amendementIds)
  } catch {
    return reject(502, 'source-error')
  }
  const byId = new Map(rows.map((row) => [row.id, row]))
  const ordered = amendementIds.map((id) => byId.get(id))
  if (ordered.some((row) => !row)) return reject(404, 'not-found')

  const texts = (ordered as AmendementTexts[]).map((row) => ({
    row,
    dispositif: toPlainText(row.dispositif),
    exposeSommaire: toPlainText(row.exposeSommaire)
  }))
  const sources: AnalysisSource[] = texts.map(({ row, dispositif, exposeSommaire }) => ({
    id: row.id,
    numeroLong: row.numeroLong,
    sort: row.sort,
    articleDesignation: row.articleDesignation,
    dispositifWords: countWords(dispositif),
    exposeWords: countWords(exposeSommaire)
  }))
  const [first, second] = texts
  const overlap =
    mode === 'compare' && first && second
      ? {
          dispositif: textOverlap(first.dispositif, second.dispositif),
          expose: textOverlap(first.exposeSommaire, second.exposeSommaire)
        }
      : null
  const degraded = (reason: AnalysisDegradedReason, model: string | null): AnalysisOutcome => ({
    status: 200,
    body: { status: 'degraded', mode, reason, model, sources, overlap }
  })

  if (!deps.complete) return degraded('unconfigured', null)

  const cacheKey = JSON.stringify([mode, locale, deps.model, amendementIds])
  const cached = deps.cache?.get(cacheKey)
  if (cached) return { status: 200, body: cached }

  const prompt = buildAnalysisPrompt(
    mode,
    texts.map(({ row, dispositif, exposeSommaire }) => ({
      numeroLong: row.numeroLong,
      articleDesignation: row.articleDesignation,
      dispositif,
      exposeSommaire
    })),
    locale
  )
  let content: string
  try {
    content = await deps.complete(prompt.system, prompt.user)
  } catch (error) {
    return degraded(failureReason(error), deps.model)
  }

  const result = parseAnalysisResponse(content, mode)
  if (result.kind === 'abstain') return degraded('abstained', deps.model)
  if (result.kind === 'invalid') return degraded('invalid-response', deps.model)

  const body: AmendementAnalysisResponse = {
    status: 'inferred',
    mode,
    model: deps.model,
    generatedAt: (deps.now?.() ?? new Date()).toISOString(),
    analysis: result.analysis,
    sources,
    overlap
  }
  if (deps.cache) {
    if (deps.cache.size >= MAX_CACHED_ANALYSES) deps.cache.delete(deps.cache.keys().next().value as string)
    deps.cache.set(cacheKey, body)
  }
  return { status: 200, body }
}
