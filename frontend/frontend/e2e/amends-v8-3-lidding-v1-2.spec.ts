import { expect, test } from "./helpers/testState"

test("@beta Lidding V1.2 keeps each slit, eyemark and pull contour together", async ({ page }) => {
  await page.goto("/cutter")
  const next = page.locator(".studio-pack-carousel .next")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute("data-pack-id") === "lidding") break
    await next.click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await expect(setup.getByRole("heading", { name: "Lidding Style" })).toBeVisible()
  await expect(setup.locator(".lidding-setup-choices svg")).toHaveCount(3)
  await page.screenshot({ path: "test-results/v12-lidding-style-chooser.png" })
  await setup.getByRole("button", { name: "Square lid" }).click()
  let dock = page.getByRole("region", { name: "Lid dock" })
  await dock.getByRole("tab", { name: "Stepping" }).click()
  await dock.getByRole("spinbutton", { name: "Across" }).fill("2")
  await dock.getByRole("spinbutton", { name: "Across" }).blur()
  dock = page.getByRole("region", { name: "Lid dock" })
  await dock.getByRole("spinbutton", { name: "Around" }).fill("2")
  await dock.getByRole("spinbutton", { name: "Around" }).blur()
  dock = page.getByRole("region", { name: "Lid dock" })
  const drawing = page.locator('#preview-canvas > svg[data-pack="lidding"]')
  const geometry = await drawing.evaluate(svg => {
    const slits = [...svg.querySelectorAll<SVGRectElement>('[data-role="lidding-cutter-edge"]')]
    const boundaries = [...svg.querySelectorAll<SVGLineElement>('[data-role="lidding-inner-edge"]')]
    const cuts = [...svg.querySelectorAll<SVGPathElement>('[data-role="lid-outer-cut"]')]
    const seals = [...svg.querySelectorAll<SVGPathElement>('[data-role="lid-outer-seal"]')]
    return {
      slits: slits.length, boundaries: boundaries.length, cuts: cuts.length, seals: seals.length,
      marks: svg.querySelectorAll('[data-role="eye-mark"]').length,
      measures: svg.querySelectorAll('[data-layer-id="measurement-guides"] text').length,
      firstSlitWidth: Number(svg.getAttribute("data-slit-width")),
      secondSlitX: Number(boundaries.find(line => line.getAttribute("data-boundary") === "across-1")!.getAttribute("x1")),
      firstSlitX: Number(slits[0].getAttribute("x")) - .25,
      cutHasTab: (cuts[0].getAttribute("d")!.match(/ L /g) ?? []).length > 100,
      sealHasTab: (seals[0].getAttribute("d")!.match(/ L /g) ?? []).length > 100,
      innerSealsPlain: [...svg.querySelectorAll<SVGPathElement>('[data-role="lid-inner-seal"]')].every(path => (path.getAttribute("d")!.match(/ Q /g) ?? []).length === 4),
      safePlain: [...svg.querySelectorAll<SVGPathElement>('[data-layer-id="safe-zones"] path')].every(path => (path.getAttribute("d")!.match(/ Q /g) ?? []).length === 4),
      firstCell: slits[0].getAttribute("data-slit-cell"),
      belowCell: boundaries.find(line => line.getAttribute("data-boundary") === "around-1")?.getAttribute("data-boundary"),
    }
  })
  expect(geometry).toMatchObject({ slits: 1, boundaries: 2, cuts: 4, seals: 4, marks: 8, measures: 2, firstCell: "web", belowCell: "around-1", cutHasTab: true, sealHasTab: true, innerSealsPlain: true, safePlain: true })
  expect(geometry.secondSlitX - geometry.firstSlitX).toBeCloseTo(geometry.firstSlitWidth, 4)
  await expect(dock.getByRole("button", { name: "2A" })).toBeDisabled()
  await dock.getByRole("button", { name: "Sync lidding cutter elements" }).click()
  dock = page.getByRole("region", { name: "Lid dock" })
  await expect(dock.getByRole("button", { name: "2A" })).toBeEnabled()
  await dock.getByRole("button", { name: "2A" }).click()
  dock = page.getByRole("region", { name: "Lid dock" })
  await expect(dock.getByRole("button", { name: "2A" })).toHaveAttribute("aria-pressed", "true")
  await dock.getByRole("button", { name: "Collapse Lid dock" }).click()
  await expect(dock.getByRole("spinbutton", { name: "Across" })).toBeHidden()
  await dock.getByRole("button", { name: "Expand Lid dock" }).click()
  await expect(dock.getByRole("spinbutton", { name: "Across" })).toBeVisible()
  await page.getByRole("button", { name: "Elements", exact: true }).first().click()
  await page.getByRole("button", { name: "Safe Zones" }).click()
  await expect(drawing.locator('g[data-lid-cell="1A"] [data-role="safe-zone-outline"]')).toHaveCount(0)
  await expect(drawing.locator('g[data-lid-cell="2A"] [data-role="safe-zone-outline"]')).toHaveCount(1)
  await expect(drawing.locator('g[data-lid-cell="2B"] [data-role="safe-zone-outline"]')).toHaveCount(1)
  const selectedHeight = await drawing.locator('#selection_overlay [data-selection-id^="safe-zone:"] > rect').first().evaluate(node => Number(node.getAttribute("height")))
  expect(selectedHeight).toBeLessThan(100)
  await page.screenshot({ path: "test-results/v83-lidding-repeated-slits.png" })
})

