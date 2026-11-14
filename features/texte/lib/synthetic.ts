import type { Amendment, TexteSnapshot } from '@/apis/texte/types'

const OPENINGS = [
  'Supprimer cet article.',
  'Rédiger ainsi cet alinéa :',
  'Compléter par les mots :',
  'Substituer aux mots :',
  ''
]

/**
 * Jeu SYNTHÉTIQUE déterministe pour les tests de charge : jamais présenté comme un corpus parlementaire.
 * `heavyShare` concentre une part des amendements sur le premier article (branche lourde).
 */
export const syntheticSnapshot = (count: number, options: { articles?: number; heavyShare?: number } = {}) => {
  const articles = Math.max(1, options.articles ?? Math.max(1, Math.round(Math.sqrt(count) / 2)))
  const heavy = Math.floor(count * (options.heavyShare ?? 0))
  const amendments: Amendment[] = []
  for (let i = 0; i < count; i += 1) {
    const article = i < heavy ? 0 : i % articles
    amendments.push({
      id: `synthetic-${i}`,
      numero: `S${i + 1}`,
      article: `Article synthétique ${article + 1}`,
      dispositif: `${OPENINGS[i % OPENINGS.length]} texte synthétique ${i}`,
      expose: null,
      parentId: i % 17 === 5 && i > 0 ? `synthetic-${i - 1}` : null,
      discussionCommune: i % 11 === 0 ? `commune-${article}-${i % 3}` : null,
      discussionIdentique: null,
      authorLabel: null,
      groupLabel: null,
      sort: null
    })
  }
  const snapshot: TexteSnapshot = {
    id: `synthetic-${count}`,
    titre: `Jeu synthétique (${count})`,
    sourceNom: 'synthétique',
    sourceUrl: 'about:blank',
    licence: 'synthétique',
    amendments
  }
  return snapshot
}
