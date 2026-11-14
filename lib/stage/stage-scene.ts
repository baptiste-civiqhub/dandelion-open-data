/**
 * Contrat d'une scène de canvas (WebGL, WebGL2 ou 2D), indépendant de tout moteur de rendu.
 *
 * `StageCanvas` (components/shared/stage-canvas.tsx) possède le cycle de vie : il dimensionne le canvas à la densité
 * de pixels, appelle la fabrique une fois, relaie les redimensionnements, fait tourner la boucle d'animation (mise en
 * pause quand l'onglet est masqué) et libère la scène au démontage. Une scène ne fait que dessiner.
 * Guide : docs/webui.md § Scènes.
 */

export type StageSize = {
  /** Taille CSS du canvas, en px. */
  width: number
  height: number
  /** Densité de pixels effectivement appliquée (devicePixelRatio plafonné). */
  pixelRatio: number
  /** Taille du tampon de dessin (`canvas.width` / `canvas.height`), en pixels physiques. */
  pixelWidth: number
  pixelHeight: number
}

export type StageFrame = {
  /** Horodatage de la frame (requestAnimationFrame), en ms. */
  time: number
  /** Temps écoulé depuis la frame précédente, en ms (0 à la reprise après une pause). */
  delta: number
}

export type StageSceneContext = {
  canvas: HTMLCanvasElement
  size: StageSize
  /** `prefers-reduced-motion: reduce` : la scène supprime tout mouvement non déclenché par l'utilisateur. */
  reducedMotion: boolean
}

export type StageScene = {
  /** Le tampon du canvas vient d'être redimensionné (viewport, caméra, projection…). */
  resize?: (size: StageSize) => void
  /** Une frame. Absente : aucune boucle n'est lancée (scène statique redessinée dans `resize`). */
  frame?: (frame: StageFrame) => void
  /** Libère les ressources (buffers, textures, écouteurs). */
  dispose?: () => void
}

/**
 * Fabrique de scène. Asynchrone permise : c'est là qu'un moteur lourd se charge à la demande
 * (`const THREE = await import('three')`), hors du bundle initial de la page.
 * Doit être une référence stable (fonction de module ou `useMemo`) : une nouvelle référence recrée la scène.
 */
export type StageSceneFactory = (context: StageSceneContext) => StageScene | Promise<StageScene>

/** Plafond de densité par défaut : au-delà de 2, le coût GPU croît sans gain visible. */
export const DEFAULT_MAX_PIXEL_RATIO = 2

export function computeStageSize(
  width: number,
  height: number,
  devicePixelRatio: number,
  maxPixelRatio: number = DEFAULT_MAX_PIXEL_RATIO
): StageSize {
  const safeWidth = Math.max(0, width)
  const safeHeight = Math.max(0, height)
  const pixelRatio = Math.min(Math.max(devicePixelRatio || 1, 1), Math.max(maxPixelRatio, 1))
  return {
    width: safeWidth,
    height: safeHeight,
    pixelRatio,
    pixelWidth: Math.max(1, Math.round(safeWidth * pixelRatio)),
    pixelHeight: Math.max(1, Math.round(safeHeight * pixelRatio))
  }
}

export function isSameStageSize(a: StageSize, b: StageSize): boolean {
  return a.pixelWidth === b.pixelWidth && a.pixelHeight === b.pixelHeight && a.pixelRatio === b.pixelRatio
}
