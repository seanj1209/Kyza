import { normaliseOpeningStyle } from "../../../../../../packages/cutter-engine/actions/openingStyle"
import { resolveFlowwrapGeometry, type FlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import {
  resolveKSealPouchGeometry,
  type KSealPouchGeometry
} from "../../../geometry/kSealPouchGeometry"
import type {
  AttributeBoxSpec,
  FlowwrapSpec,
  HangerSlotSpec,
  SafeZoneSpec,
  WindowSpec
} from "../../../types/flowwrap"
import { formatMetricMeasurement } from "../../formatMetric"

const DEFAULT_CANVAS_MARGIN = 80
const FEATURE_ROW_GAP = 6

const formatMm = formatMetricMeasurement

export type KSealPathPoint = {
  x: number
  y: number
}

export type KSealMeasureSegment = {
  row: string
  index: number
  startX: number
  endX: number
  y: number
  label: string
}

export type KSealVerticalMeasureSegment = {
  row: string
  index: number
  x: number
  startY: number
  endY: number
  label: string
}

export type ResolvedKSealLayout = {
  geometry: KSealPouchGeometry
  flowGeometry: FlowwrapGeometry
  margin: number
  originX: number
  originY: number
  width: number
  height: number
  viewWidth: number
  viewHeight: number
  centerX: number
  topApexY: number
  bottomApexY: number
  topShoulderY: number
  bottomShoulderY: number
  midY: number
  leftFoldX: number
  rightFoldX: number
  leftGuideX: number
  rightGuideX: number
  sealWidth: number
  seals: FlowwrapGeometry["seals"]
  liveOriginX: number
  liveOriginY: number
  liveWidth: number
  liveHeight: number
  substrate: NonNullable<FlowwrapSpec["substrate"]>
  substrateFill: string
  substrateOpacity: number
  safeZones: SafeZoneSpec[]
  windows: WindowSpec[]
  attributeBoxes: AttributeBoxSpec[]
  hangerSlots: HangerSlotSpec[]
  innerPathPoints: KSealPathPoint[]
  sealPathPoints: KSealPathPoint[]
  topMeasureSegments: KSealMeasureSegment[]
  featureMeasureSegments: KSealMeasureSegment[]
  heightMeasureSegments: KSealVerticalMeasureSegment[]
  softWarnings: string[]
}

export function resolveKSealLayout(spec: FlowwrapSpec): ResolvedKSealLayout {
  spec = normaliseOpeningStyle(spec)
  const geometry = resolveKSealPouchGeometry(spec)
  const margin = DEFAULT_CANVAS_MARGIN
  const width = geometry.width
  const height = geometry.height
  const seals = {
    top: geometry.sideSeal,
    bottom: geometry.sideSeal,
    left: geometry.trimWidth,
    right: geometry.trimWidth
  }
  const flowGeometry = resolveFlowwrapGeometry({
    ...spec,
    width,
    height,
    seal: geometry.sideSeal,
    seals
  })
  const viewWidth = width + margin * 2
  const viewHeight = height + margin * 2
  const originX = margin
  const originY = margin
  const centerX = originX + geometry.centerX
  const topApexY = originY + geometry.topApexY
  const bottomApexY = originY + geometry.bottomApexY
  const topShoulderY = originY + geometry.topShoulderY
  const bottomShoulderY = originY + geometry.bottomShoulderY
  const midY = originY + geometry.midY
  const leftFoldX = originX + geometry.leftFoldX
  const rightFoldX = originX + geometry.rightFoldX
  const leftGuideX = originX + geometry.leftGuideX
  const rightGuideX = originX + geometry.rightGuideX
  const sealWidth = geometry.sealWidth
  const liveOriginX = originX + geometry.liveX
  const liveOriginY = originY + geometry.liveY
  const liveWidth = geometry.liveWidth
  const liveHeight = geometry.liveHeight
  const substrate = spec.substrate ?? "clear"
  const substrateFill =
    substrate === "paper"
      ? "#e8e1d6"
      : substrate === "white"
        ? "#f5f5f5"
        : "#b9dfe8"
  const substrateOpacity = substrate === "clear" ? 0.6 : 0.35
  const safeZones = spec.safeZones ?? []
  const windows = spec.windows ?? []
  const attributeBoxes = spec.attributeBoxes ?? []
  const hangerSlots = spec.hangerSlots ?? []

  const innerPathPoints = [
    { x: centerX, y: topApexY },
    { x: rightFoldX, y: topShoulderY },
    { x: rightFoldX, y: bottomShoulderY },
    { x: centerX, y: bottomApexY },
    { x: leftFoldX, y: bottomShoulderY },
    { x: leftFoldX, y: topShoulderY }
  ]

  const sealTopY = Math.max(originY, topApexY - sealWidth)
  const sealBottomY = Math.min(originY + height, bottomApexY + sealWidth)
  const sealLeftX = Math.max(originX, leftFoldX - sealWidth)
  const sealRightX = Math.min(originX + width, rightFoldX + sealWidth)
  const sealTopShoulderY = Math.min(
    sealBottomY,
    Math.max(sealTopY, topShoulderY - sealWidth)
  )
  const sealBottomShoulderY = Math.max(
    sealTopY,
    Math.min(sealBottomY, bottomShoulderY + sealWidth)
  )
  const sealPathPoints = [
    { x: centerX, y: sealTopY },
    { x: sealRightX, y: sealTopShoulderY },
    { x: sealRightX, y: sealBottomShoulderY },
    { x: centerX, y: sealBottomY },
    { x: sealLeftX, y: sealBottomShoulderY },
    { x: sealLeftX, y: sealTopShoulderY }
  ]

  const topMeasureY = originY - 3
  // Pack height is the true cutter-edge to bottom-seal-centre span on each
  // face. Do not split this into the old panel / gusset / panel row.
  const leftBottomSealCentre = geometry.leftBottomSealX + geometry.bottomSealAreaWidth / 2
  const rightBottomSealCentre = geometry.rightBottomSealX + geometry.bottomSealAreaWidth / 2
  const topMeasureSegments = [
    {
      row: "top",
      index: 1,
      startX: originX,
      endX: originX + leftBottomSealCentre,
      y: topMeasureY,
      label: formatMm(leftBottomSealCentre)
    },
    {
      row: "top",
      index: 3,
      startX: originX + rightBottomSealCentre,
      endX: originX + width,
      y: topMeasureY,
      label: formatMm(width - rightBottomSealCentre)
    }
  ]

  const featureMeasureSegments: KSealMeasureSegment[] = []
  const heightMeasureX = originX + width + 3
  const heightMeasureSegments: KSealVerticalMeasureSegment[] = [
    {
      row: "height",
      index: 0,
      x: heightMeasureX,
      startY: originY,
      endY: liveOriginY,
      label: formatMm(geometry.sideSeal)
    },
    {
      row: "height",
      index: 1,
      x: heightMeasureX,
      startY: liveOriginY,
      endY: liveOriginY + liveHeight,
      label: formatMm(liveHeight)
    },
    {
      row: "height",
      index: 2,
      x: heightMeasureX,
      startY: liveOriginY + liveHeight,
      endY: originY + height,
      label: formatMm(geometry.sideSeal)
    }
  ].filter(segment => segment.endY > segment.startY)
  const bottomFeatureY = originY + height + 3
  const bottomSeal = Math.max(0, geometry.bottomSeal)
  // The specified gusset runs from each bottom-seal midpoint to the centre.
  ;[geometry.leftFoldX, geometry.centerX].forEach((start,index) => {
    const end = index === 0 ? geometry.centerX : geometry.rightFoldX
    featureMeasureSegments.push({row:"bottom",index,startX:originX+start,endX:originX+end,y:bottomFeatureY,label:formatMm(geometry.gussetSize)})
  })
  const bottomBreakdownSegments = [
    {
      startX: originX + geometry.leftBottomSealX,
      endX: originX + geometry.leftBottomSealX + bottomSeal,
      label: String(Number(bottomSeal.toFixed(1)))
    },
    {
      startX: originX + geometry.leftBottomSealX + bottomSeal,
      endX: originX + geometry.leftBottomSealX + geometry.bottomSealAreaWidth,
      label: String(Number(bottomSeal.toFixed(1)))
    },
    {
      startX: originX + geometry.rightBottomSealX,
      endX: originX + geometry.rightFoldX,
      label: String(Number(bottomSeal.toFixed(1)))
    },
    {
      startX: originX + geometry.rightFoldX,
      endX: originX + geometry.rightBottomSealX + geometry.bottomSealAreaWidth,
      label: String(Number(bottomSeal.toFixed(1)))
    }
  ]
  bottomBreakdownSegments.forEach((segment, index) => {
    if (segment.endX <= segment.startX) {
      return
    }
    featureMeasureSegments.push({
      row: "bottom",
      index,
      startX: segment.startX,
      endX: segment.endX,
      y: bottomFeatureY + FEATURE_ROW_GAP,
      label: segment.label
    })
  })
  // Show the clear reach from each bottom-seal centre to the outer K-arm tip,
  // in the gusset row beside the 40 mm measures (AMENDS 6.2: tip – 40 – 40 – tip).
  const outerLeftTip = geometry.armLines.find(arm => arm.side === "bottom-left" && arm.position === "outer")?.startX
  const outerRightTip = geometry.armLines.find(arm => arm.side === "bottom-right" && arm.position === "outer")?.startX
  if (outerLeftTip !== undefined && outerLeftTip < geometry.leftBottomSealX + geometry.bottomSealAreaWidth / 2) {
    const endX = geometry.leftBottomSealX + geometry.bottomSealAreaWidth / 2
    featureMeasureSegments.push({row:"bottom",index:10,startX:originX+outerLeftTip,endX:originX+endX,y:bottomFeatureY,label:formatMm(endX-outerLeftTip)})
  }
  if (outerRightTip !== undefined && outerRightTip > geometry.rightBottomSealX + geometry.bottomSealAreaWidth / 2) {
    const startX = geometry.rightBottomSealX + geometry.bottomSealAreaWidth / 2
    featureMeasureSegments.push({row:"bottom",index:11,startX:originX+startX,endX:originX+outerRightTip,y:bottomFeatureY,label:formatMm(outerRightTip-startX)})
  }

  if (spec.doyPouch) {
    let featureRow = 0
    const featureY = bottomFeatureY + FEATURE_ROW_GAP * 2

    if (spec.doyPouch.showGripSeal !== false) {
      const leftReference = originX + geometry.trimWidth
      const rightReference = originX + width - geometry.trimWidth
      const leftStart = originX + spec.doyPouch.sideBleed
      const rightStart =
        originX + width - spec.doyPouch.sideBleed - spec.doyPouch.gripSeal
      const sideBleedFromTrim = Math.max(
        0,
        spec.doyPouch.sideBleed - geometry.trimWidth
      )
      const gripSegments = [
        {
          startX: leftReference,
          endX: leftStart,
          label: formatMm(sideBleedFromTrim)
        },
        {
          startX: leftStart,
          endX: leftStart + spec.doyPouch.gripSeal,
          label: formatMm(spec.doyPouch.gripSeal)
        },
        {
          startX: rightStart,
          endX: rightStart + spec.doyPouch.gripSeal,
          label: formatMm(spec.doyPouch.gripSeal)
        },
        {
          startX: rightStart + spec.doyPouch.gripSeal,
          endX: rightReference,
          label: formatMm(sideBleedFromTrim)
        }
      ]
      gripSegments.forEach((segment, index) => {
        if (segment.endX <= segment.startX) {
          return
        }
        featureMeasureSegments.push({
          row: "feature",
          index,
          startX: segment.startX,
          endX: segment.endX,
          y: featureY + featureRow * FEATURE_ROW_GAP,
          label: segment.label
        })
      })
      featureRow += 1
    }

    if (spec.doyPouch.showTearNotch !== false) {
      const notchOffset = spec.doyPouch.tearNotch.offsetX ?? 0
      const notchOffsetFromTrim = Math.max(0, notchOffset - geometry.trimWidth)
      const notchSegments = [
        {
          startX: originX + geometry.trimWidth,
          endX: originX + notchOffset,
          label: formatMm(notchOffsetFromTrim)
        },
        {
          startX: originX + width - notchOffset,
          endX: originX + width - geometry.trimWidth,
          label: formatMm(notchOffsetFromTrim)
        }
      ]
      notchSegments.forEach((segment, index) => {
        if (segment.endX <= segment.startX) {
          return
        }
        featureMeasureSegments.push({
          row: "feature",
          index: 100 + index,
          startX: segment.startX,
          endX: segment.endX,
          y: featureY + featureRow * FEATURE_ROW_GAP,
          label: segment.label
        })
      })
      featureRow += 1
    }

    if (spec.doyPouch.showZipper !== false) {
      const zipperOffset = spec.doyPouch.zipper.offsetX ?? 0
      const zipperOffsetFromTrim = Math.max(0, zipperOffset - geometry.trimWidth)
      const zipperWidth = spec.doyPouch.zipper.width ?? 10
      const zipperSegments = [
        { startX: originX + zipperOffset, endX: originX + zipperOffset + zipperWidth, label: formatMm(zipperWidth) },
        { startX: originX + width - zipperOffset - zipperWidth, endX: originX + width - zipperOffset, label: formatMm(zipperWidth) },
        {
          startX: originX + geometry.trimWidth,
          endX: originX + zipperOffset,
          label: formatMm(zipperOffsetFromTrim)
        },
        {
          startX: originX + width - zipperOffset,
          endX: originX + width - geometry.trimWidth,
          label: formatMm(zipperOffsetFromTrim)
        }
      ]
      zipperSegments.forEach((segment, index) => {
        if (segment.endX <= segment.startX) {
          return
        }
        featureMeasureSegments.push({
          row: "feature",
          index: 200 + index,
          startX: segment.startX,
          endX: segment.endX,
          y: featureY + featureRow * FEATURE_ROW_GAP,
          label: segment.label
        })
      })
    }
  }

  const softWarnings = [
    ...(!geometry.trimEnabled && spec.eyeMarks?.count === 2
      ? ["Trim is off: K-Seal supports one eyemark only."]
      : [])
  ]

  return {
    geometry,
    flowGeometry,
    margin,
    originX,
    originY,
    width,
    height,
    viewWidth,
    viewHeight,
    centerX,
    topApexY,
    bottomApexY,
    topShoulderY,
    bottomShoulderY,
    midY,
    leftFoldX,
    rightFoldX,
    leftGuideX,
    rightGuideX,
    sealWidth,
    seals,
    liveOriginX,
    liveOriginY,
    liveWidth,
    liveHeight,
    substrate,
    substrateFill,
    substrateOpacity,
    safeZones,
    windows,
    attributeBoxes,
    hangerSlots,
    innerPathPoints,
    sealPathPoints,
    topMeasureSegments,
    featureMeasureSegments,
    heightMeasureSegments,
    softWarnings
  }
}
