'use client'

import { useEffect, useRef, type ComponentProps } from 'react'

import {
  computeStageSize,
  DEFAULT_MAX_PIXEL_RATIO,
  isSameStageSize,
  type StageScene,
  type StageSceneFactory
} from '@/lib/stage/stage-scene'
import { cn } from '@/lib/utils'

type StageCanvasProps = Omit<ComponentProps<'canvas'>, 'children' | 'ref'> & {
  /** Fabrique de la scène (référence stable). Contrat : lib/stage/stage-scene.ts. */
  scene: StageSceneFactory
  /** Nom accessible, déjà traduit. Absent : canvas décoratif (l'information doit exister ailleurs, ex. widgets). */
  label?: string
  maxPixelRatio?: number
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Hôte de canvas indépendant du moteur (WebGL, WebGL2, 2D) : dimensionne le tampon à la densité de pixels, crée la
 * scène, relaie les redimensionnements, fait tourner `scene.frame` (en pause quand l'onglet est masqué) et appelle
 * `scene.dispose` au démontage. Aucun rendu React pendant l'animation. Guide : docs/webui.md § Scènes.
 */
export function StageCanvas({
  scene: createScene,
  label,
  maxPixelRatio = DEFAULT_MAX_PIXEL_RATIO,
  className,
  ...props
}: StageCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const measure = () =>
      computeStageSize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, maxPixelRatio)
    const applySize = (next: typeof size) => {
      canvas.width = next.pixelWidth
      canvas.height = next.pixelHeight
    }

    let size = measure()
    applySize(size)

    let scene: StageScene | null = null
    let disposed = false
    let frame = 0
    let running = false
    let last = 0

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick)
      scene?.frame?.({ time, delta: last ? time - last : 0 })
      last = time
    }
    const start = () => {
      if (running || !scene?.frame || document.hidden) return
      running = true
      last = 0
      frame = requestAnimationFrame(tick)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(() => {
      const next = measure()
      if (isSameStageSize(next, size)) return
      size = next
      applySize(size)
      scene?.resize?.(size)
    })
    const onVisibilityChange = () => (document.hidden ? stop() : start())

    Promise.resolve(createScene({ canvas, size, reducedMotion: window.matchMedia(REDUCED_MOTION).matches })).then(
      (created) => {
        if (disposed) {
          created.dispose?.()
          return
        }
        scene = created
        scene.resize?.(size)
        observer.observe(canvas)
        document.addEventListener('visibilitychange', onVisibilityChange)
        start()
      }
    )

    return () => {
      disposed = true
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      scene?.dispose?.()
    }
  }, [createScene, maxPixelRatio])

  return (
    <canvas
      ref={ref}
      data-slot='stage-canvas'
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('block size-full touch-none', className)}
      {...props}
    />
  )
}
