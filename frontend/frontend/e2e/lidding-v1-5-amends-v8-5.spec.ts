import { readFile } from "node:fs/promises"
import { expect, openExportMenu, readCanonicalProjects, test } from "./helpers/testState"

test("@beta V1.5 compensated cutter repeats keep one larger row and single 0.5 mm boundaries", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { liddingPack } = await import("/apps/web/src/packs/liddingPack.ts")
    const { setLiddingOverallRepeat, updateLiddingSpec, resolveLiddingLayout } = await import("/apps/web/src/constraints/lidding.ts")
    const base = liddingPack.getDefaults()
    const sized = updateLiddingSpec({ ...base, eyeMarks: { ...base.eyeMarks!, height: 5, height2: 5 } }, {
      outerCutHeight: 100, overallHeight: 111.5, across: 2, around: 5,
      repeatMode: "compensated", compensatedRow: 3,
    })
    const spec = setLiddingOverallRepeat(sized, 560)
    const layout = resolveLiddingLayout(spec)
    const svg = liddingPack.render(spec)
    const noLines = liddingPack.render(updateLiddingSpec(spec, { innerLines: false }))
    return {
      height: spec.height,
      rows: layout.rows.map(row => row.height),
      third: layout.cells.find(cell => cell.id === "1C")?.slitHeight,
      outer: svg.querySelectorAll('[data-role="lidding-cutter-edge"]').length,
      inner: [...svg.querySelectorAll('[data-role="lidding-inner-edge"]')].map(line => line.getAttribute("stroke-width")),
      withoutInner: noLines.querySelectorAll('[data-role="lidding-inner-edge"]').length,
      thirdBoundary: svg.querySelector('[data-boundary="around-3"]')?.getAttribute("y1"),
    }
  })
  expect(result.height).toBe(560)
  expect(result.rows).toEqual([111.5, 111.5, 114, 111.5, 111.5])
  expect(result.third).toBe(114)
  expect(result.outer).toBe(1)
  expect(result.inner).toHaveLength(5)
  expect(result.inner.every(width => width === "0.5")).toBe(true)
  expect(result.withoutInner).toBe(0)
  expect(result.thirdBoundary).toBe("377")
})

test("@beta V1.5 Lid dock edits absolute contours and saves compensated Around settings", async ({ page }) => {
  await page.goto("/cutter")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await setup.getByRole("button", { name: "Square lid" }).click()
  const dock = page.getByRole("region", { name: "Lid dock" })
  await expect(dock.getByRole("spinbutton", { name: "Outer bleed width" })).toHaveValue("188")
  await expect(dock.getByRole("spinbutton", { name: "Outer seal width" })).toHaveValue("184")
  await expect(dock.getByRole("spinbutton", { name: "Inner bleed width" })).toHaveValue("182")
  await dock.getByRole("spinbutton", { name: "Outer bleed width" }).fill("187")
  await dock.getByRole("spinbutton", { name: "Outer bleed width" }).blur()
  await expect(dock.getByRole("spinbutton", { name: "Outer seal width" })).toHaveValue("183")
  await dock.getByRole("spinbutton", { name: "Artwork safe area" }).fill("170")
  await dock.getByRole("spinbutton", { name: "Artwork safe area" }).blur()
  await expect(dock.getByRole("spinbutton", { name: "Artwork safe area" })).toHaveValue("170")
  await dock.getByRole("tab", { name: "Stepping" }).click()
  await dock.getByRole("spinbutton", { name: "Around" }).fill("3")
  await dock.getByRole("spinbutton", { name: "Around" }).blur()
  await dock.getByRole("button", { name: "Compensated Repeat" }).click()
  await expect(dock.getByRole("spinbutton", { name: "Overall repeat (mm)" })).toHaveValue("606")
  await dock.getByRole("spinbutton", { name: "Overall repeat (mm)" }).fill("608.5")
  await dock.getByRole("spinbutton", { name: "Overall repeat (mm)" }).blur()
  await dock.getByRole("combobox", { name: "Larger repeat" }).selectOption("2")
  await expect(page.locator('#preview-canvas svg[data-pack="lidding"]')).toHaveAttribute("data-cutter-height", "608.5")
  await page.screenshot({ path: "test-results/lidding-v1-5-compensated.png" })
  page.once("dialog", prompt => prompt.accept("V1.5 compensated lid"))
  await openExportMenu(page)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect.poll(async () => (await readCanonicalProjects(page)).find(project => project.cutter.packType === "lidding")?.cutter.legacySpec.lidding.compensatedExtra).toBe(2.5)
  const saved = (await readCanonicalProjects(page)).find(project => project.cutter.packType === "lidding")!
  expect(saved.cutter.legacySpec.lidding.artworkSafeArea).toBe(170)
  await page.goto(`/cutter?projectId=${saved.id}`)
  await expect(page.locator('#preview-canvas svg[data-pack="lidding"]')).toHaveAttribute("data-cutter-height", "608.5")
  expect((await readCanonicalProjects(page)).find(project => project.id === saved.id)?.cutter.legacySpec.lidding.compensatedRow).toBe(2)
  await openExportMenu(page)
  await page.getByRole("button", { name: "Export selected", exact: true }).click()
  const review = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close pre-export review" }) })
  await expect(review).toBeVisible()
  const download = page.waitForEvent("download")
  await review.getByRole("button", { name: "Export Cutter" }).click()
  const svg = await readFile((await (await download).path())!, "utf8")
  expect(svg).toMatch(/data-cutter-height="608\.5"/)
  expect(svg).toMatch(/data-boundary="around-2"/)
})

