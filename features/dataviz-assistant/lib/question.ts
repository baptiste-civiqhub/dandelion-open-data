import { MAX_QUESTION_LENGTH } from './plan'

/** Minuscules, sans accents, apostrophes/ponctuation normalisées en espaces. */
export function normalizeQuestion(question: string): string {
  return question
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Nombres isolés (« 1er » n'en est pas un), dans l'ordre, sans doublon. */
export function extractNumbers(normalized: string): string[] {
  const numbers = normalized.match(/\b\d+\b/g) ?? []
  return [...new Set(numbers.map((value) => value.replace(/^0+(?=\d)/, '')))]
}

export function isQuestionTooLong(question: string): boolean {
  return question.length > MAX_QUESTION_LENGTH
}
