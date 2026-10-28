import { BETA_PROMPTS, uniqueProjectName } from "./fixtures/betaFixtures"
import {
  createManualProjectFromDashboard,
  expect,
  generateSuggestions,
  openExportMenu,
  test,
} from "./helpers/testState"

const desktopViewports = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const

for (const viewport of desktopViewports) {
  test(`@beta Pack Gen suggestion smoke at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    const dialog = await generateSuggestions(page, BETA_PROMPTS.multipleSuggestions.prompt)
    await expect(page.getByRole("button", { name: "View Suggestions" })).toBeVisible()
    await expect(dialog.getByRole("article")).toHaveCount(1)
    await expect(dialog.getByRole("button", { name: "Build Specification" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Open in Cutter Studio" })).toBeVisible()

    const bounds = await dialog.boundingBox()
    expect(bounds).toBeTruthy()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
    await expect.poll(() => dialog.locator(".pack-gen-suggestion-content").evaluate((node) => ({
      overflowY: getComputedStyle(node).overflowY,
      fits: node.scrollHeight <= node.clientHeight + 1,
    }))).toEqual({ overflowY: "hidden", fits: true })
  })
}

test.describe("@beta theme and accessibility smoke", () => {
  test("Pack Gen primary controls and suggestion overlay work by keyboard", async ({ page }) => {
    await page.goto("/cutter?choose=1&studio=start")
    const prompt = page.getByLabel("What are you creating?")
    await prompt.focus()
    await expect(prompt).toBeFocused()
    await prompt.fill(BETA_PROMPTS.multipleSuggestions.prompt)

    await page.getByRole("button", { name: "Submit prompt" }).focus()
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("dialog", { name: "Suggested Pack Types" })
    await expect(dialog).toBeVisible()
    await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)

    const close = dialog.getByRole("button", { name: "Close Suggested Pack Types" })
    await close.focus()
    await page.keyboard.press("Shift+Tab")
    await expect.poll(() => dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: "View Suggestions" })).toBeFocused()
  })

  test("Builder and pre-export dialogs trap focus and expose named primary actions", async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    await page.goto("/")
    const newProject = page.getByRole("button", { name: "New Project", exact: true }).first()
    await newProject.focus()
    await page.keyboard.press("Enter")
    const builder = page.getByRole("dialog", { name: "Pack Spec Builder" })
    await expect(builder).toBeVisible()
    await expect(builder.getByRole("tab", { name: "Details" })).toBeVisible()
    await expect(builder.getByTestId("pack-spec-project-name")).toBeFocused()
    await builder.getByRole("button", { name: "Close Pack Spec Builder" }).focus()
    await page.keyboard.press("Shift+Tab")
    await expect.poll(() => builder.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    await page.keyboard.press("Escape")
    const discard = builder.getByRole("alertdialog", { name: "Discard your builder changes?" })
    if (await discard.count()) {
      await discard.getByRole("button", { name: "Discard Changes" }).click()
    }
    await expect(builder).toBeHidden()
    await expect(newProject).toBeFocused()

    await createManualProjectFromDashboard(page, {
      name: uniqueProjectName("Accessible Export", testInfo.workerIndex),
      packLabel: "K Seal Pouch",
      widthMm: 190,
      heightMm: 300,
      eyemarkCount: 1,
    })
    let scenarioIndex = 0
    for (const theme of ["dark", "light"] as const) {
      if (await page.locator("html").getAttribute("data-klyro-theme") !== theme) {
        await page.getByRole("button", { name: `Switch to ${theme} theme` }).click()
      }
      await expect(page.locator("html")).toHaveAttribute("data-klyro-theme", theme)

      for (const viewport of desktopViewports) {
        await page.setViewportSize(viewport)
        await openExportMenu(page)
        const exportTrigger = page.getByRole("button", { name: "Export selected", exact: true })
        await exportTrigger.focus()
        await expect(exportTrigger).toBeFocused()
        await page.keyboard.press("Enter")

        const review = page.getByRole("dialog")
        await expect(review).toBeVisible()
        await expect(exportTrigger).toBeDisabled()
        await expect.poll(() => review.evaluate(node => node.contains(document.activeElement))).toBe(true)
        await expect(review.getByRole("heading")).toBeVisible()
        await expect(review.getByText(/0 Critical/)).toBeVisible()
        await expect(review.getByRole("button", { name: "Export Cutter" })).toBeEnabled()

        if (scenarioIndex % 2 === 0) {
          await page.keyboard.press("Escape")
        } else {
          await review.getByRole("button", { name: "Close pre-export review" }).click()
        }
        await expect(review).toBeHidden()

        const stableExportTrigger = page.getByRole("button", { name: "Refresh checks", exact: true })
        await expect(stableExportTrigger).toBeVisible()
        await expect(stableExportTrigger).toBeEnabled()
        await expect(stableExportTrigger).toBeFocused()
        await expect.poll(() => stableExportTrigger.evaluate((node) => {
          const button = node as HTMLButtonElement
          return {
            connected: button.isConnected,
            disabled: button.disabled,
            focusable: button.tabIndex >= 0,
            hidden: button.closest("[hidden], [aria-hidden='true']") !== null,
            inert: button.closest("[inert]") !== null,
            visible: button.getClientRects().length > 0,
            outlineStyle: getComputedStyle(button).outlineStyle,
          }
        })).toEqual({
          connected: true,
          disabled: false,
          focusable: true,
          hidden: false,
          inert: false,
          visible: true,
          outlineStyle: "solid",
        })

        await page.keyboard.press("Enter")
        await expect(exportTrigger).toBeVisible()
        await exportTrigger.focus()
        await page.keyboard.press("Enter")
        await expect(review).toBeVisible()
        if (scenarioIndex % 2 === 0) {
          await review.getByRole("button", { name: "Close pre-export review" }).click()
        } else {
          await page.keyboard.press("Escape")
        }
        await expect(review).toBeHidden()
        await expect(stableExportTrigger).toBeFocused()
        scenarioIndex += 1
      }
    }
    expect(scenarioIndex).toBe(6)
  })

  test("essential Klyro surfaces remain readable in light and dark themes", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("html")).toHaveAttribute("data-klyro-theme", "dark")
    const darkHero = page.getByRole("heading", { name: "Packaging workflows, made clearer." })
    await expect(darkHero).toBeVisible()
    const darkColour = await darkHero.evaluate((node) => getComputedStyle(node).color)
    expect(darkColour).not.toBe("rgba(0, 0, 0, 0)")

    await page.getByRole("button", { name: "Switch to light theme" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-klyro-theme", "light")
    await page.getByRole("link", { name: "Artwork Studio", exact: true }).click()
    await expect(page.getByRole("heading", { name: /From cutter guide/ })).toBeVisible()
    const suggestions = await generateSuggestions(page, BETA_PROMPTS.multipleSuggestions.prompt)
    const lightSurface = await suggestions.evaluate((node) => ({
      color: getComputedStyle(node).color,
      background: getComputedStyle(node).backgroundColor,
    }))
    expect(lightSurface.color).not.toBe(lightSurface.background)
    await suggestions.getByRole("button", { name: "Close Suggested Pack Types" }).click()
    await page.getByRole("button", { name: "Switch to dark theme" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-klyro-theme", "dark")
  })
})
