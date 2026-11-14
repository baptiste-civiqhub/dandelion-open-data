import { describe, expect, it, vi } from 'vitest'

import { applyPlan, type DatavizAssistantAdapter } from './adapter'
import { createRegistry } from './plan'

const makeAdapter = (withLocation = false) => {
  const adapter: DatavizAssistantAdapter = {
    focusEntity: vi.fn(),
    compareEntities: vi.fn(),
    showEvidence: vi.fn()
  }
  if (withLocation) adapter.openLocation = vi.fn()
  return adapter
}

describe('applyPlan', () => {
  it('applies valid actions in order', () => {
    const adapter = makeAdapter()
    const order: string[] = []
    adapter.compareEntities = vi.fn(() => order.push('compare'))
    adapter.showEvidence = vi.fn(() => order.push('evidence'))
    const result = applyPlan(
      { schemaVersion: 1, actions: [{ type: 'compare', ids: ['a', 'b'] }, { type: 'show-evidence' }] },
      adapter,
      createRegistry(['a', 'b'])
    )
    expect(result.ok).toBe(true)
    expect(adapter.compareEntities).toHaveBeenCalledWith(['a', 'b'])
    expect(order).toEqual(['compare', 'evidence'])
  })

  it('is atomic: an invalid action later in the plan prevents every action', () => {
    const adapter = makeAdapter()
    const result = applyPlan(
      {
        schemaVersion: 1,
        actions: [
          { type: 'focus', id: 'a' },
          { type: 'compare', ids: ['a', 'unknown'] }
        ]
      },
      adapter,
      createRegistry(['a', 'b'])
    )
    expect(result.ok).toBe(false)
    expect(adapter.focusEntity).not.toHaveBeenCalled()
    expect(adapter.compareEntities).not.toHaveBeenCalled()
  })

  it('opens a registered location when the host implements it', () => {
    const adapter = makeAdapter(true)
    const plan = { schemaVersion: 1, actions: [{ type: 'open-location', id: 'stand-1' }] }
    expect(applyPlan(plan, adapter, createRegistry([], ['stand-1'])).ok).toBe(true)
    expect(adapter.openLocation).toHaveBeenCalledWith('stand-1')
  })

  it('refuses open-location when the host has no location support, before any action', () => {
    const adapter = makeAdapter(false)
    const plan = {
      schemaVersion: 1,
      actions: [
        { type: 'focus', id: 'a' },
        { type: 'open-location', id: 'stand-1' }
      ]
    }
    expect(applyPlan(plan, adapter, createRegistry(['a'], ['stand-1']))).toEqual({
      ok: false,
      errors: ['host does not support open-location']
    })
    expect(adapter.focusEntity).not.toHaveBeenCalled()
  })
})
