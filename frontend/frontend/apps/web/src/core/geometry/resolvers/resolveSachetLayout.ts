import { resolveFlowwrapGeometry, resolveSealSizes } from "../../../geometry/flowwrapGeometry"
import { sachetStepCount } from "../../../../../../packages/cutter-engine/actions/sachetSteps"
import type { FoldLineSpec } from "../../../geometry/foldLines"
import type {
  AttributeBoxSpec,
  FlowwrapSpec,
  HangerSlotSpec,
  SachetSpec,
  SafeZoneSpec,
  WindowSpec
} from "../../../types/flowwrap"

const DEFAULT_CANVAS_MARGIN = 80

const EYE_MARK_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  "dark-blue": "#0b1b4a"
}

export type SachetTrackSide = NonNullable<SachetSpec["trackSide"]>

export type SachetMeasureMeta = {
  margin: number
  originY: number
  stepSpan: number
  stepCount: number
  trackWidth: number
  trimWidth: number
  trimPosition: "left" | "right" | "both"
  leftTrimWidth: number
  rightTrimWidth: number
  trackSide: SachetTrackSide
  bodyOriginX: number
  width: number
  height: number
}

export type ResolvedSachetLane = {
  index: number
  side: "A" | "B"
  isTrackLane: boolean
  bodyOriginX: number
  liveOriginX: number
  outlineX: number
  outlineWidth: number
}

export type ResolvedPairEyeMarkLayout = {
  x: number
  width: number
  halfHeight: number
  topY: number
  bottomY: number
  fillColor: string
  strokeColor: string
  warning: string | null
}

export type ResolvedSachetLayout = {
  geometry: ReturnType<typeof resolveFlowwrapGeometry>
  seals: ReturnType<typeof resolveSealSizes>
  margin: number
  originY: number
  eyeMarkWidth: number
  rightTrim: number
  trimWidth: number
  trimPosition: "left" | "right" | "both"
  leftTrimWidth: number
  rightTrimWidth: number
  trackSide: SachetTrackSide
  stepEnabled: boolean
  stepCount: number
  stepSpan: number
  showLaneLabels: boolean
  usePairEyeMarks: boolean
  trackWidth: number
  contentWidth: number
  totalWidth: number
  totalHeight: number
  substrate: NonNullable<FlowwrapSpec["substrate"]>
  substrateFill: string
  substrateOpacity: number
  bodyOriginX: number
  trackOriginX: number
  eyemarkCutterOriginX: number
  eyemarkCutterWidth: number
  liveOriginX: number
  liveOriginY: number
  safeZones: SafeZoneSpec[]
  windows: WindowSpec[]
  attributeBoxes: AttributeBoxSpec[]
  hangerSlots: HangerSlotSpec[]
  tearNotch: FlowwrapSpec["sachet"] extends infer T
    ? T extends { tearNotch?: infer U }
      ? U
      : never
    : never
  foldLines: FoldLineSpec[]
  drawPerLaneOutline: boolean
  lanes: ResolvedSachetLane[]
  pairEyeMarks: ResolvedPairEyeMarkLayout | null
  measureMeta: SachetMeasureMeta
}

export type SachetMeasureSegment = { role: "overall" | "lane" | "trim"; x1: number; x2: number; value: number; side?: "left" | "right" }

/** Amends v12: horizontal sachet dimensions as pure data. Overall always spans every
 * step plus each selected trim side; trim runs from the outer cutter edge to the trim's
 * inner boundary; lanes start after the left trim. Works for one step or many. */
