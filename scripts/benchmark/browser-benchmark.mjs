// Mesure navigateur de la fleur intégrée (serveur de production déjà démarré) :
//   BENCH_BASE_URL=http://127.0.0.1:3200 node scripts/benchmark/browser-benchmark.mjs out.json
// Jeux réels uniquement (32 PFAS, 392 Hémicycle) : les jeux synthétiques sont mesurés hors navigateur (flower-benchmark.ts).
import { writeFileSync } from 'node:fs'

import { chromium } from '@playwright/test'

const BASE = process.env.BENCH_BASE_URL ?? 'http://127.0.0.1:3200'
const OUT = process.argv[2]
const ZOOM_CLICKS = 8
const RAF_WINDOW_MS = 3000

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
}
const p95 = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null
}
const round = (value) => (value === null ? null : Math.round(value * 100) / 100)

async function instrument(page) {
  await page.evaluate(() => {
    window.__longTasks = []
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__longTasks.push(entry.duration)
    }).observe({ type: 'longtask', buffered: false })
  })
}

async function rafIntervals(page, durationMs) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const intervals = []
        let last = performance.now()
        const start = last
        const step = (now) => {
          intervals.push(now - last)
          last = now
          if (now - start < duration) requestAnimationFrame(step)
          else resolve(intervals)
        }
        requestAnimationFrame(step)
      }),
    durationMs
  )
}

// Latence clic → DOM mis à jour (badge d'échelle ou nombre d'éléments) mesurée dans la page.
async function timedClick(page, buttonName, testId) {
  return page.evaluate(
    ({ name, id }) =>
      new Promise((resolve) => {
        const target = document.querySelector(`[data-testid="${id}"]`)
        const button = [...document.querySelectorAll('button')].find((node) => node.getAttribute('aria-label') === name)
        if (!target || !button || button.disabled) return resolve(null)
        const before = target.textContent
        const start = performance.now()
        const observer = new MutationObserver(() => {
          if (target.textContent !== before) {
            observer.disconnect()
            requestAnimationFrame(() => resolve(performance.now() - start))
          }
        })
        observer.observe(target, { childList: true, characterData: true, subtree: true })
        button.click()
      }),
    { name: buttonName, id: testId }
  )
}

async function measure(browser, label, path, records) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } })
  const t0 = Date.now()
  await page.goto(BASE + path)
  await page.getByTestId('flower-frame').locator('svg').waitFor()
  const readyMs = Date.now() - t0
  const countNodes = () => page.getByTestId('flower-frame').locator('svg [role="button"]').count()
  const nodesAtRest = await countNodes()
  await instrument(page)
  const idleRaf = await rafIntervals(page, 1000)

  const zoom = []
  for (let i = 0; i < ZOOM_CLICKS; i += 1) {
    const direction = i % 2 === 0 ? 'Zoom avant' : 'Zoom arrière'
    const value = await timedClick(page, direction, 'flower-scale')
    if (value !== null) zoom.push(value)
  }

  const search = page.getByRole('searchbox', { name: 'Trouver un amendement par numéro' })
  const focus = []
  const numeros = await page.evaluate(
    () => [...document.querySelectorAll('[data-testid="flower-frame"] [aria-label^="Amendement "]')].length
  )
  for (const query of path.includes('pfas') ? ['26', '32', '14'] : ['CL36', 'CL501', '1']) {
    await search.fill(query)
    const first = page.getByTestId('flower-search-results').getByRole('button').first()
    if ((await first.count()) === 0) continue
    const start = Date.now()
    await first.click()
    await page.getByTestId('flower-card').waitFor()
    focus.push(Date.now() - start)
  }
  const nodesFocused = await countNodes()

  await page.getByRole('button', { name: 'Ajuster la vue' }).click()
  await page.getByRole('button', { name: 'Démarrer le parcours' }).click()
  const tourRaf = await rafIntervals(page, RAF_WINDOW_MS)
  await page.getByRole('button', { name: 'Arrêter' }).click()
  const longTasks = await page.evaluate(() => window.__longTasks)
  const nodesAfterTour = await countNodes()
  await page.close()

  return {
    label,
    kind: 'real',
    records,
    readyMs,
    interactiveNodesAtRest: nodesAtRest,
    interactiveNodesFocused: nodesFocused,
    interactiveNodesAfterTour: nodesAfterTour,
    zoomLatencyMedianMs: round(median(zoom)),
    zoomLatencyP95Ms: round(p95(zoom)),
    focusLatencyMedianMs: round(median(focus)),
    rafIdleMedianMs: round(median(idleRaf)),
    rafTourMedianMs: round(median(tourRaf)),
    rafTourP95Ms: round(p95(tourRaf)),
    rafTourMaxMs: round(Math.max(...tourRaf)),
    longTaskCount: longTasks.length,
    longTaskMaxMs: round(longTasks.length ? Math.max(...longTasks) : 0)
  }
}

const browser = await chromium.launch()
const results = [
  await measure(browser, 'pfas-senat-620', '/datasets/pfas-senat-620', 32),
  await measure(browser, 'police-municipale-an-2464', '/datasets/police-municipale-an-2464', 392)
]
await browser.close()
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  note: 'Headless Chromium, software rendering on a cloud VM.',
  results
}
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
