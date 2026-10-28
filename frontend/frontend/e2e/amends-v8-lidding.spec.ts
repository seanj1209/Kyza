import { expect, test } from "./helpers/testState"

test("@beta Lidding starts with a style chooser and keeps stepped dimensions valid", async ({ page }) => {
  await page.goto("/cutter")
  const next = page.locator(".studio-pack-carousel .next")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await next.click()
  }
  await expect(page.locator('.studio-pack-carousel .slide.is-active')).toHaveAttribute("data-pack-id", "lidding")
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await expect(setup).toBeVisible()
  await setup.getByRole("button", { name: "Square lid" }).click()
  await expect(setup).toHaveCount(0)
  await expect(page.locator('#preview-canvas svg[data-pack="lidding"]')).toBeVisible()
  const dock = page.getByRole("region", { name: "Lid dock" })
  await expect(dock).toBeVisible()
  await expect(dock).toContainText("SYNC ON")
  await expect(dock.getByRole("spinbutton", { name: "Outer seal width" })).toHaveValue("184")
  await dock.getByRole("spinbutton", { name: "Outer seal width" }).fill("182")
  await dock.getByRole("spinbutton", { name: "Outer seal width" }).blur()
  await expect(dock.getByRole("spinbutton", { name: "Outer cutter width" })).toHaveValue("190")
  await expect(dock.getByRole("spinbutton", { name: "Artwork safe area" })).toHaveValue("178")
  await expect(page.getByLabel("Overall cutter (slit)")).toContainText("Min cutter width 216 mm")
  await dock.getByRole("tab", { name: "Stepping" }).click()
  await dock.getByRole("spinbutton", { name: "Across" }).fill("3")
  await dock.getByRole("spinbutton", { name: "Across" }).blur()
  await expect(dock.getByRole("button", { name: "3A" })).toBeDisabled()
  await dock.getByRole("spinbutton", { name: "Around" }).fill("4")
  await dock.getByRole("spinbutton", { name: "Around" }).blur()
  await expect(dock.getByRole("button", { name: "1B" })).toHaveCount(0)
  await dock.getByRole("spinbutton", { name: "Around" }).fill("5")
  await dock.getByRole("spinbutton", { name: "Around" }).blur()
  await expect(dock).toContainText("Max Singular Repeat is 790mm")
  await expect(dock.getByRole("spinbutton", { name: "Around" })).toHaveValue("4")
})

test("@beta Lidding renderer keeps plain lids clear and honours Inner Lines", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { updateLiddingSpec } = await import("/apps/web/src/constraints/lidding.ts")
    const pack = getPackModule("lidding")!
    const plain = updateLiddingSpec(pack.getDefaults(), { style: "plain" })
    const plainSvg = pack.render(plain)
    const stepped = updateLiddingSpec(pack.getDefaults(), { across: 3, around: 2, innerLines: false })
    const outerOnly = pack.render(stepped)
    const inner = pack.render(updateLiddingSpec(stepped, { innerLines: true }))
    return {
      plainCuts: plainSvg.querySelectorAll('[data-role="lid-outer-cut"]').length,
      plainMarks: plainSvg.querySelectorAll('[data-role="eye-mark"]').length,
      outerCuts: outerOnly.querySelectorAll('[data-role="lid-outer-cut"]').length,
      outerInnerSeals: outerOnly.querySelectorAll('[data-role="lid-inner-seal"]').length,
      innerCuts: inner.querySelectorAll('[data-role="lid-outer-cut"]').length,
      innerSeals: inner.querySelectorAll('[data-role="lid-inner-seal"]').length,
      cells: inner.querySelectorAll('[data-lid-cell]').length,
    }
  })
  expect(result.plainCuts).toBe(0)
  expect(result.plainMarks).toBe(2)
  expect(result.outerCuts).toBe(6)
  expect(result.outerInnerSeals).toBe(12)
  expect(result.innerCuts).toBe(6)
  expect(result.innerSeals).toBe(12)
  expect(result.cells).toBeGreaterThanOrEqual(6)
})

