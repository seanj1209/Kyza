import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const cache = new Map()
const annotations = []
function load(file) {
  file = resolve(file)
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  runInNewContext(code, { exports, require: name => {
    if (name.endsWith('measurementAnnotations')) return {
      clearMeasurementAnnotations() {},
      updateMeasurementAnnotations(value) { annotations.push(value); return true }
    }
    if (name.endsWith('renderers/flowwrapSvg')) return { updateSubMeasuresLayer() {} }
    if (name.endsWith('renderers/sachetSvg')) return { updateSachetMeasuresLayer() {} }
    if (name.endsWith('preferenceService')) return {
      DEFAULT_PREFERENCES: { moveIncrementMm: .25 }, loadMoveIncrementMm: () => .25
    }
    return load(resolve(dirname(file), name) + '.ts')
  } })
  return exports
}
const { buildFoldLines } = load('apps/web/src/geometry/foldLines.ts')
const { attachFoldLineInteractions } = load('apps/web/src/ui/foldLineInteractions.ts')
const line = (orientation, offset, id = 'fold') => ({ id, orientation, offset })
const segment = spec => buildFoldLines([spec], 32, 20, 40, 310, 160, 35, 315)[0]

for (const offset of [0, .25, 37.5, 80, 159.75, 160, -10, 999]) {
  const result = segment(line('horizontal', offset))
  const y = 40 + Math.min(160, Math.max(0, offset))
  assert.deepEqual([result.x1, result.y1, result.x2, result.y2], [20, y, 330, y],
    `Horizontal offset ${offset} is from cutter top and spans both cutter edges`)
}
for (const [offset, x] of [[0, 35], [3, 35], [37.5, 69.5], [283, 315], [999, 315], [-999, 35]]) {
  const result = segment(line('vertical', offset))
  assert.deepEqual([result.x1, result.y1, result.x2, result.y2], [x, 40, x, 200],
    'Vertical live-origin and clamping semantics stay unchanged')
}
const mixed = buildFoldLines([line('horizontal', 15, 'h'), line('vertical', 25, 'v')], 32, 20, 40, 310, 160, 35, 315)
assert.equal(mixed.map(s => s.id).join(','), 'h,v')
assert.equal(mixed[0].y1, 55)
assert.equal(mixed[1].x1, 57)
assert.equal(buildFoldLines([], 0, 0, 0, 0, 0, 0, 0).length, 0)
assert.equal(buildFoldLines([line('horizontal', 99)], 0, 10, 20, 0, 0, 0, 0)[0].y1, 20)

function node(attrs = {}) {
  const values = { ...attrs }
  return {
    getAttribute: key => values[key] == null ? null : String(values[key]),
    setAttribute: (key, value) => { values[key] = String(value) },
    hasAttribute: key => values[key] != null
  }
}
function fixture(orientation, offset, transform = (x, y) => ({ x: x / 2, y: y / 2 })) {
  const spec = { width: 310, height: 160, foldLines: [line(orientation, offset)] }
  const geometry = segment(spec.foldLines[0])
  const elements = [node({ ...geometry, 'data-line-id': 'fold' }), node({ ...geometry, 'data-line-id': 'fold' })]
  const layers = {
    'g#fold_lines': node({ 'data-live-origin-x': 32, 'data-min-x': 35, 'data-max-x': 315 }),
    'g#seal_areas': node({ 'data-origin-x': 20, 'data-origin-y': 40, 'data-cutter-width': 310, 'data-cutter-height': 160 })
  }
  const handlers = new Map()
  const committed = []
  const svg = {
    ...node({ 'data-select-enabled': 'true' }),
    querySelector: selector => layers[selector] ?? null,
    querySelectorAll: () => elements,
    addEventListener: (name, handler) => handlers.set(name, handler),
    setPointerCapture() {}, releasePointerCapture() {},
    createSVGPoint: () => ({ x: 0, y: 0, matrixTransform() { return transform(this.x, this.y) } }),
    getScreenCTM: () => ({ inverse() { return {} } })
  }
  attachFoldLineInteractions(svg, spec, value => committed.push(value))
  const event = (clientX, clientY) => ({ clientX, clientY, target: elements[0], pointerId: 1, preventDefault() {} })
  return {
    elements, committed, svg,
    down: (x = 100, y = 100) => handlers.get('pointerdown')(event(x, y)),
    move: (x, y) => handlers.get('pointermove')(event(x, y)),
    up: () => handlers.get('pointerup')(event(100, 100))
  }
}
{
  const f = fixture('horizontal', 20.1)
  f.down(); f.move(800, 111); f.up()
  assert.equal(f.committed[0].foldLines[0].offset, 25.5, 'Horizontal drag uses Y, SVG scale and the preference grid')
  for (const element of f.elements) {
    assert.equal(element.getAttribute('x1'), '20')
    assert.equal(element.getAttribute('x2'), '330')
    assert.equal(element.getAttribute('y1'), '65.5')
    assert.equal(element.getAttribute('y2'), '65.5')
    assert.equal(element.getAttribute('cursor'), 'row-resize')
  }
  const measure = annotations.at(-1)
  assert.equal(measure.allowVertical, true)
  assert.equal(measure.allowHorizontal, false)
  assert.equal(measure.objectRect.width, 310)
  assert.equal(measure.objectRect.height, 0)
}
for (const [y, expected] of [[-10000, 0], [10000, 160]]) {
  const f = fixture('horizontal', 20)
  f.down(); f.move(100, y); f.up()
  assert.equal(f.committed[0].foldLines[0].offset, expected, 'Dragging clamps the persisted horizontal offset')
}
{
  const f = fixture('vertical', 20.1)
  f.down(); f.move(111, 800); f.up()
  assert.equal(f.committed[0].foldLines[0].offset, 25.5, 'Vertical drag still uses X')
  assert.equal(f.elements[0].getAttribute('x1'), '57.5')
  assert.equal(f.elements[0].getAttribute('y1'), '40')
  assert.equal(f.elements[0].getAttribute('y2'), '200')
  assert.equal(annotations.at(-1).allowHorizontal, true)
}
for (const [x, expected] of [[-10000, 3], [10000, 283]]) {
  const f = fixture('vertical', 20)
  f.down(); f.move(x, 100); f.up()
  assert.equal(f.committed[0].foldLines[0].offset, expected, 'Vertical drag respects its existing live bounds')
}
{
  const f = fixture('horizontal', 20, (x, y) => ({ x: y / 2, y: -x / 2 }))
  f.down(); f.move(90, 800); f.up()
  assert.equal(f.committed[0].foldLines[0].offset, 25, 'Both start coordinates are transformed for rotated canvases')
}
for (const [attribute, value] of [['data-select-enabled', 'false'], ['data-pan-enabled', 'true'], ['data-measure-enabled', 'true']]) {
  const f = fixture('horizontal', 20)
  f.svg.setAttribute(attribute, value)
  f.down(); f.move(200, 200); f.up()
  assert.equal(f.committed.length, 0, `${attribute} prevents fold dragging`)
}
console.log('Fold lines QA: horizontal offsets, cutter clamps, vertical regression, SVG transforms and drag modes passed.')
