import axios, { AxiosRequestConfig, isAxiosError } from 'axios'

import type { NormalizedApiError } from '@/types/api-error'

const TIMEOUT = 60 * 1000

/**
 * Client HTTP unique pour les API REST (route handlers internes `/api/*`, API open data externes).
 * Les données Supabase passent par services/supabase/*, pas par ici.
 */
const http = axios.create({
  timeout: TIMEOUT,
  paramsSerializer: {
    // Tableaux sérialisés en paramètres répétés : ?id=1&id=2 (et non id[]=1 ou id=1,2).
    indexes: null,
    serialize: (params: Record<string, unknown>) => {
      const parts: string[] = []

      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`))
        } else if (value !== null && value !== undefined) {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        }
      })

      return parts.join('&')
    }
  }
})

function toHttpApiError(error: unknown): NormalizedApiError {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const body = error.response?.data as { detail?: string; message?: string } | undefined

    return {
      status,
      code: status ? `HTTP_${status}` : (error.code ?? 'NETWORK_ERROR'),
      detail: body?.detail ?? body?.message ?? error.message,
      raw: error
    }
  }

  return { status: 0, code: 'UNKNOWN_ERROR', detail: String(error), raw: error }
}

/** Renvoie directement le corps de la réponse ; rejette une `NormalizedApiError`. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await http.request<T>(config)
    return response.data
  } catch (error) {
    throw toHttpApiError(error)
  }
}
