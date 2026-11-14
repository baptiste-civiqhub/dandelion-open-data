// @ts-check
import { expect, test } from '@playwright/test'

const PFAS_PATH = '/experiments/pfas'

test('uses the real graph to inspect, filter, zoom and compare sourced amendments', async ({ page }) => {
  await openExperiment(page)
  const graph = page.getByTestId('native-graph')
  await expect(graph).toHaveAttribute('data-amendment-count', '32')
  await expect(graph).toHaveAttribute('data-node-count', '41')
  const node = (number) => page.getByTestId(`graph-node-senat-2023-2024-620-amdt-${number}`)
  await node(32).focus()
  await page.keyboard.press('Enter')
  const inspector = page.getByTestId('graph-inspector')
  await expect(inspector).toContainText('Sous-amendement du n° 14')
  await expect(page.getByTestId('graph-sub-amendment-edge')).toHaveAttribute(
    'data-source',
    'senat-2023-2024-620-amdt-14'
  )
  await page.getByLabel('Emplacement dans le texte', { exact: true }).selectOption('Article 1er')
  await expect(graph).toHaveAttribute('data-amendment-count', '17')
  await expect(graph).toHaveAttribute('data-node-count', '18')
  const svg = page.getByTestId('pfas-graph-svg')
  const initial = await svg.getAttribute('viewBox')
  await page.getByRole('button', { name: 'Agrandir le graphe', exact: true }).click()
  await expect(svg).not.toHaveAttribute('viewBox', initial)
  await page.getByRole('button', { name: 'Recentrer le graphe', exact: true }).click()
  await expect(svg).toHaveAttribute('viewBox', initial)
  const bounds = await svg.boundingBox()
  if (!bounds) throw new Error('Graph bounds missing')
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 20)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + 50)
  await page.mouse.up()
  await expect(svg).not.toHaveAttribute('viewBox', initial)
  await page.getByRole('button', { name: 'Recentrer le graphe', exact: true }).click()
  for (const number of [26, 27]) {
    await node(number).click()
    await inspector.getByRole('button', { name: 'Ajouter à la comparaison' }).click()
  }
  await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
  await inspector.getByRole('button', { name: 'Voir la comparaison' }).click()
  await expect(page.getByTestId('pfas-compare-27').locator('mark')).toContainText('utilisant des fluoropolymères')
  await expect(page.getByTestId('pfas-comparison')).toBeInViewport()
  await page.getByLabel('Emplacement dans le texte', { exact: true }).selectOption('')
  await expect(graph).toHaveAttribute('data-amendment-count', '32')
  await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
})

/** @param {import('@playwright/test').Page} page */
async function openExperiment(page) {
  await page.goto(PFAS_PATH)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Instantané public daté du Sénat')).toBeVisible()
}

test('compares 26 and 27, shows sources and exports a sourced note', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  await openExperiment(page)
  await expect(page.getByRole('button', { name: 'Article 1er 17 amendements', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true'
  )

  await page.getByLabel("Sélectionner l'amendement 26 pour la comparaison").check()
  await page.getByLabel("Sélectionner l'amendement 27 pour la comparaison").check()
  await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
  await expect(page.getByLabel("Sélectionner l'amendement 28 pour la comparaison")).toBeDisabled()

  const left = page.getByTestId('pfas-compare-26')
  const right = page.getByTestId('pfas-compare-27')
  await expect(left).toContainText('Retiré')
  await expect(right).toContainText('Retiré')
  await expect(left).toContainText(', des textiles de construction')
  await expect(left).not.toContainText('fluoropolymères')
  await expect(right.locator('mark')).toContainText('utilisant des fluoropolymères')
  await expect(left.getByRole('link', { name: /Page officielle du n° 26/ })).toHaveAttribute(
    'href',
    'https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html'
  )
  await expect(page.getByTestId('pfas-comparison')).toContainText("n'est pas une affirmation sur l'effet juridique")

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter une note Markdown' }).click()
  expect((await download).suggestedFilename()).toBe('pfas-amendments-26-27.md')
  const note = page.getByTestId('pfas-note')
  await expect(note).toHaveValue(/Sort officiel \(tel qu'enregistré\): Retiré/)
  await expect(note).toHaveValue(/<https:\/\/www\.senat\.fr\/amendements\/2023-2024\/620\/Amdt_27\.html>/)
  await expect(note).toHaveValue(/08ed07be1de3dd53b1888484e5b209ba2a39ff43f0ade88f23a9c25128e49337/)
  await expect(note).toHaveValue(/Elle ne simule aucun effet juridique ou environnemental/)

  await page.getByLabel('Ignorer les variantes typographiques', { exact: false }).check()
  await expect(note).toHaveCount(0)
  const nextDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter une note Markdown' }).click()
  await nextDownload
  await expect(note).toBeVisible()
  await page.getByLabel("Sélectionner l'amendement 27 pour la comparaison").uncheck()
  await page.getByLabel("Sélectionner l'amendement 28 pour la comparaison").check()
  await expect(note).toHaveCount(0)
  expect(errors).toEqual([])
})

test('identifies 14 as the sourced parent of 32 using the keyboard only', async ({ page }) => {
  await openExperiment(page)
  const detailsButton = page.getByRole('button', { name: /^N° 32\b/ })
  await detailsButton.focus()
  await page.keyboard.press('Enter')

  const parent = page.getByTestId('pfas-parent')
  await expect(parent).toContainText("Sous-amendement de l'amendement n° 14")
  await expect(parent).toContainText('Amendement n° 14, alinéa 3')
  await parent.getByRole('button', { name: "Voir l'amendement n° 14" }).press('Enter')
  await expect(page.getByTestId('pfas-detail')).toContainText('Amendement n° 14')

  await page.getByLabel("Sélectionner l'amendement 32 pour la comparaison").focus()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('pfas-selection')).toContainText('1 sur 2 sélectionnés')
})

test('stays usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openExperiment(page)
  await page.getByLabel("Sélectionner l'amendement 3 pour la comparaison").check()
  await page.getByLabel("Sélectionner l'amendement 13 pour la comparaison").check()
  await expect(page.getByTestId('pfas-compare-13')).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('serves the local snapshot without any service key', async ({ request }) => {
  const response = await request.get('/api/pfas')
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body.provenance.sha256).toBe('08ed07be1de3dd53b1888484e5b209ba2a39ff43f0ade88f23a9c25128e49337')
  expect(body.amendments).toHaveLength(32)
})
