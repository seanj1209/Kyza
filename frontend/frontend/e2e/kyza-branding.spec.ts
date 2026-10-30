import { expect, test } from "@playwright/test"

const routes = ["/", "/app", "/cutter?studio=start", "/artwork", "/validation", "/account"]
for (const theme of ["light", "dark"] as const) {
  for (const route of routes) {
    test(`Kyza identity: ${theme} ${route}`, async ({ page }, testInfo) => {
      const errors: string[] = []
      page.on("pageerror", error => errors.push(error.message))
      await page.addInitScript(value => localStorage.setItem("kyza.theme", value), theme)
      await page.goto(route)
      await expect(page).toHaveTitle(/Kyza/)
      await expect(page.locator("html")).toHaveAttribute("data-kyza-theme", theme)
      const brand = page.getByRole("link", { name: "Kyza dashboard", exact: true }).first()
      await expect(brand).toBeVisible()
      await expect(brand.locator(`.kyza-brand-asset--${theme}`)).toBeVisible()
      await expect(brand.locator(`.kyza-brand-asset--${theme} image`)).toHaveAttribute("href", `/branding/kyza-horizontal-${theme}.png`)
      await expect(brand.locator("path")).toHaveCount(0)
      await expect(page.locator("body")).not.toContainText(/Klyro|Cut\s*['’&-]?\s*[nN]?\s*Flow|CnF Tech/i)
      expect(errors).toEqual([])
      if (route === "/" || route.startsWith("/cutter")) {
        await page.screenshot({ path: testInfo.outputPath(`kyza-${route === "/" ? "dashboard" : "cutter"}-${theme}.png`), fullPage: true })
      }
    })
  }
}

test("Historical browser projects and theme survive the Kyza rebrand", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(async () => {
    const { createKyzaProjectV1 } = await import("/packages/cutter-engine/project/index.ts")
    const project = createKyzaProjectV1({ id: "legacy-project-42", name: "Beta continuity", revision: 4 })
    localStorage.clear()
    localStorage.setItem("cutnflow.projects.v1", JSON.stringify([project]))
    localStorage.setItem("klyro.theme", "light")
  })
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-kyza-theme", "light")
  await expect(page.getByRole("article").filter({ hasText: "Beta continuity" })).toBeVisible()
  const data = await page.evaluate(() => ({ old: localStorage.getItem("cutnflow.projects.v1"), current: localStorage.getItem("kyza.projects.v1") }))
  expect(data.current).toBe(data.old)
  expect(JSON.parse(data.current!)[0]).toMatchObject({ id: "legacy-project-42", revision: 4 })
})

test("Approved assets load, and the mobile wordmark fits the header", async ({ page }, testInfo) => {
  for (const asset of ["/branding/kyza-symbol.png", "/branding/kyza-wordmark.png", "/favicon.svg"]) {
    const response = await page.request.get(asset)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toMatch(/image/)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const brand = page.getByRole("link", { name: "Kyza dashboard", exact: true })
  await expect(brand).toBeVisible()
  const box = await brand.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath("kyza-mobile.png"), fullPage: true })
})
