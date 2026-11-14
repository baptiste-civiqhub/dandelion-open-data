import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { contrastRatio, WCAG_AA } from '@/lib/color/contrast'

import {
  buildCss,
  buildMarkdown,
  buildTs,
  CSS_OUT,
  loadSource,
  MD_OUT,
  resolveColor,
  TS_OUT,
  validateSource
} from '../../scripts/build-tokens.mjs'

const source = loadSource()
const color = (key: string) => resolveColor(source, key)
const normalize = (content: string) => content.replace(/\r\n/g, '\n')

describe('design-system token source', () => {
  it('is valid: every semantic token references an existing primitive, never a raw value', () => {
    expect(validateSource(source)).toEqual([])
  })

  it('keeps the full brand palette (153 references)', () => {
    expect(Object.keys(source.palette).filter((key) => !key.startsWith('world-'))).toHaveLength(153)
  })

  it('only holds valid colour literals in the palette', () => {
    for (const value of Object.values(source.palette)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$|^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, 0?\.\d+\)$/)
    }
  })
})

describe('generated tokens', () => {
  it('are up to date with the source (run `pnpm tokens:build` otherwise)', () => {
    expect(normalize(readFileSync(CSS_OUT, 'utf8'))).toBe(buildCss(source))
    expect(normalize(readFileSync(TS_OUT, 'utf8'))).toBe(buildTs(source))
    expect(normalize(readFileSync(MD_OUT, 'utf8'))).toBe(buildMarkdown(source))
  })

  it('remove the default Tailwind palette so only design-system colours exist', () => {
    expect(buildCss(source)).toContain('--color-*: initial;')
  })
})

describe('WCAG AA contrast of critical pairs (light mode)', () => {
  const textPairs: Array<[string, string]> = [
    ['foreground', 'background'],
    ['foreground-secondary', 'background'],
    ['muted-foreground', 'background'],
    ['muted-foreground', 'muted'],
    ['foreground', 'secondary'],
    ['card-foreground', 'card'],
    ['primary-foreground', 'primary'],
    ['cta-foreground', 'cta'],
    ['cta-foreground', 'cta-hover'],
    ['cta-foreground', 'cta-pressed'],
    ['destructive-foreground', 'destructive'],
    ['foreground', 'feedback-success-soft'],
    ['foreground', 'feedback-danger-soft']
  ]

  it.each(textPairs)('%s on %s reaches 4.5:1', (text, surface) => {
    expect(contrastRatio(color(text), color(surface))).toBeGreaterThanOrEqual(WCAG_AA.text)
  })

  it('keeps the focus ring visible against the canvas (3:1)', () => {
    expect(contrastRatio(color('ring'), color('background'))).toBeGreaterThanOrEqual(WCAG_AA.nonText)
  })

  it('documents subtle-foreground as non-essential only (below 4.5:1)', () => {
    expect(contrastRatio(color('subtle-foreground'), color('background'))).toBeLessThan(WCAG_AA.text)
  })
})
