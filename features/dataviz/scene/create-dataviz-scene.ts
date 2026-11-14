import type { StageSceneFactory } from '@/lib/stage/stage-scene'

export type DatavizSceneOptions = {
  datasetId: string
}

/**
 * Scène de fond d'une page de dataviz (docs/webui.md § Pages de dataviz). SOCLE UNIQUEMENT : contexte WebGL2 et
 * viewport tenus à jour, rien n'est dessiné. Les données arriveront par `apis/datasets/` (TanStack Query) dans
 * l'écran, et seront passées à la scène déjà préparées (échelles, positions calculées dans `features/dataviz/lib/`).
 */
export function createDatavizScene(options: DatavizSceneOptions): StageSceneFactory {
  void options

  return ({ canvas }) => {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
    if (!gl) return {}

    return {
      resize: (size) => gl.viewport(0, 0, size.pixelWidth, size.pixelHeight)
    }
  }
}
