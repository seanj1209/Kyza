import type { EyeMarkSpec } from "../types/eyeMarks"

export const KSEAL_EYEMARK_CLEARANCE_MM = 1.5

export const KSEAL_SINGLE_EYEMARK_DEFAULT_WIDTH_MM = 15
export const KSEAL_SINGLE_EYEMARK_DEFAULT_HEIGHT_MM = 5

export const KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_WIDTH_MM = 10
export const KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_HEIGHT_MM = 5
export const KSEAL_SINGLE_EYEMARK_CRITICAL_MIN_WIDTH_MM = 8
export const KSEAL_SINGLE_EYEMARK_CRITICAL_MIN_HEIGHT_MM = 4

export const KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_WIDTH_MM = 7
export const KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_HEIGHT_MM = 5
export const KSEAL_DUAL_EYEMARK_CRITICAL_MIN_WIDTH_MM = 5
export const KSEAL_DUAL_EYEMARK_CRITICAL_MIN_HEIGHT_MM = 4

// Retained as an explicit recommendation alias for older non-beta callers.
export const KSEAL_SINGLE_EYEMARK_RECOMMENDED_MM =
  KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_WIDTH_MM

export type KSealEyemarkThresholds = {
  productionMinimum: { width: number; height: number }
  criticalMinimum: { width: number; height: number }
}

export const getKSealEyemarkThresholds = (
  count: 1 | 2
): KSealEyemarkThresholds => count === 1
  ? {
      productionMinimum: {
        width: KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_WIDTH_MM,
        height: KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_HEIGHT_MM
      },
      criticalMinimum: {
        width: KSEAL_SINGLE_EYEMARK_CRITICAL_MIN_WIDTH_MM,
        height: KSEAL_SINGLE_EYEMARK_CRITICAL_MIN_HEIGHT_MM
      }
    }
  : {
      productionMinimum: {
        width: KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_WIDTH_MM,
        height: KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_HEIGHT_MM
      },
      criticalMinimum: {
        width: KSEAL_DUAL_EYEMARK_CRITICAL_MIN_WIDTH_MM,
        height: KSEAL_DUAL_EYEMARK_CRITICAL_MIN_HEIGHT_MM
      }
    }

export const isKSealSingleEyemarkDefault = (eyeMarks: EyeMarkSpec) =>
  eyeMarks.count === 1 &&
  eyeMarks.width === KSEAL_SINGLE_EYEMARK_DEFAULT_WIDTH_MM &&
  eyeMarks.height === KSEAL_SINGLE_EYEMARK_DEFAULT_HEIGHT_MM

export const getKSealDualEyemarkTarget = (trimWidth: number) =>
  Math.max(0, trimWidth - KSEAL_EYEMARK_CLEARANCE_MM * 2)

export const getKSealEyemarkSize = (eyeMarks: EyeMarkSpec, index: number) => ({
  width: index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width,
  height: index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
})

export const getKSealEyemarkOffsetX = (eyeMarks: EyeMarkSpec, index: number) =>
  index === 1 ? eyeMarks.offsetX2 ?? 0 : eyeMarks.offsetX ?? 0

export const getKSealDualEyemarkClearances = (
  trimWidth: number,
  markWidth: number,
  offsetX: number
) => {
  const centredClearance = (trimWidth - markWidth) / 2
  return {
    outer: centredClearance + offsetX,
    inner: centredClearance - offsetX
  }
}

export const clampKSealDualEyemarkOffset = (
  trimWidth: number,
  markWidth: number,
  offsetX: number
) => {
  const limit = Math.max(
    0,
    (trimWidth - markWidth) / 2 - KSEAL_EYEMARK_CLEARANCE_MM
  )
  return Math.min(limit, Math.max(-limit, offsetX))
}

