import { expect, test } from './helpers/testState'

const centreX = (box: { x: number; width: number } | null) => (box ? box.x + box.width / 2 : NaN)

test('v11 landing header, entry copy and centred pack indicator', async ({ page }) => {
  await page.goto('/cutter')
  await expect(page.locator('.start-studio-title')).toHaveText('Cutter Studio')
  await expect(page.locator('.start-sidebar-intro')).toHaveCount(0)
  await expect(page.locator('.start-pack-heading')).toHaveText('Get Started')
  await expect(page.locator('.start-pack-intro')).toHaveText('Choose a pack, import a cutter, or tell Kyza what you need.')
  const sandbox = page.getByRole('button', { name: /Sandbox Mode/ })
  await expect(sandbox.locator('small')).toHaveText('For Trials and Bespoke Project Work')
  await expect(page.locator('.start-entry-action:visible strong')).toHaveText(['Sandbox Mode', 'Import Cutter', 'Help Me Choose'])

  for (const width of [1440, 820, 480]) {
    await page.setViewportSize({ width, height: 900 })
    const carousel = page.locator('.studio-pack-carousel')
    await carousel.locator('.nav.next').click()
    const slide = await carousel.locator('.slide.is-active').boundingBox()
    const dots = await carousel.locator('.dots').boundingBox()
    expect(Math.abs(centreX(slide) - centreX(dots)), `indicator centred at ${width}px`).toBeLessThan(2)
    const current = await carousel.locator('.dot').evaluateAll(nodes => nodes.findIndex(node => node.getAttribute('aria-current') === 'true'))
    const active = await carousel.locator('.slide').evaluateAll(nodes => nodes.findIndex(node => node.classList.contains('is-active')))
    expect(current).toBe(active)
  }
})

test('v11 studio tour introduces entry routes then studio capabilities', async ({ page }) => {
  await page.goto('/cutter')
  const tour = page.locator('.studio-guide')
  await expect(tour.locator('.chip')).toHaveText('Studio tour')
  await expect(tour.locator('h4')).toHaveText('Choose how to start')
  await expect(tour.locator('.eyebrow')).toHaveText('Get started · 1 of 4')
  await expect(tour.locator('[data-scene="start"]')).toHaveClass(/is-active/)
  await expect(tour).not.toHaveClass(/is-paused/)
  await tour.getByRole('button', { name: 'Next tour slide' }).click()
  await expect(tour.locator('h4')).toHaveText('Design with precision')
  await expect(tour.locator('#kyza-guide-brief')).toContainText('600 ppi')
  await tour.getByRole('button', { name: /slide 4: Customise your cutter/ }).click()
  await expect(tour.locator('h4')).toHaveText('Customise your cutter')
  await tour.getByRole('button', { name: 'Previous tour slide' }).click()
  await expect(tour.locator('h4')).toHaveText('Add and position elements')
})

test('v11 stepped cutters show selection only through the step tab', async ({ page }) => {
  await page.goto('/cutter')
  const carousel = page.locator('.studio-pack-carousel')
  for (let i = 0; i < 12 && (await carousel.locator('.slide.is-active h3').textContent()) !== '4-Side Seal Sachet'; i++) {
    await carousel.locator('.nav.next').click()
  }
  await carousel.locator('.slide.is-active .create').click()
  await expect(page.locator('[data-step-tag="1A"]').first()).toBeAttached()
  await expect(page.locator('.step-active-outline')).toHaveCount(0)
  await expect(page.locator('.step-canvas-tag.is-active')).toHaveAttribute('data-step-tag', '1A')
  await expect(page.locator('.step-navigation-list button.is-active')).toHaveText('1A')
  await expect(page.locator('.step-canvas-tag.is-active rect')).toHaveCSS('fill', 'rgb(158, 19, 22)')
  await page.locator('g[data-step-tag="1B"]').dispatchEvent('click')
  await expect(page.locator('.step-canvas-tag.is-active')).toHaveAttribute('data-step-tag', '1B')
  await expect(page.locator('.step-navigation-list button.is-active')).toHaveText('1B')
  await expect(page.locator('.step-active-outline')).toHaveCount(0)
  await expect(page.locator('[data-role="seal-rect"]').first()).toBeAttached()
})
