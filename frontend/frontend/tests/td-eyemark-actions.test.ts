import {
  TD_EYEMARK_MIN_WIDTH_MM,
  getTdEyemarkClearanceDeficit,
  getTdEyemarkReduceAction,
  getTdEyemarkWidthIncreaseAction
} from "../apps/web/src/artwork/tdEyemarkActions"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const deficit = getTdEyemarkClearanceDeficit({
  leftDistance: 4,
  rightDistance: 0.5,
  thresholdMm: 1.5
})
assert(deficit === 1, `Expected 1mm clearance deficit, got ${deficit}`)

const rightReduce = getTdEyemarkReduceAction({
  leftDistance: 4,
  rightDistance: 0.5,
  currentWidthMm: 10,
  currentOffsetXMm: 0
})
assert(rightReduce.enabled, "Expected right-side reduction to be enabled.")
assert(rightReduce.nextWidthMm === 9, `Expected width to reduce to 9mm, got ${rightReduce.nextWidthMm}`)
assert(rightReduce.nextOffsetXMm === -1, `Expected right-side offsetX to shift to -1mm, got ${rightReduce.nextOffsetXMm}`)

const leftReduce = getTdEyemarkReduceAction({
  leftDistance: 0.5,
  rightDistance: 4,
  currentWidthMm: 10,
  currentOffsetXMm: 0
})
assert(leftReduce.enabled, "Expected left-side reduction to be enabled.")
assert(leftReduce.nextWidthMm === 9, `Expected width to reduce to 9mm, got ${leftReduce.nextWidthMm}`)
assert(leftReduce.nextOffsetXMm === 1, `Expected left-side offsetX to shift to 1mm, got ${leftReduce.nextOffsetXMm}`)

const minGuard = getTdEyemarkReduceAction({
  leftDistance: 4,
  rightDistance: 0.5,
  currentWidthMm: TD_EYEMARK_MIN_WIDTH_MM,
  currentOffsetXMm: 0
})
assert(!minGuard.enabled, "Expected minimum-width guard to disable reduction.")
assert(
  minGuard.reason === "Eyemark cannot be reduced further without going below minimum size.",
  `Unexpected minimum-width reason: ${minGuard.reason}`
)

const rightIncrease = getTdEyemarkWidthIncreaseAction({
  leftDistance: 4,
  rightDistance: 0.5
})
assert(rightIncrease.enabled, "Expected right-side width increase to be enabled.")
assert(rightIncrease.widthIncreaseMm === 2, `Expected minimum 2mm width increase, got ${rightIncrease.widthIncreaseMm}`)

const groupedIncrease = getTdEyemarkWidthIncreaseAction({
  leftDistance: 4,
  rightDistance: 0.5,
  minimumIncreaseMm: 3
})
assert(groupedIncrease.enabled, "Expected grouped right-side width increase to be enabled.")
assert(groupedIncrease.widthIncreaseMm === 3, `Expected minimum 3mm width increase, got ${groupedIncrease.widthIncreaseMm}`)

const leftIncrease = getTdEyemarkWidthIncreaseAction({
  leftDistance: 0.5,
  rightDistance: 4
})
assert(!leftIncrease.enabled, "Expected left-side width increase to remain disabled.")
assert(
  leftIncrease.reason === "Left-side web expansion is not available yet. Use Move inward or Reduce eyemark size.",
  `Unexpected left-side expansion reason: ${leftIncrease.reason}`
)

console.log("TD eyemark action helpers passed.")
