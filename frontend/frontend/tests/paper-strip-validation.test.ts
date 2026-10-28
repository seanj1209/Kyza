import {
  clampPaperStripClearStripAttribute,
  createPaperStripClearStripAttribute,
  getPaperStripLaneIndexAtX,
  validatePaperStripSpec
} from "../apps/web/src/constraints/paperStrip"
import { composePaperStripPack } from "../apps/web/src/core/packComposer/composePaperStripPack"
import {
  getPaperStripHorizontalSegments,
  getPaperStripMainWidthOffset,
  renderPaperStripMeasurements
} from "../apps/web/src/renderers/paperStripMeasurements"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function createBasePaperStripSpec(): FlowwrapSpec {
  return {
    width: 310,
    height: 260,
    seal: 10,
    sealClearance: 5,
    bleed: 3,
    substrate: "paper",
    seals: {
      top: 10,
      bottom: 10,
      left: 10,
      right: 10
    },
    safeZones: [],
    attributeBoxes: [
      {
        id: "attr-barcode",
        kind: "barcode",
        x: 20,
        y: 20,
        width: 25,
        height: 15,
        enabled: false,
        selected: false
      },
      {
        id: "attr-qr",
        kind: "qr",
        x: 20,
        y: 40,
        width: 10,
        height: 10,
        enabled: false,
        selected: false
      },
      {
        id: "attr-bbe",
        kind: "bbe",
        x: 20,
        y: 55,
        width: 25,
        height: 15,
        enabled: false,
        selected: false
      }
    ],
    paperStrip: {
      paperColor: "#8B5A2B",
      stepping: {
        stepCount: 1,
        gap: 0
      }
    }
  }
}

const validLegacySpec = createBasePaperStripSpec()
validLegacySpec.paperStrip = {
  ...validLegacySpec.paperStrip,
  clearStripWindow: {
    stripCount: 1,
    stripWidth: 50,
    positionX: 15
  }
}
const validResult = validatePaperStripSpec(validLegacySpec)
assert(validResult.errors.length === 0, validResult.errors.join("; "))

const overflowSpec = createBasePaperStripSpec()
overflowSpec.width = 100
overflowSpec.paperStrip = {
  ...overflowSpec.paperStrip,
  clearStripWindow: {
    stripCount: 1,
    stripWidth: 80,
    positionX: 15
  }
}
const overflowResult = validatePaperStripSpec(overflowSpec)
assert(
  overflowResult.errors.includes("Clear strip group does not fit within live width"),
  `Expected clear strip overflow error, got: ${overflowResult.errors.join("; ")}`
)

const invalidPositionSpec = createBasePaperStripSpec()
invalidPositionSpec.paperStrip = {
  ...invalidPositionSpec.paperStrip,
  clearStripWindow: {
    stripCount: 1,
    stripWidth: 50,
    positionX: 999
  }
}
const invalidPositionValidation = validatePaperStripSpec(invalidPositionSpec)
assert(
  invalidPositionValidation.errors.some(error =>
    error.includes("Clear strip position must be between")
  ),
  `Expected clear strip position bounds error, got: ${invalidPositionValidation.errors.join("; ")}`
)

const defaultComposed = composePaperStripPack(createBasePaperStripSpec())
assert(
  defaultComposed.normalizedSpec.safeZones?.length === 0,
  `Expected no default safe zones, got ${defaultComposed.normalizedSpec.safeZones?.length ?? 0}`
)
assert(
  !defaultComposed.normalizedSpec.attributeBoxes?.some(box => box.kind === "clear-strip"),
  "Expected paper strip to start without a clear-strip attribute"
)
assert(
  defaultComposed.layout.measurements.overallWidth === 310,
  `Expected overall paper strip width to be 310, got ${defaultComposed.layout.measurements.overallWidth}`
)
assert(
  defaultComposed.layout.measurements.overallHeight === 260,
  `Expected overall paper strip height to be 260, got ${defaultComposed.layout.measurements.overallHeight}`
)

