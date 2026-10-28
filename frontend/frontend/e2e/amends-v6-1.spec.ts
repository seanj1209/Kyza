import type { Page } from "@playwright/test"
import {
  CANONICAL_PROJECT_STORAGE_KEY,
  createManualProjectFromDashboard,
  expect,
  readCurrentProject,
  test
} from "./helpers/testState"

const onQuarter = (value: number) => Math.abs(value * 4 - Math.round(value * 4)) < 1e-9

test("@beta V6.1 K Seal gusset fill, gusset outline and side seals each own their styling", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { applyBaseLayerCustomisation, resolveBaseCustomisation } = await import("/apps/web/src/renderers/baseLayerCustomisation.ts")
    const pack = getPackModule("k-seal-pouch")!
    const base = pack.getDefaults()
    const resolved = resolveBaseCustomisation(base)
    const paint = (spec: typeof base) => {
      const svg = pack.render(spec)
      applyBaseLayerCustomisation(svg, spec)
      const all = (selector: string, read: (node: Element) => string | null) => [...new Set([...svg.querySelectorAll(selector)].map(read))]
      return {
        outline: all('[data-role="kseal-gusset-outline"], [data-role="kseal-bottom-seal-guide"], [data-role="kseal-center-line"]',
          node => [node.getAttribute("stroke"), node.getAttribute("opacity"), node.getAttribute("stroke-dasharray")].join("|")),
        outlineCount: svg.querySelectorAll('[data-role="kseal-gusset-outline"]').length,
        innerArmGuides: svg.querySelectorAll('[data-role="kseal-inner-arm-guide"]').length,
        gussetFill: all('[data-role="kseal-arm"], [data-role="kseal-arm-junction-fill"], [data-role="kseal-bottom-seal"]', node => node.getAttribute("fill")),
        gussetOpacity: svg.querySelector('[data-role="kseal-gusset-seal-visual"]')!.getAttribute("opacity"),
        sideFill: all('[data-role="kseal-side-seal"]', node => node.getAttribute("fill")),
        sideOpacity: svg.querySelector('[data-layer-id="seal-areas"]')!.getAttribute("opacity")
      }
    }
    return {
      defaults: paint(base),
      gussetOnly: paint({ ...base, elementAppearance: {
        gusset: { color: "#112233", opacity: .5, lineStyle: "dashed" },
        "gusset-seals": { color: "#445566", opacity: .6 }
      } }),
      sealsOnly: paint({ ...base, baseCustomisation: { ...resolved, seals: { ...resolved.seals, color: "#778899", opacity: .4 } } })
    }
  })
  // Defaults from the AMENDS 6.1 brief.
  expect(result.defaults.outline).toEqual(["#188b54|0.7|.5 1.5"])
  expect(result.defaults.outlineCount).toBe(4)
  expect(result.defaults.innerArmGuides).toBe(0)
  expect(result.defaults.gussetFill).toEqual(["#2E8B57"])
  expect(result.defaults.gussetOpacity).toBe("0.32")
  expect(result.defaults.sideFill).toEqual(["#2eb774"])
  expect(result.defaults.sideOpacity).toBe("0.32")
  // Gusset Fill / Outline change only the gusset.
  expect(result.gussetOnly.outline).toEqual(["#112233|0.5|3 2"])
  expect(result.gussetOnly.gussetFill).toEqual(["#445566"])
  expect(result.gussetOnly.gussetOpacity).toBe("0.6")
  expect(result.gussetOnly.sideFill).toEqual(["#2eb774"])
  expect(result.gussetOnly.sideOpacity).toBe("0.32")
  // Seals customise changes only the side seals.
  expect(result.sealsOnly.sideFill).toEqual(["#778899"])
  expect(result.sealsOnly.sideOpacity).toBe("0.4")
  expect(result.sealsOnly.gussetFill).toEqual(["#2E8B57"])
  expect(result.sealsOnly.outline).toEqual(["#188b54|0.7|.5 1.5"])
})

