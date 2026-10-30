import { expect, test } from './helpers/testState'
import type { Page } from '@playwright/test'

const openPack = async (page: Page, name: string) => {
  const carousel = page.locator('.studio-pack-carousel')
  for (let i = 0; i < 12 && (await carousel.locator('.slide.is-active h3').textContent()) !== name; i++) {
    await carousel.locator('.nav.next').click()
  }
  await expect(carousel.locator('.slide.is-active h3')).toHaveText(name)
  await carousel.locator('.slide.is-active .create').click()
  await expect(page.locator('svg[data-sachet-measures], #preview svg').first()).toBeAttached()
}

test('v12 landing tagline, FlowAI mark and Strip Laminate naming', async ({ page }) => {
  await page.goto('/cutter')
  await expect(page.locator('.kyza-brand-product').first()).toHaveText('Workflows built on Intelligence')
  const help = page.getByRole('button', { name: /Help Me Choose/ })
  await expect(help.locator('svg.flow-mark path')).toHaveCount(3)
  await expect(help.locator('svg.flow-mark text')).toHaveCount(0)
  const carousel = page.locator('.studio-pack-carousel')
  const names: string[] = []
  for (let i = 0; i < 10; i++) { names.push((await carousel.locator('.slide.is-active h3').textContent()) ?? ''); await carousel.locator('.nav.next').click() }
  expect(names).toContain('Strip Film/Laminate')
  expect(names.join()).not.toContain('Lane Laminate')
})

test('v12 3SS defaults, measures and sachet eyemark validation', async ({ page }) => {
  await page.goto('/cutter')
  await openPack(page, '3-Side Seal Sachet')
  const sachet = page.locator('svg[data-sachet-measures]')
  await expect(sachet).toHaveAttribute('data-sachet-trim-position', 'left')
  await expect(sachet).toHaveAttribute('data-sachet-trim-width', '8')
  const mark = sachet.locator('[data-role="eye-mark"]').first()
  expect(Number(await mark.getAttribute('x')) - Number(await sachet.getAttribute('data-sachet-margin'))).toBeCloseTo(1.5, 5)
  await expect(sachet.locator('[data-role="sachet-measure-overall"] text')).toHaveText('W 84mm')
  await expect(sachet.locator('[data-role="sachet-measure-trim"] text')).toHaveText('8mm')
  await expect(page.locator('[data-validation-code="EYEMARK_POSITION_UNRESOLVED"]')).toHaveCount(0)
  await expect(page.locator('[data-validation-code="PACK_VALIDATION_ERROR"]')).toHaveCount(0)
  const steps = page.locator('.step-navigation-count input')
  await steps.fill('3')
  await steps.dispatchEvent('change')
  await expect(sachet.locator('[data-role="sachet-measure-overall"] text')).toHaveText('W 236mm')
  await expect(sachet.locator('[data-role="sachet-measure-lane"]')).toHaveCount(3)
})

test('v12 nested step svgs share the cutter scale', async ({ page }) => {
  await page.goto('/cutter')
  await openPack(page, '4-Side Seal Sachet')
  const step = page.locator('svg[data-sachet-measures] svg[data-repeat-id="1A"]')
  const width = await step.getAttribute('width')
  expect(await step.evaluate(node => getComputedStyle(node).width)).toBe(`${width}px`)
  const tag = await page.locator('g[data-step-tag="1A"]').boundingBox()
  const preview = await page.locator('#preview').boundingBox()
  expect(tag && preview && tag.y + tag.height <= preview.y + preview.height).toBeTruthy()
})

test('v12 seal labels Place after the shared delay and never share a seal', async ({ page }) => {
  await page.goto('/cutter')
  await openPack(page, '3-Side Seal Sachet')
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  await page.getByRole('button', { name: 'Elements', exact: true }).first().click()
  await page.locator('[role="tab"]', { hasText: 'Labels' }).first().click()
  await page.locator('.labels-dropdown button[aria-expanded]').filter({ hasText: /Tags/ }).first().click()
  const selectNewest = async () => {
    const hit = page.locator('svg [data-role="attribute-box"][data-box-id^="label-seal-area"]').last()
    const box = await hit.boundingBox()
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  }
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Add SEAL AREA label' }).click()
    await selectNewest()
    if (i === 0) {
      await page.waitForTimeout(700)
      await expect(page.locator('[data-label-place]')).toHaveCount(0)
    }
    await page.locator('[data-context-menu-trigger]').click({ timeout: 4000 })
    await expect(page.locator('[data-label-place]')).toBeEnabled()
    await page.locator('[data-label-place]').click()
  }
  const top = await page.locator('svg[data-sachet-measures] [data-seal-side="top"]').boundingBox()
  const first = await page.locator('svg rect[data-role="attribute-box"][data-box-id^="label-seal-area"]').first().boundingBox()
  expect(first!.y).toBeGreaterThanOrEqual(top!.y - 0.5)
  expect(first!.y + first!.height).toBeLessThanOrEqual(top!.y + top!.height + 0.5)
  await page.getByRole('button', { name: 'Add SEAL AREA label' }).click()
  await selectNewest()
  await page.locator('[data-context-menu-trigger]').click({ timeout: 4000 })
  await expect(page.locator('[data-label-place]')).toBeDisabled()
  await expect(page.locator('[data-label-place-note]')).toHaveText('All 4 seals taken')
})

test('v12 dashboard news distinguishes available from planned', async ({ page }) => {
  await page.goto('/')
  const tabs = page.locator('.kyza-feature-tabs button')
  await expect(tabs).toHaveCount(5)
  expect(await tabs.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual([
    'How it works (Available now)', 'Sandbox Mode (Available now)', 'Legends (Coming soon)', 'Artwork (Coming soon)', 'Roadmap (Coming soon)',
  ])
  await tabs.nth(4).click()
  const active = page.locator('.kyza-feature-slide.is-active')
  await expect(active.locator('.kyza-feature-status')).toHaveText('Coming soon')
  await expect(active.locator('.kyza-feature-body')).toContainText('None of these are released yet')
  await tabs.nth(1).click()
  await expect(active.locator('.kyza-feature-action')).toHaveAttribute('href', '/cutter?studio=start')
})
