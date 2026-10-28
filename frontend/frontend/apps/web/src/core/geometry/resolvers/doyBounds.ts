import type { FlowwrapSpec } from "../../../types/flowwrap"

export const GUSSET_DEPTH_MIN = 30
export const GUSSET_DEPTH_MAX = 140
export const ARC_MEASURE_FACTOR = 0.75
export const DOY_CENTER_GAP_MM = 80
export const DOY_SIDE_FOLD_OUTSET_MM = 5
export const DOY_BOTTOM_FOLD_OUTSET_MM = 5
export const GUSSET_DEPTH_TO_ARC_RATIO = 0.45
export const DOY_NOTCH_OUTER_OFFSET_MM = 7.5

/** Clear inner span after the bottom seals are taken from the entered gusset. */
export function doyClearGussetWidth(spec: FlowwrapSpec): number {
  return Math.max(0, (spec.doyPouch?.panelWidths.center ?? DOY_CENTER_GAP_MM) -
    2 * Math.max(0, spec.doyPouch?.bottomSeal ?? 7.5))
}

/** DOY's stored width is the flat cutter; each finished face occupies half
 * the width remaining after the full centre gusset. */
export function doyFinishedWidth(spec: FlowwrapSpec): number {
  return (spec.width - (spec.doyPouch?.panelWidths.center ?? DOY_CENTER_GAP_MM)) / 2
}

export function doyCutterWidth(finishedWidth: number, centerGussetWidth: number): number {
  return finishedWidth * 2 + centerGussetWidth
}

export type DoyBoundsInput = {
  originX: number
  liveOriginX: number
  liveWidth: number
  cutterWidth: number
}

