import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import frenchMessages from '@/i18n/messages/fr.json'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: 'fr', namespace: 'pfasExperiment.meta' })
  return { title: t('title'), description: t('description') }
}

export default function PfasExperimentLayout({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale='fr' messages={frenchMessages}>
      {children}
    </NextIntlClientProvider>
  )
}
