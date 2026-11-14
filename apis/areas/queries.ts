import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getAreaDetail, getAreas } from './request'
import type { Area, AreaDetail } from './types'

export const useGetAreas = (options?: Partial<UseQueryOptions<Area[]>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_AREAS],
    queryFn: getAreas,
    staleTime: 5 * 60_000,
    ...options
  })

export const useGetAreaDetail = (areaId: string, options?: Partial<UseQueryOptions<AreaDetail>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_AREA_DETAIL, areaId],
    queryFn: () => getAreaDetail(areaId),
    enabled: !!areaId,
    staleTime: 5 * 60_000,
    ...options
  })
