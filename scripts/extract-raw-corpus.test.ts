import { describe, expect, it } from 'vitest'

import {
  advanceWindow,
  initialWindows,
  ACCOUNT_COUNT,
  keySlotsFromEnv,
  PAGE_SIZE,
  requestFiltres,
  reserveToken,
  ROTATE_AT,
  splitWindow,
  throughputPerMinute,
  workerCount
} from './extract-raw-corpus.mjs'

type Filtre = { colonne: string; op: string; valeur?: string | boolean }
type Window = { jeu: string; filtres: Filtre[]; decalage: number; lower: string | null; lowerOp: string }

describe('initialWindows', () => {
  it('covers the five jeux and only the 2026 amendment months', () => {
    const windows = initialWindows() as Window[]

    expect(new Set(windows.map((item) => item.jeu))).toEqual(
      new Set(['documents', 'dossiers', 'actes', 'articles_textes', 'amendements'])
    )
    expect(windows.filter((item) => item.jeu === 'documents')).toHaveLength(4)
    expect(windows.filter((item) => item.jeu === 'amendements')).toHaveLength(12)
    expect(windows.some((item) => item.filtres.some((filtre) => filtre.valeur === '2026-01-01'))).toBe(true)
    expect(windows.some((item) => item.filtres.some((filtre) => filtre.valeur === '2026-12-01'))).toBe(true)
    expect(windows.some((item) => item.filtres.some((filtre) => filtre.valeur === '2025-01-01'))).toBe(false)
    expect(windows.at(-1)?.filtres[0]).toMatchObject({ colonne: 'date_depot', op: 'gte', valeur: '2026-01-01' })
  })
})

describe('advanceWindow', () => {
  const current = { jeu: 'amendements', filtres: [], decalage: 0, lower: null, lowerOp: 'gt' }

  it('keeps reading a full page', () => {
    expect(advanceWindow(current, { fetched: PAGE_SIZE, key: 'A', ceiling: false })).toMatchObject({
      action: 'continue',
      window: { decalage: PAGE_SIZE }
    })
  })

  it('rotates before the offset gets deep', () => {
    const step = advanceWindow(
      { ...current, decalage: ROTATE_AT - PAGE_SIZE },
      { fetched: PAGE_SIZE, key: 'B', ceiling: false }
    )

    expect(step).toMatchObject({ action: 'rotate', window: { decalage: 0, lower: 'B', lowerOp: 'gt' } })
  })

  it('stops on a short page', () => {
    expect(advanceWindow(current, { fetched: 17, key: 'C', ceiling: false })).toEqual({ action: 'done' })
  })

  it('flushes the boundary article text before skipping it', () => {
    const step = advanceWindow(
      { ...current, jeu: 'articles_textes', decalage: ROTATE_AT - PAGE_SIZE },
      { fetched: PAGE_SIZE, key: 'PRJL1', ceiling: false }
    )

    expect(step).toMatchObject({ action: 'flush', texteUid: 'PRJL1', window: { lower: 'PRJL1' } })
  })
})

describe('requestFiltres', () => {
  it('adds the resume key', () => {
    expect(
      requestFiltres({
        jeu: 'actes',
        filtres: [{ colonne: 'uid', op: 'like', valeur: 'L17-' }],
        decalage: 0,
        lower: 'L17-A',
        lowerOp: 'gt'
      })
    ).toEqual([
      { colonne: 'uid', op: 'like', valeur: 'L17-' },
      { colonne: 'uid', op: 'gt', valeur: 'L17-A' }
    ])
  })
})

describe('splitWindow', () => {
  it('cuts a year in half and refuses a single day', () => {
    const year = {
      jeu: 'amendements',
      filtres: [
        { colonne: 'date_depot', op: 'gte', valeur: '2025-01-01' },
        { colonne: 'date_depot', op: 'lt', valeur: '2026-01-01' }
      ],
      decalage: 400,
      lower: 'X',
      lowerOp: 'gt'
    }

    const halves = splitWindow(year) as Window[] | null
    expect(halves).toHaveLength(2)
    expect(halves?.[0].decalage).toBe(0)
    expect(halves?.[0].lower).toBeNull()
    expect(halves?.[1].filtres.find((filtre) => filtre.op === 'gte')?.valeur).toBe(
      halves?.[0].filtres.find((filtre) => filtre.op === 'lt')?.valeur
    )
    expect(
      splitWindow({
        ...year,
        filtres: [
          { colonne: 'date_depot', op: 'gte', valeur: '2025-10-01' },
          { colonne: 'date_depot', op: 'lt', valeur: '2025-10-02' }
        ]
      })
    ).toBeNull()
  })
})

describe('parallelAccounts', () => {
  it('runs several requests on each of the four accounts', () => {
    expect(workerCount(ACCOUNT_COUNT)).toBe(24)
    expect(throughputPerMinute(ACCOUNT_COUNT)).toBe(960)
    expect(workerCount(ACCOUNT_COUNT)).toBeGreaterThan(ACCOUNT_COUNT)
  })

  it('reads the four account keys and ignores a fifth', () => {
    expect(
      keySlotsFromEnv({
        HEMICYCLE_API_KEY_1: 'a',
        HEMICYCLE_API_KEY_2: 'b',
        HEMICYCLE_API_KEY_3: 'c',
        HEMICYCLE_API_KEY_4: 'd',
        HEMICYCLE_API_KEY_5: 'e'
      })
    ).toEqual([1, 2, 3, 4])
    expect(keySlotsFromEnv({ HEMICYCLE_API_KEY: 'a' })).toEqual([])
    expect(keySlotsFromEnv({ HEMICYCLE_API_KEY_1: 'a', HEMICYCLE_API_KEY_2: 'b' })).toEqual([1, 2])
  })

  it('does not hand out two tokens for one remaining credit of rate', () => {
    const bucket = { capacity: 1, tokens: 1, updated: 0 }
    const first = reserveToken(bucket, 0)
    const second = reserveToken(first.bucket, 0)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
  })
})
