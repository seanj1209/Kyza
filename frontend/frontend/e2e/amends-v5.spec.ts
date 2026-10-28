import { createManualProjectFromDashboard, expect, readCurrentProject, test } from "./helpers/testState"

test("@beta V5.5 K Seal gusset retains its entered 40 mm inclusive of 7.5 mm bottom seals", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolveKSealLayout } = await import("/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts")
    const spec = getPackModule("k-seal-pouch")!.getDefaults()
    spec.kSealPouch = { ...spec.kSealPouch!, gussetSize:40, gussetDepth:40, bottomSeal:7.5, gussetSync:false }
    const layout = resolveKSealLayout(spec)
    return layout.featureMeasureSegments.filter(item => item.row === "bottom").map(item => ({ span:item.endX-item.startX, label:item.label }))
  })
  expect(result.filter(item => item.span === 40 && item.label.includes("40"))).toHaveLength(2)
  expect(result.filter(item => item.span === 7.5 && item.label.includes("7.5"))).toHaveLength(4)
  expect(result.some(item => item.label.includes("32.5"))).toBe(false)
})

test("@beta V5 DOY finished width converts to flat web", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { doyFinishedWidth, doyCutterWidth } = await import("/apps/web/src/core/geometry/resolvers/doyBounds.ts")
    const pack = getPackModule("doy-pouch")!
    const original = pack.getDefaults()
    return { finished:doyFinishedWidth(original),flat:doyCutterWidth(doyFinishedWidth(original),original.doyPouch!.panelWidths.center) }
  })
  expect(result).toEqual({ finished:209, flat:488 })
})

test("@beta V5 legend clears the original artwork and keeps differing line styles", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { collectLegendKey } = await import("/apps/web/src/renderers/legendKey.ts")
    const pack=getPackModule("k-seal-pouch")!
    const spec={...pack.getDefaults(),cutterLegend:true,cutterLegendPosition:"top" as const,cutterLegendOrientation:"landscape" as const}
    const before=pack.render({...spec,cutterLegend:false}).viewBox.baseVal
    const after=pack.render(spec)
    const top=Number(after.getAttribute("data-legend-top"))
    const bottom=Number(after.getAttribute("data-legend-bottom"))
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg")
    const group=document.createElementNS(svg.namespaceURI,"g");group.setAttribute("data-layer-id","fold-lines")
    for(const color of ["#ff0000","#ff0000","#0000ff"]){const line=document.createElementNS(svg.namespaceURI,"line");line.setAttribute("x1","0");line.setAttribute("x2","10");line.setAttribute("stroke",color);line.setAttribute("fill","none");group.append(line)}
    svg.append(group);document.body.append(svg)
    const folds=collectLegendKey(svg).filter(entry=>entry.label==="FOLDS")
    svg.remove()
    return {clear:bottom<=before.y-24,folds:folds.map(entry=>entry.stroke),sampleMarkup:after.querySelector("#cutter_legend")!.innerHTML.includes("<line")}
  })
  expect(result).toEqual({clear:true,folds:["#ff0000","#0000ff"],sampleMarkup:true})
})

test("@beta V5 Flow answers trial questions in different wording", async ({ page }) => {
  await createManualProjectFromDashboard(page,{name:"V5 Flow"})
  const input=page.getByRole("textbox",{name:"Ask Flow a question"})
  for(const [question,answer] of [
    ["Can I turn an object left?","Shift+L"],
    ["Where can I add more registration marks?","Eyemark Settings"],
    ["How can I make a layer invisible?","visibility icon"]
  ]){
    await input.fill(question);await input.press("Enter")
    await expect(page.locator(".flow-assistant-response p").last()).toContainText(answer)
  }
})