export function resolveSachetMeasureSegments(meta: SachetMeasureMeta, stepEnabled: boolean): SachetMeasureSegment[] {
  const overall = meta.stepSpan * meta.stepCount + meta.leftTrimWidth + meta.rightTrimWidth
  const right = meta.margin + overall
  const segments: SachetMeasureSegment[] = [{ role: "overall", x1: meta.margin, x2: right, value: overall }]
  if (stepEnabled && meta.stepCount > 1) {
    for (let i = 0; i < meta.stepCount; i += 1) {
      const x1 = meta.margin + meta.leftTrimWidth + i * meta.stepSpan
      segments.push({ role: "lane", x1, x2: x1 + meta.stepSpan, value: meta.stepSpan })
    }
  }
  if (meta.leftTrimWidth > 0) segments.push({ role: "trim", side: "left", x1: meta.margin, x2: meta.margin + meta.leftTrimWidth, value: meta.leftTrimWidth })
  if (meta.rightTrimWidth > 0) segments.push({ role: "trim", side: "right", x1: right - meta.rightTrimWidth, x2: right, value: meta.rightTrimWidth })
  return segments
}

function resolveStepCount(spec: FlowwrapSpec, stepEnabled: boolean) {
  return sachetStepCount(spec,stepEnabled?spec.sachet?.stepCount:spec.sachet?.stepPair?2:1)
}

function getLaneSide(stepCount: number, laneIndex: number): "A" | "B" {
  const midLeft = Math.floor(stepCount / 2) - 1
  return laneIndex <= midLeft ? "A" : "B"
}

