import { expect, it } from 'vitest'
import { areaToFlowerDataset, normalizeDocumentText, safeDocumentUrl } from './area-flower'
it('keeps API identity and provenance without inventing missing texts or URLs', () => {
  const texte = { id: 't', uid: 'u', titre: 'Loi exemple', etapeTexte: null }
  const result = areaToFlowerDataset(
    {
      id: 'd',
      slug: 'loi',
      name: 'Loi',
      description: null,
      sourceLabel: 'Hémicycle',
      license: 'Licence ouverte',
      importedAt: '2026-11-14',
      textes: [texte],
      tags: []
    },
    texte,
    [{ id: 'ar', designation: 'Article 1', titre: null, ordre: 1 }],
    [
      {
        id: 'a',
        numeroLong: 'CF1',
        articleId: 'ar',
        alineaId: null,
        parentId: null,
        divisionAvantApres: 'APRES',
        rang: 1,
        sort: 'retire'
      }
    ],
    [{ code: 'retire', label: 'Retiré', displayOrder: 1, colorToken: '--sort-non-vote' }]
  )
  expect(result.snapshot.amendments[0]).toMatchObject({
    id: 'a',
    numero: 'CF1',
    article: 'Après Article 1',
    dispositif: '',
    sort: 'Retiré'
  })
  expect(result.sourceUrls.a).toBeNull()
  expect(result.provenance.sourceUrl).toBeNull()
  expect(result.detailsOnDemand).toBe(true)
})
it('converts document markup without removing inequalities or exposing executable text', () => {
  expect(normalizeDocumentText('<p>5 &lt; 10 &amp; 12&nbsp;€</p><p>&#233;t&#xE9;</p><script>bad()</script>')).toBe(
    '5 < 10 & 12 €\nété'
  )
  expect(normalizeDocumentText('5 < 10\nArticle 2')).toBe('5 < 10\nArticle 2')
  expect(normalizeDocumentText(null)).toBe('')
})
it('only exposes supplied safe HTTP document URLs', () => {
  expect(safeDocumentUrl('https://www.senat.fr/a.html')).toBe('https://www.senat.fr/a.html')
  for (const value of [null, '', 'javascript:alert(1)', 'https://user:pass@example.org/', 'not a URL'])
    expect(safeDocumentUrl(value)).toBeNull()
})
