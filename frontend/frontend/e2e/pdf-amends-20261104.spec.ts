import { test, expect } from '@playwright/test'
import { createManualProjectFromDashboard, openExportMenu, readCurrentProject } from './helpers/testState'

test('2SS and 3SS cutter strokes default to 0.4 mm without changing 4SS', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveBaseCustomisation } = await import('/apps/web/src/renderers/baseLayerCustomisation.ts')
    return ['2-side-seal-pouch', '3-side-seal-pouch', 'sachet-3-side-seal', 'sachet-4-side-seal'].map(id => {
      const pack = getPackModule(id)!
      const spec = pack.getDefaults()
      const node = pack.render(spec).querySelector('[data-layer-id="cutter-outline"] [stroke-width]')
      return { id, preview: Number(node?.getAttribute('stroke-width')), control: resolveBaseCustomisation(spec).cutter.thickness }
    })
  })
  expect(result.map(x => x.preview)).toEqual([0.4, 0.4, 0.4, 0.75])
  expect(result.map(x => x.control)).toEqual([0.4, 0.4, 0.4, 0.75])
})

test('Pillow width change keeps 1:2:1 folds and refits a previously fitted safe zone', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { fitSafeZone, refreshFittedSafeZones } = await import('/packages/cutter-engine/actions/safeZoneFit.ts')
    const { synchronisePillowFoldLines } = await import('/apps/web/src/core/geometry/resolvers/resolvePillowLayout.ts')
    const { projectFromLegacySpec, exportKyzaProjectJson, importKyzaProjectJson } = await import('/packages/cutter-engine/project/index.ts')
    const pack = getPackModule('pillow-pack')!
    const defaults = pack.getDefaults()
    const before = fitSafeZone({ ...defaults, safeZones: [{ id: 'panel', label: 'Panel', x: 20, y: 20, width: 40, height: 40, enabled: true }] }, 'panel')!
    const after = refreshFittedSafeZones(before, synchronisePillowFoldLines({ ...before, width: 400 }))
    const saved = exportKyzaProjectJson(projectFromLegacySpec('pillow-pack', 'Pillow resize', after))
    if (!saved.ok) throw Error(JSON.stringify(saved))
    const loaded = importKyzaProjectJson(saved.value)
    if (!loaded.ok) throw Error(JSON.stringify(loaded))
    const spec = loaded.value.cutter!.legacySpec
    const svg = pack.render(spec)
    const rendered = ['pillow-fold-left', 'pillow-fold-right'].map(id => Number(svg.querySelector(`[data-line-id="${id}"]`)?.getAttribute('x1')))
    return { offsets: spec.foldLines?.map(line => line.offset), zone: spec.safeZones?.[0], rendered, width: spec.width }
  })
  expect(result.width).toBe(400)
  expect(result.offsets).toEqual([92.5, 277.5])
  expect(result.zone?.width).toBeCloseTo(86.5, 3)
  expect(result.rendered[1] - result.rendered[0]).toBeCloseTo(185, 3)
})

test('Pillow Base width control saves the symmetric fold offsets', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Pillow 1-2-1', packLabel: 'Pillow Pack', widthMm: 440, heightMm: 200, eyemarkCount: 1 })
  await page.getByRole('button', { name: 'Base', exact: true }).click()
  const width = page.locator('input[data-cutter-field="width"]')
  await width.fill('400')
  await width.press('Enter')
  await openExportMenu(page)
  page.once('dialog', dialog => dialog.accept('Pillow 1-2-1'))
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect.poll(async () => (await readCurrentProject(page))?.cutter?.legacySpec.width).toBe(400)
  const saved = await readCurrentProject(page)
  expect(saved?.cutter?.legacySpec.foldLines?.map(line => line.offset)).toEqual([92.5, 277.5])
})

test('colour palette stays open across selections and closes on an outside click', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const { initCustomisationPanel } = await import('/apps/web/src/ui/customisationPanel.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const q = window as any
    q.spec = { ...getPackModule('plain-film')!.getDefaults(), attributeBoxes: [{ id: 'bbe', kind: 'bbe', x: 20, y: 20, width: 50, height: 30 }] }
    document.body.replaceChildren()
    const host = document.createElement('div')
    host.style.cssText = 'height:850px;position:relative'
    document.body.append(host)
    q.panel = initCustomisationPanel({ host, onChange: (s:any) => { q.spec=s; q.panel.setSpec(s) }, getCurrentSvg: () => null })
    q.panel.setSpec(q.spec)
    document.querySelector('#customisation-panel')!.classList.add('is-open')
  })
  const button = page.locator('#customisation-panel .customisation-color-button:visible').first()
  await button.click()
  const popup = page.locator('#customisation-panel .customisation-colour-popover:visible').first()
  await expect(popup).toBeVisible()
  await popup.getByRole('button', { name: 'Colour #000000' }).click()
  await expect(popup).toBeVisible()
  await popup.getByRole('button', { name: 'Colour #ffffff' }).click()
  await expect(popup).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(popup).toBeHidden()
  await page.evaluate(() => (window as any).panel.setActiveLayer('notes'))
  await page.getByRole('radiogroup', { name: 'Choose elements appearance' }).getByRole('radio', { name: 'BBE box' }).click()
  const objectButton = page.getByRole('button', { name: 'Fill colour colours' })
  await objectButton.click()
  const objectPopup = page.locator('.customise-selected-object .customisation-colour-popover:visible').first()
  await objectPopup.getByRole('group', { name: 'Default colours' }).getByRole('button', { name: 'Colour #000000' }).click()
  await expect(objectPopup).toBeVisible()
  await objectPopup.getByRole('group', { name: 'Default colours' }).getByRole('button', { name: 'Colour #ffffff' }).click()
  await expect(objectPopup).toBeVisible()
})
