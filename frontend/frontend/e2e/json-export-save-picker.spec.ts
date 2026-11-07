import { createManualProjectFromDashboard, expect, expectExportReview, openExportMenu, readCurrentProject, test } from "./helpers/testState"

// The shared fixture removes window.showSaveFilePicker so other specs use the
// download fallback. This spec restores a picker that validates `accept` keys
// like Chrome/Edge ("Invalid type" for "application/json;charset=utf-8") and
// keeps the written file in memory, so JSON export is covered through the
// native save path that users hit.
test("@beta JSON export saves through the native save picker", async ({ page }) => {
  await page.addInitScript(() => {
    const saved: Array<{ name: string; accept: string[]; text: string }> = []
    ;(window as typeof window & { __savedExports?: typeof saved }).__savedExports = saved
    ;(window as typeof window & { showSaveFilePicker?: unknown }).showSaveFilePicker = async (options: { suggestedName: string; types: Array<{ accept: Record<string, string[]> }> }) => {
      const accept = options.types.flatMap(type => Object.keys(type.accept))
      const invalid = accept.find(key => !/^[a-z]+\/[a-z0-9.+-]+$/.test(key))
      if (invalid) throw new TypeError(`Failed to execute 'showSaveFilePicker' on 'Window': Invalid type: ${invalid}`)
      return {
        createWritable: async () => {
          const parts: string[] = []
          return {
            write: async (blob: Blob) => { parts.push(await blob.text()) },
            close: async () => { saved.push({ name: options.suggestedName, accept, text: parts.join("") }) },
          }
        },
      }
    }
  })
  await createManualProjectFromDashboard(page, { name: "QA JSON picker", eyemarkCount: 1 })
  const alerts: string[] = []
  page.on("dialog", dialog => { alerts.push(dialog.message()); void dialog.accept() })
  await openExportMenu(page)
  for (const input of await page.locator("input[data-export-format]:enabled").all()) await input.uncheck()
  await page.locator('input[data-export-format="json"]').check()
  await page.getByRole("button", { name: "Export selected", exact: true }).click()
  const review = await expectExportReview(page)
  await review.getByRole("button", { name: "Export Cutter", exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __savedExports?: unknown[] }).__savedExports?.length ?? 0)).toBe(1)
  const [file] = await page.evaluate(() => (window as typeof window & { __savedExports?: Array<{ name: string; accept: string[]; text: string }> }).__savedExports!)
  expect(file.accept).toEqual(["application/json"])
  expect(file.name).toMatch(/\.json$/)
  expect(JSON.parse(file.text).schemaVersion).toBe("kyza-json-export-1")
  expect(alerts.some(message => message.includes("delivery failed"))).toBe(false)
  await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.find(record => record.exportFormat === "json")?.deliveryStatus).toBe("saved")
})
