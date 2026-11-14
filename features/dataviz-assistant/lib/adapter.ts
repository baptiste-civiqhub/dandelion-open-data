import { validatePlan, type AssistantAction, type AssistantRegistry } from './plan'

export type ZoomDirection = 'in' | 'out' | 'fit'

/** Ce qu'une visualisation hôte implémente pour être pilotée. `openLocation`, `zoom` et `resetView` sont optionnels. */
export type DatavizAssistantAdapter = {
  focusEntity: (id: string) => void
  compareEntities: (ids: [string, string]) => void
  showEvidence: () => void
  openLocation?: (id: string) => void
  zoom?: (direction: ZoomDirection) => void
  resetView?: () => void
}

/** Actions optionnelles que l'hôte sait exécuter : sert au prompt et à la validation. */
export function adapterCapabilities(adapter: DatavizAssistantAdapter): OptionalCapability[] {
  const capabilities: OptionalCapability[] = []
  if (adapter.openLocation) capabilities.push('open-location')
  if (adapter.zoom) capabilities.push('zoom')
  if (adapter.resetView) capabilities.push('reset-view')
  return capabilities
}

export type OptionalCapability = 'open-location' | 'zoom' | 'reset-view'

export type ApplyResult = { ok: true; applied: AssistantAction[] } | { ok: false; errors: string[] }

/** Valide tout le plan, vérifie que l'hôte sait exécuter chaque action, puis seulement l'applique dans l'ordre. */
export function applyPlan(raw: unknown, adapter: DatavizAssistantAdapter, registry: AssistantRegistry): ApplyResult {
  const result = validatePlan(raw, registry)
  if (!result.ok) return result
  const { actions } = result.plan
  const supported = new Set<string>(adapterCapabilities(adapter))
  const missing = actions.find(
    (action) => ['open-location', 'zoom', 'reset-view'].includes(action.type) && !supported.has(action.type)
  )
  if (missing) return { ok: false, errors: [`host does not support ${missing.type}`] }
  for (const action of actions) {
    if (action.type === 'focus') adapter.focusEntity(action.id)
    else if (action.type === 'compare') adapter.compareEntities(action.ids)
    else if (action.type === 'show-evidence') adapter.showEvidence()
    else if (action.type === 'zoom') adapter.zoom?.(action.direction)
    else if (action.type === 'reset-view') adapter.resetView?.()
    else adapter.openLocation?.(action.id)
  }
  return { ok: true, applied: actions }
}
