import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getTags } from './request'
import type { GetTagsParams, Tag } from './types'

export const useGetTags = (params: GetTagsParams = {}, options?: Partial<UseQueryOptions<Tag[]>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_TAGS, params],
    queryFn: () => getTags(params),
    staleTime: 5 * 60_000,
    ...options
  })
