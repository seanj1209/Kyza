import { createManualProjectFromDashboard, expect, openExportMenu, readCurrentProject, test } from "./helpers/testState"

test("@beta Lidding V2 retains blue contours, centers lids and rescales smaller cutters", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { liddingPack } = await import("/apps/web/src/packs/liddingPack.ts")
    const { resolveLiddingLayout, setLiddingOverallSize, updateLiddingSpec, validateLiddingSpec } = await import("/apps/web/src/constraints/lidding.ts")
    const base = liddingPack.getDefaults()
    const stepped = updateLiddingSpec(base, { across: 2, around: 2, innerLines: false })
    const svg = liddingPack.render(stepped)
    const cell = resolveLiddingLayout(stepped).cells[0]
    const shrunk = setLiddingOverallSize(base, { height: 190 })
    return {
      greenInner: svg.querySelectorAll('[data-role="lidding-inner-edge"]').length,
      blueCuts: svg.querySelectorAll('[data-role="lid-outer-cut"]').length,
      blueInner: svg.querySelectorAll('[data-role="lid-inner-seal"]').length,
      centerX: cell.x - cell.slitX - (cell.slitWidth - cell.width) / 2,
      centerY: cell.y - cell.slitY - (cell.slitHeight - cell.height) / 2,
      shrink: { lid: shrunk.lidding!.outerCutHeight, cutter: shrunk.lidding!.overallHeight, errors: validateLiddingSpec(shrunk).errors },
      keep: setLiddingOverallSize(base, { height: 230 }).lidding!.outerCutHeight,
      scale: setLiddingOverallSize(base, { height: 230 }, true).lidding!.outerCutHeight,
    }
  })
  expect(result.greenInner).toBe(0)
  expect(result.blueCuts).toBe(4)
  expect(result.blueInner).toBe(8)
  expect(result.centerX).toBeCloseTo(0)
  expect(result.centerY).toBeCloseTo(0)
  expect(result.shrink.cutter).toBe(190)
  expect(result.shrink.lid).toBeLessThan(190)
  expect(result.shrink.errors).toEqual([])
  expect(result.keep).toBe(190)
  expect(result.scale).toBeGreaterThan(190)
})

test("@beta AMENDS 9 measures, gusset and advisory use actual cutter geometry", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { getPackModule } = await import("/apps/web/src/packs/index.ts")
    const { resolveKSealLayout } = await import("/apps/web/src/core/geometry/resolvers/resolveKSealLayout.ts")
    const { resolveDoyBounds } = await import("/apps/web/src/core/geometry/resolvers/doyBounds.ts")
    const { eyemarkCutterEdgeAdvisoryRule } = await import("/packages/cutter-engine/validation/betaValidation.ts")
    const kSpec = getPackModule("k-seal-pouch")!.getDefaults()
    const kLayout = resolveKSealLayout(kSpec)
    document.documentElement.setAttribute("data-sub-measures", "true")
    const kSvg = getPackModule("k-seal-pouch")!.render(kSpec)
    document.documentElement.setAttribute("data-sub-measures", "false")
    const preview = document.createElement("div")
    preview.style.cssText = "position:fixed;left:20px;top:20px;width:1000px;height:440px;z-index:99999;background:white"
    kSvg.style.width = "100%"; kSvg.style.height = "100%"
    preview.append(kSvg); document.body.append(preview)
    const firstSpan = kLayout.topMeasureSegments.find(segment => segment.index === 1)!
    const doy = getPackModule("doy-pouch")!.getDefaults()
    const dSvg = getPackModule("doy-pouch")!.render({ ...doy, doyPouch: { ...doy.doyPouch!, trimEnabled: true, trim: 15 } })
    const dBounds = resolveDoyBounds(doy, { originX: 80, liveOriginX: 80, liveWidth: doy.width, cutterWidth: doy.width })!
    const side = getPackModule("3-side-seal-pouch")!.render(getPackModule("3-side-seal-pouch")!.getDefaults())
    const edgeSpec = { ...getPackModule("plain-film")!.getDefaults(), eyeMarks: { count: 1, position: "top-left" as const, width: 10, height: 6, offsetX: -1 } }
    const edgeAdvice = eyemarkCutterEdgeAdvisoryRule.evaluate({ cutterSpecification: { legacySpec: edgeSpec }, packTypeId: "plain-film", cutterElements: [] } as any)
    return {
      kSpan: firstSpan.endX - firstSpan.startX,
      kCutterToSeal: kLayout.originX + kLayout.geometry.leftFoldX - firstSpan.startX,
      kLabels: [...kSvg.querySelectorAll('[data-layer-id="measurement-guides"] text')].map(node => node.textContent),
      doyArc: dBounds.centerLeft - dBounds.arcLeftX,
      doyGusset: dBounds.centerWidth / 2,
      doyClip: dSvg.querySelector('[data-role="doy-seal-visual"]')?.getAttribute("clip-path"),
      sideCaps: side.querySelectorAll('[data-role="main-measure-width-cap"]').length,
      advice: edgeAdvice.map(issue => ({ severity: issue.severity, message: issue.message })),
    }
  })
  expect(result.kSpan).toBe(200)
  await page.screenshot({ path: "test-results/amends-v9-kseal-measures.png" })
  expect(result.kCutterToSeal).toBe(200)
  expect(result.kLabels).not.toContain("190mm")
  expect(result.kLabels.filter(label => label === "200mm")).toHaveLength(2)
  expect(result.doyArc).toBeCloseTo(result.doyGusset)
  expect(result.doyClip).toBeTruthy()
  expect(result.sideCaps).toBe(2)
  expect(result.advice).toEqual([{ severity: "advisory", message: "Consider moving eyemark from edge of cutter to 1.5mm, to allow for conversion tolerances" }])
})

