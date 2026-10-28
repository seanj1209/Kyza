import { expect, test } from './helpers/testState'

test('@beta V5.7 Sandbox tabs and pack projects get separate names', async ({ page }) => {
  await page.goto('/cutter')
  await page.getByRole('button', { name: /Sandbox Mode/ }).click()
  await expect(page.locator('.artboard-tab.is-active')).toHaveText('SANDBOX_1')
  await page.locator('.artboard-tab-add').click()
  await expect(page.locator('.sandbox-entry')).toBeVisible()
  await expect(page.locator('.artboard-tab.is-active')).toHaveText('SANDBOX_2')
  await page.locator('.artboard-tab-shell').first().locator('.artboard-tab').click()
  await expect(page.locator('.sandbox-entry')).toBeVisible()
  await expect(page.locator('.artboard-tab.is-active')).toHaveText('SANDBOX_1')
  await page.locator('.artboard-tab-shell').last().locator('.artboard-tab').click()
  await expect(page.locator('.sandbox-entry')).toBeVisible()
  await expect(page.locator('.artboard-tab.is-active')).toHaveText('SANDBOX_2')
  await page.getByRole('button', { name: 'Return to Cutter Studio start page' }).click()
  await page.locator('[data-action="start-project"]').click()
  await expect(page.locator('.artboard-tab.is-active')).toHaveText('Untitled_Project_1')
})

test('@beta V5.7 DOY gusset tips align with the 70 mm measure and seals blend', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveDoyBounds } = await import('/apps/web/src/core/geometry/resolvers/doyBounds.ts')
    const { applyBaseLayerCustomisation } = await import('/apps/web/src/renderers/baseLayerCustomisation.ts')
    const spec = getPackModule('doy-pouch')!.getDefaults()
    spec.doyPouch = { ...spec.doyPouch!, panelWidths: { ...spec.doyPouch!.panelWidths, center: 70 }, bottomSeal: 7.5, gussetSync: true }
    const bounds = resolveDoyBounds(spec, { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const svg = getPackModule('doy-pouch')!.render(spec)
    applyBaseLayerCustomisation(svg, spec)
    const visual = svg.querySelector('[data-role="doy-seal-visual"]')!
    return {
      leftTip: bounds.arcLeftX + bounds.arcInsetDepth * .75,
      leftMeasure: bounds.centerLeft,
      rightTip: bounds.arcRightX - bounds.arcInsetDepth * .75,
      rightMeasure: bounds.centerRight,
      visualOpacity: visual.getAttribute('opacity'),
      sealOpacities: Array.from(visual.querySelectorAll('[data-role="seal-rect"], [data-role="doy-bottom-seal-region"]')).map(node => node.getAttribute('opacity')),
      sealFills: Array.from(visual.querySelectorAll('[data-role="seal-rect"], [data-role="doy-bottom-seal-region"]')).map(node => node.getAttribute('fill'))
    }
  })
  expect(result.leftTip).toBeCloseTo(result.leftMeasure, 5)
  expect(result.rightTip).toBeCloseTo(result.rightMeasure, 5)
  expect(result.visualOpacity).toBe('0.32')
  expect(new Set(result.sealOpacities)).toEqual(new Set(['1']))
  expect(new Set(result.sealFills)).toEqual(new Set(['#2e8b57']))
})

test('@beta V5.7 DOY and K Seal bottom seal submeasures use compact values', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveKSealLayout } = await import('/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts')
    document.documentElement.setAttribute('data-sub-measures', 'true')
    const doy = getPackModule('doy-pouch')!.render(getPackModule('doy-pouch')!.getDefaults())
    const doyLabels = Array.from(doy.querySelectorAll('#sub_measure_features text')).map(node => node.textContent)
    const kSpec = getPackModule('k-seal-pouch')!.getDefaults()
    const kBottom = resolveKSealLayout(kSpec).featureMeasureSegments.filter(segment => segment.row === 'bottom')
    return { doyLabels, kBottom: kBottom.map(segment => segment.label) }
  })
  expect(result.doyLabels.filter(label => label === '7.5')).toHaveLength(4)
  expect(result.kBottom.slice(2, 6)).toEqual(['7.5', '7.5', '7.5', '7.5'])
})
