// @ts-check
import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

const AMDT = (number) => `senat-2023-2024-620-amdt-${number}`

// Contexte SYNTHÉTIQUE, limité à ces tests : il ne remplace pas data/pfas/evidence-context.json (fourni par le coordinateur).
const SYNTHETIC_CONTEXT = {
  schemaVersion: 1,
  retrievedAtUtc: '2000-01-01T00:00:00Z',
  scope: 'Contexte synthétique de test',
  sources: [
    {
      id: 'src-synthetic',
      title: 'Source synthétique de test',
      url: 'https://www.senat.fr/synthetic-source.html',
      publisher: 'Test',
      kind: 'official',
      retrievedAtUtc: '2000-01-01T00:00:00Z',
      publishedAt: null,
      licenceUrl: 'https://data.senat.fr/licence/',
      note: 'Valeurs de test uniquement'
    }
  ],
  documents: [
    {
      id: 'doc-later',
      title: 'Document synthétique B',
      kind: 'Rapport',
      date: '2000-02-01',
      url: 'https://www.senat.fr/synthetic-b.html',
      sourceId: 'src-synthetic'
    },
    {
      id: 'doc-first',
      title: 'Document synthétique A',
      kind: 'Texte',
      date: '2000-01-15',
      url: 'https://www.senat.fr/synthetic-a.html',
      sourceId: 'src-synthetic'
    }
  ],
  joins: [
    {
      id: 'j1',
      fromId: 'doc-first',
      toId: 'doc-later',
      relation: 'official-reference',
      method: 'Lien du dossier',
      evidence: 'Preuve A',
      sourceIds: ['src-synthetic']
    },
    {
      id: 'j2',
      fromId: AMDT(26),
      toId: 'doc-first',
      relation: 'source-url-match',
      method: 'URL identique',
      evidence: 'Preuve B',
      sourceIds: ['src-synthetic']
    },
    {
      id: 'j3',
      fromId: AMDT(32),
      toId: 'doc-later',
      relation: 'context',
      method: 'Sélection manuelle',
      evidence: 'Preuve C',
      sourceIds: ['src-synthetic']
    }
  ],
  facts: [
    {
      id: 'f1',
      title: 'Repère synthétique',
      text: 'Texte de test',
      sourceIds: ['src-synthetic'],
      limitation: 'Limite de test'
    }
  ],
  hemicycle: {
    status: 'not-integrated',
    retrievedAtUtc: null,
    dataset: null,
    rows: 0,
    matchedRows: 0,
    sourceId: null,
    note: 'Non intégré (test)'
  }
}

const serveContext = (page, body, status = 200) =>
  page.route('**/api/pfas/evidence', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  )

function trackErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  return errors
}

async function open(page, path = '/experiments/pfas') {
  await page.goto(path)
  await expect(page.getByTestId('evidence-journey')).toBeVisible()
}

test('question A selects 26 and 27 with their withdrawn outcomes and links to the comparison', async ({ page }) => {
  const errors = trackErrors(page)
  await open(page)
  const button = page.getByTestId('evidence-question-wording')
  await expect(button).toContainText('Quelles différences entre ces deux amendements ?')
  await button.focus()
  await page.keyboard.press('Enter')
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  const result = page.getByTestId('evidence-result')
  await expect(result.getByText('Retiré', { exact: true })).toHaveCount(2)
  await expect(result).toContainText('ne reconstitue pas une succession de versions')
  for (const number of [26, 27]) {
    await expect(
      result.locator(`a[href="https://www.senat.fr/amendements/2023-2024/620/Amdt_${number}.html"]`)
    ).toBeVisible()
    await expect(page.getByTestId(`pfas-compare-${number}`)).toBeVisible()
  }
  await page.getByRole('button', { name: 'Vider la sélection', exact: true }).click()
  await result.getByRole('button', { name: 'Aller à la comparaison' }).click()
  await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
  await expect(page.locator('#pfas-comparison-title')).toBeFocused()
  expect(errors).toEqual([])
})

for (const path of ['/experiments/pfas', '/experiments/pfas/cosmograph']) {
  test(`question B focuses 32 and its sourced parent 14 (${path})`, async ({ page }) => {
    const errors = trackErrors(page)
    await open(page, path)
    await page.getByTestId('evidence-question-parent').click()
    const result = page.getByTestId('evidence-result')
    await expect(result).toContainText("Le n° 32 est un sous-amendement de l'amendement n° 14")
    await expect(result).toContainText('Preuve enregistrée')
    await expect(result.locator('a[href="https://www.senat.fr/amendements/2023-2024/620/Amdt_32.html"]')).toBeVisible()
    await expect(page.getByTestId('pfas-compare-32')).toBeVisible()
    await expect(page.getByTestId('pfas-compare-14')).toBeVisible()
    await expect(page.getByTestId('pfas-detail')).toContainText('32')
    await expect(page.getByTestId('pfas-parent')).toContainText('14')
    await result.getByRole('button', { name: 'Aller au détail du n° 32' }).click()
    await expect(page.locator('#pfas-detail-title')).toBeFocused()
    expect(errors.filter((message) => !/WebGL|GPU stall/i.test(message))).toEqual([])
  })
}

