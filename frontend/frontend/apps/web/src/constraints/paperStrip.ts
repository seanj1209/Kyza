import type { PackValidationResult } from "../packs/packModule"
import type {
  AttributeBoxSpec,
  FlowwrapSpec,
  PaperStripClearStripWindowSpec,
  PaperStripLaneStripSpec
} from "../types/flowwrap"
import { validateFlowwrapSpec } from "./flowwrap"

export const PAPER_STRIP_DEFAULT_PAPER_COLOR = "#d6c3a6"

export const PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW: PaperStripClearStripWindowSpec = {
  stripCount: 0,
  stripWidth: 50,
  positionX: 0
}

export const PAPER_STRIP_DEFAULT_STEPPING = {
  stepCount: 1,
  gap: 0
} as const

export const PAPER_STRIP_CLEAR_STRIP_ATTRIBUTE_KIND = "clear-strip" as const

export const PAPER_STRIP_CONSTRAINTS = {
  stripCount: { min: 0, max: 10 },
  stripWidth: { min: 5, max: 200 },
  stepCount: { min: 1, max: 10 },
  gap: { min: 0, max: 20 }
} as const

export type PaperStripPlacementMetrics = Readonly<{
  stripCount: number
  stripWidth: number
  groupWidth: number
  liveWidth: number
  clearance: number
  minX: number
  maxX: number
  fits: boolean
}>

export type ResolvedPaperStripLane = Readonly<{
  laneIndex: number
  positionX: number
  stripWidth: number
}>

