import type { TextOverlap } from '@/apis/amendement-analysis/types'

const WORD = /[\p{L}\p{N}]+/gu
const MIN_WORD_LENGTH = 3

const normalize = (text: string) => text.normalize('NFC').toLowerCase()

/** Mots d'un texte en clair (minuscules), dans l'ordre. */
export function wordsOf(text: string): string[] {
  return normalize(text).match(WORD) ?? []
}

export function countWords(text: string | null | undefined): number {
  return text ? wordsOf(text).length : 0
}

const vocabulary = (text: string) => new Set(wordsOf(text).filter((word) => word.length >= MIN_WORD_LENGTH))

/**
 * Recouvrement lexical déterministe de deux textes en clair : mots distincts (3 lettres et plus) partagés ou propres
 * à chacun, et indice de Jaccard. Ne dit rien du sens ni de l'effet juridique. `null` si l'un des textes est vide.
 */
export function textOverlap(first: string | null | undefined, second: string | null | undefined): TextOverlap | null {
  if (!first?.trim() || !second?.trim()) return null
  const a = vocabulary(first)
  const b = vocabulary(second)
  let sharedWords = 0
  for (const word of a) if (b.has(word)) sharedWords += 1
  const union = a.size + b.size - sharedWords
  return {
    similarity: union === 0 ? 1 : sharedWords / union,
    sharedWords,
    onlyInFirst: a.size - sharedWords,
    onlyInSecond: b.size - sharedWords,
    isIdentical: wordsOf(first).join(' ') === wordsOf(second).join(' ')
  }
}
