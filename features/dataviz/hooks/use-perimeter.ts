'use client'

import { useMemo } from 'react'

import { amendementsUnder } from '../lib/sunburst-tree'
import { useHoverStore, useViewStore } from './use-sunburst-store'

/**
 * Périmètre lu par les widgets : le focus épinglé, ou en aperçu le conteneur survolé (article, alinéa…).
 * Un amendement survolé ne change pas le périmètre : il allume seulement la ligne de son sort.
 */
export function usePerimeter() {
  const tree = useViewStore((state) => state.tree)
  const focusId = useViewStore((state) => state.focusId)
  const hoverId = useHoverStore((state) => state.nodeId)

  const focus = tree?.byId.get(focusId) ?? tree?.root ?? null
  const hovered = hoverId ? (tree?.byId.get(hoverId) ?? null) : null
  const preview = hovered && hovered.kind !== 'amendement' && hovered !== focus ? hovered : null
  const subject = preview ?? focus
  const amendements = useMemo(() => (subject ? amendementsUnder(subject) : []), [subject])

  return { tree, focus, hovered, preview, subject, amendements }
}
