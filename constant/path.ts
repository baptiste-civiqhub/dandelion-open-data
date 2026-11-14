// Source unique des chemins internes : jamais de chaîne de route en dur dans un composant.
export const PUBLIC_PATHS = {
  /** Landing : monde WebGL navigable (features/world). */
  HOME: '/',
  ABOUT: '/about',
  PFAS_EXPERIMENT: '/experiments/pfas',
  PFAS_COSMOGRAPH: '/experiments/pfas/cosmograph',
  /** Catalogue des jeux de données (recherche via SEARCH_PARAMS.QUERY). */
  DATASETS: '/datasets',
  /** Page de dataviz d'un jeu de données (features/dataviz). */
  DATASET_DETAIL: (datasetId: string) => `/datasets/${encodeURIComponent(datasetId)}`
} as const

/** Paramètres d'URL partagés entre pages (la barre de recherche du header écrit `?q=` sur le catalogue). */
export const SEARCH_PARAMS = {
  QUERY: 'q'
} as const

export const API_PATHS = {
  HEALTH: '/api/health',
  PFAS_AMENDMENTS: '/api/pfas',
  PFAS_EVIDENCE: '/api/pfas/evidence'
} as const

export const ASSET_PATHS = {
  /** Icône du site, générée depuis la géométrie du pictogramme (app/brand/mark.svg/route.ts). */
  BRAND_MARK: '/brand/mark.svg'
} as const
