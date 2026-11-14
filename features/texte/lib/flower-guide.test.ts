import { describe, expect, it } from 'vitest'

import type { Amendment } from '@/apis/texte/types'

import { interpretFlowerQuestion, interpretViewCommand, numeroTokens } from './flower-guide'

const make = (id: string, numero: string): Amendment => ({
  id,
  numero,
  article: 'Article 1er',
  dispositif: '',
  expose: null,
  parentId: null,
  discussionCommune: null,
  discussionIdentique: null,
  authorLabel: null,
  groupLabel: null,
  sort: null
})

const amendments = [
  make('x36', 'CL36'),
  make('x37', 'CL37'),
  make('x2', '2'),
  make('x26', '26'),
  make('d1', 'CL9'),
  make('d2', 'CL9')
]

describe('interpretFlowerQuestion', () => {
  it('focuses an exact numero, accents and case ignored', () => {
    const result = interpretFlowerQuestion('Montre l’amendement cl36', amendments)
    expect(result).toMatchObject({ status: 'plan', intent: 'focus', amendmentIds: ['x36'] })
  })

  it('compares exactly two numeros', () => {
    const result = interpretFlowerQuestion('Compare CL36 et CL37 ?', amendments)
    expect(result).toMatchObject({ status: 'plan', plan: { actions: [{ type: 'compare', ids: ['x36', 'x37'] }] } })
  })

  it('never matches 2 with 26 nor 36 with CL36', () => {
    expect(interpretFlowerQuestion('Montre le 2', amendments)).toMatchObject({ amendmentIds: ['x2'] })
    expect(interpretFlowerQuestion('Montre le 36', amendments)).toMatchObject({ status: 'abstain', reason: 'missing' })
  })

  it('abstains on ambiguous, too many, too few, out of scope and unsupported questions', () => {
    expect(interpretFlowerQuestion('Montre CL9', amendments)).toMatchObject({ reason: 'ambiguous' })
    expect(interpretFlowerQuestion('Compare CL36, CL37 et 2', amendments)).toMatchObject({ reason: 'too-many' })
    expect(interpretFlowerQuestion('Compare CL36', amendments)).toMatchObject({ reason: 'too-few' })
    expect(interpretFlowerQuestion('Quel est l’effet économique de CL36 ?', amendments)).toMatchObject({
      reason: 'out-of-scope'
    })
    expect(interpretFlowerQuestion('Bonjour', amendments)).toMatchObject({ reason: 'unsupported' })
    expect(interpretFlowerQuestion('x'.repeat(601), amendments)).toMatchObject({ reason: 'too-long' })
  })
})

describe('interpretViewCommand', () => {
  it('maps view commands to bounded actions and ignores questions with numbers', () => {
    expect(interpretViewCommand('Vue globale')).toMatchObject({ plan: { actions: [{ type: 'reset-view' }] } })
    expect(interpretViewCommand('Zoome')).toMatchObject({ plan: { actions: [{ type: 'zoom', direction: 'in' }] } })
    expect(interpretViewCommand('Dézoome')).toMatchObject({ plan: { actions: [{ type: 'zoom', direction: 'out' }] } })
    expect(interpretViewCommand('Zoome sur 26')).toBeNull()
    expect(numeroTokens('article 1er et cl036')).toEqual(['cl36'])
  })
})
