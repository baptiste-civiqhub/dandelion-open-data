import { setRequestLocale } from 'next-intl/server'

import { SiteHeader } from '@/features/shell/components/site-header'
import { StageTransitionCurtain } from '@/features/shell/components/stage-transition-curtain'

type StageLayoutProps = { children: React.ReactNode; params: Promise<{ locale: string }> }

/**
 * Coque de l'interface (docs/webui.md) : le header flottant est monté une fois ici et reste en place pendant la
 * navigation entre les pages du groupe ; chaque page rend son propre <Stage> (canvas + colonnes) en dessous. Le rideau
 * des transitions de page (monde 3D → page de zone) vit ici pour la même raison.
 */
export default async function StageLayout({ children, params }: StageLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <SiteHeader />
      {children}
      <StageTransitionCurtain />
    </>
  )
}
