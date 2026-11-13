import type { ComponentProps } from 'react'

import { DANDELION_MARK } from '@/lib/brand/dandelion-geometry'
import { cn } from '@/lib/utils'

type DandelionMarkProps = Omit<ComponentProps<'svg'>, 'children'> & {
  /** Accessible name. Without it the mark is decorative and must sit next to the product name. */
  title?: string
}

/**
 * Dandelion mark: five chevrons cut by a circle (lib/brand/dandelion-geometry.ts). Single colour through
 * `currentColor`: `text-foreground` by default, `text-white` on a brand surface. Size through `size-*`.
 */
export function DandelionMark({ title, className, ...props }: DandelionMarkProps) {
  const { size, chevrons } = DANDELION_MARK

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      fill='currentColor'
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      data-slot='dandelion-mark'
      className={cn('text-foreground size-12 shrink-0', className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {chevrons.map((chevron) => (
        <path key={chevron.path} d={chevron.path} />
      ))}
    </svg>
  )
}
