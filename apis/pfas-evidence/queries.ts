import { useQuery } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getPfasEvidenceContext } from './request'

export const useGetPfasEvidenceContext = (amendmentIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_PFAS_EVIDENCE, amendmentIds],
    queryFn: () => getPfasEvidenceContext(amendmentIds),
    staleTime: Infinity,
    retry: false,
    enabled
  })
