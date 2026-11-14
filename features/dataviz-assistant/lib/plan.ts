import { z } from 'zod'

export const MAX_QUESTION_LENGTH = 600
export const MAX_RAW_PLAN_BYTES = 8 * 1024

const id = z.string().trim().min(1).max(200)

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('focus'), id }).strict(),
  z.object({ type: z.literal('compare'), ids: z.tuple([id, id]) }).strict(),
  z.object({ type: z.literal('show-evidence') }).strict(),
  z.object({ type: z.literal('open-location'), id }).strict()
])

const planSchema = z.object({ schemaVersion: z.literal(1), actions: z.array(actionSchema).min(1).max(4) }).strict()
const abstentionSchema = z.object({ schemaVersion: z.literal(1), abstain: z.literal(true) }).strict()

export type AssistantAction = z.infer<typeof actionSchema>
export type AssistantPlan = z.infer<typeof planSchema>

/** Identifiants qu'un hôte (PFAS, fleur, jeu PLFSS…) accepte : rien d'autre ne peut être ciblé par un plan. */
export type AssistantRegistry = {
  entityIds: ReadonlySet<string>
  locationIds: ReadonlySet<string>
}

export type PlanValidation = { ok: true; plan: AssistantPlan } | { ok: false; errors: string[] }

export function createRegistry(entityIds: Iterable<string>, locationIds: Iterable<string> = []): AssistantRegistry {
  return { entityIds: new Set(entityIds), locationIds: new Set(locationIds) }
}

/** Valide un plan entier (schéma strict + registre). Aucune action n'est retenue si une seule est invalide. */
export function validatePlan(raw: unknown, registry: AssistantRegistry): PlanValidation {
  const parsed = planSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'plan'}: ${issue.message}`)
    }
  }
  const errors: string[] = []
  const entity = (value: string, at: string) => {
    if (!registry.entityIds.has(value)) errors.push(`${at}: unknown entity ${value}`)
  }
  parsed.data.actions.forEach((action, index) => {
    const at = `actions.${index}`
    if (action.type === 'focus') entity(action.id, at)
    if (action.type === 'compare') {
      action.ids.forEach((value) => entity(value, at))
      if (action.ids[0] === action.ids[1]) errors.push(`${at}: comparison needs two distinct entities`)
    }
    if (action.type === 'open-location' && !registry.locationIds.has(action.id)) {
      errors.push(`${at}: unregistered location ${action.id}`)
    }
  })
  return errors.length ? { ok: false, errors } : { ok: true, plan: parsed.data }
}

export type ModelResponse =
  | { kind: 'plan'; plan: AssistantPlan }
  | { kind: 'abstain' }
  | { kind: 'invalid'; errors: string[] }

const byteLength = (value: string) => new TextEncoder().encode(value).length

/**
 * Point d'entrée pour une réponse brute de modèle : JSON seul, ≤ 8 Ko, plan valide ou abstention explicite.
 * Toute prose est rejetée : la réponse affichée vient des enregistrements réels sélectionnés, jamais du modèle.
 */
export function parseModelResponse(raw: string, registry: AssistantRegistry): ModelResponse {
  if (byteLength(raw) > MAX_RAW_PLAN_BYTES) return { kind: 'invalid', errors: ['response exceeds 8 KB'] }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { kind: 'invalid', errors: ['response is not JSON'] }
  }
  if (abstentionSchema.safeParse(json).success) return { kind: 'abstain' }
  const result = validatePlan(json, registry)
  return result.ok ? { kind: 'plan', plan: result.plan } : { kind: 'invalid', errors: result.errors }
}
