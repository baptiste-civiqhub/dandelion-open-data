import type { PfasAmendment } from '@/apis/pfas-amendments/types'

export type EvidencePresetKey = 'wording' | 'parent'

export type EvidencePresetResult =
  | {
      status: 'available'
      key: EvidencePresetKey
      selectedIds: string[]
      focusedId: string
      amendments: PfasAmendment[]
    }
  | {
      status: 'unavailable'
      key: EvidencePresetKey
      reason: 'missing' | 'ambiguous' | 'parent-mismatch'
      numbers: string[]
    }

const PRESETS: Record<EvidencePresetKey, { numbers: string[]; focus: string; childOf?: [string, string] }> = {
  wording: { numbers: ['26', '27'], focus: '26' },
  parent: { numbers: ['32', '14'], focus: '32', childOf: ['32', '14'] }
}

/** Résout une question guidée par numéro exact (jamais par sous-chaîne) et vérifie la relation de parenté sourcée. */
export function resolveEvidencePreset(amendments: PfasAmendment[], key: EvidencePresetKey): EvidencePresetResult {
  const preset = PRESETS[key]
  const found = new Map<string, PfasAmendment>()
  for (const number of preset.numbers) {
    const matches = amendments.filter((amendment) => amendment.number === number)
    if (matches.length === 0) return { status: 'unavailable', key, reason: 'missing', numbers: [number] }
    if (matches.length > 1) return { status: 'unavailable', key, reason: 'ambiguous', numbers: [number] }
    found.set(number, matches[0])
  }
  if (preset.childOf) {
    const [childNumber, parentNumber] = preset.childOf
    const child = found.get(childNumber)
    const parent = found.get(parentNumber)
    if (!child || !parent || child.parentId !== parent.id || child.parentRelation?.parentNumber !== parent.number) {
      return { status: 'unavailable', key, reason: 'parent-mismatch', numbers: [childNumber, parentNumber] }
    }
  }
  const ordered = preset.numbers.map((number) => found.get(number) as PfasAmendment)
  return {
    status: 'available',
    key,
    selectedIds: ordered.map((amendment) => amendment.id),
    focusedId: (found.get(preset.focus) as PfasAmendment).id,
    amendments: ordered
  }
}
