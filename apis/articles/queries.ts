import { useQuery, UseQueryOptions } from '@tanstack/react-query'

import { QueryKeysEnum } from '@/types/queryKeyEnum'

import { getArticlesByTexte } from './request'
import type { Article } from './types'

export const useGetArticlesByTexte = (texteId: string | undefined, options?: Partial<UseQueryOptions<Article[]>>) =>
  useQuery({
    queryKey: [QueryKeysEnum.GET_ARTICLES, texteId],
    queryFn: () => getArticlesByTexte(texteId as string),
    enabled: !!texteId,
    staleTime: 5 * 60_000,
    ...options
  })