test("@beta Pouch Preview V8.4 puts each dimension on the requested edge", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New Project", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Start a cutter" })
  await dialog.getByLabel("Project name").fill("V8.3 DOY preview")
  await dialog.getByLabel("Pack type").selectOption("doy-pouch")
  await dialog.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL(/projectId=/)
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
  const source = page.locator("#preview-canvas > svg")
  const measures = page.locator(".pouch-preview-measure-host")
  await page.evaluate(async () => {
    const { doyPouchPack } = await import("/apps/web/src/packs/doyPouchPack.ts")
    const { resolvePouchPreviewViewport, showPouchPreviewMeasures } = await import("/apps/web/src/ui/pouchPreview.ts")
    const base = doyPouchPack.getDefaults()
    const spec = { ...base, doyPouch: { ...base.doyPouch!, showZipper: true, showTearNotch: true } }
    const svg = document.querySelector<SVGSVGElement>("#preview-canvas > svg")!
    showPouchPreviewMeasures(svg, resolvePouchPreviewViewport(svg, spec, { face: "fop", showTrim: true }), spec)
  })
  await expect(measures.locator('[data-role="pouch-preview-length"]')).toHaveCount(1)
  await expect(measures.locator('[data-role="pouch-preview-width"]')).toHaveCount(1)
  await expect(measures.locator('[data-role="pouch-preview-opening-distance"]')).toBeVisible()
  await expect(measures.locator('[data-role="pouch-preview-tear-distance"]')).toBeVisible()
  await expect(measures.locator('[data-role="pouch-preview-side-arc"]')).toBeVisible()
  await expect(measures.locator('[data-role="pouch-preview-between-seals"]')).toBeVisible()
  await expect(measures.getByText("250 mm")).toHaveCount(1)
  const coordinates = await page.evaluate(() => {
    const source = document.querySelector<SVGSVGElement>("#preview-canvas > svg")!
    const overlay = document.querySelector<SVGSVGElement>(".pouch-preview-measure-host > svg")!
    const main = overlay.querySelector<SVGLineElement>('[data-role="pouch-preview-length"] line')!
    return {
      faceTop: Number(source.getAttribute("data-pouch-preview-bounds")!.split(" ")[1]),
      mainY: Number(main.getAttribute("y1")),
      sourceView: source.getAttribute("viewBox"), overlayView: overlay.getAttribute("viewBox"),
      textRotation: overlay.querySelector('[data-role="pouch-preview-length"] text')?.getAttribute("transform"),
    }
  })
  expect(coordinates.mainY).toBeLessThan(coordinates.faceTop)
  expect(coordinates.overlayView).toBe(coordinates.sourceView)
  expect(coordinates.textRotation).toContain("rotate(-90")
  await page.screenshot({ path: "test-results/v83-pouch-preview-measures.png" })
  await page.evaluate(async () => {
    const { doyPouchPack } = await import("/apps/web/src/packs/doyPouchPack.ts")
    const { resolvePouchPreviewViewport, showPouchPreviewMeasures } = await import("/apps/web/src/ui/pouchPreview.ts")
    const base = doyPouchPack.getDefaults()
    const spec = { ...base, doyPouch: { ...base.doyPouch!, showZipper: true, showTearNotch: true } }
    const svg = document.querySelector<SVGSVGElement>("#preview-canvas > svg")!
    showPouchPreviewMeasures(svg, resolvePouchPreviewViewport(svg, spec, { face: "bop", showTrim: true }), spec)
  })
  await expect(measures.getByText("250 mm")).toHaveCount(1)
  await expect(measures.locator('[data-role="pouch-preview-side-arc"]')).toBeVisible()
  const bop = await page.locator('.pouch-preview-measure-host [data-role="pouch-preview-length"] line').first().evaluate(node => Number(node.getAttribute("y1")))
  expect(bop).toBeGreaterThan(coordinates.faceTop + 140)
  await page.evaluate(async () => {
    const { doyPouchPack } = await import("/apps/web/src/packs/doyPouchPack.ts")
    const { resolvePouchPreviewViewport, showPouchPreviewMeasures } = await import("/apps/web/src/ui/pouchPreview.ts")
    const base = doyPouchPack.getDefaults()
    const spec = { ...base, doyPouch: { ...base.doyPouch!, trimEnabled: true, showZipper: true } }
    const svg = document.querySelector<SVGSVGElement>("#preview-canvas > svg")!
    showPouchPreviewMeasures(svg, resolvePouchPreviewViewport(svg, spec, { face: "fop", showTrim: true }), spec)
  })
  await expect(measures.locator('[data-role="pouch-preview-trim"]')).toBeVisible()
})

