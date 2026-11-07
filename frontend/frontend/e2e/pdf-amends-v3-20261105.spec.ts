import { test, expect } from '@playwright/test'

test('pre-slit joins adjacent working measures and retains both 50 mm off-cuts', async ({ page }) => {
  await page.goto('/')
  const segments = await page.evaluate(async () => {
    const { mergeContiguousPreSlitSegments } = await import('/apps/web/src/renderers/paperStripMeasurements.ts')
    return mergeContiguousPreSlitSegments([
      { start: 0, end: 50, value: 50, kind: 'clear', role: 'left-offcut' },
      { start: 50, end: 220.25, value: 170.25, kind: 'solid', role: 'working-first' },
      { start: 220.25, end: 310, value: 89.75, kind: 'solid', role: 'working-second' },
      { start: 310, end: 360, value: 50, kind: 'clear', role: 'right-offcut' }
    ])
  })
  expect(segments.map(segment => segment.value)).toEqual([50, 260, 50])
  expect(segments.map(segment => segment.kind)).toEqual(['clear', 'solid', 'clear'])
})

test('custom measure All creates visual copies from one saved measure and Mono reverses it', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { customMeasureOffsets } = await import('/apps/web/src/renderers/customMeasures.ts')
    const pack = getPackModule('paper-strip')!
    const base = pack.getDefaults()
    const measure = { id: 'one', start: { x: 40, y: 30 }, end: { x: 110, y: 30 }, repeatMode: 'all' as const }
    const spec = { ...base, paperStrip: { ...base.paperStrip, stepping: { stepCount: 3, gap: 8 } }, customMeasures: [measure], elementAppearance: { 'custom-measure:one': { color: '#123456' } } }
    const all = pack.render(spec)
    const copies = [...all.querySelectorAll('[data-role="custom-measure"]')].map(node => ({
      id: node.getAttribute('data-custom-measure-id'),
      label: node.getAttribute('data-measure-label'),
      dx: Number(node.getAttribute('data-repeat-dx')),
      stroke: node.querySelector('path')?.getAttribute('stroke')
    }))
    const mono = pack.render({ ...spec, customMeasures: [{ ...measure, repeatMode: 'mono' as const }] })
    return { copies, monoCount: mono.querySelectorAll('[data-role="custom-measure"]').length, offsets: customMeasureOffsets(all, spec, measure), savedCount: spec.customMeasures.length }
  })
  expect(result.savedCount).toBe(1)
  expect(result.copies).toHaveLength(3)
  expect(new Set(result.copies.map(copy => copy.id))).toEqual(new Set(['one']))
  expect(new Set(result.copies.map(copy => copy.label))).toEqual(new Set(['70']))
  expect(new Set(result.copies.map(copy => copy.stroke))).toEqual(new Set(['#123456']))
  expect(result.monoCount).toBe(1)
  expect(result.offsets).toHaveLength(3)
})

test('one repetition menu controls a selected custom measure and its copies', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { SelectionStore } = await import('/apps/web/src/state/selectionStore.ts')
    const { attachCustomMeasureInteractions } = await import('/apps/web/src/ui/customMeasureInteractions.ts')
    const q = window as any, pack = getPackModule('paper-strip')!, base = pack.getDefaults()
    q.spec = { ...base, paperStrip: { ...base.paperStrip, stepping: { stepCount: 3, gap: 8 } }, customMeasures: [{ id: 'one', start: { x: 40, y: 30 }, end: { x: 110, y: 30 } }] }
    document.body.replaceChildren()
    const canvas = document.createElement('div'); canvas.id = 'fixture-canvas'; canvas.style.cssText = 'position:relative;width:900px;height:650px'; document.body.append(canvas)
    q.store = new SelectionStore()
    q.render = () => {
      q.interaction?.destroy()
      const svg = pack.render(q.spec); svg.style.width = '900px'; svg.style.height = '650px'; canvas.replaceChildren(svg)
      q.interaction = attachCustomMeasureInteractions(svg, () => q.spec, q.store, (next: any) => { q.spec = next; q.render() }, () => q.store.setSelectionMode(true))
    }
    q.render(); q.store.setSelectedElementIds(['custom-measure:one'])
  })
  await expect(page.locator('.custom-measure-repeat-menu')).toBeVisible()
  await page.getByRole('button', { name: 'Custom measure options' }).click()
  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(page.locator('[data-role="custom-measure"]')).toHaveCount(3)
  expect(await page.evaluate(() => (window as any).spec.customMeasures.length)).toBe(1)
  await page.evaluate(() => (window as any).store.clearSelection())
  await page.locator('[data-role="custom-measure-hit"][data-repeat-index="1"]').click({ force: true })
  await expect(page.locator('.custom-measure-repeat-menu')).toBeVisible()
  await expect(page.locator('.custom-measure-repeat-menu')).toHaveCount(1)
  await page.getByRole('button', { name: 'Custom measure options' }).click()
  await page.getByRole('button', { name: 'Mono', exact: true }).click()
  await expect(page.locator('[data-role="custom-measure"]')).toHaveCount(1)
  expect(await page.evaluate(() => (window as any).spec.customMeasures[0].start.x)).toBe(40)
})

