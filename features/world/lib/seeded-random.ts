/** Générateur pseudo-aléatoire déterministe (Park-Miller) : le même monde à chaque chargement. */
export type Random = () => number

export function createRandom(seed = 7): Random {
  let state = Math.abs(Math.floor(seed)) % 2147483647 || 1
  return () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
}
