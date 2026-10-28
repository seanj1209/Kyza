import { expect, openExportMenu, readCanonicalProjects, test } from "./helpers/testState"

test("@beta Lidding V1.4 contours keep specified dimensions, strokes and outer edges", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { liddingPack } = await import("/apps/web/src/packs/liddingPack.ts")
    const { liddingSafeAreaMaximum, updateLiddingSpec, validateLiddingSpec } = await import("/apps/web/src/constraints/lidding.ts")
    const spec = updateLiddingSpec(liddingPack.getDefaults(), {
      mode: "manual", outerCutWidth: 180, outerCutHeight: 180, outerBleed: 3,
      sealOuter: 5, sealInner: 3, artworkSafeArea: 169, across: 2, around: 2,
      innerLines: false, pullTabAngle: 135,
    })
    const svg = liddingPack.render(spec)
    const withLines = liddingPack.render(updateLiddingSpec(spec, { innerLines: true }))
    const invalid = updateLiddingSpec(spec, { artworkSafeArea: 170 })
    const outer = svg.querySelector<SVGPathElement>('[data-role="lid-outer-cut"]')!
    const rings = [...withLines.querySelectorAll<SVGPathElement>('g[data-lid-cell="1A"] [data-role^="lid-"]')]
    const safe = withLines.querySelector<SVGPathElement>('[data-layer-id="safe-zones"] path')!
    return {
      max: liddingSafeAreaMaximum(spec.lidding!),
      valid: validateLiddingSpec(spec).errors,
      invalid: validateLiddingSpec(invalid).errors,
      outerStroke: outer.getAttribute("stroke-width"),
      ringStrokes: rings.map(node => node.getAttribute("stroke-width")),
      lidLines: rings.length + 1,
      safeStroke: safe.getAttribute("stroke-width"),
      outerEdges: svg.querySelectorAll('[data-role="lidding-cutter-edge"]').length,
      innerEdges: withLines.querySelectorAll('[data-role="lidding-inner-edge"]').length,
      greenStroke: svg.querySelector('[data-role="lidding-cutter-edge"]')!.getAttribute("stroke-width"),
      angle: outer.getAttribute("data-tab-angle"),
      tabPath: outer.getAttribute("d"),
    }
  })
  expect(result.max).toBe(169)
  expect(result.valid).toEqual([])
  expect(result.invalid.some(issue => issue.includes("inner bleed"))).toBe(true)
  expect(result.outerStroke).toBe("0.4")
  expect(result.lidLines).toBe(5)
  expect(result.ringStrokes.every(width => width === "0.4")).toBe(true)
  expect(result.safeStroke).toBe("0.4")
  expect(result.outerEdges).toBe(1)
  expect(result.innerEdges).toBe(2)
  expect(result.greenStroke).toBe("0.5")
  expect(result.angle).toBe("135")
  expect(result.tabPath).toContain(" L ")
})

test("@beta Lidding V1.4 dock separates configuration, stepping and Base sizing", async ({ page }) => {
  await page.goto("/cutter")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await setup.getByRole("button", { name: "Square lid" }).click()
  const dock = page.getByRole("region", { name: "Lid dock" })
  await expect(dock.getByRole("tab", { name: "Lid Config" })).toHaveAttribute("aria-selected", "true")
  await expect(dock.getByRole("spinbutton", { name: "Outer seal width" })).toBeVisible()
  await expect(dock.getByRole("spinbutton", { name: /^Seal width$/ })).toHaveCount(0)
  await expect(dock.getByRole("spinbutton", { name: "Seal outer size" })).toHaveCount(0)
  await expect(dock.getByRole("slider", { name: "Pull tab angle" })).toBeVisible()
  await dock.getByRole("spinbutton", { name: "Pull tab position (°)" }).fill("90")
  await dock.getByRole("spinbutton", { name: "Pull tab position (°)" }).blur()
  await expect(page.locator('#preview-canvas [data-role="lid-outer-cut"]').first()).toHaveAttribute("data-tab-angle", "90")
  await page.screenshot({ path: "test-results/lidding-v1-4-config.png" })
  await dock.getByRole("tab", { name: "Stepping" }).click()
  await expect(dock.getByRole("spinbutton", { name: "Across" })).toBeVisible()
  await expect(dock.getByRole("spinbutton", { name: "Outer seal width" })).toBeHidden()
  await expect(dock.getByRole("button", { name: "Sync lidding cutter elements" })).toHaveCount(1)
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const overall = page.getByLabel("Overall cutter (slit)")
  await expect(overall.getByRole("spinbutton", { name: "Overall cutter width" })).toBeVisible()
  await expect(dock.getByRole("spinbutton", { name: "Overall cutter width" })).toHaveCount(0)
  await page.screenshot({ path: "test-results/lidding-v1-4-dock.png" })
  page.once("dialog", prompt => prompt.accept("V1.4 positioned pull tab"))
  await openExportMenu(page)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect.poll(async () => (await readCanonicalProjects(page)).find(project => project.cutter.packType === "lidding")?.cutter.legacySpec.lidding.pullTabAngle).toBe(90)
  const saved = (await readCanonicalProjects(page)).find(project => project.cutter.packType === "lidding")!
  await page.goto(`/cutter?projectId=${saved.id}`)
  await expect(page.locator('#preview-canvas [data-role="lid-outer-cut"]').first()).toHaveAttribute("data-tab-angle", "90")
})
