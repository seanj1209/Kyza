import { expect, test } from "./helpers/testState"

test("PDF item 1: Plain Film renders all compatible element groups and excludes die cuts/openings", async ({ page }) => {
  await page.goto("/")
  const result = await page.evaluate(async () => {
    const path = "/apps/web/src/packs/amends7Packs.ts"
    const { plainFilmPack } = await import(path)
    const spec = {
      ...plainFilmPack.getDefaults(),
      seals: { top: 10, bottom: 5, left: 8, right: 4 },
      safeZones: [{ id: "safe", label: "Safe", x: 20, y: 20, width: 35, height: 30 }],
      windows: [{ id: "window", shape: "rectangle", x: 80, y: 60, width: 25, height: 30 }],
      foldLines: [{ id: "fold", orientation: "vertical", offset: 180 }],
      perfs: { mode: "regulated", originX: 240, originY: 20, count: 3, separation: 15, diameter: 1 },
      attributeBoxes: ["barcode", "qr", "bbe", "label"].map((kind, index) => ({ id: kind, kind, label: kind === "label" ? "FOP" : undefined, x: 25 + index * 55, y: 130, width: 30, height: 15 })),
      eyeMarks: { ...plainFilmPack.getDefaults().eyeMarks, count: 1, position: "centre", offsetX: 15, offsetY: 10 },
      hangerSlots: [{ id: "hanger", type: "hanger-slot", subtype: "round-hole", diameter: 10, centerX: 30, centerY: 20, mirrored: true }],
      halfMoonCutouts: [{ id: "moon", centerX: 30, centerY: 0, radius: 5 }],
    }
    return ["edit", "export"].map(renderMode => {
      const svg = plainFilmPack.render(spec, { renderMode })
      const count = (selector: string) => svg.querySelectorAll(selector).length
      return {
        renderMode,
        safe: count('[data-role="safe-zone-outline"]'),
        window: count('[data-role="window-shape"]'),
        folds: count('[data-role="fold-line"]'),
        perfs: count('[data-role="perf-dot"]'),
        boxes: [...new Set(Array.from(svg.querySelectorAll('[data-box-id]')).map(node => node.getAttribute("data-box-id")))].sort(),
        eyes: count('[data-role="eye-mark"]'),
        seals: count('[data-role="seal-rect"]'),
        forbidden: count('[data-role="hanger-slot"],[data-cutout-id],[data-role="grip-seal"],[data-role="zipper"],[data-role="tear-notch"]'),
        windowX: svg.querySelector('[data-role="window-shape"]')?.getAttribute("x"),
        eyeSafe: svg.querySelector('[data-role="eye-mark"]')?.getAttribute("data-eye-outside-safe"),
        editorLayers: ["seal_areas", "safe_zones", "attribute_boxes", "eyemark_track", "fold_lines", "perf_layer", "window_layer"].every(id => Boolean(svg.querySelector(`#${id}`))),
      }
    })
  })
  for (const rendered of result) {
    expect(rendered).toMatchObject({ safe: 1, window: 1, folds: 1, perfs: 3, eyes: 1, seals: 4, forbidden: 0, windowX: "88", eyeSafe: "false", editorLayers: true })
    expect(rendered.boxes).toEqual(["barcode", "bbe", "label", "qr"])
  }
})

test("PDF item 1: Plain Film eyemarks drag across the film beyond seal bands", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(async () => {
    const packPath = "/apps/web/src/packs/amends7Packs.ts"
    const interactionPath = "/apps/web/src/ui/eyeMarkInteractions.ts"
    const { plainFilmPack } = await import(packPath)
    const { attachEyeMarkInteractions } = await import(interactionPath)
    const spec = plainFilmPack.getDefaults()
    spec.eyeMarks = { ...spec.eyeMarks, count: 1, position: "top-left", selectedIndex: 0 }
    const svg = plainFilmPack.render(spec)
    svg.setAttribute("id", "film-fixture")
    svg.setAttribute("width", "944")
    svg.setAttribute("height", "624")
    svg.setAttribute("data-select-enabled", "true")
    document.body.replaceChildren(svg)
    attachEyeMarkInteractions(svg, spec, next => { (window as any).filmChanged = next })
  })
  const mark = page.locator('#film-fixture [data-role="eye-mark"]')
  const before = await mark.boundingBox()
  expect(before).not.toBeNull()
  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2)
  await page.mouse.down()
  await page.mouse.move(before!.x + before!.width / 2 + 160, before!.y + before!.height / 2 + 100, { steps: 6 })
  await page.mouse.up()
  const changed = await page.evaluate(() => (window as any).filmChanged)
  expect(changed.eyeMarks.offsetX).toBeGreaterThan(50)
  expect(changed.eyeMarks.offsetY).toBeGreaterThan(30)
  expect(Number(await mark.getAttribute("x"))).toBeGreaterThan(50)
})
