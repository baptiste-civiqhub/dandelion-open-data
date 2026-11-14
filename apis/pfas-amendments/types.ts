export type PfasPlacementKind = 'article' | 'additional-article' | 'unknown'

/** `additional-article` insère un article nouveau avant/après `article` : ce n'est pas une modification de `article`. */
export type PfasTargetPlacement = {
  kind: PfasPlacementKind
  position: 'before' | 'after' | null
  article: string | null
}

export type PfasParentRelation = {
  parentNumber: string
  relation: string
  sourceUrl: string | null
  evidence: string
  method: string
  officialPageCheck: string | null
}

export type PfasAmendment = {
  id: string
  number: string
  numberLabel: string
  rectification: string | null
  nature: string
  subdivision: string
  subdivisionRaw: string
  targetPlacement: PfasTargetPlacement
  paragraph: string | null
  author: string | null
  onBehalfOf: string | null
  filedOn: string | null
  proposalText: string
  explanatoryText: string
  outcomeRaw: string | null
  outcomeRecordedAt: string | null
  sourceUrl: string | null
  sourceUrlRaw: string | null
  senatorUrl: string | null
  parentId: string | null
  parentRelation: PfasParentRelation | null
  rowIndex: number
}

export type PfasProvenance = {
  datasetUrl: string
  referencePageUrl: string
  referenceTextUrl: string
  licenceUrl: string
  publisher: string
  text: string
  retrievedAtUtc: string
  bytes: number
  sha256: string
  encoding: string
  format: string
  parserVersion: string
  importScript: string
}

export type PfasCounts = {
  rows: number
  bySubdivision: Record<string, number>
  byOutcome: Record<string, number>
  byNature: Record<string, number>
}

export type PfasSnapshot = {
  schemaVersion: number
  provenance: PfasProvenance
  counts: PfasCounts
  amendments: PfasAmendment[]
}
