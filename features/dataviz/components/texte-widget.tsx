'use client'

import { useFormatter, useTranslations } from 'next-intl'

import type { AreaDetail, AreaTexte } from '@/apis/areas/types'
import { Widget, WidgetContent, WidgetDescription, WidgetHeader, WidgetTitle } from '@/components/shared/widget'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PUBLIC_PATHS } from '@/constant/path'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type TexteWidgetProps = {
  status: 'pending' | 'notFound' | 'error' | 'ready'
  area: AreaDetail | undefined
  texte: AreaTexte | undefined
  onSelectTexte: (texte: AreaTexte) => void
  onRetry: () => void
}

const TITLE_ID = 'texte-widget-title'

/**
 * Colonne gauche, « ce que l'on regarde » : le jeu de données, le texte ouvert et ses métadonnées. Source, licence
 * et date d'import restent visibles (BR-D2). Choisir un autre texte de la zone recharge le disque au niveau texte.
 */
export function TexteWidget({ status, area, texte, onSelectTexte, onRetry }: TexteWidgetProps) {
  const t = useTranslations('dataviz')
  const format = useFormatter()

  if (status === 'pending')
    return (
      <Widget aria-busy>
        <Skeleton className='h-4 w-1/3' />
        <Skeleton className='h-6 w-3/4' />
        <Skeleton className='h-4 w-full' />
      </Widget>
    )

  if (status === 'notFound' || status === 'error' || !area)
    return (
      <Widget role='alert'>
        <WidgetHeader>
          <WidgetTitle>{t(status === 'notFound' ? 'area.notFoundTitle' : 'area.errorTitle')}</WidgetTitle>
          <WidgetDescription>{t(status === 'notFound' ? 'area.notFound' : 'area.error')}</WidgetDescription>
        </WidgetHeader>
        <div className='flex gap-2'>
          {status === 'error' ? (
            <Button size='sm' variant='outline' onClick={onRetry}>
              {t('view.retry')}
            </Button>
          ) : null}
          <Button size='sm' variant='outline' asChild>
            <Link href={PUBLIC_PATHS.AREAS}>{t('area.backToAreas')}</Link>
          </Button>
        </div>
      </Widget>
    )

  return (
    <Widget aria-labelledby={TITLE_ID}>
      <WidgetHeader>
        <p className='text-muted-foreground text-xs font-medium'>{t('texte.title')}</p>
        <WidgetTitle id={TITLE_ID}>{texte?.titre ?? area.name}</WidgetTitle>
        <WidgetDescription>{area.name}</WidgetDescription>
      </WidgetHeader>
      <WidgetContent className='text-muted-foreground gap-1 text-xs'>
        {texte?.etapeTexte ? <p>{t('texte.stage', { stage: texte.etapeTexte })}</p> : null}
        <p>{t('texte.source', { source: area.sourceLabel })}</p>
        <p>{t('texte.license', { license: area.license })}</p>
        <p>{t('texte.imported', { date: format.dateTime(new Date(area.importedAt), { dateStyle: 'medium' }) })}</p>
      </WidgetContent>
      {area.textes.length > 1 ? (
        <div className='flex flex-col gap-1'>
          <p className='text-muted-foreground text-xs font-medium'>{t('texte.texts')}</p>
          <ul className='flex max-h-40 flex-col gap-1 overflow-y-auto'>
            {area.textes.map((item) => {
              const current = item.id === texte?.id
              return (
                <li key={item.id}>
                  <button
                    type='button'
                    aria-pressed={current}
                    onClick={() => onSelectTexte(item)}
                    className={cn(
                      'focus-visible:ring-ring/50 w-full rounded-md px-2 py-1 text-left text-sm outline-none focus-visible:ring-3',
                      current
                        ? 'bg-secondary font-medium'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <span className='line-clamp-2'>{item.titre}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </Widget>
  )
}
