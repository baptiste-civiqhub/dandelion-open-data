import { useTranslations } from 'next-intl'

import type { AreaDetail } from '@/apis/areas/types'
import type { Article } from '@/apis/articles/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PUBLIC_PATHS } from '@/constant/path'
import { Link } from '@/i18n/navigation'

import type { AmendementColumn } from '../lib/dot-chart'

type AreaSummaryWidgetProps = {
  /** `notFound` : aucune zone ne porte cet identifiant. `error` : la lecture a échoué. */
  status: 'pending' | 'notFound' | 'error' | 'ready'
  area?: AreaDetail
  /** Articles du premier texte de la zone et leurs amendements ; absents tant que le contenu charge. */
  articles?: Article[]
  columns?: readonly AmendementColumn[]
  contentStatus: 'idle' | 'pending' | 'error' | 'ready'
}

const TITLE_ID = 'area-summary-title'

/**
 * Widget de gauche d'une page de zone : nom, description, tags, textes, puis les articles avec leur nombre
 * d'amendements. C'est la version lisible de ce que dessine le canvas.
 */
export function AreaSummaryWidget({ status, area, articles, columns, contentStatus }: AreaSummaryWidgetProps) {
  const t = useTranslations('dataviz')

  if (status === 'pending') {
    return (
      <Widget aria-busy>
        <Skeleton className='h-6 w-3/4' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </Widget>
    )
  }

  if (status !== 'ready' || !area) {
    return (
      <Widget aria-labelledby={TITLE_ID}>
        <WidgetHeader>
          <WidgetTitle id={TITLE_ID}>{t(status === 'notFound' ? 'area.notFoundTitle' : 'area.errorTitle')}</WidgetTitle>
          <WidgetDescription>{t(status === 'notFound' ? 'area.notFound' : 'area.error')}</WidgetDescription>
        </WidgetHeader>
        <WidgetContent>
          <Link
            href={PUBLIC_PATHS.AREAS}
            className='text-primary focus-visible:ring-ring/50 w-fit rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3'
          >
            {t('area.backToAreas')}
          </Link>
        </WidgetContent>
      </Widget>
    )
  }

  const countByArticle = new Map((columns ?? []).map((column) => [column.articleId, column.sortCodes.length]))
  const amendementCount = (columns ?? []).reduce((total, column) => total + column.sortCodes.length, 0)
  const withoutArticle = countByArticle.get(null) ?? 0

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <p className='text-muted-foreground text-xs font-medium'>{t('area.eyebrow')}</p>
        <WidgetTitle id={TITLE_ID}>{area.name}</WidgetTitle>
        {area.description ? <WidgetDescription>{area.description}</WidgetDescription> : null}
      </WidgetHeader>
      {area.tags.length > 0 ? (
        <ul aria-label={t('area.tags')} className='flex flex-wrap gap-1.5'>
          {area.tags.map((tag) => (
            <li key={tag.id}>
              <Badge variant='secondary'>{tag.label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <WidgetContent>
        {area.textes.length === 0 ? (
          <p className='text-muted-foreground'>{t('area.noText')}</p>
        ) : contentStatus === 'pending' ? (
          <div aria-busy className='flex flex-col gap-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
          </div>
        ) : contentStatus === 'error' ? (
          <p role='alert' className='text-muted-foreground'>
            {t('area.contentError')}
          </p>
        ) : (
          <>
            <p className='text-foreground-secondary font-medium'>
              {t('area.stats', { articles: articles?.length ?? 0, amendments: amendementCount })}
            </p>
            <ol aria-label={t('area.articles')} className='flex flex-col gap-1'>
              {(articles ?? []).map((article) => (
                <li key={article.id} className='flex items-baseline justify-between gap-3'>
                  <span className='min-w-0 truncate'>
                    <span className='font-medium'>{article.designation}</span>
                    {article.titre ? <span className='text-muted-foreground'> · {article.titre}</span> : null}
                  </span>
                  <span className='text-muted-foreground shrink-0 tabular-nums'>
                    {countByArticle.get(article.id) ?? 0}
                  </span>
                </li>
              ))}
              {withoutArticle > 0 ? (
                <li className='flex items-baseline justify-between gap-3'>
                  <span className='font-medium'>{t('area.withoutArticle')}</span>
                  <span className='text-muted-foreground shrink-0 tabular-nums'>{withoutArticle}</span>
                </li>
              ) : null}
            </ol>
          </>
        )}
        <p className='text-muted-foreground text-xs'>
          {area.sourceLabel} · {area.license}
        </p>
      </WidgetContent>
    </Widget>
  )
}
