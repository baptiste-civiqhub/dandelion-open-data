import type { Area } from '@/apis/areas/types'
import { ATLAS_SIZE, layoutAtlas, orderAtlasAreas } from '@/features/atlas/lib/atlas-layout'

/** Une zone du monde 3D, prête à poser au sol. Repère : plan XZ, centre du monde en (0, 0), Y vers le haut. */
export type WorldZone = {
  id: string
  /** Identifiant d'URL : c'est lui que `onEnterZone` et `onZoneFocus` renvoient. */
  slug: string
  name: string
  /** Centre de la zone au sol, en unités du monde. */
  x: number
  z: number
  /** Rayon du disque de déclenchement, en unités du monde. */
  radius: number
  /** La zone a au moins un texte chargé : sa page affiche une dataviz (sinon un état vide). */
  hasData: boolean
  tagIds: string[]
}

export type WorldZonesOptions = {
  /** Côté du monde carré, en unités du monde. */
  worldSize?: number
  /** Rayon de chaque zone, en unités du monde. */
  zoneRadius?: number
}

export const DEFAULT_WORLD_SIZE = 100
const DEFAULT_ZONE_RADIUS = 6

/**
 * Zones du monde 3D à partir des zones du backend. Mêmes positions que l'atlas 2D (`layoutAtlas` dans le même
 * ordre) : l'atlas est la vue de dessus exacte du monde. Le Y de l'atlas (vers le bas de l'écran) devient Z (vers
 * la caméra), recentré sur l'origine.
 */
export function worldZonesFromAreas(areas: readonly Area[], options: WorldZonesOptions = {}): WorldZone[] {
  const worldSize = options.worldSize ?? DEFAULT_WORLD_SIZE
  const scale = worldSize / ATLAS_SIZE
  const ordered = orderAtlasAreas(areas)
  const placements = layoutAtlas(ordered.map((area) => area.id))

  return ordered.map((area, index) => ({
    id: area.id,
    slug: area.slug,
    name: area.name,
    x: (placements[index].x - ATLAS_SIZE / 2) * scale,
    z: (placements[index].y - ATLAS_SIZE / 2) * scale,
    radius: (options.zoneRadius ?? DEFAULT_ZONE_RADIUS) * scale,
    hasData: area.texteCount > 0,
    tagIds: area.tagIds
  }))
}

/** Zone sous une position au sol (la plus proche si plusieurs se touchent), ou `null`. Pour la détection d'entrée. */
export function zoneAt(zones: readonly WorldZone[], x: number, z: number): WorldZone | null {
  let found: WorldZone | null = null
  let best = Infinity
  for (const zone of zones) {
    const distance = Math.hypot(zone.x - x, zone.z - z)
    if (distance <= zone.radius && distance < best) {
      found = zone
      best = distance
    }
  }
  return found
}
