import { readFile } from "node:fs/promises"
import { BETA_PROMPTS, uniqueProjectName } from "./fixtures/betaFixtures"
import {
  createManualProjectFromDashboard,
  expect,
  generateSuggestions,
  openExportMenu,
  readCanonicalProjects,
  readCurrentProject,
  test,
} from "./helpers/testState"

test.describe("@beta connected creation workflows", () => {
  test("Pack Gen direct K-Seal route carries the requested specification into Cutter Studio", async ({ page }, testInfo) => {
    const fixture = BETA_PROMPTS.kSeal
    const dialog = await generateSuggestions(page, fixture.prompt)
    const suggestion = dialog.getByRole("article")

    await expect.soft(suggestion.getByRole("heading")).toContainText(fixture.packLabel)
    await expect.soft(suggestion).toContainText(`Dimensions${fixture.widthMm} × ${fixture.heightMm}mm`)
    await expect.soft(suggestion).toContainText(`Eyemarks${fixture.eyemarkCount}`)
    await expect.soft(suggestion).toContainText("Grip seal (zip)")
    await expect.soft(suggestion).toContainText("Clear")

    await dialog.getByRole("button", { name: "Open in Cutter Studio" }).click()
    const projectName = uniqueProjectName("Pack Gen K-Seal", testInfo.workerIndex)
    const projectDetails = page.getByRole("dialog", { name: "Project Details" })
    await projectDetails.getByLabel("Project Name", { exact: true }).fill(projectName)
    await projectDetails.getByLabel("Brand (optional)", { exact: true }).fill("Kyza E2E")
    await projectDetails.getByLabel("Job Reference (optional)", { exact: true }).fill("E2E-KSEAL")
    await projectDetails.getByRole("button", { name: "Create Project and Cutter" }).click()

    await page.waitForURL(/\/cutter\?projectId=/)
    await expect(page.locator("#preview-canvas > svg")).toBeVisible()
    await expect.soft(page.locator('[data-role="eye-mark"]')).toHaveCount(fixture.eyemarkCount)
    await expect.soft(page.locator('[data-role="zipper-strip"]')).toHaveCount(2)
    const projects = await readCanonicalProjects(page)
    expect.soft(projects).toHaveLength(1)
    expect.soft(projects[0]?.name).toBe(projectName)
    expect.soft(projects[0]?.metadata?.customerOrBrand).toBe("Kyza E2E")
    expect.soft(projects[0]?.metadata?.jobReference).toBe("E2E-KSEAL")
    expect.soft(projects[0]?.cutter?.packType).toBe(fixture.packType)
    expect.soft(projects[0]?.projectDraft?.workspace?.fields.finishedWidthMm.value).toBe(fixture.widthMm)
    expect.soft(projects[0]?.projectDraft?.workspace?.fields.finishedHeightMm.value).toBe(fixture.heightMm)
    expect.soft(projects[0]?.projectDraft?.workspace?.fields.eyemarkCount.value).toBe(fixture.eyemarkCount)
    const createdEyemarkIds = projects[0]?.cutter?.identityMap?.elements
      .filter(({ type, status }) => type === "eyemark" && status === "active")
      .map(({ id }) => id) ?? []
    expect.soft(createdEyemarkIds).toHaveLength(fixture.eyemarkCount)
    expect.soft(new Set(createdEyemarkIds).size).toBe(fixture.eyemarkCount)
    expect.soft(projects[0]?.revision).toBeGreaterThan(0)

    await page.locator("#flow-assistant-dock .flow-assistant-status").click()
    await expect(page.locator("#studio-errors-panel")).toContainText(/pass|critical|warning|advisory/i)

    await page.goto("/")
    await page.getByRole("article").filter({ hasText: projectName })
      .getByRole("link", { name: `Open ${projectName}` }).click()
    await page.waitForURL(/\/cutter\?projectId=/)
    await expect(page.locator('[data-role="eye-mark"]')).toHaveCount(fixture.eyemarkCount)
    const reopened = await readCurrentProject(page)
    expect.soft(reopened?.projectDraft?.workspace?.fields.finishedWidthMm.value).toBe(fixture.widthMm)
    expect.soft(reopened?.projectDraft?.workspace?.fields.finishedHeightMm.value).toBe(fixture.heightMm)
    expect.soft(reopened?.projectDraft?.workspace?.fields.eyemarkCount.value).toBe(fixture.eyemarkCount)
    expect.soft(
      reopened?.cutter?.identityMap?.elements
        .filter(({ type, status }) => type === "eyemark" && status === "active")
        .map(({ id }) => id),
    ).toEqual(createdEyemarkIds)
  })

  test("K-Seal Cutter controls label finished dimensions consistently", async ({ page }, testInfo) => {
    const fixture = BETA_PROMPTS.kSeal
    const dialog = await generateSuggestions(page, fixture.prompt)
    await expect.soft(dialog.getByRole("article")).toContainText(
      `${fixture.widthMm} × ${fixture.heightMm}mm`,
    )
    await dialog.getByRole("button", { name: "Open in Cutter Studio" }).click()
    const projectDetails = page.getByRole("dialog", { name: "Project Details" })
    await projectDetails.getByLabel("Project Name").fill(uniqueProjectName("K-Seal labels", testInfo.workerIndex))
    await projectDetails.getByRole("button", { name: "Create Project and Cutter" }).click()
    await page.waitForURL(/\/cutter\?projectId=/)

    await page.getByRole("button", { name: "Base", exact: true }).click()
    await expect.soft(page.getByRole("spinbutton", { name: "Pouch Width" })).toHaveValue(String(fixture.widthMm))
    await expect.soft(page.getByRole("spinbutton", { name: "Pouch Height" })).toHaveValue(String(fixture.heightMm))

    const project = await readCurrentProject(page)
    const fields = project?.projectDraft?.workspace?.fields
    expect.soft(fields?.finishedWidthMm?.value).toBe(fixture.widthMm)
    expect.soft(fields?.finishedHeightMm?.value).toBe(fixture.heightMm)
    const kSeal = project?.cutter?.legacySpec?.kSealPouch
    expect.soft(kSeal?.pouchHeight).toBe(fixture.heightMm)
    expect.soft(kSeal?.pouchWidth).toBe(fixture.widthMm)

    const trimWidth = kSeal?.trimEnabled === false ? 0 : kSeal?.trim ?? 0
    const gussetSize = kSeal?.gussetSize ?? kSeal?.gussetDepth ?? 0
    const expectedFlatWidth = fixture.heightMm * 2 + gussetSize * 2 + trimWidth * 2
    const cutterBounds = page.locator('svg [data-layer-id="seal-areas"]')
    await expect.soft(cutterBounds).toHaveAttribute("data-cutter-width", String(expectedFlatWidth))
    await expect.soft(cutterBounds).toHaveAttribute("data-cutter-height", String(fixture.widthMm))
    await expect.soft(page.locator('svg [data-layer-id="measurement-guides"]')).toContainText(`${expectedFlatWidth}mm`)
    await expect.soft(page.locator('svg [data-layer-id="measurement-guides"]')).toContainText(`${fixture.widthMm}mm`)
  })

  test("KYZA-E2E-002 Builder keeps K-Seal dimensions and trim separate through Cutter handoff", async ({ page }, testInfo) => {
    const fixture = BETA_PROMPTS.kSeal
    const suggestions = await generateSuggestions(
      page,
      "Create a K-Seal pouch with a finished width of 190 mm, finished height of 300 mm, 10 mm trim, 40 mm gusset and two eyemarks.",
    )
    await expect(suggestions.getByRole("article")).toContainText("Dimensions190 × 300mm")
    await suggestions.getByRole("button", { name: "Build Specification" }).click()
    const builder = page.getByRole("dialog", { name: "Pack Spec Builder" })
    const projectName = uniqueProjectName("K-Seal dimension contract", testInfo.workerIndex)
    await builder.getByTestId("pack-spec-project-name")
      .fill(projectName)

    await builder.getByRole("tab", { name: "Size" }).click()
    await expect(builder.getByRole("spinbutton", { name: "Pouch Width (mm)" })).toHaveValue("190")
    await expect(builder.getByRole("spinbutton", { name: "Pouch Height (mm)" })).toHaveValue("300")
    await expect(builder.getByTestId("pack-spec-finishedWidthMm")).toHaveValue("190")
    await expect(builder.getByTestId("pack-spec-finishedHeightMm")).toHaveValue("300")
    await expect(builder.getByTestId("pack-spec-gussetMm")).toHaveValue("40")
    await expect(builder.getByLabel("Current specification summary")).toContainText("190 × 300mm")
    await expect(builder.getByLabel("Current specification summary")).toContainText("Gusset40mm")

    await builder.getByRole("tab", { name: "Pack Setup" }).click()
    await expect(builder.getByTestId("pack-spec-eyemarkCount")
      .getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-pressed", "true")
    await builder.getByTestId("pack-spec-advanced-settings").check()
    await expect(builder.getByTestId("pack-spec-trimMm")).toHaveValue("10")
    await expect(builder.getByLabel("Current specification summary")).toContainText("190 × 300mm")
    await builder.getByRole("button", { name: "Open in Cutter Studio" }).click()
    await page.waitForURL(/\/cutter\?projectId=/)

    const created = await readCurrentProject(page)
    const fields = created?.projectDraft?.workspace?.fields
    expect(fields?.finishedWidthMm.value).toBe(190)
    expect(fields?.finishedHeightMm.value).toBe(300)
    expect(fields?.trimMm.value).toBe(10)
    expect(fields?.gussetMm.value).toBe(40)
    expect(fields?.eyemarkCount.value).toBe(2)
    expect(created?.cutter?.legacySpec.kSealPouch?.pouchHeight).toBe(300)
    expect(created?.cutter?.legacySpec.kSealPouch?.pouchWidth).toBe(190)
    expect(created?.cutter?.legacySpec.kSealPouch?.trim).toBe(10)
    expect(created?.cutter?.legacySpec.kSealPouch?.gussetSize).toBe(40)

    const cutterBounds = page.locator('svg [data-layer-id="seal-areas"]')
    await expect(cutterBounds).toHaveAttribute("data-cutter-width", "700")
    await expect(cutterBounds).toHaveAttribute("data-cutter-height", "190")
    await expect(page.locator('svg [data-layer-id="measurement-guides"]')).toContainText("700mm")
    await expect(page.locator('svg [data-layer-id="measurement-guides"]')).toContainText("190mm")

    await openExportMenu(page)
    await page.getByRole("button", { name: "Export selected", exact: true }).click()
    const exportReview = page.getByRole("dialog", { name: /E2E|Cutter export/ })
    const acknowledgement = exportReview.getByRole("checkbox", {
      name: /I have reviewed all warnings listed for revision/,
    })
    if (await acknowledgement.count()) await acknowledgement.check()
    const downloadPromise = page.waitForEvent("download")
    await exportReview.getByRole("button", {
      name: /Export Cutter|Export with acknowledged warnings/,
    }).click()
    const exportedPath = await (await downloadPromise).path()
    expect(exportedPath).toBeTruthy()
    const exportedSvg = await readFile(exportedPath!, "utf8")
    expect(exportedSvg).toContain('data-cutter-width="700"')
    expect(exportedSvg).toContain('data-cutter-height="190"')
    expect(exportedSvg).toContain("700mm")
    expect(exportedSvg).toContain("190mm")

    await page.goto("/")
    await page.getByRole("article").filter({ hasText: projectName })
      .getByRole("link", { name: `Open ${projectName}` }).click()
    await page.waitForURL(/\/cutter\?projectId=/)
    const reopened = await readCurrentProject(page)
    expect(reopened?.projectDraft?.workspace?.fields.finishedWidthMm.value).toBe(190)
    expect(reopened?.projectDraft?.workspace?.fields.finishedHeightMm.value).toBe(300)
    expect(reopened?.projectDraft?.workspace?.fields.trimMm.value).toBe(10)
    expect(reopened?.cutter?.legacySpec.kSealPouch?.pouchHeight).toBe(300)
    expect(reopened?.cutter?.legacySpec.kSealPouch?.pouchWidth).toBe(190)
    expect(reopened?.cutter?.legacySpec.kSealPouch?.trim).toBe(10)
  })

  test("DOY uses finished pouch size and Sachet retains cutter size labels", async ({ page }, testInfo) => {
    for (const fixture of [
      { packLabel: "DOY Pouch", widthMm: 175, heightMm: 260 },
      { packLabel: "3-Side Seal Sachet", widthMm: 70, heightMm: 100 },
    ]) {
      await createManualProjectFromDashboard(page, {
        name: uniqueProjectName(`${fixture.packLabel} labels`, testInfo.workerIndex),
        ...fixture,
      })
      await page.getByRole("button", { name: "Base", exact: true }).click()
      const widthInput = page.locator('input[data-cutter-field="width"]')
      const heightInput = page.locator('input[data-cutter-field="height"]')
      await expect.soft(widthInput).toHaveValue(String(fixture.widthMm))
      await expect.soft(heightInput).toHaveValue(String(fixture.heightMm))
      const isDoy = fixture.packLabel === "DOY Pouch"
      await expect.soft(widthInput.locator("xpath=..").locator("span").first()).toHaveText(isDoy ? "Pouch Width" : "Width")
      await expect.soft(heightInput.locator("xpath=..").locator("span").first()).toHaveText(isDoy ? "Pouch Height" : "Height")
      await expect.soft(page.getByRole("spinbutton", { name: "Pouch Width" })).toHaveCount(isDoy ? 1 : 0)
      await expect.soft(page.getByRole("spinbutton", { name: "Pouch Height" })).toHaveCount(isDoy ? 1 : 0)
    }
  })

  test("suggestion carousel keeps one active recommendation and session state", async ({ page }) => {
    const dialog = await generateSuggestions(page, BETA_PROMPTS.multipleSuggestions.prompt)
    const position = dialog.getByRole("status", { name: /Suggestion \d+ of \d+/ })
    await expect(position).toContainText(/^1 of [2-9]/)
    await expect(dialog.getByRole("article")).toHaveCount(1)
    const firstTitle = await dialog.getByRole("article").getByRole("heading").innerText()

    const suggestionContent = dialog.locator(".pack-gen-suggestion-content")
    await expect.poll(() => suggestionContent.evaluate((node) => ({
      overflowY: getComputedStyle(node).overflowY,
      fits: node.scrollHeight <= node.clientHeight + 1,
    }))).toEqual({ overflowY: "hidden", fits: true })

    await dialog.getByRole("button", { name: "Next suggestion" }).click()
    await expect(position).toContainText(/^2 of /)
    const secondTitle = await dialog.getByRole("article").getByRole("heading").innerText()
    expect(secondTitle).not.toBe(firstTitle)

    await dialog.getByRole("button", { name: "Kyza Score" }).click()
    await expect(dialog.getByRole("heading", { name: "Kyza Score" })).toBeVisible()
    await expect(dialog).toContainText(secondTitle)
    await dialog.getByRole("button", { name: /Back to Suggestions/ }).click()
    await expect(dialog.getByRole("article").getByRole("heading")).toHaveText(secondTitle)

    await dialog.getByRole("button", { name: "Previous suggestion" }).click()
    await expect(dialog.getByRole("article").getByRole("heading")).toHaveText(firstTitle)
    await dialog.getByRole("button", { name: "Close Suggested Pack Types" }).click()
    await expect(dialog).toBeHidden()
    await page.getByRole("button", { name: "View Suggestions" }).click()
    await expect(dialog.getByRole("article").getByRole("heading")).toHaveText(firstTitle)
  })

  test("Build Specification receives and preserves the active K-Seal recommendation", async ({ page }, testInfo) => {
    const fixture = BETA_PROMPTS.kSeal
    const suggestions = await generateSuggestions(page, fixture.prompt)
    await suggestions.getByRole("button", { name: "Build Specification" }).click()
    const builder = page.getByRole("dialog", { name: "Pack Spec Builder" })

    await expect.soft(builder.getByTestId("pack-spec-packType")).toHaveValue(fixture.packType)
    const projectName = uniqueProjectName("Builder K-Seal", testInfo.workerIndex)
    await builder.getByTestId("pack-spec-project-name").fill(projectName)
    await builder.getByRole("tab", { name: "Size" }).click()
    await expect.soft(builder.getByTestId("pack-spec-finishedWidthMm")).toHaveValue(String(fixture.widthMm))
    await expect.soft(builder.getByTestId("pack-spec-finishedHeightMm")).toHaveValue(String(fixture.heightMm))
    await expect.soft(builder.getByLabel("Current specification summary"))
      .toContainText(`${fixture.widthMm} × ${fixture.heightMm}mm`)

    await builder.getByRole("tab", { name: "Pack Setup" }).click()
    const substrate = builder.getByTestId("pack-spec-materialNotes")
    await expect.soft(substrate).toHaveCount(1)
    if (await substrate.count()) {
      await expect.soft(substrate).toHaveValue(fixture.substrate)
      await substrate.selectOption("white")
    }
    const eyemarks = builder.getByTestId("pack-spec-eyemarkCount")
    await expect.soft(eyemarks).toHaveCount(1)
    if (await eyemarks.count()) {
      await expect.soft(eyemarks.getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-pressed", "true")
    }
    const zip = builder.getByTestId("pack-spec-zipEnabled")
    await expect.soft(zip).toHaveCount(1)
    if (await zip.count()) {
      await expect.soft(zip.getByRole("button", { name: "On", exact: true })).toHaveAttribute("aria-pressed", "true")
    }

    await builder.getByTestId("pack-spec-advanced-settings").check()
    await expect.soft(builder.getByTestId("pack-spec-trimMm"), "Builder must expose the supported trim adjustment used by dual-eyemark sizing.").toHaveCount(1)
    await expect.soft(builder.getByTestId("pack-spec-trimMm")).toHaveValue("10")
    await builder.getByTestId("pack-spec-trimMm").fill("12")
    await builder.getByTestId("pack-spec-advanced-settings").uncheck()
    await expect.soft(substrate).toHaveValue("white")
    await builder.getByTestId("pack-spec-advanced-settings").check()
    await expect.soft(builder.getByTestId("pack-spec-trimMm")).toHaveValue("12")
    await expect.soft(builder.getByRole("button", { name: "Open in Cutter Studio" })).toBeEnabled()
    await builder.getByRole("button", { name: "Open in Cutter Studio" }).click()
    await page.waitForURL(/\/cutter\?projectId=/)

    const created = await readCurrentProject(page)
    expect.soft(created?.projectDraft?.workspace?.fields.packType.value).toBe(fixture.packType)
    expect.soft(created?.projectDraft?.workspace?.fields.finishedWidthMm.value).toBe(fixture.widthMm)
    expect.soft(created?.projectDraft?.workspace?.fields.finishedHeightMm.value).toBe(fixture.heightMm)
    expect.soft(created?.projectDraft?.workspace?.fields.eyemarkCount.value).toBe(2)
    expect.soft(created?.projectDraft?.workspace?.fields.trimMm.value).toBe(12)
    expect.soft(created?.projectDraft?.workspace?.fields.materialNotes.value).toBe("white")
    expect.soft(created?.cutter?.legacySpec.kSealPouch?.trim).toBe(12)
    expect.soft(created?.cutter?.legacySpec.eyeMarks?.count).toBe(2)

    await page.goto("/")
    await page.getByRole("article").filter({ hasText: projectName })
      .getByRole("link", { name: `Open ${projectName}` }).click()
    await page.waitForURL(/\/cutter\?projectId=/)
    const reopened = await readCurrentProject(page)
    expect.soft(reopened?.projectDraft?.workspace?.fields.finishedWidthMm.value).toBe(fixture.widthMm)
    expect.soft(reopened?.projectDraft?.workspace?.fields.finishedHeightMm.value).toBe(fixture.heightMm)
    expect.soft(reopened?.projectDraft?.workspace?.fields.eyemarkCount.value).toBe(2)
    expect.soft(reopened?.projectDraft?.workspace?.fields.trimMm.value).toBe(12)
    expect.soft(reopened?.projectDraft?.workspace?.fields.materialNotes.value).toBe("white")
    expect.soft(reopened?.cutter?.legacySpec.kSealPouch?.trim).toBe(12)
    expect.soft(reopened?.cutter?.legacySpec.eyeMarks?.count).toBe(2)
  })

  test("Dashboard New Project uses the shared Builder and reopens the canonical Project", async ({ page }, testInfo) => {
    const name = uniqueProjectName("Dashboard", testInfo.workerIndex)
    const created = await createManualProjectFromDashboard(page, {
      name,
      packLabel: "K Seal Pouch",
      widthMm: 190,
      heightMm: 300,
      substrate: "clear",
      eyemarkCount: 1,
      zipEnabled: true,
    })
    expect(created?.id).toBeTruthy()
    expect(created?.cutter?.packType).toBe("k-seal-pouch")
    const projectId = created!.id
    const originalElementIds = created?.cutter?.identityMap?.elements?.map(({ id }) => id) ?? []

    await page.getByRole("button", { name: "Base", exact: true }).click()
    await page.getByRole("combobox", { name: "Type" }).selectOption("white")
    await page.getByRole("spinbutton", { name: "Pouch Width" }).fill("310")
    await page.getByRole("spinbutton", { name: "Pouch Width" }).press("Enter")
    await page.locator("#flow-assistant-dock .flow-assistant-status").click()
    await expect(page.locator("#studio-errors-panel")).toContainText(/critical|warning|advisory|pass/i)

    page.once("dialog", (prompt) => prompt.accept(name))
    await openExportMenu(page)
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect.poll(async () => (await readCurrentProject(page))?.cutter?.legacySpec?.substrate).toBe("white")
    const saved = await readCurrentProject(page)
    expect(saved?.revision).toBeGreaterThan(created!.revision)

    await page.goto("/")
    const card = page.getByRole("article").filter({ hasText: name })
    await expect(card).toBeVisible()
    await card.getByRole("link", { name: `Open ${name}` }).click()
    await page.waitForURL(new RegExp(`projectId=${projectId}`))
    await page.getByRole("button", { name: "Base", exact: true }).click()
    await expect(page.getByRole("combobox", { name: "Type" })).toHaveValue("white")
    await expect(page.getByRole("spinbutton", { name: "Pouch Width" })).toHaveValue("310")
    const reopened = await readCurrentProject(page)
    expect(reopened?.id).toBe(projectId)
    expect(reopened?.cutter?.identityMap?.elements?.map(({ id }) => id)).toEqual(originalElementIds)
  })

  test("deterministic Sachet and Flow-wrap prompts retain their expected pack mapping", async ({ page }) => {
    const sachet = await generateSuggestions(page, BETA_PROMPTS.sachet.prompt)
    await expect(sachet.getByRole("article").getByRole("heading")).toContainText(BETA_PROMPTS.sachet.packLabel)
    await expect(sachet.getByRole("article")).toContainText(`${BETA_PROMPTS.sachet.widthMm} × ${BETA_PROMPTS.sachet.heightMm}mm`)

    await page.getByRole("button", { name: "Close Suggested Pack Types" }).click()
    const flowwrap = await generateSuggestions(page, BETA_PROMPTS.flowwrap.prompt)
    await expect(flowwrap.getByRole("article").getByRole("heading")).toContainText(BETA_PROMPTS.flowwrap.packLabel)
    await expect(flowwrap.getByRole("article")).toContainText(`${BETA_PROMPTS.flowwrap.widthMm} × ${BETA_PROMPTS.flowwrap.heightMm}mm`)
  })
})
