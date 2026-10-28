import { applySubstrateAppearance } from "./substrateAppearance"
import { renderEyeMarks } from "./svgEyeMarks"
import { resolveSachetLayout, resolveSachetMeasureSegments, type SachetMeasureMeta } from "../core/geometry/resolvers/resolveSachetLayout"
import { resolveSachetEyemarkPlacements } from "../core/geometry/resolvers/resolveSachetEyemarkPlacement"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"
import { getSachetStepSpec, sachetActiveId, sachetStepIds, sachetSourceId, sachetSynced } from "../../../../packages/cutter-engine/actions/sachetSteps"
import { renderPaperStripStepElements } from "./paperStripStepElements"

const SVG_NS = "http://www.w3.org/2000/svg"

type StrokeStyle = {
  stroke: string
  strokeWidth: number
  dash?: string
  fill?: string
  opacity?: number
}

type StyleKey = "cutLine" | "seals" | "fold" | "substrate"

const STYLES: Record<StyleKey, StrokeStyle> = {
  substrate: {
    stroke: "#b9dfe8",
    strokeWidth: 0,
    fill: "#b9dfe8",
    opacity: 0.6
  },
  cutLine: { stroke: "#2eb774", strokeWidth: 0.75 },
  seals: { stroke: "#2eb774", strokeWidth: 0.6, opacity: 0.35 },
  fold: { stroke: "#2eb774", strokeWidth: 0.3 }
}

const DIMENSION_OFFSET = 5
const DIMENSION_STROKE = "#d23429"
const DIMENSION_STROKE_WIDTH = 0.3
const DIMENSION_CAP = 2
const DIMENSION_TEXT_SIZE = 3

function group(id: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, "g")
  g.setAttribute("id", id)
  g.setAttribute("data-layer-id", id)
  return g
}

function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  styleKey: StyleKey
) {
  const style = STYLES[styleKey]
  const r = document.createElementNS(SVG_NS, "rect")
  r.setAttribute("x", x.toString())
  r.setAttribute("y", y.toString())
  r.setAttribute("width", w.toString())
  r.setAttribute("height", h.toString())
  r.setAttribute("fill", style.fill ?? "none")
  r.setAttribute("stroke", style.stroke)
  r.setAttribute("stroke-width", style.strokeWidth.toString())
  if (style.dash) {
    r.setAttribute("stroke-dasharray", style.dash)
  }
  if (style.opacity !== undefined) {
    r.setAttribute("opacity", style.opacity.toString())
  }
  return r
}

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  styleKey: StyleKey
) {
  const style = STYLES[styleKey]
  const l = document.createElementNS(SVG_NS, "line")
  l.setAttribute("x1", x1.toString())
  l.setAttribute("y1", y1.toString())
  l.setAttribute("x2", x2.toString())
  l.setAttribute("y2", y2.toString())
  l.setAttribute("stroke", style.stroke)
  l.setAttribute("stroke-width", style.strokeWidth.toString())
  if (style.dash) {
    l.setAttribute("stroke-dasharray", style.dash)
  }
  if (style.opacity !== undefined) {
    l.setAttribute("opacity", style.opacity.toString())
  }
  return l
}

function lineCustom(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: string,
  strokeWidth: number
) {
  const l = document.createElementNS(SVG_NS, "line")
  l.setAttribute("x1", x1.toString())
  l.setAttribute("y1", y1.toString())
  l.setAttribute("x2", x2.toString())
  l.setAttribute("y2", y2.toString())
  l.setAttribute("stroke", stroke)
  l.setAttribute("stroke-width", strokeWidth.toString())
  return l
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.6
}

