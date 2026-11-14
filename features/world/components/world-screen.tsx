import { useTranslations } from 'next-intl'

import { BrandLockup } from '@/components/brand/brand-lockup'
import { Stage } from '@/components/shared/stage'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { CatalogList } from '@/features/datasets/components/catalog-list'
import { CATALOG } from '@/features/datasets/lib/catalog'

import { WorldCanvas } from './world-canvas'

/**
 * Landing : le monde WebGL occupe tout le Stage, aucune colonne latérale (pas de widget sur cette page).
 * Le lockup central tient lieu de titre (h1) tant que le monde ne dessine rien ; à retirer, ou à passer en `sr-only`,
 * quand la scène prendra le relais.
 */
export function WorldScreen() {
  const t = useTranslations('home')

  return (
    <Stage
      canvas={<WorldCanvas />}
      centerAlign='center'
      className='h-auto min-h-dvh overflow-visible lg:h-dvh lg:overflow-hidden'
      left={
        <Widget aria-labelledby='home-catalog-title' className='pointer-events-auto' data-testid='home-catalog'>
          <WidgetHeader>
            <WidgetTitle id='home-catalog-title'>{t('catalog.title')}</WidgetTitle>
            <WidgetDescription>{t('catalog.description')}</WidgetDescription>
          </WidgetHeader>
          <WidgetContent>
            <CatalogList entries={CATALOG} />
            <p className='text-muted-foreground text-xs' data-testid='home-world-placeholder'>
              {t('catalog.worldPlaceholder')}
            </p>
          </WidgetContent>
        </Widget>
      }
    >
      <BrandLockup
        size='lg'
        titleAs='h1'
        name={t('title')}
        baseline={t('baseline')}
        className='motion-safe:animate-fade-up pointer-events-none'
      />
    </Stage>
  )
}