export function resolveSachetLayout(spec: FlowwrapSpec): ResolvedSachetLayout {
  const geometry = resolveFlowwrapGeometry(spec)
  const seals = resolveSealSizes(spec)
  const margin = DEFAULT_CANVAS_MARGIN
  const originY = margin
  const eyeMarkWidth =
    spec.eyeMarks && spec.eyeMarks.count > 0
      ? Math.max(1, spec.eyeMarks.width ?? 5)
      : 0
  const trimWidth = spec.sideSealPouch?.trimEnabled === false
    ? 0
    : Math.max(0, spec.sideSealPouch?.trimWidth ?? spec.sachet?.trimWidth ?? spec.sachet?.rightTrim ?? 0)
  const trimPosition = spec.sachet?.trimPosition ?? spec.sachet?.trackSide ?? "left"
  const leftTrimWidth = trimPosition === "left" || trimPosition === "both" ? trimWidth : 0
  const rightTrimWidth = trimPosition === "right" || trimPosition === "both" ? trimWidth : 0
  const trackSide = trimPosition === "right" ? "right" : "left"
  const stepEnabled = spec.sachet?.stepEnabled ?? false
  const stepCount = resolveStepCount(spec, stepEnabled)
  const stepPair = spec.sachet?.stepPair ?? false
  const stepSpan = spec.width
  const showLaneLabels = spec.sachet?.showLaneLabels === true
  const usePairEyeMarks =
    stepPair && spec.eyeMarks !== undefined && spec.eyeMarks.count > 0
  const trackWidth = usePairEyeMarks ? 0 : trimWidth
  const contentWidth = stepSpan * stepCount + leftTrimWidth + rightTrimWidth
  const totalWidth = contentWidth + margin * 2
  const totalHeight = spec.height + margin * 2
  const substrate = spec.substrate ?? "clear"
  const substrateFill =
    substrate === "paper"
      ? "#e8e1d6"
      : substrate === "white"
        ? "#f5f5f5"
        : "#b9dfe8"
  const substrateOpacity = substrate === "clear" ? 0.6 : 0.35
  const bodyOriginX = margin + leftTrimWidth
  // The trim band sits outside the steps: Left starts at the outer edge, Right starts
  // where the last step ends (Amends v12 fix; it previously overlapped the last step).
  const trackOriginX =
    trackSide === "left"
      ? margin
      : margin + leftTrimWidth + stepSpan * stepCount
  const eyemarkCutterOriginX =
    trackSide === "left" ? trackOriginX : trackOriginX - spec.width
  const eyemarkCutterWidth = trackWidth + spec.width
  const liveOriginX = bodyOriginX + geometry.liveRect.x
  const liveOriginY = originY + geometry.liveRect.y
  const safeZones = spec.safeZones ?? []
  const windows = spec.windows ?? []
  const attributeBoxes = spec.attributeBoxes ?? []
  const hangerSlots = spec.hangerSlots ?? []
  const tearNotch = spec.sachet?.tearNotch
  const foldLines = spec.foldLines ?? []
  const drawPerLaneOutline = !(stepEnabled && stepCount > 1)
  const lanes = Array.from({ length: stepCount }, (_, index) => {
    const isTrackLane =
      trackSide === "left" ? index === 0 : index === stepCount - 1
    const bodyOriginXForLane =
      margin + leftTrimWidth + index * stepSpan
    return {
      index,
      side: getLaneSide(stepCount, index),
      isTrackLane,
      bodyOriginX: bodyOriginXForLane,
      liveOriginX: bodyOriginXForLane + geometry.liveRect.x,
      outlineX:
        isTrackLane && trackSide === "left" ? margin : bodyOriginXForLane,
      outlineWidth: isTrackLane
        ? spec.width + trackWidth + (stepCount === 1 ? rightTrimWidth : 0)
        : spec.width
    }
  })

  let pairEyeMarks: ResolvedPairEyeMarkLayout | null = null
  if (usePairEyeMarks && stepCount >= 2) {
    const midRight = Math.floor(stepCount / 2)
    const baseCenterX =
      margin + leftTrimWidth + midRight * stepSpan
    const width = Math.max(1, spec.eyeMarks?.width ?? 5)
    const height = Math.max(1, spec.eyeMarks?.height ?? 5)
    const halfHeight = height / 2
    const offsetX = spec.eyeMarks?.offsetX ?? 0
    const minX = margin
    const maxX = margin + stepSpan * stepCount - width
    const desiredX = baseCenterX - width / 2 + offsetX
    const x = Math.max(minX, Math.min(maxX, desiredX))
    const topY = originY
    const bottomY = originY + spec.height - halfHeight
    const offsetY = spec.eyeMarks?.offsetY ?? 0
    const boundaries = Array.from(
      { length: Math.max(0, stepCount - 1) },
      (_, idx) =>
        margin + leftTrimWidth + (idx + 1) * stepSpan
    )
    const desiredCenterX = x + width / 2
    const isAligned =
      offsetY === 0 &&
      boundaries.some(boundary => Math.abs(boundary - desiredCenterX) <= 0.5)
    const fillColor = isAligned
      ? EYE_MARK_COLORS[spec.eyeMarks?.color ?? "black"] ?? "#000000"
      : "#d7261d"
    const strokeColor = isAligned ? fillColor : "#000000"
    pairEyeMarks = {
      x,
      width,
      halfHeight,
      topY,
      bottomY,
      fillColor,
      strokeColor,
      warning: isAligned
        ? null
        : "Eyemark must be centered between the cutter lanes."
    }
  }

  return {
    geometry,
    seals,
    margin,
    originY,
    eyeMarkWidth,
    rightTrim: rightTrimWidth,
    trimWidth,
    trimPosition,
    leftTrimWidth,
    rightTrimWidth,
    trackSide,
    stepEnabled,
    stepCount,
    stepSpan,
    showLaneLabels,
    usePairEyeMarks,
    trackWidth,
    contentWidth,
    totalWidth,
    totalHeight,
    substrate,
    substrateFill,
    substrateOpacity,
    bodyOriginX,
    trackOriginX,
    eyemarkCutterOriginX,
    eyemarkCutterWidth,
    liveOriginX,
    liveOriginY,
    safeZones,
    windows,
    attributeBoxes,
    hangerSlots,
    tearNotch,
    foldLines,
    drawPerLaneOutline,
    lanes,
    pairEyeMarks,
    measureMeta: {
      margin,
      originY,
      stepSpan,
      stepCount,
      trackWidth,
      trimWidth,
      trimPosition,
      leftTrimWidth,
      rightTrimWidth,
      trackSide,
      bodyOriginX,
      width: contentWidth,
      height: spec.height
    }
  }
}
