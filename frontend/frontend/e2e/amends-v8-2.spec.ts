import { readFile } from "node:fs/promises"
import { expect, openExportMenu, readCanonicalProjects, test } from "./helpers/testState"
import type { Page } from "@playwright/test"

async function createPouch(page: Page, packType: string) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/")
  await page.getByRole("button", { name: "New Project", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Start a cutter" })
  await dialog.getByLabel("Project name").fill(`V8.2 ${packType}`)
  await dialog.getByLabel("Pack type").selectOption(packType)
  await dialog.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL(/projectId=/)
}

/** Adds a real, editable safe zone; on these packs it lands on the LEFT (FOP) side. */
async function addSafeZone(page: Page) {
  await page.getByRole("button", { name: "Elements", exact: true }).first().click()
  await page.getByRole("button", { name: "Safe Zones" }).click()
  await page.getByRole("button", { name: "Elements", exact: true }).first().click()
  await expect(page.locator('#preview-canvas > svg [data-role="safe-zone-outline"]').first()).toBeVisible()
}

async function openPreview(page: Page) {
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
  await expect(page.locator("#preview-canvas > svg")).toHaveAttribute("data-pouch-preview", "true")
}

const face = (page: Page, name: "FOP" | "BOP" | "Trim") => page.locator(".pouch-preview-overlay").getByRole("button", { name, exact: true }).click()

/** Screen boxes of the drawing and of a selector inside it, plus the crop facts. */
const previewState = (page: Page, selector: string, last = false) => page.evaluate(({ selector, last }) => {
  const svg = document.querySelector("#preview-canvas > svg") as SVGSVGElement
  const box = svg.getBoundingClientRect()
  const matches = [...svg.querySelectorAll(selector)]
  const target = (last ? matches.at(-1) : matches[0])?.getBoundingClientRect()
  const view = svg.viewBox.baseVal
  const [left, top, width, height] = (svg.getAttribute("data-pouch-preview-bounds") ?? "").split(" ").map(Number)
  return {
    svg: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
    target: target && { left: target.left, top: target.top, right: target.right, bottom: target.bottom, cx: target.left + target.width / 2, cy: target.top + target.height / 2 },
    elementAspect: svg.clientWidth / svg.clientHeight,
    viewAspect: view.width / view.height,
    view: { x: view.x, width: view.width },
    bounds: { left, top, width, height },
    rotation: svg.getAttribute("data-pouch-preview-rotation"),
  }
}, { selector, last })

const inside = (inner: { left: number; top: number; right: number; bottom: number }, outer: { left: number; top: number; right: number; bottom: number }) =>
  inner.left >= outer.left - 1 && inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1
const apart = (a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) =>
  a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1

test("@beta V8.2 a left-side safe zone belongs to FOP, never BOP, and edits in preview", async ({ page }) => {
  await createPouch(page, "doy-pouch")
  await addSafeZone(page)
  const zone = '[data-role="safe-zone-outline"]'
  // Cutter-space (mm) position of the real element, read from the drawing.
  const zoneBox = () => page.locator(`#preview-canvas > svg ${zone}`).first().evaluate(node => {
    const box = (node as SVGGraphicsElement).getBBox()
    return { x: box.x, y: box.y }
  })
  const before = await zoneBox()
  expect(before.x).toBeLessThan(80 + 250) // left (FOP) face of the DOY web

  await openPreview(page)
  const fop = await previewState(page, zone)
  expect(fop.rotation).toBe("90")
  // Exact crop: element and viewBox share one aspect ratio (no letterbox) and
  // the viewBox spans only the face, outer edge → centre bottom-seal line.
  expect(Math.abs(fop.elementAspect - fop.viewAspect)).toBeLessThan(.01)
  expect(fop.view.x).toBeCloseTo(fop.bounds.left, 5)
  expect(fop.view.width).toBeCloseTo(fop.bounds.width, 5)
  expect(fop.bounds).toEqual({ left: 80, top: 80, width: 250, height: 140 })
  // The safe zone is drawn inside the FOP face, near the pouch top (outer edge up).
  expect(inside(fop.target!, fop.svg)).toBe(true)
  expect(fop.target!.top - fop.svg.top).toBeLessThan(fop.svg.height * .35)
  // The BOP fold guide is outside the painted face.
  const otherFace = await previewState(page, '[data-role="doy-bottom-seal-midline"]', true)
  expect(apart(otherFace.target!, otherFace.svg)).toBe(true)
  await page.screenshot({ path: "test-results/v82-doy-fop.png" })

  // Move the real element in preview: screen-down on FOP is towards the pouch bottom (+x on the cutter).
  // Adding the element already switched Selection Mode on.
  await expect(page.locator("#preview-canvas > svg")).toHaveAttribute("data-select-enabled", "true")
  await page.mouse.click(fop.target!.cx, fop.target!.cy)
  await expect(page.locator('#preview-canvas > svg #selection_overlay [data-selection-id^="safe-zone:"]')).toHaveCount(1)
  // Selecting redraws the drawing; retry the gesture on the settled drawing
  // so the check is about behaviour (screen-down on FOP = +x on the cutter), not timing.
  await expect(async () => {
    await page.waitForTimeout(300)
    const grip = await page.evaluate(selector => {
      const box = document.querySelector(`#preview-canvas > svg ${selector}`)!.getBoundingClientRect()
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    }, zone)
    await page.mouse.move(grip.x, grip.y)
    await page.mouse.down()
    await page.mouse.move(grip.x, grip.y + 20, { steps: 4 })
    await page.mouse.move(grip.x, grip.y + 40, { steps: 4 })
    await page.mouse.up()
    expect((await zoneBox()).x).toBeGreaterThan(before.x + 5)
  }).toPass({ timeout: 20_000 })
  const moved = await zoneBox()
  expect(Math.abs(moved.y - before.y)).toBeLessThan(2)

  await face(page, "BOP")
  const bop = await previewState(page, zone)
  expect(bop.rotation).toBe("-90")
  expect(bop.bounds).toEqual({ left: 410, top: 80, width: 250, height: 140 })
  expect(apart(bop.target!, bop.svg)).toBe(true)
  await page.screenshot({ path: "test-results/v82-doy-bop.png" })

  // Zooming out never reveals anything beyond the face.
  await page.getByRole("button", { name: /Zoom out/ }).first().click()
  const zoomedOut = await previewState(page, zone)
  expect(zoomedOut.view.x).toBeCloseTo(zoomedOut.bounds.left, 5)
  expect(zoomedOut.view.width).toBeCloseTo(zoomedOut.bounds.width, 5)

  await page.keyboard.press("Escape")
  await expect(page.locator("#preview-canvas > svg")).toHaveAttribute("data-pouch-preview", "false")
})

test("@beta V8.2 K Seal faces end on their bottom-seal guides", async ({ page }) => {
  await createPouch(page, "k-seal-pouch")
  const guides = await page.locator('#preview-canvas > svg [data-role="kseal-bottom-seal-guide"]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("x1"))).sort((a, b) => a - b))
  await openPreview(page)
  const fop = await previewState(page, '[data-role="kseal-center-line"]')
  expect(fop.bounds.left + fop.bounds.width).toBeCloseTo(guides[0], 5)
  expect(apart(fop.target!, fop.svg)).toBe(true) // the gusset centre fold is not part of FOP
  await face(page, "BOP")
  const bop = await previewState(page, '[data-role="kseal-center-line"]')
  expect(bop.bounds.left).toBeCloseTo(guides[1], 5)
  expect(apart(bop.target!, bop.svg)).toBe(true)
  await page.screenshot({ path: "test-results/v82-kseal-bop.png" })
})

test("@beta V8.2 3SS faces draw on the web and Trim toggles the outer band", async ({ page }) => {
  await createPouch(page, "3-side-seal-pouch")
  await addSafeZone(page)
  // Normal view: the FOP panel sits inside the web outline (left half).
  const normal = await page.evaluate(() => {
    const svg = document.querySelector("#preview-canvas > svg")!
    const web = svg.querySelector('[data-role="pouch-web-outline"]')!.getBoundingClientRect()
    const zone = svg.querySelector('[data-pouch-face="fop"] [data-role="safe-zone-outline"]')!.getBoundingClientRect()
    return { web: { left: web.left, top: web.top, right: web.right, bottom: web.bottom }, zone: { left: zone.left, top: zone.top, right: zone.right, bottom: zone.bottom }, centre: (web.left + web.right) / 2 }
  })
  expect(inside(normal.zone, normal.web)).toBe(true)
  expect(normal.zone.right).toBeLessThan(normal.centre)

  await openPreview(page)
  const zone = '[data-pouch-face="fop"] [data-role="safe-zone-outline"]'
  const withTrim = await previewState(page, zone)
  expect(withTrim.bounds).toEqual({ left: 38, top: 38, width: 265, height: 190 })
  expect(inside(withTrim.target!, withTrim.svg)).toBe(true)
  await face(page, "Trim")
  const noTrim = await previewState(page, '[data-role="pouch-trim"][data-trim-side="left"]')
  expect(noTrim.bounds).toEqual({ left: 53, top: 38, width: 250, height: 190 })
  expect(apart(noTrim.target!, noTrim.svg)).toBe(true)
  await page.screenshot({ path: "test-results/v82-3ss-fop-no-trim.png" })
  await face(page, "BOP")
  const bop = await previewState(page, '[data-role="pouch-trim"][data-trim-side="right"]')
  expect(bop.bounds).toEqual({ left: 303, top: 38, width: 250, height: 190 })
  expect(apart(bop.target!, bop.svg)).toBe(true)
  await face(page, "Trim")
  const bopTrim = await previewState(page, '[data-role="pouch-trim"][data-trim-side="right"]')
  expect(bopTrim.bounds).toEqual({ left: 303, top: 38, width: 265, height: 190 })
  expect(inside(bopTrim.target!, bopTrim.svg)).toBe(true)
})

async function startLidding(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/cutter")
  for (let index = 0; index < 15; index++) {
    if (await page.locator(".studio-pack-carousel .slide.is-active").getAttribute("data-pack-id") === "lidding") break
    await page.locator(".studio-pack-carousel .next").click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await setup.getByRole("button", { name: "Square lid" }).click()
  const dock = page.getByRole("region", { name: "Lid dock" })
  await dock.getByRole("spinbutton", { name: "Outer cutter width" }).fill("180")
  await dock.getByRole("spinbutton", { name: "Outer cutter width" }).blur()
  await dock.getByRole("spinbutton", { name: "Outer cutter height" }).fill("170")
  await dock.getByRole("spinbutton", { name: "Outer cutter height" }).blur()
  return dock
}

test("@beta V8.2 Lidding overall slit size grows without resizing the lid, then saves and exports", async ({ page }) => {
  test.setTimeout(90_000)
  const dock = await startLidding(page)
  const drawing = page.locator('#preview-canvas svg[data-pack="lidding"]')
  // Default eyemarks are 10 × 6 mm: 180 + 2 × 13 = 206 wide, 170 + 9 + 3 = 182 high.
  await expect(drawing).toHaveAttribute("data-cutter-width", "206")
  await expect(drawing).toHaveAttribute("data-cutter-height", "182")
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const overall = page.getByLabel("Overall cutter (slit)")
  await expect(overall).toContainText("Min cutter width 206 mm")
  await expect(overall.getByRole("spinbutton", { name: "Overall cutter width" })).toHaveValue("206")

  await overall.getByRole("spinbutton", { name: "Overall cutter width" }).fill("210")
  await overall.getByRole("spinbutton", { name: "Overall cutter width" }).blur()
  await page.getByRole("dialog", { name: "Resize lidding cutter" }).getByRole("button", { name: "Keep lid config" }).click()
  await expect(drawing).toHaveAttribute("data-cutter-width", "210")
  await expect(drawing).toHaveAttribute("data-lid-width", "180")
  await expect(page.getByRole("region", { name: "Lid dock" }).getByRole("spinbutton", { name: "Outer cutter width" })).toHaveValue("180")
  const marks = await drawing.evaluate(svg => ({
    eye: [...svg.querySelectorAll('[data-layer-id="eyemarks"] [data-role="eye-mark"]')].map(node => Number(node.getAttribute("x")) - 40),
    edge: svg.querySelector('[data-role="lidding-cutter-edge"]')!.getAttribute("stroke"),
  }))
  expect(marks.eye).toEqual([1.5, 198.5])
  expect(marks.edge).toBe("#2eb774")
  await page.screenshot({ path: "test-results/v82-lidding-210.png" })

  // Saved project keeps the slit and the lid separately and reopens with both.
  page.once("dialog", prompt => prompt.accept("V8.2 Lidding slit"))
  await openExportMenu(page)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect.poll(async () => (await readCanonicalProjects(page)).find(project => project.cutter.packType === "lidding")?.cutter.legacySpec.width).toBe(210)
  const saved = (await readCanonicalProjects(page)).find(project => project.cutter.packType === "lidding")!
  expect(saved.cutter.legacySpec.lidding.overallWidth).toBe(210)
  expect(saved.cutter.legacySpec.lidding.outerCutWidth).toBe(180)
  await page.goto(`/cutter?projectId=${saved.id}`)
  const reopened = page.locator('#preview-canvas svg[data-pack="lidding"]')
  await expect(reopened).toHaveAttribute("data-cutter-width", "210")
  await expect(reopened).toHaveAttribute("data-lid-width", "180")

  // Editable SVG export carries the enlarged slit and the unchanged lid.
  await openExportMenu(page)
  await page.getByRole("button", { name: "Export selected", exact: true }).click()
  const review = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close pre-export review" }) })
  await expect(review).toBeVisible()
  const download = page.waitForEvent("download")
  await review.getByRole("button", { name: "Export Cutter" }).click()
  const file = await (await download).path()
  const text = await readFile(file!, "utf8")
  expect(text).toContain('data-pack="lidding"')
  expect(text).toMatch(/data-cutter-width="210"/)
  expect(text).toMatch(/data-lid-width="180"/)
  expect(text).toMatch(/data-role="lidding-cutter-edge"/)
})

test("@beta V8.2 Lidding eyemarks move only inside their clearances", async ({ page }) => {
  const dock = await startLidding(page)
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const overall = page.getByLabel("Overall cutter (slit)")
  await overall.getByRole("spinbutton", { name: "Overall cutter width" }).fill("230")
  await overall.getByRole("spinbutton", { name: "Overall cutter width" }).blur()
  await page.getByRole("dialog", { name: "Resize lidding cutter" }).getByRole("button", { name: "Keep lid config" }).click()
  const drawing = page.locator('#preview-canvas svg[data-pack="lidding"]')
  await expect(drawing).toHaveAttribute("data-cutter-width", "230")
  await page.locator('#dock [data-tool="select"]').click()
  const mark = page.locator('#preview-canvas svg [data-layer-id="eyemarks"] [data-role="eye-mark"][data-eye-index="0"]')
  await mark.click()
  await expect(page.locator('#preview-canvas svg [data-role="eye-mark-move"][data-eye-index="0"]')).toHaveCount(1)
  const box = (await mark.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 400, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  // 230 − 206 = 24 mm extra → lid starts at 13 + 12 = 25 mm; the mark stops 1.5 mm before it.
  await expect.poll(() => mark.evaluate(node => Number(node.getAttribute("x")) - 40 + Number(node.getAttribute("width")))).toBeCloseTo(25 - 1.5, 5)
  await expect(drawing).toHaveAttribute("data-cutter-width", "230")
  await expect(drawing).toHaveAttribute("data-lid-width", "180")
})
