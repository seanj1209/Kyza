import { createManualProjectFromDashboard, expect, test, readCurrentProject } from "./helpers/testState"

test("Flow retains the collapsed prompt and conversation while live QC remains accessible", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "Flow reconciliation", packLabel: "Flowwrap" })
  const dock = page.locator("#flow-assistant-dock")
  const input = dock.getByRole("textbox", { name: "Ask Flow a question" })
  await expect(dock).toHaveAttribute("data-state", "collapsed")
  await expect(input).toBeVisible()
  for (const question of ["How do I rotate an element?", "How do I export a PDF?"]) {
    await input.fill(question)
    await input.press("Enter")
    await expect(dock).toHaveAttribute("data-state", "chat")
  }
  await expect(dock.locator(".flow-assistant-question")).toHaveCount(2)
  await dock.locator(".flow-assistant-status").click()
  await expect(dock).toHaveAttribute("data-state", "issues")
  const panel = dock.getByRole("tabpanel", { name: /Advisories/ })
  await expect(panel).toBeVisible()
  await panel.getByRole("button", { name: "Re-run validation" }).click()
  await dock.getByRole("tab", { name: "Chat", exact: true }).click()
  await expect(dock.locator(".flow-assistant-question")).toHaveCount(2)
  await input.press("Escape")
  await expect(dock).toHaveAttribute("data-state", "collapsed")
  await expect(input).toBeVisible()
  await input.fill("How do I measure?")
  await input.press("Enter")
  await expect(dock.locator(".flow-assistant-question")).toHaveCount(3)
  await expect(page.locator(".flow-intelligence-dock")).toHaveCount(0)
  await expect(page.locator(".cutter-legend-bar")).toHaveCount(0)
})

test("All six hanger types start midway down the pack and retain their silhouettes", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "Amends V2 hanger position", packLabel: "K Seal Pouch" })
  await page.getByRole("button", { name: "Elements", exact: true }).click()
  await page.getByRole("tab", { name: "Die Cut Outs", exact: true }).click()
  await page.getByRole("button", { name: "Hanger Slots", exact: true }).click()
  for (const name of ["Standard Euro Slot", "Round Hole", "Keyhole Slot", "Keyhole Euro Slot", "Delta Slot", "Sombrero Slot"]) {
    await page.getByRole("button", { name: `Add ${name}`, exact: true }).click()
    await expect(page.getByRole("button", { name: "Centre on pack", exact: true })).toHaveCount(0)
    await page.keyboard.press("Control+s")
    const project = await readCurrentProject(page)
    const spec = project!.cutter!.legacySpec!
    const slot = spec.hangerSlots[0]
    const liveHeight = spec.height - (spec.seals?.top ?? spec.seal) - (spec.seals?.bottom ?? spec.seal)
    expect(slot.centerY).toBeCloseTo(liveHeight / 2)
    const gap = await page.evaluate(async ({ slot, leftSeal }) => {
      const { getHangerSlotDisplayBounds } = await import("/apps/web/src/geometry/hangerSlotShapes.ts")
      const bounds = getHangerSlotDisplayBounds(slot)
      return slot.centerX + Math.min(bounds.left, -bounds.right)
    }, { slot, leftSeal: spec.seals?.left ?? spec.seal })
    expect(gap).toBeCloseTo(15)
    const shapes = page.locator('[data-role="hanger-slot"]')
    await expect(shapes).toHaveCount(2)
    if (name !== "Round Hole") await expect(shapes.first()).toHaveAttribute("transform", /rotate\(-90\) scale/)
  }
})

test("Project tabs and production actions remain separate at desktop and narrow widths", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "Header reconciliation", packLabel: "Flowwrap" })
  for (const width of [1920, 1440, 1100, 900, 600]) {
    await page.setViewportSize({ width, height: 900 })
    const tabs = page.locator("#artboard-tabs")
    const actions = page.locator("#studio-bottom-actions")
    await expect(tabs).toBeVisible()
    for (const name of ["Legend layouts", "Import Assets", "Pack Spec", "Export"]) {
      await expect(actions.getByRole("button", { name, exact: true })).toBeVisible()
    }
    const a = (await tabs.boundingBox())!, b = (await actions.boundingBox())!
    expect(a.x + a.width <= b.x + 1 || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1).toBe(true)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(width + 1)
  }
})