test("@beta unsynced 2A elements repeat into 2B, while 1A remains independent", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { liddingPack } = await import("/apps/web/src/packs/liddingPack.ts")
    const { updateLiddingSpec } = await import("/apps/web/src/constraints/lidding.ts")
    const { setLiddingSync, activateLiddingLane, commitLiddingLaneElements } = await import("/apps/web/src/constraints/liddingSteps.ts")
    const stepped = updateLiddingSpec(liddingPack.getDefaults(), { across: 2, around: 2 })
    const second = activateLiddingLane(setLiddingSync(stepped, false), 1)
    const edited = commitLiddingLaneElements(second, {
      ...second,
      safeZones: [{ id: "sz-2a", label: "2A", x: 5, y: 5, width: 20, height: 20 }],
      attributeBoxes: [{ id: "bbe-2a", kind: "bbe", x: 35, y: 35, width: 20, height: 10 }],
      windows: [{ id: "win-2a", shape: "rectangle", x: 70, y: 70, width: 20, height: 20 }],
    })
    const svg = liddingPack.render(edited)
    const count = (cell: string, role: string) => svg.querySelectorAll(`g[data-lid-cell="${cell}"] [data-role="${role}"]`).length
    return {
      oneA: [count("1A", "safe-zone-outline"), count("1A", "attribute-box"), count("1A", "window-shape")],
      twoA: [count("2A", "safe-zone-outline"), count("2A", "attribute-box"), count("2A", "window-shape")],
      twoB: [count("2B", "safe-zone-outline"), count("2B", "attribute-box"), count("2B", "window-shape")],
      sizes: [svg.getAttribute("data-slit-width"), svg.getAttribute("data-slit-height")],
    }
  })
  expect(result.oneA).toEqual([0, 0, 0])
  expect(result.twoA[0]).toBe(1)
  expect(result.twoA[1]).toBeGreaterThanOrEqual(1)
  expect(result.twoA[2]).toBe(1)
  expect(result.twoB).toEqual(result.twoA)
})

test("@beta V8.4 eyemarks have no rendered stroke on every pack", async ({ page }) => {
  await page.goto("/")
  const rendered = await page.evaluate(async () => {
    const { packModules } = await import("/apps/web/src/packs/index.ts")
    const { applyBaseLayerCustomisation } = await import("/apps/web/src/renderers/baseLayerCustomisation.ts")
    return packModules.map(pack => {
      const spec = pack.getDefaults()
      const svg = pack.render(spec)
      applyBaseLayerCustomisation(svg, spec)
      const marks = [...svg.querySelectorAll<SVGRectElement>('[data-role="eye-mark"]')]
      return { id: pack.id, count: marks.length, bad: marks.filter(mark => mark.getAttribute("stroke") !== "none" || mark.hasAttribute("stroke-width")).length }
    })
  })
  expect(rendered.reduce((total, pack) => total + pack.count, 0)).toBeGreaterThan(0)
  expect(rendered.filter(pack => pack.bad)).toEqual([])
})

test("@beta Lidding V1.3 round pull tab affects only the two outer contours", async ({ page }) => {
  await page.goto("/")
  const contours = await page.evaluate(async () => {
    const { liddingPack } = await import("/apps/web/src/packs/liddingPack.ts")
    const { updateLiddingSpec } = await import("/apps/web/src/constraints/lidding.ts")
    const spec = updateLiddingSpec(liddingPack.getDefaults(), { style: "round", pullTab: true })
    const svg = liddingPack.render(spec)
    const path = (role: string) => svg.querySelector<SVGPathElement>(`[data-role="${role}"]`)!.getAttribute("d")!
    return {
      cut: path("lid-outer-cut"), outerSeal: path("lid-outer-seal"),
      innerSeals: [...svg.querySelectorAll<SVGPathElement>('[data-role="lid-inner-seal"]')].map(node => node.getAttribute("d")!),
      safe: svg.querySelector<SVGPathElement>('[data-layer-id="safe-zones"] path')!.getAttribute("d")!,
    }
  })
  expect(contours.cut).toContain(" L ")
  expect(contours.outerSeal).toContain(" L ")
  expect(contours.innerSeals.every(path => !path.includes(" Q "))).toBe(true)
  expect(contours.safe).not.toContain(" Q ")
})
