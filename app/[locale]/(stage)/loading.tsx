import { useTranslations } from 'next-intl'

import { DandelionLoader } from '@/components/brand/dandelion-loader'
import { Stage } from '@/components/shared/stage'

/** Attente d'une page du groupe : le header reste affiché, le loader de marque occupe le centre du Stage. */
export default function Loading() {
  const t = useTranslations('common')

  return (
    <Stage centerAlign='center'>
      <DandelionLoader size='lg' label={t('loading')} />
    </Stage>
  )
}
