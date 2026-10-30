import { readFile } from "node:fs/promises"
import type { Download, Page } from "@playwright/test"
import { uniqueProjectName } from "./fixtures/betaFixtures"
import {
  CANONICAL_PROJECT_STORAGE_KEY,
  attachProjectEvidence,
  createManualProjectFromDashboard,
  expect,
  expectExportReview,
  openExportMenu,
  readCurrentProject,
  test,
} from "./helpers/testState"

const createKSeal = (page: Page, name: string, eyemarkCount: 1 | 2 = 1) =>
  createManualProjectFromDashboard(page, {
    name,
    packLabel: "K Seal Pouch",
    widthMm: 190,
    heightMm: 300,
    substrate: "clear",
    eyemarkCount,
    zipEnabled: true,
  })

const setEyemarkWidth = async (page: Page, width: number) => {
  const closeValidation = page.getByRole("button", { name: "Collapse Kyza", exact: true })
  if (await closeValidation.isVisible()) await closeValidation.click()
  const input = page.getByRole("spinbutton", { name: /^Width/ })
  if (!await input.isVisible()) {
    await page.getByRole("button", { name: "Base", exact: true }).click()
  }
  await input.fill(String(width))
  await input.press("Enter")
  await expect(input).toHaveValue(String(width))
}

const openSvgExportReview = async (page: Page) => {
  await openExportMenu(page)
  await page.getByRole("button", { name: "Export selected", exact: true }).click()
  return expectExportReview(page)
}

const assertSvgDownload = async (page: Page, download: Download, projectId: string) => {
  expect(download.suggestedFilename()).toMatch(/\.svg$/)
  const path = await download.path()
  expect(path).toBeTruthy()
  const source = await readFile(path!, "utf8")
  expect(source.length).toBeGreaterThan(100)
  expect(source).toContain(projectId)
  expect(source).toContain("data-layer-id")
  const parsed = await page.evaluate((markup) => {
    const document = new DOMParser().parseFromString(markup, "image/svg+xml")
    return {
      root: document.documentElement.localName,
      parserErrors: document.querySelectorAll("parsererror").length,
      geometry: document.querySelectorAll("path, rect, line, polygon, polyline").length,
    }
  }, source)
  expect(parsed).toEqual(expect.objectContaining({ root: "svg", parserErrors: 0 }))
  expect(parsed.geometry).toBeGreaterThan(0)
  return source
}

const seedApprovedDualTrimWarning = async (page: Page) => {
  await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) throw new Error("Canonical Project fixture is missing.")
    const projects = JSON.parse(raw)
    const projectId = new URL(window.location.href).searchParams.get("projectId")
    const project = projects.find((candidate: { id?: string }) => candidate.id === projectId)
    if (!project?.cutter?.legacySpec?.eyeMarks || !project.cutter.legacySpec.kSealPouch) {
      throw new Error("Dual-eyemark K-Seal Cutter fixture is missing.")
    }
    // Existing authoritative EYEMARK_TRIM_FIT rule: explicitly use 15 mm
    // trim so 13 mm marks exceed the 12 mm buffer but remain inside the trim.
    project.cutter.legacySpec.kSealPouch.trimEnabled = true
    project.cutter.legacySpec.kSealPouch.trim = 15
    project.cutter.legacySpec.eyeMarks.width = 13
    project.cutter.legacySpec.eyeMarks.width2 = 13
    project.revision += 1
    project.updatedAt = new Date().toISOString()
    window.localStorage.setItem(storageKey, JSON.stringify(projects))
  }, CANONICAL_PROJECT_STORAGE_KEY)
  await page.reload()
  await expect(page.locator('[data-role="eye-mark"]')).toHaveCount(2)
}

