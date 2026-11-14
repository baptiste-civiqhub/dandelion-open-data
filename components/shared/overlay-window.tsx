'use client'

import type { ComponentProps } from 'react'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { floatingSurface } from './floating-surface'

/**
 * Fenêtre overlay carrée posée au-dessus du Stage, sous le header (même matière : `floatingSurface`). Non modale :
 * le header reste utilisable pour passer d'une fenêtre à l'autre, le canvas reste visible autour. Échap, un clic
 * hors de la fenêtre ou le bouton de fermeture la referment. Composition :
 * `<OverlayWindow><OverlayWindowTrigger asChild>…</OverlayWindowTrigger>
 * <OverlayWindowContent closeLabel='…'><OverlayWindowHeader><OverlayWindowTitle/><OverlayWindowDescription/>
 * </OverlayWindowHeader><OverlayWindowBody/></OverlayWindowContent></OverlayWindow>`.
 */
export function OverlayWindow(props: ComponentProps<typeof Dialog>) {
  return <Dialog modal={false} {...props} />
}

export const OverlayWindowTrigger = DialogTrigger

type OverlayWindowContentProps = ComponentProps<typeof DialogContent> & {
  /** Nom accessible du bouton de fermeture, déjà traduit. */
  closeLabel: string
}

/**
 * Carré centré sous le header : côté plafonné à `max-w-2xl`, réduit à la largeur de l'écran sur mobile et à la
 * hauteur disponible sur un écran bas. Le calque réserve la place du header (`top-24`, comme le `pt-24` du Stage).
 */
export function OverlayWindowContent({ closeLabel, className, children, ...props }: OverlayWindowContentProps) {
  return (
    <DialogPortal>
      <div
        data-slot='overlay-window-layer'
        className='pointer-events-none fixed inset-x-4 top-24 bottom-4 z-40 flex items-start justify-center lg:inset-x-6 lg:bottom-6'
      >
        <DialogContent
          data-slot='overlay-window'
          className={cn(
            floatingSurface({ shape: 'panel' }),
            'motion-safe:animate-fade-up pointer-events-auto relative flex aspect-square max-h-full w-full max-w-2xl flex-col gap-4 overflow-hidden p-5',
            className
          )}
          {...props}
        >
          {children}
          <DialogClose asChild>
            <Button variant='ghost' size='icon' aria-label={closeLabel} className='absolute top-3 right-3 rounded-full'>
              <X aria-hidden />
            </Button>
          </DialogClose>
        </DialogContent>
      </div>
    </DialogPortal>
  )
}

/** En-tête de la fenêtre. La marge droite laisse la place du bouton de fermeture. */
export function OverlayWindowHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot='overlay-window-header' className={cn('flex shrink-0 flex-col gap-1 pr-10', className)} {...props} />
  )
}

export const OverlayWindowTitle = DialogTitle

export const OverlayWindowDescription = DialogDescription

/** Corps de la fenêtre : prend la hauteur restante. Le contenu choisit ce qui défile à l'intérieur. */
export function OverlayWindowBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot='overlay-window-body' className={cn('flex min-h-0 flex-1 flex-col', className)} {...props} />
}
