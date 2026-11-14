import { describe, expect, it } from 'vitest'

import type { Article } from '@/apis/articles/types'

import { buildSunburstTree, nodeId, ROOT_ID } from './sunburst-tree'
import { DEFAULT_VIEW, normalizeView, parseView, writeView } from './view-url'

const labels = {
  texte: 'T',
  whole: 'W',
  other: 'O',
  alinea: (n: number) => `Al ${n}`,
  additional: (d: string) => d
}
const articles: Article[] = [{ id: 'a1', designation: 'ART. 1', titre: null, ordre: 1, alineas: [] }]
const tree = buildSunburstTree(
  articles,
  [
    {
      id: 'm1',
      numeroLong: '1',
      articleId: 'a1',
      alineaId: null,
      parentId: null,
      divisionAvantApres: 'A',
      rang: 1,
      sort: 'adopte',
      groupePolitiqueRef: null,
      discussionCommune: null,
      discussionIdentique: null,
      tagListId: 'tl'
    }
  ],
  labels
)

describe('view url', () => {
  it('round-trips the pinned view and omits defaults', () => {
    const view = { focusId: nodeId.article('a1'), selectionId: 'am.m1', excludedSorts: ['rejete', 'retire'], depth: 4 }
    const params = writeView(new URLSearchParams('texte=T1'), view)
    expect(params.get('texte')).toBe('T1')
    expect(parseView(params)).toEqual(view)
    expect(writeView(new URLSearchParams(), DEFAULT_VIEW).toString()).toBe('')
  })

  it('falls back to defaults on invalid values', () => {
    expect(parseView(new URLSearchParams('depth=9'))).toEqual(DEFAULT_VIEW)
  })

  it('resets an unknown or non-container focus and drops a selection outside the focus', () => {
    expect(normalizeView({ ...DEFAULT_VIEW, focusId: 'am.m1' }, tree).focusId).toBe(ROOT_ID)
    expect(normalizeView({ ...DEFAULT_VIEW, focusId: 'nope' }, tree).focusId).toBe(ROOT_ID)
    expect(normalizeView({ ...DEFAULT_VIEW, selectionId: 'am.m1' }, tree).selectionId).toBe('am.m1')
    expect(normalizeView({ ...DEFAULT_VIEW, selectionId: 'am.zz' }, tree).selectionId).toBeNull()
  })
})
