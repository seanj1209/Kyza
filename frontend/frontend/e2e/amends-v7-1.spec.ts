import { expect, test } from "./helpers/testState"

test("Cutter Studio lists the requested packs in order", async ({ page }) => {
  await page.goto("/cutter")
  const labels = await page.locator('.studio-pack-carousel .slide').evaluateAll(slides =>
    slides.map(slide => slide.querySelector('h3')?.textContent?.trim() ?? '')
  )
  expect(labels.slice(0, 10)).toEqual([
    "Plain Film", "Flow Wrap", "Pillow Pack", "DOY Pouch", "K Seal Pouch",
    "3-Side Seal Pouch", "2-Side Seal Pouch", "3-Side Seal Sachet",
    "4-Side Seal Sachet", "Strip Film/Laminate",
  ])
  const clear = page.locator('.studio-pack-carousel .slide[data-pack-id="plain-film"] .pic svg text')
  await expect(clear).toHaveText("Clear")
})

test("side-seal pouch mirrors its faces and previews either face", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New Project", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Start a cutter" })
  await dialog.getByLabel("Project name").fill("V7.1 side pouch")
  await dialog.getByLabel("Pack type").selectOption("3-side-seal-pouch")
  await dialog.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL(/projectId=/)
  const cutter = page.locator('#preview-canvas > svg')
  await expect(cutter).toHaveAttribute("data-side-pouch", "3")
  await expect(cutter).toHaveAttribute("data-pan-enabled", "true")
  await expect(page.locator('#dock [data-tool="pan"]')).toHaveCount(0)
  await expect(cutter.locator('[data-pouch-face="fop"]')).toHaveCount(1)
  await expect(cutter.locator('[data-pouch-face="bop"]')).toHaveAttribute("transform", /scale\(-1 1\)/)
  await expect(cutter.locator('[data-role="pouch-trim"]')).toHaveCount(2)
  await expect(cutter.locator('[data-role="bottom-seal-centre-line"]')).toHaveCount(1)
  await page.locator('#dock [data-tool="measure"]').click()
  await expect(cutter).toHaveAttribute("data-measure-enabled", "true")
  await page.keyboard.down("Alt")
  await expect(cutter).toHaveAttribute("data-alt-pan-ready", "true")
  await page.keyboard.up("Alt")
  await page.locator('#dock [data-tool="measure"]').click()
  await expect(cutter).toHaveAttribute("data-pan-enabled", "true")

  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
  const overlay = page.locator('.pouch-preview-overlay')
  await expect(overlay).toBeVisible()
  await expect(cutter).toHaveAttribute("data-pouch-preview-face", "fop")
  await expect(page.locator('.pouch-preview-measure-host [data-role="pouch-preview-length"] text')).toHaveCount(1)
  await expect(page.locator('.pouch-preview-measure-host [data-role="pouch-preview-width"] text')).toHaveCount(1)
  await overlay.getByRole("button", { name: "BOP" }).click()
  await expect(cutter).toHaveAttribute("data-pouch-preview-face", "bop")
  await overlay.getByRole("button", { name: "Trim" }).click()
  await expect(cutter).toHaveAttribute("data-preview-trim", "false")
  await page.keyboard.press("Escape")
  await expect(overlay).toBeHidden()
})

test("DOY and K-seal previews use the finished pouch faces", async ({ page }) => {
  for (const id of ["doy-pouch", "k-seal-pouch"]) {
    await page.goto("/")
    await page.getByRole("button", { name: "New Project", exact: true }).first().click()
    const dialog = page.getByRole("dialog", { name: "Start a cutter" })
    await dialog.getByLabel("Project name").fill(`V7.1 ${id}`)
    await dialog.getByLabel("Pack type").selectOption(id)
    await dialog.getByRole("button", { name: "Create Project" }).click()
    await page.waitForURL(/projectId=/)
    await page.locator('#dock [data-tool="more"]').click()
    await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
    const drawing = page.locator('#preview-canvas > svg[data-pouch-preview-face="fop"]')
    await expect(drawing).toBeVisible()
    await expect(page.locator('.pouch-preview-measure-host [data-role="pouch-preview-length"] text')).toHaveCount(1)
    await expect(page.locator('.pouch-preview-measure-host [data-role="pouch-preview-width"] text')).toHaveCount(1)
    await page.locator('.pouch-preview-overlay').getByRole("button", { name: "BOP" }).click()
    await expect(page.locator('#preview-canvas > svg[data-pouch-preview-face="bop"]')).toBeVisible()
  }
})
