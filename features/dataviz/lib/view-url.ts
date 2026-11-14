import { isContainer, isDescendantOrSelf, ROOT_ID, type SunburstTree } from './sunburst-tree'

/** État épinglé de la vue, porté par l'URL (AC-E1) : recharger ou partager le lien rend le même écran. */
export type SunburstView = {
  focusId: string
  selectionId: string | null
  excludedSorts: string[]
  depth: number
}

export const DEFAULT_DEPTH = 3
export const MIN_DEPTH = 2
export const MAX_DEPTH = 4

/** Paramètres d'URL propres à la page de zone. */
export const VIEW_PARAMS = {
  texte: 'texte',
  focus: 'focus',
  selection: 'sel',
  excludedSorts: 'off',
  depth: 'depth'
} as const

export const DEFAULT_VIEW: SunburstView = {
  focusId: ROOT_ID,
  selectionId: null,
  excludedSorts: [],
  depth: DEFAULT_DEPTH
}

type ReadableParams = Pick<URLSearchParams, 'get'>

export function parseView(params: ReadableParams): SunburstView {
  const depth = Number(params.get(VIEW_PARAMS.depth))
  return {
    focusId: params.get(VIEW_PARAMS.focus) || ROOT_ID,
    selectionId: params.get(VIEW_PARAMS.selection) || null,
    excludedSorts: (params.get(VIEW_PARAMS.excludedSorts) ?? '').split(',').filter(Boolean),
    depth: Number.isInteger(depth) && depth >= MIN_DEPTH && depth <= MAX_DEPTH ? depth : DEFAULT_DEPTH
  }
}

/** Écrit la vue dans les paramètres (les valeurs par défaut sont omises) et garde les autres paramètres. */
export function writeView(params: ReadableParams & { toString(): string }, view: SunburstView): URLSearchParams {
  const next = new URLSearchParams(params.toString())
  const set = (key: string, value: string | null) => (value ? next.set(key, value) : next.delete(key))
  set(VIEW_PARAMS.focus, view.focusId === ROOT_ID ? null : view.focusId)
  set(VIEW_PARAMS.selection, view.selectionId)
  set(VIEW_PARAMS.excludedSorts, view.excludedSorts.length ? view.excludedSorts.join(',') : null)
  set(VIEW_PARAMS.depth, view.depth === DEFAULT_DEPTH ? null : String(view.depth))
  return next
}

/**
 * Ramène une vue lue dans l'URL à ce que le texte permet : un focus inconnu ou qui n'est pas un conteneur
 * revient au texte (BR-N1) ; une sélection inconnue, ou hors du focus, est levée (BR-N2).
 */
export function normalizeView(view: SunburstView, tree: SunburstTree): SunburstView {
  const focus = tree.byId.get(view.focusId)
  const safeFocus = focus && isContainer(focus) ? focus : tree.root
  const selection = view.selectionId ? tree.byId.get(view.selectionId) : undefined
  const keepSelection = selection?.kind === 'amendement' && isDescendantOrSelf(selection, safeFocus)
  return {
    ...view,
    focusId: safeFocus.id,
    selectionId: keepSelection ? view.selectionId : null
  }
}
