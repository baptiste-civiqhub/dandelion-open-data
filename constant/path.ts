// Source unique des chemins internes : jamais de chaîne de route en dur dans un composant.
export const PUBLIC_PATHS = {
  /** Landing : monde WebGL navigable (features/world). */
  HOME: '/',
  ABOUT: '/about',
  /** Catalogue des zones (recherche via SEARCH_PARAMS.QUERY). Aussi ouvert en fenêtre par le menu « Area ». */
  AREAS: '/area',
  /** Page de dataviz d'une zone (features/dataviz). `areaId` : le slug de la zone, ou son identifiant. */
  AREA_DETAIL: (areaId: string) => `/area/${encodeURIComponent(areaId)}`
} as const

/** Paramètres d'URL partagés entre pages (la barre de recherche du header écrit `?q=` sur le catalogue). */
export const SEARCH_PARAMS = {
  QUERY: 'q'
} as const

export const API_PATHS = {
  HEALTH: '/api/health'
} as const

export const ASSET_PATHS = {
  /** Icône du site, générée depuis la géométrie du pictogramme (app/brand/mark.svg/route.ts). */
  BRAND_MARK: '/brand/mark.svg'
} as const
