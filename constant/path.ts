// Source unique des chemins internes : jamais de chaîne de route en dur dans un composant.
export const PUBLIC_PATHS = {
  HOME: '/',
  TEXTE: '/texte'
} as const

export const API_PATHS = {
  HEALTH: '/api/health'
} as const
