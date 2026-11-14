import { useTranslations } from 'next-intl'

import { Stage } from '@/components/shared/stage'
import { Widget, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'

import { AreasBrowser } from './areas-browser'

/**
 * Page `/area` : le catalogue des zones en pleine page, cible de la recherche du header (`?q=`). Le même
 * `AreasBrowser` s'ouvre en fenêtre depuis le menu « Area ».
 */
export function AreasScreen({ query }: { query?: string }) {
  const t = useTranslations('areas')

  return (
    <Stage>
      <Widget aria-labelledby='areas-title' className='min-h-0'>
        <WidgetHeader>
          <WidgetTitle id='areas-title' className='text-2xl'>
            {t('title')}
          </WidgetTitle>
          <WidgetDescription>{t('description')}</WidgetDescription>
        </WidgetHeader>
        <AreasBrowser key={query ?? ''} initialQuery={query} />
      </Widget>
    </Stage>
  )
}
