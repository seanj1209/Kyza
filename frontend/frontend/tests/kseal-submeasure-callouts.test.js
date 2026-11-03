import assert from "node:assert/strict"
import { build } from "esbuild"
import { chromium } from "@playwright/test"

// Use native SVG and the same preview-refresh function as the studio; a direct
// renderer-only test misses the inherited DOY width row that caused the overlap.
const bundle = await build({
  stdin: {
    contents: `
      export { kSealPouchPack } from './apps/web/src/packs/kSealPouchPack';
      export { resolveKSealLayout } from './apps/web/src/core/geometry/resolvers/resolveKSealLayout';
      export { updateSubMeasuresLayer } from './apps/web/src/renderers/flowwrapSvg';
    `,
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "iife", globalName: "ksealQa", platform: "browser",
})
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setContent("<main></main>")
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  const result = await page.evaluate(() => {
    const { kSealPouchPack, resolveKSealLayout, updateSubMeasuresLayer } = ksealQa
    const check = (value, message) => { if (!value) throw new Error(message) }
    const equal = (actual, expected, message) => check(JSON.stringify(actual) === JSON.stringify(expected), `${message}: ${JSON.stringify(actual)}`)
    const labels = (root, selector) => Array.from(root.querySelectorAll(`${selector} text`)).map(node => node.textContent)
    const nonMeasurementMarkup = svg => Array.from(svg.children).filter(node => !["annotations", "measurement_guides"].includes(node.id)).map(node => node.outerHTML)
    document.documentElement.setAttribute("data-main-measures", "true")
    document.documentElement.setAttribute("data-sub-measures", "true")
    const fixtures = [
      { pouchHeight: 200, pouchWidth: 190, gussetSize: 40, trimEnabled: false, trim: 15, legacyCenterWidth: 100 },
      { pouchHeight: 190, pouchWidth: 200, gussetSize: 50, trimEnabled: false, trim: 15, legacyCenterWidth: 80 },
      { pouchHeight: 100, pouchWidth: 160, gussetSize: 35, trimEnabled: true, trim: 10, legacyCenterWidth: 110 },
    ]
    for (const fixture of fixtures) {
      const spec = structuredClone(kSealPouchPack.getDefaults())
      spec.kSealPouch = { ...spec.kSealPouch, ...fixture }
      spec.doyPouch.panelWidths.center = fixture.legacyCenterWidth
      const beforeSpec = JSON.stringify(spec)
      const layout = resolveKSealLayout(spec)
      const svg = kSealPouchPack.render(spec)
      document.body.appendChild(svg)
      const top = () => Array.from(svg.querySelectorAll('[data-role="kseal-submeasure-text"][data-row="top"]')).map(node => node.textContent)
      const expectedTop = layout.topMeasureSegments.map(segment => segment.label)
      equal(top(), expectedTop, "Native K-Seal pack-height spans render")
      const nativeMeasures = svg.querySelector("#measurement_guides").outerHTML
      const geometryMarkup = nonMeasurementMarkup(svg)
      // Control: preserve all existing generic feature/height measures; only
      // the inherited panel-width row is excluded on K-Seal.
      const control = svg.cloneNode(true)
      updateSubMeasuresLayer(control, { ...spec, kSealPouch: undefined })
      const expectedFeatures = labels(control, "#sub_measure_features")
      const expectedHeight = labels(control, "#sub_measure_height")
      check(control.querySelector("#sub_measure_width"), "DOY control retains its panel-width row")
      for (const forcePreview of [false, true, false]) {
        updateSubMeasuresLayer(svg, spec, forcePreview)
        const duplicateLabels = labels(svg, "#sub_measure_width")
        check(!svg.querySelector("#sub_measure_width"), `K-Seal must exclude the legacy DOY panel-width row, found ${duplicateLabels.join(" / ")}`)
        equal(top(), expectedTop, "Keep the true pack-height spans, even when their labels are 100 or 190 mm")
        equal(svg.querySelector("#measurement_guides").outerHTML, nativeMeasures, "All native main, bottom, feature and height measures remain unchanged")
        equal(nonMeasurementMarkup(svg), geometryMarkup, "Every non-measurement geometry layer remains unchanged")
        equal(labels(svg, "#sub_measure_features"), expectedFeatures, "Other feature measures remain unchanged")
        equal(labels(svg, "#sub_measure_height"), expectedHeight, "Other height measures remain unchanged")
      }
      check(JSON.stringify(spec) === beforeSpec, "Rendering and preview refresh must not mutate pack dimensions")
      if (fixture.pouchHeight === 200) {
        equal(layout.width, 480, "Screenshot overall width remains 480 mm")
        equal(top(), ["200mm", "80mm", "200mm"], "Screenshot retains both true 200 mm spans")
      }
    }
    return { fixtures: fixtures.length }
  })
  assert.equal(result.fixtures, 3)
  console.log("K-Seal callout regression passed: no inherited DOY width row; true spans, other measures and geometry preserved across refreshes.")
} finally {
  await browser.close()
}
