import { expect, test } from './helpers/testState'

test('PDF 2/5: fold controls add both directions, expose offsets, and remove Basic Gusset', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const { initFlowwrapControls } = await import('/apps/web/src/ui/controls.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    document.body.replaceChildren()
    const host = document.createElement('div')
    const attributes = document.createElement('div')
    document.body.append(host, attributes)
    const spec = { ...getPackModule('flowwrap')!.getDefaults(), foldLines: [] }
    const state = window as any
    state.qaSpec = spec
    initFlowwrapControls({ container: host, attributesPanelHost: attributes, initialSpec: spec,
      getPackId: () => 'flowwrap', onChange: next => { state.qaSpec = next } })
  })
  await expect(page.locator('#elements-panel-basic')).not.toContainText('Gusset')
  await page.getByRole('button', { name: 'Fold Lines', exact: true }).click()
  const panel = page.locator('.floating-panel[data-panel="fold"]')
  await expect(panel).toHaveClass(/is-open/)
  await expect(panel.getByLabel('New fold line direction')).toBeVisible()
  await expect(panel.getByLabel('X Offset (mm)')).toBeVisible()
  await panel.getByLabel('New fold line direction').selectOption('horizontal')
  await panel.getByRole('button', { name: 'Add fold line', exact: true }).click()
  const offset = panel.getByLabel('Offset from cutter top (mm)')
  await expect(offset).toBeVisible()
  await offset.fill('37.5')
  await offset.press('Enter')
  expect(await page.evaluate(() => (window as any).qaSpec.foldLines.map((line: any) => line.orientation))).toEqual(['vertical', 'horizontal'])
  expect(await page.evaluate(() => (window as any).qaSpec.foldLines[1].offset)).toBe(37.5)
  await offset.fill('-1'); await offset.press('Enter')
  await expect(offset).toHaveValue('37.5')
  await offset.fill('999999'); await offset.press('Enter')
  await expect(offset).toHaveValue('37.5')
  const rendered = await page.evaluate(async () => {
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const spec = (window as any).qaSpec
    const svg = getPackModule('flowwrap')!.render(spec)
    const horizontal = svg.querySelector(`[data-role="fold-line"][data-line-id="${spec.foldLines[1].id}"]`)!
    const vertical = svg.querySelector(`[data-role="fold-line"][data-line-id="${spec.foldLines[0].id}"]`)!
    const cutter = svg.querySelector('#cut_line rect')!
    const attrs = (node: Element, keys: string[]) => keys.map(key => Number(node.getAttribute(key)))
    return { horizontal: attrs(horizontal, ['x1', 'y1', 'x2', 'y2']), cutter: attrs(cutter, ['x', 'y', 'width', 'height']),
      sameStyle: ['stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap'].every(key => horizontal.getAttribute(key) === vertical.getAttribute(key)) }
  })
  expect(rendered.sameStyle).toBe(true)
  expect(rendered.horizontal).toEqual([rendered.cutter[0], rendered.cutter[1] + 37.5, rendered.cutter[0] + rendered.cutter[2], rendered.cutter[1] + 37.5])
  await panel.locator('[data-role="fold-line-direction"] select').last().selectOption('vertical')
  expect(await page.evaluate(() => (window as any).qaSpec.foldLines[1].orientation)).toBe('vertical')
  await panel.getByRole('button', { name: 'Remove fold line', exact: true }).last().click()
  expect(await page.evaluate(() => (window as any).qaSpec.foldLines.length)).toBe(1)
})

test('PDF 1: PlainFilm excludes both entire groups and restores them on a pack switch', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { initFlowwrapControls } = await import('/apps/web/src/ui/controls.ts')
    const { getPackModule } = await import('/apps/web/src/packs/index.ts')
    const host = document.createElement('div'), attributes = document.createElement('div')
    document.body.replaceChildren(host, attributes)
    let packId = 'doy-pouch'
    const api = initFlowwrapControls({ container: host, attributesPanelHost: attributes,
      initialSpec: getPackModule(packId)!.getDefaults(), getPackId: () => packId, onChange() {} })
    const inspect = () => ['openings', 'die-cut'].map(id => {
      const tab = attributes.querySelector<HTMLButtonElement>(`#elements-tab-${id}`)!
      const panel = attributes.querySelector<HTMLElement>(`#elements-panel-${id}`)!
      return { hidden: tab.hidden, disabled: tab.disabled, display: panel.style.display, inert: panel.inert,
        controls: [...panel.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled) }
    })
    const before = inspect()
    attributes.querySelector<HTMLButtonElement>('#elements-tab-die-cut')!.click()
    packId = 'plain-film'
    api.setSpec(getPackModule(packId)!.getDefaults())
    const excluded = inspect()
    const allowed = ['basic', 'barcodes', 'other', 'perforation', 'windows'].every(id => {
      const tab = attributes.querySelector<HTMLButtonElement>(`#elements-tab-${id}`)!
      return !tab.hidden && !tab.disabled
    })
    const selection = attributes.querySelector('#elements-tab-basic')!.getAttribute('aria-selected')
    packId = 'doy-pouch'
    api.setSpec(getPackModule(packId)!.getDefaults())
    const restored = inspect()
    const gussetAbsent = !attributes.querySelector('#elements-panel-basic')!.textContent!.includes('Gusset')
    return { before, excluded, restored, allowed, selection, gussetAbsent }
  })
  expect(result.before.every(group => !group.hidden && !group.disabled)).toBe(true)
  expect(result.excluded.every(group => group.hidden && group.disabled && group.display === 'none' && group.inert && group.controls)).toBe(true)
  expect(result.restored.every(group => !group.hidden && !group.disabled && group.display === '' && !group.inert && !group.controls)).toBe(true)
  expect(result.allowed).toBe(true)
  expect(result.selection).toBe('true')
  expect(result.gussetAbsent).toBe(true)
})
