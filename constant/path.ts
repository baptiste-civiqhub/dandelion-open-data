// Source unique des chemins internes : jamais de chaîne de route en dur dans un composant.
export const PUBLIC_PATHS = {
  HOME: '/',
  PFAS_EXPERIMENT: '/experiments/pfas'
} as const

export const API_PATHS = {
  HEALTH: '/api/health',
  PFAS_AMENDMENTS: '/api/pfas'
} as const

export const ASSET_PATHS = {
  /** Icône du site, générée depuis la géométrie du pictogramme (app/brand/mark.svg/route.ts). */
  BRAND_MARK: '/brand/mark.svg'
} as const
