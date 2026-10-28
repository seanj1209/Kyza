import type { FlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import { resolveFlowwrapGeometry } from "../../../geometry/flowwrapGeometry"
import type { Rect } from "../../../geometry/rect"
import type { FlowwrapSpec } from "../../../types/flowwrap"
import { buildFoldLines } from "../../../geometry/foldLines"
import { getPaperStripStepSpec } from "../../../../../../packages/cutter-engine/actions/paperStripSteps"
import {
  getDefaultPaperStripPositionX,
  getPaperStripPlacementMetrics,
  getPaperStripSelectedLaneIndex,
  getResolvedPaperStripLanes,
  isPaperStripClearStripAttribute
} from "../../../constraints/paperStrip"

type ResolvedClearStripRect = Readonly<{
  laneIndex: number
  x: number
  y: number
  width: number
  height: number
}>

export type ResolvedPaperStripInstance = Readonly<{
  index: number
  xOffset: number
  cutterRect: Rect
  liveRect: Rect
  sealRects: FlowwrapGeometry["sealRects"]
  seals: FlowwrapGeometry["seals"]
  clearStripRect: ResolvedClearStripRect | null
  clearStripRects: readonly ResolvedClearStripRect[]
  clearStripMinX: number
  clearStripMaxX: number
  foldXs: readonly number[]
  selected: boolean
}>

export type ResolvedPaperStripLayout = Readonly<{
  cutterRect: FlowwrapGeometry["cutterRect"]
  liveRect: FlowwrapGeometry["liveRect"]
  sealRects: FlowwrapGeometry["sealRects"]
  seals: FlowwrapGeometry["seals"]
  totalWidth: number
  totalHeight: number
  clearStrip: Readonly<{
    stripCount: number
    stripWidth: number
    groupWidth: number
    clearance: number
    minX: number
    maxX: number
    resolvedPositionX: number
    selectedLaneIndex?: number
  }>
  measurements: Readonly<{
    overallWidth: number
    overallHeight: number
    firstInstanceXOffset: number
    firstInstanceCutterRect: Rect
    firstInstanceLiveRect: Rect
    clearStripGroupRect: Rect
    leftSeal: number
    rightSeal: number
    topSeal: number
    bottomSeal: number
    leftGap: number
    rightGap: number
  }>
  instances: readonly ResolvedPaperStripInstance[]
}>

function offsetRect(rect: Rect, xOffset: number): Rect {
  return {
    ...rect,
    x: rect.x + xOffset
  }
}

function offsetSealRects(
  sealRects: FlowwrapGeometry["sealRects"],
  xOffset: number
) {
  return {
    top: offsetRect(sealRects.top, xOffset),
    bottom: offsetRect(sealRects.bottom, xOffset),
    left: offsetRect(sealRects.left, xOffset),
    right: offsetRect(sealRects.right, xOffset)
  }
}

export function resolvePaperStripLayout(
  spec: FlowwrapSpec,
  geometry: FlowwrapGeometry = resolveFlowwrapGeometry(spec)
): ResolvedPaperStripLayout {
  const strip = spec.paperStrip?.clearStripWindow
  const stepping = spec.paperStrip?.stepping
  const stepCount = stepping?.stepCount ?? 1
  const gap = stepping?.gap ?? 0
  const attributeLanes = (spec.attributeBoxes ?? [])
    .filter(box => box.enabled !== false)
    .filter(isPaperStripClearStripAttribute)
    .map(box => ({
      laneIndex: Math.max(0, Math.round(box.laneIndex ?? 0)),
      positionX: box.x,
      stripWidth: box.width,
      selected: box.selected === true
    }))
    .sort((left, right) => left.laneIndex - right.laneIndex)
  const resolvedLanes =
    attributeLanes.length > 0 ? attributeLanes : getResolvedPaperStripLanes(spec)
  const selectedLaneIndex =
    attributeLanes.find(lane => lane.selected)?.laneIndex ??
    getPaperStripSelectedLaneIndex(spec)
  const firstLane = resolvedLanes[0]
  const metrics = getPaperStripPlacementMetrics(
    spec,
    firstLane?.stripWidth ?? strip?.stripWidth ?? 0
  )
  const resolvedPositionX =
    firstLane?.positionX ?? getDefaultPaperStripPositionX(spec, strip?.stripWidth ?? 0)

  const instances = Array.from({ length: stepCount }, (_, index) => {
    const xOffset = index * (geometry.cutterRect.width + gap)
    // Match the step projection used by renderPaperStripStepElements.
    // A strip's laneIndex is not the owning repeat in the step model.
    const stepSpec = getPaperStripStepSpec(spec, index)
    const stepLanes = (stepSpec.attributeBoxes ?? [])
      .filter(box => box.enabled !== false && isPaperStripClearStripAttribute(box))
      .map(box => ({ laneIndex: index, positionX: box.x, stripWidth: box.width }))
    const lane = stepLanes[0]
    const laneRects = stepLanes
      .map(item => ({
        laneIndex: item.laneIndex,
        x: geometry.cutterRect.x + item.positionX + xOffset,
        y: geometry.cutterRect.y,
        width: item.stripWidth,
        height: geometry.cutterRect.height
      }))
      .sort((left, right) => left.x - right.x)
    const laneMetrics = getPaperStripPlacementMetrics(
      spec,
      lane?.stripWidth ?? strip?.stripWidth ?? 0
    )
    const foldMinX = geometry.liveRect.x + Math.max(0, stepSpec.bleed ?? 0)
    const foldMaxX = geometry.liveRect.x + geometry.liveRect.width - Math.max(0, stepSpec.bleed ?? 0)
    const foldXs = buildFoldLines(stepSpec.foldLines ?? [], geometry.liveRect.x, 0, 0,
      stepSpec.width, stepSpec.height, foldMinX, foldMaxX)
      .filter((_, foldIndex) => stepSpec.foldLines?.[foldIndex]?.orientation === "vertical")
      .map(line => line.x1 + xOffset)
      .sort((a, b) => a - b)
    return {
      index,
      xOffset,
      cutterRect: offsetRect(geometry.cutterRect, xOffset),
      liveRect: offsetRect(geometry.liveRect, xOffset),
      sealRects: offsetSealRects(geometry.sealRects, xOffset),
      seals: geometry.seals,
      clearStripRect: laneRects[0] ?? null,
      clearStripRects: laneRects,
      clearStripMinX: laneMetrics.minX,
      clearStripMaxX: laneMetrics.maxX,
      foldXs,
      selected: lane?.laneIndex === selectedLaneIndex
    }
  })
  const overallWidth =
    stepCount * geometry.cutterRect.width + Math.max(0, stepCount - 1) * gap
  const overallHeight = geometry.cutterRect.height
  const clearStripGroupX = geometry.cutterRect.x + resolvedPositionX
  const clearStripGroupWidth = firstLane?.stripWidth ?? metrics.groupWidth
  const clearStripGroupRect: Rect = {
    x: clearStripGroupX,
    y: geometry.cutterRect.y,
    width: clearStripGroupWidth,
    height: geometry.cutterRect.height
  }
  const liveRight = geometry.liveRect.x + geometry.liveRect.width
  const groupRight = clearStripGroupX + clearStripGroupWidth
  const leftGap = Math.max(0, clearStripGroupX - geometry.liveRect.x)
  const rightGap = Math.max(0, liveRight - groupRight)

  return {
    cutterRect: geometry.cutterRect,
    liveRect: geometry.liveRect,
    sealRects: geometry.sealRects,
    seals: geometry.seals,
    totalWidth:
      stepCount * geometry.cutterRect.width + Math.max(0, stepCount - 1) * gap,
    totalHeight: geometry.cutterRect.height,
    clearStrip: {
      stripCount: resolvedLanes.length,
      stripWidth: firstLane?.stripWidth ?? 0,
      groupWidth: clearStripGroupWidth,
      clearance: metrics.clearance,
      minX: metrics.minX,
      maxX: metrics.maxX,
      resolvedPositionX,
      selectedLaneIndex
    },
    measurements: {
      overallWidth,
      overallHeight,
      firstInstanceXOffset: instances[0]?.xOffset ?? 0,
      firstInstanceCutterRect: instances[0]?.cutterRect ?? geometry.cutterRect,
      firstInstanceLiveRect: instances[0]?.liveRect ?? geometry.liveRect,
      clearStripGroupRect,
      leftSeal: geometry.seals.left,
      rightSeal: geometry.seals.right,
      topSeal: geometry.seals.top,
      bottomSeal: geometry.seals.bottom,
      leftGap,
      rightGap
    },
    instances
  }
}
