import { expect, test } from "./helpers/testState"

test("@beta DOY and K-Seal Fit outlines use their construction contours", async ({ page }) => {
  await page.goto("/")
  const contours = await page.evaluate(async () => {
    const packs = await import("/apps/web/src/packs/index.ts")
    const { getSafeZoneFit } = await import("/packages/cutter-engine/actions/safeZoneFit.ts")
    return ["doy-pouch", "k-seal-pouch"].map(packId => {
      const module = packs.getPackModule(packId)!
      const zone = { id: `fit-${packId}`, label: "Fit", x: 20, y: 20, width: 20, height: 20, enabled: true }
      const spec = { ...module.getDefaults(), safeZones: [zone] }
      const fit = getSafeZoneFit(spec, zone.id)
      if (!fit.enabled) return { packId, shape: "none", squareStroke: "", path: "" }
      const svg = module.render({ ...spec, safeZones: [fit.zone] })
      const outline = svg.querySelector<SVGRectElement>('[data-role="safe-zone-outline"]')
      const shaped = svg.querySelector<SVGPathElement>('[data-role="safe-zone-arc"], [data-role="safe-zone-k-arm"]')
      return { packId, shape: shaped?.getAttribute("data-role") ?? "none", squareStroke: outline?.getAttribute("stroke") ?? "", path: shaped?.getAttribute("d") ?? "" }
    })
  })
  expect(contours[0].shape).toBe("safe-zone-arc")
  expect(contours[1].shape).toBe("safe-zone-k-arm")
  expect(contours.every(item => item.squareStroke === "none" && item.path.length > 30)).toBe(true)
})

test("@beta stepped cutter tabs share a clear buffer below sub-measures", async ({ page }) => {
  await page.goto("/")
  const offsets = await page.evaluate(async () => {
    const packs = await import("/apps/web/src/packs/index.ts")
    const { attachStepNavigation, STEP_TAG_OFFSET_PX } = await import("/apps/web/src/ui/stepNavigation.ts")
    return ["paper-strip", "sachet-3-side-seal", "sachet-4-side-seal"].map(packId => {
      const module = packs.getPackModule(packId)!
      const original = module.getDefaults()
      const spec = packId === "paper-strip"
        ? { ...original, paperStrip: { ...original.paperStrip!, stepping: { stepCount: 2, gap: 0 } } }
        : { ...original, sachet: { ...original.sachet!, stepEnabled: true, stepCount: 2 } }
      const host = document.createElement("div")
      host.style.cssText = "width:800px;height:400px;position:relative"
      const svg = module.render(spec)
      host.append(svg)
      document.body.append(host)
      const detach = attachStepNavigation(host, svg, spec, () => {})
      const step = svg.querySelector<SVGSVGElement>('svg[data-repeat-id]')!
      const tag = step.querySelector<SVGGElement>('[data-step-tag]')!
      const zoom = Math.hypot(step.getScreenCTM()!.a, step.getScreenCTM()!.b)
      const expectedY = Number(step.getAttribute("height")) + STEP_TAG_OFFSET_PX / zoom
      const actualY = Number(tag.getAttribute("transform")!.match(/translate\([^ ]+ ([^)]+)/)![1])
      detach?.()
      host.remove()
      return { packId, expectedY, actualY, offset: STEP_TAG_OFFSET_PX }
    })
  })
  expect(offsets.map(item => item.packId)).toEqual(["paper-strip", "sachet-3-side-seal", "sachet-4-side-seal"])
  expect(offsets.every(item => item.offset === 30 && Math.abs(item.actualY - item.expectedY) < .001)).toBe(true)
})
