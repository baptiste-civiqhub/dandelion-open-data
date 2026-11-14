import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { postAmendementAnalysis } from './request'
import type { AmendementAnalysisRequest, AmendementAnalysisResponse } from './types'

/**
 * Analyse d'amendements, mise en cache par identifiants, mode et langue. Ne part que sur action explicite : passer
 * `enabled: true` au clic. Une analyse déjà obtenue reste lisible ensuite sans nouvel appel (pas de rafraîchissement
 * automatique, pas de nouvel essai : chaque appel coûte une inférence).
 */
export const useGetAmendementAnalysis = (
  body: AmendementAnalysisRequest | null,
  options?: Partial<UseQueryOptions<AmendementAnalysisResponse>>
) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_AMENDEMENT_ANALYSIS, body?.mode, body?.locale, ...(body?.amendementIds ?? [])],
    queryFn: () => postAmendementAnalysis(body as AmendementAnalysisRequest),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...options,
    enabled: !!body && (options?.enabled ?? true)
  })
