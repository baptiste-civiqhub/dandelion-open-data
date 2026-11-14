import { useTranslations } from 'next-intl'

import { BrandLockup } from '@/components/brand/brand-lockup'
import { Stage } from '@/components/shared/stage'

import { WorldCanvas } from './world-canvas'

/**
 * Landing : le monde WebGL occupe tout le Stage, aucune colonne latérale (pas de widget sur cette page).
 * Le lockup central tient lieu de titre (h1) tant que le monde ne dessine rien ; à retirer, ou à passer en `sr-only`,
 * quand la scène prendra le relais.
 */
export function WorldScreen() {
  const t = useTranslations('home')

  return (
    <Stage canvas={<WorldCanvas />} centerAlign='center'>
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
