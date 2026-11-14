import type { PfasEvidenceContext } from '@/apis/pfas-evidence/types'

/** Contexte SYNTHÉTIQUE réservé aux tests unitaires : aucune de ces valeurs n'est une donnée réelle. */
export function makeEvidenceContext(overrides: Partial<PfasEvidenceContext> = {}): PfasEvidenceContext {
  return {
    schemaVersion: 1,
    retrievedAtUtc: '2000-01-01T00:00:00Z',
    scope: 'Synthetic test scope',
    sources: [
      {
        id: 'src-test',
        title: 'Synthetic source',
        url: 'https://example.test/source',
        publisher: 'Test publisher',
        kind: 'official',
        retrievedAtUtc: '2000-01-01T00:00:00Z',
        publishedAt: null,
        licenceUrl: 'https://example.test/licence',
        note: 'Synthetic note'
      }
    ],
    documents: [
      {
        id: 'doc-b',
        title: 'Second doc',
        kind: 'Rapport',
        date: '2000-02-01',
        url: 'https://example.test/b',
        sourceId: 'src-test'
      },
      {
        id: 'doc-undated',
        title: 'Undated doc',
        kind: 'Dossier',
        date: null,
        url: 'https://example.test/u',
        sourceId: 'src-test'
      },
      {
        id: 'doc-a',
        title: 'First doc',
        kind: 'Texte',
        date: '2000-01-15',
        url: 'https://example.test/a',
        sourceId: 'src-test'
      }
    ],
    joins: [
      {
        id: 'join-1',
        fromId: 'amdt-1',
        toId: 'doc-a',
        relation: 'source-url-match',
        method: 'Exact URL equality',
        evidence: 'Same URL',
        sourceIds: ['src-test']
      }
    ],
    facts: [
      {
        id: 'fact-1',
        title: 'Synthetic fact',
        text: 'Fact text',
        sourceIds: ['src-test'],
        limitation: 'Synthetic limit'
      }
    ],
    hemicycle: {
      status: 'not-integrated',
      retrievedAtUtc: null,
      dataset: null,
      rows: 0,
      matchedRows: 0,
      sourceId: null,
      note: 'Not integrated in tests'
    },
    ...overrides
  }
}
