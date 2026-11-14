import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DatavizScreen } from '@/features/dataviz/components/dataviz-screen'

type PageProps = { params: Promise<{ locale: string; datasetId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, datasetId } = await params
  const t = await getTranslations({ locale, namespace: 'dataviz' })
  return { title: t('metaTitle', { datasetId: decodeURIComponent(datasetId) }) }
}

export default async function DatasetPage({ params }: PageProps) {
  const { locale, datasetId } = await params
  setRequestLocale(locale)

  return <DatavizScreen datasetId={decodeURIComponent(datasetId)} />
}
