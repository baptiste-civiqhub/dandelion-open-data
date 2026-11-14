import { describe, expect, it } from 'vitest'

import { classifyIntention } from './classify-intention'

describe('classifyIntention', () => {
  it('returns autre for an empty string', () => {
    expect(classifyIntention('')).toBe('autre')
  })

  it('returns autre for an unknown formula', () => {
    expect(classifyIntention('Observation generale du dispositif.')).toBe('autre')
  })

  it('returns supprimer for "Supprimer cet article"', () => {
    expect(classifyIntention('Supprimer cet article.')).toBe('supprimer')
  })

  it('returns reecrire for "Rédiger ainsi"', () => {
    expect(classifyIntention('Rédiger ainsi cet article :')).toBe('reecrire')
  })

  it('returns ajouter for "Compléter"', () => {
    expect(classifyIntention("Compléter cet article par l'alinéa suivant :")).toBe('ajouter')
  })

  it('returns ajouter for "Après l\'alinéa"', () => {
    expect(classifyIntention("Après l'alinéa 2, ajouter une phrase.")).toBe('ajouter')
  })

  it('returns ajouter for "Insérer"', () => {
    expect(classifyIntention("Insérer l'alinéa suivant :")).toBe('ajouter')
  })

  it('returns modifier for "Substituer"', () => {
    expect(classifyIntention('Substituer aux alinéas 1 et 2 les deux alinéas suivants :')).toBe('modifier')
  })

  it('returns modifier for "Remplacer"', () => {
    expect(classifyIntention('Remplacer le mot « taxe » par le mot « contribution ».')).toBe('modifier')
  })
})
