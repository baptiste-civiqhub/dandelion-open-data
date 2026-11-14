import { describe, expect, it } from 'vitest'

import { createRegistry, validatePlan } from '@/features/dataviz-assistant/lib/plan'

import { interpretPfasQuestion } from './assistant-guide'
import { makeAmendment } from './test-fixtures'

const parentRelation = {
  parentNumber: '14',
  relation: 'sub-amendment',
  sourceUrl: null,
  evidence: 'Amendement n° 14',
  method: 'export',
  officialPageCheck: null
}
const corpus = () => [
  makeAmendment({ number: '2', numberLabel: '2 rect.' }),
  makeAmendment({ number: '14' }),
  makeAmendment({ number: '26', outcomeRaw: 'Retiré' }),
  makeAmendment({ number: '27', outcomeRaw: 'Retiré' }),
  makeAmendment({ number: '28', outcomeRaw: 'Retiré' }),
  makeAmendment({ number: '32', nature: 'S/Amt', parentId: 'amdt-14', parentRelation })
]

describe('interpretPfasQuestion', () => {
  it('compares two amendments by exact number, first one focused', () => {
    const result = interpretPfasQuestion('Compare les amendements 26 et 27', corpus())
    expect(result).toMatchObject({
      status: 'plan',
      intent: 'compare',
      plan: { schemaVersion: 1, actions: [{ type: 'compare', ids: ['amdt-26', 'amdt-27'] }] }
    })
  })

  it('accepts missing accents, typographic apostrophes and punctuation', () => {
    const amendments = corpus()
    expect(interpretPfasQuestion('Montre l’amendement 32 !', amendments)).toMatchObject({
      intent: 'focus',
      plan: { actions: [{ type: 'focus', id: 'amdt-32' }] }
    })
    expect(interpretPfasQuestion("COMPARE l'amendement n°26 avec le n° 27...", amendments)).toMatchObject({
      intent: 'compare'
    })
    expect(interpretPfasQuestion('Quelles différences entre 26 et 27 ?', amendments)).toMatchObject({
      intent: 'compare'
    })
  })

  it('never resolves 2 to 26 (exact number only)', () => {
    const amendments = corpus().filter((a) => a.number !== '2')
    expect(interpretPfasQuestion('Montre l’amendement 2', amendments)).toEqual({
      status: 'abstain',
      reason: 'missing',
      numbers: ['2']
    })
    expect(interpretPfasQuestion('Montre l’amendement 2', corpus())).toMatchObject({
      plan: { actions: [{ type: 'focus', id: 'amdt-2' }] }
    })
  })

  it('reports absent and ambiguous numbers instead of picking a record', () => {
    expect(interpretPfasQuestion('Compare les amendements 26 et 99', corpus())).toEqual({
      status: 'abstain',
      reason: 'missing',
      numbers: ['99']
    })
    const duplicated = [...corpus(), makeAmendment({ number: '27', id: 'amdt-27-bis' })]
    expect(interpretPfasQuestion('Compare 26 et 27', duplicated)).toEqual({
      status: 'abstain',
      reason: 'ambiguous',
      numbers: ['27']
    })
  })

  it('asks for clarification with more than two or fewer than two numbers', () => {
    expect(interpretPfasQuestion('Compare 26, 27 et 28', corpus())).toEqual({
      status: 'abstain',
      reason: 'too-many',
      numbers: ['26', '27', '28']
    })
    expect(interpretPfasQuestion('Compare 26 et 26', corpus())).toMatchObject({ reason: 'too-few' })
    expect(interpretPfasQuestion('Montre les amendements 26 et 27', corpus())).toMatchObject({ reason: 'too-many' })
  })

  it('selects child and verified parent for a parent question', () => {
    expect(interpretPfasQuestion('Quel est le parent du sous-amendement 32 ?', corpus())).toMatchObject({
      status: 'plan',
      intent: 'parent',
      plan: { actions: [{ type: 'compare', ids: ['amdt-32', 'amdt-14'] }] }
    })
  })

  it('refuses a contradictory or absent parent relation', () => {
    const contradictory = corpus().map((a) =>
      a.number === '32' ? { ...a, parentRelation: { ...parentRelation, parentNumber: '26' } } : a
    )
    expect(interpretPfasQuestion('Quel est le parent du 32 ?', contradictory)).toMatchObject({
      reason: 'parent-mismatch'
    })
    const dangling = corpus().map((a) => (a.number === '32' ? { ...a, parentId: 'amdt-404' } : a))
    expect(interpretPfasQuestion('Quel est le parent du 32 ?', dangling)).toMatchObject({ reason: 'parent-mismatch' })
    expect(interpretPfasQuestion('Quel est le parent du 26 ?', corpus())).toMatchObject({ reason: 'no-parent' })
  })

  it('opens the evidence trail for a sources question', () => {
    expect(interpretPfasQuestion('Affiche les sources et le parcours de la loi', corpus())).toMatchObject({
      intent: 'evidence',
      plan: { actions: [{ type: 'show-evidence' }] }
    })
  })

  it('abstains on economic effects, current law and unknown questions', () => {
    for (const question of [
      'Quel est l’effet économique de l’amendement 26 ?',
      'Que dit le droit en vigueur aujourd’hui sur les PFAS ?',
      'Compare les coûts des amendements 26 et 27'
    ]) {
      expect(interpretPfasQuestion(question, corpus())).toMatchObject({ status: 'abstain', reason: 'out-of-scope' })
    }
    expect(interpretPfasQuestion('Bonjour, raconte une blague', corpus())).toMatchObject({ reason: 'unsupported' })
    expect(interpretPfasQuestion('   ', corpus())).toMatchObject({ reason: 'empty' })
    expect(interpretPfasQuestion('a'.repeat(601), corpus())).toMatchObject({ reason: 'too-long' })
  })

  it('only produces plans that pass the strict core validator', () => {
    const amendments = corpus()
    const registry = createRegistry(amendments.map((a) => a.id))
    for (const question of ['Compare 26 et 27', 'Montre le 32', 'Parent du 32', 'Affiche les sources']) {
      const result = interpretPfasQuestion(question, amendments)
      if (result.status !== 'plan') throw new Error(question)
      expect(validatePlan(result.plan, registry).ok).toBe(true)
    }
  })
})
