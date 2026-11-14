export type AtlasPlacement = {
  id: string
  /** Position dans le carré de la carte, en unités de `size` (origine en haut à gauche). */
  x: number
  y: number
}

export type AtlasLayoutOptions = {
  /** Côté du carré de la carte, en unités du viewBox. */
  size?: number
  /** Marge laissée entre le bord du carré et le centre des zones les plus éloignées. */
  padding?: number
}

export const ATLAS_SIZE = 100
const DEFAULT_PADDING = 18
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const START_ANGLE = -Math.PI / 2

const round = (value: number) => Math.round(value * 100) / 100

/**
 * Place les zones sur une spirale à angle d'or (la disposition des graines d'une fleur de pissenlit), vue de
 * dessus : répartition régulière, sans chevauchement, quel que soit le nombre de zones. Déterministe : la position
 * ne dépend que du rang dans la liste, à trier de façon stable par l'appelant. Une zone seule occupe le centre.
 */
export function layoutAtlas(ids: readonly string[], options: AtlasLayoutOptions = {}): AtlasPlacement[] {
  const size = options.size ?? ATLAS_SIZE
  const center = size / 2
  const maxRadius = Math.max(0, center - (options.padding ?? DEFAULT_PADDING))

  if (ids.length === 1) return [{ id: ids[0], x: round(center), y: round(center) }]

  return ids.map((id, index) => {
    const radius = maxRadius * Math.sqrt((index + 0.5) / ids.length)
    const angle = START_ANGLE + index * GOLDEN_ANGLE
    return { id, x: round(center + radius * Math.cos(angle)), y: round(center + radius * Math.sin(angle)) }
  })
}

/** Libellé court d'une zone sur la carte : coupé sur un mot quand il dépasse, avec des points de suspension. */
export function shortenAtlasLabel(label: string, maxLength = 22): string {
  const text = label.trim()
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