export type ResolvedDoyBounds = {
  width: number
  height: number
  centerWidth: number
  gussetWidth: number
  gussetLeftX: number
  gussetRightX: number
  rectCenterX: number
  centerLeft: number
  centerRight: number
  arcInsetDepth: number
  arcLeftX: number
  arcRightX: number
  gussetDepth: number
  bottomSealGap: number
  ovalWidth: number
  ovalCenterX: number
  ovalLeftX: number
  ovalRightX: number
  gap1: number
  gap2: number
  cutterRightX: number
  leftGripX: number
  rightGripX: number
  gripSealWidth: number
  zipperLeftX: number
  zipperRightX: number
  zipperWidth: number
  notchLeftX: number
  notchRightX: number
  notchHalf: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function toDegrees(value: number) {
  return (value * 180) / Math.PI
}

export function clampDoyCenterWidth(value: number, liveWidth: number) {
  return clamp(value, 10, liveWidth)
}

export function clampDoyGussetDepth(value: number) {
  return clamp(value, GUSSET_DEPTH_MIN, GUSSET_DEPTH_MAX)
}

export function clampDoyOvalWidth(value: number, cutterWidth: number) {
  return Math.max(10, Math.min(Math.max(10, cutterWidth), value))
}

export function resolveDoyBounds(
  spec: FlowwrapSpec,
  { originX, liveOriginX, liveWidth, cutterWidth }: DoyBoundsInput
): ResolvedDoyBounds | null {
  const doy = spec.doyPouch
  if (!doy) {
    return null
  }

  const width = cutterWidth
  const height = spec.height
  const synced = doy.gussetSync !== false
  const bottomSeal = Math.max(0, doy.bottomSeal ?? 7.5)
  const bottomSealGap = 2 * bottomSeal
  const centerWidth = clampDoyCenterWidth(
    synced ? clamp(doy.panelWidths?.center ?? DOY_CENTER_GAP_MM, 27, 126) : doy.panelWidths?.center ?? DOY_CENTER_GAP_MM,
    liveWidth
  )
  const gussetWidth = Math.max(0, centerWidth - bottomSealGap)
  const coreCenterX = liveOriginX + liveWidth / 2
  const rectCenterX = coreCenterX
  const centerLeft = rectCenterX - centerWidth / 2
  const centerRight = rectCenterX + centerWidth / 2
  const gussetLeftX = centerLeft + bottomSeal
  const gussetRightX = centerRight - bottomSeal
  const arcCenterLeft = coreCenterX - centerWidth / 2
  const arcCenterRight = coreCenterX + centerWidth / 2
  const gussetDepth = clampDoyGussetDepth(synced ? gussetWidth / GUSSET_DEPTH_TO_ARC_RATIO : doy.gussetDepth ?? gussetWidth / GUSSET_DEPTH_TO_ARC_RATIO)
  const maxArcDepthLeft =
    (centerLeft - originX - DOY_SIDE_FOLD_OUTSET_MM) / ARC_MEASURE_FACTOR
  const maxArcDepthRight =
    (originX + cutterWidth - centerRight - DOY_SIDE_FOLD_OUTSET_MM) /
    ARC_MEASURE_FACTOR
  const maxArcDepthBySpace = Math.max(
    12,
    Math.min(maxArcDepthLeft, maxArcDepthRight)
  )
  const arcInsetDepth = clamp(
    synced ? (centerWidth / 2 - bottomSeal) / ARC_MEASURE_FACTOR : GUSSET_DEPTH_TO_ARC_RATIO * gussetDepth,
    12,
    maxArcDepthBySpace
  )
  const arcOffset = Math.min(arcInsetDepth, (arcCenterLeft - liveOriginX) * 0.6)
  const defaultArcShift =
    arcOffset - ARC_MEASURE_FACTOR * arcInsetDepth - DOY_SIDE_FOLD_OUTSET_MM
  // Keep side arcs outside the centre folds and inside the panel/seal boundaries.
  const minShift = liveOriginX - arcCenterLeft + arcOffset
  const maxShift = arcOffset - ARC_MEASURE_FACTOR * arcInsetDepth - DOY_SIDE_FOLD_OUTSET_MM
  const ovalWidthBase = gussetWidth + DOY_BOTTOM_FOLD_OUTSET_MM * 2
  // AMENDS 6.2: the gusset fold guides sit on the bottom-seal centres (the
  // 40 mm measure ends). The synced oval's widest point (75% of its control
  // depth = 0.375 × width) sits one bottom seal inside each guide.
  const syncedOvalWidth = Math.min(liveWidth, Math.max(1,
    (centerWidth / 2 - bottomSeal) / 0.375
  ))
  const minOvalWidth = synced
    ? syncedOvalWidth
    : Math.min(liveWidth, Math.max(10, gussetWidth))
  const maxOvalWidth = synced
    ? syncedOvalWidth
    : liveWidth
  const ovalWidth = clamp(doy.ovalWidth ?? ovalWidthBase, minOvalWidth, maxOvalWidth)
  // At half height the side arc reaches 75% of its control depth. In the
  // synced layout its tip stops one bottom-seal width (7.5 mm by default)
  // outside the bottom-seal centre line on each side.
  const targetArcDistance = synced
    ? centerWidth
    : gussetWidth / 2 + bottomSealGap + arcInsetDepth * 0.75
  const arcSpace = Math.min(coreCenterX - originX, originX + cutterWidth - coreCenterX)
  const maxOvalOffset = Math.max(0, Math.min(
    (liveWidth - ovalWidth) / 2,
    doy.bottomSeal === undefined ? Number.POSITIVE_INFINITY : arcSpace - targetArcDistance - DOY_SIDE_FOLD_OUTSET_MM
  ))
  const ovalCenterX = coreCenterX + clamp(doy.ovalOffsetX ?? 0, -maxOvalOffset, maxOvalOffset)
  const ovalLeftX = ovalCenterX - ovalWidth / 2
  const ovalRightX = ovalCenterX + ovalWidth / 2
  // Both outlines are cubic Beziers. At half height, each curve is 75% of
  // its control-point depth from its end point: these are the closest points.
  const arcShift = clamp(doy.arcOffsetX ?? defaultArcShift, Math.min(minShift,maxShift), maxShift)
  const availableArcDistance = Math.max(0, Math.min(
    ovalCenterX - originX,
    originX + cutterWidth - ovalCenterX
  ) - DOY_SIDE_FOLD_OUTSET_MM)
  const arcDistance = clamp(targetArcDistance - (synced ? 0 : doy.arcOffsetX ?? 0), 0, availableArcDistance)
  const arcLeftX = !synced && doy.bottomSeal === undefined
    ? arcCenterLeft - arcOffset + arcShift
    : ovalCenterX - arcDistance
  const arcRightX = !synced && doy.bottomSeal === undefined
    ? arcCenterRight + arcOffset - arcShift
    : ovalCenterX + arcDistance
  const gripSealWidth = doy.gripSeal
  const leftGripX = originX + doy.sideBleed
  const rightGripX = originX + cutterWidth - doy.sideBleed - gripSealWidth
  const zipperOffset = doy.zipper.offsetX ?? 0
  const zipperWidth = doy.zipper.width ?? 3
  const zipperLeftX = originX + zipperOffset
  const zipperRightX = originX + cutterWidth - zipperOffset - zipperWidth
  const notchHalf = doy.tearNotch.width / 2
  const defaultNotchOffset = Math.max(
    0,
    (doy.zipper.offsetX ?? 0) - DOY_NOTCH_OUTER_OFFSET_MM
  )
  const notchOffset =
    doy.tearNotch.offsetX ?? doy.tearNotch.offsetY ?? defaultNotchOffset
  const notchLeftX = originX + notchOffset
  const notchRightX = originX + cutterWidth - notchOffset

  return {
    width,
    height,
    centerWidth,
    gussetWidth,
    gussetLeftX,
    gussetRightX,
    rectCenterX,
    centerLeft,
    centerRight,
    arcInsetDepth,
    arcLeftX,
    arcRightX,
    gussetDepth,
    bottomSealGap,
    ovalWidth,
    ovalCenterX,
    ovalLeftX,
    ovalRightX,
    gap1: 6,
    gap2: 8,
    cutterRightX: originX + cutterWidth,
    leftGripX,
    rightGripX,
    gripSealWidth,
    zipperLeftX,
    zipperRightX,
    zipperWidth,
    notchLeftX,
    notchRightX,
    notchHalf
  }
}

/** Persist the same bounded geometry that rendering and manual drags resolve. */
export function constrainDoyGeometry(spec: FlowwrapSpec): FlowwrapSpec {
  if (!spec.doyPouch || spec.kSealPouch) return spec
  const left=spec.seals?.left??spec.seal,right=spec.seals?.right??spec.seal
  const layout=resolveDoyBounds(spec,{originX:0,liveOriginX:left,liveWidth:Math.max(1,spec.width-left-right),cutterWidth:spec.width})!
  const arcOffset=Math.min(layout.arcInsetDepth,(layout.centerLeft-left)*.6)
  return {...spec,doyPouch:{...spec.doyPouch,
    gussetDepth:layout.arcInsetDepth/GUSSET_DEPTH_TO_ARC_RATIO,
    panelWidths:{...spec.doyPouch.panelWidths,center:layout.centerWidth},
    ovalWidth:layout.ovalWidth,ovalOffsetX:layout.ovalCenterX-layout.rectCenterX,
    arcOffsetX: spec.doyPouch.bottomSeal === undefined
      ? layout.arcLeftX-layout.centerLeft+arcOffset
      : (spec.doyPouch.arcOffsetX ?? 0)}}
}