test("@beta V6.1 K Seal gusset outline and fill stay out of the side seals", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const out: Record<string, unknown>[] = []
    for (const kSealPouch of [{}, { armWidth: 20, sideSeal: 5 }, { armDegree: 60, customArmDegreeEnabled: true, sideSeal: 12 }]) {
      const pack = getPackModule("k-seal-pouch")!
      const base = pack.getDefaults()
      const svg = pack.render({ ...base, kSealPouch: { ...base.kSealPouch!, ...kSealPouch } })
      const seals = [...svg.querySelectorAll<SVGRectElement>('[data-role="kseal-side-seal"]')]
      const top = seals.find(r => r.dataset.sealSide === "top")!
      const bottom = seals.find(r => r.dataset.sealSide === "bottom")!
      const liveTop = Number(top.getAttribute("y")) + Number(top.getAttribute("height"))
      const liveBottom = Number(bottom.getAttribute("y"))
      const pathYs = [...svg.querySelectorAll('[data-role="kseal-gusset-outline"]')]
        .flatMap(path => [...(path.getAttribute("d") ?? "").matchAll(/[ML] ([-\d.]+) ([-\d.]+)/g)].map(match => Number(match[2])))
      const lineYs = [...svg.querySelectorAll('[data-role="kseal-bottom-seal-guide"], [data-role="kseal-center-line"]')]
        .flatMap(line => [Number(line.getAttribute("y1")), Number(line.getAttribute("y2"))])
      const clip = svg.querySelector('#kseal_gusset_live_clip rect')!
      out.push({
        inside: [...pathYs, ...lineYs].every(y => y >= liveTop - 1e-6 && y <= liveBottom + 1e-6),
        touchesBothSeals: Math.abs(Math.min(...pathYs) - liveTop) < 1e-6 && Math.abs(Math.max(...pathYs) - liveBottom) < 1e-6,
        foldEnds: [...new Set(lineYs.map(y => Math.round(y * 1000) / 1000))].sort((a, b) => a - b),
        liveEnds: [liveTop, liveBottom],
        clip: [Number(clip.getAttribute("y")), Number(clip.getAttribute("y")) + Number(clip.getAttribute("height"))],
        outlineClip: svg.querySelector('[data-role="kseal-gusset-outline-group"]')!.getAttribute("clip-path"),
        fillClip: svg.querySelector('[data-role="kseal-gusset-seal-visual"]')!.getAttribute("clip-path")
      })
    }
    return out
  })
  for (const item of result) {
    expect(item.inside).toBe(true)
    expect(item.touchesBothSeals).toBe(true)
    expect(item.foldEnds).toEqual(item.liveEnds)
    expect(item.clip).toEqual(item.liveEnds)
    expect(item.outlineClip).toBe("url(#kseal_gusset_live_clip)")
    expect(item.fillClip).toBe("url(#kseal_gusset_live_clip)")
  }
})

test("@beta V6.1 K Seal gusset sits at the side-seal layer level and blends without a darker overlap", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { applyBaseLayerCustomisation } = await import("/apps/web/src/renderers/baseLayerCustomisation.ts")
    const { resolveKSealLayout } = await import("/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts")
    const pack = getPackModule("k-seal-pouch")!
    const spec = pack.getDefaults()
    const svg = pack.render(spec)
    applyBaseLayerCustomisation(svg, spec)
    const visual = svg.querySelector("#kseal_seal_visual")!
    const sides = svg.querySelector('[data-layer-id="seal-areas"]')!
    const gusset = svg.querySelector('[data-role="kseal-gusset-seal-visual"]')!
    const outline = svg.querySelector('[data-role="kseal-gusset-outline-layer"]')!
    const centre = svg.querySelector('[data-role="kseal-center-line"]')!
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    // Rasterise the real SVG and sample the side-seal band over and away from the gusset.
    const layout = resolveKSealLayout(spec)
    const scale = 4
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute("width", String(layout.viewWidth * scale)); clone.setAttribute("height", String(layout.viewHeight * scale))
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }))
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url })
    const canvas = document.createElement("canvas"); canvas.width = layout.viewWidth * scale; canvas.height = layout.viewHeight * scale
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0)
    const sample = (x: number, y: number) => [...context.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data.slice(0, 3)]
    const bandY = layout.originY + layout.geometry.sideSeal / 2
    const overGusset = sample(layout.originX + layout.geometry.leftFoldX, bandY)
    const awayFromGusset = sample(layout.originX + 30, bandY)
    const gussetFill = sample(layout.originX + layout.geometry.leftFoldX - layout.geometry.bottomSeal / 2, layout.originY + layout.geometry.height / 2)
    return {
      siblings: sides.parentElement === visual && gusset.parentElement === visual,
      centreBehindSeals: follows(centre.parentElement!, visual),
      outlineAboveSeals: follows(visual, outline),
      overGusset, awayFromGusset, gussetFill
    }
  })
  expect(result.siblings).toBe(true)
  expect(result.centreBehindSeals).toBe(true)
  expect(result.outlineAboveSeals).toBe(true)
  // Same colour across the whole side-seal band: no darker gusset overlap.
  result.overGusset.forEach((channel, index) => expect(Math.abs(channel - result.awayFromGusset[index])).toBeLessThanOrEqual(2))
  // The gusset fill is still painted below the seal.
  expect(result.gussetFill).not.toEqual(result.awayFromGusset)
})

