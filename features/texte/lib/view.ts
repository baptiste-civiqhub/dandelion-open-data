export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 4
export const ZOOM_STEP = 1.5

export type ZoomDirection = 'in' | 'out' | 'fit'

export type FlowerView = { scale: number; focusId: string | null }

export const INITIAL_VIEW: FlowerView = { scale: 1, focusId: null }

const clamp = (value: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))

export const zoomView = (view: FlowerView, direction: ZoomDirection): FlowerView => {
  if (direction === 'fit') return { ...view, scale: 1 }
  const next = direction === 'in' ? view.scale * ZOOM_STEP : view.scale / ZOOM_STEP
  return { ...view, scale: clamp(Math.round(next * 1000) / 1000) }
}

export const focusView = (view: FlowerView, focusId: string | null): FlowerView => ({ ...view, focusId })

export const canZoom = (view: FlowerView, direction: 'in' | 'out'): boolean =>
  direction === 'in' ? view.scale < ZOOM_MAX : view.scale > ZOOM_MIN

/** Décalage pour centrer le nœud focal quand on est zoomé ; vue globale centrée sur la racine. */
export const viewOffset = (view: FlowerView, focusPoint: { x: number; y: number } | null) =>
  view.scale > 1 && focusPoint ? { x: -focusPoint.x * view.scale, y: -focusPoint.y * view.scale } : { x: 0, y: 0 }
