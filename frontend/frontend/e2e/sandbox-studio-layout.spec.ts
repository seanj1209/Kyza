import { expect, test } from './helpers/testState'

test('Sandbox entry uses compact actions and its own right rail', async ({ page }) => {
  await page.setViewportSize({ width: 1768, height: 790 })
  await page.goto('/cutter')
  await page.getByRole('button', { name: /Sandbox Mode/ }).click()

  await expect(page.locator('body')).toHaveClass(/sandbox-mode/)
  await expect(page.locator('#right-rail')).toBeHidden()
  await expect(page.locator('.sandbox-toolbar-btn')).toHaveCount(6)
  await expect(page.locator('.sandbox-entry-btn')).toHaveCount(3)
  await expect(page.locator('.sandbox-entry-bg')).toContainText('CUTTER MAT')
  await expect(page.locator('.sandbox-entry-bg')).toContainText('CUTTER LEGEND')
  await expect(page.locator('.sandbox-entry-buttons')).toContainText('Import ProjectSet UpMap Process')
  await expect(page.locator('.sbx-ink-labels text')).toHaveText(['C', 'M', 'Y', 'K'])

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const icon = rect('.sandbox-entry-btn svg')
    const action = rect('.sandbox-entry-btn')
    const rail = rect('.sandbox-toolbar')
    const frame = rect('#preview-frame')
    const background = getComputedStyle(document.querySelector('.sandbox-entry-bg')!).opacity
    return { iconWidth: icon.width, iconHeight: icon.height, actionWidth: action.width,
      railTop: rail.top, railBottom: rail.bottom, frameTop: frame.top, frameBottom: frame.bottom,
      railRight: rail.right, frameRight: frame.right, background }
  })
  expect(geometry.iconWidth).toBeLessThanOrEqual(20)
  expect(geometry.iconHeight).toBeLessThanOrEqual(20)
  expect(geometry.actionWidth).toBeLessThan(180)
  expect(geometry.railTop).toBeGreaterThanOrEqual(geometry.frameTop)
  expect(geometry.railBottom).toBeLessThanOrEqual(geometry.frameBottom)
  expect(Math.abs(geometry.railRight - geometry.frameRight)).toBeLessThan(2)
  expect(Number(geometry.background)).toBeLessThan(0.9)
  await page.screenshot({ path: 'test-results/sandbox-studio-entry.png', fullPage: true })

  await page.getByRole('button', { name: 'Set Up', exact: true }).click()
  await expect(page.locator('.sandbox-entry')).toBeHidden()
  await expect(page.locator('.sandbox-panel:not([hidden])')).toBeVisible()
  await page.screenshot({ path: 'test-results/sandbox-studio-setup.png', fullPage: true })
  await page.locator('.sandbox-toolbar-btn[aria-label="Specs"]').click()
  await expect(page.locator('.sandbox-panel-specs')).toBeVisible()
  await expect(page.locator('.sandbox-substrate-count')).toBeVisible()

  await page.getByRole('button', { name: 'Return to Cutter Studio start page' }).click()
  await expect(page.locator('body')).not.toHaveClass(/sandbox-mode/)
  await expect(page.locator('.sandbox-studio-root')).toHaveCount(0)
  await page.locator('button[data-action="start-project"]').click()
  await expect(page.locator('#right-rail')).toBeVisible()
})

test('Sandbox entry and rail fit a narrower cutter workspace', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto('/cutter')
  await page.getByRole('button', { name: /Sandbox Mode/ }).click()
  const bounds = await page.evaluate(() => {
    const entry = document.querySelector('.sandbox-entry')!.getBoundingClientRect()
    const rail = document.querySelector('.sandbox-toolbar')!.getBoundingClientRect()
    const actions = document.querySelector('.sandbox-entry-buttons')!.getBoundingClientRect()
    return { entryRight: entry.right, railLeft: rail.left, actionsRight: actions.right, actionsLeft: actions.left }
  })
  expect(bounds.entryRight).toBeLessThanOrEqual(bounds.railLeft + 1)
  expect(bounds.actionsRight).toBeLessThanOrEqual(bounds.entryRight)
  expect(bounds.actionsLeft).toBeGreaterThanOrEqual(0)
})
