import { validateFlowwrapSpec } from "../apps/web/src/constraints/flowwrap"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function expectError(spec: FlowwrapSpec, contains: string) {
  const result = validateFlowwrapSpec(spec)
  assert(
    result.errors.some(error => error.includes(contains)),
    `Expected error containing "${contains}", got: ${result.errors.join("; ")}`
  )
}

function expectNoErrors(spec: FlowwrapSpec) {
  const result = validateFlowwrapSpec(spec)
  assert(result.errors.length === 0, result.errors.join("; "))
}

function expectWarning(spec: FlowwrapSpec, contains: string) {
  const result = validateFlowwrapSpec(spec)
  assert(
    result.warnings.some(warning => warning.includes(contains)),
    `Expected warning containing "${contains}", got: ${result.warnings.join("; ")}`
  )
  assert(
    !result.errors.some(error => error.includes(contains)),
    `Seal overlap must not be returned as a hard error: ${result.errors.join("; ")}`
  )
}

const baseSpec: FlowwrapSpec = {
  width: 300,
  height: 180,
  seal: 10,
  sealClearance: 5,
  bleed: 3,
  safeZones: [
    {
      id: "sz1",
      label: "Primary",
      x: 20,
      y: 20,
      width: 80,
      height: 40
    }
  ]
}

expectNoErrors(baseSpec)

expectError({ ...baseSpec, width: 0 }, "Width must be greater than 0mm")
expectError({ ...baseSpec, height: -10 }, "Height must be greater than 0mm")
expectError({ ...baseSpec, seal: 0 }, "Seal must be greater than 0mm")
expectError({ ...baseSpec, bleed: -1 }, "Bleed must be 0mm or greater")
expectError({ ...baseSpec, sealClearance: 3 }, "Seal clearance must be at least")
expectError(
  {
    ...baseSpec,
    safeZones: Array.from({ length: 11 }, (_, index) => ({
      id: `sz${index}`,
      label: `Zone ${index}`,
      x: 10,
      y: 10,
      width: 20,
      height: 20
    }))
  },
  "No more than 10 safe zones are allowed"
)

expectWarning(
  {
    ...baseSpec,
    safeZones: [
      {
        id: "sz1",
        label: "Overlap",
        x: 2,
        y: 2,
        width: 50,
        height: 30
      }
    ]
  },
  "Safe zone needs more seal clearance"
)

expectWarning(
  {
    ...baseSpec,
    attributeBoxes: [
      { id: "bbe-seal", kind: "bbe", x: -5, y: 20, width: 20, height: 10 }
    ]
  },
  "Attribute box needs more seal clearance"
)

console.log("Flowwrap constraint tests passed.")
