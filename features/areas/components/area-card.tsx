import { useTranslations } from 'next-intl'

import type { Area } from '@/apis/areas/types'
import type { Tag } from '@/apis/tags/types'
import { Badge } from '@/components/ui/badge'
import { PUBLIC_PATHS } from '@/constant/path'
import { Link } from '@/i18n/navigation'

type AreaCardProps = {
  area: Area
  /** Tags de la zone, déjà résolus depuis `area.tagIds`. */
  tags: Tag[]
  /** Appelé au clic : la fenêtre qui contient la carte se referme avant la navigation. */
  onNavigate?: () => void
}

/** Entrée du catalogue des zones : toute la carte est le lien vers la page de la zone. */
export function AreaCard({ area, tags, onNavigate }: AreaCardProps) {
  const t = useTranslations('areas')

  return (
    <Link
      href={PUBLIC_PATHS.AREA_DETAIL(area.slug)}
      onClick={onNavigate}
      data-slot='area-card'
      className='bg-background hover:bg-secondary focus-visible:ring-ring/50 flex flex-col gap-2 rounded-xl border p-4 transition-colors outline-none focus-visible:ring-3'
    >
      <div className='flex items-start justify-between gap-3'>
        <h3 className='text-md font-semibold tracking-tight'>{area.name}</h3>
        <span className='text-muted-foreground shrink-0 text-xs'>{t('card.texts', { count: area.texteCount })}</span>
      </div>
      {area.description ? <p className='text-muted-foreground line-clamp-2 text-sm'>{area.description}</p> : null}
      {tags.length > 0 ? (
        <ul className='flex flex-wrap gap-1.5'>
          {tags.map((tag) => (
            <li key={tag.id}>
              <Badge variant='secondary'>{tag.label}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  )
}
