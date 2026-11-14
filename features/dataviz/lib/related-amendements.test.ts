import { describe, expect, it } from 'vitest'

import type { AmendementSummary } from '@/apis/amendements/types'

import { findAmendementByNumero, findRelatedAmendements } from './related-amendements'

const amendement = (id: string, patch: Partial<AmendementSummary> = {}): AmendementSummary => ({
  id,
  numeroLong: id,
  articleId: 'article-1',
  alineaId: null,
  parentId: null,
  divisionAvantApres: 'A',
  rang: null,
  sort: 'rejete',
  groupePolitiqueRef: null,
  discussionCommune: null,
  discussionIdentique: null,
  tagListId: `tags-${id}`,
  ...patch
})

describe('findRelatedAmendements', () => {
  const target = amendement('12', { parentId: '1', discussionCommune: 'dc-1', discussionIdentique: 'di-1', rang: 5 })
  const all = [
    amendement('1', { rang: 1 }),
    target,
    amendement('13', { discussionCommune: 'dc-1', discussionIdentique: 'di-1', rang: 6 }),
    amendement('45', { parentId: '12', rang: 9 }),
    amendement('20', { discussionCommune: 'dc-1', rang: 8 }),
    amendement('19', { discussionCommune: 'dc-1', rang: 7 }),
    amendement('99', { discussionCommune: 'dc-2' })
  ]

  it('lists parent, identical, sub-amendments then joint discussion, each once', () => {
    expect(findRelatedAmendements(target, all).map(({ amendement, relation }) => [amendement.id, relation])).toEqual([
      ['1', 'parent'],
      ['13', 'identical'],
      ['45', 'subAmendement'],
      ['19', 'jointDiscussion'],
      ['20', 'jointDiscussion']
    ])
  })

  it('never relates an amendment to itself nor through empty keys', () => {
    const lonely = amendement('7')
    expect(findRelatedAmendements(lonely, [lonely, amendement('8')])).toEqual([])
  })

  it('caps the list', () => {
    expect(findRelatedAmendements(target, all, 2)).toHaveLength(2)
  })
})

describe('findAmendementByNumero', () => {
  const all = [amendement('a', { numeroLong: 'I-CF123' }), amendement('b', { numeroLong: '45' })]

  it('matches the displayed number, ignoring case and spaces', () => {
    expect(findAmendementByNumero(all, ' i-cf 123 ')?.id).toBe('a')
    expect(findAmendementByNumero(all, '45')?.id).toBe('b')
  })

  it('never matches a prefix or an empty query', () => {
    expect(findAmendementByNumero(all, '4')).toBeNull()
    expect(findAmendementByNumero(all, '  ')).toBeNull()
  })
})
