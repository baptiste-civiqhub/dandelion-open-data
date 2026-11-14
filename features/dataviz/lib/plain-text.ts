const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/**
 * Texte lisible d'un champ servi en HTML par la source (`dispositif`, `expose_sommaire`) : balises retirées,
 * paragraphes conservés, entités décodées. Jamais injecté comme HTML.
 */
export function toPlainText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16))
      if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10))
      return ENTITIES[entity.toLowerCase()] ?? match
    })
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}