function dimensionLineWithCaps(
  layer: SVGGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  textOffset: { x: number; y: number },
  rotate = 0,
  role?: string
) {
  const isHorizontal = y1 === y2
  let fontSize = DIMENSION_TEXT_SIZE
  const strokeWidth = DIMENSION_STROKE_WIDTH
  const capSize = DIMENSION_CAP
  const length = Math.max(0, Math.abs(isHorizontal ? x2 - x1 : y2 - y1))
  if (label && length > 0) {
    const gap = 2
    const maxTextSize = Math.max(
      2,
      (length - gap * 2) / (label.length * 0.6)
    )
    fontSize = Math.min(fontSize, maxTextSize)
  }
  const midX = (x1 + x2) / 2 + textOffset.x
  const midY = (y1 + y2) / 2 + textOffset.y

  const groupEl = document.createElementNS(SVG_NS, "g")
  if (role) {
    groupEl.setAttribute("data-role", role)
  }

  if (label) {
    const gap = 2
    if (isHorizontal) {
      const textWidth = estimateTextWidth(label, fontSize)
      const leftEnd = midX - textWidth / 2 - gap
      const rightStart = midX + textWidth / 2 + gap
      const leftLine = document.createElementNS(SVG_NS, "line")
      leftLine.setAttribute("x1", x1.toString())
      leftLine.setAttribute("y1", y1.toString())
      leftLine.setAttribute("x2", leftEnd.toString())
      leftLine.setAttribute("y2", y2.toString())
      leftLine.setAttribute("stroke", DIMENSION_STROKE)
      leftLine.setAttribute("stroke-width", strokeWidth.toString())
      groupEl.appendChild(leftLine)

      const rightLine = document.createElementNS(SVG_NS, "line")
      rightLine.setAttribute("x1", rightStart.toString())
      rightLine.setAttribute("y1", y1.toString())
      rightLine.setAttribute("x2", x2.toString())
      rightLine.setAttribute("y2", y2.toString())
      rightLine.setAttribute("stroke", DIMENSION_STROKE)
      rightLine.setAttribute("stroke-width", strokeWidth.toString())
      groupEl.appendChild(rightLine)
    } else {
      const textWidth = estimateTextWidth(label, fontSize)
      const textHalfHeight = textWidth / 2
      const gapY = Math.max(gap, fontSize * 1.2)
      const topEnd = midY - textHalfHeight - gapY
      const bottomStart = midY + textHalfHeight + gapY
      const yStart = Math.min(y1, y2)
      const yEnd = Math.max(y1, y2)
      const topLine = document.createElementNS(SVG_NS, "line")
      topLine.setAttribute("x1", x1.toString())
      topLine.setAttribute("y1", yStart.toString())
      topLine.setAttribute("x2", x2.toString())
      topLine.setAttribute("y2", topEnd.toString())
      topLine.setAttribute("stroke", DIMENSION_STROKE)
      topLine.setAttribute("stroke-width", strokeWidth.toString())
      groupEl.appendChild(topLine)

      const bottomLine = document.createElementNS(SVG_NS, "line")
      bottomLine.setAttribute("x1", x1.toString())
      bottomLine.setAttribute("y1", bottomStart.toString())
      bottomLine.setAttribute("x2", x2.toString())
      bottomLine.setAttribute("y2", yEnd.toString())
      bottomLine.setAttribute("stroke", DIMENSION_STROKE)
      bottomLine.setAttribute("stroke-width", strokeWidth.toString())
      groupEl.appendChild(bottomLine)
    }
  } else {
    const lineEl = document.createElementNS(SVG_NS, "line")
    lineEl.setAttribute("x1", x1.toString())
    lineEl.setAttribute("y1", y1.toString())
    lineEl.setAttribute("x2", x2.toString())
    lineEl.setAttribute("y2", y2.toString())
    lineEl.setAttribute("stroke", DIMENSION_STROKE)
    lineEl.setAttribute("stroke-width", strokeWidth.toString())
    groupEl.appendChild(lineEl)
  }

  const cap1 = document.createElementNS(SVG_NS, "line")
  if (isHorizontal) {
    cap1.setAttribute("x1", x1.toString())
    cap1.setAttribute("y1", (y1 - capSize).toString())
    cap1.setAttribute("x2", x1.toString())
    cap1.setAttribute("y2", (y1 + capSize).toString())
  } else {
    cap1.setAttribute("x1", (x1 - capSize).toString())
    cap1.setAttribute("y1", y1.toString())
    cap1.setAttribute("x2", (x1 + capSize).toString())
    cap1.setAttribute("y2", y1.toString())
  }
  cap1.setAttribute("stroke", DIMENSION_STROKE)
  cap1.setAttribute("stroke-width", strokeWidth.toString())
  groupEl.appendChild(cap1)

  const cap2 = document.createElementNS(SVG_NS, "line")
  if (isHorizontal) {
    cap2.setAttribute("x1", x2.toString())
    cap2.setAttribute("y1", (y2 - capSize).toString())
    cap2.setAttribute("x2", x2.toString())
    cap2.setAttribute("y2", (y2 + capSize).toString())
  } else {
    cap2.setAttribute("x1", (x2 - capSize).toString())
    cap2.setAttribute("y1", y2.toString())
    cap2.setAttribute("x2", (x2 + capSize).toString())
    cap2.setAttribute("y2", y2.toString())
  }
  cap2.setAttribute("stroke", DIMENSION_STROKE)
  cap2.setAttribute("stroke-width", strokeWidth.toString())
  groupEl.appendChild(cap2)

  const textEl = document.createElementNS(SVG_NS, "text")
  textEl.setAttribute("x", midX.toString())
  textEl.setAttribute("y", midY.toString())
  textEl.setAttribute("fill", DIMENSION_STROKE)
  textEl.setAttribute("font-size", fontSize.toString())
  textEl.setAttribute("text-anchor", "middle")
  textEl.setAttribute("dominant-baseline", "middle")
  if (rotate !== 0) {
    textEl.setAttribute("transform", `rotate(${rotate} ${midX} ${midY})`)
  }
  textEl.textContent = label
  groupEl.appendChild(textEl)
  layer.appendChild(groupEl)
}

function clearSachetMeasureGroups(layer: SVGGElement) {
  layer
    .querySelectorAll('[data-role^="sachet-measure"]')
    .forEach(node => node.remove())
}

