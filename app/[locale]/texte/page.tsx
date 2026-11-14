import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { TexteScreen } from '@/features/texte/components/texte-screen'

type PageProps = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'texte' })
  return { title: t('metaTitle') }
}

export default async function TextePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return <TexteScreen />
}
