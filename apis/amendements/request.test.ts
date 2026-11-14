import { beforeEach, expect, it, vi } from 'vitest'
const { responses, calls, client } = vi.hoisted(() => {
  const responses: { data: unknown; error: null | { code: string; message: string }; status: number }[] = []
  const calls: [string, ...unknown[]][] = []
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'range', 'maybeSingle', 'retry'])
    chain[method] = (...args: unknown[]) => {
      calls.push([method, ...args])
      return chain
    }
  chain.then = (resolve: (r: unknown) => void) => Promise.resolve(responses.shift()).then(resolve)
  return {
    responses,
    calls,
    client: {
      from: (table: string) => {
        calls.push(['from', table])
        return chain
      }
    }
  }
})
vi.mock('@/services/supabase/client', () => ({ getSupabaseBrowserClient: () => client }))
import { getAmendementDetail, getAmendementsByTexte } from './request'
beforeEach(() => {
  responses.length = 0
  calls.length = 0
})
it('paginates summaries without downloading document bodies and retains supplied links', async () => {
  const row = {
    id: 'a',
    numero_long: 'CF1',
    article_id: 'ar',
    alinea_id: null,
    amendement_parent_id: null,
    division_avant_apres: 'A',
    rang: 1,
    sort: 'retire',
    document_uri: 'https://www.assemblee-nationale.fr/a'
  }
  responses.push(
    { data: Array.from({ length: 1000 }, (_, i) => ({ ...row, id: String(i) })), error: null, status: 200 },
    { data: [row], error: null, status: 200 }
  )
  const result = await getAmendementsByTexte('texte-a')
  expect(result).toHaveLength(1001)
  expect(result[1000]).toMatchObject({ numeroLong: 'CF1', sourceUrl: row.document_uri })
  expect(calls.filter((c) => c[0] === 'range')).toEqual([
    ['range', 0, 999],
    ['range', 1000, 1999]
  ])
  expect(calls.filter((c) => c[0] === 'select').every((c) => !String(c[1]).includes('dispositif'))).toBe(true)
})
it('restricts detail lookup to both the current text and requested amendment', async () => {
  responses.push({
    data: {
      id: 'a',
      texte_id: 't',
      uid: 'u',
      numero_long: 'CF1',
      dispositif: '<p>Texte</p>',
      expose_sommaire: null,
      signataires_affichable: null,
      sort: 'retire',
      document_uri: 'javascript:alert(1)'
    },
    error: null,
    status: 200
  })
  expect(await getAmendementDetail('t', 'a')).toMatchObject({
    id: 'a',
    texteId: 't',
    dispositif: '<p>Texte</p>',
    sourceUrl: null
  })
  expect(calls).toContainEqual(['eq', 'texte_id', 't'])
  expect(calls).toContainEqual(['eq', 'id', 'a'])
})
it('reports missing records and database errors instead of fabricated documents', async () => {
  responses.push({ data: null, error: null, status: 200 })
  await expect(getAmendementDetail('t', 'missing')).rejects.toMatchObject({ status: 404, code: 'AMENDEMENT_NOT_FOUND' })
  responses.push({ data: null, error: { code: '42501', message: 'denied' }, status: 403 })
  await expect(getAmendementDetail('t', 'a')).rejects.toMatchObject({ status: 403, code: '42501' })
})
