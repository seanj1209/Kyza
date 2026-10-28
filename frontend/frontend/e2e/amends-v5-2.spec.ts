import { createManualProjectFromDashboard, expect, test } from "./helpers/testState"

test("@beta V5.6 DOY keeps the closest curve gap at 15 mm on both faces", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { updateGussetControl } = await import("/packages/cutter-engine/actions/gussetControls.ts")
    const { resolveDoyBounds } = await import("/apps/web/src/core/geometry/resolvers/doyBounds.ts")
    const pack = getPackModule("doy-pouch")!
    const spec = updateGussetControl(pack.getDefaults(), "bottomSeal", 10)
    const layout = resolveDoyBounds(spec, { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const leftGap = layout.ovalCenterX - layout.ovalWidth * .375 - layout.arcLeftX - layout.arcInsetDepth * .75
    const rightGap = layout.arcRightX - layout.arcInsetDepth * .75 - layout.ovalCenterX - layout.ovalWidth * .375
    const shifted = resolveDoyBounds({ ...spec, doyPouch: { ...spec.doyPouch!, ovalOffsetX: 5 } },
      { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const shiftedGaps = [
      shifted.ovalCenterX - shifted.ovalWidth * .375 - shifted.arcLeftX - shifted.arcInsetDepth * .75,
      shifted.arcRightX - shifted.arcInsetDepth * .75 - shifted.ovalCenterX - shifted.ovalWidth * .375
    ]
    const extreme = resolveDoyBounds({ ...spec, doyPouch: { ...spec.doyPouch!, ovalOffsetX: 99999 } },
      { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const svg = pack.render(spec)
    document.body.replaceChildren(svg)
    return { value: spec.doyPouch!.bottomSeal, leftGap, rightGap, shiftedGaps,
      expectedGap: 15,
      extremeRightArc: extreme.arcRightX, cutterWidth: spec.width,
      fills: svg.querySelectorAll('[data-role="doy-bottom-seal-region"]').length,
      measures: Array.from(svg.querySelectorAll('[data-role="doy-bottom-seal-label"]')).map(el => el.textContent),
      ovalFill: svg.querySelector('[data-role="doy-oval"]')?.getAttribute("fill"),
      arcStroke: svg.querySelector('[data-role="gusset-arc"]')?.getAttribute("stroke") }
  })
  expect(result.value).toBe(10)
  expect(result.leftGap).toBeCloseTo(result.expectedGap, 3)
  expect(result.rightGap).toBeCloseTo(result.expectedGap, 3)
  expect(result.shiftedGaps[0]).toBeCloseTo(result.expectedGap, 3)
  expect(result.shiftedGaps[1]).toBeCloseTo(result.expectedGap, 3)
  expect(result.extremeRightArc).toBeLessThan(result.cutterWidth)
  expect(result.fills).toBe(1)
  expect(result.measures).toEqual([])
  expect(result.ovalFill).toBe("none")
  expect(result.arcStroke).toBe("#76d8aa")
  await page.screenshot({ path: "test-results/v5-2-doy.png", fullPage: true })
})

test("@beta V5.3 pouch legend puts finished dimensions under Pouch Spec", async ({ page }) => {
  await page.goto("/")
  const legends = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    return ["doy-pouch", "k-seal-pouch"].map(id => {
      const pack = getPackModule(id)!
      const svg = pack.render({ ...pack.getDefaults(), cutterLegend: true })
      return svg.querySelector("#cutter_legend")?.textContent ?? ""
    })
  })
  for (const legend of legends) {
    expect(legend).toContain("Pouch Spec")
    expect(legend).toContain("Finished")
  }
})

test("@beta V5.2 right Euro slot is the horizontal mirror in the exported cutter", async ({ page }) => {
  await page.goto("/")
  const transforms = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const pack = getPackModule("doy-pouch")!
    const spec = pack.getDefaults()
    spec.hangerSlots = [{ id: "euro", type: "hanger-slot", subtype: "standard-euro-slot",
      diameter: 10, width: 30, height: 10, centerX: 25, centerY: 65, mirrored: true }]
    const svg = pack.render(spec)
    return ["fop", "bop"].map(face => svg.querySelector(`[data-role="hanger-slot"][data-face="${face}"]`)?.getAttribute("transform"))
  })
  expect(transforms[0]).toContain("scale(30 10)")
  expect(transforms[1]).toContain("scale(30 -10)")
})

test("@beta V5.2 opening move shows edge distance on both sides", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V5.2 opening", packLabel: "DOY Pouch" })
  await page.getByRole("button", { name: "Elements", exact: true }).click()
  await page.getByRole("tab", { name: "Openings", exact: true }).click()
  await page.getByRole("button", { name: "Grip Seal (Default)", exact: true }).click()
  await page.getByRole("button", { name: "Close panel", exact: true }).click()
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  const grip = page.locator('[data-role="grip-seal"]').first()
  const box = (await grip.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2, { steps: 4 })
  await expect(page.locator('[data-role="opening-offset-measure"]')).toHaveCount(2)
  await expect(page.locator('[data-role="opening-offset-label"]')).toHaveCount(2)
  await page.mouse.up()
})
