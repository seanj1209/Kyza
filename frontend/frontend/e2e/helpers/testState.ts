import { expect, test as base, type Page, type TestInfo } from "@playwright/test"

export const CANONICAL_PROJECT_STORAGE_KEY = "kyza.projects.v1"
export const SAVED_PROJECT_CARD_STORAGE_KEY = "cutter_saved_projects_v1"

type DiagnosticFixtures = {
  captureDiagnostics: void
}

export const test = base.extend<DiagnosticFixtures>({
  captureDiagnostics: [async ({ page }, use, testInfo) => {
    const applicationErrors: string[] = []
    const requestFailures: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") applicationErrors.push(`console: ${message.text()}`)
    })
    page.on("pageerror", (error) => applicationErrors.push(`pageerror: ${error.message}`))
    page.on("requestfailed", (request) => {
      requestFailures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`)
    })
    await page.addInitScript(() => {
      // Playwright cannot automate the browser-native save picker. Removing the
      // optional API exercises the application's real anchor-download fallback.
      delete (window as typeof window & { showSaveFilePicker?: unknown }).showSaveFilePicker
      const marker = "kyza.e2e.context.initialised"
      if (window.sessionStorage.getItem(marker) !== "true") {
        window.localStorage.clear()
        window.sessionStorage.clear()
        window.sessionStorage.setItem(marker, "true")
      }
    })

    await use()

    if (applicationErrors.length || requestFailures.length) {
      await testInfo.attach("browser-diagnostics", {
        body: [
          "Application errors:",
          ...(applicationErrors.length ? applicationErrors : ["None"]),
          "",
          "Network failures:",
          ...(requestFailures.length ? requestFailures : ["None"]),
        ].join("\n"),
        contentType: "text/plain",
      })
    }
    expect(applicationErrors, "Unexpected browser console or application exceptions").toEqual([])
  }, { auto: true }],
})

export { expect }

export type StoredProject = {
  id: string
  name: string
  revision: number
  metadata?: {
    customerOrBrand?: string
    jobReference?: string
  }
  cutter?: {
    packType?: string
    legacySpec?: Record<string, any>
    identityMap?: { elements?: Array<{ id: string; type: string; index?: number }> }
  }
  projectDraft?: Record<string, any>
  latestValidationRun?: Record<string, any>
  validationRuns?: Array<Record<string, any>>
  validationAcknowledgements?: Array<Record<string, any>>
  exportAuditRecords?: Array<Record<string, any>>
}

export const readCanonicalProjects = (page: Page) => page.evaluate((storageKey) => {
  const raw = window.localStorage.getItem(storageKey)
  return raw ? JSON.parse(raw) : []
}, CANONICAL_PROJECT_STORAGE_KEY) as Promise<StoredProject[]>

export const readCurrentProject = async (page: Page) => {
  const projectId = new URL(page.url()).searchParams.get("projectId")
  const projects = await readCanonicalProjects(page)
  return projects.find((project) => project.id === projectId)
}

export const openPackGen = async (page: Page) => {
  await page.goto("/cutter?choose=1&studio=start")
  await expect(page.getByLabel("What are you creating?")).toBeVisible()
}

export const generateSuggestions = async (page: Page, prompt: string) => {
  await openPackGen(page)
  await page.getByLabel("What are you creating?").fill(prompt)
  await page.getByRole("button", { name: "Submit prompt" }).click()
  const dialog = page.getByRole("dialog", { name: "Suggested Pack Types" })
  await expect(dialog).toBeVisible()
  return dialog
}

export type ManualProjectOptions = {
  name: string
  packLabel?: string
  widthMm?: number
  heightMm?: number
  substrate?: "clear" | "white" | "paper"
  eyemarkCount?: 0 | 1 | 2
  zipEnabled?: boolean
}

export const createManualProjectFromDashboard = async (
  page: Page,
  options: ManualProjectOptions,
) => {
  await page.goto("/")
  await page.getByRole("button", { name: "New Project", exact: true }).first().click()
  const builder = page.getByRole("dialog", { name: "Start a cutter" })
  await expect(builder).toBeVisible()
  await builder.getByLabel("Project name").fill(options.name)
  await builder.getByLabel("Pack type").selectOption({
    label: options.packLabel ?? "K Seal Pouch",
  })
  await builder.getByRole("spinbutton", { name: /width \(mm\)/i }).fill(String(options.widthMm ?? 190))
  await builder.getByRole("spinbutton", { name: /height \(mm\)/i }).fill(String(options.heightMm ?? 300))
  if (options.substrate) {
    await builder.getByLabel("Substrate").selectOption(options.substrate)
  }
  if (options.eyemarkCount !== undefined) {
    if (options.eyemarkCount === 2) page.once("dialog", prompt => prompt.accept())
    await builder.getByRole("button", { name: String(options.eyemarkCount), exact: true }).click()
  }
  await builder.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL(/\/cutter\?projectId=/)
  await expect(page.locator("#preview-canvas > svg")).toBeVisible()
  return readCurrentProject(page)
}

export const openExportMenu = async (page: Page) => {
  if (!await page.locator(".file-menu-trigger").isVisible()) {
    await page.locator("#studio-bottom-actions").getByRole("button", { name: "Export", exact: true }).click()
  }
  await page.locator(".file-menu-trigger").click()
  await expect(page.getByRole("group", { name: "Choose your outputs" })).toBeVisible()
  await expect(page.locator('input[data-export-format="svg"]')).toBeEnabled()
  await expect(page.getByRole("button", { name: "Export selected", exact: true })).toBeVisible()
}

export const expectExportReview = async (page: Page) => {
  const dialog = page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Close pre-export review", exact: true }) })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Revision \d+ checked/)).toBeVisible()
  return dialog
}

export const attachProjectEvidence = async (testInfo: TestInfo, project: StoredProject | undefined) => {
  await testInfo.attach("project-evidence", {
    body: JSON.stringify(project ?? null, null, 2),
    contentType: "application/json",
  })
}
