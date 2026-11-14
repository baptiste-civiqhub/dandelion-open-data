// @ts-check
import { expect, test } from '@playwright/test'

const PFAS_PATH = '/experiments/pfas'

/** @param {import('@playwright/test').Page} page */
async function openExperiment(page) {
  await page.goto(PFAS_PATH)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Dated public Senate snapshot')).toBeVisible()
}

test('compares 26 and 27, shows sources and exports a sourced note', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  await openExperiment(page)
  await expect(page.getByRole('button', { name: 'Article 1er 17 amendments', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true'
  )

  await page.getByLabel('Select amendment 26 for comparison').check()
  await page.getByLabel('Select amendment 27 for comparison').check()
  await expect(page.getByTestId('pfas-selection')).toContainText('2 of 2 selected')
  await expect(page.getByLabel('Select amendment 28 for comparison')).toBeDisabled()

  const left = page.getByTestId('pfas-compare-26')
  const right = page.getByTestId('pfas-compare-27')
  await expect(left).toContainText('Retiré')
  await expect(right).toContainText('Retiré')
  await expect(left).toContainText(', des textiles de construction')
  await expect(left).not.toContainText('fluoropolymères')
  await expect(right.locator('mark')).toContainText('utilisant des fluoropolymères')
  await expect(left.getByRole('link', { name: /Official page of no. 26/ })).toHaveAttribute(
    'href',
    'https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html'
  )
  await expect(page.getByTestId('pfas-comparison')).toContainText('not a claim about legal effect')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown note' }).click()
  expect((await download).suggestedFilename()).toBe('pfas-amendments-26-27.md')
  const note = page.getByTestId('pfas-note')
  await expect(note).toHaveValue(/Official outcome \(as recorded\): Retiré/)
  await expect(note).toHaveValue(/<https:\/\/www\.senat\.fr\/amendements\/2023-2024\/620\/Amdt_27\.html>/)
  await expect(note).toHaveValue(/08ed07be1de3dd53b1888484e5b209ba2a39ff43f0ade88f23a9c25128e49337/)
  await expect(note).toHaveValue(/does not simulate legal or environmental outcomes/)

  await page.getByLabel('Ignore typographic variants', { exact: false }).check()
  await expect(note).toHaveCount(0)
  const nextDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown note' }).click()
  await nextDownload
  await expect(note).toBeVisible()
  await page.getByLabel('Select amendment 27 for comparison').uncheck()
  await page.getByLabel('Select amendment 28 for comparison').check()
  await expect(note).toHaveCount(0)
  expect(errors).toEqual([])
})

test('identifies 14 as the sourced parent of 32 using the keyboard only', async ({ page }) => {
  await openExperiment(page)
  const detailsButton = page.getByRole('button', { name: /^No\. 32\b/ })
  await detailsButton.focus()
  await page.keyboard.press('Enter')

  const parent = page.getByTestId('pfas-parent')
  await expect(parent).toContainText('Sub-amendment of amendment no. 14')
  await expect(parent).toContainText('Amendement n° 14, alinéa 3')
  await parent.getByRole('button', { name: 'View amendment no. 14' }).press('Enter')
  await expect(page.getByTestId('pfas-detail')).toContainText('Amendment no. 14')

  await page.getByLabel('Select amendment 32 for comparison').focus()
  await page.keyboard.press('Space')
  await expect(page.getByTestId('pfas-selection')).toContainText('1 of 2 selected')
})

test('stays usable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openExperiment(page)
  await page.getByLabel('Select amendment 3 for comparison').check()
  await page.getByLabel('Select amendment 13 for comparison').check()
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
