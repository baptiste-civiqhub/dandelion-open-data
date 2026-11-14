import type { StageSceneFactory } from '@/lib/stage/stage-scene'

export type WorldSceneOptions = {
  /**
   * Pont entre le monde et l'application : le véhicule est entré dans une zone. `areaId` est le slug de la zone
   * (`apis/areas`). `WorldCanvas` y branche la navigation vers `PUBLIC_PATHS.AREA_DETAIL(areaId)`.
   */
  onEnterZone: (areaId: string) => void
}

/**
 * Point d'entrée du monde WebGL de la landing (features/world/README.md). SOCLE UNIQUEMENT : la scène obtient un
 * contexte WebGL2 et tient son viewport à jour, rien n'est dessiné. Le jeu de navigation (carte, zones, véhicule,
 * caméra) s'implémente ici, en chargeant son moteur à la demande dans la fabrique.
 */
export function createWorldScene(options: WorldSceneOptions): StageSceneFactory {
  void options

  return ({ canvas }) => {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
    if (!gl) return {}

    return {
      resize: (size) => gl.viewport(0, 0, size.pixelWidth, size.pixelHeight)
    }
  }
}
