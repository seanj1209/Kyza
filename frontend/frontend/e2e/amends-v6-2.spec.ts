import { createManualProjectFromDashboard, expect, test } from './helpers/testState'

async function subMeasuresOn(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Base', exact: true }).click()
  const sub = page.locator('#base-model-panel .toggle-pair').filter({ has: page.locator('span', { hasText: /^Sub$/ }) })
  await sub.getByRole('button', { name: 'On' }).click()
  await page.getByRole('button', { name: 'Base', exact: true }).click()
}

/** Text labels in the cutter SVG with their y (SVG units), grouped by label. */
async function measureLabels(page: import('@playwright/test').Page) {
  return page.evaluate(() => [...document.querySelectorAll('#preview-canvas svg text')]
    .map(node => ({ text: (node.textContent ?? '').trim(), y: Number(node.getAttribute('y')), x: Number(node.getAttribute('x')) }))
    .filter(item => /^\d+(\.\d+)?mm$/.test(item.text)))
}

test('@beta V6.2 DOY fold guides sit on the 40 mm marks and the oval keeps one seal inside', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveDoyBounds } = await import('/apps/web/src/core/geometry/resolvers/doyBounds.ts')
    const pack = getPackModule('doy-pouch')!
    const spec = pack.getDefaults()
    const bounds = resolveDoyBounds(spec, { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const svg = pack.render(spec)
    const mids = [...svg.querySelectorAll('[data-role="doy-bottom-seal-midline"]')]
      .map(line => Number(line.getAttribute('x1') ?? line.getAttribute('x')))
    const centre = (mids[0] + mids[1]) / 2
    return {
      count: mids.length,
      offsets: mids.map(x => x - centre),
      centerHalf: bounds.centerWidth / 2,
      ovalWidest: bounds.ovalWidth * .375,
      arcDeepest: bounds.arcInsetDepth * .75 + bounds.arcLeftX - bounds.ovalCenterX,
      bottomSeal: bounds.bottomSealGap / 2,
    }
  })
  expect(result.count).toBe(2)
  expect(result.offsets[0]).toBeCloseTo(-result.centerHalf, 3)
  expect(result.offsets[1]).toBeCloseTo(result.centerHalf, 3)
  expect(result.ovalWidest).toBeCloseTo(result.centerHalf - result.bottomSeal, 3)
  expect(result.arcDeepest).toBeCloseTo(-result.centerHalf - result.bottomSeal, 3)
})

for (const pack of [{ label: 'DOY Pouch', tip: '40mm' }, { label: 'K Seal Pouch', tip: null }]) {
  test(`@beta V6.2 ${pack.label} tip measures share the 40 mm gusset row`, async ({ page }) => {
    await createManualProjectFromDashboard(page, { name: `V6.2 ${pack.label}`, packLabel: pack.label })
    await subMeasuresOn(page)
    await page.waitForTimeout(300)
    const labels = await measureLabels(page)
    const forties = labels.filter(item => item.text === '40mm')
    expect(forties.length).toBeGreaterThanOrEqual(2)
    const gussetRowY = Math.max(...forties.map(item => item.y))
    const sameRow = labels.filter(item => Math.abs(item.y - gussetRowY) < .01)
    // Four segments on one row: tip – 40 – 40 – tip.
    expect(sameRow.length).toBe(4)
    if (pack.tip) expect(sameRow.every(item => item.text === pack.tip)).toBe(true)
    const xs = sameRow.map(item => item.x).sort((a, b) => a - b)
    xs.slice(1).forEach((x, index) => expect(x).toBeGreaterThan(xs[index]))
  })
}

test('@beta V6.2 Sandbox Set Up draws a 540 × 250 clear cutter outline only', async ({ page }) => {
  await page.goto('/cutter')
  await page.getByRole('button', { name: /Sandbox Mode/ }).click()
  await page.getByRole('button', { name: 'Set Up', exact: true }).click()
  const svg = page.locator('#preview-canvas svg[data-pack="sandbox"]')
  await expect(svg).toHaveCount(1)
  await expect(svg).toHaveAttribute('data-sandbox-width', '540')
  await expect(svg).toHaveAttribute('data-sandbox-height', '250')
  await expect(svg).toHaveAttribute('data-substrate', 'clear')
  const content = await svg.evaluate(node => ({
    roles: [...node.querySelectorAll('[data-role]')].map(item => item.getAttribute('data-role')),
    layers: [...node.querySelectorAll('[data-layer-id]')].map(item => item.getAttribute('data-layer-id')),
    stroke: node.querySelector('[data-role="sandbox-cutter-outline"]')?.getAttribute('stroke'),
  }))
  expect(content.roles).toEqual(['sandbox-cutter-outline'])
  expect(content.layers).toEqual(['substrate', 'cutter-outline'])
  expect(content.stroke).toBe('#2eb774')
  await expect(page.locator('.sandbox-panel:not([hidden]) input.sandbox-input').first()).toHaveValue('540')

  // Resizing in Set-Up redraws the outline.
  await page.locator('.sandbox-panel:not([hidden]) input.sandbox-input').first().fill('600')
  await page.locator('.sandbox-panel:not([hidden]) input.sandbox-input').first().dispatchEvent('input')
  await page.locator('.sandbox-panel:not([hidden]) input.sandbox-input').first().dispatchEvent('change')
  await expect(svg).toHaveAttribute('data-sandbox-width', '600')

  // The substrate stays clear until Specs ▸ Film Colour changes it.
  await page.locator('.sandbox-toolbar-btn[aria-label="Specs"]').click()
  await page.locator('select[data-sub-field="filmColour"]').first().selectOption('White')
  await expect(page.locator('#preview-canvas svg[data-pack="sandbox"]')).toHaveAttribute('data-substrate', 'white')
})

test('@beta V6.2 DOY pack card uses the light film like the other pack types', async ({ page }) => {
  await page.goto('/')
  const markup = await page.evaluate(async () => {
    const { PACK_ILLUSTRATIONS } = await import('/apps/web/src/ui/studioPackIllustrations.ts')
    return (PACK_ILLUSTRATIONS as Record<string, string>).doy
  })
  expect(markup).toContain('DOY')
  expect(markup).not.toContain('gFilmDark')
})
