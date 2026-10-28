import { createManualProjectFromDashboard, expect, test } from "./helpers/testState"

async function startLidding(page: import("@playwright/test").Page) {
  await page.goto("/cutter")
  const next = page.locator(".studio-pack-carousel .next")
  for (let index = 0; index < 15; index++) {
    if (await page.locator(".studio-pack-carousel .slide.is-active").getAttribute("data-pack-id") === "lidding") break
    await next.click()
  }
  await page.locator('[data-action="start-project"]').click()
  const setup = page.getByRole("dialog", { name: "Lidding cutter setup" })
  await expect(setup).toBeVisible()
  await expect(setup.locator(".lidding-style-card")).toHaveCount(3)
  await setup.getByRole("button", { name: "Square lid" }).click()
  await expect(setup).toHaveCount(0)
  return page.getByRole("region", { name: "Lid dock" })
}

test("@beta Lidding multipack uses outer cutter lanes and one single mark", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { liddingPack } = await import("/apps/web/src/packs/liddingPack.ts")
    const { liddingEyemarkInstances, updateLiddingSpec } = await import("/apps/web/src/constraints/lidding.ts")
    const { renderLidding } = await import("/apps/web/src/renderers/liddingSvg.ts")
    const base = liddingPack.getDefaults()
    const right = updateLiddingSpec(base, { across: 3, around: 3, multipack: true })
    const left = updateLiddingSpec(right, { multipackSingleSide: "left" })
    const oneAround = updateLiddingSpec(right, { around: 1 })
    const nodes = [...renderLidding(right).querySelectorAll('[data-role="eye-mark"]')]
    return {
      right: liddingEyemarkInstances(right).map(item => [item.row, item.column, item.sideIndex]),
      left: liddingEyemarkInstances(left).map(item => [item.row, item.column, item.sideIndex]),
      oneAroundEnabled: oneAround.lidding?.multipack,
      rendered: nodes.map(node => [node.getAttribute("data-eye-side"), node.getAttribute("data-slit-cell")]),
    }
  })
  expect(result.right).toEqual([[0, 0, 0], [0, 2, 1], [1, 0, 0], [2, 0, 0]])
  expect(result.left).toEqual([[0, 0, 0], [0, 2, 1], [1, 2, 1], [2, 2, 1]])
  expect(result.oneAroundEnabled).toBe(false)
  expect(result.rendered).toEqual([["0", "1A"], ["1", "3A"], ["0", "1B"], ["0", "1C"]])
})

test("@beta Lidding style starts in one click and multipack controls follow Around", async ({ page }) => {
  const dock = await startLidding(page)
  await expect(page.locator('#preview-canvas svg[data-pack="lidding"]')).toBeVisible()
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const multipack = page.getByRole("checkbox", { name: "Multipack eyemarks" })
  await expect(multipack).toBeDisabled()
  await dock.getByRole("tab", { name: "Stepping" }).click()
  await dock.getByRole("spinbutton", { name: "Around" }).fill("3")
  await dock.getByRole("spinbutton", { name: "Around" }).blur()
  await expect(multipack).toBeEnabled()
  await multipack.check()
  await expect(page.locator('#preview-canvas svg[data-pack="lidding"] [data-role="eye-mark"]')).toHaveCount(4)
  await page.getByRole("button", { name: "Single eyemark left" }).click()
  const positions = await page.locator('#preview-canvas svg[data-pack="lidding"] [data-role="eye-mark"]').evaluateAll(nodes => nodes.map(node => [node.getAttribute("data-eye-side"), node.getAttribute("data-slit-cell")]))
  expect(positions).toEqual([["0", "1A"], ["1", "1A"], ["1", "1B"], ["1", "1C"]])
})

