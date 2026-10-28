import { generateSuggestions, createManualProjectFromDashboard, expect, openExportMenu, readCurrentProject, test } from "./helpers/testState"

for (const side of ["left", "right"] as const) {
  test(`@beta FlowAI explicit ${side} edge survives creation and reopen`, async ({ page }) => {
    const suggestions = await generateSuggestions(page, `Flowwrap, 510 mm wide x 280 mm high, one eyemark on the ${side} edge`)
    await suggestions.getByRole("button", { name: "Open in Cutter Studio", exact: true }).click()
    const details = page.getByRole("dialog", { name: "Project Details" })
    const name = `QA Flow ${side}`
    await details.getByLabel("Project Name", { exact: true }).fill(name)
    await details.getByRole("button", { name: "Create Project and Cutter", exact: true }).click()
    await page.waitForURL(/projectId=/)
    await expect(page.locator("#preview-canvas > svg")).toBeVisible()
    const created = await readCurrentProject(page)
    expect(created?.cutter?.legacySpec?.eyeMarks.position).toBe(`top-${side}`)
    const rect = await page.locator('[data-role="eye-mark"]').evaluate(node => {
      const r = (node as SVGGraphicsElement).getBBox()
      const cutter = node.closest('[data-cutter-width]')!
      return { center: r.x + r.width / 2, origin: Number(cutter.getAttribute("data-cutter-origin-x")), width: Number(cutter.getAttribute("data-cutter-width")) }
    })
    expect(side === "left" ? rect.center < rect.origin + rect.width / 2 : rect.center > rect.origin + rect.width / 2).toBe(true)
    await openExportMenu(page)
    await expect(page.locator('.file-export-readiness [aria-label="critical: 0"]')).toBeVisible()
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await page.goto("/")
    await page.getByRole("link", { name: `Open ${name}`, exact: true }).click()
    await page.waitForURL(/projectId=/)
    expect((await readCurrentProject(page))?.cutter?.legacySpec.eyeMarks.position).toBe(`top-${side}`)
  })
}

for (const increment of [0.25, 0.5, 1]) {
  test(`@beta ${increment} mm nudge applies to selected eyemark and respects its lock`, async ({ page }) => {
    await page.goto("/account#cutter")
    await page.getByLabel("Nudge increment").selectOption(String(increment))
    await expect(page.getByLabel("Nudge increment")).toHaveValue(String(increment))
    // Selecting the existing 0.5 mm default is intentionally not a new save.
    if (increment !== 0.5) await expect(page.getByRole("status")).toHaveText("Saved on this device.")
    await createManualProjectFromDashboard(page, { name: `QA nudge ${increment}`, packLabel: "Flowwrap", eyemarkCount: 1 })
    await page.getByRole("button", { name: "Layers", exact: true }).click()
    const select = page.getByRole("button", { name: "Select Eyemark", exact: true })
    await select.click()
    const mark = page.locator('[data-role="eye-mark"]').first()
    const start = Number(await mark.getAttribute("x"))
    await page.keyboard.press("ArrowRight")
    await expect.poll(async () => Number(await mark.getAttribute("x"))).toBeCloseTo(start + increment, 5)
    const row = page.locator(".layer-row").filter({ has: select })
    await row.getByRole("button", { name: "Toggle lock", exact: true }).click()
    await page.keyboard.press("ArrowRight")
    await expect.poll(async () => Number(await mark.getAttribute("x"))).toBeCloseTo(start + increment, 5)
    await openExportMenu(page)
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await page.reload()
    await expect(mark).toBeVisible()
    expect(Number(await mark.getAttribute("x"))).toBeCloseTo(start + increment, 5)
  })
}
