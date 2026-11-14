import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { notFound } from 'next/navigation'
import { FlowerDatasetScreen } from '@/features/texte/components/flower-dataset-screen'
import { isFlowerDatasetId } from '@/features/texte/lib/datasets'

type PageProps = { params: Promise<{ locale: string; datasetId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, datasetId } = await params
  const t = await getTranslations({ locale, namespace: 'dataviz' })
  return { title: t('metaTitle', { areaId: decodeURIComponent(datasetId), datasetId: decodeURIComponent(datasetId) }) }
}

export default async function DatasetPage({ params }: PageProps) {
  const { locale, datasetId } = await params
  setRequestLocale(locale)

  const id = decodeURIComponent(datasetId)
  if (!isFlowerDatasetId(id)) notFound()
  return <FlowerDatasetScreen datasetId={id} />
}
