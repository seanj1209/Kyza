import { readFile } from 'node:fs/promises'
import { test, expect, createManualProjectFromDashboard, expectExportReview, openExportMenu, readCurrentProject } from './helpers/testState'

test('Import Cutter opens the file picker and loads a Kyza export directly', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  const json = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    return JSON.stringify({
      schemaVersion: 'kyza-json-export-1',
      project: { name: 'Imported Plain Film' },
      cutterSpecification: { packTypeId: 'plain-film', starterSpecification: getPackModule('plain-film')!.getDefaults() }
    })
  })
  const picker = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Import Cutter/ }).click()
  await expect(page.locator('.custom-project-builder.is-open')).toHaveCount(0)
  await (await picker).setFiles({ name: 'kyza-export.json', mimeType: 'application/json', buffer: Buffer.from(json) })
  await expect(page.locator('#preview-canvas > svg')).toBeVisible()
  await expect(page.locator('.custom-project-builder.is-open')).toHaveCount(0)
  await expect(page.locator('#preview-canvas > svg [data-role="plain-film-substrate"]')).toHaveCount(1)
})

test('a JSON downloaded from Kyza reimports into Cutter Studio', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Roundtrip cutter', packLabel: 'K Seal Pouch', widthMm: 190, heightMm: 300, eyemarkCount: 1 })
  await openExportMenu(page)
  const inputs = page.locator('input[data-export-format]:enabled')
  for (const input of await inputs.all()) await input.uncheck()
  await page.locator('input[data-export-format="json"]').check()
  await page.getByRole('button', { name: 'Export selected', exact: true }).click()
  const review = await expectExportReview(page)
  const acknowledge = review.getByRole('checkbox')
  if (await acknowledge.isVisible()) await acknowledge.check()
  const download = page.waitForEvent('download')
  await review.getByRole('button', { name: /Export Cutter|Export with acknowledged warnings/ }).click()
  const bytes = await readFile((await (await download).path())!)
  expect(JSON.parse(bytes.toString()).schemaVersion).toBe('kyza-json-export-1')
  await page.goto('/cutter?studio=home')
  const picker = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Import Cutter/ }).click()
  await (await picker).setFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: bytes })
  await expect(page.locator('#preview-canvas > svg')).toBeVisible()
  await expect(page.locator('.artboard-tab.is-active')).toHaveText('Roundtrip cutter')
})

test('sachet default folds follow a width edit at 1:2:1', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { synchroniseDefaultSachetFoldLines } = await import('/apps/web/src/core/geometry/resolvers/resolveSachetLayout.ts')
    const pack = getPackModule('sachet-3-side-seal')!
    const resized = synchroniseDefaultSachetFoldLines({ ...pack.getDefaults(), width: 100 })
    const svg = pack.render(resized)
    return { offsets: resized.foldLines?.map(line => line.offset), x: ['sachet-fold-left', 'sachet-fold-right'].map(id => Number(svg.querySelector(`[data-line-id="${id}"]`)?.getAttribute('x1'))) }
  })
  expect(result.offsets).toEqual([23.5, 70.5])
  expect(result.x[1] - result.x[0]).toBeCloseTo(47, 3)
})

test('sachet Base width control persists the revised fold positions', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Sachet folds', packLabel: '3-Side Seal Sachet', widthMm: 76, heightMm: 100 })
  await page.getByRole('button', { name: 'Base', exact: true }).click()
  const width = page.locator('input[data-cutter-field="width"]')
  await width.fill('100')
  await width.press('Enter')
  await openExportMenu(page)
  page.once('dialog', dialog => dialog.accept('Sachet folds'))
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect.poll(async () => (await readCurrentProject(page))?.cutter?.legacySpec.width).toBe(100)
  expect((await readCurrentProject(page))?.cutter?.legacySpec.foldLines?.map((line: any) => line.offset)).toEqual([23.5, 70.5])
})

test('BBE text accepts a continuous entry while the cutter redraws', async ({ page }) => {
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
    q.panel = initCustomisationPanel({ host, onChange: (spec: any) => {
      q.spec = spec
      q.panel.setSpec(spec)
      q.panel.setSelectedElements(['attribute-box:bbe'])
    }, getCurrentSvg: () => null })
    q.panel.setSpec(q.spec)
    q.panel.setActiveLayer('notes')
    q.panel.setSelectedElements(['attribute-box:bbe'])
    document.querySelector('#customisation-panel')!.classList.add('is-open')
  })
  await page.getByRole('tab', { name: 'Text', exact: true }).click()
  await page.getByLabel('Customise part').selectOption('heading')
  const content = page.getByLabel('Text content', { exact: true })
  await content.fill('')
  await content.pressSequentially('USE BEFORE 12/2026', { delay: 20 })
  await expect(content).toHaveValue('USE BEFORE 12/2026')
  await expect(content).toBeFocused()
  await content.press('Tab')
  expect(await page.evaluate(() => (window as any).spec.attributeBoxes[0].texts.heading.content)).toBe('USE BEFORE 12/2026')
})