function renderSachetMeasurements(
  layer: SVGGElement,
  spec: FlowwrapSpec,
  meta: SachetMeasureMeta,
  options: { main: boolean; sub: boolean }
) {
  const dimTopY = meta.originY - DIMENSION_OFFSET
  const stepEnabled = spec.sachet?.stepEnabled ?? false
  const showOverallMeasure = spec.sachet?.showOverallMeasure !== false
  const showTrackMeasure = spec.sachet?.showTrackMeasure !== false
  // The finished width includes every trim edge. In Both mode the two trims
  // are independent physical widths sharing one Trim Width value.
  const segments = resolveSachetMeasureSegments(meta, stepEnabled)

  // Overall finished width: always shown (one lane or many) and includes every trim side.
  for (const segment of segments.filter(item => item.role === "overall")) {
    if (!options.main || !showOverallMeasure) break
    const overallY = dimTopY - 5
    dimensionLineWithCaps(layer, segment.x1, overallY, segment.x2, overallY, `W ${formatMetricMeasurement(segment.value)}`, { x: 0, y: 0 }, 0, "sachet-measure-overall")
  }

  if (options.main) {
    for (const segment of segments.filter(item => item.role === "lane")) {
      dimensionLineWithCaps(layer, segment.x1, dimTopY, segment.x2, dimTopY, formatMetricMeasurement(segment.value), { x: 0, y: 0 }, 0, "sachet-measure-lane")
    }
    // Trim width shares the lane baseline and runs from the trim cutter's outer
    // edge to its inner boundary, with extension lines down to the cutter.
    for (const segment of segments.filter(item => item.role === "trim")) {
      if (!showTrackMeasure) break
      dimensionLineWithCaps(layer, segment.x1, dimTopY, segment.x2, dimTopY, formatMetricMeasurement(segment.value), { x: 0, y: 0 }, 0, "sachet-measure-trim")
      const extension = document.createElementNS(SVG_NS, "g")
      extension.setAttribute("data-role", "sachet-measure-trim-extension")
      for (const x of [segment.x1, segment.x2]) {
        const line = document.createElementNS(SVG_NS, "line")
        line.setAttribute("x1", x.toString())
        line.setAttribute("y1", meta.originY.toString())
        line.setAttribute("x2", x.toString())
        line.setAttribute("y2", (dimTopY - DIMENSION_CAP / 2).toString())
        line.setAttribute("stroke", DIMENSION_STROKE)
        line.setAttribute("stroke-width", (DIMENSION_STROKE_WIDTH * 0.7).toString())
        line.setAttribute("stroke-dasharray", "0.8 0.6")
        extension.appendChild(line)
      }
      layer.appendChild(extension)
    }
  }

  if (options.sub) {
    dimensionLineWithCaps(
      layer,
      meta.margin,
      dimTopY,
      meta.margin + meta.width,
      dimTopY,
      `W ${formatMetricMeasurement(meta.width)}`,
      { x: 0, y: 0 },
      0,
      "sachet-measure-width"
    )

  }

  if (options.main) {
    const dimLeftX = meta.margin - DIMENSION_OFFSET
    dimensionLineWithCaps(
      layer,
      dimLeftX,
      meta.originY,
      dimLeftX,
      meta.originY + meta.height,
      `H ${formatMetricMeasurement(meta.height)}`,
      { x: 0, y: 0 },
      -90,
      "sachet-measure-height"
    )
  }
}

