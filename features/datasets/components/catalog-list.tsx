import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { PUBLIC_PATHS } from '@/constant/path'
import type { CatalogEntry } from '@/features/datasets/lib/catalog'
import { Link } from '@/i18n/navigation'

/** Liste des jeux branchés : partagée par le catalogue et la landing. */
export function CatalogList({ entries }: { entries: CatalogEntry[] }) {
  const t = useTranslations('flower.datasets')
  return (
    <ul className='flex flex-col gap-3' data-testid='catalog-list'>
      {entries.map((entry) => (
        <li key={entry.id} className='flex flex-col gap-1 rounded-md border p-3'>
          <p className='font-semibold'>{t(`${entry.id}.name`)}</p>
          <p className='text-muted-foreground text-sm'>{t(`${entry.id}.summary`, { count: entry.records })}</p>
          <Button asChild size='sm' className='w-fit'>
            <Link href={PUBLIC_PATHS.DATASET_DETAIL(entry.id)}>{t('open')}</Link>
          </Button>
        </li>
      ))}
    </ul>
  )
}
