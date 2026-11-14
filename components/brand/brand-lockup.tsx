import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { DandelionMark } from './dandelion-mark'
import { InteractiveDandelionMark } from './interactive-dandelion-mark'

const lockupVariants = cva('flex flex-col items-center text-center', {
  variants: {
    size: {
      md: 'gap-4',
      lg: 'gap-8'
    }
  },
  defaultVariants: { size: 'md' }
})

const markVariants = cva('', {
  variants: {
    size: {
      md: 'size-14',
      lg: 'size-28'
    }
  },
  defaultVariants: { size: 'md' }
})

const nameVariants = cva('text-foreground font-semibold tracking-tight', {
  variants: {
    size: {
      md: 'text-2xl',
      lg: 'text-5xl leading-tight'
    }
  },
  defaultVariants: { size: 'md' }
})

const baselineVariants = cva('text-muted-foreground', {
  variants: {
    size: {
      md: 'text-sm',
      lg: 'max-w-md text-lg leading-relaxed'
    }
  },
  defaultVariants: { size: 'md' }
})

type BrandLockupProps = VariantProps<typeof lockupVariants> & {
  /** Product name, already translated. */
  name: string
  /** Line under the name, already translated. */
  baseline?: string
  /** Semantic level of the name: `h1` when it is the page title, `p` elsewhere. */
  titleAs?: 'h1' | 'p'
  /** Mark reacts to the pointer (« Lean », design-system/MOTION.md). For hero placements, not for repeated marks. */
  interactive?: boolean
  className?: string
}

/** Brand lockup: mark, name and baseline, stacked and centred. No hard-coded text: everything comes from props. */
export function BrandLockup({
  name,
  baseline,
  size,
  titleAs: Title = 'p',
  interactive = false,
  className
}: BrandLockupProps) {
  const Mark = interactive ? InteractiveDandelionMark : DandelionMark

  return (
    <div data-slot='brand-lockup' className={cn(lockupVariants({ size }), className)}>
      <Mark className={markVariants({ size })} />
      <div className='flex flex-col items-center gap-3'>
        <Title className={nameVariants({ size })}>{name}</Title>
        {baseline ? <p className={baselineVariants({ size })}>{baseline}</p> : null}
      </div>
    </div>
  )
}
