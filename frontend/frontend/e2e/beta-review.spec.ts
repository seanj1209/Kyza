import { readFile } from "node:fs/promises"
import { createManualProjectFromDashboard, readCurrentProject, test, expect, CANONICAL_PROJECT_STORAGE_KEY } from "./helpers/testState"

const unpack = (buffer: Buffer) => {
  const files = new Map<string, Buffer>()
  let offset = 0
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const size = buffer.readUInt32LE(offset + 18), nameSize = buffer.readUInt16LE(offset + 26)
    const data = offset + 30 + nameSize
    files.set(buffer.subarray(offset + 30, data).toString('utf8'), buffer.subarray(data, data + size))
    offset = data + size
  }
  return files
}

test('beta critical override exports marked review evidence and preserves failed validation', async ({ page }, testInfo) => {
  const project = await createManualProjectFromDashboard(page, { name: 'Beta critical evidence', eyemarkCount: 1 })
  await page.evaluate(({ id, key }) => {
    const projects = JSON.parse(localStorage.getItem(key)!)
    const target = projects.find((p: any) => p.id === id)
    target.cutter.legacySpec.eyeMarks.width = 1
    target.cutter.legacySpec.eyeMarks.height = 1
    target.revision++
    localStorage.setItem(key, JSON.stringify(projects))
  }, { id: project!.id, key: CANONICAL_PROJECT_STORAGE_KEY })
  await page.reload()
  await expect(page.locator('#preview-canvas > svg')).toBeVisible()
  await page.locator('#studio-bottom-actions').getByRole('button', { name: 'Export', exact: true }).click()
  await page.locator('.file-menu-trigger').click()
  await expect(page.getByRole('button', { name: 'Export selected', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Beta review / override', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Beta review / export override' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Validation remains failed')
  const exportButton = dialog.getByRole('button', { name: 'Export unapproved beta snapshot', exact: true })
  await expect(exportButton).toBeDisabled()
  await dialog.getByLabel('Reviewer name (self-declared)').fill('Beta QA reviewer')
  await dialog.getByLabel('Reason for beta export / critical override').fill('Compare minimum eyemark rule against the intended press profile.')
  await expect(exportButton).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  const downloadPromise = page.waitForEvent('download')
  await exportButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/UNAPPROVED_BETA.zip$/)
  const path = (await download.path())!
  await testInfo.attach('beta-review-debug', { path, contentType: 'application/zip' })
  const files = unpack(await readFile(path))
  expect([...files.keys()].sort()).toEqual(['report.html', 'review.pdf', 'review.svg', 'snapshot.json'])
  const snapshot = JSON.parse(files.get('snapshot.json')!.toString('utf8'))
  expect(snapshot.productionApproved).toBe(false)
  expect(snapshot.decision.criticalOverride).toBe(true)
  expect(snapshot.decision.reviewerIdentityVerified).toBe(false)
  expect(snapshot.validationRun.status).toBe('failed')
  expect(snapshot.validationRun.issues.some((i: any) => i.severity === 'critical')).toBe(true)
  expect(snapshot.project.cutter.legacySpec.eyeMarks.width).toBe(1)
  expect(files.get('review.svg')!.toString('utf8')).toContain('UNAPPROVED BETA REVIEW - NOT FOR PRODUCTION')
  expect(files.get('review.pdf')!.subarray(0, 5).toString()).toBe('%PDF-')
  await expect(dialog.getByRole('status')).toContainText('review decision is recorded')
  const stored = await readCurrentProject(page)
  expect(stored?.latestValidationRun?.status).toBe('failed')
  expect(stored?.exportAuditRecords?.[0]?.betaReview?.reason).toContain('press profile')
  await testInfo.attach('beta-review-bundle', { path, contentType: 'application/zip' })
  await dialog.getByRole('button', { name: 'Close beta review' }).click()
  await expect(page.getByRole('button', { name: 'Beta review / override', exact: true })).toBeFocused()
  await page.reload()
  const reopened = await readCurrentProject(page)
  expect(reopened?.exportAuditRecords?.[0]?.betaReview?.productionApproved).toBe(false)
  await page.goto('/validation')
  await expect(page.locator('.validation-status')).toHaveText('Failed')
  await expect(page.getByRole('complementary', { name: 'Beta review decision' })).toContainText('Beta QA reviewer')
  await expect(page.getByRole('complementary', { name: 'Beta review decision' })).toContainText('Unapproved beta review')
})

test('beta review cancellation records no approval and mobile dialog fits', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Beta cancelled review', eyemarkCount: 1 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('#studio-bottom-actions').getByRole('button', { name: 'Export', exact: true }).click()
  await page.getByRole('button', { name: 'Beta review / override', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Beta review / export override' })
  await expect(dialog).toBeVisible()
  const bounds = (await dialog.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const stored = await readCurrentProject(page)
  expect(stored?.exportAuditRecords ?? []).toHaveLength(0)
})
