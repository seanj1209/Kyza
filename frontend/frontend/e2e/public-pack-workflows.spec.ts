import { readFile } from "node:fs/promises"
import { createManualProjectFromDashboard, expect, expectExportReview, openExportMenu, readCurrentProject, attachProjectEvidence, test } from "./helpers/testState"

const publicPacks = [
  { id: "flowwrap", label: "Flowwrap", count: 2 },
  { id: "pillow-pack", label: "Pillow Pack", count: 1 },
  { id: "doy-pouch", label: "DOY Pouch", count: 1 },
  { id: "k-seal-pouch", label: "K Seal Pouch", count: 1 },
  { id: "sachet-3-side-seal", label: "3-Side Seal Sachet", count: 1 },
  { id: "sachet-4-side-seal", label: "4-Side Seal Sachet", count: 2 },
  { id: "paper-strip", label: "Strip Laminate", count: 1 },
] as const

for (const pack of publicPacks) {
  test(`@beta public pack workflow: ${pack.label}`, async ({ page }, testInfo) => {
    const name = `QA ${pack.id}`
    const created = await createManualProjectFromDashboard(page, {
      name, packLabel: pack.label, widthMm: 300, heightMm: 220,
      ...(pack.id === "paper-strip" ? {} : { eyemarkCount: pack.count }),
    })
    expect(created?.cutter?.packType).toBe(pack.id)
    await page.getByRole("button", { name: "Base", exact: true }).click()
    const width = page.locator('input[data-cutter-field="width"]')
    const changedWidth = Number(await width.inputValue()) + 10
    await width.fill(String(changedWidth))
    await width.press("Enter")
    await expect(width).toHaveValue(String(changedWidth))
    await openExportMenu(page)
    page.once("dialog", dialog => dialog.accept(name))
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect.poll(async () => (await readCurrentProject(page))?.revision).toBeGreaterThan(created!.revision)
    const edited = await readCurrentProject(page)
    expect(edited?.cutter?.legacySpec).not.toEqual(created?.cutter?.legacySpec)
    const savedSpec = edited!.cutter!.legacySpec
    const identities = edited!.cutter!.identityMap

    await page.goto("/")
    await page.getByRole("article").filter({ hasText: name }).getByRole("link", { name: `Open ${name}` }).click()
    await page.waitForURL(new RegExp(`projectId=${created!.id}`))
    await expect(page.locator("#preview-canvas > svg")).toBeVisible()
    const reopened = await readCurrentProject(page)
    expect(reopened?.cutter?.legacySpec).toEqual(savedSpec)
    expect(reopened?.cutter?.identityMap).toEqual(identities)

    await openExportMenu(page)
    const checked = await readCurrentProject(page)
    expect(checked?.latestValidationRun?.summary.criticalCount, JSON.stringify(checked?.latestValidationRun?.issues.filter((issue: any) => issue.severity === "critical"))).toBe(0)
    await expect(page.getByRole("checkbox", { name: /Override errors/ })).toBeHidden()
    await expect(page.getByRole("button", { name: "Export selected", exact: true })).toBeEnabled()
    await page.getByRole("button", { name: "Export selected", exact: true }).click()
    const review = await expectExportReview(page)
    const warning = review.getByRole("checkbox", { name: /I have reviewed all warnings/ })
    if (await warning.count()) await warning.check()
    const download = page.waitForEvent("download")
    await review.getByRole("button", { name: /^(Export Cutter|Export with acknowledged warnings)$/ }).click()
    const output = await download
    expect(output.suggestedFilename()).toMatch(/\.svg$/)
    const markup = await readFile((await output.path())!, "utf8")
    const parsed = await page.evaluate(source => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml")
      return { errors: doc.querySelectorAll("parsererror").length, root: doc.documentElement.localName,
        width: doc.documentElement.getAttribute("width"), height: doc.documentElement.getAttribute("height"),
        geometry: doc.querySelectorAll("path,rect,line,polygon,polyline").length,
        layers: doc.querySelectorAll("[data-layer-id]").length }
    }, markup)
    expect(parsed.errors).toBe(0)
    expect(parsed.root).toBe("svg")
    expect(parsed.width).toMatch(/mm$/)
    expect(parsed.height).toMatch(/mm$/)
    expect(parsed.geometry).toBeGreaterThan(0)
    expect(parsed.layers).toBeGreaterThan(0)
    expect(markup).toContain(created!.id)
    await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.length).toBe(1)
    const exported = await readCurrentProject(page)
    const record = exported!.exportAuditRecords![0]
    expect(record.projectRevision).toBe(exported!.revision)
    expect(record.validationRunId).toBe(record.snapshot.validationRun.id)
    expect(record.snapshot.cutterSpec).toEqual(savedSpec)
    expect(record.exportFormat).toBe("svg")
    expect(record.deliveryStatus).toBe("download_initiated")
    await page.reload()
    await expect(page.locator("#preview-canvas > svg")).toBeVisible()
    expect((await readCurrentProject(page))?.exportAuditRecords).toEqual(exported!.exportAuditRecords)
    await attachProjectEvidence(testInfo, await readCurrentProject(page))
  })
}

test("@beta available output formats produce real files and distinct audit records", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "QA output formats", eyemarkCount: 1 })
  for (const format of ["ai-compatible-svg", "json", "raster-preview-pdf"]) {
    await openExportMenu(page)
    const inputs = page.locator('input[data-export-format]:enabled')
    for (const input of await inputs.all()) await input.uncheck()
    await page.locator(`input[data-export-format="${format}"]`).check()
    await page.getByRole("button", { name: "Export selected", exact: true }).click()
    const review = await expectExportReview(page)
    const download = page.waitForEvent("download")
    await review.getByRole("button", { name: "Export Cutter", exact: true }).click()
    const output = await download
    const bytes = await readFile((await output.path())!)
    expect(bytes.length).toBeGreaterThan(100)
    if (format === "json") expect(() => JSON.parse(bytes.toString("utf8"))).not.toThrow()
    if (format === "ai-compatible-svg") {
      expect(bytes.toString("utf8")).toContain("<svg")
      expect(output.suggestedFilename()).toMatch(/\.illustrator\.svg$/)
    }
    if (format === "raster-preview-pdf") expect(bytes.subarray(0, 5).toString()).toBe("%PDF-")
    await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.some(r => r.exportFormat === format)).toBe(true)
  }
  const records = (await readCurrentProject(page))!.exportAuditRecords!
  expect(records).toHaveLength(3)
  expect(new Set(records.map(r => r.id)).size).toBe(3)
})
