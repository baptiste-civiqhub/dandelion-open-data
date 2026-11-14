import { SHARED_COLOR_NAMES } from '../lib/world-colors'
import type { ColorName } from './world-kit'

/** Couleur de secours si un token manque (tokens non régénérés) : visible, jamais une valeur de marque. */
const MISSING_TOKEN = 'silver'

/**
 * Lit les couleurs du monde dans les tokens au montage : `--color-world-<nom>` pour les couleurs propres au monde,
 * `--color-<nom>` pour celles empruntées au design system. Aucune valeur n'est écrite dans le code.
 */
export function readWorldPalette(): (name: ColorName) => string {
  const styles = getComputedStyle(document.documentElement)
  const shared = new Set<string>(SHARED_COLOR_NAMES)
  const cache = new Map<string, string>()
  return (name) => {
    let value = cache.get(name)
    if (value === undefined) {
      value =
        styles.getPropertyValue(shared.has(name) ? `--color-${name}` : `--color-world-${name}`).trim() || MISSING_TOKEN
      cache.set(name, value)
    }
    return value
  }
}
