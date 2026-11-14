// @ts-check
import { expect, test } from '@playwright/test'

// Guide DÉTERMINISTE (règles locales) sur l'instantané PFAS importé : aucun modèle ni API Hémicycle en direct n'est testé ici.
const VIEWS = ['/experiments/pfas', '/experiments/pfas/cosmograph']

function trackErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  return () => errors.filter((message) => !/WebGL|GPU stall/i.test(message))
}

async function ask(page, question) {
  const input = page.getByTestId('assistant-input')
  await input.fill(question)
  await input.press('Enter')
}

async function open(page, path = VIEWS[0]) {
  await page.goto(path)
  await expect(page.getByTestId('assistant')).toBeVisible()
  await expect(page.getByTestId('assistant-engine')).toHaveText('Guide déterministe')
}

for (const path of VIEWS) {
  test(`a typed comparison selects exactly 26 and 27 and focuses 26 (${path})`, async ({ page }) => {
    const errors = trackErrors(page)
    await open(page, path)
    await ask(page, 'Compare les amendements 26 et 27')
    const answer = page.getByTestId('assistant-answer')
    await expect(answer).toHaveAttribute('data-intent', 'compare')
    await expect(answer.getByTestId('assistant-record')).toHaveCount(2)
    await expect(answer.getByText('Retiré', { exact: true })).toHaveCount(2)
    await expect(answer.locator('a[href="https://www.senat.fr/amendements/2023-2024/620/Amdt_26.html"]')).toBeVisible()
    await expect(answer.locator('a[href="https://www.senat.fr/amendements/2023-2024/620/Amdt_27.html"]')).toBeVisible()
    await expect(answer.getByTestId('assistant-caveat')).toContainText('pas des versions successives')
    await expect(answer.getByTestId('assistant-actions')).toContainText(
      'Sélection remplacée par 26 et 27, focus sur 26'
    )
    await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
    await expect(page.getByTestId('pfas-compare-26')).toBeVisible()
    await expect(page.getByTestId('pfas-compare-27')).toBeVisible()
    await expect(page.locator('#pfas-detail-title')).toContainText('26')
    expect(errors()).toEqual([])
  })

  test(`the parent question selects 32 and its recorded parent 14 (${path})`, async ({ page }) => {
    const errors = trackErrors(page)
    await open(page, path)
    await page.getByTestId('assistant-example-parent').click()
    const answer = page.getByTestId('assistant-answer')
    await expect(answer).toHaveAttribute('data-intent', 'parent')
    await expect(answer.getByTestId('assistant-summary')).toContainText(
      'L’amendement 32 est enregistré comme sous-amendement de l’amendement 14'
    )
    await expect(answer.getByTestId('assistant-parent-evidence')).toContainText('Indice enregistré')
    await expect(answer.getByTestId('assistant-caveat')).toContainText('pas déduite d’une ressemblance')
    await expect(page.getByTestId('pfas-compare-32')).toBeVisible()
    await expect(page.getByTestId('pfas-compare-14')).toBeVisible()
    await expect(page.getByTestId('pfas-parent')).toContainText('14')
    expect(errors()).toEqual([])
  })
}

test('showing one amendment replaces the selection and focuses that real record', async ({ page }) => {
  const errors = trackErrors(page)
  await open(page)
  await ask(page, 'Compare 26 et 27')
  await ask(page, 'Montre l’amendement 32')
  const answer = page.getByTestId('assistant-answer')
  await expect(answer).toHaveAttribute('data-intent', 'focus')
  await expect(answer.getByTestId('assistant-summary')).toContainText('Amendement 32')
  await expect(page.getByTestId('pfas-selection')).toContainText('1 sur 2 sélectionnés')
  await expect(page.locator('#pfas-detail-title')).toContainText('32')
  await answer.getByRole('button', { name: 'Aller à la fiche' }).click()
  await expect(page.locator('#pfas-detail-title')).toBeFocused()
  expect(errors()).toEqual([])
})

