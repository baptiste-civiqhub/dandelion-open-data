// Exporte le deck en PDF (pitch/dandelion-pitch.pdf) et, avec SLIDES_DIR, une image PNG par diapositive.
// Usage : node pitch/scripts/export.mjs   ·   SLIDES_DIR=chemin/vers/dossier node pitch/scripts/export.mjs
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium } from '@playwright/test'

const deckUrl = pathToFileURL(join(import.meta.dirname, '..', 'index.html')).href
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto(deckUrl, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

if (process.env.SLIDES_DIR) {
  mkdirSync(process.env.SLIDES_DIR, { recursive: true })
  const total = await page.locator('.slide').count()
  for (let index = 1; index <= total; index += 1) {
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(process.env.SLIDES_DIR, `slide-${String(index).padStart(2, '0')}.png`) })
    await page.keyboard.press('ArrowRight')
  }
}

await page.emulateMedia({ media: 'print' })
await page.pdf({
  path: join(import.meta.dirname, '..', 'dandelion-pitch.pdf'),
  width: '1920px',
  height: '1080px',
  printBackground: true,
  preferCSSPageSize: true
})
await browser.close()
console.log('pitch/dandelion-pitch.pdf')
