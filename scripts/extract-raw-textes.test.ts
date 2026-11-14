import { describe, expect, it } from 'vitest'

import { PAGE_SIZE } from './extract-raw-corpus.mjs'
import {
  AMENDMENT_YEAR_FLOOR,
  TARGET_YEAR,
  articleFiltres,
  isAmendmentWindowReady,
  isArticlePageClosed,
  isCorpusSettled,
  noticeCandidates,
  pendingTexteUids,
  queueHasYear
} from './extract-raw-textes.mjs'

describe('isAmendmentWindowReady', () => {
  it('accepts a full 2026 count', () => {
    expect(isAmendmentWindowReady({ [TARGET_YEAR]: AMENDMENT_YEAR_FLOOR })).toBe(true)
  })

  it('rejects a pilot-sized year and a missing year', () => {
    expect(isAmendmentWindowReady({ [TARGET_YEAR]: AMENDMENT_YEAR_FLOOR - 1 })).toBe(false)
    expect(isAmendmentWindowReady({})).toBe(false)
    expect(isAmendmentWindowReady({ '2025': 50000 })).toBe(false)
  })

  it('reads a numeric string from jsonb', () => {
    expect(isAmendmentWindowReady({ [TARGET_YEAR]: String(AMENDMENT_YEAR_FLOOR) })).toBe(true)
  })
})

describe('queueHasYear', () => {
  it('sees a 2026 deposit window and ignores 2025', () => {
    const queue = [
      { filtres: [{ colonne: 'date_depot', op: 'gte', valeur: '2025-11-01' }] },
      { filtres: [{ colonne: 'date_depot', op: 'gte', valeur: '2026-03-01' }] }
    ]

    expect(queueHasYear(queue, '2026')).toBe(true)
    expect(queueHasYear(queue, '2024')).toBe(false)
    expect(queueHasYear([], '2026')).toBe(false)
  })
})

describe('isCorpusSettled', () => {
  it('requires a finished corpus with no 2026 window left', () => {
    expect(isCorpusSettled({ status: 'done', state: { queue: [] } })).toBe(true)
    expect(
      isCorpusSettled({
        status: 'done',
        state: { queue: [{ filtres: [{ colonne: 'date_depot', op: 'gte', valeur: '2026-01-04' }] }] }
      })
    ).toBe(false)
    expect(isCorpusSettled({ status: 'running', state: { queue: [] } })).toBe(false)
  })
})

describe('articleFiltres', () => {
  it('asks one text by equality', () => {
    expect(articleFiltres('PRJLANR5L17B3434')).toEqual([
      { colonne: 'texte_uid', op: 'eq', valeur: 'PRJLANR5L17B3434' }
    ])
  })
})

describe('isArticlePageClosed', () => {
  it('closes on a short page, including an empty text', () => {
    expect(isArticlePageClosed(0)).toBe(true)
    expect(isArticlePageClosed(PAGE_SIZE - 1)).toBe(true)
    expect(isArticlePageClosed(PAGE_SIZE)).toBe(false)
  })
})

describe('noticeCandidates', () => {
  it('reads the bill number stored in the amendment uid', () => {
    expect(noticeCandidates('AMANR5L14SEA644420B1552P0D1N222')).toEqual([
      'PRJLANR5L14B1552',
      'PIONANR5L14B1552',
      'PNREANR5L14B1552'
    ])
    expect(noticeCandidates('AMANR5L15PO419610B0627P0D1N000487')[0]).toBe('PRJLANR5L15B0627')
  })

  it('returns nothing when the uid has no bill number', () => {
    expect(noticeCandidates('AMANR5L17SEAXYZ')).toEqual([])
    expect(noticeCandidates('')).toEqual([])
  })
})

describe('pendingTexteUids', () => {
  it('skips texts already closed', () => {
    expect(pendingTexteUids(['A', 'B', 'C'], ['B'])).toEqual(['A', 'C'])
    expect(pendingTexteUids([], ['B'])).toEqual([])
  })
})
