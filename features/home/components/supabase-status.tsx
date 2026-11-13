'use client'

import { useTranslations } from 'next-intl'

import { useGetHealth } from '@/apis/health'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { supabaseStatusPresentation } from '../lib/supabase-status-presentation'

export function SupabaseStatus() {
  const t = useTranslations('status')
  const { data, isPending, isError } = useGetHealth()

  if (isPending) {
    return <Skeleton aria-label={t('loading')} className='h-5 w-20' />
  }

  const { labelKey, variant } = supabaseStatusPresentation(isError ? undefined : data?.supabase)

  return (
    <Badge variant={variant} aria-label={`${t('label')} : ${t(labelKey)}`}>
      {t(labelKey)}
    </Badge>
  )
}
