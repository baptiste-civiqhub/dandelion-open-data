/**
 * Erreur normalisée rejetée par toute la couche données (axios comme Supabase).
 * Les consommateurs branchent sur `status` / `code`, jamais sur un message lisible.
 */
export interface NormalizedApiError {
  status: number
  code: string
  detail?: string
  raw: unknown
}

export function isNormalizedApiError(value: unknown): value is NormalizedApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as NormalizedApiError).status === 'number' &&
    typeof (value as NormalizedApiError).code === 'string'
  )
}
