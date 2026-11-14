export const RAW_JEUX = ['documents', 'dossiers', 'actes', 'articles_textes', 'amendements'] as const

export type RawJeu = (typeof RAW_JEUX)[number]

export type RawExtractCounts = {
  documents: number
  dossiers: number
  actes: number
  articles: number
  amendements: number
}

export type RawExtractSummary = {
  texteUid: string
  titre: string | null
  dossierUid: string | null
  counts: RawExtractCounts
  sourceNom: string | null
  sourceUrl: string | null
  licence: string | null
  status: string | null
  finishedAt: string | null
}

export type RawPage = {
  rows: Record<string, unknown>[]
  total: number
}

export const RAW_PAGE_SIZE = 100
