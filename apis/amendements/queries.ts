import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getAmendementDetail, getAmendementsByTexte } from './request'
import type { AmendementDetail, AmendementSummary } from './types'

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

export const useGetAmendementDetail = (texteId: string, id: string | undefined) =>
  useQuery<AmendementDetail>({
    queryKey: [QueryKeysEnum.GET_AMENDEMENT_DETAIL, texteId, id],
    queryFn: () => getAmendementDetail(texteId, id as string),
    enabled: !!id,
    staleTime: 5 * 60_000,
    retry: false
  })
