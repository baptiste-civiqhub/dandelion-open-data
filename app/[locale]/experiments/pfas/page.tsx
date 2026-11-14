import { setRequestLocale } from 'next-intl/server'

import { PfasScreen } from '@/features/pfas-amendments/components/pfas-screen'

type PageProps = { params: Promise<{ locale: string }> }

export default async function PfasExperimentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PfasScreen />
}
