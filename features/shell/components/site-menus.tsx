'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { HeaderNav, HeaderNavButton } from '@/components/shared/header-nav'
import {
  OverlayWindow,
  OverlayWindowBody,
  OverlayWindowContent,
  OverlayWindowDescription,
  OverlayWindowHeader,
  OverlayWindowTitle,
  OverlayWindowTrigger
} from '@/components/shared/overlay-window'
import { AreasBrowser } from '@/features/areas/components/areas-browser'
import { AtlasPanel } from '@/features/atlas/components/atlas-panel'

type Menu = 'atlas' | 'areas'

/**
 * Menus du header : « Atlas » (carte des zones vue de dessus) et « Area » (catalogue avec recherche et filtres).
 * Chacun ouvre la même fenêtre overlay ; une seule est ouverte à la fois, et choisir une zone la referme.
 */
export function SiteMenus() {
  const t = useTranslations('shell')
  const tAtlas = useTranslations('atlas')
  const tAreas = useTranslations('areas')
  const [openMenu, setOpenMenu] = useState<Menu | null>(null)

  const close = () => setOpenMenu(null)
  // Fermer une fenêtre ne doit pas refermer l'autre, ouverte par le même geste (clic sur l'autre bouton).
  const onOpenChange = (menu: Menu) => (open: boolean) =>
    setOpenMenu((current) => (open ? menu : current === menu ? null : current))

  return (
    <HeaderNav label={t('nav.label')}>
      <OverlayWindow open={openMenu === 'atlas'} onOpenChange={onOpenChange('atlas')}>
        <OverlayWindowTrigger asChild>
          <HeaderNavButton>{t('nav.atlas')}</HeaderNavButton>
        </OverlayWindowTrigger>
        <OverlayWindowContent closeLabel={t('overlay.close')}>
          <OverlayWindowHeader>
            <OverlayWindowTitle>{tAtlas('title')}</OverlayWindowTitle>
            <OverlayWindowDescription>{tAtlas('description')}</OverlayWindowDescription>
          </OverlayWindowHeader>
          <OverlayWindowBody>
            <AtlasPanel onNavigate={close} />
          </OverlayWindowBody>
        </OverlayWindowContent>
      </OverlayWindow>
      <OverlayWindow open={openMenu === 'areas'} onOpenChange={onOpenChange('areas')}>
        <OverlayWindowTrigger asChild>
          <HeaderNavButton>{t('nav.areas')}</HeaderNavButton>
        </OverlayWindowTrigger>
        <OverlayWindowContent closeLabel={t('overlay.close')}>
          <OverlayWindowHeader>
            <OverlayWindowTitle>{tAreas('title')}</OverlayWindowTitle>
            <OverlayWindowDescription>{tAreas('description')}</OverlayWindowDescription>
          </OverlayWindowHeader>
          <OverlayWindowBody>
            <AreasBrowser onNavigate={close} />
          </OverlayWindowBody>
        </OverlayWindowContent>
      </OverlayWindow>
    </HeaderNav>
  )
}
