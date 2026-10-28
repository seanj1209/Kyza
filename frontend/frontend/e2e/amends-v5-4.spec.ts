import { expect, test } from "./helpers/testState"

test("@beta V5.5 DOY Gusset includes the bottom seal and keeps finished width", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { updateGussetControl } = await import("/packages/cutter-engine/actions/gussetControls.ts")
    const { resolveDoyBounds, doyFinishedWidth, doyClearGussetWidth } = await import("/apps/web/src/core/geometry/resolvers/doyBounds.ts")
    const pack = getPackModule("doy-pouch")!
    const original = pack.getDefaults()
    const spec = updateGussetControl(original, "gussetSize", 40)
    const layout = resolveDoyBounds(spec, { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const arcLeftMid = layout.arcLeftX + layout.arcInsetDepth * .75
    const arcRightMid = layout.arcRightX - layout.arcInsetDepth * .75
    return {
      input: doyClearGussetWidth(spec) / 2,
      inclusiveInput: layout.centerWidth / 2,
      flatGrowth: spec.width - original.width,
      finishedBefore: doyFinishedWidth(original),
      finishedAfter: doyFinishedWidth(spec),
      gusset: layout.gussetRightX - layout.gussetLeftX,
      gapLeft: (layout.ovalCenterX - layout.ovalWidth * .375) - arcLeftMid,
      gapRight: arcRightMid - (layout.ovalCenterX + layout.ovalWidth * .375),
      bottomSeal: layout.bottomSealGap / 2
    }
  })
  expect(result.input).toBe(32.5)
  expect(result.inclusiveInput).toBe(40)
  expect(result.flatGrowth).toBe(10)
  expect(result.finishedAfter).toBe(result.finishedBefore)
  expect(result.gusset).toBe(65)
  expect(result.bottomSeal).toBe(7.5)
  expect(result.gapLeft).toBeCloseTo(15, 3)
  expect(result.gapRight).toBeCloseTo(15, 3)
})

test("@beta V5.5 DOY gusset and all adjoining seals use K Seal colour and opacity", async ({ page }) => {
  await page.goto("/")
  const paint = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const pack = getPackModule("doy-pouch")!
    const svg = pack.render(pack.getDefaults())
    const sealLayer = svg.querySelector('#seal_areas')!
    const gusset = svg.querySelector('[data-role="doy-bottom-seal-region"]')!
    const top = svg.querySelector('[data-role="seal-rect"][data-seal-side="top"]')!
    const bottom = svg.querySelector('[data-role="seal-rect"][data-seal-side="bottom"]')!
    const left = svg.querySelector('[data-role="seal-rect"][data-seal-side="left"]')!
    const right = svg.querySelector('[data-role="seal-rect"][data-seal-side="right"]')!
    const pieces = [gusset, top, bottom, left, right]
    return {
      groupOpacity: sealLayer.getAttribute("opacity"),
      sameParent: pieces.every(element => element.parentElement === sealLayer),
      fills: pieces.map(element => element.getAttribute("fill")),
      opacities: pieces.map(element => element.getAttribute("opacity")),
      strokes: [top, bottom, left, right].map(element => element.getAttribute("stroke"))
    }
  })
  expect(paint.groupOpacity).toBeNull()
  expect(paint.sameParent).toBe(true)
  expect(paint.fills).toEqual(Array(5).fill("#2E8B57"))
  expect(paint.opacities).toEqual(Array(5).fill(".32"))
  expect(paint.strokes).toEqual(Array(4).fill("none"))
})
