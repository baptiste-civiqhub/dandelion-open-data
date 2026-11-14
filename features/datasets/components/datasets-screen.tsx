import { useTranslations } from 'next-intl'

import { Stage } from '@/components/shared/stage'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader } from '@/components/shared/widget'
import { CATALOG, filterCatalog } from '@/features/datasets/lib/catalog'

import { CatalogList } from './catalog-list'

/**
 * Catalogue des jeux de données, cible de la recherche du header (`?q=`). Liste à brancher sur `apis/datasets/`
 * (chaque entrée → `PUBLIC_PATHS.DATASET_DETAIL(id)`) ; aujourd'hui état vide, avec rappel de la recherche en cours.
 */
export function DatasetsScreen({ query }: { query?: string }) {
  const t = useTranslations('datasets')
  const names = useTranslations('flower.datasets')
  const entries = filterCatalog(CATALOG, query, (id) => names(`${id}.name`))

  return (
    <Stage>
      <Widget aria-labelledby='datasets-title' className='pointer-events-auto'>
        <WidgetHeader>
          <h1 id='datasets-title' className='text-2xl font-semibold tracking-tight'>
            {t('title')}
          </h1>
          <WidgetDescription>{t('description')}</WidgetDescription>
        </WidgetHeader>
        <WidgetContent>
          {entries.length > 0 ? (
            <CatalogList entries={entries} />
          ) : (
            <p className='text-muted-foreground'>{query ? t('noMatch', { query }) : t('empty')}</p>
          )}
        </WidgetContent>
      </Widget>
    </Stage>
  )
}
