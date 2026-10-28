import {
  PARAMETER_CONSTRAINTS,
  PARAMETER_DEFAULTS,
  PARAMETER_TOGGLES
} from "../core/model/parameterSchema"
import type { FlowwrapSpec } from "../types/flowwrap"

export type ResolvedKSealPouchSettings = {
  pouchHeight: number
  pouchWidth: number
  sideSeal: number
  trimEnabled: boolean
  trim: number
  trimWidth: number
  bottomSeal: number
  bottomSealAreaWidth: number
  gussetSize: number
  armDegree: number
  customArmDegreeEnabled: boolean
  armWidth: number
  renderedWidth: number
  renderedHeight: number
}

export type KSealDimensionSemantics = {
  finishedWidthMm: number
  finishedHeightMm: number
  flatWidthMm: number
  flatHeightMm: number
}

export function toKSealComposerDimensions(
  dimensions: Pick<KSealDimensionSemantics, "finishedWidthMm" | "finishedHeightMm">
): { pouchHeight: number; pouchWidth: number } {
  return {
    pouchHeight: dimensions.finishedHeightMm,
    pouchWidth: dimensions.finishedWidthMm
  }
}

export type KSealPouchGeometry = ResolvedKSealPouchSettings & {
  width: number
  height: number
  sealWidth: number
  gussetDepth: number
  gussetDepthRatio: number
  midSectionWidth: number
  midSectionWidthRatio: number
  shoulderHeight: number
  shoulderHeightRatio: number
  sideGuideOffset: number
  leftGuideX: number
  rightGuideX: number
  centerOffsetX: number
  centerX: number
  topApexY: number
  bottomApexY: number
  topShoulderY: number
  bottomShoulderY: number
  midY: number
  leftFoldX: number
  rightFoldX: number
  leftTrimX: number
  leftTrimWidth: number
  rightTrimX: number
  rightTrimWidth: number
  leftBottomSealX: number
  rightBottomSealX: number
  leftPanelX: number
  rightPanelX: number
  gussetX: number
  gussetWidth: number
  gussetLeftX: number
  gussetRightX: number
  liveX: number
  liveY: number
  liveWidth: number
  liveHeight: number
  armLines: readonly KSealArmLine[]
}

const DEFAULTS = PARAMETER_DEFAULTS.kSeal
const CONSTRAINTS = PARAMETER_CONSTRAINTS.kSeal
export type KSealArmLine = {
  side: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  position: "inner" | "outer"
  startX: number
  startY: number
  endX: number
  endY: number
}

