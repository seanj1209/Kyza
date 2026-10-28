import { expect, test } from "./helpers/testState"

test("@beta Legend Config V1 saves layouts, manual sizing and active items", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Legend Config" }).click()
  const dialog = page.getByRole("dialog", { name: "Legend Config" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel("Legend preset", { exact: true })).toHaveValue("klyro-standard")
  await expect(dialog.getByLabel("Legend width")).toBeDisabled()
  await dialog.getByRole("radio", { name: "Manual" }).check()
  await dialog.getByLabel("Legend width").fill("240")
  await dialog.getByLabel("Legend height").fill("112")
  await dialog.getByRole("radio", { name: "Landscape" }).check()
  await dialog.getByRole("button", { name: "Add Customer" }).click()
  await dialog.getByLabel("Preset name").fill("Customer landscape")
  await dialog.getByRole("button", { name: "Save preset" }).click()
  await expect(dialog.getByRole("status")).toHaveText("Preset saved.")
  await page.screenshot({ path: "test-results/amends-v10-legend-config.png", fullPage: true })
  await dialog.getByRole("button", { name: "Close legend configuration" }).click()
  await page.getByRole("button", { name: "Legend Config" }).click()
  await expect(page.getByRole("dialog", { name: "Legend Config" }).getByLabel("Preset name")).toHaveValue("Customer landscape")
  await expect(page.getByRole("dialog", { name: "Legend Config" }).getByText("Customer", { exact: true })).toBeVisible()
})

test("@beta AMENDS 10 K Seal uses pack-height spans and restores bottom and height submeasures", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    document.documentElement.setAttribute("data-sub-measures", "true")
    const pack = getPackModule("k-seal-pouch")!
    const svg = pack.render(pack.getDefaults())
    document.documentElement.setAttribute("data-sub-measures", "false")
    const frame = document.createElement("div")
    frame.style.cssText = "position:fixed;inset:20px;z-index:99999;background:white"
    svg.style.width = "100%"; svg.style.height = "100%"
    frame.append(svg); document.body.append(frame)
    const labels = (row: string) => [...svg.querySelectorAll(`[data-role="kseal-submeasure-text"][data-row="${row}"]`)].map(node => node.textContent)
    return { top: labels("top"), bottom: labels("bottom"), height: labels("height") }
  })
  expect(result.top).toEqual(["200mm", "200mm"])
  expect(result.bottom.length).toBeGreaterThanOrEqual(6)
  expect(result.height).toEqual(["7.5mm", "175mm", "7.5mm"])
  await page.screenshot({ path: "test-results/amends-v10-kseal-measures.png" })
})

test("@beta AMENDS 10 Lidding chooser shows the cutter, pull tab and inner seal contours", async ({ page }) => {
  await page.goto("/cutter")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  const slide = page.locator('.studio-pack-carousel .slide[data-pack-id="lidding"]')
  await expect(slide).toBeVisible()
  await expect(slide.locator('.pic path.sl')).toHaveCount(3)
  await page.waitForTimeout(1800)
  await page.screenshot({ path: "test-results/amends-v10-lidding-graphic.png" })
})
