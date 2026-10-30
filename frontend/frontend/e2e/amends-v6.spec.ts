import { createManualProjectFromDashboard, expect, readCanonicalProjects, test } from './helpers/testState'

const navigationOrder = ['Dashboard', 'Cutter Studio', 'Artwork Studio', 'Validation Centre', 'Export Release', 'Accounts & Preferences']

test('v6 landing entry, inline suggestions and legacy route recovery', async ({ page }) => {
  await page.goto('/cutter')
  await expect(page.locator('.start-entry-action:visible strong')).toHaveText(['Sandbox Mode', 'Import Cutter', 'Help Me Choose'])
  await expect(page.getByText('Custom Project · Sandbox')).toHaveCount(0)
  await expect(page.getByText('Kyza updates')).toHaveCount(0)
  expect(await page.locator('nav[aria-label="Primary navigation"] a').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')))).toEqual(navigationOrder)
  await page.getByRole('button', { name: /Sandbox Mode/ }).click()
  await expect(page.locator('.sandbox-entry')).toBeVisible()
  await page.getByRole('button', { name: 'Return to Cutter Studio start page' }).click()
  await page.getByRole('button', { name: /Help Me Choose/ }).click()
  await page.getByLabel('What are you creating?').fill('Create a 250g stand-up pouch with one eyemark.')
  await page.getByRole('button', { name: 'Submit prompt', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Suggested Pack Types' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'View suggestions', exact: true })).toBeFocused()
  await page.goto('/ai-studio.html?projectId=missing-v6&source=legacy#draft')
  await page.waitForURL(/\/cutter\?.*choose=1/)
  expect(new URL(page.url()).searchParams.get('projectId')).toBe('missing-v6')
  expect(new URL(page.url()).searchParams.get('source')).toBe('legacy')
  expect(new URL(page.url()).hash).toBe('#draft')
  await expect(page.getByRole('heading', { name: 'This Project could not be opened' })).toBeVisible()
})

test('v6 custom cutter import uses the existing JSON workflow', async ({ page }) => {
  await page.goto('/cutter')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Import Cutter/ }).click()
  await (await chooser).setFiles({ name: 'invalid-cutter.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(page.locator('.custom-project-builder')).toBeVisible()
  await expect(page.locator('.custom-project-builder-error')).not.toBeEmpty()
  expect(await readCanonicalProjects(page)).toHaveLength(0)
})

test('v6 saved cutter resumes and project action menus sit above their cards', async ({ page }) => {
  const project = await createManualProjectFromDashboard(page, { name: 'V6 menu continuity' })
  await page.goto('/')
  const card = page.locator('.kyza-project-card').filter({ hasText: 'V6 menu continuity' })
  const trigger = card.getByRole('button', { name: /Project actions/ })
  await trigger.click()
  const menu = card.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Delete' })).toBeVisible()
  expect(await menu.getByRole('menuitem', { name: 'Delete' }).evaluate(node => { const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.goto('/cutter?studio=start')
  await expect(page.locator('.start-entry-action:visible strong')).toHaveText(['Resume Work', 'Sandbox Mode', 'Import Cutter', 'Help Me Choose'])
  const recent = page.locator('.start-file-card').filter({ hasText: 'V6 menu continuity' })
  await expect(recent.locator('.start-file-card-glyph svg')).toBeVisible()
  await expect(recent).toContainText(`Version V${project!.revision}`)
  const options = recent.getByRole('button', { name: /Options for/ })
  await options.click()
  const actions = recent.locator('.start-file-card-menu')
  await expect(actions).toBeVisible()
  const menuBounds = (await actions.boundingBox())!, triggerBounds = (await options.boundingBox())!
  expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(triggerBounds.y + 1)
  expect(await actions.getByRole('button', { name: 'Delete', exact: true }).evaluate(node => { const r = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })).toBe(true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /Resume Work/ }).click()
  await expect(page.locator('#preview-canvas > svg')).toBeVisible()
  expect((await readCanonicalProjects(page))[0]?.id).toBe(project!.id)
})

for (const width of [390, 768, 1440]) {
  test(`v6 Artwork and Cutter responsive preview at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['dark', 'light']) {
      await page.goto('/artwork')
      if (await page.locator('html').getAttribute('data-kyza-theme') !== theme) await page.getByRole('button', { name: `Switch to ${theme} theme` }).click()
      await expect(page.getByRole('heading', { name: /From cutter guide/ })).toBeVisible()
      await expect(page.locator('.aw-feature-section')).toHaveCount(8)
      await expect(page.locator('.aw-feature-num')).toHaveText(Array.from({ length: 8 }, (_, i) => `${String(i + 1).padStart(2, '0')} / Planned`))
      await expect(page.getByText(/This is a preview of planned features/)).toBeAttached()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await page.locator('nav[aria-label="Primary navigation"] a').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')))).toEqual(navigationOrder)
      await page.goto('/cutter?choose=1&studio=start')
      await expect(page.getByLabel('What are you creating?')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  })
}



test('v6 legacy saved draft opens its reviewed specification without regenerating', async ({ page }) => {
  await page.goto('/cutter?choose=1&studio=start')
  await page.getByLabel('What are you creating?').fill('Create a 250g stand-up pouch with one eyemark.')
  await page.getByRole('button', { name: 'Submit prompt', exact: true }).click()
  await page.getByRole('dialog', { name: 'Suggested Pack Types' }).getByRole('button', { name: 'Build Specification' }).click()
  const builder = page.getByRole('dialog', { name: 'Pack Spec Builder' })
  await builder.getByTestId('pack-spec-project-name').fill('V6 saved draft')
  await builder.getByRole('tab', { name: 'Size', exact: true }).click()
  await builder.getByTestId('pack-spec-finishedWidthMm').fill('217')
  await builder.getByRole('button', { name: 'Save Draft', exact: true }).click()
  const projects = await readCanonicalProjects(page)
  expect(projects).toHaveLength(1)
  await page.goto('/validation')
  await expect(page.getByRole('heading', { name: 'Validation Centre', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No stored Cutter Projects' })).toBeVisible()
  expect(await readCanonicalProjects(page)).toEqual(projects)
  await page.goto(`/ai-studio?projectId=${projects[0].id}`)
  await page.waitForURL(/cutter\?.*choose=1/)
  await expect(builder).toBeVisible()
  await builder.getByRole('tab', { name: 'Size', exact: true }).click()
  await expect(builder.getByTestId('pack-spec-finishedWidthMm')).toHaveValue('217')
  expect((await readCanonicalProjects(page))[0].id).toBe(projects[0].id)
})

test('v6 valid custom JSON imports and builds through the existing engine', async ({ page }) => {
  await page.goto('/cutter')
  const record = await page.evaluate(async () => {
    const { getSandboxPreset, saveCustomProject } = await import('/apps/web/src/sandbox/index.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const preset = getSandboxPreset('flowwrap-sealed-basic')!
    const definition = { ...preset.definition, id: 'v6-source-custom', label: 'V6 source custom cutter', basePackId: preset.packId }
    return saveCustomProject({ name: definition.label, definition, baseSpec: getPackModule(preset.packId)!.getDefaults() })
  })
  expect(record).toBeTruthy()
  record.id = 'v6-imported-custom'
  record.name = 'V6 imported cutter'
  record.definition.id = record.id
  record.definition.label = record.name
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Import Cutter/ }).click()
  await (await chooser).setFiles({ name: 'custom-cutter.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(record)) })
  await expect(page.locator('.custom-project-builder-note').filter({ hasText: 'Imported custom project: V6 imported cutter' })).toBeVisible()
  await page.getByRole('button', { name: 'Start Custom Project', exact: true }).click()
  await expect(page.locator('#preview-canvas > svg')).toBeVisible()
  await expect(page.locator('.custom-project-builder')).toBeHidden()
  await expect(page.getByRole('button', { name: 'V6 imported cutter', exact: true })).toBeVisible()
})

test('v6 cutter still validates and downloads through selected outputs', async ({ page }) => {
  const project = await createManualProjectFromDashboard(page, { name: 'V6 export continuity', eyemarkCount: 1 })
  await page.locator('#studio-bottom-actions').getByRole('button', { name: 'Export', exact: true }).click()
  await page.locator('.file-menu-trigger').click()
  await expect(page.getByRole('checkbox', { name: /Editable SVG/ })).toBeChecked()
  await page.getByRole('button', { name: 'Export selected', exact: true }).click()
  const review = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Close pre-export review' }) })
  await expect(review).toBeVisible()
  const acknowledge = review.getByRole('checkbox')
  if (await acknowledge.isVisible()) await acknowledge.check()
  const download = page.waitForEvent('download')
  await review.getByRole('button', { name: /Export Cutter|Export with acknowledged warnings/ }).click()
  expect((await download).suggestedFilename()).toMatch(/\.svg$/)
  const saved = (await readCanonicalProjects(page)).find(p => p.id === project!.id)
  expect(saved?.validationRuns?.length).toBeGreaterThan(0)
  expect(saved?.exportAuditRecords?.length).toBeGreaterThan(0)
})



test('Validation Centre opens through navigation with a saved cutter', async ({ page }) => {
  const project = await createManualProjectFromDashboard(page, { name: 'Validation navigation regression', eyemarkCount: 1 })
  await page.locator('nav[aria-label="Primary navigation"]').getByRole('link', { name: 'Validation Centre', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Validation Centre', exact: true })).toBeVisible()
  await expect(page.locator('.validation-project')).toContainText(project!.name)
  await expect(page.locator('.validation-project')).toContainText('Not Run')
  expect((await readCanonicalProjects(page))[0].id).toBe(project!.id)
})
