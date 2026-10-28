import { expect, test } from "./helpers/testState"

test("@beta V5.5 DOY arc responds to bottom seal and pack dimensions", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { updateGussetControl, doySideAngle } = await import("/packages/cutter-engine/actions/gussetControls.ts")
    const pack = getPackModule("doy-pouch")!
    const gusset40 = updateGussetControl(pack.getDefaults(), "gussetSize", 40)
    const withSeal10 = updateGussetControl(gusset40, "bottomSeal", 10)
    const withSeal15 = updateGussetControl(gusset40, "bottomSeal", 15)
    return {
      widths: [gusset40, withSeal10, withSeal15].map(spec => spec.doyPouch!.panelWidths.center),
      angles: [gusset40, withSeal10, withSeal15].map(doySideAngle),
      tallAngle: doySideAngle({ ...gusset40, height: gusset40.height * 2 }),
      narrowAngle: doySideAngle({ ...gusset40, width: 100 })
    }
  })
  expect(result.widths).toEqual([80, 80, 80])
  expect(result.angles[0]).toBeGreaterThan(result.angles[1])
  expect(result.angles[1]).toBeGreaterThan(result.angles[2])
  expect(result.tallAngle).toBeLessThan(result.angles[0])
  expect(result.narrowAngle).toBeLessThan(result.angles[0])
})

test("@beta V5.5 K Seal measures join and centre fold sits behind seals", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolveKSealLayout } = await import("/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts")
    const pack = getPackModule("k-seal-pouch")!
    const spec = pack.getDefaults()
    const layout = resolveKSealLayout(spec)
    const svg = pack.render(spec)
    const fold = svg.querySelector('[data-role="kseal-center-line"]')!
    const sealVisual = svg.querySelector('#kseal_seal_visual')!
    const top = layout.topMeasureSegments
    const bottom = layout.featureMeasureSegments.filter(segment => segment.row === "bottom")
    return {
      width: layout.width,
      topLabels: top.map(segment => segment.label),
      topAtEdges: top[0].startX === layout.originX && top[1].endX === layout.originX + layout.width,
      halfSpans: bottom.slice(0, 2).map(segment => segment.endX - segment.startX),
      sealHalves: bottom.slice(2, 6).map(segment => segment.endX - segment.startX),
      sealPairsJoined: bottom[2].endX === bottom[3].startX && bottom[4].endX === bottom[5].startX,
      foldTop: Number(fold.getAttribute("y1")),
      foldBottom: Number(fold.getAttribute("y2")),
      behindSeals: Boolean(fold.parentElement!.compareDocumentPosition(sealVisual) & Node.DOCUMENT_POSITION_FOLLOWING)
    }
  })
  expect(result.width).toBe(480)
  expect(result.topLabels).toEqual(["200mm", "200mm"])
  expect(result.topAtEdges).toBe(true)
  expect(result.halfSpans).toEqual([40, 40])
  expect(result.sealHalves).toEqual([7.5, 7.5, 7.5, 7.5])
  expect(result.sealPairsJoined).toBe(true)
  // AMENDS 6.1: the centre fold is part of the Gusset outline and stops at the
  // 7.5 mm side seals (80 + 7.5 → 270 − 7.5); it still sits behind the seals.
  expect(result.foldTop).toBe(87.5)
  expect(result.foldBottom).toBe(262.5)
  expect(result.behindSeals).toBe(true)
})
