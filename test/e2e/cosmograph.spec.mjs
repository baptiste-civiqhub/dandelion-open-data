import { expect, test } from '@playwright/test'

test.use({
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }
})

const ROUTE = '/experiments/pfas/cosmograph'
test.setTimeout(90_000)

test('uses real Cosmograph labels and points to inspect, filter and compare in French', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  await page.goto(ROUTE)
  const canvas = page.locator('[data-renderer=cosmograph]')
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 45_000 })
  await expect(canvas).toHaveAttribute('data-points', '41')
  await expect(canvas).toHaveAttribute('data-links', '40')
  await expect(canvas.locator('canvas').first()).toBeVisible()
  await expect(canvas.locator('[class*=attribution] svg')).toBeVisible()
  await page.getByLabel('Emplacement dans le texte', { exact: true }).selectOption('Article 1er')
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 30_000 })
  await expect(canvas).toHaveAttribute('data-points', '18')
  await expect(canvas).toHaveAttribute('data-links', '17')
  await page.waitForTimeout(1500)
  if ((await canvas.getAttribute('data-simulation')) === 'running') {
    await page.getByRole('button', { name: 'Mettre l’animation en pause', exact: true }).click()
  }
  await expect(canvas).toHaveAttribute('data-simulation', 'paused')
  await page.getByRole('button', { name: 'Recentrer le graphe', exact: true }).click()
  await canvas.getByText('32', { exact: true }).first().click()
  const inspector = page.getByTestId('graph-inspector')
  await expect(inspector).toContainText('Amendement n° 32')
  await expect(inspector).toContainText('Sous-amendement du n° 14')

  // Click the rendered point under its label, not a DOM proxy for onFocus.
  await page.waitForTimeout(1000)
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.getByText('14', { exact: true }).first().boundingBox()
  if (!box) throw new Error('Rendered point label missing')
  await inspector.getByRole('button', { name: 'Ajouter à la comparaison' }).click()
  for (const dy of [9, 12, 6, 15, 18]) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + dy)
    if ((await inspector.textContent())?.includes('Amendement n° 14')) break
  }
  await expect(inspector).toContainText('Amendement n° 14')
  await inspector.getByRole('button', { name: 'Ajouter à la comparaison' }).click()
  await inspector.getByRole('button', { name: 'Voir la comparaison' }).click()
  await expect(page.getByTestId('pfas-compare-32')).toBeVisible()
  await expect(page.getByTestId('pfas-compare-14')).toBeVisible()
  expect(await canvas.locator(':scope > div.absolute.inset-0').count()).toBe(1)
  await page.waitForTimeout(1000)
  const pause = page.getByRole('button', { name: 'Mettre l’animation en pause', exact: true })
  if (await pause.count()) await pause.click()
  // The list is the deterministic way to locate exact numbers when collision-aware labels are hidden.
  await page.getByRole('button', { name: 'Vider la sélection', exact: true }).click()
  await page.getByLabel("Sélectionner l'amendement 26 pour la comparaison").check()
  await page.getByLabel("Sélectionner l'amendement 27 pour la comparaison").check()
  await expect(page.getByTestId('pfas-compare-27').locator('mark')).toContainText('utilisant des fluoropolymères')
  await page.getByRole('button', { name: 'Agrandir le graphe', exact: true }).click()
  await page.getByRole('button', { name: 'Recentrer le graphe', exact: true }).click()
  await page.getByRole('button', { name: 'Reprendre l’animation', exact: true }).click()
  await canvas.scrollIntoViewIfNeeded()
  await expect(canvas).toHaveAttribute('data-simulation', 'running')
  await page.waitForTimeout(1500)
  expect((await canvas.innerText()).trim().length).toBeGreaterThan(10)
  await page.getByRole('link', { name: 'Vue par article', exact: true }).click()
  await expect(page.getByTestId('native-graph')).toBeVisible()
  await expect(page.locator('[data-renderer=cosmograph]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Vue par forces', exact: true }).click()
  await expect(canvas).toHaveAttribute('data-status', 'ready', { timeout: 45_000 })
  expect(await canvas.locator(':scope > div.absolute.inset-0').count()).toBe(1)
  expect(errors).toEqual([])
})

test('keeps the comparison available when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args)
    }
  })
  await page.goto(ROUTE)
  await expect(page.locator('[data-renderer=cosmograph]').getByRole('alert')).toContainText(
    'Le graphe n’a pas pu être affiché'
  )
  await page.getByLabel("Sélectionner l'amendement 26 pour la comparaison").check()
  await page.getByLabel("Sélectionner l'amendement 27 pour la comparaison").check()
  await expect(page.getByTestId('pfas-compare-27').locator('mark')).toContainText('utilisant des fluoropolymères')
})
