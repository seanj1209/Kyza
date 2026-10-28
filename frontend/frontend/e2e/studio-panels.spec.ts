import { createManualProjectFromDashboard, expect, test } from "./helpers/testState"

test("Cutter panels retain attribute groups, layer actions and linked sizing", async ({ page }) => {
  await createManualProjectFromDashboard(page, {
    name: "E2E inspector refresh", packLabel: "Flowwrap",
    widthMm: 460, heightMm: 200, eyemarkCount: 2,
  })
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const size = page.locator('[data-cutter-field="width"]')
  const link = page.locator(".field").filter({ has: size }).getByRole("button")
  await link.click()
  await expect(link).toHaveAttribute("aria-pressed", "true")
  await size.fill("506")
  await size.press("Tab")
  await expect(page.locator('[data-cutter-field="height"]')).toHaveValue("220")
  await link.click()
  await expect(link).toHaveAttribute("aria-pressed", "false")
  await page.getByRole("button", { name: "Elements", exact: true }).click()
  const categories = page.getByRole("tablist", { name: "Element categories" })
  for (const group of ["Basic", "Barcodes / BBEs", "Die Cut Outs", "Perforations", "Openings", "Windows", "Labels"]) {
    await expect(categories.getByRole("tab", { name: group, exact: true })).toBeAttached()
  }
  await categories.getByRole("tab", { name: "Barcodes / BBEs", exact: true }).click()
  for (const name of ["Barcode", "QR Code", "BBE Box"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible()
  }
  await expect(page.getByRole("button", { name: "BBE Box", exact: true }).locator("svg text")).toHaveText("12/28")
  await page.getByRole("button", { name: "Layers", exact: true }).click()
  for (const name of ["Cutter", "Eyemark", "Seals", "Substrate"]) {
    await expect(page.getByRole("button", { name: "Select " + name, exact: true })).toBeVisible()
  }
  const row = page.locator(".layer-row").filter({ has: page.getByRole("button", { name: "Select Eyemark", exact: true }) })
  await expect(row.getByRole("button", { name: "Delete layer", exact: true })).toBeEnabled()
  for (const name of ["Toggle lock", "Toggle visibility"]) {
    const action = row.getByRole("button", { name, exact: true })
    const before = await action.locator("svg").innerHTML()
    await action.click()
    await expect(action.locator("svg")).not.toHaveJSProperty("innerHTML", before)
    await action.click()
    await expect(action.locator("svg")).toHaveJSProperty("innerHTML", before)
  }
  await page.getByRole("button", { name: "Toggle Eyemark instances" }).click()
  await expect(page.locator(".layer-child-list")).toBeVisible()
})

test("Validation remains clickable and Customise/export use a single padded scrolling surface", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "E2E popup surfaces" })
  await page.locator("#flow-assistant-dock .flow-assistant-status").click()
  const validation = page.locator("#studio-errors-panel")
  await expect(validation).toBeVisible()
  // A real click catches clipping by a scroll ancestor; visibility alone does not.
  await validation.getByRole("button", { name: "Re-run validation" }).click()
  await page.getByRole("button", { name: "Collapse Flow", exact: true }).click()
  await expect(validation).toBeHidden()
  await page.getByRole("button", { name: "Customise", exact: true }).click()
  const panel = page.locator("#customisation-panel")
  await expect(panel.getByRole("tablist", { name: "Customise categories" })).toHaveAttribute("aria-orientation", "vertical")
  const categories = panel.getByRole("tablist", { name: "Customise categories" })
  for (const tab of await categories.getByRole("tab").all()) {
    await tab.click()
    await expect(tab).toHaveAttribute("aria-selected", "true")
    const content = panel.locator('.studio-vertical-panel:visible')
    await expect(content).toHaveCount(1)
    const bounds = (await content.boundingBox())!, frame = (await panel.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(frame.x)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(frame.x + frame.width + 1)
    expect(await content.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
  }
  await panel.getByRole("button", { name: "Close panel", exact: true }).click()
  await page.locator("#studio-bottom-actions").getByRole("button", { name: "Export", exact: true }).click()
  await expect(panel.locator(".customisation-panel-header")).toContainText("Save / Export")
  const summary = panel.locator(".file-export-package")
  await expect(summary).toHaveCSS("max-width", "none")
  await expect(summary).toHaveCSS("max-height", "none")
  await panel.locator(".file-menu-trigger").click()
  await expect(panel.getByRole("checkbox", { name: /Editable SVG/ })).toBeChecked()
  await expect(panel.getByRole("button", { name: "Export selected", exact: true })).toBeEnabled()
})
