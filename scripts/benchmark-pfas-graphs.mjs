import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const baseURL = process.argv[2] || 'http://localhost:3100'
const output = path.resolve(process.argv[3] || 'test-results/graph-benchmark')
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) {
  throw new Error('Use a local production build for this controlled comparison.')
}
const engines = [
  { name: 'native', route: '/experiments/pfas', ready: '[data-testid="native-graph"][data-ready="true"]' },
  {
    name: 'cosmograph',
    route: '/experiments/pfas/cosmograph',
    ready: '[data-renderer="cosmograph"][data-status="ready"]'
  }
]
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const results = []
try {
  for (const engine of engines) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      const requests = new Map()
      const sizesPending = []
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('requestfailed', (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
      context.on('request', (request) => {
        if (/^https?:/.test(request.url()))
          requests.set(request, { url: request.url(), method: request.method(), encodedBytes: 0 })
      })
      context.on('requestfinished', (request) => {
        sizesPending.push(
          request.sizes().then((sizes) => {
            const record = requests.get(request)
            if (record) record.encodedBytes = sizes.responseBodySize + sizes.responseHeadersSize
          })
        )
      })
      await page.goto(new URL(engine.route, baseURL).href, { waitUntil: 'domcontentloaded' })
      await expect(page.locator(engine.ready)).toBeVisible({ timeout: 60_000 })
      const readyMs = await page.evaluate(
        () =>
          new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now()))))
      )
      const webgl = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2')
        if (!gl) return 'unavailable'
        const info = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        return renderer
      })
      const beforeFilter =
        engine.name === 'native'
          ? await page.locator(engine.ready).getAttribute('data-node-count')
          : await page.locator(engine.ready).getAttribute('data-points')
      expect(beforeFilter).toBe('41')
      await page.waitForTimeout(1500)
      if (run === 1) {
        await page.locator(engine.ready).scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(output, `${engine.name}.png`) })
      }
      const filterStart = await page.evaluate(() => performance.now())
      await page.getByLabel('Emplacement dans le texte', { exact: true }).selectOption('Article 1er')
      await expect(page.locator(engine.ready)).toHaveAttribute(
        engine.name === 'native' ? 'data-node-count' : 'data-points',
        '18'
      )
      const filterMs = await page.evaluate((start) => performance.now() - start, filterStart)
      await page.getByRole('button', { name: 'Agrandir le graphe', exact: true }).click()
      await page.getByRole('button', { name: 'Recentrer le graphe', exact: true }).click()
      const overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      await Promise.all(sizesPending)
      const resources = [...requests.values()]
      if (engine.name === 'cosmograph')
        expect(resources.some((resource) => resource.url.endsWith('.wasm') && resource.encodedBytes > 0)).toBe(true)
      results.push({
        engine: engine.name,
        run,
        readyMs,
        webgl,
        filterMs,
        nodes: 41,
        filteredNodes: 18,
        overflowPx,
        errors,
        encodedNetworkBytes: resources.reduce((sum, item) => sum + item.encodedBytes, 0),
        resources
      })
      await context.close()
    }
  }
  await writeFile(
    path.join(output, 'measurements.json'),
    JSON.stringify(
      {
        measuredAtUtc: new Date().toISOString(),
        browser: browser.version(),
        platform: os.platform(),
        architecture: os.arch(),
        cpu: os.cpus()[0]?.model,
        node: process.version,
        viewport: { width: 1440, height: 1024 },
        method:
          'Three fresh Chrome contexts per route, HTTP cache disabled, localhost production build, no throttling. Readiness is DOM renderer readiness plus two animation frames, measured from navigation. Includes app loading. Byte totals include initial view and one Article 1er filter. No large-graph or user productivity claim.',
        results
      },
      null,
      2
    ) + '\n'
  )
  if (results.some((result) => result.errors.length || result.overflowPx > 0))
    throw new Error('See recorded errors or overflow in measurements.json')
  console.log(`Graph measurements saved in ${output}`)
} finally {
  await browser.close()
}
