import {
  PARAMETER_CONSTRAINTS,
  PARAMETER_DEFAULTS,
  ensureFinite
} from "../../core/model/parameterSchema"
import { resolveKSealPouchGeometry } from "../../geometry/kSealPouchGeometry"
import {
  getKSealEyemarkSize,
  getKSealEyemarkThresholds
} from "../../rules/kSealEyemarkRules"
import type { PackValidationResult } from "../../packs/packModule"
import type { FlowwrapSpec } from "../../types/flowwrap"

const MIN_KSEAL_APEX_SPAN_MM = 20

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function validateBaseDimension(
  errors: string[],
  value: number,
  minimum: number,
  message: string
) {
  if (!Number.isFinite(value) || value < minimum) {
    errors.push(message)
  }
}

export function validateKSealSpec(spec: FlowwrapSpec): PackValidationResult {
  const errors: string[] = []

  validateBaseDimension(
    errors,
    ensureFinite(spec.width, PARAMETER_DEFAULTS.base.width),
    ensureFinite(PARAMETER_CONSTRAINTS.base.width.min, 1),
    "Width must be greater than 0mm."
  )
  validateBaseDimension(
    errors,
    ensureFinite(spec.height, PARAMETER_DEFAULTS.base.height),
    ensureFinite(PARAMETER_CONSTRAINTS.base.height.min, 1),
    "Height must be greater than 0mm."
  )
  validateBaseDimension(
    errors,
    ensureFinite(spec.seal, PARAMETER_DEFAULTS.base.seal),
    ensureFinite(PARAMETER_CONSTRAINTS.base.seal.min, 1),
    "Seal must be greater than 0mm."
  )

  const seals = spec.seals
  if (seals) {
    const sealEntries = [
      ["top", seals.top],
      ["bottom", seals.bottom],
      ["left", seals.left],
      ["right", seals.right]
    ] as const
    for (const [name, value] of sealEntries) {
      if (value !== undefined && (!isFiniteNumber(value) || value < 0)) {
        errors.push(`Seal ${name} must be 0mm or greater.`)
      }
    }
  }

  const kSeal = spec.kSealPouch
  if (!kSeal) {
    errors.push("K-seal settings are required.")
    return { errors }
  }

  const sealWidth = ensureFinite(
    kSeal.sealWidth,
    PARAMETER_DEFAULTS.kSeal.sealWidth
  )
  if (sealWidth < ensureFinite(PARAMETER_CONSTRAINTS.kSeal.sealWidth.min, 0)) {
    errors.push("K-seal seal width must be 0mm or greater.")
  }

  if (
    kSeal.pouchHeight !== undefined &&
    (!isFiniteNumber(kSeal.pouchHeight) ||
      kSeal.pouchHeight < PARAMETER_CONSTRAINTS.kSeal.pouchHeight.min)
  ) {
    errors.push("K-seal pouch height must be greater than 0mm.")
  }

  if (
    kSeal.pouchWidth !== undefined &&
    (!isFiniteNumber(kSeal.pouchWidth) ||
      kSeal.pouchWidth < PARAMETER_CONSTRAINTS.kSeal.pouchWidth.min)
  ) {
    errors.push("K-seal pouch width must be greater than 0mm.")
  }

  if (
    kSeal.sideSeal !== undefined &&
    (!isFiniteNumber(kSeal.sideSeal) ||
      kSeal.sideSeal < PARAMETER_CONSTRAINTS.kSeal.sideSeal.min ||
      kSeal.sideSeal > PARAMETER_CONSTRAINTS.kSeal.sideSeal.max)
  ) {
    errors.push("K-seal side seals must be between 5mm and 20mm.")
  }

  if (
    kSeal.trim !== undefined &&
    (!isFiniteNumber(kSeal.trim) ||
      kSeal.trim < PARAMETER_CONSTRAINTS.kSeal.trim.min ||
      kSeal.trim > PARAMETER_CONSTRAINTS.kSeal.trim.max)
  ) {
    errors.push("K-seal trim must be between 5mm and 25mm.")
  }

  if (kSeal.trimEnabled !== false) {
    const trim = ensureFinite(kSeal.trim, PARAMETER_DEFAULTS.kSeal.trim)
    if (
      trim < PARAMETER_CONSTRAINTS.kSeal.trim.min ||
      trim > PARAMETER_CONSTRAINTS.kSeal.trim.max
    ) {
      errors.push("K-seal trim must be between 5mm and 25mm when trim is enabled.")
    }
  }

  if (
    kSeal.bottomSeal !== undefined &&
    (!isFiniteNumber(kSeal.bottomSeal) ||
      kSeal.bottomSeal < PARAMETER_CONSTRAINTS.kSeal.bottomSeal.min)
  ) {
    errors.push("K-seal bottom seal must be greater than 0mm.")
  }

  if (
    kSeal.gussetSize !== undefined &&
    (!isFiniteNumber(kSeal.gussetSize) ||
      kSeal.gussetSize < PARAMETER_CONSTRAINTS.kSeal.gussetSize.min)
  ) {
    errors.push("K-seal gusset size must be 0mm or greater.")
  }

  if (
    kSeal.customArmDegreeEnabled &&
    (!isFiniteNumber(kSeal.armDegree) ||
      kSeal.armDegree < PARAMETER_CONSTRAINTS.kSeal.armDegree.min ||
      kSeal.armDegree > PARAMETER_CONSTRAINTS.kSeal.armDegree.max)
  ) {
    errors.push("K-seal custom arm degree must be between 30 and 60 degrees.")
  }

  if (
    kSeal.armWidth !== undefined &&
    (!isFiniteNumber(kSeal.armWidth) ||
      kSeal.armWidth < PARAMETER_CONSTRAINTS.kSeal.armWidth.min ||
      kSeal.armWidth > PARAMETER_CONSTRAINTS.kSeal.armWidth.max)
  ) {
    errors.push("K-seal arm width must be between 5mm and 20mm.")
  }

  if (kSeal.trimEnabled === false && spec.eyeMarks?.count === 2) {
    errors.push("K-seal trim must be enabled to use two eyemarks.")
  }
  if (spec.eyeMarks && (spec.eyeMarks.count === 1 || spec.eyeMarks.count === 2)) {
    const thresholds = getKSealEyemarkThresholds(spec.eyeMarks.count)
    const belowCritical = Array.from(
      { length: spec.eyeMarks.count },
      (_, index) => getKSealEyemarkSize(spec.eyeMarks!, index)
    ).some(size =>
      size.width < thresholds.criticalMinimum.width ||
      size.height < thresholds.criticalMinimum.height
    )
    if (belowCritical) {
      errors.push(
        spec.eyeMarks.count === 1
          ? "K-seal single eyemark must be at least 8mm by 4mm."
          : "K-seal dual eyemarks must each be at least 5mm by 4mm."
      )
    }
  }

  if (
    kSeal.midSectionWidthRatio !== undefined &&
    (!isFiniteNumber(kSeal.midSectionWidthRatio) ||
      kSeal.midSectionWidthRatio < PARAMETER_CONSTRAINTS.kSeal.midSectionWidthRatio.min ||
      kSeal.midSectionWidthRatio > PARAMETER_CONSTRAINTS.kSeal.midSectionWidthRatio.max)
  ) {
    errors.push("K-seal mid section width ratio must be between 0 and 1.")
  }

  if (
    kSeal.shoulderHeightRatio !== undefined &&
    (!isFiniteNumber(kSeal.shoulderHeightRatio) ||
      kSeal.shoulderHeightRatio < PARAMETER_CONSTRAINTS.kSeal.shoulderHeightRatio.min ||
      kSeal.shoulderHeightRatio > PARAMETER_CONSTRAINTS.kSeal.shoulderHeightRatio.max)
  ) {
    errors.push("K-seal shoulder height ratio must be between 0 and 1.")
  }

  if (
    kSeal.sideGuideOffset !== undefined &&
    (!isFiniteNumber(kSeal.sideGuideOffset) ||
      kSeal.sideGuideOffset < PARAMETER_CONSTRAINTS.kSeal.sideGuideOffset.min)
  ) {
    errors.push("K-seal side guide offset must be 0mm or greater.")
  }

  if (
    kSeal.centerOffsetX !== undefined &&
    !isFiniteNumber(kSeal.centerOffsetX)
  ) {
    errors.push("K-seal center offset must be a finite number.")
  }

  if (
    kSeal.gussetDepth !== undefined &&
    (!isFiniteNumber(kSeal.gussetDepth) ||
      kSeal.gussetDepth < PARAMETER_CONSTRAINTS.kSeal.gussetDepth.min)
  ) {
    errors.push("K-seal gusset depth must be 0mm or greater.")
  }

  if (
    kSeal.gussetDepthRatio !== undefined &&
    (!isFiniteNumber(kSeal.gussetDepthRatio) ||
      kSeal.gussetDepthRatio < PARAMETER_CONSTRAINTS.kSeal.gussetDepthRatio.min)
  ) {
    errors.push("K-seal gusset depth ratio must be 0 or greater.")
  }

  if (kSeal.topApexY !== undefined && !isFiniteNumber(kSeal.topApexY)) {
    errors.push("K-seal top apex Y must be a finite number.")
  }

  if (kSeal.bottomApexY !== undefined && !isFiniteNumber(kSeal.bottomApexY)) {
    errors.push("K-seal bottom apex Y must be a finite number.")
  }

  if (
    isFiniteNumber(kSeal.topApexY) &&
    isFiniteNumber(kSeal.bottomApexY)
  ) {
    if (kSeal.bottomApexY <= kSeal.topApexY) {
      errors.push("K-seal bottom apex must be below the top apex.")
    } else {
      const minSpan = Math.max(MIN_KSEAL_APEX_SPAN_MM, sealWidth * 2)
      if (kSeal.bottomApexY - kSeal.topApexY < minSpan) {
        errors.push(
          `K-seal apex span must be at least ${minSpan}mm.`
        )
      }
    }
  }

  if (errors.length > 0) {
    return { errors }
  }

  try {
    const geometry = resolveKSealPouchGeometry(spec)
    const values = [
      geometry.width,
      geometry.height,
      geometry.sealWidth,
      geometry.gussetDepth,
      geometry.midSectionWidth,
      geometry.shoulderHeight,
      geometry.sideGuideOffset,
      geometry.leftGuideX,
      geometry.rightGuideX,
      geometry.centerX,
      geometry.topApexY,
      geometry.bottomApexY,
      geometry.topShoulderY,
      geometry.bottomShoulderY,
      geometry.leftFoldX,
      geometry.rightFoldX
    ]
    if (values.some(value => !Number.isFinite(value))) {
      return {
        errors: ["K-seal geometry could not be resolved from the current parameters."]
      }
    }
    const expectedWidth =
      geometry.pouchHeight * 2 +
      geometry.gussetSize * 2 +
      (geometry.trimEnabled ? geometry.trim * 2 : 0)
    const epsilon = 0.0001
    if (Math.abs(geometry.renderedWidth - expectedWidth) > epsilon) {
      return {
        errors: ["K-seal rendered width does not match the pouch/trim/gusset formula."]
      }
    }
    if (
      Math.abs(geometry.centerX - geometry.width / 2) > epsilon ||
      Math.abs(geometry.centerX - geometry.leftFoldX - geometry.gussetSize) > epsilon ||
      Math.abs(geometry.rightFoldX - geometry.centerX - geometry.gussetSize) > epsilon
    ) {
      return {
        errors: ["K-seal centre line and gusset must resolve symmetrically."]
      }
    }
    for (const arm of geometry.armLines) {
      const armEndsOnLeftBottomSeal = arm.side.endsWith("left")
      const bottomSealMinX = armEndsOnLeftBottomSeal
        ? geometry.leftBottomSealX
        : geometry.rightBottomSealX
      const bottomSealMaxX = bottomSealMinX + geometry.bottomSealAreaWidth
      const bottomSealGuideX =
        bottomSealMinX + geometry.bottomSealAreaWidth / 2
      const usableMinX = geometry.trimWidth
      const usableMaxX = geometry.width - geometry.trimWidth
      const inBounds =
        arm.startX >= usableMinX - epsilon &&
        arm.startX <= usableMaxX + epsilon &&
        arm.endX >= bottomSealMinX &&
        arm.endX <= bottomSealMaxX &&
        Math.abs(arm.endX - bottomSealGuideX) <= epsilon &&
        arm.startY >= 0 &&
        arm.startY <= geometry.height &&
        arm.endY >= geometry.sideSeal &&
        arm.endY <= geometry.height - geometry.sideSeal
      if (!inBounds) {
        return {
          errors: ["K-seal arms must stay inside valid seal and cutter bounds."]
        }
      }
    }
  } catch {
    return {
      errors: ["K-seal geometry could not be resolved from the current parameters."]
    }
  }

  return { errors }
}
