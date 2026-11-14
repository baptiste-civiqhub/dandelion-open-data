import { validatePlan, type AssistantAction, type AssistantRegistry } from './plan'

/** Ce qu'une visualisation hôte implémente pour être pilotée. `openLocation` est optionnel. */
export type DatavizAssistantAdapter = {
  focusEntity: (id: string) => void
  compareEntities: (ids: [string, string]) => void
  showEvidence: () => void
  openLocation?: (id: string) => void
}

export type ApplyResult = { ok: true; applied: AssistantAction[] } | { ok: false; errors: string[] }

/** Valide tout le plan, vérifie que l'hôte sait exécuter chaque action, puis seulement l'applique dans l'ordre. */
export function applyPlan(raw: unknown, adapter: DatavizAssistantAdapter, registry: AssistantRegistry): ApplyResult {
  const result = validatePlan(raw, registry)
  if (!result.ok) return result
  const { actions } = result.plan
  if (actions.some((action) => action.type === 'open-location') && !adapter.openLocation) {
    return { ok: false, errors: ['host does not support open-location'] }
  }
  for (const action of actions) {
    if (action.type === 'focus') adapter.focusEntity(action.id)
    else if (action.type === 'compare') adapter.compareEntities(action.ids)
    else if (action.type === 'show-evidence') adapter.showEvidence()
    else adapter.openLocation?.(action.id)
  }
  return { ok: true, applied: actions }
}
