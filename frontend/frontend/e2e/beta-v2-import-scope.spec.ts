import { test, expect } from './helpers/testState'

test('Beta Import Cutter refuses an excluded pack without opening it', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  const json = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    return JSON.stringify({
      schemaVersion: 'kyza-json-export-1',
      project: { name: 'Blocked lid' },
      cutterSpecification: { packTypeId: 'lidding', starterSpecification: getPackModule('plain-film')!.getDefaults() }
    })
  })
  const picker = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Import Cutter/ }).click()
  await (await picker).setFiles({ name: 'blocked.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  await expect(page.getByRole('alert')).toContainText('not included in the current Kyza beta')
  await expect(page.locator('#preview-canvas > svg')).toHaveCount(0)
})
