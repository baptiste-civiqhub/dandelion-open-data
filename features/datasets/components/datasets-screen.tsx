import { useTranslations } from 'next-intl'

import { Stage } from '@/components/shared/stage'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'

/**
 * Catalogue des jeux de données, cible de la recherche du header (`?q=`). Liste à brancher sur `apis/datasets/`
 * (chaque entrée → `PUBLIC_PATHS.DATASET_DETAIL(id)`) ; aujourd'hui état vide, avec rappel de la recherche en cours.
 */
export function DatasetsScreen({ query }: { query?: string }) {
  const t = useTranslations('datasets')

  return (
    <Stage>
      <Widget aria-labelledby='datasets-title'>
        <WidgetHeader>
          <WidgetTitle id='datasets-title' className='text-2xl'>
            {t('title')}
          </WidgetTitle>
          <WidgetDescription>{t('description')}</WidgetDescription>
        </WidgetHeader>
        <WidgetContent>
          <p className='text-muted-foreground'>{query ? t('noMatch', { query }) : t('empty')}</p>
        </WidgetContent>
      </Widget>
    </Stage>
  )
}