test('perforation tabs link by default and allow independent edits after unlinking', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  await page.evaluate(async () => {
    const { initCustomisationPanel } = await import('/apps/web/src/ui/customisationPanel.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const q = window as any
    q.spec = { ...getPackModule('plain-film')!.getDefaults(), perfs: { mode: 'regulated', separation: 10, count: 5, originX: 20, diameter: 2, lanes: [{ originX: 20, style: 'circles' }, { originX: 40, style: 'circles' }] } }
    document.body.replaceChildren()
    const host = document.createElement('div'); host.style.cssText = 'height:850px;position:relative'; document.body.append(host)
    q.panel = initCustomisationPanel({ host, onChange: (spec: any) => { q.spec = spec; q.panel.setSpec(spec) }, getCurrentSvg: () => null })
    q.panel.setSpec(q.spec); q.panel.setActiveLayer('perf-lines')
    document.querySelector('#customisation-panel')!.classList.add('is-open')
  })
  const tabs = page.locator('.customisation-perf-tabs')
  await expect(tabs.getByRole('button', { name: 'Lane 2' })).toBeDisabled()
  await page.locator('.customisation-perf-lane .customisation-select').selectOption('crosshair')
  expect(await page.evaluate(() => (window as any).spec.perfs.lanes.map((lane: any) => lane.style))).toEqual(['crosshair', 'crosshair'])
  await tabs.getByRole('button', { name: 'Unlink perf lanes' }).click()
  await tabs.getByRole('button', { name: 'Lane 2' }).click()
  await page.locator('.customisation-perf-lane .customisation-select').selectOption('scope')
  expect(await page.evaluate(() => (window as any).spec.perfs.lanes.map((lane: any) => lane.style))).toEqual(['crosshair', 'scope'])
  await tabs.getByRole('button', { name: 'Link perf lanes' }).click()
  expect(await page.evaluate(() => (window as any).spec.perfs.lanes.map((lane: any) => lane.style))).toEqual(['crosshair', 'crosshair'])
})

test('colour icon button displays the current RGB choice', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  await page.evaluate(async () => {
    const { initCustomisationPanel } = await import('/apps/web/src/ui/customisationPanel.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveBaseCustomisation } = await import('/apps/web/src/renderers/baseLayerCustomisation.ts')
    const q = window as any, base = getPackModule('plain-film')!.getDefaults()
    q.spec = { ...base, baseCustomisation: { ...resolveBaseCustomisation(base), cutter: { ...resolveBaseCustomisation(base).cutter, color: '#22aa44' } } }
    document.body.replaceChildren()
    const host = document.createElement('div'); host.style.cssText = 'height:850px;position:relative'; document.body.append(host)
    q.panel = initCustomisationPanel({ host, onChange: (spec: any) => { q.spec = spec; q.panel.setSpec(spec) }, getCurrentSvg: () => null })
    q.panel.setSpec(q.spec); q.panel.setActiveLayer('cutter-outline')
    document.querySelector('#customisation-panel')!.classList.add('is-open')
  })
  await expect(page.locator('.customisation-color-button').first()).toHaveCSS('border-color', 'rgb(34, 170, 68)')
  const wheelButtons = page.locator('.customisation-color-button')
  expect(await wheelButtons.count()).toBeGreaterThan(0)
  for (const button of await wheelButtons.all()) {
    await expect(button.locator('img[src*="Colour Circle_STATIC.png"]')).toHaveCount(1)
    expect(await button.evaluate(node => (node as HTMLElement).style.backgroundColor)).toBe('')
  }
})

test('pouch preview measures remain on each face while zooming', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { renderPouchPreviewSpread } = await import('/apps/web/src/ui/pouchPreview.ts')
    const pack = getPackModule('k-seal-pouch')!
    const spec = pack.getDefaults()
    const source = pack.render(spec)
    const atFit = renderPouchPreviewSpread(source, spec, true, 1, { width: 900, height: 650 })
    const atDouble = renderPouchPreviewSpread(source, spec, true, 2, { width: 900, height: 650 })
    const faces = [...atFit.querySelectorAll<SVGSVGElement>('.pouch-preview-face svg')]
    return {
      faces: faces.map(svg => ({
        face: svg.getAttribute('data-pouch-preview-face'),
        measures: svg.querySelectorAll('[data-layer-id="pouch-preview-measures"]').length,
        length: svg.querySelectorAll('[data-role="pouch-preview-length"]').length,
      })),
      fitWidth: parseFloat(faces[0].style.width),
      doubleWidth: parseFloat(atDouble.querySelector<SVGSVGElement>('.pouch-preview-face svg')!.style.width),
    }
  })
  expect(result.faces).toEqual([{ face: 'fop', measures: 1, length: 1 }, { face: 'bop', measures: 1, length: 1 }])
  expect(result.doubleWidth).toBeCloseTo(result.fitWidth * 2, 5)
})
