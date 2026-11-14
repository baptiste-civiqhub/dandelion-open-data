import type { ComponentProps } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { DandelionMark } from './dandelion-mark'

const loaderVariants = cva('inline-flex shrink-0 items-center justify-center', {
  variants: {
    size: {
      sm: 'size-6',
      md: 'size-12',
      lg: 'size-20'
    },
    tone: {
      brand: 'text-brand',
      neutral: 'text-foreground',
      inverse: 'text-brand-foreground'
    }
  },
  defaultVariants: { size: 'md', tone: 'brand' }
})

type DandelionLoaderProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof loaderVariants> & {
    /** Status announced to assistive technologies, already translated (e.g. `t('common.loading')`). */
    label: string
  }

/**
 * Brand loader « Bloom » (design-system/MOTION.md): the five petals breathe outward one after the other, clockwise.
 * `tone`: `brand` (default, coral) · `neutral` (foreground) · `inverse` (white, on a brand surface only).
 * Announced as a polite live status; under reduced motion the whole mark breathes in opacity instead.
 */
export function DandelionLoader({ label, size, tone, className, ...props }: DandelionLoaderProps) {
  return (
    <span
      role='status'
      aria-live='polite'
      data-slot='dandelion-loader'
      className={cn(loaderVariants({ size, tone }), className)}
      {...props}
    >
      <DandelionMark motion='loading' className='size-full text-current' />
      <span className='sr-only'>{label}</span>
    </span>
  )
}
