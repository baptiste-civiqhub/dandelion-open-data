// Source unique des chemins internes : jamais de chaîne de route en dur dans un composant.
export const PUBLIC_PATHS = {
  HOME: '/'
} as const

export const API_PATHS = {
  HEALTH: '/api/health'
} as const

export const ASSET_PATHS = {
  /** Icône du site, générée depuis la géométrie du pictogramme (app/brand/mark.svg/route.ts). */
  BRAND_MARK: '/brand/mark.svg'
} as const