export const createKSealEyemarkDefaults = (
  count: 1 | 2,
  trimWidth: number
): Partial<EyeMarkSpec> => {
  if (count === 1) {
    return {
      count,
      position: "centre",
      width: KSEAL_SINGLE_EYEMARK_DEFAULT_WIDTH_MM,
      height: KSEAL_SINGLE_EYEMARK_DEFAULT_HEIGHT_MM,
      offsetX: 0,
      offsetY: 0
    }
  }
  const width = getKSealDualEyemarkTarget(trimWidth)
  return {
    count,
    position: "centre",
    width,
    height: KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_HEIGHT_MM,
    width2: width,
    height2: KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_HEIGHT_MM,
    offsetX: 0,
    offsetY: 0,
    offsetX2: 0,
    offsetY2: 0
  }
}

const approximatelyEqual = (left: number, right: number) =>
  Math.abs(left - right) <= 0.0001

const reconcileWidth = (
  currentWidth: number,
  previousTarget: number,
  nextTarget: number
) => approximatelyEqual(currentWidth, previousTarget) || currentWidth > nextTarget
  ? nextTarget
  : currentWidth

/**
 * Preserves user widths below the previous trim target, tracks auto-managed
 * widths, and always clamps widths that no longer fit after a trim reduction.
 */
export const reconcileKSealDualEyemarksForTrim = (
  eyeMarks: EyeMarkSpec,
  previousTrimWidth: number,
  nextTrimWidth: number
): EyeMarkSpec => {
  if (eyeMarks.count !== 2) return eyeMarks
  const previousTarget = getKSealDualEyemarkTarget(previousTrimWidth)
  const nextTarget = getKSealDualEyemarkTarget(nextTrimWidth)
  const first = getKSealEyemarkSize(eyeMarks, 0)
  const second = getKSealEyemarkSize(eyeMarks, 1)
  const width = reconcileWidth(first.width, previousTarget, nextTarget)
  const width2 = reconcileWidth(second.width, previousTarget, nextTarget)
  return {
    ...eyeMarks,
    position: "centre",
    width,
    height: first.height,
    width2,
    height2: second.height,
    offsetX: clampKSealDualEyemarkOffset(
      nextTrimWidth,
      width,
      eyeMarks.offsetX ?? 0
    ),
    offsetX2: clampKSealDualEyemarkOffset(
      nextTrimWidth,
      width2,
      eyeMarks.offsetX2 ?? 0
    )
  }
}

export const fitKSealDualEyemarksToTrim = (
  eyeMarks: EyeMarkSpec,
  trimWidth: number
): EyeMarkSpec => {
  if (eyeMarks.count !== 2) return eyeMarks
  const targetWidth = getKSealDualEyemarkTarget(trimWidth)
  const first = getKSealEyemarkSize(eyeMarks, 0)
  const second = getKSealEyemarkSize(eyeMarks, 1)
  return {
    ...eyeMarks,
    position: "centre",
    width: targetWidth,
    height: Math.max(
      KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_HEIGHT_MM,
      first.height
    ),
    width2: targetWidth,
    height2: Math.max(
      KSEAL_DUAL_EYEMARK_PRODUCTION_MIN_HEIGHT_MM,
      second.height
    ),
    offsetX: 0,
    offsetX2: 0,
    manualPositioned: false,
    manualPositioned2: false
  }
}

export const applyKSealEyemarkSizeFix = (
  eyeMarks: EyeMarkSpec,
  trimWidth: number
): EyeMarkSpec => {
  if (eyeMarks.count === 2) {
    return fitKSealDualEyemarksToTrim(eyeMarks, trimWidth)
  }
  return {
    ...eyeMarks,
    width: Math.max(
      eyeMarks.width,
      KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_WIDTH_MM
    ),
    height: Math.max(
      eyeMarks.height,
      KSEAL_SINGLE_EYEMARK_PRODUCTION_MIN_HEIGHT_MM
    )
  }
}

export const applyKSealEyemarkCentreFix = (
  eyeMarks: EyeMarkSpec,
  trimWidth: number
): EyeMarkSpec => {
  const constrained = eyeMarks.count === 2
    ? reconcileKSealDualEyemarksForTrim(eyeMarks, trimWidth, trimWidth)
    : eyeMarks
  return {
    ...constrained,
    position: "centre",
    offsetX: 0,
    offsetX2: constrained.count === 2 ? 0 : undefined,
    manualPositioned: false,
    manualPositioned2: constrained.count === 2 ? false : undefined
  }
}
