import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getAmendementsByTexte } from './request'
import type { AmendementSummary } from './types'

export const useGetAmendementsByTexte = (
  texteId: string | undefined,
  options?: Partial<UseQueryOptions<AmendementSummary[]>>
) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_AMENDEMENTS, texteId],
    queryFn: () => getAmendementsByTexte(texteId as string),
    enabled: !!texteId,
    staleTime: 5 * 60_000,
    ...options
  })