test("@beta pouch preview crops at the centre boundary for each face", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolvePouchPreviewViewport } = await import("/apps/web/src/ui/pouchPreview.ts")
    return ["2-side-seal-pouch", "3-side-seal-pouch", "doy-pouch", "k-seal-pouch"].map(id => {
      const pack = getPackModule(id)!
      const spec = pack.getDefaults()
      const svg = pack.render(spec)
      const fop = resolvePouchPreviewViewport(svg, spec, { face: "fop", showTrim: true })!
      const bop = resolvePouchPreviewViewport(svg, spec, { face: "bop", showTrim: true })!
      return { id, fopLeft: fop.x, fopOuter: fop.faceLeft, fopRight: fop.x + fop.width, fopEdge: fop.faceRight, bopLeft: bop.x, bopEdge: bop.faceLeft, bopRight: bop.x + bop.width, bopOuter: bop.faceRight }
    })
  })
  for (const item of result) {
    expect(item.fopRight, item.id).toBeCloseTo(item.fopEdge, 5)
    expect(item.fopLeft, item.id).toBeCloseTo(item.fopOuter, 5)
    expect(item.bopLeft, item.id).toBeCloseTo(item.bopEdge, 5)
    expect(item.bopRight, item.id).toBeCloseTo(item.bopOuter, 5)
  }
})

test("@beta double-clicking the canvas returns Select and Measure to Pan", async ({ page }) => {
  await page.goto("/cutter")
  await page.locator('[data-action="start-project"]').click()
  const canvas = page.locator("#preview-frame")
  const select = page.locator('.dock-tool-button[data-tool="select"]')
  const measure = page.locator('.dock-tool-button[data-tool="measure"]')
  await select.click()
  await expect(select).toHaveAttribute("aria-pressed", "true")
  await canvas.dblclick({ position: { x: 280, y: 240 } })
  await expect(select).toHaveAttribute("aria-pressed", "false")
  await expect(page.locator('#preview-canvas svg')).toHaveAttribute("data-pan-enabled", "true")
  await measure.click()
  await expect(measure).toHaveAttribute("aria-pressed", "true")
  await canvas.dblclick({ position: { x: 280, y: 240 } })
  await expect(measure).toHaveAttribute("aria-pressed", "false")
  await expect(page.locator('#preview-canvas svg')).toHaveAttribute("data-pan-enabled", "true")
})

test("@beta side-seal pouch controls live in the left dock", async ({ page }) => {
  await page.goto("/cutter")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === '3-side-seal-pouch') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const dock = page.locator('.step-navigation.has-pouch-seals')
  await expect(dock).toBeVisible()
  await expect(dock).toContainText('3SS')
  await expect(dock.getByRole('spinbutton', { name: 'Step count' })).toHaveCount(0)
  await expect(dock.getByRole('button', { name: 'Sync side seals' })).toHaveAttribute('aria-pressed', 'true')
  await dock.getByRole('button', { name: 'Expand pouch seal tray' }).click()
  await expect(dock.getByRole('spinbutton', { name: 'Side Seals' })).toHaveValue('7.5')
  await expect(dock.getByRole('spinbutton', { name: 'Bottom Seals' })).toHaveValue('7.5')
  await dock.getByRole('spinbutton', { name: 'Side Seals' }).fill('8')
  await dock.getByRole('spinbutton', { name: 'Side Seals' }).blur()
  await expect(dock.getByRole('spinbutton', { name: 'Side Seals' })).toHaveValue('8')
  await dock.getByRole('spinbutton', { name: 'Bottom Seals' }).fill('9')
  await dock.getByRole('spinbutton', { name: 'Bottom Seals' }).blur()
  await expect(dock.getByRole('spinbutton', { name: 'Bottom Seals' })).toHaveValue('9')
  await dock.getByRole('button', { name: 'Sync side seals' }).click()
  await expect(dock.getByRole('button', { name: 'Sync side seals' })).toHaveAttribute('aria-pressed', 'false')
  await expect(dock.getByRole('spinbutton', { name: 'Left Seal' })).toBeVisible()
  await expect(dock.getByRole('spinbutton', { name: 'Right Seal' })).toBeVisible()
  await dock.getByRole('spinbutton', { name: 'Right Seal' }).fill('10')
  await dock.getByRole('spinbutton', { name: 'Right Seal' }).blur()
  await expect(dock.getByRole('spinbutton', { name: 'Right Seal' })).toHaveValue('10')
  await dock.getByRole('button', { name: 'Sync side seals' }).click()
  await expect(dock.getByRole('button', { name: 'Sync side seals' })).toHaveAttribute('aria-pressed', 'true')
  await expect(dock.getByRole('spinbutton', { name: 'Side Seals' })).toHaveValue('8')
})

