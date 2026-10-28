import { expect, test } from "./helpers/testState"

test("@beta V5.3 K Seal arms meet level while AMENDS 10 uses pack-height measures", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolveKSealLayout } = await import("/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts")
    const layout = resolveKSealLayout(getPackModule("k-seal-pouch")!.getDefaults())
    const arms = layout.geometry.armLines
    const at = (side: string, position: string) => arms.find(arm => arm.side === side && arm.position === position)!
    return {
      labels: layout.topMeasureSegments.map(segment => segment.label),
      startsAtEdges: layout.topMeasureSegments[0].startX === layout.originX && layout.topMeasureSegments[1].endX === layout.originX + layout.width,
      junctions: ["top-left", "top-right", "bottom-left", "bottom-right"].map(side =>
        Math.abs(at(side, "inner").endY - at(side, "outer").endY))
    }
  })
  expect(result.labels).toEqual(["200mm", "200mm"])
  expect(result.startsAtEdges).toBe(true)
  for (const difference of result.junctions) expect(difference).toBeLessThan(.0001)
})

test("@beta V5.6 DOY Sync fits the oval inside the gusset and draws three fold guides", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { updateGussetControl } = await import("/packages/cutter-engine/actions/gussetControls.ts")
    const { resolveDoyBounds } = await import("/apps/web/src/core/geometry/resolvers/doyBounds.ts")
    const pack = getPackModule("doy-pouch")!
    const spec = updateGussetControl(pack.getDefaults(), "gussetSize", 40)
    const layout = resolveDoyBounds(spec, { originX: 0, liveOriginX: 0, liveWidth: spec.width, cutterWidth: spec.width })!
    const svg = pack.render(spec)
    return {
      centreWidth: layout.centerWidth,
      gussetWidth: layout.gussetWidth,
      ovalWidth: layout.ovalWidth,
      arcInsetDepth: layout.arcInsetDepth,
      midlines: svg.querySelectorAll('[data-role="doy-bottom-seal-midline"]').length,
      centreFolds: svg.querySelectorAll('[data-role="doy-gusset-centre-fold"]').length,
      oldBounds: svg.querySelectorAll('[data-role="doy-center-line"]').length,
      gapLabels: svg.querySelectorAll('[data-role="doy-bottom-seal-label"]').length,
      sealPieces: svg.querySelectorAll('[data-role="doy-bottom-seal-region"]').length
    }
  })
  expect(result.centreWidth).toBe(80)
  expect(result.gussetWidth).toBe(65)
  expect(result.ovalWidth * .375).toBeCloseTo(result.centreWidth / 2 - 7.5)
  expect(result.midlines).toBe(2)
  expect(result.centreFolds).toBe(1)
  expect(result.oldBounds).toBe(0)
  expect(result.gapLabels).toBe(0)
  expect(result.sealPieces).toBe(1)
})

test("@beta V5.3 DOY requires trim for two eyemarks", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { projectFromLegacySpec } = await import("/packages/cutter-engine/project/index.ts")
    const { validateForExport } = await import("/packages/cutter-engine/validation/index.ts")
    const base = getPackModule("doy-pouch")!.getDefaults()
    const withTwo = { ...base, eyeMarks: { ...base.eyeMarks!, count: 2 as const } }
    const withoutTrim = projectFromLegacySpec("doy-pouch", "v5-3-no-trim", withTwo)
    const withTrim = projectFromLegacySpec("doy-pouch", "v5-3-trim", {
      ...withTwo, doyPouch: { ...withTwo.doyPouch!, trimEnabled: true }
    })
    const hasRule = (project: typeof withoutTrim) => validateForExport(project).messages.some(issue => issue.code === "DOY_EYEMARK_TRIM_REQUIRED")
    return { withoutTrim: hasRule(withoutTrim), withTrim: hasRule(withTrim) }
  })
  expect(result).toEqual({ withoutTrim: true, withTrim: false })
})
