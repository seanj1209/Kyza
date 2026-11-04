import assert from "node:assert/strict"
import { build } from "esbuild"
import { chromium } from "@playwright/test"

// Exercise native SVG DOM, text bounds, and the real export serializers in a
// browser. No mocked SVG selectors or substituted strip renderer.
const bundle = await build({
  stdin: {
    contents: `
      export { getPackModule } from './apps/web/src/packs';
      export { resolveBaseCustomisation, applyBaseLayerCustomisation } from './apps/web/src/renderers/baseLayerCustomisation';
      export { updatePaperStripContrast } from './apps/web/src/constraints/paperStripAppearance';
      export { createPreSlitView } from './apps/web/src/ui/preSlitView';
      export { projectFromLegacySpec } from './packages/cutter-engine/project';
      export { buildExportSvgDocument } from './packages/cutter-engine/export/cutterExportService';
      export { createRasterPreviewPdfFromSvg } from './packages/cutter-engine/export/rasterPreviewPdf';
    `,
    resolveDir: process.cwd(), loader: "ts"
  },
  bundle: true, write: false, format: "iife", globalName: "stripQa", platform: "browser",
  loader: { ".css": "empty" }
})
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent('<div id="dock-shell"><div class="dock-more-menu"></div></div>')
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  const result = await page.evaluate(async () => {
    const qa = stripQa
    const check = (value, message) => { if (!value) throw new Error(message) }
    const equal = (actual, expected, message) => check(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`)
    document.documentElement.setAttribute("data-main-measures", "true")
    document.documentElement.setAttribute("data-sub-measures", "true")
    const pack = qa.getPackModule("paper-strip")
    const defaults = pack.getDefaults()
    equal(defaults.seals, { top: 15, bottom: 15, left: 15, right: 15 }, "Default seals")
    equal([defaults.eyeMarks.count, defaults.eyeMarks.width, defaults.eyeMarks.height], [1, 10, 5], "Default eyemark")
    const another = pack.getDefaults()
    another.eyeMarks.count = 0
    check(pack.getDefaults().eyeMarks.count === 1, "Default eyemark objects must be independent")

    const render = (spec, options = {}) => {
      const svg = pack.render(spec, options)
      qa.applyBaseLayerCustomisation(svg, spec)
      document.body.appendChild(svg)
      return svg
    }
    const normalDefaults = render(defaults)
    const mark = normalDefaults.querySelector('[data-role="eye-mark"]')
    equal([mark.getAttribute("x"), mark.getAttribute("y")], ["1.5", "1.5"], "Default mark edge clearance")
    check(mark.getAttribute("fill") === "#000000", "Brown paper uses black ink")
    normalDefaults.querySelectorAll('[data-role="seal-rect"]').forEach(seal => {
      equal([seal.getAttribute("fill"), seal.getAttribute("stroke-dasharray"), seal.getAttribute("opacity")], ["none", "3 2", "0.7"], "Default seal appearance")
    })
    for (const [substrate, color] of [["white-paper", "#000000"], ["black-paper", "#ffffff"]]) {
      const spec = qa.updatePaperStripContrast(defaults, { ...defaults, substrate })
      check(render(spec).querySelector('[data-role="eye-mark"]').getAttribute("fill") === color, `${substrate} contrast`)
      equal([spec.eyeMarks.width, spec.eyeMarks.height], [10, 5], "Changing paper must preserve mark size")
    }
    const custom = { ...defaults, eyeMarks: { ...defaults.eyeMarks, width: 12, offsetX: 23 }, baseCustomisation: qa.resolveBaseCustomisation(defaults) }
    custom.baseCustomisation.eyemark = { color: "#cc1188", opacity: .42 }
    custom.baseCustomisation.seals.color = "#123456"
    const customBefore = JSON.stringify(custom)
    const switched = qa.updatePaperStripContrast(custom, { ...custom, substrate: "black-paper", height: 285 })
    equal(switched.baseCustomisation, custom.baseCustomisation, "Custom ink, opacity and seals survive stock changes")
    equal([switched.eyeMarks.width, switched.eyeMarks.offsetX, switched.height], [12, 23, 285], "Unrelated edits survive stock changes")
    check(JSON.stringify(custom) === customBefore, "Contrast must not mutate the previous project")
    check(render(switched).querySelector('[data-role="eye-mark"]').getAttribute("fill") === "#cc1188", "Manual ink remains editable")
    const materialized = { ...defaults, baseCustomisation: qa.resolveBaseCustomisation(defaults) }
    const materializedBlack = qa.updatePaperStripContrast(materialized, { ...materialized, substrate: "black-paper" })
    check(materializedBlack.baseCustomisation.eyemark.color === "#ffffff", "Changing stock updates materialized automatic ink after unrelated customisation edits")

    const spec = {
      ...defaults, width: 775, height: 300, cutterLegend: true,
      paperStrip: { ...defaults.paperStrip, stepping: { stepCount: 2, gap: 8 } },
      foldLines: [{ id: "fold", orientation: "vertical", offset: 225 }],
      attributeBoxes: [
        { id: "strip1", kind: "clear-strip", x: 175, y: 0, width: 100, height: 300, enabled: true },
        { id: "strip2", kind: "clear-strip", x: 555, y: 0, width: 100, height: 300, enabled: true },
        { id: "bbe", kind: "bbe", x: 20, y: 20, width: 25, height: 15, enabled: true }
      ],
      safeZones: [{ id: "safe", x: 20, y: 20, width: 50, height: 50, enabled: true }],
      windows: [{ id: "window", x: 80, y: 20, width: 20, height: 20, enabled: true }]
    }
    const before = JSON.stringify(spec)
    let toggles = 0
    const view = qa.createPreSlitView(() => toggles++)
    view.sync("strip-a", "paper-strip")
    const button = document.querySelector('[data-pre-slit-toggle]')
    check(!button.hidden, "Strip view toggle is available")
    button.click()
    check(toggles === 1 && button.getAttribute("aria-checked") === "true", "Toggle state and callback")
    const pre = render(spec, view.renderOptions("strip-a", "paper-strip"))
    equal([...pre.querySelectorAll('[data-layer-id]')].map(node => node.getAttribute("data-layer-id")), ["substrate", "cutter-outline", "measurement-guides"], "Pre-slit contains stock fills, cutter and measures, including with legend enabled")
    check(pre.querySelectorAll('[data-role="cutter-outline"]').length === 2, "Both repeats are visible")
    check(pre.querySelectorAll('[data-role="pre-slit-cut"]').length === 8, "Every repeat contains both slits")
    check(!pre.querySelector('[data-role*="seal"], [data-role="eye-mark"]'), "Seals and eyes are omitted")
    equal(pre.querySelectorAll('[data-role="pre-slit-offcut"]').length, 4, "Each clear lane has a red off-cut")
    equal(pre.querySelectorAll('[data-role="pre-slit-working-area"]').length, 6, "Remaining paper lanes retain the chosen substrate")
    check([...pre.querySelectorAll('[data-role="pre-slit-offcut"]')].every(node => node.getAttribute("fill") === "#e02b2b" && node.getAttribute("opacity") === "0.5"), "Off-cuts are red at 50%")
    check([...pre.querySelectorAll('[data-role="pre-slit-working-area"]')].every(node => node.getAttribute("opacity") === "0.8"), "Working stock is at 80%")
    check([...pre.querySelectorAll('[data-role="pre-slit-offcut-label"]')].every(node => node.textContent === 'OFF-CUT' && node.getAttribute("font-weight") === "700" && node.getAttribute("transform")?.startsWith("rotate(-90")), "Off-cut text is bold and vertical")
    check(pre.querySelectorAll('[data-role="paper-strip-measure-main-width"]').length === 1 && !pre.querySelector('[data-role="paper-strip-measure-main-height"], [data-role^="paper-strip-measure-main-step-width"]'), "Pre-slit has one full-width top measure and no height or per-step top measures")
    const sub = [...pre.querySelectorAll('[data-role^="paper-strip-measure-solid"], [data-role^="paper-strip-measure-clear-strip"]')]
    equal(sub.map(node => node.querySelector("text").textContent), Array(2).fill(["175mm", "100mm", "280mm", "100mm", "120mm"]).flat(), "Offcuts and strips retain exact widths without hidden fold subdivisions")
    const bounds = pre.viewBox.baseVal
    for (const text of pre.querySelectorAll("text")) {
      const box = text.getBBox(), matrix = pre.getCTM().inverse().multiply(text.getCTM())
      const corners = [[box.x, box.y], [box.x + box.width, box.y + box.height]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix))
      check(corners.every(point => point.x >= 0 && point.y >= 0 && point.x <= bounds.width && point.y <= bounds.height), `Measurements must fit inside the selected view: ${text.textContent} ${JSON.stringify(corners)}`)
    }
    const fullWidth = bounds.width, fullHeight = bounds.height
    pre.setAttribute("viewBox", "300 80 100 100") // user zoom/pan must not clip export
    const project = qa.projectFromLegacySpec("paper-strip", "Strip QA", spec, { id: "strip-qa" })
    for (const format of ["ai-compatible-svg", "raster-preview-pdf"]) {
      const built = qa.buildExportSvgDocument(project, { format, includeLayers: true, preserveVector: true, marginMm: 0 }, pre)
      equal([built.frame.widthMm, built.frame.heightMm], [fullWidth, fullHeight], `${format} exports full selected view after zoom`)
      const parsed = new DOMParser().parseFromString(built.svgMarkup, "image/svg+xml")
      check(!parsed.querySelector("parsererror"), `${format} output is valid XML`)
      check(parsed.querySelectorAll('[data-role^="paper-strip-measure-solid"], [data-role^="paper-strip-measure-clear-strip"]').length === 10, `${format} retains offcuts`)
      check(parsed.querySelectorAll('[data-role="pre-slit-offcut"]').length === 4 && parsed.querySelectorAll('[data-role="pre-slit-working-area"]').length === 6, `${format} retains stock fills`)
      check(!parsed.querySelector('[data-layer-id="seal-areas"], [data-layer-id="eyemarks"], [data-layer-id="notes"], #cutter_legend'), `${format} omits hidden elements`)
      if (format === "ai-compatible-svg") check(built.svgMarkup.includes('inkscape:groupmode="layer"'), "Illustrator-compatible SVG layers are retained")
    }
    view.sync("other", "plain-film")
    check(button.hidden && view.renderOptions("other", "plain-film").paperStripView === "normal", "Other packs do not inherit pre-slit")
    view.sync("strip-b", "paper-strip")
    check(button.getAttribute("aria-checked") === "false", "Other projects have their own view state")
    view.sync("strip-a", "paper-strip")
    button.click()
    const restored = render(spec, view.renderOptions("strip-a", "paper-strip"))
    check(restored.querySelector('[data-role="seal-rect"]') && restored.querySelector('[data-role="eye-mark"]'), "Normal view restores seals and eyes")
    check(JSON.stringify(spec) === before, "Toggling/rendering/exporting must not mutate saved geometry")
    const zero = { ...defaults, seal: 0, seals: { top: 0, bottom: 0, left: 0, right: 0 }, eyeMarks: { ...defaults.eyeMarks, count: 0 } }
    equal(pack.validate(zero).errors, [], "Zero seals and zero marks are valid")
    check(!render(zero).querySelector('[data-role="seal-rect"], [data-role="eye-mark"]'), "Zero seals and eyes stay absent")

    // Smoke-test the actual PDF rasterizer with a compact selected view.
    const compact = { ...defaults, width: 80, height: 60, attributeBoxes: [], safeZones: [] }
    const compactSvg = render(compact, { paperStripView: "pre-slit" })
    const compactProject = qa.projectFromLegacySpec("paper-strip", "Strip PDF QA", compact, { id: "strip-pdf-qa" })
    const built = qa.buildExportSvgDocument(compactProject, { format: "raster-preview-pdf", includeLayers: true, preserveVector: false, marginMm: 0 }, compactSvg)
    const pdf = await qa.createRasterPreviewPdfFromSvg(built.svgMarkup, built.frame.widthMm, built.frame.heightMm)
    check((await pdf.slice(0, 8).text()).startsWith("%PDF-1.4"), "Selected view produces a real PDF")
    return { offcutMeasures: sub.length, pdfBytes: pdf.size }
  })
  assert.equal(result.offcutMeasures, 10)
  assert.ok(result.pdfBytes > 1000)
  console.log(`Strip QA passed: defaults, contrast/custom ink, view toggle/restoration, offcuts, export bounds, Illustrator SVG and PDF (${result.pdfBytes} bytes).`)
} finally {
  await browser.close()
}
