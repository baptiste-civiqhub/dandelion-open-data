import type { PostgrestError } from '@supabase/supabase-js'

import type { NormalizedApiError } from '@/types/api-error'

type PostgrestLikeResponse<T> =
  | { data: T; error: null; status: number }
  | { data: null; error: PostgrestError; status: number }

export function toSupabaseApiError(error: PostgrestError, status: number): NormalizedApiError {
  return {
    status,
    code: error.code || `HTTP_${status}`,
    detail: error.message,
    raw: error
  }
}

/**
 * supabase-js renvoie `{ data, error }` sans jamais rejeter : `unwrap` rejette une `NormalizedApiError`
 * pour que TanStack Query passe en état `error`, comme avec le client HTTP.
 *
 *   const rows = unwrap(await getSupabaseBrowserClient().from('deputes').select('*'))
 */
export function unwrap<T>(response: PostgrestLikeResponse<T>): T {
  if (response.error) {
    throw toSupabaseApiError(response.error, response.status)
  }

  return response.data
}
