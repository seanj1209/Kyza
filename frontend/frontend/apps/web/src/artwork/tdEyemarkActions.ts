export const TD_EYEMARK_MIN_WIDTH_MM = 5

export type TdEyemarkSide = "left" | "right"

// MVP scope: these helpers apply only to TD/slit-edge clearance actions.
// MD-edge warning logic remains intentionally out of scope for now.

type TdEyemarkDistances = {
  leftDistance: number
  rightDistance: number
  thresholdMm?: number
}

type TdEyemarkReduceInput = TdEyemarkDistances & {
  currentWidthMm: number
  currentOffsetXMm: number
  minWidthMm?: number
}

type TdEyemarkWidthIncreaseInput = TdEyemarkDistances & {
  minimumIncreaseMm?: number
}

export const getTdEyemarkNearestSide = (
  leftDistance: number,
  rightDistance: number
): TdEyemarkSide => (leftDistance <= rightDistance ? "left" : "right")

export const getTdEyemarkClearanceDeficit = ({
  leftDistance,
  rightDistance,
  thresholdMm = 1.5
}: TdEyemarkDistances) => Math.max(0, thresholdMm - Math.min(leftDistance, rightDistance))

export const getTdEyemarkReduceAction = ({
  leftDistance,
  rightDistance,
  currentWidthMm,
  currentOffsetXMm,
  thresholdMm = 1.5,
  minWidthMm = TD_EYEMARK_MIN_WIDTH_MM
}: TdEyemarkReduceInput) => {
  const deficit = getTdEyemarkClearanceDeficit({ leftDistance, rightDistance, thresholdMm })
  const side = getTdEyemarkNearestSide(leftDistance, rightDistance)

  if (!(deficit > 0)) {
    return {
      enabled: false,
      side,
      reason: "TD clearance is already valid."
    } as const
  }

  const nextWidthMm = currentWidthMm - deficit
  if (nextWidthMm < minWidthMm) {
    return {
      enabled: false,
      side,
      reason: "Eyemark cannot be reduced further without going below minimum size."
    } as const
  }

  return {
    enabled: true,
    side,
    nextWidthMm,
    nextOffsetXMm:
      side === "left"
        ? currentOffsetXMm + deficit
        : currentOffsetXMm - deficit
  } as const
}

export const getTdEyemarkWidthIncreaseAction = ({
  leftDistance,
  rightDistance,
  thresholdMm = 1.5,
  minimumIncreaseMm = 2
}: TdEyemarkWidthIncreaseInput) => {
  const deficit = getTdEyemarkClearanceDeficit({ leftDistance, rightDistance, thresholdMm })
  const side = getTdEyemarkNearestSide(leftDistance, rightDistance)

  if (!(deficit > 0)) {
    return {
      enabled: false,
      side,
      reason: "TD clearance is already valid."
    } as const
  }

  if (side === "left") {
    return {
      enabled: false,
      side,
      reason: "Left-side web expansion is not available yet. Use Move inward or Reduce eyemark size."
    } as const
  }

  return {
    enabled: true,
    side,
    widthIncreaseMm: Math.max(minimumIncreaseMm, deficit)
  } as const
}
