import { CANONICAL_PROJECT_STORAGE_KEY, createManualProjectFromDashboard, expect, test } from "./helpers/testState"

async function openFlowwrapWithBbe(page: import('@playwright/test').Page, name: string) {
  const project = await createManualProjectFromDashboard(page, { name, packLabel: "Flowwrap" })
  await page.evaluate(({ id, key }) => {
    const projects = JSON.parse(localStorage.getItem(key)!)
    const current = projects.find((item: { id: string }) => item.id === id)
    current.cutter.legacySpec.attributeBoxes = [{ id: 'v81-bbe', kind: 'bbe', x: 24, y: 24, width: 28, height: 14 }]
    current.revision++
    localStorage.setItem(key, JSON.stringify(projects))
  }, { id: project!.id, key: CANONICAL_PROJECT_STORAGE_KEY })
  await page.reload()
  await expect(page.locator('#preview-canvas [data-box-id="v81-bbe"][data-role="attribute-box"]').first()).toBeVisible()
}

test("@beta V8.1 Lidding eyemark clearance expands the cutter with each mark", async ({ page }) => {
  await page.goto("/")
  const geometry = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolveLiddingLayout, syncLiddingCutterSize } = await import("/apps/web/src/constraints/lidding.ts")
    const original = getPackModule("lidding")!.getDefaults()
    const first = resolveLiddingLayout(original)
    const wider = syncLiddingCutterSize({ ...original, eyeMarks: { ...original.eyeMarks!, width2: 15 } })
    const second = resolveLiddingLayout(wider)
    const bounds = (layout: typeof first) => ({
      leftGap: layout.cells[0].x - (layout.eyemarks[0].x + layout.eyemarks[0].width),
      rightGap: layout.eyemarks[1].x - (layout.cells[0].x + layout.cells[0].width),
    })
    return { firstWidth: original.width, secondWidth: wider.width, first: bounds(first), second: bounds(second) }
  })
  // Lidding update (AMENDS 8.2): each marked side is 1.5 mm edge + eyemark + 1.5 mm to the lid.
  expect(geometry).toEqual({ firstWidth: 216, secondWidth: 221, first: { leftGap: 1.5, rightGap: 1.5 }, second: { leftGap: 1.5, rightGap: 1.5 } })
})

test("@beta V8.1 DOY bottom seals and paper-strip folds have individual sub measures", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolvePaperStripLayout } = await import("/apps/web/src/core/geometry/resolvers/resolvePaperStripLayout.ts")
    document.documentElement.setAttribute("data-sub-measures", "true")
    const doy = getPackModule("doy-pouch")!.render(getPackModule("doy-pouch")!.getDefaults())
    const bottom = [...doy.querySelectorAll("#sub_measure_features text")].map(node => node.textContent ?? "").filter(value => value.includes("7.5"))
    const strip = { ...getPackModule("paper-strip")!.getDefaults(), foldLines: [{ id: "fold-one", orientation: "vertical" as const, offset: 80 }] }
    const layout = resolvePaperStripLayout(strip)
    const drawing = getPackModule("paper-strip")!.render(strip)
    const foldMeasures = [...drawing.querySelectorAll('[data-role^="paper-strip-measure-live-width"]')].map(node => node.getAttribute("data-role"))
    document.documentElement.removeAttribute("data-sub-measures")
    return { bottomCount: bottom.length, foldXs: layout.instances[0].foldXs, foldMeasures }
  })
  expect(result.bottomCount).toBe(4)
  expect(result.foldXs).toHaveLength(1)
  expect(result.foldMeasures).toHaveLength(2)
  expect(result.foldMeasures.every(role => role?.includes("fold"))).toBe(true)
})

test("@beta V8.1 pouch preview reveals trim only when requested", async ({ page }) => {
  await page.goto('/cutter')
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === '3-side-seal-pouch') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole('menuitemcheckbox', { name: 'Pouch Preview' }).click()
  const svg = page.locator('#preview-canvas > svg')
  const withTrim = await svg.evaluate(node => node.viewBox.baseVal.width)
  await page.screenshot({ path: 'test-results/v81-3ss-fop-with-trim.png' })
  await page.locator('.pouch-preview-overlay').getByRole('button', { name: 'Trim' }).click()
  const noTrim = await svg.evaluate(node => node.viewBox.baseVal.width)
  expect(withTrim - noTrim).toBeCloseTo(15, 5)
  await page.screenshot({ path: 'test-results/v81-3ss-fop-no-trim.png' })
  await page.locator('.pouch-preview-overlay').getByRole('button', { name: 'BOP' }).click()
  await expect(svg).toHaveAttribute('data-pouch-preview-face', 'bop')
  await page.screenshot({ path: 'test-results/v81-3ss-bop-no-trim.png' })
})

test("@beta V8.1 double-click selects an element and blank space restores Pan", async ({ page }) => {
  await openFlowwrapWithBbe(page, "V8.1 double-click")
  const svg = page.locator("#preview-canvas > svg")
  const bbe = svg.locator('[data-role="attribute-box"][data-kind="bbe"]').first()
  await expect(bbe).toBeVisible()
  const box = (await bbe.boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
  await expect(svg).toHaveAttribute("data-select-enabled", "true")
  await expect(svg.locator('[data-selection-id^="attribute-box:"]')).toHaveCount(1)
  await page.locator("#preview-frame").dblclick({ position: { x: 280, y: 240 } })
  await expect(svg).toHaveAttribute("data-pan-enabled", "true")
})

test("@beta V8.1 exact Size stays open while editing and links proportions only when requested", async ({ page }) => {
  await openFlowwrapWithBbe(page, "V8.1 exact size")
  const svg = page.locator("#preview-canvas > svg")
  const bbe = svg.locator('[data-role="attribute-box"][data-kind="bbe"]').first()
  const box = (await bbe.boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
  await svg.locator('[data-context-menu-trigger]').click()
  await svg.locator('[data-context-size]').click()
  const form = svg.locator('#selection_context_actions form')
  await expect(form).toBeVisible()
  const width = form.getByRole('spinbutton', { name: 'Width mm' })
  const height = form.getByRole('spinbutton', { name: 'Height mm' })
  const originalHeight = await height.inputValue()
  await width.fill('35.25')
  await expect(form).toBeVisible()
  await expect(height).toHaveValue(originalHeight)
  const link = form.getByRole('button', { name: 'Link width and height' })
  await expect(link).toHaveAttribute('aria-pressed', 'false')
  await link.click()
  await width.fill('40')
  await expect(link).toHaveAttribute('aria-pressed', 'true')
  await expect(height).not.toHaveValue(originalHeight)
  await form.getByRole('button', { name: 'Apply size' }).click()
  await expect(svg.locator('[data-role="attribute-box"][data-kind="bbe"]').first()).toHaveAttribute('width', '40')
})
