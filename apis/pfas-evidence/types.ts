export type EvidenceSource = {
  id: string
  title: string
  url: string
  publisher: string
  kind: 'official' | 'api'
  retrievedAtUtc: string
  publishedAt: string | null
  licenceUrl: string | null
  note: string
}

export type EvidenceDocument = {
  id: string
  title: string
  kind: string
  date: string | null
  url: string
  sourceId: string
}

export type EvidenceJoinRelation = 'official-reference' | 'source-url-match' | 'context'

export type EvidenceJoin = {
  id: string
  fromId: string
  toId: string
  relation: EvidenceJoinRelation
  method: string
  evidence: string
  sourceIds: string[]
}

export type EvidenceFact = {
  id: string
  title: string
  text: string
  sourceIds: string[]
  limitation: string
}

export type EvidenceHemicycle = {
  status: 'verified-snapshot' | 'not-integrated'
  retrievedAtUtc: string | null
  dataset: string | null
  rows: number
  matchedRows: number
  sourceId: string | null
  note: string
}

export type PfasEvidenceContext = {
  schemaVersion: 1
  retrievedAtUtc: string
  scope: string
  sources: EvidenceSource[]
  documents: EvidenceDocument[]
  joins: EvidenceJoin[]
  facts: EvidenceFact[]
  hemicycle: EvidenceHemicycle
}