test('the sources question opens the existing evidence trail instead of duplicating it', async ({ page }) => {
  const errors = trackErrors(page)
  await open(page)
  await ask(page, 'Affiche les sources et le parcours de la loi')
  await expect(page.getByTestId('assistant-answer')).toHaveAttribute('data-intent', 'evidence')
  await expect(page.getByTestId('evidence-question-trail')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('evidence-result')).toBeVisible()
  await expect(page.locator('#evidence-title')).toBeFocused()
  await expect(page.getByTestId('assistant-answer').locator('a')).toHaveCount(0)
  expect(errors()).toEqual([])
})

test('economic, current-law, unknown and ambiguous questions abstain without touching the graph', async ({ page }) => {
  const errors = trackErrors(page)
  await open(page)
  const cases = [
    ['Quel est l’effet économique de l’amendement 26 ?', 'out-of-scope'],
    ['Que dit le droit en vigueur aujourd’hui ?', 'out-of-scope'],
    ['Raconte une blague', 'unsupported'],
    ['Compare les amendements 26, 27 et 28', 'too-many'],
    ['Montre l’amendement 999', 'missing']
  ]
  for (const [question, reason] of cases) {
    await ask(page, question)
    const abstain = page.getByTestId('assistant-abstain')
    await expect(abstain).toHaveAttribute('data-reason', reason)
    await expect(abstain).toContainText('Essayez un exemple')
    await expect(page.getByTestId('pfas-selection')).toContainText('0 sur 2 sélectionnés')
  }
  expect(errors()).toEqual([])
})

test('asking the same question again after a manual change reapplies its actions', async ({ page }) => {
  await open(page)
  await ask(page, 'Compare les amendements 26 et 27')
  await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
  await page.getByRole('button', { name: 'Vider la sélection', exact: true }).click()
  await expect(page.getByTestId('pfas-selection')).toContainText('0 sur 2 sélectionnés')
  await page.getByTestId('assistant-submit').click()
  await expect(page.getByTestId('pfas-selection')).toContainText('2 sur 2 sélectionnés')
  await expect(page.getByTestId('pfas-compare-26')).toBeVisible()
})

test('opening the answer comparison restores its pair after the selection was cleared', async ({ page }) => {
  await open(page)
  await ask(page, 'Compare les amendements 26 et 27')
  await page.getByRole('button', { name: 'Vider la sélection', exact: true }).click()
  await expect(page.getByTestId('pfas-selection')).toContainText('0 sur 2 sélectionnés')
  await page.getByTestId('assistant-answer').getByRole('button', { name: 'Aller à la comparaison' }).click()
  await expect(page.getByTestId('pfas-compare-26')).toBeVisible()
  await expect(page.getByTestId('pfas-compare-27')).toBeVisible()
  await expect(page.locator('#pfas-comparison-title')).toBeFocused()
})

test('the guide is keyboard-operable and readable on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await open(page)
  await page.getByTestId('assistant-input').focus()
  await page.keyboard.type('Quel est le parent du sous-amendement 32 ?')
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('assistant-submit')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('assistant-answer')).toHaveAttribute('data-intent', 'parent')
  await expect(page.getByTestId('assistant-response')).toHaveAttribute('aria-live', 'polite')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.getByTestId('assistant').screenshot({
    path: process.env.ASSISTANT_SCREENSHOT_DIR ? `${process.env.ASSISTANT_SCREENSHOT_DIR}/mobile-parent.png` : undefined
  })
})

test('a failed evidence context breaks neither the guide nor the graph', async ({ page }) => {
  await page.route('**/api/pfas/evidence', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"test failure"}' })
  )
  await open(page)
  await ask(page, 'Affiche les sources')
  await expect(page.getByTestId('evidence-error').first()).toBeVisible()
  await ask(page, 'Compare les amendements 26 et 27')
  await expect(page.getByTestId('assistant-answer')).toHaveAttribute('data-intent', 'compare')
  await expect(page.getByTestId('pfas-compare-27')).toBeVisible()
})
