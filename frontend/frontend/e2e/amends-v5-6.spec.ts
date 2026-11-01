import { createManualProjectFromDashboard, expect, test } from './helpers/testState'

// AMENDS 6.2 superseded the V5.6 15 mm gap: the fold guides now sit on the
// 40 mm marks and the synced oval keeps one bottom seal (7.5 mm) inside them.
test('@beta V5.6/6.2 synced DOY keeps one-seal (7.5 mm) oval-to-arc gaps and 7.5 mm seals', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveDoyBounds } = await import('/apps/web/src/core/geometry/resolvers/doyBounds.ts')
    const { updateGussetControl, doySideAngle } = await import('/packages/cutter-engine/actions/gussetControls.ts')
    const base = getPackModule('doy-pouch')!.getDefaults()
    const sample = { ...base, width: 340, height: 209, doyPouch: { ...base.doyPouch!, bottomSeal: 7.5, panelWidths: { ...base.doyPouch!.panelWidths, center: 70 }, gussetSync: true } }
    const measurements = [35, 40, 45].map(size => {
      const spec = updateGussetControl(sample, 'gussetSize', size)
      const bounds = resolveDoyBounds(spec, { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
      return {
        gusset: bounds.centerWidth,
        seal: bounds.bottomSealGap / 2,
        leftGap: bounds.ovalCenterX - bounds.ovalWidth * .375 - (bounds.arcLeftX + bounds.arcInsetDepth * .75),
        rightGap: bounds.arcRightX - bounds.arcInsetDepth * .75 - (bounds.ovalCenterX + bounds.ovalWidth * .375),
        angle: doySideAngle(spec),
      }
    })
    const manual = updateGussetControl(sample, 'sync', false)
    const withOffset = { ...manual, doyPouch: { ...manual.doyPouch!, arcOffsetX: 6 } }
    const before = resolveDoyBounds(manual, { originX: 0, liveOriginX: 0, liveWidth: manual.width, cutterWidth: manual.width })!
    const after = resolveDoyBounds(withOffset, { originX: 0, liveOriginX: 0, liveWidth: withOffset.width, cutterWidth: withOffset.width })!
    return { measurements, manualArcMoved: before.arcLeftX !== after.arcLeftX }
  })
  expect(result.measurements.map(item => item.gusset)).toEqual([70, 80, 90])
  result.measurements.forEach(item => {
    expect(item.seal).toBe(7.5)
    expect(item.leftGap).toBeCloseTo(7.5, 3)
    expect(item.rightGap).toBeCloseTo(7.5, 3)
  })
  expect(result.measurements[0].angle).toBeGreaterThan(27)
  expect(result.measurements[0].angle).toBeLessThan(29)
  expect(result.manualArcMoved).toBe(true)
})

test('@beta V5.6 Gusset Seals appearance is DOY-only and independent of base seals', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { availableAppearanceTargets } = await import('/apps/web/src/renderers/elementAppearance.ts')
    const { applyBaseLayerCustomisation, resolveBaseCustomisation } = await import('/apps/web/src/renderers/baseLayerCustomisation.ts')
    const doy = getPackModule('doy-pouch')!.getDefaults()
    const plain = getPackModule('flowwrap')!.getDefaults()
    const custom = { ...doy, elementAppearance: { 'gusset-seals': { color: '#123456', opacity: .6, fill: 'solid' as const } } }
    const svg = getPackModule('doy-pouch')!.render(custom)
    applyBaseLayerCustomisation(svg, custom)
    const region = svg.querySelector('[data-role="doy-bottom-seal-region"]')!
    const seal = svg.querySelector('[data-role="seal-rect"][data-seal-side="bottom"]')!
    const visual = svg.querySelector('[data-role="doy-seal-visual"]')!
    return {
      doyTarget: availableAppearanceTargets(doy).some(item => item.name === 'Gusset Seals'),
      plainTarget: availableAppearanceTargets(plain).some(item => item.name === 'Gusset Seals'),
      gussetFill: region.getAttribute('fill'), gussetOpacity: region.getAttribute('opacity'), visualOpacity: visual.getAttribute('opacity'),
      sealFill: seal.getAttribute('fill'), sealOpacity: seal.getAttribute('opacity'), sealStroke: seal.getAttribute('stroke'),
      doyDefault: resolveBaseCustomisation(doy).seals,
      plainDefault: resolveBaseCustomisation(plain).seals,
    }
  })
  expect(result.doyTarget).toBe(true)
  expect(result.plainTarget).toBe(false)
  expect(result.gussetFill).toBe('#123456')
  expect(result.gussetOpacity).toBe('1')
  expect(result.visualOpacity).toBe('0.6')
  expect(result.sealFill).toBe('#123456')
  expect(result.sealOpacity).toBe('1')
  expect(result.sealStroke).toBe('none')
  expect(result.doyDefault.color).toBe('#2e8b57')
  expect(result.doyDefault.opacity).toBe(.32)
  expect(result.plainDefault.opacity).toBe(.15)
})

test('@beta V5.6 Customise keeps the canvas dock in place', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'V5.6 dock', packLabel: 'DOY Pouch' })
  const dock = page.locator('#dock-shell')
  const before = await dock.boundingBox()
  await page.getByRole('button', { name: 'Customise', exact: true }).click()
  await expect(page.locator('#customisation-panel')).toHaveClass(/is-open/)
  const after = await dock.boundingBox()
  expect(before && after && Math.abs(before.x - after.x) < 2 && Math.abs(before.y - after.y) < 2).toBe(true)
  const panel = page.locator('#customisation-panel')
  await panel.getByRole('tab', { name: 'Elements' }).click()
  await panel.getByRole('radio', { name: 'Gusset Seals' }).click()
  const colour = panel.getByRole('textbox', { name: 'Gusset Seals hex colour' })
  await colour.fill('#123456')
  await colour.press('Tab')
  await expect(page.locator('#preview-canvas [data-role="doy-bottom-seal-region"]')).toHaveAttribute('fill', '#123456')
})

test('@beta V5.6 a chosen Sub measure setting survives project tabs', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'V5.6 measures', packLabel: 'Flowwrap' })
  await page.getByRole('button', { name: 'Base', exact: true }).click()
  const sub = page.locator('#base-model-panel .toggle-pair').filter({ has: page.locator('span', { hasText: /^Sub$/ }) })
  await sub.getByRole('button', { name: 'On' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-sub-measures', 'true')
  await page.locator('.artboard-tab-add').click()
  await page.locator('.new-artboard-button').click()
  await expect(page.locator('html')).toHaveAttribute('data-sub-measures', 'true')
  await page.locator('.artboard-tab-shell').first().locator('.artboard-tab').click()
  await expect(page.locator('html')).toHaveAttribute('data-sub-measures', 'true')
  await sub.getByRole('button', { name: 'Off' }).click()
  await page.locator('.artboard-tab-shell').last().locator('.artboard-tab').click()
  await expect(page.locator('html')).toHaveAttribute('data-sub-measures', 'false')
})

test('@beta V5.6 visible Help Me Choose copy says Flow', async ({ page }) => {
  await page.goto('/cutter')
  const help = page.getByRole('button', { name: /Help Me Choose/ })
  await expect(help.locator('small')).toContainText('Flow suggestions')
  await help.click()
  await expect(page.locator('body')).not.toContainText('FlowAI')
})
