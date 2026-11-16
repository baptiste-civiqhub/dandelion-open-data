'use client'

import { useLayoutEffect, useRef, type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Image déjà rendue (copie d'un canvas, bitmap) : ce qu'une scène laisse derrière elle. */
export type StillFrameSource = HTMLCanvasElement | ImageBitmap

type StillFrameProps = Omit<ComponentProps<'canvas'>, 'children' | 'ref'> & { source: StillFrameSource }

/**
 * Image figée qui couvre sa boîte (`object-cover`) : la source est recopiée dans un canvas avant la peinture, sans
 * décodage ni image vide intermédiaire. Décorative (`aria-hidden`). Utilisée par `StageCurtain` et `StageBackdrop`.
 */
export function StillFrame({ source, className, ...props }: StillFrameProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    canvas.width = source.width
    canvas.height = source.height
    context.drawImage(source, 0, 0)
  }, [source])

  return (
    <canvas
      ref={ref}
      data-slot='still-frame'
      aria-hidden
      className={cn('block size-full object-cover', className)}
      {...props}
    />
  )
}