const migratedSpec = createBasePaperStripSpec()
migratedSpec.paperStrip = {
  ...migratedSpec.paperStrip,
  clearStripWindow: {
    stripCount: 2,
    stripWidth: 50,
    positionX: 0,
    selectedLaneIndex: 1,
    lanes: [
      { laneIndex: 0, positionX: 20, stripWidth: 40 },
      { laneIndex: 1, positionX: 60, stripWidth: 55 }
    ]
  },
  stepping: {
    stepCount: 3,
    gap: 0
  }
}
const migratedComposed = composePaperStripPack(migratedSpec)
const migratedClearStrips =
  migratedComposed.normalizedSpec.attributeBoxes?.filter(box => box.kind === "clear-strip") ?? []
assert(
  migratedClearStrips.length === 2,
  `Expected 2 migrated clear-strip attributes, got ${migratedClearStrips.length}`
)
assert(
  migratedClearStrips[0]?.laneIndex === 0 && migratedClearStrips[1]?.laneIndex === 1,
  `Expected migrated lane indexes [0,1], got [${migratedClearStrips.map(box => box.laneIndex).join(", ")}]`
)
assert(
  migratedClearStrips[0]?.width === 40 && migratedClearStrips[1]?.width === 55,
  `Expected migrated strip widths [40,55], got [${migratedClearStrips.map(box => box.width).join(", ")}]`
)
assert(
  migratedComposed.layout.instances[0]?.clearStripRect?.width === 40,
  `Expected lane 0 strip width to be 40, got ${migratedComposed.layout.instances[0]?.clearStripRect?.width ?? "none"}`
)
assert(
  migratedComposed.layout.instances.every(instance => instance.clearStripRects.map(rect => rect.width).join(",") === "40,55"),
  "Migrated strips must be measured on every mirrored repeat, matching the drawing"
)
assert(
  migratedComposed.layout.instances[2]?.clearStripRects.length === 2,
  "The third mirrored repeat must retain both migrated clear strips"
)

const attributeSpec = createBasePaperStripSpec()
attributeSpec.paperStrip = {
  ...attributeSpec.paperStrip,
  stepping: {
    stepCount: 2,
    gap: 0
  }
}
attributeSpec.attributeBoxes = [
  ...(attributeSpec.attributeBoxes ?? []),
  {
    id: "attr-clear-strip-1",
    kind: "clear-strip",
    laneIndex: 1,
    x: 30,
    y: 0,
    width: 45,
    height: 260,
    enabled: true,
    selected: true
  }
]
const attributeComposed = composePaperStripPack(attributeSpec)
assert(
  attributeComposed.layout.instances[0]?.clearStripRect?.width === 45,
  "Mirrored repeat zero must measure the same attribute-based strip as repeat one"
)
assert(
  attributeComposed.layout.instances[1]?.clearStripRect?.width === 45,
  `Expected lane 1 attribute-based clear strip width to be 45, got ${attributeComposed.layout.instances[1]?.clearStripRect?.width ?? "none"}`
)
assert(
  attributeComposed.layout.clearStrip.selectedLaneIndex === 1,
  `Expected selected lane index from clear-strip attribute to be 1, got ${attributeComposed.layout.clearStrip.selectedLaneIndex ?? "none"}`
)

// Dragging to either side must preserve the strip width, including at the
// boundary, and must not alter the pack's overall dimensions.
const edgeSpec = createBasePaperStripSpec()
const baseStrip = createPaperStripClearStripAttribute(edgeSpec, 0)
const movedRight = clampPaperStripClearStripAttribute(edgeSpec, { ...baseStrip, x: 999 })
const movedLeft = clampPaperStripClearStripAttribute(edgeSpec, { ...baseStrip, x: -999 })
assert(movedRight.x === 245 && movedRight.width === 50,
  `Right-bound move changed width/position: ${movedRight.x}/${movedRight.width}`)
assert(movedLeft.x === 15 && movedLeft.width === 50,
  `Left-bound move changed width/position: ${movedLeft.x}/${movedLeft.width}`)