export type KSealEyeMarkRect = {
  x: number
  y: number
  width: number
  height: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function finiteWithFallback(value: unknown, fallback: number) {
  return isFiniteNumber(value) ? value : fallback
}

function finiteAtLeast(value: unknown, fallback: number, min: number) {
  return Math.max(min, finiteWithFallback(value, fallback))
}

function finiteInRange(value: unknown, fallback: number, min: number, max: number) {
  return clamp(finiteWithFallback(value, fallback), min, max)
}

export function getKSealRenderedWidth(settings: {
  pouchHeight: number
  gussetSize: number
  bottomSeal: number
  trimEnabled: boolean
  trim: number
}) {
  return (
    settings.pouchHeight * 2 +
    settings.gussetSize * 2 +
    (settings.trimEnabled ? settings.trim * 2 : 0)
  )
}

export function resolveKSealPouchSettings(
  spec: FlowwrapSpec
): ResolvedKSealPouchSettings {
  const kSeal = spec.kSealPouch
  const sideSeal = finiteInRange(
    kSeal?.sideSeal ?? kSeal?.sealWidth,
    DEFAULTS.sideSeal,
    CONSTRAINTS.sideSeal.min,
    CONSTRAINTS.sideSeal.max
  )
  const trimEnabled =
    kSeal?.trimEnabled ?? PARAMETER_TOGGLES.kSeal.trimEnabled.default
  const trim = finiteInRange(
    kSeal?.trim,
    DEFAULTS.trim,
    CONSTRAINTS.trim.min,
    CONSTRAINTS.trim.max
  )
  const trimWidth = trimEnabled ? trim : 0
  const bottomSeal = finiteAtLeast(
    kSeal?.bottomSeal ?? kSeal?.sealWidth,
    DEFAULTS.bottomSeal,
    CONSTRAINTS.bottomSeal.min
  )
  const gussetSize = finiteAtLeast(
    kSeal?.gussetSize ?? kSeal?.gussetDepth,
    DEFAULTS.gussetSize,
    CONSTRAINTS.gussetSize.min
  )
  const fixedWidth = gussetSize * 2 + trimWidth * 2
  const legacyPouchHeight = (finiteWithFallback(spec.width, DEFAULTS.pouchHeight) - fixedWidth) / 2
  const pouchHeight = finiteAtLeast(
    kSeal?.pouchHeight,
    legacyPouchHeight > 0 ? legacyPouchHeight : DEFAULTS.pouchHeight,
    CONSTRAINTS.pouchHeight.min
  )
  const pouchWidth = finiteAtLeast(
    kSeal?.pouchWidth,
    finiteWithFallback(spec.height, DEFAULTS.pouchWidth),
    CONSTRAINTS.pouchWidth.min
  )
  const customArmDegreeEnabled =
    kSeal?.customArmDegreeEnabled ??
    PARAMETER_TOGGLES.kSeal.customArmDegreeEnabled.default
  const armDegree = customArmDegreeEnabled
    ? finiteInRange(
        kSeal?.armDegree,
        DEFAULTS.armDegree,
        CONSTRAINTS.armDegree.min,
        CONSTRAINTS.armDegree.max
      )
    : DEFAULTS.armDegree
  const armWidth = finiteInRange(
    kSeal?.armWidth,
    DEFAULTS.armWidth,
    CONSTRAINTS.armWidth.min,
    CONSTRAINTS.armWidth.max
  )
  const renderedWidth = getKSealRenderedWidth({
    pouchHeight,
    gussetSize,
    bottomSeal,
    trimEnabled,
    trim
  })

  return {
    pouchHeight,
    pouchWidth,
    sideSeal,
    trimEnabled,
    trim,
    trimWidth,
    bottomSeal,
    bottomSealAreaWidth: bottomSeal * 2,
    gussetSize,
    armDegree,
    customArmDegreeEnabled,
    armWidth,
    renderedWidth,
    renderedHeight: pouchWidth
  }
}

export function resolveKSealDimensionSemantics(
  spec: FlowwrapSpec
): KSealDimensionSemantics {
  const settings = resolveKSealPouchSettings(spec)
  return {
    // Legacy K-Seal field names describe the old unfolded orientation.
    // Keep that storage contract internal and expose explicit Pack/Cutter axes.
    finishedWidthMm: settings.pouchWidth,
    finishedHeightMm: settings.pouchHeight,
    flatWidthMm: settings.renderedWidth,
    flatHeightMm: settings.renderedHeight
  }
}

export function resolveKSealPouchGeometry(spec: FlowwrapSpec): KSealPouchGeometry {
  const settings = resolveKSealPouchSettings(spec)
  const width = settings.renderedWidth
  const height = settings.renderedHeight
  const centerX = width / 2
  const centerOffsetX = 0
  const sealWidth = settings.sideSeal
  const minSpan = Math.max(20, sealWidth * 2)
  const rawTopApexY = spec.kSealPouch?.topApexY ?? sealWidth
  const rawBottomApexY = spec.kSealPouch?.bottomApexY ?? height - sealWidth
  const topApexMax = Math.max(sealWidth, height - sealWidth - minSpan)
  const topApexY = clamp(rawTopApexY, sealWidth, topApexMax)
  const bottomApexY = clamp(
    rawBottomApexY,
    topApexY + minSpan,
    Math.max(topApexY + minSpan, height - sealWidth)
  )
  const span = bottomApexY - topApexY
  const midY = (topApexY + bottomApexY) / 2
  const midSectionWidth = settings.gussetSize * 2
  const midSectionWidthRatio = width > 0 ? midSectionWidth / width : 0
  const gussetDepth = settings.gussetSize
  const gussetDepthRatio =
    span > 0 ? gussetDepth / (span / 2) : spec.kSealPouch?.gussetDepthRatio ?? 1
  const armRise = Math.tan((settings.armDegree * Math.PI) / 180) * settings.gussetSize
  const maxArmRise = Math.max(0, span / 2 - 1)
  const shoulderHeight = clamp(armRise, 0, maxArmRise)
  const shoulderHeightRatio = height > 0 ? shoulderHeight / height : 0
  const topShoulderY = topApexY + shoulderHeight
  const bottomShoulderY = bottomApexY - shoulderHeight
  const leftFoldX = centerX - settings.gussetSize
  const rightFoldX = centerX + settings.gussetSize
  const sideGuideOffset = Math.max(
    0,
    spec.kSealPouch?.sideGuideOffset ?? settings.sideSeal
  )
  const leftGuideX = Math.max(0, leftFoldX - sideGuideOffset)
  const rightGuideX = Math.min(width, rightFoldX + sideGuideOffset)
  const leftTrimX = 0
  const leftTrimWidth = settings.trimWidth
  const rightTrimWidth = settings.trimWidth
  const rightTrimX = width - rightTrimWidth
  const leftPanelX = leftTrimWidth
  // The entered gusset runs from each bottom-seal midpoint to the centre.
  // Its clear inner span shrinks as the bottom seal grows.
  const leftBottomSealX = leftFoldX - settings.bottomSeal
  const rightBottomSealX = rightFoldX - settings.bottomSeal
  const gussetX = leftFoldX + settings.bottomSeal
  const gussetWidth = Math.max(0, 2 * (settings.gussetSize - settings.bottomSeal))
  const rightPanelX = rightFoldX
  const liveX = leftPanelX
  const liveY = settings.sideSeal
  const liveWidth = Math.max(0, width - settings.trimWidth * 2)
  const liveHeight = Math.max(0, height - settings.sideSeal * 2)
  const topArmStartY = 0
  const bottomArmStartY = height
  const leftArmEndX = leftBottomSealX + settings.bottomSealAreaWidth / 2
  const rightArmEndX = rightBottomSealX + settings.bottomSealAreaWidth / 2
  const leftOuterArmRun = Math.min(
    Math.max(0, centerX - leftArmEndX),
    Math.max(0, leftArmEndX - leftPanelX)
  )
  const rightOuterArmRun = Math.min(
    Math.max(0, rightArmEndX - centerX),
    Math.max(0, width - rightTrimWidth - rightArmEndX)
  )
  const leftOuterArmStartX = leftArmEndX - leftOuterArmRun
  const rightOuterArmStartX = rightArmEndX + rightOuterArmRun
  const armRunLeft = Math.max(0, centerX - leftArmEndX)
  const armRunRight = Math.max(0, rightArmEndX - centerX)
  const armSlope = Math.tan((settings.armDegree * Math.PI) / 180)
  const armRiseLeft = armSlope * armRunLeft
  const armRiseRight = armSlope * armRunRight
  const outerArmRiseLeft = armSlope * leftOuterArmRun
  const outerArmRiseRight = armSlope * rightOuterArmRun
  const topArmEndY = (rise: number) =>
    clamp(topArmStartY + rise, topArmStartY, bottomArmStartY)
  const bottomArmEndY = (rise: number) =>
    clamp(bottomArmStartY - rise, topArmStartY, bottomArmStartY)
  const armLines: readonly KSealArmLine[] = [
    {
      side: "top-left",
      position: "inner",
      startX: centerX,
      startY: topArmStartY,
      endX: leftArmEndX,
      endY: topArmEndY(armRiseLeft)
    },
    {
      side: "top-right",
      position: "inner",
      startX: centerX,
      startY: topArmStartY,
      endX: rightArmEndX,
      endY: topArmEndY(armRiseRight)
    },
    {
      side: "bottom-left",
      position: "inner",
      startX: centerX,
      startY: bottomArmStartY,
      endX: leftArmEndX,
      endY: bottomArmEndY(armRiseLeft)
    },
    {
      side: "bottom-right",
      position: "inner",
      startX: centerX,
      startY: bottomArmStartY,
      endX: rightArmEndX,
      endY: bottomArmEndY(armRiseRight)
    },
    {
      side: "top-left",
      position: "outer",
      startX: leftOuterArmStartX,
      startY: topArmStartY,
      endX: leftArmEndX,
      endY: topArmEndY(outerArmRiseLeft)
    },
    {
      side: "top-right",
      position: "outer",
      startX: rightOuterArmStartX,
      startY: topArmStartY,
      endX: rightArmEndX,
      endY: topArmEndY(outerArmRiseRight)
    },
    {
      side: "bottom-left",
      position: "outer",
      startX: leftOuterArmStartX,
      startY: bottomArmStartY,
      endX: leftArmEndX,
      endY: bottomArmEndY(outerArmRiseLeft)
    },
    {
      side: "bottom-right",
      position: "outer",
      startX: rightOuterArmStartX,
      startY: bottomArmStartY,
      endX: rightArmEndX,
      endY: bottomArmEndY(outerArmRiseRight)
    }
  ]

  return {
    ...settings,
    width,
    height,
    sealWidth,
    gussetDepth,
    gussetDepthRatio,
    midSectionWidth,
    midSectionWidthRatio,
    shoulderHeight,
    shoulderHeightRatio,
    sideGuideOffset,
    leftGuideX,
    rightGuideX,
    centerOffsetX,
    centerX,
    topApexY,
    bottomApexY,
    topShoulderY,
    bottomShoulderY,
    midY,
    leftFoldX,
    rightFoldX,
    leftTrimX,
    leftTrimWidth,
    rightTrimX,
    rightTrimWidth,
    leftBottomSealX,
    rightBottomSealX,
    leftPanelX,
    rightPanelX,
    gussetX,
    gussetWidth,
    gussetLeftX: gussetX,
    gussetRightX: gussetX + gussetWidth,
    liveX,
    liveY,
    liveWidth,
    liveHeight,
    armLines
  }
}

export function buildKSealEyeMarkRects(
  spec: FlowwrapSpec,
  geometry: KSealPouchGeometry,
  originX = 0,
  originY = 0
): KSealEyeMarkRect[] {
  const eyeMarks = spec.eyeMarks
  if (!eyeMarks || eyeMarks.count < 1) {
    return []
  }
  const count = eyeMarks.count === 2 && geometry.trimEnabled ? 2 : 1
  const getSize = (index: number) => ({
    width: index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width,
    height: index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
  })
  const getOffset = (index: number) => ({
    x: index === 1 ? eyeMarks.offsetX2 ?? 0 : eyeMarks.offsetX ?? 0,
    y: index === 1 ? eyeMarks.offsetY2 ?? 0 : eyeMarks.offsetY ?? 0
  })

  if (count === 1) {
    const size = getSize(0)
    const offset = getOffset(0)
    return [{
      x: originX + geometry.centerX - size.width / 2 + offset.x,
      y: originY + geometry.height / 2 - size.height / 2 + offset.y,
      width: size.width,
      height: size.height
    }]
  }

  return [0, 1].map(index => {
    const size = getSize(index)
    const offset = getOffset(index)
    const trimInset = (geometry.trimWidth - size.width) / 2
    const x = index === 0
      ? originX + trimInset
      : originX + geometry.width - geometry.trimWidth + trimInset
    return {
      x: x + offset.x,
      y: originY + geometry.height / 2 - size.height / 2 + offset.y,
      width: size.width,
      height: size.height
    }
  })
}
