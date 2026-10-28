import { createManualProjectFromDashboard, expect, test } from "./helpers/testState"

test("@beta V5.5 K Seal includes the bottom-seal midpoint within each 40 mm gusset half", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolveKSealLayout } = await import("/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts")
    const spec = getPackModule("k-seal-pouch")!.getDefaults()
    const layout = resolveKSealLayout(spec)
    const g = layout.geometry
    return { width:g.width, leftRed:g.leftBottomSealX+g.bottomSeal, rightRed:g.rightBottomSealX+g.bottomSeal,
      center:g.centerX, gusset:g.gussetSize, topTotal:layout.topMeasureSegments.reduce((sum,item)=>sum+item.endX-item.startX,0),
      labels:layout.topMeasureSegments.map(item=>item.label) }
  })
  expect(result).toEqual({width:480,leftRed:200,rightRed:280,center:240,gusset:40,topTotal:400,
    labels:["200mm","200mm"]})
})

test("@beta V5.1 rollback left no obsolete DOY bottom-seal guide", async ({ page }) => {
  await page.goto("/")
  const count = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const pack = getPackModule("doy-pouch")!
    const spec = pack.getDefaults()
    const oldSpec = { ...spec, doyPouch:{ ...spec.doyPouch!, bottomSeal:7.5 } }
    return pack.render(oldSpec).querySelectorAll('[data-role="doy-bottom-seal-guide"]').length
  })
  expect(count).toBe(0)
})

test("@beta V5.1 legend starts on the right and samples actual seal, cutter and eyemark paint", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { collectLegendKey } = await import("/apps/web/src/renderers/legendKey.ts")
    const pack = getPackModule("k-seal-pouch")!
    const spec = { ...pack.getDefaults(), cutterLegend:true }
    const original = pack.render({ ...spec, cutterLegend:false })
    const legend = pack.render(spec)
    const keys = collectLegendKey(original)
    const source = original.querySelector('[data-role="kseal-bottom-seal"]')!
    const side = original.querySelector('[data-role="kseal-side-seal"]')!
    const eye = original.querySelector('[data-role="eye-mark"]')
    return { right:Number(legend.getAttribute("data-legend-left"))>original.viewBox.baseVal.x+original.viewBox.baseVal.width,
      seals:keys.filter(item=>item.label==="SEALS").map(item=>item.preview),
      gusset:keys.filter(item=>item.label==="GUSSET").map(item=>item.preview),
      sealFill:source.getAttribute("fill"),sideFill:side.getAttribute("fill"),cutter:keys.find(item=>item.label==="CUTTER")?.stroke,
      cutterStroke:original.querySelector('[data-layer-id="cutter-outline"] path, [data-layer-id="cutter-outline"] rect, [data-layer-id="cutter-outline"] line')?.getAttribute("stroke"),
      eyemark:keys.find(item=>item.label==="EYEMARKS")?.preview,eyeFill:eye?.getAttribute("fill") }
  })
  expect(result.right).toBe(true)
  // AMENDS 6.1: K Seal side seals (Seals) and gusset (Gusset ▸ Fill) are painted separately,
  // so each has its own key entry sampling its actual paint.
  expect(result.seals).toHaveLength(1)
  expect(result.seals[0]).toContain(`fill="${result.sideFill}"`)
  expect(result.gusset).toHaveLength(1)
  expect(result.gusset[0]).toContain(`fill="${result.sealFill}"`)
  expect(result.cutter).toBe(result.cutterStroke)
  expect(result.eyeFill).toBeTruthy()
  expect(result.eyemark).toContain(`fill="${result.eyeFill}"`)
})

test("@beta V5.1 legend key remains inside its card in Studio", async ({ page }) => {
  await createManualProjectFromDashboard(page,{name:"V5.1 key",packLabel:"K Seal Pouch"})
  await page.getByRole("button",{name:"Legend layouts",exact:true}).click()
  await page.getByRole("menuitem",{name:"Portrait Klyro legend"}).click()
  const legend=page.locator("#cutter_legend")
  await expect(legend).toBeVisible()
  await page.screenshot({path:"test-results/v5-1-legend.png",fullPage:true})
})

test("@beta V5.1 opening centre moves and outer outline resizes without a circle", async ({ page }) => {
  await createManualProjectFromDashboard(page,{name:"V5.1 opening",packLabel:"DOY Pouch"})
  await page.getByRole("button",{name:"Elements",exact:true}).click()
  await page.getByRole("tab",{name:"Openings",exact:true}).click()
  await page.getByRole("button",{name:"Grip Seal (Default)",exact:true}).click()
  await page.getByRole("button",{name:"Close panel",exact:true}).click()
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  const grip=page.locator('[data-role="grip-seal"]').first()
  const before=(await grip.boundingBox())!
  const cursorAt=(x:number,y:number)=>page.evaluate(({x,y})=>getComputedStyle(document.elementFromPoint(x,y)!).cursor,{x,y})
  await page.mouse.move(before.x+before.width/2,before.y+before.height/2)
  expect(await cursorAt(before.x+before.width/2,before.y+before.height/2)).toBe("move")
  await page.mouse.move(before.x+1,before.y+before.height/2)
  expect(await cursorAt(before.x+1,before.y+before.height/2)).toBe("col-resize")
  await expect(page.locator('[data-role="opening-resize-handle"]')).toHaveCount(0)
  const width=Number(await grip.getAttribute("width"))
  await page.mouse.down()
  await page.mouse.move(before.x-20,before.y+before.height/2,{steps:6})
  await page.mouse.up()
  expect(Number(await grip.getAttribute("width"))).toBeGreaterThan(width)
})
