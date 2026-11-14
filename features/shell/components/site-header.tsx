import { useTranslations } from 'next-intl'

import { InteractiveDandelionMark } from '@/components/brand/interactive-dandelion-mark'
import { FloatingHeader, FloatingHeaderSection } from '@/components/shared/floating-header'
import { SearchField } from '@/components/shared/search-field'
import { PUBLIC_PATHS } from '@/constant/path'
import { Link } from '@/i18n/navigation'

import { SiteMenus } from './site-menus'

/**
 * Header du site, rémanent sur toutes les pages du route group `(stage)` : marque (picto interactif + nom) et menus
 * à gauche, recherche de zones à droite. Les menus « Atlas » et « Area » ouvrent une fenêtre overlay (`SiteMenus`).
 * Ajouter un lien de page : un chemin dans `constant/path.ts`, une clé `shell.nav.*` (en + fr), un `<HeaderNavLink>`
 * dans `SiteMenus`.
 */
export function SiteHeader() {
  const t = useTranslations('shell')

  return (
    <FloatingHeader>
      <FloatingHeaderSection>
        <Link
          href={PUBLIC_PATHS.HOME}
          aria-label={t('homeLink')}
          className='focus-visible:ring-ring/50 flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none focus-visible:ring-3'
        >
          <InteractiveDandelionMark className='size-8' />
          <span className='text-md hidden font-semibold tracking-tight sm:inline'>{t('brandName')}</span>
        </Link>
        <SiteMenus />
      </FloatingHeaderSection>
      <FloatingHeaderSection align='end'>
        <SearchField
          className='sm:max-w-64'
          action={PUBLIC_PATHS.AREAS}
          label={t('search.label')}
          placeholder={t('search.placeholder')}
        />
      </FloatingHeaderSection>
    </FloatingHeader>
  )
}
