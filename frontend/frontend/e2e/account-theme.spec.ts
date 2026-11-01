import { expect, test } from "./helpers/testState"

test("@beta Account auto-saves preferences and keeps the selected theme across routes", async ({ page }) => {
  await page.goto("/account")
  await expect(page.getByRole("button", { name: "Save preferences" })).toHaveCount(0)

  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Kyza UI review")
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("ui-review@example.test")
  await page.getByRole("textbox", { name: "Company", exact: true }).fill("Packaging studio")
  await expect(page.getByRole("status")).toHaveText("Saved on this device.")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "User Preferences" }).click()
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Cutter preferences" }).click()
  await page.getByLabel("Units of measure").selectOption("in")
  await expect(page.getByRole("combobox", { name: "Quick Export", exact: true })).toHaveCount(0)
  await expect(page.getByRole("status")).toHaveText("Saved on this device.")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "User Preferences" }).click()

  // Native radios support arrow-key selection as well as clicking the preview.
  await page.getByRole("radio", { name: "Dark", exact: true }).focus()
  await page.keyboard.press("ArrowLeft")
  await expect(page.getByRole("radio", { name: "Light", exact: true })).toBeChecked()
  await expect(page.locator("html")).toHaveAttribute("data-kyza-theme", "light")
  await page.getByRole("link", { name: "Dashboard", exact: true }).click()
  await expect(page.locator("html")).toHaveAttribute("data-kyza-theme", "light")
  await page.getByRole("link", { name: "Accounts & Preferences", exact: true }).click()
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Kyza UI review")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Cutter preferences" }).click()
  await expect(page.getByLabel("Units of measure")).toHaveValue("in")
  await expect(page.getByRole("combobox", { name: "Quick Export", exact: true })).toHaveCount(0)
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "User Preferences" }).click()
  await expect(page.getByRole("radio", { name: "Light", exact: true })).toBeChecked()

  await page.getByRole("button", { name: "Switch to dark theme" }).click()
  await expect(page.getByRole("radio", { name: "Dark", exact: true })).toBeChecked()
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-kyza-theme", "dark")
})

test("@beta Cutter preference and legend configuration persist locally", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Legend Config" }).click()
  await expect(page.getByRole("dialog", { name: "Legend Config" })).toBeVisible()
  await expect(page.getByText("Eyemarks (count and size)")).toBeVisible()
  await expect(page.getByRole("checkbox", { name: "Show legend in Cutter Studio" })).toHaveCount(0)
  await page.getByRole("button", { name: "Close legend configuration" }).click()
  await page.getByRole("button", { name: "Cutter Preferences" }).click()
  await expect(page).toHaveURL(/\/account#cutter$/)
  await page.getByLabel("Nudge increment").selectOption("0.25")
  await expect(page.getByRole("status")).toHaveText("Saved on this device.")
  await page.reload()
  await expect(page.getByLabel("Nudge increment")).toHaveValue("0.25")
  await page.goto("/")
  await page.getByRole("button", { name: "Legend Config" }).click()
  await expect(page.getByText(/Legends start hidden/)).toBeVisible()
})

test("@beta Account theme cards fit mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/account")
  await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "User Preferences" }).click()
  for (const name of ["Light", "Dark"] as const) {
    await page.locator(".account-theme-option").filter({ has: page.getByRole("radio", { name, exact: true }) }).click()
    await expect(page.getByRole("radio", { name, exact: true })).toBeChecked()
    const cards = await page.locator(".account-theme-card").evaluateAll(nodes => nodes.map(node => {
      const bounds = node.getBoundingClientRect()
      return { fits: bounds.left >= 0 && bounds.right <= innerWidth, contentFits: node.scrollWidth <= node.clientWidth + 1 }
    }))
    expect(cards).toEqual([{ fits: true, contentFits: true }, { fits: true, contentFits: true }])
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
