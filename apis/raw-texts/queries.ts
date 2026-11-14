import { useInfiniteQuery, useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getRawExtractSummary, getRawRows } from './request'
import type { RawExtractSummary, RawJeu } from './types'
import { RAW_PAGE_SIZE } from './types'

const RAW_STALE_TIME = 5 * 60_000

export const useGetRawExtractSummary = (
  texteUid: string,
  options?: Partial<UseQueryOptions<RawExtractSummary | null>>
) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_RAW_EXTRACT_SUMMARY, texteUid],
    queryFn: () => getRawExtractSummary(texteUid),
    enabled: texteUid.length > 0,
    staleTime: RAW_STALE_TIME,
    ...options
  })

export const useGetRawRows = (jeu: RawJeu, texteUid: string) =>
  useInfiniteQuery({
    queryKey: [QueryKeysEnum.GET_RAW_ROWS, jeu, texteUid],
    queryFn: ({ pageParam }) => getRawRows({ jeu, texteUid, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastOffset) => {
      const next = lastOffset + RAW_PAGE_SIZE
      return next < lastPage.total ? next : undefined
    },
    enabled: texteUid.length > 0,
    staleTime: RAW_STALE_TIME
  })
