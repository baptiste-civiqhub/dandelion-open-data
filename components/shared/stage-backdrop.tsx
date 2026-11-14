import { cn } from '@/lib/utils'

import { StillFrame, type StillFrameSource } from './still-frame'

type StageBackdropProps = {
  /** Image de la scène quittée (basse définition suffit : elle est floutée). Absente : fond de repli. */
  scenery?: StillFrameSource | null
  className?: string
}

/**
 * Fond d'une page du Stage qui garde la trace de la scène quittée : son image floutée, sous un voile
 * `bg-background/70` (même opacité que `EXIT_VEIL_OPACITY` du monde, pour un passage sans saut). Sans image, un
 * dégradé ciel → pelouse sous le même voile. Le voile garde le contraste des widgets et du texte (WCAG AA).
 * Se pose via la prop `backdrop` du `Stage`.
 */
export function StageBackdrop({ scenery, className }: StageBackdropProps) {
  return (
    <div data-slot='stage-backdrop' aria-hidden className={cn('absolute inset-0 overflow-hidden', className)}>
      {scenery ? (
        <StillFrame source={scenery} className='scale-110 blur-2xl' />
      ) : (
        <div className='from-world-sky to-world-lawn size-full bg-linear-to-b' />
      )}
      <div className='bg-background/70 absolute inset-0' />
    </div>
  )
}