test("@beta two-side pouch exposes linked side seals without a bottom seal control", async ({ page }) => {
  await page.goto('/cutter')
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === '2-side-seal-pouch') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const dock = page.locator('.step-navigation.has-pouch-seals')
  await expect(dock).toContainText('2SS')
  await expect(dock.getByRole('button', { name: 'Sync side seals' })).toHaveCount(0)
  await expect(dock.getByRole('spinbutton', { name: 'Step count' })).toHaveCount(0)
  await dock.getByRole('button', { name: 'Expand pouch seal tray' }).click()
  await expect(dock.getByRole('spinbutton', { name: 'Side Seals' })).toBeVisible()
  await expect(dock.getByRole('spinbutton', { name: 'Bottom Seals' })).toHaveCount(0)
  await dock.getByRole('spinbutton', { name: 'Side Seals' }).fill('8')
  await dock.getByRole('spinbutton', { name: 'Side Seals' }).blur()
  await expect(dock.getByRole('spinbutton', { name: 'Side Seals' })).toHaveValue('8')
})

test("@beta round manual lidding accepts 790 mm around and rejects the next step", async ({ page }) => {
  await page.goto('/cutter')
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole('dialog', { name: 'Lidding cutter setup' })
  await setup.getByRole('button', { name: 'Round lid' }).click()
  const dock = page.getByRole('region', { name: 'Lid dock' })
  await dock.getByRole('spinbutton', { name: 'Outer cutter diameter' }).fill('395')
  await dock.getByRole('spinbutton', { name: 'Outer cutter diameter' }).blur()
  await dock.getByRole('tab', { name: 'Stepping' }).click()
  await dock.getByRole('spinbutton', { name: 'Around' }).fill('2')
  await dock.getByRole('spinbutton', { name: 'Around' }).blur()
  await expect(page.getByLabel('Overall cutter (slit)')).toContainText('Around 790 mm / 790 mm')
  await expect(page.locator('#preview-canvas svg[data-lid-style="round"] [data-role="lid-outer-cut"]')).toHaveCount(2)
  await dock.getByRole('spinbutton', { name: 'Around' }).fill('3')
  await dock.getByRole('spinbutton', { name: 'Around' }).blur()
  await expect(dock.getByRole('spinbutton', { name: 'Around' })).toHaveValue('2')
  await expect(dock).toContainText('Max Singular Repeat is 790mm')
})

test("@beta Lidding exports an editable cutter SVG", async ({ page }) => {
  await page.goto('/cutter')
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole('dialog', { name: 'Lidding cutter setup' })
  await setup.getByRole('button', { name: 'Square lid' }).click()
  await page.locator('#studio-bottom-actions').getByRole('button', { name: 'Export', exact: true }).click()
  await page.locator('.file-menu-trigger').click()
  await page.getByRole('button', { name: 'Export selected', exact: true }).click()
  const review = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Close pre-export review' }) })
  await expect(review).toBeVisible()
  const download = page.waitForEvent('download')
  await review.getByRole('button', { name: 'Export Cutter' }).click()
  expect((await download).suggestedFilename()).toMatch(/\.svg$/)
})
