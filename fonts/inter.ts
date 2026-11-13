import { Inter } from 'next/font/google'

/**
 * Inter : seule police de texte de la marque (titres, corps, libellés, données). Police variable,
 * téléchargée au build et auto-hébergée par next/font (aucun appel à Google côté visiteur).
 * Exposée en `--font-inter`, consommée par le token `--font-sans` (design-system/tokens/source).
 */
export const InterFont = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter'
})
