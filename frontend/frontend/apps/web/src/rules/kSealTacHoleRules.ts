import type { FlowwrapSpec, HangerSlotSpec } from "../types/flowwrap"
import { resolveKSealPouchGeometry } from "../geometry/kSealPouchGeometry"

export const KSEAL_TAC_HOLE_DEFAULT_MM = 6
export const KSEAL_TAC_SEAL_CLEARANCE_MM = 1.5

const getKSealTacArmBase = (spec: FlowwrapSpec) => {
  const geometry = resolveKSealPouchGeometry(spec)
  const outerArm = geometry.armLines.find(
    arm => arm.side === "top-left" && arm.position === "outer"
  )
  return {
    geometry,
    outerX: outerArm?.startX ?? geometry.leftPanelX,
    innerX: outerArm?.endX ?? geometry.leftFoldX,
    innerY: outerArm?.endY ?? geometry.sideSeal + geometry.gussetSize
  }
}

export const getKSealTacBaseWidth = (spec: FlowwrapSpec) => {
  const { outerX, innerX } = getKSealTacArmBase(spec)
  return Math.max(0, innerX - outerX)
}

export const getKSealTacMovementBounds = (
  spec: FlowwrapSpec,
  holeSize: number,
  centerX?: number
) => {
  const { geometry, outerX, innerX, innerY } = getKSealTacArmBase(spec)
  const radius = Math.max(0, holeSize) / 2
  const baseWidth = Math.max(0, innerX - outerX)
  const slope = baseWidth > 0 ? Math.max(0.0001, innerY / baseWidth) : 0.0001
  const diagonalRadiusClearance = radius * Math.hypot(1, slope)
  const minCutterY = geometry.sideSeal + KSEAL_TAC_SEAL_CLEARANCE_MM + radius
  const minCutterX =
    outerX + (minCutterY + diagonalRadiusClearance) / slope
  const maxCutterX = innerX - radius
  const fallbackCutterX = Math.min(
    innerX - radius,
    Math.max(outerX + radius, outerX + baseWidth / 2)
  )
  const safeMinCutterX = Math.min(minCutterX, maxCutterX)
  const resolvedCutterX = Math.min(
    maxCutterX,
    Math.max(
      safeMinCutterX,
      centerX === undefined ? fallbackCutterX : geometry.liveX + centerX
    )
  )
  const maxCutterY = Math.min(
    innerY - radius,
    slope * (resolvedCutterX - outerX) - diagonalRadiusClearance
  )
  const minY = minCutterY - geometry.liveY

  return {
    minX: safeMinCutterX - geometry.liveX,
    maxX: maxCutterX - geometry.liveX,
    minY,
    maxY: Math.max(minY, maxCutterY - geometry.liveY),
    outerBoundaryX: outerX - geometry.liveX,
    innerBoundaryX: innerX - geometry.liveX
  }
}

export const getKSealTacCentreX = (
  spec: FlowwrapSpec,
  holeSize = KSEAL_TAC_HOLE_DEFAULT_MM
) => {
  const bounds = getKSealTacMovementBounds(spec, holeSize)
  const baseCentre = (bounds.outerBoundaryX + bounds.innerBoundaryX) / 2
  return Math.min(bounds.maxX, Math.max(bounds.minX, baseCentre))
}

export const getKSealTacCentreY = (holeSize: number) =>
  KSEAL_TAC_SEAL_CLEARANCE_MM + holeSize / 2

export const getKSealTacTolerance = (baseWidth: number, holeSize: number) =>
  Math.max(0, (baseWidth - holeSize) / 4)

export const isKSealTacHole = (slot: HangerSlotSpec) =>
  slot.subtype === "round-hole" && slot.purpose === "tac-hole"

export const clampKSealTacHole = (
  spec: FlowwrapSpec,
  slot: HangerSlotSpec
): HangerSlotSpec => {
  const xBounds = getKSealTacMovementBounds(spec, slot.diameter, slot.centerX)
  const centerX = Math.min(xBounds.maxX, Math.max(xBounds.minX, slot.centerX))
  const bounds = getKSealTacMovementBounds(spec, slot.diameter, centerX)
  return {
    ...slot,
    centerX,
    centerY: Math.min(bounds.maxY, Math.max(bounds.minY, slot.centerY))
  }
}

export const isKSealTacOffCentre = (spec: FlowwrapSpec, slot: HangerSlotSpec) => {
  const tolerance = getKSealTacTolerance(getKSealTacBaseWidth(spec), slot.diameter)
  return Math.abs(slot.centerX - getKSealTacCentreX(spec, slot.diameter)) > tolerance
}

export const centreKSealTacHoles = (spec: FlowwrapSpec): FlowwrapSpec => {
  if (!spec.kSealPouch || !spec.hangerSlots?.some(isKSealTacHole)) {
    return spec
  }
  return {
    ...spec,
    hangerSlots: spec.hangerSlots.map(slot =>
      isKSealTacHole(slot)
        ? clampKSealTacHole(spec, {
            ...slot,
            centerX: getKSealTacCentreX(spec, slot.diameter)
          })
        : slot
    )
  }
}
