import { describe, expect, it } from 'vitest'

import { parseRawPage, parseRawSummary, projectRawPayload } from './raw-envelope'

describe('parseRawSummary', () => {
  it('reads the envelope and leaves the legislative fields for later', () => {
    expect(
      parseRawSummary({
        texte_uid: 'PRJLANR5L17B3434',
        titre: 'projet de loi de finances de fin de gestion pour 2026',
        dossier_uid: 'DLR5L17N55223',
        counts: { documents: 1, dossiers: 1, actes: 15, articles: 10, amendements: 201 },
        source_nom: 'Assemblée nationale',
        source_url: 'https://data.assemblee-nationale.fr',
        licence: 'Licence Ouverte (Etalab)',
        status: 'done',
        finished_at: '2026-11-14T12:00:00.000Z'
      })
    ).toEqual({
      texteUid: 'PRJLANR5L17B3434',
      titre: 'projet de loi de finances de fin de gestion pour 2026',
      dossierUid: 'DLR5L17N55223',
      counts: { documents: 1, dossiers: 1, actes: 15, articles: 10, amendements: 201 },
      sourceNom: 'Assemblée nationale',
      sourceUrl: 'https://data.assemblee-nationale.fr',
      licence: 'Licence Ouverte (Etalab)',
      status: 'done',
      finishedAt: '2026-11-14T12:00:00.000Z'
    })
  })

  it('returns null when the text id is missing', () => {
    expect(parseRawSummary(null)).toBeNull()
    expect(parseRawSummary({ titre: 'sans uid' })).toBeNull()
  })

  it('treats a missing count block as zeros', () => {
    expect(parseRawSummary({ texte_uid: 'X' })?.counts).toEqual({
      documents: 0,
      dossiers: 0,
      actes: 0,
      articles: 0,
      amendements: 0
    })
  })
})

describe('parseRawPage', () => {
  it('keeps each source row intact', () => {
    const row = { uid: 'A', dispositif: 'supprimer l’article 1', expose_sommaire: null }

    expect(parseRawPage({ rows: [row, 'ignore'], total: 3 })).toEqual({
      rows: [row],
      total: 3
    })
  })

  it('returns an empty page for a malformed payload', () => {
    expect(parseRawPage({ rows: 'non' })).toEqual({ rows: [], total: 0 })
  })
})

describe('projectRawPayload', () => {
  it('returns the raw row unchanged', () => {
    const payload = { uid: 'A', article_designation_courte: 'ART. 1', extra: 1 }

    expect(projectRawPayload(payload)).toBe(payload)
  })
})
