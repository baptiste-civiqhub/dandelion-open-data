import { describe, expect, it } from 'vitest'

import { CHART_TOKENS, chartCssVariable, chartTokenForSort } from './sort-colors'

const SORT_TOKENS = ['--sort-adopte', '--sort-rejete', '--sort-non-vote', '--sort-irrecevable', '--sort-en-attente']

describe('chartTokenForSort', () => {
  it('gives each colour token of the sorts table its own chart series', () => {
    const tokens = SORT_TOKENS.map(chartTokenForSort)
    expect(new Set(tokens).size).toBe(SORT_TOKENS.length)
    for (const token of tokens) expect(CHART_TOKENS).toContain(token)
  })

  it('falls back to the first series for an unknown token', () => {
    expect(chartTokenForSort('--sort-inconnu')).toBe('chart-1')
    expect(chartTokenForSort('')).toBe('chart-1')
  })
})

describe('chartCssVariable', () => {
  it('names the CSS variable of the token', () => {
    expect(chartCssVariable('chart-3')).toBe('--color-chart-3')
  })
})