test("@beta 2SS and 3SS eyemarks drag only within their trim bands", async ({ page }) => {
  await page.goto("/")
  for (const packId of ["2-side-seal-pouch", "3-side-seal-pouch"]) {
    await page.evaluate(async id => {
      document.querySelector("#side-pouch-test")?.remove()
      const { getPackModule } = await import("/apps/web/src/packs/index.ts")
      const { attachSidePouchEyemarkInteractions } = await import("/apps/web/src/ui/sidePouchEyemarkInteractions.ts")
      const spec = getPackModule(id)!.getDefaults()
      const svg = getPackModule(id)!.render(spec)
      const frame = document.createElement("div")
      frame.id = "side-pouch-test"
      frame.style.cssText = "position:fixed;left:20px;top:20px;width:1000px;height:440px;z-index:99999;background:white"
      svg.style.width = "100%"; svg.style.height = "100%"
      frame.append(svg); document.body.append(frame)
      svg.setAttribute("data-select-enabled", "true")
      attachSidePouchEyemarkInteractions(svg, spec, next => { (window as any).__sidePouchResult = next })
    }, packId)
    const mark = page.locator('#side-pouch-test [data-role="eye-mark"][data-eye-index="0"]')
    const box = (await mark.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 250, box.y + box.height / 2 + 70, { steps: 8 })
    await page.mouse.up()
    const result = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>("#side-pouch-test svg")!
      const mark = svg.querySelector<SVGRectElement>('[data-role="eye-mark"][data-eye-index="0"]')!
      const trim = svg.querySelector<SVGRectElement>('[data-role="pouch-trim"][data-trim-side="left"]')!
      return { x: Number(mark.getAttribute("x")), right: Number(mark.getAttribute("x")) + Number(mark.getAttribute("width")),
        trimX: Number(trim.getAttribute("x")), trimRight: Number(trim.getAttribute("x")) + Number(trim.getAttribute("width")),
        offsetY: (window as any).__sidePouchResult?.eyeMarks?.offsetY }
    })
    expect(result.x).toBeGreaterThanOrEqual(result.trimX)
    expect(result.right).toBeLessThanOrEqual(result.trimRight)
    expect(result.offsetY).toBeGreaterThan(0)
    if (packId === "3-side-seal-pouch") await page.screenshot({ path: "test-results/amends-v9-3ss-eyemark.png" })
  }
})

test("@beta Lidding V2 offers Keep or Scale for growth and rescues a reduction", async ({ page }) => {
  await page.goto("/cutter")
  for (let index = 0; index < 15; index++) {
    if (await page.locator('.studio-pack-carousel .slide.is-active').getAttribute('data-pack-id') === 'lidding') break
    await page.locator('.studio-pack-carousel .next').click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await setup.getByRole("button", { name: "Square lid" }).click()
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const cutterHeight = page.getByRole("spinbutton", { name: "Overall cutter height" })
  await cutterHeight.fill("230")
  await cutterHeight.blur()
  const choice = page.getByRole("dialog", { name: "Resize lidding cutter" })
  await expect(choice).toBeVisible()
  await page.screenshot({ path: "test-results/lidding-v2-resize-choice.png" })
  await choice.getByRole("button", { name: "Keep lid config" }).click()
  await expect(page.getByRole("region", { name: "Lid dock" }).getByRole("spinbutton", { name: "Outer cutter height" })).toHaveValue("190")
  await expect(cutterHeight).toHaveValue("230")
  await cutterHeight.fill("190")
  await cutterHeight.blur()
  await expect(choice).not.toBeVisible()
  await expect(cutterHeight).toHaveValue("190")
  const reduced = Number(await page.getByRole("region", { name: "Lid dock" }).getByRole("spinbutton", { name: "Outer cutter height" }).inputValue())
  expect(reduced).toBeLessThan(190)
})

test("@beta 3SS eyemark stays in trim when dragged on the Studio canvas", async ({ page }) => {
  await createManualProjectFromDashboard(page, { name: "V9 3SS eyemark", packLabel: "3-Side Seal Pouch" })
  await page.locator('button[aria-label^="Selection Mode"]').first().click()
  const mark = page.locator('#preview-canvas svg[data-side-pouch] [data-role="eye-mark"][data-eye-index="0"]')
  const beforeY = Number(await mark.getAttribute("y"))
  const before = (await mark.boundingBox())!
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 160, before.y + before.height / 2 + 55, { steps: 8 })
  await page.mouse.up()
  expect(Number(await mark.getAttribute("y"))).toBeGreaterThan(beforeY)
  const bounds = await page.evaluate(() => {
    const root = document.querySelector<SVGSVGElement>('#preview-canvas svg[data-side-pouch]')!
    const mark = root.querySelector<SVGRectElement>('[data-role="eye-mark"][data-eye-index="0"]')!
    const trim = root.querySelector<SVGRectElement>('[data-role="pouch-trim"][data-trim-side="left"]')!
    return { x: Number(mark.getAttribute("x")), right: Number(mark.getAttribute("x")) + Number(mark.getAttribute("width")),
      left: Number(trim.getAttribute("x")), trimRight: Number(trim.getAttribute("x")) + Number(trim.getAttribute("width")) }
  })
  expect(bounds.x).toBeGreaterThanOrEqual(bounds.left)
  expect(bounds.right).toBeLessThanOrEqual(bounds.trimRight)
  page.once("dialog", prompt => prompt.accept("V9 3SS eyemark"))
  await openExportMenu(page)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect.poll(async () => (await readCurrentProject(page))?.cutter?.legacySpec?.eyeMarks?.offsetY).toBeGreaterThan(0)
})
