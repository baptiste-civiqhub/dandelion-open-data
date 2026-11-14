import { expect, it } from 'vitest'
import type { AmendementSummary } from '@/apis/amendements/types'
import { buildObservedChanges } from './observed-changes'
const article = { id: 'ar', designation: 'Article 1', titre: null, ordre: 1 }
const row = (id: string, dateDepot: string | null, typeAuteur: string | null = 'Député'): AmendementSummary => ({
  id,
  numeroLong: id,
  articleId: 'ar',
  alineaId: null,
  parentId: null,
  divisionAvantApres: 'A',
  rang: 1,
  sort: 'retire',
  dateDepot,
  typeAuteur,
  sourceUrl: 'https://www.senat.fr/' + id
})
const context = { texteUid: 'T', asOf: '2026-11-14T16:00:00+01:00' }
it('counts dated deposits and Government without claiming a pre-examination cutoff', () => {
  const a = row('1', '2026-11-10', 'Gouvernement')
  const [signal] = buildObservedChanges(
    [article],
    [a, a, row('2', '2026-11-11'), row('3', null), row('4', '2026-11-15'), row('5', '2026-02-30')],
    context
  )
  expect(signal.kind).toBe('observed_change')
  expect(signal.observation).toMatchObject({
    rule: 'amendements_dates_dans_corpus',
    amendements_deposes: 2,
    dont_gouvernement: 1,
    date_debut_examen: null,
    dates_manquantes_ou_invalides: 2,
    dates_hors_perimetre: 1
  })
  expect(signal.source_urls).toHaveLength(2)
  expect(JSON.stringify(signal)).not.toMatch(/probability|forecast/)
})
it('uses strictly earlier dates only when examination date, source and stage scope are verified', () => {
  const examination = {
    startsOn: '2026-11-12',
    stage: 'Séance',
    sourceUrl: 'https://www.assemblee-nationale.fr/agenda',
    scopeVerified: true
  }
  const [signal] = buildObservedChanges(
    [article],
    [row('1', '2026-11-11'), row('2', '2026-11-12'), row('3', '2026-11-13')],
    { ...context, examination }
  )
  expect(signal.observation.rule).toBe('amendements_deposes_avant_examen')
  expect(signal.observation.amendements_deposes).toBe(1)
  const [unverified] = buildObservedChanges([article], [row('1', '2026-11-13')], {
    ...context,
    examination: { ...examination, scopeVerified: false }
  })
  expect(unverified.observation.rule).toBe('amendements_dates_dans_corpus')
})
it('does not confuse additional articles with amendments to the article itself', () => {
  const rows = [row('1', '2026-11-10'), { ...row('2', '2026-11-10'), divisionAvantApres: 'APRES' }]
  const signals = buildObservedChanges([article], rows, context)
  expect(signals.map((s) => [s.subject.placement, s.observation.amendements_deposes])).toEqual([
    ['A', 1],
    ['APRES', 1]
  ])
})
it('keeps zero and missing links explicit; outcome never changes the signal', () => {
  const rows = [{ ...row('1', '2026-11-10', null), sourceUrl: null }]
  const [signal] = buildObservedChanges([article], rows, context)
  expect(signal.observation.sources_manquantes).toBe(1)
  expect(signal.observation.auteurs_non_renseignes).toBe(1)
  expect(buildObservedChanges([article], [{ ...rows[0], sort: 'adopte' }], context)).toEqual([signal])
  expect(buildObservedChanges([article], [], context)[0].observation.amendements_deposes).toBe(0)
})
it('requires a valid observation timestamp', () => {
  expect(() => buildObservedChanges([article], [], { ...context, asOf: 'invalid' })).toThrow()
})
