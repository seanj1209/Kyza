import { createManualProjectFromDashboard, expect, test } from "./helpers/testState"

test("@beta V4 exact Size accepts decimals while pointer steps preserve them", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { attachSelectionContextActions } = await import("/apps/web/src/ui/selectionContextActions.ts")
    const { sizeSelectedElement } = await import("/apps/web/src/ui/selectionSizing.ts")
    const { snapResizeFromOrigin } = await import("/apps/web/src/ui/resizeSnap.ts")
    const ns = "http://www.w3.org/2000/svg"
    const svg = document.createElementNS(ns, "svg")
    svg.setAttribute("viewBox", "0 0 200 100")
    svg.setAttribute("width", "400")
    svg.setAttribute("height", "200")
    svg.style.cssText = "position:fixed;left:20px;top:20px;z-index:99999;background:white"
    const rect = document.createElementNS(ns, "rect")
    rect.setAttribute("data-role", "window-shape")
    rect.setAttribute("data-window-id", "test-window")
    for (const [key, value] of Object.entries({ x: 20, y: 20, width: 20, height: 15 })) rect.setAttribute(key, String(value))
    svg.append(rect); document.body.append(svg)
    let spec = { ...getPackModule("flowwrap")!.getDefaults(), windows: [{ id: "test-window", shape: "rectangle" as const, x: 20, y: 20, width: 20, height: 15 }] }
    const state = { selectionMode: true, selectedElementIds: ["window:test-window"] }
    const store = { getState: () => state, getElement: () => ({ locked: false }), subscribe: () => () => {} }
    const api = attachSelectionContextActions(svg, store as never, () => spec, next => { spec = next as typeof spec })
    await new Promise(resolve => setTimeout(resolve, 1600))
    const trigger = svg.querySelector<HTMLButtonElement>("[data-context-menu-trigger]")
    trigger?.click()
    svg.querySelector<HTMLButtonElement>("[data-context-size]")?.click()
    const inputs = svg.querySelectorAll<HTMLInputElement>('form input[type="number"]')
    inputs[0].value = "35.25"; inputs[1].value = "24.5"
    svg.querySelector<HTMLFormElement>("form")?.requestSubmit()
    const exact = spec.windows![0]
    const sizedZone = sizeSelectedElement({ ...spec, safeZones: [{ id: "zone", label: "Zone", x: 0, y: 0, width: 10, height: 10 }] }, "safe-zone:zone", 35.25, 24.5)
    const sizedBox = sizeSelectedElement({ ...spec, attributeBoxes: [{ id: "qr", kind: "qr", x: 0, y: 0, width: 10, height: 10 }] }, "attribute-box:qr", 35.25, 24.5)
    const invalidCircle = sizeSelectedElement({ ...spec, windows: [{ id: "circle", shape: "circle", x: 0, y: 0, width: 10, height: 10 }] }, "window:circle", 35.25, 24.5)
    const stepped = snapResizeFromOrigin(35.25, 36.1)
    api.destroy(); svg.remove()
    return { menu: !!trigger, width: exact.width, height: exact.height, zone: sizedZone?.safeZones?.[0].width, box: sizedBox?.attributeBoxes?.[0].width, invalidCircle: invalidCircle === null, stepped }
  })
  expect(result).toEqual({ menu: true, width: 35.25, height: 24.5, zone: 35.25, box: 35.25, invalidCircle: true, stepped: 36.25 })
})

test("@beta V4 compact Flow switches Chat and QC and closes cleanly", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V4 Flow" })
  const dock = page.locator("#flow-assistant-dock")
  await expect(dock).toHaveAttribute("data-state", "collapsed")
  expect((await dock.boundingBox())!.width).toBeLessThanOrEqual(340)
  await page.screenshot({ path: "test-results/v4-flow-collapsed.png", fullPage: true })
  await dock.getByRole("tab", { name: "Chat", exact: true }).click()
  await expect(dock).toHaveAttribute("data-state", "chat")
  await dock.locator(".flow-assistant-status").click()
  await expect(dock).toHaveAttribute("data-state", "issues")
  await dock.press("Escape")
  await expect(dock).toHaveAttribute("data-state", "collapsed")
})

test("@beta V4 legend centres on cutter and omits absent keys", async ({ page }) => {
  await page.goto("/")
  const rows = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    return (["portrait", "landscape"] as const).map(orientation => {
      const pack = getPackModule("flowwrap")!
      const spec = { ...pack.getDefaults(), cutterLegend: true, cutterLegendOrientation: orientation, cutterLegendPosition: orientation === "portrait" ? "top" as const : "right" as const, safeZones: [], windows: [], hangerSlots: [], attributeBoxes: [], halfMoonCutouts: [] }
      const svg = pack.render(spec)
      const cutter = svg.querySelector('[data-cutter-width]')!
      const x = Number(cutter.getAttribute("data-origin-x") ?? cutter.getAttribute("data-cutter-origin-x"))
      const y = Number(cutter.getAttribute("data-origin-y") ?? cutter.getAttribute("data-cutter-origin-y"))
      const width = Number(cutter.getAttribute("data-cutter-width"))
      const height = Number(cutter.getAttribute("data-cutter-height"))
      const legend = svg.querySelector("#cutter_legend")!
      const [lx, ly] = legend.getAttribute("transform")!.match(/translate\(([^ ]+) ([^)]+)\)/)!.slice(1).map(Number)
      return { orientation, centred: orientation === "portrait" ? Math.abs(lx + 116 * 1.3 / 2 - (x + width / 2)) < .01 : Math.abs(ly + 112 * 1.3 / 2 - (y + height / 2)) < .01, noSafeKey: !legend.textContent!.includes("SAFE PRINT AREA"), separateTagline: orientation === "portrait" || Number(legend.querySelector('text:nth-of-type(2)')?.getAttribute("y")) !== 13 }
    })
  })
  expect(rows.every(row => row.centred && row.noSafeKey && row.separateTagline)).toBe(true)
})

test("@beta V4 legend action menu exposes Switch without moving the cutter", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V4 legend" })
  await page.getByRole("button", { name: "Legend layouts", exact: true }).click()
  await page.getByRole("menuitem", { name: "Landscape Klyro legend" }).click()
  const svg = page.locator("#preview-canvas > svg")
  await expect(svg.locator("#cutter_legend")).toBeVisible()
  await page.screenshot({ path: "test-results/v4-legend-landscape.png", fullPage: true })
  const before = await svg.locator('[data-layer-id="cutter-outline"]').first().evaluate(node => node.outerHTML)
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  await svg.locator("#cutter_legend").click()
  await svg.locator('[aria-label="Legend actions"]').click()
  await expect(svg.locator('[data-role="legend-action-menu"]')).toBeVisible()
  await svg.getByRole("menuitem", { name: "Switch legend position" }).click()
  await expect(svg.locator("#cutter_legend")).toHaveAttribute("data-orientation", "landscape")
  const after = await svg.locator('[data-layer-id="cutter-outline"]').first().evaluate(node => node.outerHTML)
  expect(after).toBe(before)
})