function formatMillimetres(value: number) {
  return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(2))}`
}

function getClearStripWindow(spec: FlowwrapSpec) {
  return spec.paperStrip?.clearStripWindow ?? PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW
}

function getStepping(spec: FlowwrapSpec) {
  return spec.paperStrip?.stepping ?? PAPER_STRIP_DEFAULT_STEPPING
}

export function getPaperStripPlacementMetrics(
  spec: FlowwrapSpec,
  stripWidth = getClearStripWindow(spec).stripWidth
): PaperStripPlacementMetrics {
  const strip = getClearStripWindow(spec)
  const leftSeal = spec.seals?.left ?? spec.seal
  const rightSeal = spec.seals?.right ?? spec.seal
  const liveWidth = spec.width - leftSeal - rightSeal
  const stripCount = strip.stripCount
  const groupWidth = stripWidth
  const clearance = spec.sealClearance ?? 0
  const minX = leftSeal + clearance
  const maxX = spec.width - rightSeal - clearance - groupWidth

  return {
    stripCount,
    stripWidth,
    groupWidth,
    liveWidth,
    clearance,
    minX,
    maxX,
    fits: maxX >= minX
  }
}

function getPaperStripLaneInputs(spec: FlowwrapSpec) {
  const strip = getClearStripWindow(spec)
  const stepCount = Math.max(1, Math.round(getStepping(spec).stepCount))
  const activeLaneCount = Math.max(
    0,
    Math.min(stepCount, Math.round(strip.stripCount))
  )
  const hasLaneState = (strip.lanes?.length ?? 0) > 0
  const laneEntries = (strip.lanes ?? [])
    .filter(
      (lane): lane is PaperStripLaneStripSpec =>
        Number.isFinite(lane.laneIndex) &&
        Number.isFinite(lane.positionX) &&
        Number.isFinite(lane.stripWidth)
    )
    .map(lane => [Math.round(lane.laneIndex), lane] as const)
  const laneMap = new Map<number, PaperStripLaneStripSpec>(laneEntries)

  return Array.from({ length: activeLaneCount }, (_, laneIndex) => {
    const lane = laneMap.get(laneIndex)
    const stripWidth =
      lane?.stripWidth ?? strip.stripWidth ?? PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripWidth
    const centeredPosition = getDefaultPaperStripPositionX(spec, stripWidth)
    const positionX =
      lane?.positionX ??
      (hasLaneState
        ? centeredPosition
        : strip.positionX ?? centeredPosition)
    return {
      laneIndex,
      positionX,
      stripWidth
    }
  })
}

export function getResolvedPaperStripLanes(spec: FlowwrapSpec): readonly ResolvedPaperStripLane[] {
  return getPaperStripLaneInputs(spec).map(lane => {
    const clampedPositionX = clampPaperStripPositionX(
      spec,
      lane.positionX,
      lane.stripWidth
    )
    const clampedStripWidth = clampPaperStripStripWidth(
      spec,
      clampedPositionX,
      lane.stripWidth
    )
    return {
      laneIndex: lane.laneIndex,
      positionX: clampPaperStripPositionX(spec, clampedPositionX, clampedStripWidth),
      stripWidth: clampedStripWidth
    }
  })
}

export function getPaperStripSelectedLaneIndex(spec: FlowwrapSpec) {
  const clearStripWindow = getClearStripWindow(spec)
  const lanes = getResolvedPaperStripLanes(spec)
  const requested = clearStripWindow.selectedLaneIndex
  if (lanes.length === 0 || requested === undefined) {
    return undefined
  }
  return lanes.some(lane => lane.laneIndex === requested)
    ? requested
    : undefined
}

export function clampPaperStripPositionX(
  spec: FlowwrapSpec,
  positionX: number,
  stripWidth = getClearStripWindow(spec).stripWidth
) {
  const metrics = getPaperStripPlacementMetrics(spec, stripWidth)
  if (!metrics.fits) {
    return metrics.minX
  }
  return Math.max(metrics.minX, Math.min(metrics.maxX, positionX))
}

export function clampPaperStripStripWidth(
  spec: FlowwrapSpec,
  positionX: number,
  stripWidth: number
) {
  const leftSeal = spec.seals?.left ?? spec.seal
  const rightSeal = spec.seals?.right ?? spec.seal
  const clearance = spec.sealClearance ?? 0
  const minX = leftSeal + clearance
  const rightBound = spec.width - rightSeal - clearance
  const clampedPositionX = Math.max(minX, Math.min(rightBound, positionX))
  const availableWidth = Math.max(0, rightBound - clampedPositionX)
  const boundedWidth = Math.min(
    PAPER_STRIP_CONSTRAINTS.stripWidth.max,
    availableWidth
  )
  if (boundedWidth < PAPER_STRIP_CONSTRAINTS.stripWidth.min) {
    return boundedWidth
  }
  return Math.max(
    PAPER_STRIP_CONSTRAINTS.stripWidth.min,
    Math.min(stripWidth, boundedWidth)
  )
}

export function getDefaultPaperStripPositionX(
  spec: FlowwrapSpec,
  stripWidth = getClearStripWindow(spec).stripWidth
) {
  const metrics = getPaperStripPlacementMetrics(spec, stripWidth)
  const centeredLeft = (spec.width - metrics.groupWidth) / 2
  return clampPaperStripPositionX(spec, centeredLeft, stripWidth)
}

/** Resolve the stepped cutter section under a dragged strip's absolute centre. */
export function getPaperStripLaneIndexAtX(
  spec: FlowwrapSpec,
  absoluteCentreX: number,
  firstCutterX: number
): number {
  const stepCount = Math.max(1, Math.round(getStepping(spec).stepCount))
  const stepSpan = spec.width + getStepping(spec).gap
  if (!Number.isFinite(absoluteCentreX) || stepSpan <= 0) {
    return 0
  }
  const firstCentreX = firstCutterX + spec.width / 2
  return Math.max(
    0,
    Math.min(stepCount - 1, Math.round((absoluteCentreX - firstCentreX) / stepSpan))
  )
}

/** Place additional clear strips alongside existing strips in the same step. */
export function getAvailablePaperStripPositionX(
  spec: FlowwrapSpec,
  laneIndex: number,
  stripWidth: number
): number {
  const centered = getDefaultPaperStripPositionX(spec, stripWidth)
  const occupied = (spec.attributeBoxes ?? []).filter(
    box =>
      isPaperStripClearStripAttribute(box) &&
      box.enabled !== false &&
      (box.laneIndex ?? 0) === laneIndex
  )
  if (occupied.length === 0) {
    return centered
  }
  const metrics = getPaperStripPlacementMetrics(spec, stripWidth)
  const candidates = [
    centered,
    metrics.minX,
    metrics.maxX,
    ...occupied.flatMap(box => [box.x - stripWidth, box.x + box.width])
  ]
    .map(candidate => clampPaperStripPositionX(spec, candidate, stripWidth))
    .sort((a, b) => Math.abs(a - centered) - Math.abs(b - centered))
  return (
    candidates.find(positionX =>
      occupied.every(box =>
        positionX + stripWidth <= box.x || positionX >= box.x + box.width
      )
    ) ?? centered
  )
}

export function isPaperStripClearStripAttribute(box: AttributeBoxSpec) {
  return box.kind === PAPER_STRIP_CLEAR_STRIP_ATTRIBUTE_KIND
}

export function clampPaperStripClearStripAttribute(
  spec: FlowwrapSpec,
  box: AttributeBoxSpec
): AttributeBoxSpec {
  // Clamp width to the full usable lane before clamping position. Clamping
  // against an out-of-bounds dragged X used to shrink the window near edges.
  const minX = getPaperStripPlacementMetrics(spec, box.width).minX
  const width = clampPaperStripStripWidth(spec, minX, box.width)
  const x = clampPaperStripPositionX(spec, box.x, width)
  return {
    ...box,
    x,
    y: 0,
    width,
    height: spec.height,
    rotation: 0
  }
}

export function createPaperStripClearStripAttribute(
  spec: FlowwrapSpec,
  laneIndex: number,
  overrides: Partial<AttributeBoxSpec> = {}
): AttributeBoxSpec {
  const width = overrides.width ?? PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripWidth
  const x = overrides.x ?? getAvailablePaperStripPositionX(spec, laneIndex, width)
  return clampPaperStripClearStripAttribute(spec, {
    id: overrides.id ?? `attr-clear-strip-${laneIndex}`,
    kind: PAPER_STRIP_CLEAR_STRIP_ATTRIBUTE_KIND,
    laneIndex,
    x,
    y: 0,
    width,
    height: spec.height,
    enabled: overrides.enabled ?? true,
    selected: overrides.selected ?? false,
    laneSide: overrides.laneSide,
    label: overrides.label,
    labelKey: overrides.labelKey
  })
}

export function getMigratedPaperStripClearStripAttributes(
  spec: FlowwrapSpec
): AttributeBoxSpec[] {
  return getResolvedPaperStripLanes(spec).map(lane =>
    createPaperStripClearStripAttribute(spec, lane.laneIndex, {
      id: `attr-clear-strip-${lane.laneIndex}`,
      x: lane.positionX,
      width: lane.stripWidth
    })
  )
}

export function validatePaperStripSpec(spec: FlowwrapSpec): PackValidationResult {
  const baseValidation = validateFlowwrapSpec(spec)
  const errors = [...baseValidation.errors]
  const warnings = [...(baseValidation.warnings ?? [])]
  if(spec.paperStrip?.stepping?.syncMirror===false){
    const active=spec.paperStrip.stepping.activeStep??0
    for(const [index,elements] of Object.entries(spec.paperStrip.stepping.elementsByStep??{})){
      if(Number(index)===active || Number(index)>=(spec.paperStrip.stepping.stepCount??1))continue
      const collections=["attributeBoxes","safeZones","windows","hangerSlots","halfMoonCutouts","eyeMarks","foldLines","perfs"] as const
      const validation=validateFlowwrapSpec({...spec,...Object.fromEntries(collections.map(key=>[key,elements[key]]))})
      errors.push(...validation.errors.map(message=>`Step ${Number(index)+1}: ${message}`))
      warnings.push(...(validation.warnings??[]).map(message=>`Step ${Number(index)+1}: ${message}`))
    }
  }
  const strip = getClearStripWindow(spec)
  const stepping = getStepping(spec)
  const rawLanes = getPaperStripLaneInputs(spec)
  const laneCount = Math.max(
    0,
    Math.min(Math.max(1, Math.round(stepping.stepCount)), Math.round(strip.stripCount))
  )

  if (
    strip.stripCount < PAPER_STRIP_CONSTRAINTS.stripCount.min ||
    strip.stripCount > PAPER_STRIP_CONSTRAINTS.stripCount.max
  ) {
    errors.push(
      `Clear strip count must be between ${PAPER_STRIP_CONSTRAINTS.stripCount.min} and ${PAPER_STRIP_CONSTRAINTS.stripCount.max}.`
    )
  }

  if (
    strip.stripWidth < PAPER_STRIP_CONSTRAINTS.stripWidth.min ||
    strip.stripWidth > PAPER_STRIP_CONSTRAINTS.stripWidth.max
  ) {
    errors.push(
      `Clear strip width must be between ${PAPER_STRIP_CONSTRAINTS.stripWidth.min}mm and ${PAPER_STRIP_CONSTRAINTS.stripWidth.max}mm.`
    )
  }

  if (
    stepping.stepCount < PAPER_STRIP_CONSTRAINTS.stepCount.min ||
    stepping.stepCount > PAPER_STRIP_CONSTRAINTS.stepCount.max
  ) {
    errors.push(
      `Step count must be between ${PAPER_STRIP_CONSTRAINTS.stepCount.min} and ${PAPER_STRIP_CONSTRAINTS.stepCount.max}.`
    )
  }

  if (
    stepping.gap < PAPER_STRIP_CONSTRAINTS.gap.min ||
    stepping.gap > PAPER_STRIP_CONSTRAINTS.gap.max
  ) {
    errors.push(
      `Step gap must be between ${PAPER_STRIP_CONSTRAINTS.gap.min}mm and ${PAPER_STRIP_CONSTRAINTS.gap.max}mm.`
    )
  }

  for (let index = 0; index < laneCount; index += 1) {
    const lane = rawLanes[index]
    if (!lane) {
      continue
    }
    const metrics = getPaperStripPlacementMetrics(spec, lane.stripWidth)
    if (
      lane.stripWidth < PAPER_STRIP_CONSTRAINTS.stripWidth.min ||
      lane.stripWidth > PAPER_STRIP_CONSTRAINTS.stripWidth.max
    ) {
      errors.push(
        `Clear strip width must be between ${PAPER_STRIP_CONSTRAINTS.stripWidth.min}mm and ${PAPER_STRIP_CONSTRAINTS.stripWidth.max}mm.`
      )
      break
    }
    if (!metrics.fits) {
      errors.push("Clear strip group does not fit within live width")
      break
    }
    if (lane.positionX < metrics.minX || lane.positionX > metrics.maxX) {
      errors.push(
        `Clear strip position must be between ${formatMillimetres(metrics.minX)}mm and ${formatMillimetres(metrics.maxX)}mm.`
      )
      break
    }
  }

  return { errors, warnings }
}
