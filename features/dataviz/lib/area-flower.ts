import type { AmendementSummary } from '@/apis/amendements/types'
import type { AreaDetail, AreaTexte } from '@/apis/areas/types'
import type { Article } from '@/apis/articles/types'
import type { Sort } from '@/apis/sorts/types'
import type { FlowerDataset } from '@/features/texte/lib/datasets'

export function safeDocumentUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export function normalizeDocumentText(raw: string | null): string {
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    eacute: 'é',
    egrave: 'è',
    agrave: 'à',
    rsquo: '’',
    lsquo: '‘',
    ndash: '–',
    mdash: '—',
    laquo: '«',
    raquo: '»',
    euro: '€'
  }
  return (raw ?? '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:p|div|br|li|h[1-6]|tr)\b[^>]*>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match
      const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)
        ? String.fromCodePoint(number)
        : match
    })
    .replace(/[\t \u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export function areaToFlowerDataset(
  area: AreaDetail,
  texte: AreaTexte,
  articles: Article[],
  amendments: AmendementSummary[],
  sorts: Sort[]
): FlowerDataset {
  const byArticle = new Map(articles.map((a) => [a.id, a.designation]))
  const bySort = new Map(sorts.map((s) => [s.code, s.label]))
  return {
    id: area.slug,
    detailsOnDemand: true,
    snapshot: {
      id: texte.id,
      titre: texte.titre,
      sourceNom: area.sourceLabel,
      sourceUrl: '',
      licence: area.license,
      amendments: amendments.map((a) => ({
        id: a.id,
        numero: a.numeroLong,
        article:
          (a.divisionAvantApres === 'APRES' ? 'Après ' : a.divisionAvantApres === 'AVANT' ? 'Avant ' : '') +
          (byArticle.get(a.articleId ?? '') ?? 'Article non renseigné'),
        dispositif: '',
        expose: null,
        parentId: a.parentId,
        discussionCommune: null,
        discussionIdentique: null,
        authorLabel: null,
        groupLabel: null,
        sort: bySort.get(a.sort) ?? a.sort
      }))
    },
    sourceUrls: Object.fromEntries(amendments.map((a) => [a.id, safeDocumentUrl(a.sourceUrl)])),
    provenance: {
      publisher: area.sourceLabel,
      sourceUrl: null,
      licence: area.license,
      origin: 'hemicycle-supabase',
      retrievedAtUtc: area.importedAt,
      sha256: null
    }
  }
}
