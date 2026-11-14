import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getSorts } from './request'
import type { Sort } from './types'

export const useGetSorts = (options?: Partial<UseQueryOptions<Sort[]>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_SORTS],
    queryFn: getSorts,
    staleTime: 60 * 60_000,
    ...options
  })
