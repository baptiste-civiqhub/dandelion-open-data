import { isNormalizedApiError } from '@/types/api-error'

/** Message à afficher dans un toast d'erreur : le détail renvoyé par la source, sinon le repli traduit. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isNormalizedApiError(error) && error.detail) return error.detail
  if (error instanceof Error && error.message) return error.message
  return fallback
}