test('question C shows the typed document trail and exports it locally', async ({ page }) => {
  const errors = trackErrors(page)
  await serveContext(page, SYNTHETIC_CONTEXT)
  await open(page)
  await page.getByTestId('evidence-question-trail').click()
  const documents = page.getByTestId('evidence-document')
  await expect(documents).toHaveCount(2)
  await expect(documents.first()).toContainText('Document synthétique A')
  const joins = page.getByTestId('evidence-join')
  await expect(joins).toHaveCount(3)
  await expect(joins.nth(0)).toContainText('Lien de document officiel')
  await expect(joins.nth(1)).toContainText("Correspondance exacte d'URL source")
  await expect(joins.nth(1)).toContainText('Amendement n° 26 → Document synthétique A')
  await expect(joins.nth(2)).toContainText('Référence contextuelle sélectionnée')
  await expect(page.getByTestId('evidence-trail')).toContainText('aucun lien de cause')

  await page.getByTestId('evidence-disclosure').locator('summary').click()
  await expect(page.getByTestId('evidence-hemicycle')).toContainText('Hémicycle non intégré')
  await expect(page.getByTestId('evidence-hemicycle')).toContainText('0 lignes, dont 0 rapprochées')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('evidence-export').click()])
  expect(download.suggestedFilename()).toBe('pfas-parcours-documentaire.md')
  const markdown = await readFile(await download.path(), 'utf8')
  expect(markdown).toContain('# Parcours documentaire PFAS')
  expect(markdown).toContain('Hémicycle non intégré')
  expect(markdown).toContain('## Limites')
  expect(markdown).toContain('aucun lien de cause')
  expect(markdown.match(/→/g)).toHaveLength(3)
  expect(errors).toEqual([])
})

test('an invalid context is rejected explicitly while the graph and presets stay usable', async ({ page }) => {
  await serveContext(page, {
    ...SYNTHETIC_CONTEXT,
    documents: [{ ...SYNTHETIC_CONTEXT.documents[0], url: 'http://insecure.test' }]
  })
  await open(page)
  await page.getByTestId('evidence-question-trail').click()
  await expect(page.getByTestId('evidence-error')).toContainText('invalide')
  await expect(page.getByTestId('evidence-trail')).toHaveCount(0)
  await expect(page.getByTestId('native-graph')).toHaveAttribute('data-node-count', '41')
  await page.getByTestId('evidence-question-wording').click()
  await expect(page.getByTestId('pfas-compare-27')).toBeVisible()
})

test('a failed context request keeps the experiment usable', async ({ page }) => {
  await serveContext(page, { detail: 'unavailable' }, 404)
  await open(page)
  await page.getByTestId('evidence-disclosure').locator('summary').click()
  await expect(page.getByTestId('evidence-error')).toBeVisible()
  await expect(page.getByTestId('native-graph')).toHaveAttribute('data-node-count', '41')
})

test('the evidence journey stays readable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await serveContext(page, SYNTHETIC_CONTEXT)
  await open(page)
  await page.getByTestId('evidence-question-trail').click()
  await expect(page.getByTestId('evidence-trail')).toBeVisible()
  await page.getByTestId('evidence-disclosure').locator('summary').click()
  await expect(page.getByTestId('evidence-sources')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('question C renders the versioned coordinator context when it is present', async ({ page, request }) => {
  const response = await request.get('/api/pfas/evidence')
  test.skip(response.status() === 404, 'data/pfas/evidence-context.json is not present in this checkout')
  const context = await response.json()
  const errors = trackErrors(page)
  await open(page)
  await page.getByTestId('evidence-question-trail').click()
  await expect(page.getByTestId('evidence-document')).toHaveCount(context.documents.length)
  await expect(page.getByTestId('evidence-join')).toHaveCount(context.joins.length)
  for (const [index, join] of context.joins.entries()) {
    await expect(page.getByTestId('evidence-join').nth(index).getByRole('link')).toHaveCount(join.sourceIds.length)
  }
  for (const [index, fact] of context.facts.entries()) {
    const card = page.getByTestId('evidence-fact').nth(index)
    for (const sourceId of fact.sourceIds) {
      const source = context.sources.find((item) => item.id === sourceId)
      await expect(card.getByRole('link', { name: source.title, exact: true })).toHaveAttribute('href', source.url)
    }
  }
  for (const document of context.documents) {
    await expect(page.getByTestId('evidence-trail').locator(`a[href="${document.url}"]`).first()).toBeVisible()
  }
  await page.getByTestId('evidence-disclosure').locator('summary').click()
  const status = context.hemicycle.status === 'verified-snapshot' ? 'pas un import en direct' : 'Hémicycle non intégré'
  await expect(page.getByTestId('evidence-hemicycle')).toContainText(status)
  await expect(page.getByTestId('evidence-hemicycle')).toContainText(
    `${context.hemicycle.rows} lignes, dont ${context.hemicycle.matchedRows} rapprochées`
  )
  await expect(page.getByTestId('evidence-source')).toHaveCount(context.sources.length)
  expect(errors).toEqual([])
})