test("@beta V5 DOY Base uses finished pouch width", async ({ page }) => {
  await createManualProjectFromDashboard(page,{name:"V5 DOY",packLabel:"DOY Pouch"})
  await page.getByRole("button",{name:"Base",exact:true}).click()
  const width=page.locator('#base-model-panel [data-cutter-field="width"]')
  const initial=(await readCurrentProject(page))!.cutter!.legacySpec!
  await expect(width).toHaveValue(String((initial.width-initial.doyPouch.panelWidths.center)/2))
  await width.fill("240");await width.press("Tab")
  const dock=page.getByRole("region",{name:"Gusset dock"})
  await dock.getByRole("button",{name:"Expand gusset tray"}).click()
  await expect(dock.getByLabel("Bottom Seals (mm)")).toHaveCount(0)
  await page.keyboard.press("Control+s")
  const spec=(await readCurrentProject(page))!.cutter!.legacySpec!
  expect(spec.width).toBe(550)
})

test("@beta V5 right rail clears its active state and Studio controls share the header axis", async ({ page }) => {
  await createManualProjectFromDashboard(page,{name:"V5 alignment"})
  const base=page.locator('#right-rail .right-rail-button[aria-label="Base"]')
  await base.click()
  await expect(base).toHaveClass(/is-active/)
  await base.click()
  await expect(base).not.toHaveClass(/is-active/)
  const axis=await page.evaluate(()=>{
    const center=(selector:string)=>{const rect=document.querySelector(selector)!.getBoundingClientRect();return rect.left+rect.width/2}
    return {tabs:center("#artboard-tabs"),toolbar:center("#dock-shell"),flow:center("#flow-assistant-dock"),cutter:center('#preview-canvas [data-layer-id="cutter-outline"]'),viewport:innerWidth/2}
  })
  expect(Math.abs(axis.tabs-axis.viewport)).toBeLessThan(3)
  expect(Math.abs(axis.toolbar-axis.viewport)).toBeLessThan(3)
  expect(Math.abs(axis.flow-axis.viewport)).toBeLessThan(3)
  expect(Math.abs(axis.cutter-axis.viewport)).toBeLessThan(12)
  await page.screenshot({path:"test-results/v5-studio-alignment.png",fullPage:true})
})

test("@beta V5 legend Resize action preserves aspect and keeps cutter geometry", async ({ page }) => {
  await createManualProjectFromDashboard(page,{name:"V5 legend"})
  await page.getByRole("button",{name:"Legend layouts",exact:true}).click()
  await page.getByRole("menuitem",{name:"Landscape Klyro legend"}).click()
  const svg=page.locator("#preview-canvas > svg")
  const before=await svg.locator('[data-layer-id="cutter-outline"]').first().evaluate(node=>node.outerHTML)
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  await svg.locator("#cutter_legend").click()
  await svg.locator('[aria-label="Legend actions"]').click()
  await svg.getByRole("menuitem",{name:"Resize legend"}).click()
  await svg.locator('[data-role="legend-resize-handle"]').press("ArrowRight")
  await expect(svg.locator("#cutter_legend")).toHaveAttribute("transform",/scale\(1\.4/)
  await page.keyboard.press("Control+s")
  const after=await svg.locator('[data-layer-id="cutter-outline"]').first().evaluate(node=>node.outerHTML)
  const spec=(await readCurrentProject(page))!.cutter!.legacySpec!
  expect(spec.cutterLegendScale).toBeCloseTo(1.4)
  expect(after).toBe(before)
  await svg.locator("#cutter_legend").click()
  await svg.locator('[aria-label="Legend actions"]').click()
  await svg.getByRole("menuitem",{name:"Resize legend"}).click()
  const handle=(await svg.locator('[data-role="legend-resize-handle"]').boundingBox())!
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2)
  await page.mouse.down()
  await page.mouse.move(handle.x+handle.width/2+30,handle.y+handle.height/2+30,{steps:5})
  await page.mouse.up()
  await page.keyboard.press("Control+s")
  const resized=(await readCurrentProject(page))!.cutter!.legacySpec!
  expect(resized.cutterLegendScale).toBeGreaterThan(1.4)
})
