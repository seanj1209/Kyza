import { createPackValidator } from "../apps/web/src/engines/validation-engine/createPackValidator"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const validate = createPackValidator("plain-web")

function expectError(spec: FlowwrapSpec, contains: string) {
  const result = validate(spec)
  assert(
    result.errors.some(error => error.includes(contains)),
    `Expected error containing "${contains}", got: ${result.errors.join("; ")}`
  )
}

function expectNoErrors(spec: FlowwrapSpec) {
  const result = validate(spec)
  assert(result.errors.length === 0, result.errors.join("; "))
}

const baseSpec: FlowwrapSpec = {
  width: 460,
  height: 160,
  seal: 0,
  sealClearance: 0,
  bleed: 3,
  seals: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  plainWeb: {
    guideLines: []
  }
}

expectNoErrors(baseSpec)
expectNoErrors({
  ...baseSpec,
  plainWeb: {
    guideLines: [
      {
        id: "slit-left",
        kind: "slit",
        orientation: "vertical",
        offset: 110
      }
    ]
  }
})

expectError({ ...baseSpec, width: -1 }, "Width must be greater than 0mm")
expectError(
  {
    ...baseSpec,
    plainWeb: {
      guideLines: [
        {
          id: "bad-slit",
          kind: "slit",
          orientation: "vertical",
          offset: 1000
        }
      ]
    }
  },
  "offset must be inside the live area"
)

console.log("Plain web validation tests passed.")
