import { expect, test } from "./helpers/testState"

async function createPouch(page: import("@playwright/test").Page, packType = "doy-pouch") {
  await page.goto("/")
  await page.getByRole("button", { name: "New Project", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Start a cutter" })
  await dialog.getByLabel("Project name").fill(`V7.2 ${packType}`)
  await dialog.getByLabel("Pack type").selectOption(packType)
  await dialog.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL(/projectId=/)
}

test("pack icons keep red seals in both themes", async ({ page }) => {
  await page.goto("/cutter")
  const icon = page.locator('.studio-pack-carousel .slide[data-pack-id="doy-pouch"] .pic svg')
  const seal = icon.locator(".sl").first()
  await expect(seal).toHaveCount(1)
  await expect(page.locator('.studio-pack-carousel .slide[data-pack-id="plain-film"] .pic svg rect')).toHaveCSS("fill", "none")
  for (const theme of ["light", "dark"]) {
    await page.evaluate(value => document.documentElement.setAttribute("data-kyza-theme", value), theme)
    const colors = await icon.evaluate(svg => ({
      body: getComputedStyle(svg.querySelector("text")!).fill,
      seal: getComputedStyle(svg.querySelector(".sl")!).stroke,
      filter: getComputedStyle(svg).filter,
    }))
    expect(colors.body).toBe(theme === "dark" ? "rgb(255, 255, 255)" : "rgb(21, 21, 21)")
    expect(colors.seal).toBe("rgb(158, 19, 22)")
    expect(colors.filter).toBe("none")
  }
})

test("live pouch preview keeps canvas tools, then Return restores cutter view", async ({ page }) => {
  await createPouch(page)
  const cutter = page.locator("#preview-canvas > svg")
  const normalView = await cutter.getAttribute("viewBox")
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
  await expect(cutter).toHaveAttribute("data-pouch-preview", "true")
  await expect(page.locator('.pouch-preview-measure-host [data-role="pouch-preview-length"] text')).toHaveCount(1)
  await expect(page.locator('.pouch-preview-measure-host [data-role="pouch-preview-width"] text')).toHaveCount(1)
  const previewView = await cutter.getAttribute("viewBox")
  expect(previewView).not.toBe(normalView)
  await page.locator('#dock [data-tool="measure"]').click()
  await expect(cutter).toHaveAttribute("data-measure-enabled", "true")
  await page.locator('#dock [data-tool="select"]').click()
  await expect(cutter).toHaveAttribute("data-select-enabled", "true")
  await page.getByRole("button", { name: "Zoom in 50 percent" }).click()
  expect(await cutter.getAttribute("viewBox")).not.toBe(previewView)
  await page.keyboard.press("Escape")
  await expect(cutter).toHaveAttribute("viewBox", normalView!)
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
  await page.getByRole("button", { name: "Return to Cutter Studio start page" }).click()
  await expect(page.locator(".pouch-preview-overlay")).toBeHidden()
  await expect(cutter).toHaveAttribute("data-pouch-preview", "false")
  await page.getByRole("button", { name: /Resume/ }).click()
  await expect(page.locator("#preview-canvas > svg")).toHaveAttribute("data-pouch-preview", "false")
})

test("adding elements enables Selection Mode and selects the new element", async ({ page }) => {
  await createPouch(page)
  await page.getByRole("button", { name: "Elements", exact: true }).first().click()
  await page.getByRole("button", { name: "Safe Zones" }).click()
  const cutter = page.locator("#preview-canvas > svg")
  await expect(cutter).toHaveAttribute("data-select-enabled", "true")
  await expect(page.locator('#dock [data-tool="select"]')).toHaveAttribute("aria-pressed", "true")
  await expect(cutter.locator('#selection_overlay [data-selection-id^="safe-zone:"]')).toHaveCount(1)
  await page.getByRole("tab", { name: "Barcodes / BBEs" }).click()
  await page.getByRole("button", { name: "Barcode", exact: true }).click()
  await expect(cutter.locator('#selection_overlay [data-selection-id^="attribute-box:"]')).toHaveCount(1)
  await page.getByRole("tab", { name: "Perforations" }).click()
  await page.getByRole("button", { name: "MicroPerf" }).click()
  await expect(cutter.locator('#selection_overlay [data-selection-id="perf-lane:0"]')).toHaveCount(1)
})

test("DOY gusset sub-measures use 40 mm halves and both sides of each bottom-seal guide", async ({ page }) => {
  await createPouch(page)
  await page.getByRole("button", { name: "Base", exact: true }).first().click()
  const sub = page.locator('.toggle-pair').filter({ hasText: /^Sub/ })
  await sub.getByRole("button", { name: "On" }).click()
  const features = page.locator("#preview-canvas #sub_measure_features")
  await expect(features).toBeVisible()
  const labels = await features.locator("text").allTextContents()
  expect(labels.filter(label => /^40\s*mm$/i.test(label.trim()))).toHaveLength(2)
  expect(labels.filter(label => /^7\.5(?:\s*mm)?$/i.test(label.trim()))).toHaveLength(4)
})
