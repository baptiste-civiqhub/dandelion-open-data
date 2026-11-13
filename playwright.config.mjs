// @ts-check
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Sur un poste Windows : PLAYWRIGHT_CHANNEL=msedge (aucun binaire à télécharger).
 * En CI Linux : chromium (`pnpm exec playwright install chromium`).
 */
const channel = process.env.PLAYWRIGHT_CHANNEL || 'chromium'

export default defineConfig({
  testDir: './test/e2e',
  testMatch: /\.spec\.mjs$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL,
    channel,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    viewport: { width: 1440, height: 1024 }
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel,
        viewport: { width: 1440, height: 1024 }
      }
    }
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_WEB_SERVER || 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
})
