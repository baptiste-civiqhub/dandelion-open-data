import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { SEARCH_PARAMS } from '@/constant/path'
import { DatasetsScreen } from '@/features/datasets/components/datasets-screen'

type PageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'datasets' })
  return { title: t('metaTitle') }
}

export default async function DatasetsPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const raw = (await searchParams)[SEARCH_PARAMS.QUERY]
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() || undefined

  return <DatasetsScreen query={query} />
}
