import { buildEyeMarkRects } from "../apps/web/src/geometry/eyeMarks"
import {
  clearEyeMarkOffsetsForIndex,
  getEyeMarkOffsetsForIndex,
  setEyeMarkOffsetsForIndex
} from "../apps/web/src/geometry/eyeMarkState"
import type { EyeMarkSpec } from "../apps/web/src/types/eyeMarks"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const baseSpec: EyeMarkSpec = {
  count: 2,
  position: "top",
  width: 10,
  height: 5,
  width2: 10,
  height2: 5,
  color: "black"
}

const firstMoved = setEyeMarkOffsetsForIndex(baseSpec, 0, 3, 0)
assert(firstMoved.offsetX === 3, `Expected eyemark 1 offsetX to be 3, got ${firstMoved.offsetX}`)
assert(firstMoved.offsetX2 === undefined, "Expected eyemark 2 offsetX to remain untouched.")

const secondMoved = setEyeMarkOffsetsForIndex(firstMoved, 1, -2, 0)
assert(secondMoved.offsetX === 3, `Expected eyemark 1 offsetX to stay 3, got ${secondMoved.offsetX}`)
assert(secondMoved.offsetX2 === -2, `Expected eyemark 2 offsetX to be -2, got ${secondMoved.offsetX2}`)

const firstOffsets = getEyeMarkOffsetsForIndex(secondMoved, 0)
const secondOffsets = getEyeMarkOffsetsForIndex(secondMoved, 1)
assert(firstOffsets.offsetX === 3, `Expected eyemark 1 offsets to stay independent, got ${firstOffsets.offsetX}`)
assert(secondOffsets.offsetX === -2, `Expected eyemark 2 offsets to stay independent, got ${secondOffsets.offsetX}`)

const rects = buildEyeMarkRects(secondMoved, 0, 0, 100, 100, {
  seals: { top: 10, bottom: 10, left: 10, right: 10 }
})
assert(rects.length === 2, `Expected two eyemark rects, got ${rects.length}`)
assert(rects[0].x !== rects[1].x, "Expected two eyemarks to resolve to different X positions.")

const resetSecond = clearEyeMarkOffsetsForIndex(secondMoved, 1)
assert(resetSecond.offsetX2 === undefined, "Expected eyemark 2 offsetX to clear on reset.")
assert(resetSecond.manualPositioned2 === false, "Expected eyemark 2 manual flag to clear on reset.")

console.log("Eye mark position helpers passed.")
