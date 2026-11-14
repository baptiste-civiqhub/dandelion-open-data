import { describe, expect, it } from 'vitest'

import { canZoom, focusView, INITIAL_VIEW, viewOffset, ZOOM_MAX, ZOOM_MIN, zoomView } from './view'

describe('zoomView', () => {
  it('zooms in and out within bounds and fits back to scale 1', () => {
    let view = INITIAL_VIEW
    for (let i = 0; i < 10; i += 1) view = zoomView(view, 'in')
    expect(view.scale).toBe(ZOOM_MAX)
    expect(canZoom(view, 'in')).toBe(false)
    for (let i = 0; i < 20; i += 1) view = zoomView(view, 'out')
    expect(view.scale).toBe(ZOOM_MIN)
    expect(zoomView(view, 'fit').scale).toBe(1)
  })

  it('keeps the semantic focus when zooming and centres on it only when zoomed in', () => {
    const view = zoomView(focusView(INITIAL_VIEW, 'article:1'), 'in')
    expect(view.focusId).toBe('article:1')
    expect(viewOffset(view, { x: 10, y: -20 })).toEqual({ x: -15, y: 30 })
    expect(viewOffset(INITIAL_VIEW, { x: 10, y: 20 })).toEqual({ x: 0, y: 0 })
  })
})