test("@beta V6.1 K Seal Customise merges Gusset guides and seals into one Gusset with Fill and Outline", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V6.1 gusset", packLabel: "K Seal Pouch" })
  await page.getByRole("button", { name: "Customise", exact: true }).click()
  const panel = page.locator("#customisation-panel")
  await expect(panel).toHaveClass(/is-open/)
  await panel.getByRole("tab", { name: "Elements" }).click()
  await expect(panel.getByRole("radio", { name: "Gusset guides" })).toHaveCount(0)
  await expect(panel.getByRole("radio", { name: "Gusset Seals" })).toHaveCount(0)
  await panel.getByRole("radio", { name: "Gusset", exact: true }).click()
  const parts = panel.getByRole("radiogroup", { name: "Gusset appearance" })
  await expect(parts.getByRole("radio")).toHaveText(["Fill", "Outline"])
  await expect(parts.getByRole("radio", { name: "Fill" })).toHaveAttribute("aria-checked", "true")
  const fillHex = panel.getByRole("textbox", { name: "Gusset fill hex colour" })
  await expect(fillHex).toHaveValue(/#2e8b57/i)
  await expect(panel.getByRole("spinbutton", { name: "Gusset fill opacity" })).toHaveValue("32")
  await fillHex.fill("#123456"); await fillHex.press("Tab")
  const canvas = page.locator("#preview-canvas")
  await expect(canvas.locator('[data-role="kseal-arm"]').first()).toHaveAttribute("fill", "#123456")
  await expect(canvas.locator('[data-role="kseal-gusset-outline"]').first()).toHaveAttribute("stroke", "#188b54")

  await parts.getByRole("radio", { name: "Outline" }).click()
  const outlineHex = panel.getByRole("textbox", { name: "Gusset outline hex colour" })
  await expect(outlineHex).toHaveValue("#188b54")
  await expect(panel.getByRole("group", { name: "Gusset outline line style" }).getByRole("button", { name: "Dotted" })).toHaveAttribute("aria-pressed", "true")
  await expect(panel.getByRole("spinbutton", { name: "Gusset outline opacity" })).toHaveValue("70")
  await outlineHex.fill("#654321"); await outlineHex.press("Tab")
  await expect(canvas.locator('[data-role="kseal-gusset-outline"]').first()).toHaveAttribute("stroke", "#654321")
  await expect(canvas.locator('[data-role="kseal-center-line"]')).toHaveAttribute("stroke", "#654321")
  await expect(canvas.locator('[data-role="kseal-arm"]').first()).toHaveAttribute("fill", "#123456")
  await expect(canvas.locator('[data-role="kseal-side-seal"]').first()).toHaveAttribute("fill", "#2eb774")
})

test("@beta V6.1 DOY keeps its separate gusset guides and seals", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V6.1 doy", packLabel: "DOY Pouch" })
  await page.getByRole("button", { name: "Customise", exact: true }).click()
  const panel = page.locator("#customisation-panel")
  await panel.getByRole("tab", { name: "Elements" }).click()
  await expect(panel.getByRole("radio", { name: "Gusset guides" })).toBeVisible()
  await expect(panel.getByRole("radio", { name: "Gusset Seals" })).toBeVisible()
  await expect(panel.getByRole("radio", { name: "Gusset", exact: true })).toHaveCount(0)
})

const zoomOnto = async (page: Page, selector: string) => {
  const box = (await page.locator(selector).first().boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let step = 0; step < 14; step++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40) }
  await page.waitForTimeout(400)
}

const dragCentre = async (page: Page, selector: string, dx: number, dy: number) => {
  const box = (await page.locator(selector).first().boundingBox())!
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.click(x, y)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 9 })
}

