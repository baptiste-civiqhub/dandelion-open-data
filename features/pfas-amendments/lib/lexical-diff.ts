export type DiffStatus = 'shared' | 'unique'

export type DiffToken = { text: string; start: number; end: number; status: DiffStatus }

export type LexicalDiff = {
  a: DiffToken[]
  b: DiffToken[]
  onlyInA: number
  onlyInB: number
  shared: number
}

export type DiffOptions = {
  /** Assimile apostrophes typographiques, traits d'union insécables et points de suspension. Désactivé par défaut. */
  ignoreTypography?: boolean
  maxCells?: number
}

// Mots (lettres/chiffres, apostrophes et traits d'union internes), suites de points, ou un signe isolé.
const TOKEN = /[\p{L}\p{N}]+(?:['’ʼ\u2010\u2011-][\p{L}\p{N}]+)*|[.…]+|[^\s\p{L}\p{N}]/gu

export function tokenize(text: string): Omit<DiffToken, 'status'>[] {
  return [...text.matchAll(TOKEN)].map((match) => ({
    text: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length
  }))
}

function comparisonKey(token: string, ignoreTypography: boolean): string {
  if (!ignoreTypography) return token
  if (/^(?:…|\.{2,})/.test(token)) return '…'
  return token.replace(/[’ʼ]/g, "'").replace(/[\u2010\u2011]/g, '-')
}

/**
 * Différence lexicale déterministe (plus longue sous-séquence commune sur les jetons, sensible à la casse).
 * Ponctuation, négations, montants et dates restent des jetons : « 2026 » ≠ « 2030 », « non » compte.
 * Ne dit rien de l'effet juridique. Renvoie null si les textes dépassent `maxCells`.
 */
export function diffTexts(textA: string, textB: string, options: DiffOptions = {}): LexicalDiff | null {
  const ignore = options.ignoreTypography ?? false
  const tokensA = tokenize(textA)
  const tokensB = tokenize(textB)
  const n = tokensA.length
  const m = tokensB.length
  if ((n + 1) * (m + 1) > (options.maxCells ?? 4_000_000)) return null

  const keysA = tokensA.map((t) => comparisonKey(t.text, ignore))
  const keysB = tokensB.map((t) => comparisonKey(t.text, ignore))
  const width = m + 1
  const table = new Uint32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        keysA[i] === keysB[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }

  const statusA: DiffStatus[] = new Array(n).fill('unique')
  const statusB: DiffStatus[] = new Array(m).fill('unique')
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (keysA[i] === keysB[j]) {
      statusA[i++] = 'shared'
      statusB[j++] = 'shared'
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++
    else j++
  }

  const a = tokensA.map((t, k) => ({ ...t, status: statusA[k] }))
  const b = tokensB.map((t, k) => ({ ...t, status: statusB[k] }))
  const onlyInA = statusA.filter((s) => s === 'unique').length
  return { a, b, onlyInA, onlyInB: statusB.filter((s) => s === 'unique').length, shared: n - onlyInA }
}

export type TextSegment = { text: string; unique: boolean }

/** Découpe le texte original (espaces et paragraphes conservés) en segments communs / propres. */
export function toSegments(text: string, tokens: DiffToken[]): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0
  const push = (value: string, unique: boolean) => {
    if (!value) return
    const last = segments[segments.length - 1]
    if (last && last.unique === unique) last.text += value
    else segments.push({ text: value, unique })
  }
  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k]
    const gap = text.slice(cursor, token.start)
    const joinsUnique = token.status === 'unique' && tokens[k - 1]?.status === 'unique' && !gap.includes('\n')
    push(gap, joinsUnique)
    push(token.text, token.status === 'unique')
    cursor = token.end
  }
  push(text.slice(cursor), false)
  return segments
}

/** Passages propres à un texte, dans l'ordre (pour la note exportée). */
export function uniquePassages(text: string, tokens: DiffToken[]): string[] {
  return toSegments(text, tokens)
    .filter((s) => s.unique)
    .map((s) => s.text.trim())
    .filter(Boolean)
}