test("@beta V8.5 uses compact Sync states and aligns pouch Preview dimensions", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New Project", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Start a cutter" })
  await dialog.getByLabel("Project name").fill("V8.5 DOY preview")
  await dialog.getByLabel("Pack type").selectOption("doy-pouch")
  await dialog.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL(/projectId=/)
  const sync = page.getByRole("button", { name: "Sync gusset controls" })
  await expect(sync).toHaveText("SYNC ON")
  await expect(sync).toHaveClass(/pack-dock-sync/)
  await sync.click()
  await expect(page.getByRole("button", { name: "Sync gusset controls" })).toHaveText("SYNC OFF")
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
  const metrics = await page.evaluate(async () => {
    const { doyPouchPack } = await import("/apps/web/src/packs/doyPouchPack.ts")
    const { resolvePouchPreviewViewport, showPouchPreviewMeasures } = await import("/apps/web/src/ui/pouchPreview.ts")
    const source = document.querySelector<SVGSVGElement>("#preview-canvas > svg")!
    const spec = doyPouchPack.getDefaults()
    const view = resolvePouchPreviewViewport(source, spec, { face: "fop", showTrim: true })!
    showPouchPreviewMeasures(source, view, spec)
    const overlay = document.querySelector<SVGSVGElement>(".pouch-preview-measure-host > svg")!
    const group = (role: string) => overlay.querySelector<SVGGElement>(`[data-role="${role}"]`)!
    const firstX = (role: string) => Number(group(role).querySelector("line")!.getAttribute("x1"))
    return {
      mainOffset: view.faceTop - Number(group("pouch-preview-length").querySelector("line")!.getAttribute("y1")),
      widthOffset: view.faceLeft - firstX("pouch-preview-width"),
      sealXs: ["pouch-preview-side-seal-first", "pouch-preview-between-seals", "pouch-preview-side-seal-last"].map(firstX),
      smallText: group("pouch-preview-side-seal-first").querySelector("text")!.textContent,
      smallFont: Number(group("pouch-preview-side-seal-first").querySelector("text")!.getAttribute("font-size")),
    }
  })
  expect(metrics.mainOffset).toBe(32)
  expect(metrics.widthOffset).toBe(10)
  expect(new Set(metrics.sealXs).size).toBe(1)
  expect(metrics.smallFont).toBeLessThanOrEqual(6)
  expect(metrics.smallText).toBe("7.5")
  await page.screenshot({ path: "test-results/amends-v8-5-pouch-measures.png" })
})

test("@beta V8.5 gives K Seal and 3SS pack docks the same Sync toggle", async ({ page }) => {
  for (const [packType, label, dockName] of [
    ["k-seal-pouch", "Sync gusset controls", "Gusset dock"],
    ["3-side-seal-pouch", "Sync side seals", "3SS seal dock"],
  ]) {
    await page.goto("/")
    await page.getByRole("button", { name: "New Project", exact: true }).first().click()
    const dialog = page.getByRole("dialog", { name: "Start a cutter" })
    await dialog.getByLabel("Project name").fill(`V8.5 ${packType}`)
    await dialog.getByLabel("Pack type").selectOption(packType)
    await dialog.getByRole("button", { name: "Create Project" }).click()
    await page.waitForURL(/projectId=/)
    const dock = page.getByRole(packType === "k-seal-pouch" ? "region" : "navigation", { name: dockName })
    const sync = dock.getByRole("button", { name: label })
    await expect(sync).toHaveClass(/pack-dock-sync/)
    const before = await sync.getAttribute("aria-pressed")
    await expect(sync).toHaveText(before === "true" ? "SYNC ON" : "SYNC OFF")
    await sync.click()
    await expect(dock.getByRole("button", { name: label })).toHaveText(before === "true" ? "SYNC OFF" : "SYNC ON")
  }
})
