import type { PfasAmendment, PfasTargetPlacement } from '@/apis/pfas-amendments/types'

const LATIN_SUFFIXES = ['bis', 'ter', 'quater', 'quinquies', 'sexies', 'septies', 'octies', 'nonies', 'decies']
const POSITION_RANK = { before: -1, on: 0, after: 1 } as const

export type ArticleSortKey = [number, number]

/** « Article 1er » < « Article 1er bis » < « Article 1er ter » < « Article 2 » ; « Article 1er A » précède « Article 1er ». */
export function articleSortKey(label: string | null): ArticleSortKey | null {
  const match = label?.trim().match(/^Article (\d+)(?:er)?(?: (\S+))?$/i)
  if (!match) return null
  const major = Number(match[1])
  const suffix = match[2]
  if (!suffix) return [major, 0]
  const latin = LATIN_SUFFIXES.indexOf(suffix.toLowerCase())
  if (latin >= 0) return [major, latin + 2]
  if (/^[A-Z]$/.test(suffix)) return [major, suffix.charCodeAt(0) - 91]
  return null
}

export function comparePlacements(a: PfasTargetPlacement, b: PfasTargetPlacement): number {
  const keyA = articleSortKey(a.article)
  const keyB = articleSortKey(b.article)
  if (!keyA || !keyB) {
    if (keyA) return -1
    if (keyB) return 1
    return (a.article ?? '').localeCompare(b.article ?? '', 'fr')
  }
  return (
    keyA[0] - keyB[0] ||
    keyA[1] - keyB[1] ||
    POSITION_RANK[a.position ?? 'on'] - POSITION_RANK[b.position ?? 'on'] ||
    a.kind.localeCompare(b.kind)
  )
}

/** Numéro officiel croissant (« 18 rect. » trié comme 18), puis ordre de l'export : tri stable et déterministe. */
export function compareAmendments(a: PfasAmendment, b: PfasAmendment): number {
  return (
    Number(a.number) - Number(b.number) || a.numberLabel.localeCompare(b.numberLabel, 'fr') || a.rowIndex - b.rowIndex
  )
}