export function renderResolvedSachet(
  spec: FlowwrapSpec,
  layout: ReturnType<typeof resolveSachetLayout>,
  options: RenderOptions = {}
): SVGSVGElement {
  const renderMode = options.renderMode ?? "edit"
  const {
    geometry: bodyGeometry,
    seals,
    margin,
    originY,
    eyeMarkWidth,
    rightTrim,
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
    eyemarkCutterOriginX,
    eyemarkCutterWidth,
    liveOriginX,
    liveOriginY,
    tearNotch,
    drawPerLaneOutline,
    lanes,
    pairEyeMarks,
    measureMeta
  } = layout

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.setAttribute("data-substrate", substrate)
  svg.style.background = "#fff"

  const substrateLayer = group("substrate_background")
  const cutLayer = group("cut_line")
  const foldLayer = group("fold_lines")
  const sealLayer = group("seal_areas")
  const safeZoneLayer = group("safe_zones")
  const windowLayer = group("windows")
  const attributeBoxLayer = group("attribute_boxes")
  const hangerSlotLayer = group("hanger_slots")
  const perfLayer = group("perf_layer")
  const tearNotchLayer = group("tear_notches")
  const eyemarkLayer = group("eyemark_track")
  const measurementLayer = group("measurement_annotations")
  const annotationLayer = group("annotations")
  const warningLayer = group("soft_warnings")

  svg.appendChild(substrateLayer)
  svg.appendChild(sealLayer)
  svg.appendChild(safeZoneLayer)
  svg.appendChild(windowLayer)
  svg.appendChild(attributeBoxLayer)
  svg.appendChild(hangerSlotLayer)
  svg.appendChild(foldLayer)
  svg.appendChild(perfLayer)
  svg.appendChild(eyemarkLayer)
  svg.appendChild(cutLayer)
  svg.appendChild(tearNotchLayer)
  svg.appendChild(measurementLayer)
  svg.appendChild(annotationLayer)
  svg.appendChild(warningLayer)

  cutLayer.setAttribute("data-layer-id", "cutter-outline")
  substrateLayer.setAttribute("data-layer-id", "substrate")
  sealLayer.setAttribute("data-layer-id", "seal-areas")
  foldLayer.setAttribute("data-layer-id", "fold-lines")
  tearNotchLayer.setAttribute("data-layer-id", "tear-notches")
  perfLayer.setAttribute("data-layer-id", "perf-lines")
  safeZoneLayer.setAttribute("data-layer-id", "safe-zones")
  windowLayer.setAttribute("data-layer-id", "windows")
  attributeBoxLayer.setAttribute("data-layer-id", "notes")
  hangerSlotLayer.setAttribute("data-layer-id", "hanger-slots")
  eyemarkLayer.setAttribute("data-layer-id", "eyemarks")
  measurementLayer.setAttribute("data-layer-id", "measurement-guides")
  annotationLayer.setAttribute("data-layer-id", "annotations")

  const clipPath = document.createElementNS(SVG_NS, "clipPath")
  clipPath.setAttribute("id", "cut_clip")
  const clipRect = document.createElementNS(SVG_NS, "rect")
  clipRect.setAttribute("x", margin.toString())
  clipRect.setAttribute("y", originY.toString())
  clipRect.setAttribute("width", contentWidth.toString())
  clipRect.setAttribute("height", spec.height.toString())
  clipPath.appendChild(clipRect)
  const defs = document.createElementNS(SVG_NS, "defs")
  defs.appendChild(clipPath)
  svg.appendChild(defs)

  ;[
    foldLayer,
    sealLayer,
    safeZoneLayer,
    windowLayer,
    attributeBoxLayer,
    hangerSlotLayer,
    perfLayer,
    tearNotchLayer,
    eyemarkLayer
  ].forEach(layer => {
    layer.setAttribute("clip-path", "url(#cut_clip)")
  })

  const substrateRect = rect(margin, originY, contentWidth, spec.height, "substrate")
  substrateRect.setAttribute("fill", substrateFill)
  substrateRect.setAttribute("opacity", substrateOpacity.toString())
  substrateLayer.appendChild(substrateRect)

  safeZoneLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  safeZoneLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  safeZoneLayer.setAttribute("data-handle-size", "12")
  windowLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  windowLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  windowLayer.setAttribute("data-live-width", bodyGeometry.liveRect.width.toString())
  windowLayer.setAttribute("data-live-height", bodyGeometry.liveRect.height.toString())
  attributeBoxLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  attributeBoxLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  attributeBoxLayer.setAttribute("data-sachet-step-enabled", stepEnabled ? "true" : "false")
  attributeBoxLayer.setAttribute("data-sachet-step-count", stepCount.toString())
  attributeBoxLayer.setAttribute("data-sachet-step-span", stepSpan.toString())
  hangerSlotLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  hangerSlotLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  hangerSlotLayer.setAttribute("data-live-width", bodyGeometry.liveRect.width.toString())
  sealLayer.setAttribute("data-origin-x", bodyOriginX.toString())
  sealLayer.setAttribute("data-origin-y", originY.toString())
  sealLayer.setAttribute("data-live-width", bodyGeometry.liveRect.width.toString())
  sealLayer.setAttribute("data-live-height", bodyGeometry.liveRect.height.toString())
  sealLayer.setAttribute("data-cutter-width", spec.width.toString())
  sealLayer.setAttribute("data-cutter-height", spec.height.toString())

  eyemarkLayer.setAttribute("data-cutter-origin-x", eyemarkCutterOriginX.toString())
  eyemarkLayer.setAttribute("data-cutter-origin-y", originY.toString())
  eyemarkLayer.setAttribute("data-cutter-width", eyemarkCutterWidth.toString())
  eyemarkLayer.setAttribute("data-cutter-height", spec.height.toString())
  eyemarkLayer.setAttribute("data-seal-top", spec.height.toString())
  eyemarkLayer.setAttribute("data-seal-bottom", spec.height.toString())
  eyemarkLayer.setAttribute("data-seal-left", trackWidth.toString())
  eyemarkLayer.setAttribute("data-seal-right", trackWidth.toString())
  eyemarkLayer.setAttribute("data-track-side", trackSide)
  eyemarkLayer.setAttribute("data-track-body-width", spec.width.toString())
  if (usePairEyeMarks && spec.eyeMarks) {
    const midRight = Math.floor(stepCount / 2)
    const baseCenterX =
      margin + (trackSide === "left" ? trackWidth : 0) + midRight * stepSpan
    const width = Math.max(1, spec.eyeMarks.width ?? 5)
    const height = Math.max(1, spec.eyeMarks.height ?? 5)
    const halfHeight = height / 2
    eyemarkLayer.setAttribute("data-eyemark-pair", "true")
    eyemarkLayer.setAttribute("data-eyemark-center-x", baseCenterX.toString())
    eyemarkLayer.setAttribute("data-eyemark-width", width.toString())
    eyemarkLayer.setAttribute("data-eyemark-half-height", halfHeight.toString())
    eyemarkLayer.setAttribute("data-eyemark-origin-y", originY.toString())
    eyemarkLayer.setAttribute("data-eyemark-height", spec.height.toString())
    eyemarkLayer.setAttribute("data-eyemark-min-x", margin.toString())
    eyemarkLayer.setAttribute(
      "data-eyemark-max-x",
      (margin + stepSpan * stepCount - width).toString()
    )
    eyemarkLayer.setAttribute("data-eyemark-step-span", stepSpan.toString())
    eyemarkLayer.setAttribute("data-eyemark-step-count", stepCount.toString())
    eyemarkLayer.setAttribute("data-eyemark-track-width", trackWidth.toString())
    eyemarkLayer.setAttribute("data-eyemark-margin", margin.toString())
  } else {
    eyemarkLayer.removeAttribute("data-eyemark-pair")
    eyemarkLayer.removeAttribute("data-eyemark-center-x")
    eyemarkLayer.removeAttribute("data-eyemark-width")
    eyemarkLayer.removeAttribute("data-eyemark-half-height")
    eyemarkLayer.removeAttribute("data-eyemark-origin-y")
    eyemarkLayer.removeAttribute("data-eyemark-height")
    eyemarkLayer.removeAttribute("data-eyemark-min-x")
    eyemarkLayer.removeAttribute("data-eyemark-max-x")
    eyemarkLayer.removeAttribute("data-eyemark-step-span")
    eyemarkLayer.removeAttribute("data-eyemark-step-count")
    eyemarkLayer.removeAttribute("data-eyemark-track-width")
    eyemarkLayer.removeAttribute("data-eyemark-margin")
  }

  const makeLaneGroup = (
    layer: SVGGElement,
    laneIndex: number,
    interactive = false
  ) => {
    if (laneIndex === 0) {
      return layer
    }
    const g = document.createElementNS(SVG_NS, "g")
    g.setAttribute("data-role", "sachet-lane-copy")
    g.setAttribute("data-lane", laneIndex.toString())
    if (!interactive) {
      g.setAttribute("pointer-events", "none")
    }
    layer.appendChild(g)
    return g
  }

  if (!drawPerLaneOutline) {
    const outer = rect(margin, originY, contentWidth, spec.height, "cutLine")
    cutLayer.appendChild(outer)
    for (let i = 1; i < stepCount; i += 1) {
      const x =
        margin + (trackSide === "left" ? trackWidth : 0) + i * stepSpan
      const boundary = lineCustom(
        x,
        originY,
        x,
        originY + spec.height,
        STYLES.cutLine.stroke,
        0.3
      )
      cutLayer.appendChild(boundary)
    }
  }

  for (const lane of lanes) {
    const i = lane.index
    const { isTrackLane, bodyOriginX: laneBodyOriginX } = lane
    if (drawPerLaneOutline) {
      const outline = rect(
        lane.outlineX,
        originY,
        lane.outlineWidth,
        spec.height,
        "cutLine"
      )
      makeLaneGroup(cutLayer, i).appendChild(outline)
    }

    if (isTrackLane && trackWidth > 0) {
      const trackEdgeX =
        trackSide === "left" ? laneBodyOriginX : laneBodyOriginX + spec.width
      const trackLine = line(trackEdgeX, originY, trackEdgeX, originY + spec.height, "fold")
      trackLine.setAttribute("data-role", "eyemark-track-edge")
      trackLine.setAttribute("data-track-side", trackSide)
      makeLaneGroup(foldLayer, i).appendChild(trackLine)
    }

    const laneSealLayer = makeLaneGroup(sealLayer, i)
    const topSealRect = rect(
      laneBodyOriginX,
      originY,
      spec.width,
      seals.top,
      "seals"
    )
    topSealRect.setAttribute("data-role", "seal-rect")
    topSealRect.setAttribute("data-seal-side", "top")
    if (spec.sideSealPouch) topSealRect.setAttribute("stroke", "none")
    laneSealLayer.appendChild(topSealRect)

    const bottomSealRect = rect(
      laneBodyOriginX + (spec.sideSealPouch ? seals.left : 0),
      originY + spec.height - seals.bottom,
      spec.width - (spec.sideSealPouch ? seals.left + seals.right : 0),
      seals.bottom,
      "seals"
    )
    bottomSealRect.setAttribute("data-role", "seal-rect")
    bottomSealRect.setAttribute("data-seal-side", "bottom")
    if (spec.sideSealPouch) { bottomSealRect.setAttribute("fill", "#2e8b57"); bottomSealRect.setAttribute("opacity", ".32"); bottomSealRect.setAttribute("stroke", "none") }
    laneSealLayer.appendChild(bottomSealRect)

    const leftSealRect = rect(
      laneBodyOriginX,
      originY,
      seals.left,
      spec.height,
      "seals"
    )
    leftSealRect.setAttribute("data-role", "seal-rect")
    leftSealRect.setAttribute("data-seal-side", "left")
    if (spec.sideSealPouch) { leftSealRect.setAttribute("fill", "#2e8b57"); leftSealRect.setAttribute("opacity", ".32"); leftSealRect.setAttribute("stroke", "none") }
    laneSealLayer.appendChild(leftSealRect)

    const rightSealRect = rect(
      laneBodyOriginX + spec.width - seals.right,
      originY,
      seals.right,
      spec.height,
      "seals"
    )
    rightSealRect.setAttribute("data-role", "seal-rect")
    rightSealRect.setAttribute("data-seal-side", "right")
    if (spec.sideSealPouch) { rightSealRect.setAttribute("fill", "#2e8b57"); rightSealRect.setAttribute("opacity", ".32"); rightSealRect.setAttribute("stroke", "none") }
    laneSealLayer.appendChild(rightSealRect)

    if (spec.sideSealPouch?.sides === 2) {
      const centreFold = line(laneBodyOriginX + spec.width / 2, originY, laneBodyOriginX + spec.width / 2, originY + spec.height, "fold")
      centreFold.setAttribute("data-role", "pouch-centre-fold")
      centreFold.setAttribute("stroke-dasharray", "2 1")
      foldLayer.appendChild(centreFold)
    }
    if (spec.sideSealPouch?.sides === 3 && seals.bottom > 0) {
      const centreY = originY + spec.height - seals.bottom / 2
      const centreLine = line(laneBodyOriginX + seals.left, centreY, laneBodyOriginX + spec.width - seals.right, centreY, "fold")
      centreLine.setAttribute("data-role", "bottom-seal-centre-line")
      sealLayer.appendChild(centreLine)
    }

    const id=sachetStepIds(spec)[i], active=id===sachetActiveId(spec)
    const faceSpec=getSachetStepSpec(spec,id)
    const elements=renderPaperStripStepElements({...faceSpec,eyeMarks:undefined},i,active,renderMode,spec.sachet?.stepPair?"sachet-4-side-seal":"sachet-3-side-seal")
    elements.querySelector('#eyemark_track')?.remove()
    elements.setAttribute("x",String(laneBodyOriginX));elements.setAttribute("y",String(originY))
    elements.setAttribute("data-repeat-id",id)
    elements.setAttribute("data-repeat-source",sachetSynced(spec)?sachetSourceId(spec,id):id)
    // Leave the shared web eyemarks above face hit surfaces.
    svg.insertBefore(elements,eyemarkLayer)

    if (spec.eyeMarks && isTrackLane && !usePairEyeMarks) {
      const eyeSpec = spec.eyeMarks
      renderEyeMarks(
        makeLaneGroup(eyemarkLayer, i),
        eyeSpec,
        eyemarkCutterOriginX,
        originY,
        eyemarkCutterWidth,
        spec.height,
        {
          top: spec.height,
          bottom: spec.height,
          left: eyeMarkWidth,
          right: eyeMarkWidth
        },
        null,
        // Same placement validation checks (Amends v12 renderer parity).
        resolveSachetEyemarkPlacements(spec, layout).placements.map(placement => placement.rect)
      )
    }

    if (tearNotch?.enabled) {
      const notchWidth = tearNotch.width ?? 6
      const notchDepth = tearNotch.depth ?? 3
      const notchOffset = tearNotch.offsetX ?? 6
      const notchHalf = notchWidth / 2
      const leftX = laneBodyOriginX + notchOffset
      const rightX = laneBodyOriginX + spec.width - notchOffset
      const drawTriangle = (x: number, y: number, direction: number) => {
        const notch = document.createElementNS(SVG_NS, "path")
        const d = [
          `M ${x - notchHalf} ${y}`,
          `L ${x} ${y + notchDepth * direction}`,
          `L ${x + notchHalf} ${y}`
        ].join(" ")
        notch.setAttribute("d", d)
        notch.setAttribute("fill", "none")
        notch.setAttribute("stroke", STYLES.cutLine.stroke)
        notch.setAttribute("stroke-width", STYLES.cutLine.strokeWidth.toString())
        makeLaneGroup(tearNotchLayer, i).appendChild(notch)
      }
      const drawHalfMoon = (x: number, y: number, sweep: number) => {
        const r = notchHalf
        const notch = document.createElementNS(SVG_NS, "path")
        const d = [
          `M ${x - r} ${y}`,
          `A ${r} ${r} 0 0 ${sweep} ${x + r} ${y}`
        ].join(" ")
        notch.setAttribute("d", d)
        notch.setAttribute("fill", "none")
        notch.setAttribute("stroke", STYLES.cutLine.stroke)
        notch.setAttribute("stroke-width", STYLES.cutLine.strokeWidth.toString())
        makeLaneGroup(tearNotchLayer, i).appendChild(notch)
      }
      const drawJagged = (x: number, y: number, direction: number) => {
        const step = notchWidth / 3
        const notch = document.createElementNS(SVG_NS, "path")
        const d = [
          `M ${x - notchHalf} ${y}`,
          `L ${x - notchHalf + step} ${y + notchDepth * direction}`,
          `L ${x - notchHalf + step * 2} ${y}`,
          `L ${x + notchHalf} ${y + notchDepth * direction}`
        ].join(" ")
        notch.setAttribute("d", d)
        notch.setAttribute("fill", "none")
        notch.setAttribute("stroke", STYLES.cutLine.stroke)
        notch.setAttribute("stroke-width", STYLES.cutLine.strokeWidth.toString())
        makeLaneGroup(tearNotchLayer, i).appendChild(notch)
      }

      const style = tearNotch.style ?? "triangle"
      const topY = originY
      const bottomY = originY + spec.height
      if (style === "halfmoon") {
        drawHalfMoon(leftX, topY, 1)
        drawHalfMoon(rightX, topY, 1)
        drawHalfMoon(leftX, bottomY, 0)
        drawHalfMoon(rightX, bottomY, 0)
      } else if (style === "jagged") {
        drawJagged(leftX, topY, 1)
        drawJagged(rightX, topY, 1)
        drawJagged(leftX, bottomY, -1)
        drawJagged(rightX, bottomY, -1)
      } else {
        drawTriangle(leftX, topY, 1)
        drawTriangle(rightX, topY, 1)
        drawTriangle(leftX, bottomY, -1)
        drawTriangle(rightX, bottomY, -1)
      }
    }

    if (renderMode!=="edit" && showLaneLabels && stepEnabled && stepCount >= 2) {
      const label = sachetStepIds(spec)[i]
      const labelX = laneBodyOriginX + stepSpan / 2
      const labelY = originY + spec.height + 2.5
      const text = document.createElementNS(SVG_NS, "text")
      text.setAttribute("x", labelX.toString())
      text.setAttribute("y", labelY.toString())
      text.setAttribute("fill", "#333333")
      text.setAttribute("font-size", "2.5")
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("dominant-baseline", "hanging")
      text.setAttribute("data-role", "sachet-lane-label")
      annotationLayer.appendChild(text)
      text.textContent = label
    }
  }

  ;[
    ...(leftTrimWidth > 0 ? [{ side: "left", x: margin, width: leftTrimWidth }] : []),
    ...(rightTrimWidth > 0 ? [{ side: "right", x: margin + contentWidth - rightTrimWidth, width: rightTrimWidth }] : [])
  ].forEach(({ side, x, width }) => {
    const trimRect = rect(x, originY, width, spec.height, "seals")
    trimRect.setAttribute("data-role", "seal-rect")
    trimRect.setAttribute("data-seal-side", `trim-${side}`)
    sealLayer.appendChild(trimRect)
    const trimText = document.createElementNS(SVG_NS, "text")
    const cx = x + width / 2
    const cy = originY + spec.height / 2
    trimText.setAttribute("x", cx.toString())
    trimText.setAttribute("y", cy.toString())
    trimText.setAttribute("fill", DIMENSION_STROKE)
    trimText.setAttribute("font-size", "3.2")
    trimText.setAttribute("font-weight", "700")
    trimText.setAttribute("text-anchor", "middle")
    trimText.setAttribute("dominant-baseline", "middle")
    if (width < 14) trimText.setAttribute("transform", `rotate(-90 ${cx} ${cy})`)
    trimText.textContent = "TRIM"
    annotationLayer.appendChild(trimText)
  })

  if (usePairEyeMarks && stepCount >= 2) {
    if (!pairEyeMarks) {
      applySubstrateAppearance(svg,spec)
      return svg
    }
    const drawMark = (y: number, index: number) => {
      const r = document.createElementNS(SVG_NS, "rect")
      r.setAttribute("x", pairEyeMarks.x.toString())
      r.setAttribute("y", y.toString())
      r.setAttribute("width", pairEyeMarks.width.toString())
      r.setAttribute("height", pairEyeMarks.halfHeight.toString())
      r.setAttribute("fill", pairEyeMarks.fillColor)
      r.setAttribute("stroke", "none")
      r.setAttribute("data-eye-index", index.toString())
      r.setAttribute("data-role", "eye-mark")
      r.setAttribute("pointer-events", "none")
      eyemarkLayer.appendChild(r)

      const hit = document.createElementNS(SVG_NS, "rect")
      hit.setAttribute("x", pairEyeMarks.x.toString())
      hit.setAttribute("y", y.toString())
      hit.setAttribute("width", pairEyeMarks.width.toString())
      hit.setAttribute("height", pairEyeMarks.halfHeight.toString())
      hit.setAttribute("fill", "transparent")
      hit.setAttribute("pointer-events", "all")
      hit.setAttribute("cursor", "move")
      hit.setAttribute("data-eye-index", index.toString())
      hit.setAttribute("data-role", "eye-mark-hit")
      eyemarkLayer.appendChild(hit)
    }
    drawMark(pairEyeMarks.topY, 0)
    drawMark(pairEyeMarks.bottomY, 1)
    if (pairEyeMarks.warning) {
      const current = svg.getAttribute("data-warning")
      const message = pairEyeMarks.warning
      svg.setAttribute("data-warning", current ? `${current}\n${message}` : message)
    }
  }

  const dimTopY = originY - DIMENSION_OFFSET
  const mainMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-main-measures") !== "false"
  const subMeasuresEnabled =
    !spec.sachet &&
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-sub-measures") === "true"
  if (mainMeasuresEnabled || subMeasuresEnabled) {
    renderSachetMeasurements(
      annotationLayer,
      spec,
      measureMeta,
      { main: mainMeasuresEnabled, sub: subMeasuresEnabled }
    )
  }

  svg.setAttribute(
    "data-cutter-center-x",
    (bodyOriginX + spec.width / 2).toString()
  )
  svg.setAttribute("data-dim-top-y", dimTopY.toString())
  svg.setAttribute("data-sachet-measures", "true")
  svg.setAttribute("data-sachet-margin", margin.toString())
  svg.setAttribute("data-sachet-origin-y", originY.toString())
  svg.setAttribute("data-sachet-step-span", stepSpan.toString())
  svg.setAttribute("data-sachet-step-count", stepCount.toString())
  svg.setAttribute("data-sachet-track-width", trackWidth.toString())
  svg.setAttribute("data-sachet-track-side", trackSide)
  svg.setAttribute("data-sachet-trim-width", trimWidth.toString())
  svg.setAttribute("data-sachet-trim-position", trimPosition)
  svg.setAttribute("data-sachet-left-trim-width", leftTrimWidth.toString())
  svg.setAttribute("data-sachet-right-trim-width", rightTrimWidth.toString())
  svg.setAttribute("data-sachet-body-origin-x", bodyOriginX.toString())
  svg.setAttribute("data-sachet-width", spec.width.toString())
  svg.setAttribute("data-sachet-content-width", contentWidth.toString())
  svg.setAttribute("data-sachet-height", spec.height.toString())

  applySubstrateAppearance(svg,spec)
  return svg
}

