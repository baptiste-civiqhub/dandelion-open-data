import type { AmendementSummary } from '@/apis/amendements/types'
import type { Article } from '@/apis/articles/types'

/** Les amendements d'un article, dans l'ordre de discussion. `articleId` vide : amendements sans article connu. */
export type AmendementColumn = {
  articleId: string | null
  sortCodes: string[]
}

/**
 * Une colonne par article, dans l'ordre du texte, y compris les articles sans amendement. Les amendements gardent
 * l'ordre reçu. Ceux dont l'article est vide ou inconnu sont réunis dans une dernière colonne, seulement s'il y en a.
 */
export function groupAmendementsByArticle(
  articles: readonly Pick<Article, 'id' | 'ordre'>[],
  amendements: readonly Pick<AmendementSummary, 'articleId' | 'sort'>[]
): AmendementColumn[] {
  const columns = [...articles]
    .sort((a, b) => a.ordre - b.ordre)
    .map((article): AmendementColumn => ({ articleId: article.id, sortCodes: [] }))
  const columnByArticle = new Map(columns.map((column) => [column.articleId, column]))
  const orphans: AmendementColumn = { articleId: null, sortCodes: [] }

  for (const amendement of amendements) {
    const column = (amendement.articleId && columnByArticle.get(amendement.articleId)) || orphans
    column.sortCodes.push(amendement.sort)
  }

  return orphans.sortCodes.length > 0 ? [...columns, orphans] : columns
}

export type DotLayoutOptions = {
  width: number
  height: number
  /** Marges de la zone de dessin, en px : les widgets latéraux et le header couvrent le reste du canvas. */
  insetX: number
  insetTop: number
  insetBottom: number
  maxDotSize?: number
  minDotSize?: number
}

const WIDE_STAGE_MIN_WIDTH = 1024
const WIDE_SIDE_RATIO = 0.28

/**
 * Zone libre du canvas sous l'interface du Stage : à partir de `lg`, les colonnes de widgets couvrent un peu plus
 * d'un quart de la largeur de chaque côté ; en dessous, elles s'empilent et le graphique garde toute la largeur.
 * Le haut réserve le header flottant.
 */
export function stagePlotInsets(width: number): Pick<DotLayoutOptions, 'insetX' | 'insetTop' | 'insetBottom'> {
  return {
    insetX: width >= WIDE_STAGE_MIN_WIDTH ? Math.round(width * WIDE_SIDE_RATIO) : 24,
    insetTop: 112,
    insetBottom: 48
  }
}

export type Dot = {
  x: number
  y: number
  radius: number
  sortCode: string
  column: number
}

const DEFAULT_MAX_DOT_SIZE = 14
const DEFAULT_MIN_DOT_SIZE = 3
const COLUMN_GAP_RATIO = 0.25

/**
 * Graphique en points : un point par amendement, empilés de bas en haut par article. La taille du point est la plus
 * grande qui fait tenir la colonne la plus chargée dans la hauteur ; à la taille minimale, le surplus déborde vers
 * le haut plutôt que de disparaître.
 */
export function layoutDots(columns: readonly AmendementColumn[], options: DotLayoutOptions): Dot[] {
  const plotWidth = options.width - 2 * options.insetX
  const plotHeight = options.height - options.insetTop - options.insetBottom
  if (columns.length === 0 || plotWidth <= 0 || plotHeight <= 0) return []

  const slot = plotWidth / columns.length
  const inner = slot * (1 - COLUMN_GAP_RATIO)
  const tallest = Math.max(...columns.map((column) => column.sortCodes.length))
  const maxSize = options.maxDotSize ?? DEFAULT_MAX_DOT_SIZE
  const minSize = Math.min(options.minDotSize ?? DEFAULT_MIN_DOT_SIZE, maxSize)

  const gapFor = (size: number) => Math.max(1, Math.round(size * 0.3))
  const perRowFor = (size: number) => Math.max(1, Math.floor((inner + gapFor(size)) / (size + gapFor(size))))
  const fits = (size: number) => {
    const rows = Math.ceil(tallest / perRowFor(size))
    return rows * (size + gapFor(size)) - gapFor(size) <= plotHeight
  }

  let size = maxSize
  while (size > minSize && !fits(size)) size -= 1

  const gap = gapFor(size)
  const cell = size + gap
  const perRow = perRowFor(size)
  const blockWidth = perRow * cell - gap
  const bottom = options.insetTop + plotHeight

  return columns.flatMap((column, columnIndex) => {
    const left = options.insetX + columnIndex * slot + (slot - blockWidth) / 2
    return column.sortCodes.map((sortCode, index) => ({
      x: left + (index % perRow) * cell + size / 2,
      y: bottom - Math.floor(index / perRow) * cell - size / 2,
      radius: size / 2,
      sortCode,
      column: columnIndex
    }))
  })
}
