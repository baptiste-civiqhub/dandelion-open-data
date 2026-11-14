import { describe, expect, it } from 'vitest'

import type { PfasSnapshot } from '@/apis/pfas-amendments/types'
import snapshotJson from '@/data/pfas/amendments.json'

import { diffTexts, uniquePassages } from './lexical-diff'
import { buildHierarchy } from './hierarchy'
import { classifyOutcome } from './outcome'
import { toSafeSenateUrl } from './source-url'

const snapshot = snapshotJson as PfasSnapshot
const byNumber = new Map(snapshot.amendments.map((a) => [a.number, a]))
const get = (n: string) => byNumber.get(n)!

describe('committed Senate snapshot (text 620, 2023-2024)', () => {
  it('matches the verified source file', () => {
    expect(snapshot.provenance.sha256).toBe('08ed07be1de3dd53b1888484e5b209ba2a39ff43f0ade88f23a9c25128e49337')
    expect(snapshot.provenance.bytes).toBe(62948)
    expect(snapshot.amendments).toHaveLength(32)
  })

  it('has 17 rows exactly under Article 1er, including one sub-amendment', () => {
    const rows = snapshot.amendments.filter((a) => a.subdivision === 'Article 1er')
    expect(rows).toHaveLength(17)
    expect(rows.filter((a) => a.nature === 'S/Amt').map((a) => a.number)).toEqual(['32'])
    const group = buildHierarchy(snapshot.amendments).find((g) => g.subdivision === 'Article 1er')!
    expect(group.total).toBe(17)
    expect(group.nodes).toHaveLength(16)
  })

  it('keeps official outcomes as recorded', () => {
    const counts: Record<string, number> = {}
    for (const a of snapshot.amendments)
      counts[classifyOutcome(a.outcomeRaw)] = (counts[classifyOutcome(a.outcomeRaw)] ?? 0) + 1
    expect(counts).toEqual({ rejected: 18, adopted: 7, withdrawn: 6, inadmissible: 1 })
    expect(['26', '27', '28'].map((n) => get(n).outcomeRaw)).toEqual(['Retiré', 'Retiré', 'Retiré'])
  })

  it('links 32 to 14 only through the curated, sourced relation', () => {
    expect(get('32').parentId).toBe(get('14').id)
    expect(get('32').parentRelation?.sourceUrl).toBe('https://www.senat.fr/amendements/2023-2024/620/Amdt_32.html')
    expect(snapshot.amendments.filter((a) => a.parentId).map((a) => a.number)).toEqual(['32'])
  })

  it('distinguishes additional articles from modifications of the neighbouring article', () => {
    expect(get('9').targetPlacement).toEqual({ kind: 'additional-article', position: 'after', article: 'Article 1er' })
    expect(get('26').targetPlacement).toEqual({ kind: 'article', position: null, article: 'Article 1er' })
  })

  it('extracts readable text without HTML, joined words or lost dates', () => {
    for (const a of snapshot.amendments) {
      expect(a.proposalText).not.toMatch(/<\/?[a-z][^>]*>|&#\d+;|&[a-z]+;/i)
      expect(a.explanatoryText).not.toMatch(/<\/?[a-z][^>]*>|&#\d+;|&[a-z]+;/i)
      expect(`${a.proposalText} ${a.explanatoryText}`).not.toMatch(/\b1 er\b/)
    }
    expect(get('3').proposalText).toContain('à compter du 1er janvier 2030, la fabrication')
    expect(get('12').proposalText).toContain('à compter du 1er janvier 2026')
    expect(get('26').proposalText.split('\n\n')).toEqual([
      'Alinéa 9',
      'Après les mots :',
      'utilisations essentielles',
      'insérer les mots :',
      ', des textiles de construction'
    ])
  })

  it('keeps 26, 27 and 28 distinct', () => {
    const d2627 = diffTexts(get('26').proposalText, get('27').proposalText)!
    expect(uniquePassages(get('27').proposalText, d2627.b)).toEqual(['utilisant des fluoropolymères'])
    const d2628 = diffTexts(get('26').proposalText, get('28').proposalText)!
    expect(uniquePassages(get('26').proposalText, d2628.a)).toEqual(['textiles de construction'])
  })

  it('shows 3, 13 and 20 differ only typographically', () => {
    expect(diffTexts(get('13').proposalText, get('20').proposalText)!.onlyInA).toBe(0)
    expect(diffTexts(get('3').proposalText, get('13').proposalText)!.onlyInA).toBeGreaterThan(0)
    const loose = diffTexts(get('3').proposalText, get('13').proposalText, { ignoreTypography: true })!
    expect([loose.onlyInA, loose.onlyInB]).toEqual([0, 0])
  })

  it('serves only https Senate links', () => {
    for (const a of snapshot.amendments) {
      if (a.sourceUrlRaw) expect(toSafeSenateUrl(a.sourceUrlRaw)).toBe(a.sourceUrl)
      else expect(a.sourceUrl).toBeNull()
    }
    expect(get('19').sourceUrl).toBeNull()
  })
})
