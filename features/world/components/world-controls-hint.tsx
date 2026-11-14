import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { Widget } from '@/components/shared/widget'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

const CONTROLS = ['drive', 'vehicle', 'look', 'open'] as const

const kbd = (chunks: ReactNode) => <Kbd>{chunks}</Kbd>

/**
 * Pense-bête des commandes du monde, en bas de la colonne centrale. Masqué sur écran tactile : le monde se pilote
 * au clavier et à la souris.
 */
export function WorldControlsHint({ className }: { className?: string }) {
  const t = useTranslations('world.controls')

  return (
    <Widget className={cn('self-center rounded-full px-4 py-2 pointer-coarse:hidden', className)}>
      <ul className='text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs'>
        {CONTROLS.map((key) => (
          <li key={key} className='flex items-center gap-1'>
            {t.rich(key, { kbd })}
          </li>
        ))}
      </ul>
    </Widget>
  )
}
