'use client'

import { cn } from '@/lib/utils'

import { StillFrame, type StillFrameSource } from './still-frame'

type StageCurtainProps = {
  /** Dernière image de la page qui part, à la taille du viewport. */
  frame: StillFrameSource
  /** Visible tant que `true` ; à `false`, s'efface en fondu (`stage-crossfade`, instantané en mouvement réduit). */
  open: boolean
  className?: string
}

/**
 * Rideau entre deux pages du Stage : tient la dernière image de la page qui part, plein écran, au-dessus de la page
 * qui arrive (sous le header et les fenêtres), puis s'efface en fondu sur elle. N'intercepte jamais le pointeur.
 */
export function StageCurtain({ frame, open, className }: StageCurtainProps) {
  return (
    <div
      data-slot='stage-curtain'
      aria-hidden
      className={cn(
        'motion-safe:stage-crossfade pointer-events-none fixed inset-0 z-30',
        open ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <StillFrame source={frame} />
    </div>
  )
}
