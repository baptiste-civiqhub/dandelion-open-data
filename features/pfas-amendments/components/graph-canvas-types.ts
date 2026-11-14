import type { AmendmentGraph } from '../lib/graph'

export type GraphCanvasProps = {
  graph: AmendmentGraph
  focusedId: string | null
  selectedIds: string[]
  onFocus: (id: string) => void
  onReady?: (metrics: { loadMs: number }) => void
  labels: {
    loading: string
    error: string
    zoomIn: string
    zoomOut: string
    reset: string
    pause: string
    resume: string
    canvas: string
  }
}
