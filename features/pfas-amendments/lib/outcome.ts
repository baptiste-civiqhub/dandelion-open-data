export type PfasOutcomeKind =
  | 'adopted'
  | 'rejected'
  | 'withdrawn'
  | 'inadmissible'
  | 'fallen'
  | 'not-moved'
  | 'none'
  | 'other'

/** Classe le sort officiel sans rien inférer : un sort absent reste `none`, un libellé inconnu reste `other`. */
export function classifyOutcome(raw: string | null | undefined): PfasOutcomeKind {
  const value = (raw ?? '').trim()
  if (!value) return 'none'
  if (/^adopt/i.test(value)) return 'adopted'
  if (/^rejet/i.test(value)) return 'rejected'
  if (/^retir/i.test(value)) return 'withdrawn'
  if (/^irrecevable/i.test(value)) return 'inadmissible'
  if (/^tomb/i.test(value)) return 'fallen'
  if (/^non soutenu/i.test(value)) return 'not-moved'
  return 'other'
}
