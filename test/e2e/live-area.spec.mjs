// @ts-check
import { expect, test } from '@playwright/test'

// Synthetic technical fixtures ONLY. They never enter the application corpus or its demo evidence.
test.skip(!process.env.API_FIXTURE_TESTS, 'Requires the dedicated server with a nonfunctional test key')
const base = 'https://mloaychfjhajdjfktcjp.supabase.co/rest/v1/'
const texte = { id: 't1', uid: 'T1', titre: 'Corpus technique synthétique', etape_texte: 'TEST' }
const dataset = {
  id: 'd1',
  slug: 'fixture',
  name: 'Zone de test',
  description: 'Fixture synthétique',
  source_label: 'API de test',
  license: 'Test',
  imported_at: '2026-11-14T10:00:00Z',
  tag_list_id: 'tags1',
  textes: [texte, { ...texte, id: 't2', uid: 'T2', titre: 'Second texte de test' }]
}
const records = [
  {
    id: 'a1',
    texte_id: 't1',
    uid: 'A1',
    numero_long: 'CF1',
    article_id: 'ar1',
    alinea_id: null,
    amendement_parent_id: null,
    division_avant_apres: 'A',
    rang: 1,
    sort: 'retire',
    dispositif: '<p>Interdire les produits en 2026.</p>',
    expose_sommaire: '<p>Exposé</p>',
    signataires_affichable: 'Auteur public de test',
    document_uri: 'https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html'
  },
  {
    id: 'a2',
    texte_id: 't1',
    uid: 'A2',
    numero_long: 'CF2',
    article_id: 'ar1',
    alinea_id: null,
    amendement_parent_id: null,
    division_avant_apres: 'APRES',
    rang: 2,
    sort: 'retire',
    dispositif: '<p>Interdire les produits en 2030.</p>',
    expose_sommaire: null,
    signataires_affichable: null,
    document_uri: null
  }
]
const sorts = [{ code: 'retire', label: 'Retiré', display_order: 1, color_token: '--sort-non-vote' }]
async function mockApi(page, scenario = {}) {
  const details = []
  await page.route(`${base}**`, async (route) => {
    const url = new URL(route.request().url())
    const table = url.pathname.split('/').pop()
    let data = []
    if (table === 'datasets') data = [{ ...dataset, textes: scenario.empty ? [] : dataset.textes }]
    if (table === 'articles') data = [{ id: 'ar1', designation: 'Article 1', titre: 'Test', ordre: 1 }]
    if (table === 'sorts') data = sorts
    if (table === 'amendements') {
      const id = url.searchParams.get('id')?.replace('eq.', '')
      const textId = url.searchParams.get('texte_id')?.replace('eq.', '')
      if (id) {
        details.push({ id, textId })
        if (scenario.failDetail) {
          await route.fulfill({ status: 503, json: { code: 'DOWN', message: 'Fixture outage' } })
          return
        }
        data = records.find((a) => a.id === id) ?? null
      } else
        data = textId === 't2' ? [] : records.map(({ dispositif, expose_sommaire, signataires_affichable, ...r }) => r)
    }
    await route.fulfill({ status: 200, json: data })
  })
  return details
}
test('API flower loads only summaries then compares requested texts via French guide', async ({ page }) => {
  const details = await mockApi(page)
  await page.goto('/area/fixture')
  await expect(page.getByTestId('flower-counts')).toContainText('pour 2 amendements')
  await expect(page.getByTestId('flower-frame').locator('svg')).toBeVisible()
  expect(details).toEqual([])
  await page.getByTestId('flower-guide').getByRole('textbox').fill('Compare CF1 et CF2')
  await page.getByTestId('flower-guide').getByRole('button', { name: 'Appliquer' }).click()
  const comparison = page.getByTestId('live-records')
  await expect(comparison.getByTestId('live-record-CF1')).toContainText('2026')
  await expect(comparison.getByTestId('live-record-CF2')).toContainText('2030')
  await expect(comparison.locator('mark')).toHaveText(['2026', '2030'])
  await expect(comparison.getByRole('link')).toHaveCount(1)
  await expect(comparison).toContainText('Lien officiel absent')
  await page.screenshot({ path: 'test-results/live-api-desktop.png', fullPage: true })
  expect(details).toEqual(
    expect.arrayContaining([
      { id: 'a1', textId: 't1' },
      { id: 'a2', textId: 't1' }
    ])
  )
  await page.getByRole('button', { name: 'Zoom avant', exact: true }).click()
  await expect(page.getByTestId('flower-scale')).toHaveText('Échelle 150 %')
  await page.getByLabel('Texte du corpus').selectOption('t2')
  await expect(page.getByTestId('live-records')).toHaveCount(0)
  await expect(page.getByTestId('flower-counts')).toContainText('pour 0 amendements')
})
test('API record failures remain explicit and can be retried', async ({ page }) => {
  const scenario = { failDetail: true }
  await mockApi(page, scenario)
  await page.goto('/area/fixture')
  await page.getByTestId('flower-guide').getByRole('button', { name: 'Montre CF1', exact: true }).click()
  await expect(page.getByTestId('live-records').getByRole('alert')).toContainText('Lecture impossible')
  await expect(page.getByTestId('live-records').getByRole('button', { name: 'Réessayer' })).toBeVisible()
  await expect(page.getByTestId('live-record-CF1')).toHaveCount(0)
  scenario.failDetail = false
  await page.getByTestId('live-records').getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByTestId('live-record-CF1')).toContainText('2026')
})
test('Atlas and catalogue share navigation, archived corpora remain reachable', async ({ page }) => {
  await mockApi(page)
  await page.goto('/area')
  await page.getByRole('link', { name: /Explorer aussi les corpus archivés/ }).click()
  await expect(page).toHaveURL(/\/datasets$/)
  await page.getByRole('button', { name: 'Données', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Zone de test')
  await dialog.locator('[data-slot="area-card"]').click()
  await expect(page).toHaveURL(/\/area\/fixture$/)
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('flower-frame').locator('svg')).toBeVisible()
})
test('empty zones display no invented graph or texts', async ({ page }) => {
  await mockApi(page, { empty: true })
  await page.goto('/area/fixture')
  await expect(page.getByText(/Aucun texte chargé dans cette zone/)).toBeVisible()
  await expect(page.getByTestId('flower-frame')).toHaveCount(0)
})

test('mobile: two inspected records can be selected manually without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mockApi(page)
  await page.goto('/area/fixture')
  const guide = page.getByTestId('flower-guide')
  await guide.getByRole('button', { name: 'Montre CF1', exact: true }).click()
  await page.getByTestId('live-records').getByRole('button', { name: 'Ajouter à la comparaison' }).click()
  await guide.getByRole('textbox').fill('Montre CF2')
  await guide.getByRole('button', { name: 'Appliquer' }).click()
  await page.getByTestId('live-records').getByRole('button', { name: 'Ajouter à la comparaison' }).click()
  await expect(page.getByTestId('live-records').locator('mark')).toHaveText(['2026', '2030'])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/live-api-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})
