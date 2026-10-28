import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { runInNewContext } from "node:vm"
import ts from "typescript"

class SvgNode {
  constructor(tag = "g") {
    this.tagName = tag
    this.attributes = {}
    this.children = []
    this.textContent = ""
  }
  setAttribute(name, value) { this.attributes[name] = String(value) }
  getAttribute(name) { return this.attributes[name] ?? null }
  appendChild(node) { this.children.push(node); return node }
  querySelectorAll() { return [] }
  remove() { this.removed = true }
}

const source = await readFile("apps/web/src/renderers/paperStripMeasurements.ts", "utf8")
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText
const exports = {}
runInNewContext(code, {
  exports,
  document: { createElementNS: (_namespace, tag) => new SvgNode(tag) },
  require: name => {
    if (name === "../core/formatMetric") return { formatMetricMeasurement: value => `${value}mm` }
    throw new Error(`Unexpected dependency: ${name}`)
  }
})

const layer = new SvgNode()
const cutter = { x: 0, y: 0, width: 400, height: 200 }
const layout = {
  cutterRect: cutter,
  totalWidth: 400,
  totalHeight: 200,
  measurements: {
    overallWidth: 400,
    overallHeight: 200,
    firstInstanceCutterRect: cutter
  },
  instances: [{
    index: 0,
    cutterRect: cutter,
    liveRect: { x: 20, y: 20, width: 360, height: 160 },
    seals: { left: 20, right: 20 },
    clearStripRect: { x: 150, y: 20, width: 100, height: 160 },
    clearStripRects: [{ x: 150, y: 20, width: 100, height: 160 }]
  }]
}
exports.renderPaperStripMeasurements(layer, layout, { main: true, sub: true })

const roles = layer.children.map(node => node.attributes["data-role"])
const mainRows = layer.children.filter(node => node.attributes["data-role"]?.startsWith("paper-strip-measure-main"))
assert.ok(mainRows.some(node => node.attributes["data-role"] === "paper-strip-measure-main-width"), "Full layout width is a main measure")
assert.ok(mainRows.some(node => node.attributes["data-role"] === "paper-strip-measure-main-step-width:0"), "Each stepped cutter receives a main width measure")
for (const role of ["paper-strip-measure-main-left-seal:0", "paper-strip-measure-main-working-area:0", "paper-strip-measure-main-right-seal:0"]) {
  assert.ok(roles.includes(role), `Missing main breakdown: ${role}`)
}
const subMeasures = layer.children.filter(node => node.attributes["data-role"]?.startsWith("paper-strip-measure-clear-strip") || node.attributes["data-role"]?.startsWith("paper-strip-measure-solid"))
assert.equal(subMeasures.length, 3, "Bottom sub-measures show both paper edges and the clear strip")
assert.ok(subMeasures.every(node => Number(node.children.find(child => child.tagName === "line")?.attributes.y1) > cutter.y + cutter.height), "Clear-strip sub-measures sit below the cutter")
console.log("Amends v13 Paper Strip main and bottom sub-measure hierarchy verified")
