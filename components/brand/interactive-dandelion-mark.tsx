'use client'

import { useDandelionPointer } from '@/hooks/use-dandelion-pointer'

import { DandelionMark, type DandelionMarkProps } from './dandelion-mark'

type InteractiveDandelionMarkProps = Omit<DandelionMarkProps, 'motion' | 'ref'>

/**
 * Dandelion mark that reacts to the pointer (« Lean », design-system/MOTION.md): the mark leans toward the cursor,
 * the petals facing it open slightly, and everything settles back when the pointer leaves. Same props as
 * `DandelionMark`; purely decorative, it never carries information.
 */
export function InteractiveDandelionMark(props: InteractiveDandelionMarkProps) {
  const ref = useDandelionPointer()

  return <DandelionMark ref={ref} motion='interactive' {...props} />
}
