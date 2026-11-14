import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getTexteAmendements } from './request'
import type { TexteSnapshot } from './types'

export const useGetTexteAmendements = (options?: Partial<UseQueryOptions<TexteSnapshot>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_TEXTE_AMENDEMENTS],
    queryFn: getTexteAmendements,
    staleTime: Infinity,
    ...options
  })