assert(edgeSpec.width === 310, "Strip movement must not narrow the film width")

// A dragged strip can enter any step, with lane changes at cutter boundaries.
const threeSteps = createBasePaperStripSpec()
threeSteps.paperStrip = {
  ...threeSteps.paperStrip,
  stepping: { stepCount: 3, gap: 10 }
}
assert(getPaperStripLaneIndexAtX(threeSteps, 314, 0) === 0, "Lane 0 boundary changed")
assert(getPaperStripLaneIndexAtX(threeSteps, 316, 0) === 1, "Drag must enter lane 1")
assert(getPaperStripLaneIndexAtX(threeSteps, 636, 0) === 2, "Drag must enter lane 2")
assert(getPaperStripLaneIndexAtX(threeSteps, 9999, 0) === 2, "Drag must stop at last lane")

// Three steps may independently hold two, one and two windows. Additional
// windows must not be placed directly over existing windows in that step.
const fiveStrips: NonNullable<FlowwrapSpec["attributeBoxes"]> = []
for (const laneIndex of [0, 1, 2, 0, 2]) {
  const currentSpec = { ...threeSteps, attributeBoxes: fiveStrips }
  const created = createPaperStripClearStripAttribute(currentSpec, laneIndex, {
    id: `test-strip-${fiveStrips.length + 1}`
  })
  fiveStrips.push(created)
}
const fiveStripComposed = composePaperStripPack({
  ...threeSteps,
  attributeBoxes: fiveStrips
})
const normalizedStrips =
  fiveStripComposed.normalizedSpec.attributeBoxes?.filter(box => box.kind === "clear-strip") ?? []
assert(normalizedStrips.length === 5, "Five clear strips must survive normalization")
for (const [laneIndex, expectedCount] of [[0, 2], [1, 1], [2, 2]]) {
  const laneStrips = normalizedStrips.filter(box => box.laneIndex === laneIndex)
  assert(laneStrips.length === expectedCount,
    `Expected ${expectedCount} strips on lane ${laneIndex}, got ${laneStrips.length}`)
  for (let index = 0; index < laneStrips.length; index += 1) {
    for (let other = index + 1; other < laneStrips.length; other += 1) {
      assert(
        laneStrips[index].x + laneStrips[index].width <= laneStrips[other].x ||
        laneStrips[other].x + laneStrips[other].width <= laneStrips[index].x,
        `New strips must not overlap in lane ${laneIndex}`
      )
    }
  }
}
assert(fiveStripComposed.layout.totalWidth === 950, "Three stepped cutter widths must remain 950mm")


// Multiple clear strips divide the cutter into alternating solid and clear
// sections. The screenshot case must remain 175/100/280/100/120 across 775mm,
// and changes to strip geometry must be reflected without changing overall size.
const multiStripMeasurementSpec: FlowwrapSpec = {
  ...createBasePaperStripSpec(),
  width: 775,
  height: 300,
  seal: 0,
  sealClearance: 0,
  seals: { top: 0, bottom: 0, left: 0, right: 0 },
  paperStrip: {
    paperColor: "#8B5A2B",
    stepping: { stepCount: 1, gap: 0 }
  },
  attributeBoxes: [
    {
      id: "clear-strip-left",
      kind: "clear-strip",
      laneIndex: 0,
      x: 175,
      y: 0,
      width: 100,
      height: 300,
      enabled: true,
      selected: false
    },
    {
      id: "clear-strip-right",
      kind: "clear-strip",
      laneIndex: 0,
      x: 555,
      y: 0,
      width: 100,
      height: 300,
      enabled: true,
      selected: true
    }
  ]
}
const multiStripLayout = composePaperStripPack(multiStripMeasurementSpec).layout
const multiStripInstance = multiStripLayout.instances[0]
assert(Boolean(multiStripInstance), "Expected one Paper Strip instance")
assert(
  multiStripInstance.clearStripRects.length === 2,
  `Expected both clear-strip rectangles, got ${multiStripInstance.clearStripRects.length}`
)
const screenshotSegments = getPaperStripHorizontalSegments(multiStripInstance)
assert(
  screenshotSegments.map(segment => segment.value).join(",") === "175,100,280,100,120",
  `Expected screenshot sections 175,100,280,100,120, got ${screenshotSegments.map(segment => segment.value).join(",")}`
)
assert(
  screenshotSegments.map(segment => segment.kind).join(",") === "solid,clear,solid,clear,solid",
  `Expected alternating solid/clear sections, got ${screenshotSegments.map(segment => segment.kind).join(",")}`
)
assert(
  screenshotSegments.reduce((total, segment) => total + segment.value, 0) === 775 &&
    multiStripLayout.measurements.overallWidth === 775,
  "Sub-measurements must preserve the 775mm overall width"
)

