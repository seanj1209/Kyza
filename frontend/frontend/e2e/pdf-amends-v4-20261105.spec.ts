import { test, expect } from '@playwright/test'

test('continuous perforations have equal clear space at both cutter ends', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { buildPerfCenters } = await import('/apps/web/src/geometry/perfs.ts')
    const points = buildPerfCenters({ mode: 'continuous', separation: 11, diameter: 2, sealEdge: 'top', originX: 30 } as any, 0, 0, 100, 100, 0, 0, 100, 100)
    return { first: points[0].y - 1, last: 100 - (points.at(-1)!.y + 1), count: points.length }
  })
  expect(result.count).toBeGreaterThan(2)
  expect(result.first).toBeCloseTo(result.last, 6)
})

test('custom measure can be given an exact length from its options menu', async ({ page }) => {
  await page.goto('/cutter?studio=home')
  await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { SelectionStore } = await import('/apps/web/src/state/selectionStore.ts')
    const { attachCustomMeasureInteractions } = await import('/apps/web/src/ui/customMeasureInteractions.ts')
    const q = window as any, pack = getPackModule('plain-film')!
    q.spec = { ...pack.getDefaults(), customMeasures: [{ id: 'measure', start: { x: 40, y: 30 }, end: { x: 74.58, y: 30 } }] }
    document.body.replaceChildren()
    const canvas = document.createElement('div'); canvas.style.cssText = 'position:relative;width:900px;height:650px'; document.body.append(canvas)
    q.store = new SelectionStore()
    q.render = () => { q.api?.destroy(); const svg = pack.render(q.spec); svg.style.cssText = 'width:900px;height:650px'; canvas.replaceChildren(svg); q.api = attachCustomMeasureInteractions(svg, () => q.spec, q.store, (next: any) => { q.spec = next; q.render() }, () => q.store.setSelectionMode(true)) }
    q.render(); q.store.setSelectedElementIds(['custom-measure:measure'])
  })
  await page.getByRole('button', { name: 'Custom measure options' }).click()
  await page.getByRole('spinbutton', { name: 'Length (mm)' }).fill('35')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  const length = await page.evaluate(() => { const m = (window as any).spec.customMeasures[0]; return Math.hypot(m.end.x - m.start.x, m.end.y - m.start.y) })
  expect(length).toBeCloseTo(35, 6)
})

test('horizontal folds split the height submeasure row without duplicate full span', async ({ page }) => {
  await page.goto('/')
  const labels = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const pack = getPackModule('flowwrap')!, base = pack.getDefaults()
    const spec = { ...base, foldLines: [{ id: 'horizontal-one', orientation: 'horizontal' as const, offset: 35 }, { id: 'horizontal-two', orientation: 'horizontal' as const, offset: 70 }] }
    document.documentElement.setAttribute('data-sub-measures', 'true')
    const svg = pack.render(spec)
    document.documentElement.removeAttribute('data-sub-measures')
    return [...svg.querySelectorAll('#sub_measure_height text')].map(node => node.textContent)
  })
  expect(labels.length).toBeGreaterThanOrEqual(3)
  expect(labels).toContain('35mm')
})

test('safe zone fits a panel enclosed by three folds and one seal', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const { resolveFlowwrapGeometry } = await import('/apps/web/src/geometry/flowwrapGeometry.ts')
    const { getSafeZoneFit } = await import('/packages/cutter-engine/actions/safeZoneFit.ts')
    const base = getPackModule('flowwrap')!.getDefaults(), live = resolveFlowwrapGeometry(base).liveRect
    const spec = { ...base,
      foldLines: [
        { id: 'left', orientation: 'vertical' as const, offset: live.width / 4 },
        { id: 'right', orientation: 'vertical' as const, offset: live.width * 3 / 4 },
        { id: 'across', orientation: 'horizontal' as const, offset: live.y + live.height / 2 },
      ],
      safeZones: [{ id: 'zone', x: live.width / 2 - 5, y: live.height * 3 / 4 - 5, width: 10, height: 10, enabled: true }],
    }
    const fit = getSafeZoneFit(spec, 'zone')
    return fit.enabled ? { enabled: true, x: fit.zone.x, y: fit.zone.y, width: fit.zone.width, height: fit.zone.height } : { enabled: false, reason: fit.reason }
  })
  expect(result.enabled, JSON.stringify(result)).toBe(true)
  if (result.enabled) expect(result.width).toBeGreaterThan(10)
})
