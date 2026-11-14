import { expect, it } from 'vitest'
import type { TexteSnapshot } from '@/apis/texte/types'
import { buildTree } from './build-tree'
const snapshot: TexteSnapshot = {
  id: 'law',
  titre: 'Test',
  sourceNom: 'Test',
  sourceUrl: '',
  licence: 'Test',
  amendments: [
    {
      id: 'a',
      numero: 'CF1',
      article: 'Article 1',
      dispositif: '',
      expose: null,
      parentId: null,
      discussionCommune: null,
      discussionIdentique: null,
      authorLabel: null,
      groupLabel: null,
      sort: 'Retiré'
    },
    {
      id: 'b',
      numero: 'CF2',
      article: 'Article 1',
      dispositif: '',
      expose: null,
      parentId: 'a',
      discussionCommune: null,
      discussionIdentique: null,
      authorLabel: null,
      groupLabel: null,
      sort: 'Retiré'
    }
  ]
}
it('keeps the official parent hierarchy without inventing operations from unloaded text', () => {
  const root = buildTree(snapshot, { groupOperations: false })
  expect(root.children[0].children[0].kind).toBe('amendement')
  expect(root.children[0].children[0].children[0].amendmentId).toBe('b')
  expect(root.weight).toBe(2)
})
it('does not move branches when full texts are loaded', () => {
  const loaded = {
    ...snapshot,
    amendments: snapshot.amendments.map((a) => ({ ...a, dispositif: 'Supprimer cet article.' }))
  }
  expect(buildTree(loaded, { groupOperations: false })).toEqual(buildTree(snapshot, { groupOperations: false }))
})
