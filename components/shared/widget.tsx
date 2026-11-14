import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

import { floatingSurface } from './floating-surface'

/**
 * Widget flottant d'une colonne du Stage (même matière que le header). Composition :
 * `<Widget><WidgetHeader><WidgetTitle/><WidgetDescription/></WidgetHeader><WidgetContent/></Widget>`.
 * `as='section'` par défaut ; nom accessible via le `WidgetTitle` (`aria-labelledby` à poser si plusieurs widgets).
 */
export function Widget({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      data-slot='widget'
      className={cn(
        floatingSurface({ shape: 'panel' }),
        'motion-safe:animate-fade-up flex flex-col gap-4 p-5',
        className
      )}
      {...props}
    />
  )
}

export function WidgetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot='widget-header' className={cn('flex flex-col gap-1', className)} {...props} />
}

export function WidgetTitle({ className, ...props }: ComponentProps<'h2'>) {
  return <h2 data-slot='widget-title' className={cn('text-md font-semibold tracking-tight', className)} {...props} />
}

export function WidgetDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot='widget-description' className={cn('text-muted-foreground text-sm', className)} {...props} />
}

export function WidgetContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot='widget-content' className={cn('flex flex-col gap-3 text-sm', className)} {...props} />
}
