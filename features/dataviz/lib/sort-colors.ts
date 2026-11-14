export const CHART_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const

export type ChartToken = (typeof CHART_TOKENS)[number]

/**
 * La table `sorts` nomme cinq variables CSS (`color_token`) qui n'existent pas dans le design system. En attendant
 * des tokens dédiés, chacune est portée par une série catégorielle `chart-*`.
 */
const CHART_TOKEN_BY_SORT_TOKEN: Record<string, ChartToken> = {
  '--sort-en-attente': 'chart-1',
  '--sort-adopte': 'chart-2',
  '--sort-rejete': 'chart-3',
  '--sort-irrecevable': 'chart-4',
  '--sort-non-vote': 'chart-5'
}

const FALLBACK_CHART_TOKEN: ChartToken = 'chart-1'

export function chartTokenForSort(colorToken: string): ChartToken {
  return CHART_TOKEN_BY_SORT_TOKEN[colorToken] ?? FALLBACK_CHART_TOKEN
}

/** Variable CSS du token, à lire au montage d'une scène (`getComputedStyle`). */
export function chartCssVariable(token: ChartToken): string {
  return `--color-${token}`
}
