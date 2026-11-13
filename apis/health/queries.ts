import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getHealth } from './request'
import type { HealthPayload } from './types'

export const useGetHealth = (options?: Partial<UseQueryOptions<HealthPayload>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_HEALTH],
    queryFn: getHealth,
    staleTime: 30_000,
    ...options
  })