export function renderSachet(spec: FlowwrapSpec, options: RenderOptions = {}): SVGSVGElement {
  const layout = resolveSachetLayout(spec)
  return renderResolvedSachet(spec, layout, options)
}

export function updateSachetMeasuresLayer(
  svg: SVGSVGElement,
  spec: FlowwrapSpec
) {
  if (svg.getAttribute("data-sachet-measures") !== "true") {
    return
  }
  const mainMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-main-measures") !== "false"
  const subMeasuresEnabled =
    !spec.sachet &&
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-sub-measures") === "true"
  const annotationLayer = svg.querySelector<SVGGElement>("g#annotations")
  if (!annotationLayer) {
    return
  }
  const margin = Number(svg.getAttribute("data-sachet-margin") ?? "0")
  const originY = Number(svg.getAttribute("data-sachet-origin-y") ?? "0")
  const stepSpan = Number(svg.getAttribute("data-sachet-step-span") ?? "0")
  const stepCount = Number(svg.getAttribute("data-sachet-step-count") ?? "1")
  const trackWidth = Number(svg.getAttribute("data-sachet-track-width") ?? "0")
  const trimWidth = Number(svg.getAttribute("data-sachet-trim-width") ?? trackWidth)
  const trimPosition = (svg.getAttribute("data-sachet-trim-position") ?? "left") as "left" | "right" | "both"
  const leftTrimWidth = Number(svg.getAttribute("data-sachet-left-trim-width") ?? "0")
  const rightTrimWidth = Number(svg.getAttribute("data-sachet-right-trim-width") ?? "0")
  const trackSide = (svg.getAttribute("data-sachet-track-side") ??
    "left") as "left" | "right"
  const bodyOriginX = Number(svg.getAttribute("data-sachet-body-origin-x") ?? "0")
  // measureMeta.width is the full content width (all steps plus trims), as on first render.
  const width = Number(svg.getAttribute("data-sachet-content-width") ?? svg.getAttribute("data-sachet-width") ?? "0")
  const height = Number(svg.getAttribute("data-sachet-height") ?? "0")
  clearSachetMeasureGroups(annotationLayer)
  if (!mainMeasuresEnabled && !subMeasuresEnabled) {
    return
  }
  renderSachetMeasurements(annotationLayer, spec, {
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
    width,
    height
  }, { main: mainMeasuresEnabled, sub: subMeasuresEnabled })
}
