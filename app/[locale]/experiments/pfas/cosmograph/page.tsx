import { setRequestLocale } from 'next-intl/server'

import { CosmographPfasScreen } from '@/features/pfas-amendments/components/cosmograph-pfas-screen'

export default async function CosmographExperimentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <CosmographPfasScreen />
}
