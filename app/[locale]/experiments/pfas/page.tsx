import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { PfasScreen } from '@/features/pfas-amendments/components/pfas-screen'
import frenchMessages from '@/i18n/messages/fr.json'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: 'fr', namespace: 'pfasExperiment.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function PfasExperimentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <NextIntlClientProvider locale='fr' messages={frenchMessages}>
      <PfasScreen />
    </NextIntlClientProvider>
  )
}