test('Layers separates eyemarks and hides only the chosen item', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Layer items', packLabel: 'Plain Film', widthMm: 200, heightMm: 250, eyemarkCount: 2 })
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const panel = page.locator('#layers-panel')
  await expect(panel.getByRole('tab', { name: 'Base' })).toBeVisible()
  await expect(panel.getByRole('tab', { name: 'Elements' })).toBeVisible()
  await expect(panel.getByRole('tab', { name: 'Measures' })).toBeVisible()
  await panel.getByRole('button', { name: 'Toggle Eyemark items' }).click()
  await expect(panel.getByRole('button', { name: 'Select Eyemark 1' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Select Eyemark 2' })).toBeVisible()
  await panel.getByRole('button', { name: 'Toggle Eyemark 1 visibility' }).click()
  const eyes = await page.locator('#preview-canvas > svg [data-role="eye-mark"]').evaluateAll(nodes => nodes.map(node => ({ index: node.getAttribute('data-eye-index'), display: (node as SVGElement).style.display })))
  expect(eyes.find(eye => eye.index === '0')?.display).toBe('none')
  expect(eyes.find(eye => eye.index === '1')?.display).toBe('')
})

test('Legend sections can be hidden independently from Layers', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Layered legend', packLabel: 'Plain Film', widthMm: 200, heightMm: 250 })
  await page.getByRole('button', { name: 'Legend layouts' }).click()
  await page.getByRole('menuitem', { name: 'Portrait Kyza legend' }).click()
  await expect(page.locator('#preview-canvas #cutter_legend')).toBeVisible()
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const panel = page.locator('#layers-panel')
  await panel.getByRole('tab', { name: 'Legend' }).click()
  await panel.getByRole('button', { name: 'Toggle Cutter Legend items' }).click()
  await panel.getByRole('button', { name: 'Toggle Product information visibility' }).click()
  await expect(page.locator('#preview-canvas #cutter_legend [data-legend-section="product"]')).toHaveCSS('display', 'none')
  await expect(page.locator('#preview-canvas #cutter_legend [data-legend-section="technical"]')).not.toHaveCSS('display', 'none')
})

test('copy and paste duplicates a selected fold line', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Copy geometry', packLabel: 'Pillow Pack', widthMm: 440, heightMm: 200 })
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const panel = page.locator('#layers-panel')
  await panel.getByRole('tab', { name: 'Elements' }).click()
  await panel.getByRole('button', { name: 'Toggle Fold Lines items' }).click()
  await panel.getByRole('button', { name: 'Select Fold Line 1' }).click()
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(panel.getByRole('button', { name: 'Select Fold Line 3' })).toBeVisible()
  expect(await page.locator('#preview-canvas > svg [data-role="fold-line"][data-line-id^="fold-line-"]').count()).toBeGreaterThan(0)
})

test('copy and paste duplicates a perforation lane', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Copy perforation', packLabel: 'K Seal Pouch', widthMm: 190, heightMm: 300 })
  await page.getByRole('button', { name: 'Elements', exact: true }).first().click()
  await page.getByRole('tab', { name: 'Perforations' }).click()
  await page.getByRole('button', { name: 'MicroPerf' }).click()
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const panel = page.locator('#layers-panel')
  await panel.getByRole('tab', { name: 'Perforations' }).click()
  await panel.getByRole('button', { name: 'Toggle Microperfs items' }).click()
  await panel.getByRole('button', { name: 'Select Perf 1' }).click()
  await page.keyboard.press('ControlOrMeta+c')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(panel.getByRole('button', { name: 'Select Perf 2' })).toBeVisible()
  await expect(page.locator('#preview-canvas > svg [data-role="perf-group"]')).toHaveCount(2)
})

test('double clicking the cutter closes inspector and Flow without changing geometry', async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: 'Close panels', packLabel: 'Plain Film', widthMm: 200, heightMm: 250 })
  await page.getByRole('button', { name: 'Base', exact: true }).click()
  await page.getByRole('button', { name: 'Expand Flow' }).click()
  await expect(page.locator('#side-panel')).toHaveClass(/is-open/)
  await page.locator('#preview-canvas > svg').dblclick({ position: { x: 50, y: 50 } })
  await expect(page.locator('#side-panel')).not.toHaveClass(/is-open/)
  await expect(page.locator('#flow-assistant-dock')).toHaveAttribute('data-state', 'collapsed')
})

test('Plain Film measures have caps and the pouch preview uses the reduced scale', async ({ page }) => {
  await page.goto('/')
  const caps = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const svg = getPackModule('plain-film')!.render(getPackModule('plain-film')!.getDefaults())
    return [...svg.querySelectorAll('[data-role^="main-measure"]')].map(node => node.querySelectorAll('line').length)
  })
  expect(caps).toEqual([3, 3])
  await createManualProjectFromDashboard(page, { name: 'Scaled preview', packLabel: 'K Seal Pouch', widthMm: 190, heightMm: 300 })
  await page.locator('#dock [data-tool="more"]').click()
  await page.getByRole('menuitemcheckbox', { name: 'Pouch Preview' }).click()
  const ratio = await page.evaluate(async () => {
    const { fitPouchPreviewElement, resolvePouchPreviewViewport } = await import('/apps/web/src/ui/pouchPreview.ts')
    const svg = document.querySelector<SVGSVGElement>('#preview-canvas > svg')!
    const spec = JSON.parse(localStorage.getItem('kyza.projects.v1')!)[0].cutter.legacySpec
    const canvas = document.querySelector<HTMLElement>('#preview-canvas')!
    const viewport = resolvePouchPreviewViewport(svg, spec, { face: 'fop', showTrim: true })!
    const bounds = canvas.getBoundingClientRect()
    const full = fitPouchPreviewElement(viewport, { width: bounds.width - 176, height: bounds.height - 176 })
    return Number.parseFloat(svg.style.width) / full.width
  })
  expect(ratio).toBeCloseTo(.45, 2)
})
