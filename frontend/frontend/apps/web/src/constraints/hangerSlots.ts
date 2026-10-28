import type { HangerSlotSpec } from "../types/flowwrap"
import { getHangerSlotDisplayBounds } from "../geometry/hangerSlotShapes"

export const HANGER_SLOT_MIN_DIAMETER_MM = 3
export const HANGER_SLOT_MAX_DIAMETER_MM = 100
export const HANGER_SLOT_SIDE_CLEARANCE_MM = 10
export const HANGER_SLOT_MIN_WIDTH_MM = 3
export const HANGER_SLOT_MAX_WIDTH_MM = 100
export const HANGER_SLOT_MIN_HEIGHT_MM = 3
export const HANGER_SLOT_MAX_HEIGHT_MM = 100
const CENTER_TOLERANCE = 0.01

export function getHangerSlotHalfWidth(slot: HangerSlotSpec) {
  const bounds=getHangerSlotDisplayBounds(slot)
  return Math.max(Math.abs(bounds.left),Math.abs(bounds.right))
}

export function getHangerSlotHalfHeight(slot: HangerSlotSpec) {
  const bounds=getHangerSlotDisplayBounds(slot)
  return Math.max(Math.abs(bounds.top),Math.abs(bounds.bottom))
}

export const HANGER_SLOT_EDGE_OFFSET_MM = 15

export function getHangerSlotAxisX(slot: HangerSlotSpec, liveWidth:number, _leftSeal=0) {
  if (!slot.mirrored) return liveWidth / 2
  // Position the silhouette, not its centre, 15 mm from the inner working edge (after trim).
  const bounds = getHangerSlotDisplayBounds(slot)
  return Math.min(liveWidth / 2, HANGER_SLOT_EDGE_OFFSET_MM - Math.min(bounds.left, -bounds.right))
}

/** Guidance, not a hidden hard cap: 3-100 mm remains the editable range. */
export function getHangerSlotRecommendedRange(liveWidth:number, liveHeight:number) {
  const smaller=Math.max(0,Math.min(liveWidth,liveHeight))
  return {min:3,max:Math.max(3,Math.min(100,Math.round(smaller*.35)))}
}

export function clampHangerSlotDiameter(diameter: number, liveWidth: number) {
  const maxBySeal = Math.max(0, liveWidth - HANGER_SLOT_SIDE_CLEARANCE_MM * 2)
  const maxDiameter = Math.min(HANGER_SLOT_MAX_DIAMETER_MM, maxBySeal)
  if (!Number.isFinite(diameter)) {
    return Math.max(HANGER_SLOT_MIN_DIAMETER_MM, maxDiameter)
  }
  const effectiveMax = Math.max(HANGER_SLOT_MIN_DIAMETER_MM, maxDiameter)
  const clamped = Math.min(effectiveMax, Math.max(HANGER_SLOT_MIN_DIAMETER_MM, diameter))
  if (!Number.isFinite(clamped)) {
    return HANGER_SLOT_MIN_DIAMETER_MM
  }
  return clamped
}

export function clampHangerSlotWidth(width: number, liveWidth: number) {
  const maxBySeal = Math.max(0, liveWidth - HANGER_SLOT_SIDE_CLEARANCE_MM * 2)
  const maxWidth = Math.min(HANGER_SLOT_MAX_WIDTH_MM, maxBySeal)
  const effectiveMax = Math.max(HANGER_SLOT_MIN_WIDTH_MM, maxWidth)
  const clamped = Math.min(effectiveMax, Math.max(HANGER_SLOT_MIN_WIDTH_MM, width))
  return Number.isFinite(clamped) ? clamped : HANGER_SLOT_MIN_WIDTH_MM
}

export function clampHangerSlotHeight(height: number) {
  const clamped = Math.min(
    HANGER_SLOT_MAX_HEIGHT_MM,
    Math.max(HANGER_SLOT_MIN_HEIGHT_MM, height)
  )
  return Number.isFinite(clamped) ? clamped : HANGER_SLOT_MIN_HEIGHT_MM
}

export function getHangerSlotLeftClearance(slot: HangerSlotSpec) {
  return slot.centerX + getHangerSlotDisplayBounds(slot).left
}

export function isHangerSlotLeftClearanceViolated(slot: HangerSlotSpec, cutterEdgeX=0) {
  return getHangerSlotLeftClearance(slot) - cutterEdgeX < HANGER_SLOT_SIDE_CLEARANCE_MM
}

export function isHangerSlotOffCenter(slot: HangerSlotSpec, liveWidth: number) {
  const center = getHangerSlotAxisX(slot,liveWidth)
  return Math.abs(slot.centerX - center) > CENTER_TOLERANCE
}
