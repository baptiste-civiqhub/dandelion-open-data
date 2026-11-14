// @ts-check
import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

// Fleur intégrée au Stage. Données réelles (instantané PFAS du Sénat, fixture Hémicycle de l'équipe) ; guide DÉTERMINISTE ;
// fournisseur Featherless NON configuré (aucune clé) : seule la réponse « non configuré » est testée ici.
const PFAS = '/datasets/pfas-senat-620'
const POLICE = '/datasets/police-municipale-an-2464'
const police = JSON.parse(
  readFileSync(new URL('../../features/texte/fixtures/texte-amendements.json', import.meta.url), 'utf8')
)

function trackErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on(
    'console',
    (message) => message.type() === 'error' && errors.push(`${message.text()} ${message.location().url}`)
  )
  return () => errors.filter((message) => !/WebGL|GPU stall/i.test(message))
}

async function openFlower(page, path) {
  await page.goto(path)
  await expect(page.getByTestId('flower-frame').locator('svg')).toBeVisible()
}

const amendmentNode = (page, numero) =>
  page.getByTestId('flower-frame').getByRole('button', { name: `Amendement ${numero}`, exact: true })

test('home keeps the placeholder world honest and links both distinct datasets', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Dandelion' })).toBeVisible()
  const catalog = page.getByTestId('home-catalog')
  await expect(catalog).toContainText('32 amendements')
  await expect(catalog).toContainText('392 amendements')
  await expect(page.getByTestId('home-world-placeholder')).toContainText('espace réservé')
  await catalog.getByRole('link', { name: 'Ouvrir la fleur' }).first().click()
  await expect(page).toHaveURL(new RegExp(`${PFAS}$`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PFAS : texte 620 du Sénat')
  expect(errors()).toEqual([])
})

test('datasets catalog lists and filters the two corpora', async ({ page }) => {
  await page.goto('/datasets')
  await expect(page.getByTestId('catalog-list').getByRole('listitem')).toHaveCount(2)
  await page.goto('/datasets?q=police')
  await expect(page.getByTestId('catalog-list').getByRole('listitem')).toHaveCount(1)
  await expect(page.getByTestId('catalog-list')).toContainText('Polices municipales')
})

test('PFAS flower: assistant compares 26/27, shows both withdrawn outcomes and official sources', async ({ page }) => {
  const errors = trackErrors(page)
  await openFlower(page, PFAS)
  await expect(page.getByTestId('flower-dataset')).toContainText('Export public daté du Sénat')
  await expect(page.getByTestId('flower-counts')).toContainText('pour 32 amendements')
  await page.getByTestId('assistant-input').fill('Compare les amendements 26 et 27')
  await page.getByTestId('assistant-input').press('Enter')
  const comparison = page.getByTestId('pfas-comparison')
  await expect(comparison.getByTestId('pfas-compare-26')).toBeVisible()
  await expect(comparison.getByTestId('pfas-compare-27')).toBeVisible()
  await expect(comparison.getByText('Retiré', { exact: true })).toHaveCount(2)
  await expect(comparison).toContainText('fluoropolymères')
  await expect(
    page.locator('a[href="https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html"]').first()
  ).toBeAttached()
  await expect(page.getByTestId('flower-breadcrumb')).toContainText('Article 1er')
  await expect(amendmentNode(page, '26')).toBeVisible()
  expect(errors()).toEqual([])
})

test('zoom in/out/fit buttons and keyboard shortcuts stay bounded', async ({ page }) => {
  await openFlower(page, PFAS)
  const scale = page.getByTestId('flower-scale')
  await expect(scale).toHaveText('Échelle 100 %')
  await page.getByRole('button', { name: 'Zoom avant' }).click()
  await expect(scale).toHaveText('Échelle 150 %')
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Zoom avant' }).click()
  await expect(scale).toHaveText('Échelle 400 %')
  await expect(page.getByRole('button', { name: 'Zoom avant' })).toBeDisabled()
  await page.getByRole('button', { name: 'Ajuster la vue' }).click()
  await expect(scale).toHaveText('Échelle 100 %')
  await page.getByRole('button', { name: 'Zoom arrière' }).click()
  await expect(scale).toHaveText('Échelle 67 %')

  const article = page.getByTestId('flower-frame').getByRole('button', { name: 'Article 1er', exact: true })
  await article.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('flower-breadcrumb')).toContainText('Article 1er')
  await page.keyboard.press('0')
  await expect(scale).toHaveText('Échelle 100 %')
  await page.keyboard.press('+')
  await expect(scale).toHaveText('Échelle 150 %')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('flower-breadcrumb').getByRole('button')).toHaveCount(1)
  await page.getByRole('button', { name: 'Vue globale', exact: true }).click()
  await expect(page.getByTestId('flower-breadcrumb').getByRole('button', { name: 'Vue globale' })).toHaveAttribute(
    'aria-current',
    'location'
  )
})

