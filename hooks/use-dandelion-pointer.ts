'use client'

import { useEffect, useRef } from 'react'

import { DANDELION_PETALS, normalizePointer, pointerOffsets } from '@/lib/brand/dandelion-motion'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Hover « Lean » of the Dandelion mark (design-system/MOTION.md). Attach the returned ref to a `DandelionMark`
 * rendered with `motion='interactive'`.
 *
 * Pointer moves are sampled once per frame, turned into per-petal offsets by the pure `pointerOffsets`, and written as
 * `--dm-hover-x|y` straight on each `[data-petal]` path: no React render per frame, the CSS transition does the easing.
 * Mouse and pen only (a touch has no hover); nothing runs under `prefers-reduced-motion: reduce`.
 */
export function useDandelionPointer() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg) return

    const reducedMotion = window.matchMedia(REDUCED_MOTION)
    const petals = Array.from(svg.querySelectorAll<SVGPathElement>('[data-petal]'))
    let frame = 0
    let pointer = { x: 0, y: 0 }

    const write = () => {
      frame = 0
      pointerOffsets(pointer, DANDELION_PETALS).forEach((offset, index) => {
        petals[index]?.style.setProperty('--dm-hover-x', `${offset.x}px`)
        petals[index]?.style.setProperty('--dm-hover-y', `${offset.y}px`)
      })
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reducedMotion.matches) return
      pointer = normalizePointer({ x: event.clientX, y: event.clientY }, svg.getBoundingClientRect())
      schedule()
    }

    const onLeave = () => {
      pointer = { x: 0, y: 0 }
      schedule()
    }

    svg.addEventListener('pointermove', onMove)
    svg.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      svg.removeEventListener('pointermove', onMove)
      svg.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return ref
}
