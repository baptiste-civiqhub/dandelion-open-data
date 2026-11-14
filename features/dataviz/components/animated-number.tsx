'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormatter } from 'next-intl'

import { cn } from '@/lib/utils'

const DURATION_MS = 320

/** Nombre qui glisse vers sa nouvelle valeur (AC-M8) ; instantané si le système demande moins d'animations. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const format = useFormatter()
  const [shown, setShown] = useState(value)
  const shownRef = useRef(value)

  useEffect(() => {
    const from = shownRef.current
    if (from === value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownRef.current = value
      setShown(value)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS)
      const next = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)))
      shownRef.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return <span className={cn('tabular-nums', className)}>{format.number(shown)}</span>
}
