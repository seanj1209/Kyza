import { createManualProjectFromDashboard, expect, test } from './helpers/testState'

test('@beta V6 pouch defaults and finished axes match the cutter', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { doyFinishedWidth } = await import('/apps/web/src/core/geometry/resolvers/doyBounds.ts')
    const { resolveKSealDimensionSemantics } = await import('/apps/web/src/geometry/kSealPouchGeometry.ts')
    const doy = getPackModule('doy-pouch')!.getDefaults()
    const kseal = getPackModule('k-seal-pouch')!.getDefaults()
    return { doy: { width: doy.height, height: doyFinishedWidth(doy), gusset: doy.doyPouch!.panelWidths.center / 2,
      bottom: doy.doyPouch!.bottomSeal, side: doy.seal }, kseal: resolveKSealDimensionSemantics(kseal), trim: kseal.kSealPouch?.trimEnabled }
  })
  expect(result.doy).toEqual({ width: 140, height: 250, gusset: 40, bottom: 7.5, side: 7.5 })
  expect(result.kseal.finishedWidthMm).toBe(result.kseal.flatHeightMm)
  expect(result.trim).toBe(false)
})

test('@beta V6 K Seal separates guide colour from seal fill and adds tip spans', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { applyElementAppearance, availableAppearanceTargets } = await import('/apps/web/src/renderers/elementAppearance.ts')
    const { resolveKSealLayout } = await import('/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts')
    const base = getPackModule('k-seal-pouch')!.getDefaults()
    const spec = { ...base, elementAppearance: { gusset: { color: '#aabbcc' }, 'gusset-seals': { color: '#123456', fill: 'solid' as const } } }
    const svg = getPackModule('k-seal-pouch')!.render(spec)
    applyElementAppearance(svg, spec)
    const bottom = resolveKSealLayout(spec).featureMeasureSegments.filter(row => row.row === 'bottom')
    return {
      target: availableAppearanceTargets(spec).some(item => item.id === 'gusset-seals'),
      guideColours: Array.from(svg.querySelectorAll('[data-role="kseal-inner-arm-guide"], [data-role="kseal-center-line"], [data-role="kseal-bottom-seal-guide"]')).map(node => node.getAttribute('stroke')),
      armFill: svg.querySelector('[data-role="kseal-arm"]')?.getAttribute('fill'),
      bottomFill: svg.querySelector('[data-role="kseal-bottom-seal"]')?.getAttribute('fill'),
      sideFill: svg.querySelector('[data-role="kseal-side-seal"]')?.getAttribute('fill'),
      tipSpans: bottom.slice(6).map(row => row.endX - row.startX)
    }
  })
  expect(result.target).toBe(true)
  expect(new Set(result.guideColours)).toEqual(new Set(['#aabbcc']))
  expect(result.armFill).toBe('#123456')
  expect(result.bottomFill).toBe('#123456')
  expect(result.sideFill).not.toBe('#123456')
  expect(result.tipSpans).toHaveLength(2)
  expect(result.tipSpans.every(span => span > 0)).toBe(true)
})

test('@beta V6 Flow offers trim when a second K Seal eyemark is selected', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'V6 trim prompt', packLabel: 'K Seal Pouch' })
  await page.getByRole('button', { name: 'Base', exact: true }).click()
  await page.locator('#base-model-panel').getByRole('checkbox', { name: 'Trim', exact: true }).uncheck()
  await page.locator('.base-eyemark-count button').filter({ hasText: /^2$/ }).click()
  await expect(page.locator('#flow-assistant-dock')).toHaveAttribute('data-state', 'chat')
  await expect(page.locator('.flow-assistant-response')).toContainText('Enable trim')
  await page.getByRole('button', { name: 'Enable trim and add eyemark' }).click()
  await expect(page.locator('.base-eyemark-count button').filter({ hasText: /^2$/ })).toHaveClass(/is-active/)
})
