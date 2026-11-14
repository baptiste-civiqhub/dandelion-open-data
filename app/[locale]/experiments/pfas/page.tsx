import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PfasScreen } from '@/features/pfas-amendments/components/pfas-screen'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'pfasExperiment.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function PfasExperimentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PfasScreen />
}
