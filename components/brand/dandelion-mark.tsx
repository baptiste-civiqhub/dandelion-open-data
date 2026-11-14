import type { ComponentProps, CSSProperties } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { DANDELION_MARK } from '@/lib/brand/dandelion-geometry'
import { DANDELION_PETALS, petalCssVars } from '@/lib/brand/dandelion-motion'
import { cn } from '@/lib/utils'

const markVariants = cva('text-foreground size-12 shrink-0', {
  variants: {
    motion: {
      static: '',
      loading: 'motion-reduce:animate-dandelion-breathe',
      interactive: ''
    }
  },
  defaultVariants: { motion: 'static' }
})

const petalVariants = cva('', {
  variants: {
    motion: {
      static: '',
      loading: 'motion-safe:animate-dandelion-bloom motion-safe:dandelion-stagger',
      interactive: 'motion-safe:dandelion-follow'
    }
  },
  defaultVariants: { motion: 'static' }
})

export type DandelionMarkProps = Omit<ComponentProps<'svg'>, 'children'> &
  VariantProps<typeof markVariants> & {
    /** Accessible name. Without it the mark is decorative and must sit next to the product name. */
    title?: string
  }

/**
 * Dandelion mark: five chevrons cut by a circle (lib/brand/dandelion-geometry.ts). Single colour through
 * `currentColor`: `text-foreground` by default, `text-white` on a brand surface. Size through `size-*`.
 *
 * `motion` (design-system/MOTION.md): `static` (default) · `loading` (« Bloom » wave, prefer `DandelionLoader`) ·
 * `interactive` (petals ready to follow the pointer, driven by `InteractiveDandelionMark`).
 * Each petal carries `data-petal` and only geometry-derived `--dm-*` custom properties, never a visual value.
 */
export function DandelionMark({ title, motion, className, ...props }: DandelionMarkProps) {
  const { size, chevrons } = DANDELION_MARK
  const animated = motion === 'loading'

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      fill='currentColor'
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      data-slot='dandelion-mark'
      data-motion={motion ?? 'static'}
      className={cn(markVariants({ motion }), className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {chevrons.map((chevron, index) => (
        <path
          key={chevron.path}
          d={chevron.path}
          data-petal={index}
          className={petalVariants({ motion }) || undefined}
          style={animated ? (petalCssVars(DANDELION_PETALS[index]) as CSSProperties) : undefined}
        />
      ))}
    </svg>
  )
}
