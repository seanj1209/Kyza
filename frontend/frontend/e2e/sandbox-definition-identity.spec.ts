import { expect, test } from '@playwright/test'

test('Sandbox loaded definition keeps its ID when edited and saved again', async ({ page }) => {
  await page.goto('/cutter')
  const source = await page.evaluate(async () => {
    const { getSandboxPreset, saveCustomProject } = await import('/apps/web/src/sandbox/index.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const preset = getSandboxPreset('flowwrap-sealed-basic')!
    const definition = { ...preset.definition, id: 'trial-cutter', label: 'Trial cutter', basePackId: preset.packId }
    return saveCustomProject({ name: definition.label, definition, baseSpec: getPackModule(preset.packId)!.getDefaults() })
  })

  const initial = await page.evaluate(() => JSON.parse(localStorage.getItem('cutnflow.customProjects.v1') || '[]'))
  expect(initial).toHaveLength(1)
  expect(initial[0].definition.id).toBe(initial[0].id)

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Import Cutter/ }).click()
  await (await chooser).setFiles({ name: 'trial-cutter.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(source)) })
  await expect(page.locator('.custom-project-builder')).toBeVisible()
  await page.getByLabel('Project Name').fill('Trial cutter revised')
  page.once('dialog', dialog => dialog.accept('Trial cutter revised'))
  await page.getByRole('button', { name: 'Save Custom Project', exact: true }).click()

  const revised = await page.evaluate(() => JSON.parse(localStorage.getItem('cutnflow.customProjects.v1') || '[]'))
  expect(revised).toHaveLength(1)
  expect(revised[0].id).toBe(initial[0].id)
  expect(revised[0].definition.id).toBe(initial[0].id)
  expect(revised[0].name).toBe('Trial cutter revised')
})
