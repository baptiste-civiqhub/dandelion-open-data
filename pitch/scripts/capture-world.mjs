// Captures du monde 3D : survol d'introduction (jardin et palais du Sénat), puis approche d'un pissenlit.
// Prérequis : application lancée (BASE_URL, par défaut http://localhost:3004). Usage : node pitch/scripts/capture-world.mjs
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3004'
const OUT = 'pitch/assets/captures/'

const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge',
  args: ['--ignore-gpu-blocklist', '--enable-gpu']
})
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 })
await context.addCookies([{ name: 'NEXT_LOCALE', value: 'fr', url: BASE }])
const page = await context.newPage()
await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 120000 })
await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })

// Le survol d'introduction passe au-dessus du jardin : la vue aérienne montre le palais du Sénat.
await page.waitForTimeout(1500)
await page.screenshot({ path: OUT + 'jardin.png' })

// Fin du survol, puis quelques mètres en voiture vers le pissenlit le plus proche.
await page.waitForTimeout(12000)
await page.mouse.click(800, 450)
await page.keyboard.down('ArrowUp')
await page.waitForTimeout(2200)
await page.keyboard.up('ArrowUp')
await page.waitForTimeout(3000)
await page.screenshot({ path: OUT + 'pissenlit.png' })

await browser.close()
