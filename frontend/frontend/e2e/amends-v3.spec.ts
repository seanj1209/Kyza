import { createManualProjectFromDashboard, expect, test, readCurrentProject } from "./helpers/testState"

test("V3 Kyza uses the supplied mark, arrow submit and compact switches above input", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V3 Flow" })
  const dock = page.locator("#flow-assistant-dock")
  await expect(dock.locator(".flow-assistant-brand .kyza-assistant-mark")).toHaveCount(1)
  await dock.getByRole("textbox", { name: "Ask Kyza a question" }).fill("How do I measure?")
  await dock.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(dock.locator(".flow-assistant-question")).toContainText("How do I measure?")
  const tabs = (await dock.locator(".flow-assistant-top").boundingBox())!
  const chat = (await dock.locator(".flow-assistant-chat").boundingBox())!
  const form = (await dock.locator(".flow-assistant-form").boundingBox())!
  expect(tabs.y + tabs.height).toBeLessThanOrEqual(chat.y + 1)
  expect(chat.y + chat.height).toBeLessThanOrEqual(form.y + 1)
  await expect(dock.getByRole("button", { name: "Send message", exact: true }).locator("svg")).toHaveCount(1)
})

for (const packLabel of ["K Seal Pouch", "DOY Pouch"]) {
  test(`V3 ${packLabel} opening selects, moves and resizes only in width`, async ({ page }) => {
    await createManualProjectFromDashboard(page, { name: `V3 opening ${packLabel}`, packLabel })
    await page.getByRole("button", { name: "Elements", exact: true }).click()
    await page.getByRole("tab", { name: "Openings", exact: true }).click()
    await page.getByRole("button", { name: "Grip Seal (Default)", exact: true }).click()
    await page.getByRole("button", { name: "Close panel", exact: true }).click()
    await page.locator('button[aria-label^="Selection Mode"]').first().click()
    const grip = page.locator('[data-role="grip-seal"]').first()
    await expect(grip).toHaveAttribute("width", "10")
    const originalHeight = await grip.getAttribute("height")
    await grip.click({ position: { x: 1, y: 10 } })
    await expect(page.locator('[data-role="opening-selection"]')).toHaveCount(2)
    await expect(page.locator('[data-role="opening-resize-handle"]')).toHaveCount(0)
    const edge = (await grip.boundingBox())!
    await page.mouse.move(edge.x + edge.width - 1, edge.y + edge.height / 2)
    await page.mouse.down(); await page.mouse.move(edge.x + edge.width - 1 + 18, edge.y + edge.height / 2 + 30, { steps: 6 })
    await expect(page.locator('[data-role="opening-width-readout"]').first()).not.toHaveText("10mm")
    await page.mouse.up()
    await expect(grip).toHaveAttribute("height", originalHeight!)
    const resizedWidth = Number(await grip.getAttribute("width"))
    expect(resizedWidth).toBeGreaterThan(10)
    const resizedX = Number(await grip.getAttribute("x"))
    await grip.click({ position: { x: 1, y: 10 } })
    const mover = (await grip.boundingBox())!
    await page.mouse.move(mover.x + mover.width / 2, mover.y + mover.height / 2)
    await page.mouse.down(); await page.mouse.move(mover.x + mover.width / 2 + 20, mover.y + mover.height / 2, { steps: 6 }); await page.mouse.up()
    expect(Number(await grip.getAttribute("x"))).toBeGreaterThan(resizedX)
    expect(Number(await grip.getAttribute("width"))).toBeCloseTo(resizedWidth)
    await page.keyboard.press("Control+s")
    const saved = (await readCurrentProject(page))!.cutter!.legacySpec!
    expect(saved.doyPouch.gripSeal).toBeCloseTo(resizedWidth)
    await page.reload()
    await expect(page.locator('[data-role="grip-seal"]').first()).toHaveAttribute("width", String(saved.doyPouch.gripSeal))
  })
}

test("V3 legend switches never move cutter geometry and all placements export", async ({ page }) => {
  await page.goto("/")
  const rows = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { attachLegendPlacement } = await import("/apps/web/src/ui/legendPlacement.ts")
    const { buildExportSvgDocument } = await import("/packages/cutter-engine/export/cutterExportService.ts")
    const { projectFromLegacySpec } = await import("/packages/cutter-engine/project/index.ts")
    const results = []
    for (const id of ["flowwrap", "paper-strip", "pillow-pack", "k-seal-pouch", "doy-pouch", "sachet-3-side-seal", "sachet-4-side-seal"]) {
      for (const orientation of ["portrait", "landscape"] as const) {
        let spec = { ...getPackModule(id)!.getDefaults(), cutterLegend: true, cutterLegendOrientation: orientation }
        const before = getPackModule(id)!.render(spec).querySelector('[data-layer-id="cutter-outline"]')?.outerHTML
        for (let i = 0; i < 3; i++) {
          const svg = getPackModule(id)!.render(spec)
          svg.setAttribute("data-select-enabled", "true"); document.body.append(svg)
          attachLegendPlacement(svg, spec, next => { spec = next as typeof spec })
          const same = svg.querySelector('[data-layer-id="cutter-outline"]')?.outerHTML === before
          const legend = svg.querySelector<SVGGElement>("#cutter_legend")!
          const box = legend.getBBox(), matrix = legend.transform.baseVal.consolidate()!.matrix
          const vb = svg.viewBox.baseVal
          const fits = matrix.e >= vb.x && matrix.f >= vb.y && matrix.e + box.width * matrix.a <= vb.x + vb.width && matrix.f + box.height * matrix.d <= vb.y + vb.height
          legend.dispatchEvent(new MouseEvent("click", { bubbles: true }))
          svg.querySelector('[aria-label="Legend actions"]')!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
          const control = svg.querySelector('[aria-label="Switch legend position"]')!
          const visible = control.parentElement!.style.display !== "none"
          const exported = buildExportSvgDocument(projectFromLegacySpec(id, "V3 export", spec), {format:"svg",includeLayers:true,marginMm:5},svg)
          const exportFits = exported.frame.x <= matrix.e && exported.frame.y <= matrix.f && exported.frame.x + exported.frame.widthMm >= matrix.e + box.width * matrix.a && exported.frame.y + exported.frame.heightMm >= matrix.f + box.height * matrix.d
          results.push({ id, orientation, same, fits, visible, exportFits, position: spec.cutterLegendPosition ?? "right" })
          control.dispatchEvent(new MouseEvent("click", { bubbles: true })); svg.remove()
        }
      }
    }
    return results
  })
  expect(rows).toHaveLength(42)
  expect(rows.filter(row => !row.same || !row.fits || !row.visible || !row.exportFits)).toEqual([])
})
