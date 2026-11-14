import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getPfasSnapshot } from './request'
import type { PfasSnapshot } from './types'

export const useGetPfasSnapshot = (options?: Partial<UseQueryOptions<PfasSnapshot>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_PFAS_AMENDMENTS],
    queryFn: getPfasSnapshot,
    staleTime: Infinity,
    ...options
  })