test("Loading an old automatic hanger position repairs and saves the canonical project once", async ({ page }) => {
  await page.goto("/")
  const id = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { projectFromLegacySpec, saveCutNFlowProject } = await import("/packages/cutter-engine/project/index.ts")
    const spec = { ...getPackModule("flowwrap")!.getDefaults(), width: 530, height: 210, seal: 10,
      seals: { top: 10, bottom: 10, left: 10, right: 10 },
      hangerSlots: [{ id: "legacy-auto", type: "hanger-slot", subtype: "standard-euro-slot", diameter: 10, width: 30, height: 10, centerX: 127.5, centerY: 28.5, mirrored: true }] }
    const project = projectFromLegacySpec("flowwrap", "Legacy hanger restoration fixture", spec as any)
    saveCutNFlowProject(project)
    return project.id
  })
  await page.goto(`/cutter?projectId=${id}`)
  await expect(page.locator('[data-role="hanger-slot"]').first()).toBeVisible()
  await page.keyboard.press("Control+s")
  const saved = await readCurrentProject(page)
  expect(saved!.cutter!.legacySpec!.hangerSlots[0]).toMatchObject({ id: "legacy-auto", centerX: 21.8, centerY: 95, width: 30, height: 10, placementVersion: 4 })
  const revision = saved!.revision
  await page.reload()
  await expect(page.locator('[data-role="hanger-slot"]').first()).toBeVisible()
  await page.keyboard.press("Control+s")
  expect((await readCurrentProject(page))!.revision).toBe(revision)
})

test("Unpinned canvas toolbar can move into the lower canvas", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "Movable dock amendment" })
  const shell = page.locator("#dock-shell")
  if (await shell.getAttribute("data-dock-pinned") === "true") await page.getByRole("button", { name: "Unpin canvas toolbar", exact: true }).click()
  const handle = (await shell.locator(".dock-notch").first().boundingBox())!
  const canvas = (await page.locator("#preview-frame").boundingBox())!
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 120, canvas.y + canvas.height - 40, { steps: 12 })
  await page.mouse.up()
  const moved = (await shell.boundingBox())!
  expect(moved.y).toBeGreaterThan(canvas.y + canvas.height / 2)
  expect(moved.y + moved.height).toBeLessThanOrEqual(canvas.y + canvas.height + 1)
})


test("Legend menu opens directly below its trigger", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "Legend anchor amendment" })
  for (const width of [1920, 1440, 1100, 900, 600]) {
    await page.setViewportSize({ width, height: 900 })
    const trigger = page.getByRole("button", { name: "Legend layouts", exact: true })
    await trigger.click()
    const menu = page.locator("#studio-legend-menu")
    await expect(menu).toBeVisible()
    const a = (await trigger.boundingBox())!, b = (await menu.boundingBox())!
    expect(Math.abs(a.x - b.x)).toBeLessThan(2)
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.height)
    expect(b.x + b.width).toBeLessThanOrEqual(width + 1)
    await menu.getByRole("menuitem", { name: "Landscape Klyro legend", exact: true }).click()
    await expect(menu).toBeHidden()
  }
})

for (const packLabel of ["K Seal Pouch", "DOY Pouch"]) {
  test(`${packLabel}: opening changes style in place and survives reload`, async ({ page }) => {
    await createManualProjectFromDashboard(page, { name: "Single opening amendment", packLabel })
    await page.getByRole("button", { name: "Elements", exact: true }).click()
    await page.getByRole("tab", { name: "Openings", exact: true }).click()
    const grip = page.getByRole("button", { name: "Grip Seal (Default)", exact: true })
    const zip = page.getByRole("button", { name: "Grip Seal (Zip)", exact: true })
    await grip.click()
    const before = await page.locator('[data-role="grip-seal"]').evaluateAll(nodes => nodes.map(n => ({ x: n.getAttribute("x"), width: n.getAttribute("width") })))
    expect(before).toHaveLength(2)
    await zip.click()
    await expect(page.locator('[data-role="grip-seal"]')).toHaveCount(0)
    await expect(page.locator('[data-role="zipper-strip"]')).toHaveCount(2)
    const zipped = await page.locator('[data-role="zipper-group"]').evaluateAll(nodes => nodes.map(n => Number(n.getAttribute("transform")!.match(/translate\(([-\d.]+)/)![1])))
    expect(zipped).toEqual(before.map(n => Number(n.x)))
    await page.keyboard.press("Control+s")
    const spec = (await readCurrentProject(page))!.cutter!.legacySpec!
    expect(spec.doyPouch.showZipper).toBe(true)
    expect(spec.doyPouch.showGripSeal).toBe(false)
    await page.reload()
    await expect(page.locator('[data-role="zipper-strip"]')).toHaveCount(2)
    await expect(page.locator('[data-role="grip-seal"]')).toHaveCount(0)
    await page.getByRole("button", { name: "Elements", exact: true }).click()
    await page.getByRole("tab", { name: "Openings", exact: true }).click()
    await grip.click()
    await expect(page.locator('[data-role="zipper-strip"]')).toHaveCount(0)
    const after = await page.locator('[data-role="grip-seal"]').evaluateAll(nodes => nodes.map(n => ({ x: n.getAttribute("x"), width: n.getAttribute("width") })))
    expect(after).toEqual(before)
    await expect(page.locator("#preview")).not.toContainText("consider removing one")
  })
}