test("@beta Lidding remembers growth choice and exposes it in Cutter preferences", async ({ page }) => {
  await startLidding(page)
  await page.getByRole("button", { name: "Base", exact: true }).click()
  const width = page.getByRole("spinbutton", { name: "Overall cutter width" })
  await width.fill("230")
  await width.blur()
  const choice = page.getByRole("dialog", { name: "Resize lidding cutter" })
  await expect(choice).toBeVisible()
  expect((await choice.boundingBox())!.height).toBeLessThan(300)
  await choice.getByRole("checkbox", { name: "Remember this choice" }).check()
  await choice.getByRole("button", { name: "Scale lid config" }).click()
  await expect(choice).toHaveCount(0)
  await page.getByRole("spinbutton", { name: "Overall cutter height" }).fill("240")
  await page.getByRole("spinbutton", { name: "Overall cutter height" }).blur()
  await expect(choice).toHaveCount(0)
  await expect(page.getByRole("spinbutton", { name: "Overall cutter height" })).toHaveValue("240")
  await page.goto("/account#cutter")
  await expect(page.getByRole("combobox", { name: "Scaling behavior" })).toHaveValue("scale")
})

test("@beta Lidding keeps a scaling choice made in the earlier review preview", async ({ page }) => {
  await page.goto("/account#cutter")
  await page.evaluate(() => localStorage.setItem("klyro.preferences.pack-types.lidding.scaling", "keep"))
  await page.reload()
  const behavior = page.getByRole("combobox", { name: "Scaling behavior" })
  await expect(behavior).toHaveValue("keep")
  await behavior.selectOption("ask")
  await page.reload()
  await expect(behavior).toHaveValue("ask")
})

test("@beta K Seal shows 200 and 80 only as submeasures", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const { kSealPouchPack } = await import("/apps/web/src/packs/kSealPouchPack.ts")
    const { renderKSealPouch } = await import("/apps/web/src/renderers/kSealPouchSvg.ts")
    const spec = kSealPouchPack.getDefaults()
    document.documentElement.setAttribute("data-main-measures", "true")
    document.documentElement.setAttribute("data-sub-measures", "false")
    const main = [...renderKSealPouch(spec).querySelectorAll('[data-layer-id="measurement-guides"] text')].map(node => node.textContent)
    document.documentElement.setAttribute("data-sub-measures", "true")
    const sub = [...renderKSealPouch(spec).querySelectorAll('[data-role="kseal-submeasure-text"]')].map(node => node.textContent)
    return { main, sub }
  })
  expect(result.main.some(value => value?.includes("200"))).toBe(false)
  expect(result.sub.filter(value => value?.includes("200")).length).toBe(2)
  expect(result.sub.filter(value => value?.includes("80")).length).toBe(1)
  expect(result.sub).toHaveLength(3)
})

for (const packLabel of ["2-Side Seal Pouch", "3-Side Seal Pouch"]) {
  test(`@beta ${packLabel} eyemark double-click selects without text highlighting`, async ({ page }) => {
    await createManualProjectFromDashboard(page, { name: `V9.1 ${packLabel}`, packLabel })
    const svg = page.locator("#preview-canvas svg[data-side-pouch]")
    const mark = svg.locator('[data-role="eye-mark"][data-eye-index="0"]')
    await expect(mark).toBeVisible()
    const box = (await mark.boundingBox())!
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
    await expect(svg).toHaveAttribute("data-select-enabled", "true")
    await expect(svg.locator('[data-selection-id="eye-mark:0"]')).toHaveCount(1)
    const measure = svg.locator('[data-role="main-measure-height"] text').first()
    await expect(measure).toHaveCSS("user-select", "none")
    await measure.dblclick()
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("")
    const dock = page.locator("#dock-shell")
    const frame = page.locator("#preview-frame")
    const dockBox = (await dock.boundingBox())!
    const frameBox = (await frame.boundingBox())!
    expect(dockBox.x + dockBox.width / 2).toBeGreaterThan(frameBox.x + frameBox.width * .35)
    expect(dockBox.x + dockBox.width / 2).toBeLessThan(frameBox.x + frameBox.width * .65)
  })
}
