import { expect, test } from "@playwright/test"
import { createManualProjectFromDashboard } from "./helpers/testState"

for (const packLabel of ["DOY Pouch", "K Seal Pouch"]) {
  test(`${packLabel} keeps both measured pouch faces in Beta`, async ({ page }) => {
    await page.goto("/")
    await createManualProjectFromDashboard(page, { name: `${packLabel} preview`, packLabel })
    await page.locator('#dock [data-tool="more"]').click()
    await page.getByRole("menuitemcheckbox", { name: "Pouch Preview" }).click()
    const faces = page.locator(".pouch-preview-face")
    await expect(faces).toHaveCount(2)
    for (const face of ["fop", "bop"]) {
      const drawing = page.locator(`.pouch-preview-face svg[data-pouch-preview-face="${face}"]`)
      await expect(drawing.locator('[data-role="pouch-preview-length"]')).toHaveCount(1)
      await expect(drawing.locator('[data-role="pouch-preview-width"]')).toHaveCount(1)
    }
    await page.getByRole("combobox", { name: "Set canvas zoom" }).selectOption("10")
    await expect(page.locator('#preview-canvas > svg')).toHaveAttribute("data-pouch-preview-face", "both")
  })
}

test("Beta exposes the scoped shape preview", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(async () => {
    const { initCustomisationPanel } = await import("/apps/web/src/ui/customisationPanel.ts")
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const spec = { ...getPackModule("plain-film")!.getDefaults(), attributeBoxes: [{ id: "bbe", kind: "bbe", x: 20, y: 20, width: 50, height: 30 }] }
    const host = document.createElement("div")
    document.body.replaceChildren(host)
    const panel = initCustomisationPanel({ host, onChange: () => {}, getCurrentSvg: () => null })
    panel.setSpec(spec)
    panel.setActiveLayer("notes")
    panel.element.classList.add("is-open")
  })
  await page.getByRole("button", { name: "Edit BBE box shape" }).click()
  await expect(page.getByRole("dialog", { name: "BBE box shape" })).toBeVisible()
})

test("Beta keeps lidding and separate side-seal pouches locked", async ({ page }) => {
  await page.goto("/")
  const available = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    return ["lidding", "2-side-seal-pouch", "3-side-seal-pouch"].map(id => Boolean(getPackModule(id)))
  })
  expect(available).toEqual([false, false, false])
})
