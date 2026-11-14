'use client'

import { createContext, useContext, useEffect } from 'react'
import { createStore, useStore, type StoreApi } from 'zustand'

import { toggleExcludedSort } from '../lib/sunburst-filters'
import { isContainer, isDescendantOrSelf, ROOT_ID, type SunburstTree } from '../lib/sunburst-tree'
import { DEFAULT_VIEW, MAX_DEPTH, MIN_DEPTH, normalizeView, writeView, type SunburstView } from '../lib/view-url'

/** État épinglé de la vue (focus, sélection, filtres, profondeur), miroir de l'URL. */
export type ViewStoreState = SunburstView & {
  tree: SunburstTree | null
  setTree: (tree: SunburstTree | null) => void
  focus: (nodeId: string) => void
  up: () => void
  select: (nodeId: string | null) => void
  /** Sélectionne un amendement et zoome sur son conteneur s'il est hors du focus. */
  reveal: (nodeId: string) => void
  toggleSort: (code: string) => void
  clearFilters: () => void
  setDepth: (depth: number) => void
}

export type HoverSource = 'disk' | 'legend' | 'repartition' | 'breadcrumb' | 'fiche'

/** Survol : éphémère, hors URL, séparé de la vue pour ne rien recalculer d'autre que l'apparence (BR-E1). */
export type HoverStoreState = {
  nodeId: string | null
  sort: string | null
  source: HoverSource | null
  /** Position du curseur dans la fenêtre, pour l'infobulle. */
  pointer: { x: number; y: number } | null
  hoverNode: (nodeId: string | null, source: HoverSource) => void
  hoverSort: (sort: string | null, source: HoverSource) => void
  /** Retour à l'état épinglé après un court délai (BR-H3), annulé par tout nouveau survol. */
  leave: () => void
  setPointer: (pointer: { x: number; y: number } | null) => void
}

const LEAVE_DELAY_MS = 110

export function createViewStore(initial: SunburstView): StoreApi<ViewStoreState> {
  return createStore<ViewStoreState>((set, get) => ({
    ...initial,
    tree: null,
    setTree: (tree) =>
      set((state) => {
        if (!tree) return { tree }
        const { focusId, selectionId } = normalizeView(state, tree)
        return { tree, focusId, selectionId }
      }),
    focus: (nodeId) => {
      const { tree, selectionId } = get()
      const node = tree?.byId.get(nodeId)
      if (!tree || !node || !isContainer(node)) return
      const selection = selectionId ? tree.byId.get(selectionId) : undefined
      set({
        focusId: node.id,
        selectionId: selection && isDescendantOrSelf(selection, node) ? selectionId : null
      })
    },
    up: () => {
      const { tree, focusId } = get()
      const parent = tree?.byId.get(focusId)?.parent
      if (parent) get().focus(parent.id)
    },
    select: (nodeId) => set({ selectionId: nodeId }),
    reveal: (nodeId) => {
      const { tree, focusId } = get()
      const node = tree?.byId.get(nodeId)
      const focus = tree?.byId.get(focusId)
      if (!tree || !node || !focus) return
      if (!isDescendantOrSelf(node, focus)) {
        let target = node.parent
        while (target && !isContainer(target)) target = target.parent
        set({ focusId: (target ?? tree.root).id })
      }
      set({ selectionId: node.id })
    },
    toggleSort: (code) => set((state) => ({ excludedSorts: toggleExcludedSort(state.excludedSorts, code) })),
    clearFilters: () => set({ excludedSorts: [] }),
    setDepth: (depth) => set({ depth: Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, depth)) })
  }))
}

export function createHoverStore(): StoreApi<HoverStoreState> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }
  return createStore<HoverStoreState>((set, get) => ({
    nodeId: null,
    sort: null,
    source: null,
    pointer: null,
    hoverNode: (nodeId, source) => {
      cancel()
      if (nodeId === null) return get().leave()
      if (get().nodeId !== nodeId || get().source !== source) set({ nodeId, sort: null, source })
    },
    hoverSort: (sort, source) => {
      cancel()
      if (sort === null) return get().leave()
      if (get().sort !== sort) set({ sort, nodeId: null, source })
    },
    leave: () => {
      if (timer || (get().nodeId === null && get().sort === null)) return
      timer = setTimeout(() => {
        timer = undefined
        set({ nodeId: null, sort: null, source: null })
      }, LEAVE_DELAY_MS)
    },
    setPointer: (pointer) => set({ pointer })
  }))
}

export type SunburstStores = { view: StoreApi<ViewStoreState>; hover: StoreApi<HoverStoreState> }

export const SunburstStoresContext = createContext<SunburstStores | null>(null)

function useStores(): SunburstStores {
  const stores = useContext(SunburstStoresContext)
  if (!stores) throw new Error('SunburstStoresContext manquant')
  return stores
}

export const useSunburstStores = useStores

export function useViewStore<T>(selector: (state: ViewStoreState) => T): T {
  return useStore(useStores().view, selector)
}

export function useHoverStore<T>(selector: (state: HoverStoreState) => T): T {
  return useStore(useStores().hover, selector)
}

/**
 * Écrit la vue épinglée dans l'URL à chaque changement, sans navigation serveur : `history.replaceState`, que
 * le routeur de Next relaie à `useSearchParams`. Les autres paramètres (texte) sont conservés.
 */
export function useViewUrlSync(view: StoreApi<ViewStoreState>) {
  useEffect(
    () =>
      view.subscribe((state, previous) => {
        if (
          state.focusId === previous.focusId &&
          state.selectionId === previous.selectionId &&
          state.excludedSorts === previous.excludedSorts &&
          state.depth === previous.depth
        )
          return
        const params = writeView(new URLSearchParams(window.location.search), state)
        const query = params.toString()
        window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
      }),
    [view]
  )
}

export const INITIAL_VIEW = DEFAULT_VIEW
export { ROOT_ID }
