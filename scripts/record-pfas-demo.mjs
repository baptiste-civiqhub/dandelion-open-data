import { chromium, expect } from '@playwright/test'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseURL = process.argv[2] || 'http://localhost:3000'
const output = path.resolve(process.argv[3] || 'test-results/pfas-demo')
const origin = new URL(baseURL)
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) {
  throw new Error('Record the local prototype; pass a localhost URL.')
}

await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', slowMo: 180 })
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: output, size: { width: 1920, height: 1080 } }
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
const video = page.video()

try {
  await page.goto(new URL('/experiments/pfas', baseURL).href)
  await expect(page.getByText('Dated public Senate snapshot')).toBeVisible()
  await page.screenshot({ path: path.join(output, '01-explorer.png') })
  await page.waitForTimeout(1600)

  await page.getByRole('button', { name: /^No\. 32\b/ }).click()
  const parent = page.getByTestId('pfas-parent')
  await expect(parent).toContainText('Sub-amendment of amendment no. 14')
  await parent.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(output, '02-parent-32-14.png') })
  await page.waitForTimeout(2600)

  await page.goto(new URL('/experiments/pfas', baseURL).href)
  await page.getByLabel('Select amendment 26 for comparison').check()
  await page.getByLabel('Select amendment 27 for comparison').check()
  const comparison = page.getByTestId('pfas-comparison')
  await expect(page.getByTestId('pfas-compare-27').locator('mark')).toContainText('utilisant des fluoropolymères')
  await comparison.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(output, '03-comparison-26-27.png') })
  await page.waitForTimeout(5000)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown note' }).click()
  await (await download).saveAs(path.join(output, 'pfas-amendments-26-27.md'))
  await expect(page.getByTestId('pfas-note')).toBeVisible()
  await page.screenshot({ path: path.join(output, '04-export.png') })
  await page.waitForTimeout(2400)
  expect(errors).toEqual([])

  await writeFile(
    path.join(output, 'capture.json'),
    JSON.stringify(
      { recordedAtUtc: new Date().toISOString(), baseURL, viewport: { width: 1920, height: 1080 }, errors },
      null,
      2
    ) + '\n'
  )
} finally {
  await context.close()
  await browser.close()
}

if (video) await rename(await video.path(), path.join(output, 'pfas-demo-raw.webm'))
console.log(`Recorded the real PFAS journey in ${output}`)
