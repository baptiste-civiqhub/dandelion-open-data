import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { DatavizScreen } from '@/features/dataviz/components/dataviz-screen'

type PageProps = { params: Promise<{ locale: string; areaId: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, areaId } = await params
  const t = await getTranslations({ locale, namespace: 'dataviz' })
  return { title: t('metaTitle', { areaId: decodeURIComponent(areaId) }) }
}

export default async function AreaPage({ params }: PageProps) {
  const { locale, areaId } = await params
  setRequestLocale(locale)

  return <DatavizScreen areaId={decodeURIComponent(areaId)} />
}