test("@beta V6.1 mouse moves land on quarter millimetres, display them and persist", async ({ page }) => {
  const project = await createManualProjectFromDashboard(page, { name: "V6.1 quarter drag", packLabel: "K Seal Pouch" })
  await page.getByRole("button", { name: "Elements", exact: true }).click()
  await page.getByRole("tablist", { name: "Element categories" }).getByRole("tab", { name: "Barcodes / BBEs", exact: true }).click()
  await page.getByRole("button", { name: "BBE Box", exact: true }).click()
  await page.keyboard.press("Control+s")
  // A position saved before 6.1 can be off the quarter grid.
  await page.evaluate(({ id, key }) => {
    const projects = JSON.parse(localStorage.getItem(key)!)
    const target = projects.find((item: { id: string }) => item.id === id)
    target.cutter.legacySpec.attributeBoxes[0].x = 20.4
    target.cutter.legacySpec.attributeBoxes[0].y = 55.15
    target.revision++
    localStorage.setItem(key, JSON.stringify(projects))
  }, { id: project!.id, key: CANONICAL_PROJECT_STORAGE_KEY })
  await page.reload()
  await expect(page.locator("#preview-canvas > svg")).toBeVisible()
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  const bbe = '#preview-canvas [data-role="attribute-box"][data-kind="bbe"]'
  await zoomOnto(page, bbe)
  const pxPerMm = await page.evaluate(() => document.querySelector<SVGSVGElement>("#preview-canvas > svg")!.getScreenCTM()!.a)
  await dragCentre(page, bbe, 37, 23)
  // The live readout is measured from the snapped position: axis-aligned distances read on the grid.
  const vertical = await page.locator('#measurement_annotations g[data-dynamic-direction="bottom"] text, #measurement_annotations g[data-dynamic-direction="top"] text').allTextContents()
  expect(vertical.length).toBeGreaterThan(0)
  for (const text of vertical) expect(onQuarter(Number(text.replace(/[^\d.]/g, "")))).toBe(true)
  await page.mouse.up()
  await page.keyboard.press("Control+s")
  const moved = (await readCurrentProject(page))!.cutter!.legacySpec!.attributeBoxes[0]
  expect([moved.x, moved.y]).not.toEqual([20.4, 55.15])
  expect(onQuarter(moved.x) && onQuarter(moved.y)).toBe(true)
  // The resulting coordinate (not the delta) rounds to the nearest 0.25 mm.
  const quarter = (value: number) => Math.round(value * 4) / 4
  expect(moved.x).toBe(quarter(20.4 + 37 / pxPerMm))
  expect(moved.y).toBe(quarter(55.15 + 23 / pxPerMm))
  await page.reload()
  await expect(page.locator("#preview-canvas > svg")).toBeVisible()
  const reopened = (await readCurrentProject(page))!.cutter!.legacySpec!.attributeBoxes[0]
  expect([reopened.x, reopened.y]).toEqual([moved.x, moved.y])
})

test("@beta V6.1 windows and the Cutter Preferences step follow the movement grid", async ({ page }) => {
  await page.goto("/account#cutter")
  const step = page.getByLabel("Mouse movement step")
  await expect(step).toHaveValue("0.25")
  await expect(page.getByLabel("Nudge increment")).toHaveValue("0.5")
  await step.selectOption("1")
  await expect(page.getByRole("status")).toHaveText("Saved on this device.")
  await page.reload()
  await expect(page.getByLabel("Mouse movement step")).toHaveValue("1")
  await expect(page.getByLabel("Nudge increment")).toHaveValue("0.5")

  await createManualProjectFromDashboard(page, { name: "V6.1 window drag", packLabel: "Flowwrap" })
  await page.getByRole("button", { name: "Elements", exact: true }).click()
  await page.getByRole("tablist", { name: "Element categories" }).getByRole("tab", { name: "Windows", exact: true }).click()
  await page.getByRole("button", { name: "Rectangle", exact: true }).click()
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  const win = '#preview-canvas [data-role="window-shape"]'
  await zoomOnto(page, win)
  await dragCentre(page, win, 41, 29)
  await page.mouse.up()
  await page.keyboard.press("Control+s")
  const moved = (await readCurrentProject(page))!.cutter!.legacySpec!.windows[0]
  // The 1 mm preference: whole millimetres.
  expect(Number.isInteger(moved.x) && Number.isInteger(moved.y)).toBe(true)
})
