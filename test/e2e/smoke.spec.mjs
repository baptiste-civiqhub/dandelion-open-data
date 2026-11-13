// @ts-check
import { expect, test } from '@playwright/test'

test('home renders its title without console errors', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

test('health probe answers with the deployed version', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body).toHaveProperty('version')
  expect(['up', 'down', 'unconfigured']).toContain(body.supabase)
})
