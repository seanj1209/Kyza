import { transformSelectedElements } from "../packages/cutter-engine/actions/selectionTransforms"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const spec: FlowwrapSpec = {
  width: 120,
  height: 100,
  seal: 10,
  seals: { top: 10, bottom: 10, left: 10, right: 10 },
  safeZones: [{ id: "safe-1", label: "Safe", x: 5, y: 5, width: 20, height: 20 }],
  windows: [{ id: "window-1", shape: "rectangle", x: 10, y: 10, width: 20, height: 20 }],
  attributeBoxes: [{ id: "bbe-1", kind: "bbe", x: 70, y: 60, width: 20, height: 15 }],
  eyeMarks: {
    count: 2,
    position: "centre",
    width: 10,
    height: 5,
    width2: 10,
    height2: 5,
    color: "black"
  },
  foldLines: [{ id: "fold-1", orientation: "vertical", offset: 25 }],
  perfs: {
    mode: "regulated",
    separation: 5,
    originX: 15,
    originY: 10,
    diameter: 1.5,
    lanes: [{ id: "perf-1", originX: 15, originY: 10 }]
  }
}

const moved = transformSelectedElements(spec, {
  kind: "nudge",
  selectedIds: [
    "safe-zone:safe-1",
    "window:window-1",
    "attribute-box:bbe-1",
    "eye-mark:1",
    "fold-line:fold-1",
    "perf-lane:0"
  ],
  deltaX: 5,
  deltaY: -2
})

assert(moved.changed, "A mixed selection must produce one shared transform result.")
assert(moved.spec.safeZones?.[0].x === 10, "Safe-zone nudge must persist in mm state.")
assert(moved.spec.windows?.[0].y === 8, "Window nudge must persist in mm state.")
assert(moved.spec.attributeBoxes?.[0].x === 75, "BBE nudge must persist in mm state.")
assert(moved.spec.eyeMarks?.offsetX2 === 5, "Second-eyemark state must remain independent.")
assert(moved.spec.foldLines?.[0].offset === 30, "Fold-line nudge must update its source offset.")
assert(moved.spec.perfs?.lanes?.[0].originY === 8, "Perf-lane nudge must update regulated Y.")

const resized = transformSelectedElements(spec, {
  kind: "resize",
  selectedIds: ["window:window-1", "attribute-box:bbe-1"],
  deltaWidth: 6,
  deltaHeight: 4
})
assert(resized.spec.windows?.[0].width === 26, "Window resize must update real width.")
assert(resized.spec.attributeBoxes?.[0].height === 19, "BBE resize must update real height.")

const sealOverlap = transformSelectedElements(spec, {
  kind: "nudge",
  selectedIds: ["safe-zone:safe-1", "window:window-1", "attribute-box:bbe-1"],
  deltaX: -20,
  deltaY: -20
})
assert(
  sealOverlap.spec.safeZones?.[0].x === -10 && sealOverlap.spec.safeZones?.[0].y === -10,
  "Safe zones must move through seal areas and stop only at the cutter boundary."
)
assert(
  sealOverlap.spec.windows?.[0].x === -10 && sealOverlap.spec.windows?.[0].y === -10,
  "Windows must remain movable through seal areas."
)

const rightSealOverlap = transformSelectedElements(spec, {
  kind: "nudge",
  selectedIds: ["attribute-box:bbe-1"],
  deltaX: 20,
  deltaY: 0
})
assert(
  rightSealOverlap.spec.attributeBoxes?.[0].x === 90,
  "BBE boxes must remain movable into the right seal area without leaving the cutter."
)

console.log("Shared selection transform tests passed.")

// Custom dimensions are annotations: transforms must not change pack construction.
const dimensionSpec:FlowwrapSpec={width:200,height:140,seal:10,customMeasures:[{id:"m",start:{x:30,y:40},end:{x:70,y:40}}]}
const movedDimension=transformSelectedElements(dimensionSpec,{kind:"nudge",selectedIds:["custom-measure:m"],deltaX:2,deltaY:3}).spec
assert(movedDimension.customMeasures![0].start.x===32&&movedDimension.customMeasures![0].end.y===43,"Nudge both dimension endpoints in physical mm")
const rotatedDimension=transformSelectedElements(dimensionSpec,{kind:"rotate",selectedIds:["custom-measure:m"],degrees:90}).spec
assert(Math.abs(rotatedDimension.customMeasures![0].end.x-30)<1e-8&&rotatedDimension.customMeasures![0].end.y===80,"Rotate dimension about its first endpoint")
const resizedDimension=transformSelectedElements(dimensionSpec,{kind:"resize",selectedIds:["custom-measure:m"],deltaWidth:5,deltaHeight:2}).spec
assert(resizedDimension.customMeasures![0].end.x===75&&resizedDimension.customMeasures![0].end.y===42,"Resize only the selected dimension")
assert([movedDimension,rotatedDimension,resizedDimension].every(s=>s.width===200&&s.height===140&&s.seal===10),"Dimension transforms preserve construction")
assert(dimensionSpec.customMeasures![0].start.x===30,"Dimension transforms are immutable")
