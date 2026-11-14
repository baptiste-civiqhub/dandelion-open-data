// Captures de la dataviz (sunburst, zoom, fiche, widgets d'IA) et décompte des textes et amendements.
// Prérequis : application lancée (BASE_URL, par défaut http://localhost:3004). Usage : node pitch/scripts/capture-dataviz.mjs
import { writeFileSync } from 'node:fs'

import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3004'
const OUT = 'pitch/assets/captures/'
const AREA = '/area/budget-fiscalite-pouvoir-achat'

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge' })
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 })
await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', url: BASE }])
const page = await context.newPage()
const open = async (path) => {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 120000 })
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  await page.waitForTimeout(3000)
}

await open(AREA)
await page.screenshot({ path: OUT + 'sunburst-plffg.png' })

await page.mouse.click(740, 628)
await page.waitForTimeout(2500)
await page.mouse.move(1035, 478, { steps: 8 })
await page.waitForTimeout(1200)
await page.screenshot({ path: OUT + 'zoom-article.png' })
await page.mouse.click(1035, 478)
await page.waitForTimeout(1500)
await page.mouse.move(1300, 860, { steps: 4 })
await page.waitForTimeout(800)
await page.screenshot({ path: OUT + 'fiche-amendement.png' })
// Cartes « Lecture par IA » et « Comparer » : la colonne droite défile seule, on agrandit donc la fenêtre.
await page.setViewportSize({ width: 1600, height: 2000 })
await page.waitForTimeout(1500)
const aiCards = () =>
  page.evaluate(() => {
    const cards = [...document.querySelectorAll('section[data-slot="widget"]')].filter((card) =>
      ['Lecture par IA', 'Comparer'].includes(card.querySelector('h2')?.textContent?.trim() ?? '')
    )
    const boxes = cards.map((card) => card.getBoundingClientRect())
    const top = Math.min(...boxes.map((b) => b.top))
    const bottom = Math.max(...boxes.map((b) => b.bottom))
    const left = Math.min(...boxes.map((b) => b.left))
    const right = Math.max(...boxes.map((b) => b.right))
    return { x: left - 16, y: top - 16, width: right - left + 32, height: bottom - top + 32 }
  })
await page.screenshot({ path: OUT + 'ia-widgets.png', clip: await aiCards() })
const settle = () =>
  page
    .waitForFunction(() => !document.body.innerText.includes('Analyse en cours'), null, { timeout: 45000 })
    .catch(() => {})

const run = page.getByRole('button', { name: 'Analyser avec l’IA' })
if (await run.count()) {
  await run.first().click()
  await page.waitForTimeout(2000)
  await settle()
}
await page.screenshot({ path: OUT + 'ia-lecture.png', clip: await aiCards() })
const compare = page.getByRole('button', { name: /^Comparer avec/ })
if (await compare.count()) {
  await compare.first().click()
  await page.waitForTimeout(2000)
  await settle()
}
await page.screenshot({ path: OUT + 'ia-comparaison.png', clip: await aiCards() })

if (process.env.SKIP_STATS) {
  await browser.close()
  process.exit(0)
}

const stats = { areas: [], texts: 0, amendements: 0 }
await open('/area')
const areaPaths = await page.$$eval('a[href^="/area/"]', (links) => [
  ...new Set(links.map((a) => a.getAttribute('href')))
])
for (const path of areaPaths) {
  await open(path)
  const body = await page.innerText('body')
  const titles = body.split('Textes de la zone')[1].split('\nSorts')[0].trim().split('\n').filter(Boolean)
  const area = { path, texts: [] }
  for (const title of titles) {
    await page.getByRole('button', { name: title, exact: true }).first().click()
    await page.waitForTimeout(2500)
    const match = (await page.innerText('body')).match(/Fiche\s+[\s\S]*?(\d+) articles? · (\d+) amendements?/)
    area.texts.push({ title, amendements: match ? Number(match[2]) : null })
    stats.texts += 1
    stats.amendements += match ? Number(match[2]) : 0
  }
  stats.areas.push(area)
}
writeFileSync(OUT + 'stats.json', JSON.stringify(stats, null, 2))
console.log(JSON.stringify(stats, null, 2))
await browser.close()
