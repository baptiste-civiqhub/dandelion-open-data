import type { RawExtractSummary, RawPage } from '@/apis/raw-texts/types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readText = (value: unknown): string | null => (typeof value === 'string' ? value : null)

const readCount = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

export const parseRawSummary = (input: unknown): RawExtractSummary | null => {
  if (!isRecord(input) || typeof input.texte_uid !== 'string' || input.texte_uid.length === 0) return null

  const counts = isRecord(input.counts) ? input.counts : {}

  return {
    texteUid: input.texte_uid,
    titre: readText(input.titre),
    dossierUid: readText(input.dossier_uid),
    counts: {
      documents: readCount(counts.documents),
      dossiers: readCount(counts.dossiers),
      actes: readCount(counts.actes),
      articles: readCount(counts.articles),
      amendements: readCount(counts.amendements)
    },
    sourceNom: readText(input.source_nom),
    sourceUrl: readText(input.source_url),
    licence: readText(input.licence),
    status: readText(input.status),
    finishedAt: readText(input.finished_at)
  }
}

export const parseRawPage = (input: unknown): RawPage => {
  if (!isRecord(input) || !Array.isArray(input.rows)) {
    return { rows: [], total: 0 }
  }

  return {
    rows: input.rows.filter(isRecord),
    total: readCount(input.total)
  }
}

export const projectRawPayload = <T extends Record<string, unknown>>(payload: T): T => payload