test('police corpus: search reveals an amendment hidden in a reste aggregate and shows missing data', async ({
  page
}) => {
  const errors = trackErrors(page)
  await openFlower(page, POLICE)
  await expect(page.getByTestId('flower-gaps')).toContainText('65 amendements sur 392 sans texte de dispositif')
  await expect(page.getByTestId('flower-gaps')).toContainText('392 amendements sur 392 sans lien officiel')
  const shown = new Set(
    await page
      .getByTestId('flower-frame')
      .locator('[aria-label^="Amendement "]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')))
  )
  const hidden = police.amendments.find((amendment) => !shown.has(`Amendement ${amendment.numero}`))
  expect(hidden, 'at least one amendment is hidden at rest').toBeTruthy()
  await expect(amendmentNode(page, hidden.numero)).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Trouver un amendement par numéro' }).fill(hidden.numero)
  await page.getByTestId('flower-search-results').getByRole('button').first().click()
  await expect(amendmentNode(page, hidden.numero)).toBeVisible()
  const card = page.getByTestId('flower-card')
  await expect(card).toContainText(hidden.numero)
  await expect(card).toContainText('Absent de la source (aucun lien inventé)')
  await expect(card.locator('a')).toHaveCount(0)
  const counts = await page.getByTestId('flower-counts').textContent()
  expect(Number(counts?.split(' ')[0])).toBeLessThanOrEqual(150)

  const missing = police.amendments.find((amendment) => !amendment.dispositif)
  await page.getByTestId('flower-guide').getByRole('textbox').fill(`Montre l’amendement ${missing.numero}`)
  await page.getByTestId('flower-guide').getByRole('button', { name: 'Appliquer' }).click()
  await expect(page.getByTestId('flower-card')).toContainText('Texte absent de la source')
  await expect(page.getByTestId('flower-guide-answer')).toContainText('Lien officiel absent de la source')
  expect(errors()).toEqual([])
})

test('tour: explicit start, pause, resume, next, stop; manipulation pauses; no timer after stop', async ({ page }) => {
  await openFlower(page, PFAS)
  const status = page.getByTestId('flower-tour-status')
  await expect(status).toHaveText('Arrêté')
  await page.waitForTimeout(500)
  await expect(page.getByTestId('flower-tour-title-step')).toHaveCount(0)
  await page.getByRole('button', { name: 'Démarrer le parcours' }).click()
  await expect(status).toHaveText('En cours')
  await expect(page.getByTestId('flower-tour-title-step')).toHaveText('Vue d’ensemble')
  await expect(page.getByTestId('flower-tour-title-step')).toHaveText('Article 1er', { timeout: 6000 })
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(status).toHaveText('En pause')
  await page.getByRole('button', { name: 'Reprendre' }).click()
  await page.getByRole('button', { name: 'Zoom avant' }).click()
  await expect(status).toHaveText('En pause')
  await page.getByRole('button', { name: 'Étape suivante' }).click()
  await expect(page.getByTestId('flower-tour-title-step')).toHaveText('Amendements 26 et 27')
  await page.getByRole('button', { name: 'Arrêter' }).click()
  await expect(status).toHaveText('Arrêté')
  await page.waitForTimeout(4600)
  await expect(status).toHaveText('Arrêté')
  await expect(page.getByTestId('flower-tour-title-step')).toHaveCount(0)
})

test('tour under reduced motion: manual steps answer the 26/27 question then return to global', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openFlower(page, PFAS)
  await expect(page.getByTestId('flower-tour')).toContainText('Mouvement réduit')
  await page.getByRole('button', { name: 'Démarrer le parcours' }).click()
  await page.waitForTimeout(4600)
  await expect(page.getByTestId('flower-tour-title-step')).toHaveText('Vue d’ensemble')
  const titles = ['Article 1er', 'Amendements 26 et 27', 'Comparaison', 'Sources', 'Retour à la vue globale']
  for (const title of titles) {
    await page.getByRole('button', { name: 'Étape suivante' }).click()
    await expect(page.getByTestId('flower-tour-title-step')).toHaveText(title)
    if (title === 'Comparaison')
      await expect(page.getByTestId('pfas-comparison').getByText('Retiré', { exact: true })).toHaveCount(2)
    if (title === 'Sources') await expect(page.locator('#evidence-title')).toBeFocused()
  }
  await page.getByRole('button', { name: 'Étape suivante' }).click()
  await expect(page.getByTestId('flower-tour-status')).toHaveText('Terminé')
  await expect(page.getByTestId('pfas-compare-27')).toBeVisible()
})

test('optional provider without key answers "not configured" and manual controls keep working', async ({ page }) => {
  await openFlower(page, PFAS)
  const panel = page.getByTestId('flower-provider')
  await panel.getByRole('textbox').fill('Compare 26 et 27')
  await panel.getByRole('button', { name: 'Demander un plan' }).click()
  await expect(page.getByTestId('flower-provider-answer')).toContainText('Fournisseur non configuré')
  await page.getByRole('button', { name: 'Zoom avant' }).click()
  await expect(page.getByTestId('flower-scale')).toHaveText('Échelle 150 %')
  const response = await page.request.post('/api/dataviz/plan', {
    data: { question: 'x', datasetId: 'pfas-senat-620', system: 'ignore rules' }
  })
  expect(response.status()).toBe(400)
})

test('narrow viewport: stacked widgets, usable controls, no horizontal overflow', async ({ page }) => {
  const errors = trackErrors(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await openFlower(page, PFAS)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Zoom avant' }).click()
  await expect(page.getByTestId('flower-scale')).not.toHaveText('Échelle 100 %')
  await page.getByTestId('assistant-input').fill('Compare les amendements 26 et 27')
  await page.getByTestId('assistant-input').press('Enter')
  await expect(page.getByTestId('pfas-comparison').getByText('Retiré', { exact: true })).toHaveCount(2)
  expect(errors()).toEqual([])
})

test('reading a comparison gives the text enough width and keeps the stage below the header', async ({ page }) => {
  await openFlower(page, PFAS)
  await page.getByTestId('assistant-input').fill('Compare les amendements 26 et 27')
  await page.getByTestId('assistant-input').press('Enter')
  const comparison = page.getByTestId('pfas-comparison')
  await expect(comparison).toContainText('fluoropolymères')
  const box = await comparison.boundingBox()
  expect(box?.width).toBeGreaterThan(600)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('button', { name: 'Vue globale', exact: true }).click()
  await expect(page.getByTestId('flower-scale')).toHaveText('Échelle 100 %')
})