test.describe("@beta live validation and export release", () => {
  test("live Critical validation updates and targets the affected eyemark", async ({ page }, testInfo) => {
    const project = await createKSeal(page, uniqueProjectName("Live Validation", testInfo.workerIndex))
    const initialRevision = project!.revision
    await page.locator("#flow-assistant-dock .flow-assistant-status").click()
    await expect(page.locator("#studio-errors-panel")).toContainText("0 critical")

    await setEyemarkWidth(page, 2)
    await page.locator("#flow-assistant-dock .flow-assistant-status").click()
    await expect(page.locator("#studio-errors-panel")).toContainText("Critical validation issue detected")
    await expect(page.locator("#studio-errors-panel")).toContainText("Export blocked")
    const critical = page.locator('[data-validation-severity="error"]')
    await expect(critical).toContainText(/at least 8 × 4 mm/i)
    await critical.getByRole("button", { name: "VIEW" }).click()
    await expect.soft(page.locator('#selection_overlay [data-selection-id="eye-mark:0"]')).toBeVisible()

    await setEyemarkWidth(page, 15)
    await page.locator("#flow-assistant-dock .flow-assistant-status").click()
    await expect(page.locator("#studio-errors-panel")).not.toContainText("Critical validation issue detected")
    page.once("dialog", (prompt) => prompt.accept(project!.name))
    await openExportMenu(page)
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect.poll(async () => (await readCurrentProject(page))?.revision).toBeGreaterThan(initialRevision)
  })

  test("Critical export requires the simple override checkbox and retains exact evidence", async ({ page }, testInfo) => {
    const project = await createKSeal(page, uniqueProjectName("Critical Export", testInfo.workerIndex))
    await setEyemarkWidth(page, 2)
    await openExportMenu(page)

    const override = page.getByRole("checkbox", { name: /Override errors/ })
    const exportSelected = page.getByRole("button", { name: "Export selected" })
    await expect(override).toBeVisible()
    await expect(override).not.toBeChecked()
    await expect(exportSelected).toBeDisabled()
    await override.check()
    await expect(exportSelected).toBeEnabled()
    await exportSelected.click()

    const review = await expectExportReview(page)
    await expect(review).toContainText("Critical errors will be overridden for this export")
    await expect(review).toContainText("Eyemark")
    const downloadPromise = page.waitForEvent("download")
    await review.getByRole("button", { name: "Export with overridden errors" }).click()
    await assertSvgDownload(page, await downloadPromise, project!.id)

    await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.length).toBe(1)
    const evidenced = await readCurrentProject(page)
    const audit = evidenced?.exportAuditRecords?.[0]
    const acknowledgement = evidenced?.validationAcknowledgements?.[0]
    expect(audit?.overriddenCriticalIssueIds).not.toHaveLength(0)
    expect(audit?.snapshot?.validationRun?.id).toBe(audit?.validationRunId)
    expect(audit?.snapshot?.cutterSpec).toEqual(evidenced?.cutter?.legacySpec)
    expect(acknowledgement?.overrideCriticalErrors).toBe(true)
    expect(acknowledgement?.overriddenCriticalIssueIds).toEqual(audit?.overriddenCriticalIssueIds)
    await attachProjectEvidence(testInfo, evidenced)
  })

  test("Advisory-only export needs no acknowledgement and retains release evidence", async ({ page }, testInfo) => {
    const project = await createKSeal(page, uniqueProjectName("Advisory Export", testInfo.workerIndex))
    await setEyemarkWidth(page, 9)
    const review = await openSvgExportReview(page)
    await expect(review).toContainText("Advisories found")
    await expect(review).toContainText(/production minimum/i)
    await expect(review.getByRole("checkbox")).toHaveCount(0)

    const firstDownloadPromise = page.waitForEvent("download")
    await review.getByRole("button", { name: "Export Cutter" }).click()
    const firstDownload = await firstDownloadPromise
    await assertSvgDownload(page, firstDownload, project!.id)
    await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.length).toBe(1)
    const firstEvidence = await readCurrentProject(page)
    expect(firstEvidence?.exportAuditRecords?.[0]?.advisoryIssueIds).not.toHaveLength(0)
    expect(firstEvidence?.exportAuditRecords?.[0]?.validationRunId).toBeTruthy()
    expect(firstEvidence?.validationAcknowledgements ?? []).toHaveLength(0)

    const secondReview = await openSvgExportReview(page)
    const secondDownloadPromise = page.waitForEvent("download")
    await secondReview.getByRole("button", { name: "Export Cutter" }).click()
    await assertSvgDownload(page, await secondDownloadPromise, project!.id)
    await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.length).toBe(2)
    const secondEvidence = await readCurrentProject(page)
    expect(new Set(secondEvidence?.exportAuditRecords?.map(({ id }) => id)).size).toBe(2)
    await attachProjectEvidence(testInfo, secondEvidence)
  })

  test("Warning export requires exact acknowledgement and persists the audit chain", async ({ page }, testInfo) => {
    const project = await createKSeal(page, uniqueProjectName("Warning Export", testInfo.workerIndex), 2)
    await seedApprovedDualTrimWarning(page)
    const review = await openSvgExportReview(page)

    await expect(review).toContainText("Warnings require review")
    await expect(review).toContainText("Dual eyemarks exceed the available trim width")
    await expect(review).toContainText(/Current|Expected/)
    const acknowledgement = review.getByRole("checkbox", {
      name: /I have reviewed all warnings listed for revision/,
    })
    const exportButton = review.getByRole("button", { name: "Export with acknowledged warnings" })
    await expect(acknowledgement).not.toBeChecked()
    await expect(exportButton).toBeDisabled()
    await acknowledgement.check()
    await review.getByLabel("Reason or production note (optional)").fill("E2E reviewed the trim-fit Warning.")

    const downloadPromise = page.waitForEvent("download")
    await exportButton.click()
    await assertSvgDownload(page, await downloadPromise, project!.id)
    await expect.poll(async () => (await readCurrentProject(page))?.exportAuditRecords?.length).toBe(1)

    const evidenced = await readCurrentProject(page)
    const acknowledgementRecord = evidenced?.validationAcknowledgements?.[0]
    const audit = evidenced?.exportAuditRecords?.[0]
    expect(acknowledgementRecord?.acknowledgedIssueIds).not.toHaveLength(0)
    expect(audit?.acknowledgementId).toBe(acknowledgementRecord?.id)
    expect(audit?.acknowledgedWarningIssueIds).toEqual(acknowledgementRecord?.acknowledgedIssueIds)
    expect(audit?.validationRunId).toBe(acknowledgementRecord?.validationRunId)
    expect(audit?.projectRevision).toBe(evidenced?.revision)
    expect(audit?.rulesetVersion).toBe(acknowledgementRecord?.rulesetVersion)
    expect(audit?.exportFormat).toBe("svg")
    await attachProjectEvidence(testInfo, evidenced)
  })

  test("an old run cannot enable export after an authoritative edit", async ({ page }, testInfo) => {
    await createKSeal(page, uniqueProjectName("Stale Validation", testInfo.workerIndex))
    const firstReview = await openSvgExportReview(page)
    const firstRunId = (await readCurrentProject(page))?.latestValidationRun?.id
    const firstRevision = (await readCurrentProject(page))?.revision
    await firstReview.getByRole("button", { name: "Close pre-export review" }).click()

    await setEyemarkWidth(page, 9)
    const secondReview = await openSvgExportReview(page)
    await expect(secondReview).toContainText("Advisories found")
    const current = await readCurrentProject(page)
    expect(current?.revision).toBeGreaterThan(firstRevision!)
    expect(current?.latestValidationRun?.id).not.toBe(firstRunId)
    expect(current?.latestValidationRun?.trigger).toBe("pre_export")
    expect(current?.latestValidationRun?.projectRevision).toBe(current?.revision)
  })

  test("save and reopen preserves the live Validation Run with the canonical Project", async ({ page }, testInfo) => {
    const project = await createKSeal(page, uniqueProjectName("Live Run Persistence", testInfo.workerIndex))
    const elementIds = project?.cutter?.identityMap?.elements?.map(({ id }) => id) ?? []
    await page.getByRole("button", { name: "Base", exact: true }).click()
    await page.getByRole("combobox", { name: "Type" }).selectOption("white")
    await setEyemarkWidth(page, 9)
    await page.locator("#flow-assistant-dock .flow-assistant-status").click()
    await expect(page.locator("#studio-errors-panel")).toContainText(/Advisory|advisory/)

    page.once("dialog", (prompt) => prompt.accept(project!.name))
    await openExportMenu(page)
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await page.goto("/")
    const card = page.getByRole("article").filter({ hasText: project!.name })
    await card.getByRole("link", { name: `Open ${project!.name}` }).click()
    await page.waitForURL(new RegExp(`projectId=${project!.id}`))

    const reopened = await readCurrentProject(page)
    expect.soft(reopened?.id).toBe(project?.id)
    expect.soft(reopened?.cutter?.legacySpec?.substrate).toBe("white")
    expect.soft(reopened?.cutter?.identityMap?.elements?.map(({ id }) => id)).toEqual(elementIds)
    expect.soft(reopened?.latestValidationRun).toBeTruthy()
    expect.soft(reopened?.latestValidationRun?.rulesetVersion).toBeTruthy()
    expect.soft(reopened?.latestValidationRun?.trigger).toBe("live")
    expect.soft(reopened?.latestValidationRun?.projectRevision).toBe(reopened?.revision)
    expect.soft(reopened?.latestValidationRun?.summary.advisoryCount).toBeGreaterThan(0)
    expect.soft(
      reopened?.latestValidationRun?.issues
        .map(({ affectedElementId }) => affectedElementId)
        .filter((id): id is string => Boolean(id))
        .every(id => elementIds.includes(id)),
    ).toBe(true)
  })
})
