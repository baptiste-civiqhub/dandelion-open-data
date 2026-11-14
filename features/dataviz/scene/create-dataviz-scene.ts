import type { StageSceneFactory, StageSize } from '@/lib/stage/stage-scene'

import { layoutDots, stagePlotInsets, type AmendementColumn } from '../lib/dot-chart'
import { CHART_TOKENS, chartCssVariable, type ChartToken } from '../lib/sort-colors'

export type DatavizSceneOptions = {
  /** Les amendements, groupés par article et prêts à dessiner (`groupAmendementsByArticle`). */
  columns: readonly AmendementColumn[]
  /** Série de couleur de chaque code de sort. Un code absent prend la première série. */
  chartTokenBySort: Readonly<Record<string, ChartToken>>
}

/**
 * Scène de fond d'une page de zone (docs/webui.md § Pages de dataviz). GRAPHIQUE PROVISOIRE : un point par
 * amendement, empilés par article et colorés par sort, dessinés en 2D dans l'espace laissé libre par les widgets.
 * Il prouve le trajet des données jusqu'au canvas ; la dataviz définitive le remplacera ici. Scène statique :
 * redessinée à chaque redimensionnement, sans boucle d'animation. Les couleurs sont lues dans les tokens au montage.
 */
export function createDatavizScene(options: DatavizSceneOptions): StageSceneFactory {
  return ({ canvas }) => {
    const context = canvas.getContext('2d')
    if (!context) return {}

    const styles = getComputedStyle(document.documentElement)
    const colorByToken = Object.fromEntries(
      CHART_TOKENS.map((token) => [token, styles.getPropertyValue(chartCssVariable(token)).trim()])
    ) as Record<ChartToken, string>

    const draw = (size: StageSize) => {
      context.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0)
      context.clearRect(0, 0, size.width, size.height)

      const dots = layoutDots(options.columns, {
        width: size.width,
        height: size.height,
        ...stagePlotInsets(size.width)
      })
      for (const dot of dots) {
        context.fillStyle = colorByToken[options.chartTokenBySort[dot.sortCode] ?? CHART_TOKENS[0]]
        context.beginPath()
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2)
        context.fill()
      }
    }

    return { resize: draw }
  }
}