const dynamicMeasurementSpec: FlowwrapSpec = {
  ...multiStripMeasurementSpec,
  attributeBoxes: multiStripMeasurementSpec.attributeBoxes?.map(box =>
    box.id === "clear-strip-right" ? { ...box, x: 575, width: 80 } : box
  )
}
const dynamicLayout = composePaperStripPack(dynamicMeasurementSpec).layout
const dynamicSegments = getPaperStripHorizontalSegments(dynamicLayout.instances[0])
assert(
  dynamicSegments.map(segment => segment.value).join(",") === "175,100,300,80,120",
  `Expected live geometry sections 175,100,300,80,120, got ${dynamicSegments.map(segment => segment.value).join(",")}`
)
assert(
  dynamicLayout.measurements.overallWidth === 775,
  "Dynamic strip changes must not alter the overall cutter width"
)
assert(
  getPaperStripMainWidthOffset(2, true) === 53,
  "Scaled main width must clear the step and working-area measure rows"
)
assert(
  getPaperStripMainWidthOffset(1, false) === 30,
  "Main width reserves rows for the step and working-area measures"
)

// Minimal SVG fixture: exercise the real renderer, not just the segment helper.
class MeasureNode {
  attrs = new Map<string, string>()
  children: MeasureNode[] = []
  textContent = ""
  setAttribute(key: string, value: string) { this.attrs.set(key, value) }
  getAttribute(key: string) { return this.attrs.get(key) ?? null }
  appendChild(child: MeasureNode) { this.children.push(child); return child }
  querySelectorAll() { return [] }
}
const previousDocument = globalThis.document
globalThis.document = { createElementNS: () => new MeasureNode() } as unknown as Document
for (const stepCount of [2, 4, 10]) {
  const repeated = composePaperStripPack({
    ...multiStripMeasurementSpec,
    paperStrip: { ...multiStripMeasurementSpec.paperStrip, stepping: { stepCount, gap: 8 } }
  }).layout
  assert(repeated.instances.length === stepCount, "Every repeat needs a measurement instance")
  repeated.instances.forEach((instance, index) => {
    const values = getPaperStripHorizontalSegments(instance).map(segment => segment.value).join(",")
    assert(values === "175,100,280,100,120", `Repeat ${index + 1} of ${stepCount} must measure both strips and all gaps: ${values}`)
  })
  const layer = new MeasureNode()
  renderPaperStripMeasurements(layer as unknown as SVGGElement, repeated, { main: false, sub: true })
  assert(layer.children.length === stepCount * 5, "The renderer must draw all five segments on every repeat, including beyond three steps")
}
globalThis.document = previousDocument
const independent = composePaperStripPack({
  ...multiStripMeasurementSpec,
  paperStrip: {
    ...multiStripMeasurementSpec.paperStrip,
    stepping: {
      stepCount: 2, gap: 8, syncMirror: false, activeStep: 0,
      elementsByStep: { 1: { attributeBoxes: dynamicMeasurementSpec.attributeBoxes } }
    }
  }
}).layout
assert(
  getPaperStripHorizontalSegments(independent.instances[1]).map(segment => segment.value).join(",") === "175,100,300,80,120",
  "Independent repeats must measure their own saved strips rather than the active repeat"
)

console.log("Paper strip validation tests passed.")
