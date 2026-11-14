import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Touche de clavier (`<kbd>`) : libellé déjà traduit fourni en enfant. */
function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot='kbd'
      className={cn(
        'bg-secondary text-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-sm border px-1 font-sans text-xs font-medium select-none',
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
