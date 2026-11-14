'use client'

import { useTranslations } from 'next-intl'

import { useGetAreas } from '@/apis/areas'
import { Skeleton } from '@/components/ui/skeleton'

import { AtlasMap } from './atlas-map'

/** Contenu de la fenêtre « Atlas » : la carte des zones et ses quatre états (chargement, erreur, vide, rempli). */
export function AtlasPanel({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('atlas')
  const { data: areas, isPending, isError } = useGetAreas()

  if (isPending) return <Skeleton className='min-h-0 flex-1 rounded-xl' />
  if (isError) {
    return (
      <p role='alert' className='text-muted-foreground text-sm'>
        {t('error')}
      </p>
    )
  }
  if (areas.length === 0) return <p className='text-muted-foreground text-sm'>{t('empty')}</p>

  return (
    <>
      <div className='bg-surface-raised min-h-0 flex-1 overflow-hidden rounded-xl border'>
        <AtlasMap areas={areas} onNavigate={onNavigate} />
      </div>
      <p className='text-muted-foreground shrink-0 pt-3 text-xs'>
        {t('summary', { total: areas.length, withData: areas.filter((area) => area.texteCount > 0).length })}
      </p>
    </>
  )
}
