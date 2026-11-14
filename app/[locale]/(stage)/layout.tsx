import { setRequestLocale } from 'next-intl/server'

import { SiteHeader } from '@/features/shell/components/site-header'

type StageLayoutProps = { children: React.ReactNode; params: Promise<{ locale: string }> }

/**
 * Coque de l'interface (docs/webui.md) : le header flottant est monté une fois ici et reste en place pendant la
 * navigation entre les pages du groupe ; chaque page rend son propre <Stage> (canvas + colonnes) en dessous.
 */
export default async function StageLayout({ children, params }: StageLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
