import type { StageSceneFactory } from '@/lib/stage/stage-scene'

import type { WorldZone } from '../lib/world-zones'

/**
 * Contrat entre le monde 3D et l'application (features/world/README.md). Le monde ne connaît ni le routeur, ni les
 * URL, ni le DOM de l'interface : il reçoit des zones et rend trois événements. `WorldScreen` fait le reste.
 */
export type WorldSceneOptions = {
  /** Zones à poser au sol, positions comprises (`worldZonesFromAreas`). Liste vide pendant le chargement. */
  zones: readonly WorldZone[]
  /**
   * Le monde dessine sa première image : l'interface retire alors le titre de marque centré (il reste pour les
   * lecteurs d'écran). Appelé une fois. Jamais appelé si WebGL est indisponible : la landing garde son titre.
   */
  onReady: () => void
  /**
   * Le personnage entre dans une zone (`slug`) ou en sort (`null`). L'interface affiche alors « Entrée pour ouvrir ».
   * N'appeler que lors d'un changement.
   */
  onZoneFocus: (slug: string | null) => void
  /**
   * L'utilisateur a pressé Entrée dans une zone et la transition (zoom sur la zone) est terminée : l'application
   * navigue vers `/area/{slug}`. Avec `reducedMotion`, appeler sans transition.
   */
  onEnterZone: (slug: string) => void
}

/**
 * Point d'entrée du monde WebGL de la landing. SOCLE : contexte WebGL2 et viewport tenus à jour, rien n'est
 * dessiné et aucun événement n'est émis, donc la landing garde son titre de marque. Le monde (sol, zones,
 * personnage, caméra, clavier, transition) s'implémente ici, en chargeant son moteur à la demande
 * (`await import('three')`).
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
