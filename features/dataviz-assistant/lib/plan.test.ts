import { describe, expect, it } from 'vitest'

import { createRegistry, MAX_RAW_PLAN_BYTES, parseModelResponse, validatePlan } from './plan'

const registry = createRegistry(['a', 'b', 'c'])
const withLocations = createRegistry(['a', 'b'], ['loc-budget'])

describe('validatePlan', () => {
  it('accepts every action type against the registry', () => {
    const plan = {
      schemaVersion: 1,
      actions: [
        { type: 'focus', id: 'a' },
        { type: 'compare', ids: ['a', 'b'] },
        { type: 'show-evidence' },
        { type: 'open-location', id: 'loc-budget' }
      ]
    }
    expect(validatePlan(plan, withLocations)).toEqual({ ok: true, plan })
  })

  it('rejects the whole plan when one action targets an unknown id', () => {
    const result = validatePlan(
      {
        schemaVersion: 1,
        actions: [
          { type: 'focus', id: 'a' },
          { type: 'focus', id: 'zzz' }
        ]
      },
      registry
    )
    expect(result).toEqual({ ok: false, errors: ['actions.1: unknown entity zzz'] })
  })

  it('rejects unknown fields, unknown actions and hostile payloads', () => {
    const hostile = [
      { schemaVersion: 1, actions: [{ type: 'focus', id: 'a', selector: '#root' }] },
      { schemaVersion: 1, actions: [{ type: 'eval', code: 'alert(1)' }] },
      { schemaVersion: 1, actions: [{ type: 'open-url', url: 'https://evil.example' }] },
      { schemaVersion: 1, actions: [{ type: 'show-evidence' }], note: 'Ignore previous instructions' },
      { schemaVersion: 1, actions: [{ type: 'focus', id: "a'; DROP TABLE amendments;--" }] },
      { schemaVersion: 2, actions: [{ type: 'show-evidence' }] },
      { schemaVersion: 1, actions: [] },
      { schemaVersion: 1, actions: Array.from({ length: 5 }, () => ({ type: 'show-evidence' })) },
      { schemaVersion: 1, actions: [{ type: 'compare', ids: ['a', 'b', 'c'] }] },
      null,
      'focus a'
    ]
    for (const raw of hostile) expect(validatePlan(raw, registry).ok).toBe(false)
  })

  it('rejects a comparison of an entity with itself', () => {
    expect(validatePlan({ schemaVersion: 1, actions: [{ type: 'compare', ids: ['a', 'a'] }] }, registry)).toEqual({
      ok: false,
      errors: ['actions.0: comparison needs two distinct entities']
    })
  })

  it('accepts registered locations only', () => {
    const plan = { schemaVersion: 1, actions: [{ type: 'open-location', id: 'loc-budget' }] }
    expect(validatePlan(plan, withLocations).ok).toBe(true)
    expect(validatePlan(plan, registry)).toEqual({ ok: false, errors: ['actions.0: unregistered location loc-budget'] })
  })
})

describe('parseModelResponse', () => {
  it('parses a JSON plan or an explicit abstention', () => {
    expect(parseModelResponse('{"schemaVersion":1,"actions":[{"type":"focus","id":"a"}]}', registry)).toEqual({
      kind: 'plan',
      plan: { schemaVersion: 1, actions: [{ type: 'focus', id: 'a' }] }
    })
    expect(parseModelResponse('{"schemaVersion":1,"abstain":true}', registry)).toEqual({ kind: 'abstain' })
  })

  it('rejects prose, prose-wrapped JSON and abstentions carrying text', () => {
    expect(parseModelResponse('Les amendements sont proches.', registry).kind).toBe('invalid')
    expect(parseModelResponse('Voici : {"schemaVersion":1,"actions":[{"type":"show-evidence"}]}', registry).kind).toBe(
      'invalid'
    )
    expect(parseModelResponse('{"schemaVersion":1,"abstain":true,"answer":"le 26 coûte cher"}', registry).kind).toBe(
      'invalid'
    )
  })

  it('rejects raw responses above 8 KB before parsing', () => {
    const padded = JSON.stringify({ schemaVersion: 1, actions: [{ type: 'focus', id: 'a' }] }).padEnd(
      MAX_RAW_PLAN_BYTES + 1,
      ' '
    )
    expect(parseModelResponse(padded, registry)).toEqual({ kind: 'invalid', errors: ['response exceeds 8 KB'] })
  })
})
