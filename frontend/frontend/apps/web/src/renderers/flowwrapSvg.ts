import { normaliseOpeningStyle } from "../../../../packages/cutter-engine/actions/openingStyle"
import {
  resolveFlowwrapLayout
} from "../core/geometry/resolvers/resolveFlowwrapLayout"
import type { ResolvedFlowwrapLayout } from "../core/geometry/resolvers/resolveFlowwrapLayout"
import { resolveDoyLayout } from "../core/geometry/resolvers/resolveDoyLayout"
import { buildFoldLines } from "../geometry/foldLines"
import { buildPerfCenters } from "../geometry/perfs"
import { renderEyeMarks } from "./svgEyeMarks"
import { renderFoldLines } from "./svgFoldLines"
import { renderPerfs } from "./svgPerfs"
import { renderPerfMeasurements } from "./perfMeasurements"
import { annotationObstacles } from "../geometry/annotationPlacement"
import { applySubstrateAppearance } from "./substrateAppearance"
import { renderHalfMoonCutouts } from "./svgHalfMoonCutouts"
import { renderSafeZones } from "./svgSafeZones"
import { renderWindows } from "./svgWindows"
import { renderAttributeBoxes } from "./svgAttributeBoxes"
import { renderHangerSlotWarnings, renderHangerSlots } from "./svgHangerSlots"
import type { FlowwrapSpec, RenderMode, RenderOptions } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"

const SVG_NS = "http://www.w3.org/2000/svg"

type StrokeStyle = {
  stroke: string
  strokeWidth: number
  dash?: string
  fill?: string
  opacity?: number
}

type StyleKey =
  | "cutLine"
  | "seals"
  | "guides"
  | "bleed"
  | "substrate"
  | "zipper"

const STYLES: Record<StyleKey, StrokeStyle> = {
  substrate: {
    stroke: "#b9dfe8",
    strokeWidth: 0,
    fill: "#b9dfe8",
    opacity: 0.6
  },
  cutLine: { stroke: "#2eb774", strokeWidth: 0.75 },
  seals: { stroke: "#2eb774", strokeWidth: 0.6, opacity: 0.15 },
  guides: { stroke: "#6b6b6b", strokeWidth: 0.75, dash: "2 1", opacity: 0.45 },
  bleed: { stroke: "#6b6b6b", strokeWidth: 0.6, dash: "3 3" },
  zipper: { stroke: "#1f8f57", strokeWidth: 0.6 }
}

const DEFAULT_CANVAS_MARGIN = 80
const BUFFER_BREACH_FILL = "#f6b26b"
const BUFFER_BREACH_OPACITY = 0.35
const DIMENSION_OFFSET = 8
const DIMENSION_STROKE = "#d23429"
const DIMENSION_STROKE_WIDTH = 0.6
const DIMENSION_CAP = 4
const DIMENSION_TEXT_SIZE = 6
const SUB_DIMENSION_TEXT_SIZE = 4
const SUB_DIMENSION_STROKE_WIDTH = 0.3
const SUB_DIMENSION_CAP = 2
const SUB_DIMENSION_OFFSET = 3
const MAIN_DIMENSION_OFFSET = 10.5
const FOLD_STROKE = "#2eb774"
const DOY_GUSSET_STROKE = "#76d8aa"
const FOLD_STROKE_WIDTH = 0.3
const HANDLE_PURPLE = "#8b5cf6"
const HANDLE_STROKE = "#111111"
const HANDLE_STROKE_WIDTH = 0.2
const HANDLE_RADIUS = 0.5
const GUSSET_DEPTH_MIN = 30
const GUSSET_DEPTH_MAX = 140
const GUSSET_LABEL_SIZE = 4
const ARC_MEASURE_FACTOR = 0.75
const DOY_SIDE_FOLD_OUTSET_MM = 5
const DOY_BOTTOM_FOLD_OUTSET_MM = 5
const GUSSET_DEPTH_TO_ARC_RATIO = 0.45

const formatMm = formatMetricMeasurement
function group(id: string): SVGGElement {
  const g = document.createElementNS(SVG_NS, "g")
  g.setAttribute("id", id)
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

function renderHatchLines(
  layer: SVGGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  spacing: number,
  stroke: string,
  strokeWidth: number
) {
  const start = -height
  const end = width
  for (let t = start; t <= end; t += spacing) {
    let x1 = x + t
    let y1 = y
    let x2 = x + t + height
    let y2 = y + height
    if (x1 < x) {
      y1 += x - x1
      x1 = x
    }
    if (x2 > x + width) {
      y2 -= x2 - (x + width)
      x2 = x + width
    }
    if (y1 > y + height || y2 < y) {
      continue
    }
    const hatch = document.createElementNS(SVG_NS, "line")
    hatch.setAttribute("x1", x1.toString())
    hatch.setAttribute("y1", y1.toString())
    hatch.setAttribute("x2", x2.toString())
    hatch.setAttribute("y2", y2.toString())
    hatch.setAttribute("stroke", stroke)
    hatch.setAttribute("stroke-width", strokeWidth.toString())
    layer.appendChild(hatch)
  }
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.6
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
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
  capStart = true,
  capEnd = true,
  splitLabel = true
) {
  const isHorizontal = y1 === y2
  let textOffsetY = textOffset.y
  if (isHorizontal) {
    textOffsetY = 0
  }
  let fontSize = layer.getAttribute("data-text-size")
    ? Number(layer.getAttribute("data-text-size"))
    : DIMENSION_TEXT_SIZE
  const strokeWidth = layer.getAttribute("data-stroke-width")
    ? Number(layer.getAttribute("data-stroke-width"))
    : DIMENSION_STROKE_WIDTH
  const capSize = layer.getAttribute("data-cap")
    ? Number(layer.getAttribute("data-cap"))
    : DIMENSION_CAP
  const midX = (x1 + x2) / 2 + textOffset.x
  const midY = (y1 + y2) / 2 + textOffsetY
  if (label && splitLabel) {
    const gap = 2
    const length = Math.max(
      0,
      Math.abs(isHorizontal ? x2 - x1 : y2 - y1)
    )
    if (length > 0) {
      const maxTextSize = Math.max(
        2,
        (length - gap * 2) / (label.length * 0.6)
      )
      fontSize = Math.min(fontSize, maxTextSize)
    }
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
      layer.appendChild(leftLine)

      const rightLine = document.createElementNS(SVG_NS, "line")
      rightLine.setAttribute("x1", rightStart.toString())
      rightLine.setAttribute("y1", y1.toString())
      rightLine.setAttribute("x2", x2.toString())
      rightLine.setAttribute("y2", y2.toString())
      rightLine.setAttribute("stroke", DIMENSION_STROKE)
      rightLine.setAttribute("stroke-width", strokeWidth.toString())
      layer.appendChild(rightLine)
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
      layer.appendChild(topLine)

      const bottomLine = document.createElementNS(SVG_NS, "line")
      bottomLine.setAttribute("x1", x1.toString())
      bottomLine.setAttribute("y1", bottomStart.toString())
      bottomLine.setAttribute("x2", x2.toString())
      bottomLine.setAttribute("y2", yEnd.toString())
      bottomLine.setAttribute("stroke", DIMENSION_STROKE)
      bottomLine.setAttribute("stroke-width", strokeWidth.toString())
      layer.appendChild(bottomLine)
    }
  } else {
    const lineEl = document.createElementNS(SVG_NS, "line")
    lineEl.setAttribute("x1", x1.toString())
    lineEl.setAttribute("y1", y1.toString())
    lineEl.setAttribute("x2", x2.toString())
    lineEl.setAttribute("y2", y2.toString())
    lineEl.setAttribute("stroke", DIMENSION_STROKE)
    lineEl.setAttribute("stroke-width", strokeWidth.toString())
    layer.appendChild(lineEl)
  }

  const caps: SVGLineElement[] = []
  if (capStart) {
    const cap1 = document.createElementNS(SVG_NS, "line")
    if (y1 === y2) {
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
    caps.push(cap1)
  }
  if (capEnd) {
    const cap2 = document.createElementNS(SVG_NS, "line")
    if (y1 === y2) {
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
    caps.push(cap2)
  }
  caps.forEach(cap => {
    cap.setAttribute("stroke", DIMENSION_STROKE)
    cap.setAttribute("stroke-width", strokeWidth.toString())
    layer.appendChild(cap)
  })

  const text = document.createElementNS(SVG_NS, "text")
  text.setAttribute("x", midX.toString())
  text.setAttribute("y", midY.toString())
  text.setAttribute("fill", DIMENSION_STROKE)
  text.setAttribute("font-size", fontSize.toString())
  text.setAttribute("text-anchor", "middle")
  text.setAttribute("dominant-baseline", "middle")
  if (rotate !== 0) {
    text.setAttribute("transform", `rotate(${rotate} ${midX} ${midY})`)
  }
  text.textContent = label
  layer.appendChild(text)
}

function dimensionLine(
  layer: SVGGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  textOffset: { x: number; y: number },
  rotate = 0
) {
  dimensionLineWithCaps(layer, x1, y1, x2, y2, label, textOffset, rotate, true, true)
}

function clearSubMeasureGroups(annotationLayer: SVGGElement) {
  annotationLayer.querySelector("#sub_measure_width")?.remove()
  annotationLayer.querySelector("#sub_measure_width_bottom")?.remove()
  annotationLayer.querySelector("#sub_measure_features")?.remove()
  annotationLayer.querySelector("#sub_measure_height")?.remove()
}

function renderSubMeasureGroups(
  annotationLayer: SVGGElement,
  spec: FlowwrapSpec,
  originX: number,
  originY: number,
  liveOriginX: number,
  liveOriginY: number,
  liveWidth: number,
  liveHeight: number,
  cutterWidth: number,
  cutterHeight: number
) {
  clearSubMeasureGroups(annotationLayer)
  const subDimY = originY - SUB_DIMENSION_OFFSET
  const boundaries = [originX, liveOriginX]
  const foldXs = (spec.foldLines ?? [])
    .map(line => liveOriginX + line.offset)
    .filter(x => x > liveOriginX && x < liveOriginX + liveWidth)
    .sort((a, b) => a - b)
  boundaries.push(...foldXs)
  if (spec.doyPouch) {
    const layout = resolveDoyLayout(spec, originX, liveOriginX, liveWidth, cutterWidth)
    if (layout) {
      boundaries.push(layout.centerLeft, layout.centerRight)
    }
  }
  boundaries.push(liveOriginX + liveWidth)
  boundaries.push(originX + cutterWidth)

  const subWidthLayer = document.createElementNS(SVG_NS, "g")
  subWidthLayer.setAttribute("id", "sub_measure_width")
  subWidthLayer.setAttribute(
    "data-text-size",
    SUB_DIMENSION_TEXT_SIZE.toString()
  )
  subWidthLayer.setAttribute(
    "data-stroke-width",
    SUB_DIMENSION_STROKE_WIDTH.toString()
  )
  subWidthLayer.setAttribute("data-cap", SUB_DIMENSION_CAP.toString())
  annotationLayer.appendChild(subWidthLayer)
  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const startX = boundaries[i]
    const endX = boundaries[i + 1]
    const length = Math.max(0, endX - startX)
    if (length <= 0) {
      continue
    }
    dimensionLine(
      subWidthLayer,
      startX,
      subDimY,
      endX,
      subDimY,
      formatMm(length),
      { x: 0, y: -4 }
    )
  }

  if (spec.doyPouch) {
    const featureDimY = originY + cutterHeight + SUB_DIMENSION_OFFSET
    const featureLayer = document.createElementNS(SVG_NS, "g")
    featureLayer.setAttribute("id", "sub_measure_features")
    featureLayer.setAttribute(
      "data-text-size",
      SUB_DIMENSION_TEXT_SIZE.toString()
    )
    featureLayer.setAttribute(
      "data-stroke-width",
      SUB_DIMENSION_STROKE_WIDTH.toString()
    )
    featureLayer.setAttribute("data-cap", SUB_DIMENSION_CAP.toString())
    annotationLayer.appendChild(featureLayer)

    const featureRows: Array<{
      label: string
      startX: number
      endX: number
      rowIndex: number
    }> = []
    const arcRow = 0
    const sealRow = 1
    let row = 2
    const rowGap = 6
    const layout = resolveDoyLayout(spec, originX, liveOriginX, liveWidth, cutterWidth)
    if (!layout) {
      return
    }
    const { centerLeft, centerRight, arcLeftX, arcRightX, arcInsetDepth } = layout

    if (spec.doyPouch.showGripSeal !== false) {
      const leftStart = originX + spec.doyPouch.sideBleed
      const rightStart =
        originX + cutterWidth - spec.doyPouch.sideBleed - spec.doyPouch.gripSeal
      featureRows.push({
        label: formatMm(spec.doyPouch.sideBleed),
        startX: originX,
        endX: leftStart,
        rowIndex: arcRow
      })
      featureRows.push({
        label: formatMm(spec.doyPouch.sideBleed),
        startX: rightStart + spec.doyPouch.gripSeal,
        endX: originX + cutterWidth,
        rowIndex: arcRow
      })
      featureRows.push({
        label: formatMm(spec.doyPouch.gripSeal),
        startX: leftStart,
        endX: leftStart + spec.doyPouch.gripSeal,
        rowIndex: arcRow
      })
      featureRows.push({
        label: formatMm(spec.doyPouch.gripSeal),
        startX: rightStart,
        endX: rightStart + spec.doyPouch.gripSeal,
        rowIndex: arcRow
      })
    }

    if (spec.doyPouch.showTearNotch !== false) {
      const notchOffset = spec.doyPouch.tearNotch.offsetX ?? 0
      featureRows.push({
        label: formatMm(notchOffset),
        startX: originX,
        endX: originX + notchOffset,
        rowIndex: row
      })
      featureRows.push({
        label: formatMm(notchOffset),
        startX: originX + cutterWidth - notchOffset,
        endX: originX + cutterWidth,
        rowIndex: row
      })
      row += 1
    }

    if (spec.doyPouch.showZipper !== false) {
      const zipperOffset = spec.doyPouch.zipper.offsetX ?? 0
      const zipperWidth = spec.doyPouch.zipper.width ?? 10
      featureRows.push({label:formatMm(zipperWidth),startX:originX+zipperOffset,endX:originX+zipperOffset+zipperWidth,rowIndex:row})
      featureRows.push({label:formatMm(zipperWidth),startX:originX+cutterWidth-zipperOffset-zipperWidth,endX:originX+cutterWidth-zipperOffset,rowIndex:row})
      featureRows.push({
        label: formatMm(zipperOffset),
        startX: originX,
        endX: originX + zipperOffset,
        rowIndex: row
      })
      featureRows.push({
        label: formatMm(zipperOffset),
        startX: originX + cutterWidth - zipperOffset,
        endX: originX + cutterWidth,
        rowIndex: row
      })
      row += 1
    }

    if (spec.doyPouch.showGusset !== false) {
      const centerX = liveOriginX + liveWidth / 2
      ;[
        [centerLeft, centerX],
        [centerX, centerRight]
      ].forEach(([startX, endX]) => featureRows.push({
        label: formatMm(Math.max(0, endX - startX)),
        startX,
        endX,
        rowIndex: arcRow
      }))
      const bottomSeal = Math.max(0, spec.doyPouch.bottomSeal ?? 7.5)
      // Both sides of each bottom-seal centreline need their own sub measure.
      ;[
        [centerLeft - bottomSeal, centerLeft],
        [centerLeft, centerLeft + bottomSeal],
        [centerRight - bottomSeal, centerRight],
        [centerRight, centerRight + bottomSeal]
      ].forEach(([startX, endX]) => featureRows.push({
        label: String(Number(Math.max(0, endX - startX).toFixed(1))),
        startX,
        endX,
        rowIndex: sealRow
      }))
      // Measure from each fold edge to the arc endpoint at the cutter edge.
      ;[
        [arcLeftX, centerLeft],
        [centerRight, arcRightX]
      ].forEach(([startX, endX]) => featureRows.push({
        label: formatMm(Math.max(0, endX - startX)),
        startX,
        endX,
        rowIndex: arcRow
      }))
    }

    featureRows.forEach(rowInfo => {
      const y = featureDimY + rowInfo.rowIndex * rowGap
      if (rowInfo.endX <= rowInfo.startX) {
        return
      }
      dimensionLine(
        featureLayer,
        rowInfo.startX,
        y,
        rowInfo.endX,
        y,
        rowInfo.label,
        { x: 0, y: 4 }
      )
    })
  }

  const subDimX = originX - SUB_DIMENSION_OFFSET
  const boundariesY = [originY, liveOriginY]
  boundariesY.push(liveOriginY + liveHeight)
  boundariesY.push(originY + cutterHeight)
  const subHeightLayer = document.createElementNS(SVG_NS, "g")
  subHeightLayer.setAttribute("id", "sub_measure_height")
  subHeightLayer.setAttribute(
    "data-text-size",
    SUB_DIMENSION_TEXT_SIZE.toString()
  )
  subHeightLayer.setAttribute(
    "data-stroke-width",
    SUB_DIMENSION_STROKE_WIDTH.toString()
  )
  subHeightLayer.setAttribute("data-cap", SUB_DIMENSION_CAP.toString())
  annotationLayer.appendChild(subHeightLayer)
  for (let i = 0; i < boundariesY.length - 1; i += 1) {
    const startY = boundariesY[i]
    const endY = boundariesY[i + 1]
    const length = Math.max(0, endY - startY)
    if (length <= 0) {
      continue
    }
    dimensionLine(
      subHeightLayer,
      subDimX,
      startY,
      subDimX,
      endY,
      formatMm(length),
      { x: 0, y: 0 },
      -90
    )
  }
}
function resolveFoldLines(spec: FlowwrapSpec) {
  if (!spec.foldLines) {
    return []
  }
  return spec.foldLines
}

export function renderDoyPouchGuides(
  layers: {
    sealVisual?: SVGGElement
    foldLine: SVGGElement
    sideGusset: SVGGElement
    bottomGusset: SVGGElement
    gripSeal: SVGGElement
    zipper: SVGGElement
    tearNotch: SVGGElement
  },
  warningLayer: SVGGElement,
  spec: FlowwrapSpec,
  originX: number,
  originY: number,
  liveOriginX: number,
  liveWidth: number,
  cutterWidth: number,
  cutterHeight: number
) {
  spec = normaliseOpeningStyle(spec)
  const doy = spec.doyPouch
  if (!doy) {
    return
  }
  const { sideBleed, gripSeal, zipper, tearNotch } = doy
  const layout = resolveDoyLayout(
    spec,
    originX,
    liveOriginX,
    liveWidth,
    cutterWidth
  )
  if (!layout) {
    return
  }
  const {
    rectCenterX,
    centerLeft,
    centerRight,
    arcInsetDepth,
    arcLeftX,
    arcRightX,
    gussetDepth: layoutGussetDepth,
    ovalWidth,
    ovalCenterX,
    ovalLeftX,
    ovalRightX,
    gap1,
    gap2,
    cutterRightX
  } = layout
  const ovalHeight = spec.height

  const foldLineLayer = layers.foldLine
  const sideGussetLayer = layers.sideGusset
  const bottomGussetLayer = layers.bottomGusset
  const gripSealLayer = layers.gripSeal
  const zipperLayer = layers.zipper
  const tearNotchLayer = layers.tearNotch
  const yTop = originY
  const yBottom = originY + cutterHeight
  const addVertical = (x: number, role: string, side?: "left" | "right") => {
    if (x <= originX || x >= originX + cutterWidth) {
      return
    }
    const l = line(x, yTop, x, yBottom, "cutLine")
    l.setAttribute("stroke", "#169f65")
    l.setAttribute("stroke-width", FOLD_STROKE_WIDTH.toString())
    l.setAttribute("data-role", role)
    if (side) l.setAttribute("data-seal-side", side)
    foldLineLayer.appendChild(l)
  }

  if (sideBleed > 0) {
    // Side bleed guides removed per Doy-only grip seal visualization.
  }
  const showGripSeal = doy.showGripSeal !== false
  if (showGripSeal && gripSeal > 0) {
    const leftGrip = rect(
      originX + sideBleed,
      originY,
      gripSeal,
      cutterHeight,
      "seals"
    )
    leftGrip.setAttribute("stroke", FOLD_STROKE)
    leftGrip.setAttribute("stroke-width", FOLD_STROKE_WIDTH.toString())
    leftGrip.setAttribute("fill", "none")
    leftGrip.setAttribute("opacity", "1")
    leftGrip.setAttribute("data-role", "grip-seal")
    leftGrip.setAttribute("data-grip-side", "left")
    gripSealLayer.appendChild(leftGrip)
    const leftLabelX = originX + sideBleed + gripSeal / 2
    const labelY = originY + cutterHeight / 2
    const leftLabel = document.createElementNS(SVG_NS, "text")
    leftLabel.setAttribute("x", leftLabelX.toString())
    leftLabel.setAttribute("y", labelY.toString())
    leftLabel.setAttribute("fill", FOLD_STROKE)
    leftLabel.setAttribute("font-size", String(Math.min(6, gripSeal * .65, cutterHeight / 7)))
    leftLabel.setAttribute("text-anchor", "middle")
    leftLabel.setAttribute("dominant-baseline", "middle")
    leftLabel.setAttribute(
      "transform",
      `rotate(-90 ${leftLabelX} ${labelY})`
    )
    leftLabel.textContent = "GRIP SEAL"
    leftLabel.setAttribute("data-role", "grip-seal-label")
    leftLabel.setAttribute("data-grip-side", "left")
    gripSealLayer.appendChild(leftLabel)
    const rightGrip = rect(
      originX + cutterWidth - sideBleed - gripSeal,
      originY,
      gripSeal,
      cutterHeight,
      "seals"
    )
    rightGrip.setAttribute("stroke", FOLD_STROKE)
    rightGrip.setAttribute("stroke-width", FOLD_STROKE_WIDTH.toString())
    rightGrip.setAttribute("fill", "none")
    rightGrip.setAttribute("opacity", "1")
    rightGrip.setAttribute("data-role", "grip-seal")
    rightGrip.setAttribute("data-grip-side", "right")
    gripSealLayer.appendChild(rightGrip)
    const rightLabelX = originX + cutterWidth - sideBleed - gripSeal / 2
    const rightLabel = document.createElementNS(SVG_NS, "text")
    rightLabel.setAttribute("x", rightLabelX.toString())
    rightLabel.setAttribute("y", labelY.toString())
    rightLabel.setAttribute("fill", FOLD_STROKE)
    rightLabel.setAttribute("font-size", String(Math.min(6, gripSeal * .65, cutterHeight / 7)))
    rightLabel.setAttribute("text-anchor", "middle")
    rightLabel.setAttribute("dominant-baseline", "middle")
    rightLabel.setAttribute(
      "transform",
      `rotate(90 ${rightLabelX} ${labelY})`
    )
    rightLabel.textContent = "GRIP SEAL"
    rightLabel.setAttribute("data-role", "grip-seal-label")
    rightLabel.setAttribute("data-grip-side", "right")
    gripSealLayer.appendChild(rightLabel)
  }
  const showCenterBox = doy.showCenterBox !== false
  const showOval = doy.showOval !== false
  const showGusset = doy.showGusset !== false

  if (showOval && showGusset && ovalWidth > 0 && layoutGussetDepth > 0) {
    const top = originY, bottom = originY + cutterHeight
    const quarter = originY + cutterHeight * .25, threeQuarter = originY + cutterHeight * .75
    const rx = ovalWidth / 2
    const sealRegions = [
      `M ${arcLeftX} ${top} C ${arcLeftX + arcInsetDepth} ${quarter} ${arcLeftX + arcInsetDepth} ${threeQuarter} ${arcLeftX} ${bottom} L ${ovalCenterX} ${bottom} C ${ovalCenterX - rx} ${bottom} ${ovalCenterX - rx} ${top} ${ovalCenterX} ${top} Z`,
      `M ${ovalCenterX} ${top} C ${ovalCenterX + rx} ${top} ${ovalCenterX + rx} ${bottom} ${ovalCenterX} ${bottom} L ${arcRightX} ${bottom} C ${arcRightX - arcInsetDepth} ${threeQuarter} ${arcRightX - arcInsetDepth} ${quarter} ${arcRightX} ${top} Z`
    ]
    const region = document.createElementNS(SVG_NS, "path")
    region.setAttribute("d", sealRegions.join(" "))
    region.setAttribute("fill", layers.sealVisual ? "#2E8B57" : "#2eb774")
    region.setAttribute("fill-opacity", "1")
    region.setAttribute("opacity", "1")
    region.setAttribute("stroke", "none")
    region.setAttribute("pointer-events", "none")
    region.setAttribute("data-role", "doy-bottom-seal-region")
    ;(layers.sealVisual ?? bottomGussetLayer).appendChild(region)
    // AMENDS 6.2: fold guides sit on the bottom-seal centres, in line with
    // the ends of the gusset (40 mm) measures; the oval adapts to them.
    ;[centerLeft, centerRight].forEach((x, index) => addVertical(x, "doy-bottom-seal-midline", index === 0 ? "left" : "right"))
  }
  if (showCenterBox) {
    addVertical(ovalCenterX, "doy-gusset-centre-fold")
  }

  if (showOval && ovalWidth > 0 && ovalHeight > 0) {
    const rx = ovalWidth / 2
    const ry = ovalHeight / 2
    const centerY = originY + cutterHeight / 2
    const ovalCurveDeg = Math.round(
      (Math.atan2(Math.abs(rx), Math.max(1, ry)) * 180) / Math.PI
    )
    const ovalCurveLabel = `${ovalCurveDeg}°`
    const makeOvalPath = (cx: number) => {
      const topY = centerY - ry
      const bottomY = centerY + ry
      return [
        `M ${cx} ${topY}`,
        `C ${cx + rx} ${topY} ${cx + rx} ${bottomY} ${cx} ${bottomY}`,
        `C ${cx - rx} ${bottomY} ${cx - rx} ${topY} ${cx} ${topY}`,
        "Z"
      ].join(" ")
    }
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", makeOvalPath(ovalCenterX))
    path.setAttribute("fill", "none")
    path.setAttribute("stroke", DOY_GUSSET_STROKE)
    path.setAttribute("stroke-width", FOLD_STROKE_WIDTH.toString())
    path.setAttribute("data-role", "doy-oval")
    bottomGussetLayer.appendChild(path)
    if (doy.ovalSelected) {
      const addOvalLabel = (x: number, side: "left" | "right") => {
        const text = document.createElementNS(SVG_NS, "text")
        text.setAttribute("x", x.toString())
        text.setAttribute("y", centerY.toString())
        text.setAttribute("fill", HANDLE_PURPLE)
        text.setAttribute("font-size", GUSSET_LABEL_SIZE.toString())
        text.setAttribute("text-anchor", "middle")
        text.setAttribute("dominant-baseline", "middle")
        text.setAttribute("pointer-events", "none")
        text.setAttribute("data-role", "doy-oval-label")
        text.setAttribute("data-oval-side", side)
        text.textContent = ovalCurveLabel
        bottomGussetLayer.appendChild(text)
      }
      addOvalLabel(ovalCenterX - rx * 0.6, "left")
      addOvalLabel(ovalCenterX + rx * 0.6, "right")
    }

  }

  const showZipper = doy.showZipper !== false
  const showTearNotch = doy.showTearNotch !== false
  const NOTCH_OUTER_OFFSET = 7.5
  const NOTCH_MIN_SEPARATION = 7.5

  const gussetSelected = doy.gussetSelected ?? false
  if (showGusset && layoutGussetDepth > 0) {
    const arcDepth = arcInsetDepth
    const curveDeg = Math.round(
      (Math.atan2(Math.abs(arcDepth), cutterHeight / 2) * 180) / Math.PI
    )
    const curveLabel = `${curveDeg}°`
    const buildVerticalArc = (x: number, direction: number) => {
      const topY = originY
      const bottomY = originY + cutterHeight
      const c1Y = originY + cutterHeight * 0.25
      const c2Y = originY + cutterHeight * 0.75
      const controlX = x + arcDepth * direction
      const gussetPath = document.createElementNS(SVG_NS, "path")
      const d = [
        `M ${x} ${topY}`,
        `C ${controlX} ${c1Y} ${controlX} ${c2Y} ${x} ${bottomY}`
      ].join(" ")
      gussetPath.setAttribute("d", d)
      gussetPath.setAttribute("fill", "none")
      gussetPath.setAttribute("stroke", DOY_GUSSET_STROKE)
      gussetPath.setAttribute("stroke-width", FOLD_STROKE_WIDTH.toString())
      gussetPath.setAttribute("data-role", "gusset-arc")
      sideGussetLayer.appendChild(gussetPath)
      const hit = document.createElementNS(SVG_NS, "path")
      hit.setAttribute("d", d)
      hit.setAttribute("fill", "none")
      hit.setAttribute("stroke", "transparent")
      hit.setAttribute("stroke-width", "6")
      hit.setAttribute("pointer-events", "stroke")
      hit.setAttribute("data-role", "gusset-arc-hit")
      sideGussetLayer.appendChild(hit)
      return gussetPath
    }
    const leftArc = buildVerticalArc(arcLeftX, 1)
    const rightArc = buildVerticalArc(arcRightX, -1)
    leftArc.setAttribute("data-arc-side", "left")
    rightArc.setAttribute("data-arc-side", "right")
    const hits = sideGussetLayer.querySelectorAll<SVGPathElement>("[data-role=\"gusset-arc-hit\"]")
    if (hits.length >= 2) {
      hits[0].setAttribute("data-arc-side", "left")
      hits[1].setAttribute("data-arc-side", "right")
    }
    const addArcLabel = (x: number, direction: number, side: "left" | "right") => {
      const midY = originY + cutterHeight * 0.5
      const midX = x + 0.4 * arcDepth * direction
      const text = document.createElementNS(SVG_NS, "text")
      text.setAttribute("x", midX.toString())
      text.setAttribute("y", midY.toString())
      text.setAttribute("fill", HANDLE_PURPLE)
      text.setAttribute("font-size", GUSSET_LABEL_SIZE.toString())
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("dominant-baseline", "middle")
      text.setAttribute("pointer-events", "none")
      text.setAttribute("data-role", "gusset-arc-label")
      text.setAttribute("data-arc-side", side)
      text.textContent = curveLabel
      sideGussetLayer.appendChild(text)
    }
    if (gussetSelected) {
      addArcLabel(arcLeftX, 1, "left")
      addArcLabel(arcRightX, -1, "right")
    }

    if (gussetSelected) {
      const addDepthHandle = (
        x: number,
        y: number,
        side: "left" | "right",
        edge: "top" | "bottom"
      ) => {
        const handle = document.createElementNS(SVG_NS, "circle")
        const yAligned = edge === "top" ? y + HANDLE_RADIUS : y - HANDLE_RADIUS
        handle.setAttribute("cx", x.toString())
        handle.setAttribute("cy", yAligned.toString())
        handle.setAttribute("r", HANDLE_RADIUS.toString())
        handle.setAttribute("fill", HANDLE_PURPLE)
        handle.setAttribute("stroke", HANDLE_STROKE)
        handle.setAttribute("stroke-width", HANDLE_STROKE_WIDTH.toString())
        handle.setAttribute("data-role", "gusset-depth-handle")
        handle.setAttribute("data-arc-side", side)
        handle.setAttribute("data-edge", edge)
        handle.setAttribute("cursor", "ew-resize")
        sideGussetLayer.appendChild(handle)
      }
      addDepthHandle(arcLeftX, originY, "left", "top")
      addDepthHandle(arcLeftX, originY + cutterHeight, "left", "bottom")
      addDepthHandle(arcRightX, originY, "right", "top")
      addDepthHandle(arcRightX, originY + cutterHeight, "right", "bottom")
    }
  }

  const zipperOffset = zipper.offsetX ?? 0
  const zipperWidth = zipper.width ?? 3
  let zipperLeftX = originX + zipperOffset
  let zipperRightX = originX + cutterWidth - zipperOffset - zipperWidth
  if (showZipper) {
    const zipperY = originY
    const zipperHeight = cutterHeight
    if (zipperWidth > 0 && zipperHeight > 0) {
      const renderZipper = (x: number, side: "left" | "right") => {
        const g = document.createElementNS(SVG_NS, "g")
        g.setAttribute("data-role", "zipper-group")
        g.setAttribute("data-zipper-side", side)
        g.setAttribute("transform", `translate(${x} ${zipperY})`)
        zipperLayer.appendChild(g)

        const zipperRect = rect(0, 0, zipperWidth, zipperHeight, "zipper")
        zipperRect.setAttribute("data-role", "zipper-strip")
        zipperRect.setAttribute("data-zipper-side", side)
        zipperRect.setAttribute("fill", "none")
        zipperRect.setAttribute("cursor", "ew-resize")
        g.appendChild(zipperRect)

        renderHatchLines(
          g,
          0,
          0,
          zipperWidth,
          zipperHeight,
          6,
          STYLES.zipper.stroke,
          0.4
        )

        const stopHeight = Math.min(zipper.stopWidth, zipperHeight / 2)
        const makeStop = (y: number) => {
          const stop = document.createElementNS(SVG_NS, "rect")
          stop.setAttribute("x", "0")
          stop.setAttribute("y", y.toString())
          stop.setAttribute("width", zipperWidth.toString())
          stop.setAttribute("height", stopHeight.toString())
          stop.setAttribute("fill", STYLES.zipper.stroke)
          stop.setAttribute("opacity", "0.25")
          stop.setAttribute("data-role", "zipper-stop")
          g.appendChild(stop)
        }
        makeStop(0)
        makeStop(zipperHeight - stopHeight)
      }
      renderZipper(zipperLeftX, "left")
      renderZipper(zipperRightX, "right")
    }
  }

  const notchHalf = tearNotch.width / 2
  const notchDepth = tearNotch.depth
  const defaultNotchOffset = Math.max(
    0,
    (zipper.offsetX ?? 0) - NOTCH_OUTER_OFFSET
  )
  const notchOffset = tearNotch.offsetX ?? tearNotch.offsetY ?? defaultNotchOffset
  const notchLeftX = originX + notchOffset
  const notchRightX = originX + cutterWidth - notchOffset
  const makeNotch = (x: number, y: number, direction: number) => {
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
    notch.setAttribute("data-role", "tear-notch")
    tearNotchLayer.appendChild(notch)
    return notch
  }
    if (showTearNotch && tearNotch.width > 0 && tearNotch.depth > 0) {
    const leftSep = showZipper ? zipperLeftX - notchLeftX : Number.POSITIVE_INFINITY
    const rightSep = showZipper
      ? notchRightX - (zipperRightX + zipperWidth)
      : Number.POSITIVE_INFINITY
    const leftGripOuterX = originX + sideBleed
    const rightGripOuterX = originX + cutterWidth - sideBleed
    const leftGripError = showGripSeal
      ? notchLeftX >= leftGripOuterX - NOTCH_MIN_SEPARATION
      : false
    const rightGripError = showGripSeal
      ? notchRightX <= rightGripOuterX + NOTCH_MIN_SEPARATION
      : false
    const hasSeparationIssue =
      leftSep <= NOTCH_MIN_SEPARATION ||
      rightSep <= NOTCH_MIN_SEPARATION ||
      leftGripError ||
      rightGripError

    const topLeft = makeNotch(notchLeftX, originY, 1)
    const topRight = makeNotch(notchRightX, originY, 1)
    const bottomLeft = makeNotch(notchLeftX, originY + cutterHeight, -1)
    const bottomRight = makeNotch(notchRightX, originY + cutterHeight, -1)
    ;[
      { el: topLeft, side: "left", pos: "top" },
      { el: topRight, side: "right", pos: "top" },
      { el: bottomLeft, side: "left", pos: "bottom" },
      { el: bottomRight, side: "right", pos: "bottom" }
    ].forEach(({ el, side, pos }) => {
      el.setAttribute("stroke", hasSeparationIssue ? "#d7261d" : STYLES.cutLine.stroke)
      el.setAttribute("data-notch-side", side)
      el.setAttribute("data-notch-pos", pos)
      el.setAttribute("cursor", "ew-resize")
    })

    if (hasSeparationIssue) {
      const warnWidth = Math.max(2, NOTCH_OUTER_OFFSET)
      const leftWarn = rect(
        notchLeftX - warnWidth / 2,
        originY,
        warnWidth,
        cutterHeight,
        "cutLine"
      )
      leftWarn.setAttribute("fill", "#d7261d")
      leftWarn.setAttribute("opacity", "0.12")
      leftWarn.setAttribute("stroke", "none")
      leftWarn.setAttribute("pointer-events", "none")
      tearNotchLayer.appendChild(leftWarn)
      const rightWarn = rect(
        notchRightX - warnWidth / 2,
        originY,
        warnWidth,
        cutterHeight,
        "cutLine"
      )
      rightWarn.setAttribute("fill", "#d7261d")
      rightWarn.setAttribute("opacity", "0.12")
      rightWarn.setAttribute("stroke", "none")
      rightWarn.setAttribute("pointer-events", "none")
      tearNotchLayer.appendChild(rightWarn)
      }
    }

    const ovalMisaligned =
      showOval && showCenterBox && Math.abs(ovalCenterX - rectCenterX) > 0.01
    if (ovalMisaligned) {
      const errorText = "Bottom Gusset not centred to bottom of pack"
      const fontSize = DIMENSION_TEXT_SIZE * 0.6
      const paddingX = 3
      const paddingY = 2
      const textWidth = estimateTextWidth(errorText, fontSize)
      const boxWidth = textWidth + paddingX * 2
      const boxHeight = fontSize + paddingY * 2
      const boxX = ovalLeftX
      const boxY = originY - boxHeight - 4
      const rectEl = document.createElementNS(SVG_NS, "rect")
      rectEl.setAttribute("x", boxX.toString())
      rectEl.setAttribute("y", boxY.toString())
      rectEl.setAttribute("width", boxWidth.toString())
      rectEl.setAttribute("height", boxHeight.toString())
      rectEl.setAttribute("fill", "#f9d9d7")
      rectEl.setAttribute("stroke", "#d23429")
      rectEl.setAttribute("stroke-width", "0.4")
      rectEl.setAttribute("data-role", "doy-error")
      warningLayer.appendChild(rectEl)

      const textEl = document.createElementNS(SVG_NS, "text")
      textEl.setAttribute("x", (boxX + paddingX).toString())
      textEl.setAttribute("y", (boxY + boxHeight - paddingY).toString())
      textEl.setAttribute("fill", "#7a1b17")
      textEl.setAttribute("font-size", fontSize.toString())
      textEl.textContent = errorText
      textEl.setAttribute("data-role", "doy-error")
      warningLayer.appendChild(textEl)
    }

    const arcLeftGap = centerLeft - arcLeftX
    const arcRightGap = arcRightX - centerRight
    const ovalLeftGap = ovalLeftX - originX
    const ovalRightGap = cutterRightX - ovalRightX
    const arcUnsafe = showGusset && (arcLeftGap < gap1 || arcRightGap < gap1)
    const ovalUnsafe =
      showOval && (ovalLeftGap < gap2 || ovalRightGap < gap2)
    const foldSafeWarning = arcUnsafe || ovalUnsafe
    if (foldSafeWarning) {
      const warningText =
        "Gusset Fold or Bottom Gusset in fold safe zone, consider moving"
      const warningFontSize = DIMENSION_TEXT_SIZE * 0.45
      const paddingX = 3
      const paddingY = 2
      const estimatedWidth = estimateTextWidth(warningText, warningFontSize)
      const boxWidth = estimatedWidth + paddingX * 2
      const boxHeight = warningFontSize + paddingY * 2
      const boxX = 10
      const boxY = 10
      const rectEl = document.createElementNS(SVG_NS, "rect")
      rectEl.setAttribute("x", boxX.toString())
      rectEl.setAttribute("y", boxY.toString())
      rectEl.setAttribute("width", boxWidth.toString())
      rectEl.setAttribute("height", boxHeight.toString())
      rectEl.setAttribute("fill", "#fff2a8")
      rectEl.setAttribute("stroke", "#000000")
      rectEl.setAttribute("stroke-width", "0.4")
      rectEl.setAttribute("data-role", "doy-warning")
      warningLayer.appendChild(rectEl)

      const textEl = document.createElementNS(SVG_NS, "text")
      textEl.setAttribute("x", (boxX + paddingX).toString())
      textEl.setAttribute("y", (boxY + boxHeight - paddingY).toString())
      textEl.setAttribute("fill", "#000000")
      textEl.setAttribute("font-size", warningFontSize.toString())
      textEl.textContent = warningText
      textEl.setAttribute("data-role", "doy-warning")
      warningLayer.appendChild(textEl)

      const legendText = document.createElementNS(SVG_NS, "text")
      legendText.setAttribute("x", boxX.toString())
      legendText.setAttribute(
        "y",
        (boxY + boxHeight + warningFontSize + 4).toString()
      )
      legendText.setAttribute("fill", "#000000")
      legendText.setAttribute("font-size", warningFontSize.toString())
      legendText.textContent = warningText
      legendText.setAttribute("data-role", "doy-warning")
      warningLayer.appendChild(legendText)
    }
  }

function buildBufferBreachPath(
  liveOriginX: number,
  liveOriginY: number,
  liveWidth: number,
  liveHeight: number,
  buffer: number
) {
  const outerX = liveOriginX
  const outerY = liveOriginY
  const outerW = liveWidth
  const outerH = liveHeight
  const innerX = liveOriginX + buffer
  const innerY = liveOriginY + buffer
  const innerW = liveWidth - buffer * 2
  const innerH = liveHeight - buffer * 2

  return `M ${outerX} ${outerY} h ${outerW} v ${outerH} h ${-outerW} Z M ${innerX} ${innerY} h ${innerW} v ${innerH} h ${-innerW} Z`
}

export type FlowwrapResolvedLayout = ResolvedFlowwrapLayout

export function renderResolvedFlowwrap(
  spec: FlowwrapSpec,
  layout: FlowwrapResolvedLayout,
  options: RenderOptions = {}
): SVGSVGElement {
  spec = normaliseOpeningStyle(spec)
  const renderMode: RenderMode = options.renderMode ?? "edit"
  const {
    validationErrors,
    warnings,
    cutterWidth,
    cutterHeight,
    seals,
    bleedInset,
    margin,
    liveWidth,
    liveHeight,
    totalWidth,
    totalHeight,
    substrate,
    substrateFill,
    substrateOpacity,
    originX,
    originY,
    liveOriginX,
    liveOriginY,
    safeZones,
    windows,
    attributeBoxes,
    hangerSlots,
    foldLines,
    doyLayout,
    doyOval,
    perfCenters,
    perfPatternOverflow
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
  const gussetFoldLineLayer = group("gusset_fold_lines")
  const gussetSideLayer = group("gusset_side_gusset")
  const gussetBottomLayer = group("gusset_bottom_gusset")
  const gripSealLayer = group("grip_seal_layer")
  const zipperLayer = group("zipper_layer")
  const tearNotchLayer = group("tear_notches")
  const sealLayer = group("seal_areas")
  const safeZoneLayer = group("safe_zones")
  const windowLayer = group("windows")
  const attributeBoxLayer = group("attribute_boxes")
  const hangerSlotLayer = group("hanger_slots")
  const bleedLayer = group("bleed")
  const perfLayer = group("perf_layer")
  const eyemarkLayer = group("eyemark_track")
  const measurementLayer = group("measurement_annotations")
  const selectionLayer = group("selection_overlay")
  const annotationLayer = group("annotations")
  annotationLayer.setAttribute("data-text-size", DIMENSION_TEXT_SIZE.toString())
  const warningLayer = group("soft_warnings")

  svg.appendChild(substrateLayer)
  svg.appendChild(bleedLayer)
  svg.appendChild(sealLayer)
  svg.appendChild(safeZoneLayer)
  svg.appendChild(windowLayer)
  svg.appendChild(attributeBoxLayer)
  svg.appendChild(hangerSlotLayer)
  svg.appendChild(foldLayer)
  svg.appendChild(gussetFoldLineLayer)
  svg.appendChild(gussetSideLayer)
  svg.appendChild(gussetBottomLayer)
  svg.appendChild(gripSealLayer)
  svg.appendChild(zipperLayer)
  svg.appendChild(tearNotchLayer)
  svg.appendChild(perfLayer)
  svg.appendChild(cutLayer)
  svg.appendChild(eyemarkLayer)
  svg.appendChild(measurementLayer)
  selectionLayer.setAttribute("pointer-events", "none")
  svg.appendChild(selectionLayer)
  svg.appendChild(annotationLayer)
  svg.appendChild(warningLayer)

  cutLayer.setAttribute("data-layer-id", "cutter-outline")
  substrateLayer.setAttribute("data-layer-id", "substrate")
  sealLayer.setAttribute("data-layer-id", "seal-areas")
  foldLayer.setAttribute("data-layer-id", "fold-lines")
  gussetFoldLineLayer.setAttribute("data-layer-id", "gusset-fold-line")
  gussetSideLayer.setAttribute("data-layer-id", "gusset-side")
  gussetBottomLayer.setAttribute("data-layer-id", "gusset-bottom")
  gripSealLayer.setAttribute("data-layer-id", "grip-seals")
  zipperLayer.setAttribute("data-layer-id", "zips")
  tearNotchLayer.setAttribute("data-layer-id", "tear-notches")
  eyemarkLayer.setAttribute("data-layer-id", "eyemarks")
    perfLayer.setAttribute("data-layer-id", "perf-lines")
    safeZoneLayer.setAttribute("data-layer-id", "safe-zones")
    windowLayer.setAttribute("data-layer-id", "windows")
    attributeBoxLayer.setAttribute("data-layer-id", "notes")
    hangerSlotLayer.setAttribute("data-layer-id", "hanger-slots")
  measurementLayer.setAttribute("data-layer-id", "measurement-guides")
  annotationLayer.setAttribute("data-layer-id", "annotations")

  const appendWarning = (message: string) => {
    const current = svg.getAttribute("data-warning")
    const next = current ? `${current}\n${message}` : message
    svg.setAttribute("data-warning", next)
  }
  const appendError = (message: string) => {
    const current = svg.getAttribute("data-error")
    const next = current ? `${current}\n${message}` : message
    svg.setAttribute("data-error", next)
  }

  validationErrors.forEach(message => {
    appendError(message)
  })

  warnings.forEach(message => {
    appendWarning(message)
  })

  safeZoneLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  safeZoneLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  safeZoneLayer.setAttribute("data-live-width", liveWidth.toString())
  safeZoneLayer.setAttribute("data-live-height", liveHeight.toString())
  safeZoneLayer.setAttribute("data-handle-size", "12")
  windowLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  windowLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  windowLayer.setAttribute("data-live-width", liveWidth.toString())
  windowLayer.setAttribute("data-live-height", liveHeight.toString())
    attributeBoxLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
    attributeBoxLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
    hangerSlotLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
    eyemarkLayer.setAttribute("data-cutter-origin-x", originX.toString())
    eyemarkLayer.setAttribute("data-cutter-origin-y", originY.toString())
    eyemarkLayer.setAttribute("data-cutter-width", cutterWidth.toString())
    eyemarkLayer.setAttribute("data-cutter-height", cutterHeight.toString())
    eyemarkLayer.setAttribute("data-seal-top", seals.top.toString())
    eyemarkLayer.setAttribute("data-seal-bottom", seals.bottom.toString())
    eyemarkLayer.setAttribute("data-seal-left", seals.left.toString())
    eyemarkLayer.setAttribute("data-seal-right", seals.right.toString())
  hangerSlotLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  hangerSlotLayer.setAttribute("data-live-width", liveWidth.toString())
  sealLayer.setAttribute("data-origin-x", originX.toString())
  sealLayer.setAttribute("data-origin-y", originY.toString())
  sealLayer.setAttribute("data-live-width", liveWidth.toString())
  sealLayer.setAttribute("data-live-height", liveHeight.toString())
  sealLayer.setAttribute("data-cutter-width", cutterWidth.toString())
  sealLayer.setAttribute("data-cutter-height", cutterHeight.toString())

  const defs = document.createElementNS(SVG_NS, "defs")
  const clipPath = document.createElementNS(SVG_NS, "clipPath")
  clipPath.setAttribute("id", "cut_clip")
  const clipRect = document.createElementNS(SVG_NS, "rect")
  clipRect.setAttribute("x", originX.toString())
  clipRect.setAttribute("y", originY.toString())
  clipRect.setAttribute("width", cutterWidth.toString())
  clipRect.setAttribute("height", cutterHeight.toString())
  clipPath.appendChild(clipRect)
  defs.appendChild(clipPath)
  svg.appendChild(defs)

  ;[
    foldLayer,
    gussetFoldLineLayer,
    gussetSideLayer,
    gussetBottomLayer,
    gripSealLayer,
    zipperLayer,
    tearNotchLayer,
    sealLayer,
    safeZoneLayer,
    windowLayer,
    attributeBoxLayer,
    hangerSlotLayer,
    bleedLayer,
    perfLayer,
    eyemarkLayer
  ].forEach(layer => {
    layer.setAttribute("clip-path", "url(#cut_clip)")
  })

  const substrateRect = rect(originX, originY, cutterWidth, cutterHeight, "substrate")
  substrateRect.setAttribute("fill", substrateFill)
  substrateRect.setAttribute("opacity", substrateOpacity.toString())
  substrateLayer.appendChild(substrateRect)

  const doyTrimWidth = spec.doyPouch?.trimEnabled ?? false
    ? Math.max(0, (cutterWidth - spec.width) / 2)
    : 0
  if (doyTrimWidth > 0 && spec.doyPouch) {
    ;[
      { side: "left", x: originX },
      { side: "right", x: originX + cutterWidth - doyTrimWidth }
    ].forEach(({ side, x }) => {
      // Match K-Seal: trim is the outer band beyond the pouch body, not an
      // additional seal band on the pouch-facing side of its boundary.
      const trim = rect(x, originY, doyTrimWidth, cutterHeight, "substrate")
      trim.setAttribute("fill", substrateFill)
      trim.setAttribute("opacity", substrateOpacity.toString())
      trim.setAttribute("data-role", "doy-trim")
      trim.setAttribute("data-trim-side", side)
      substrateLayer.appendChild(trim)
    })
    ;[
      { side: "left", x: originX + doyTrimWidth },
      { side: "right", x: originX + cutterWidth - doyTrimWidth }
    ].forEach(({ side, x }) => {
      const boundary = line(x, originY, x, originY + cutterHeight, "cutLine")
      boundary.setAttribute("data-role", "doy-trim-boundary")
      boundary.setAttribute("data-trim-side", side)
      boundary.setAttribute("pointer-events", "none")
      foldLayer.appendChild(boundary)
    })
  }

  cutLayer.appendChild(
    rect(originX, originY, cutterWidth, cutterHeight, "cutLine")
  )

  if (spec.halfMoonCutouts && spec.halfMoonCutouts.length > 0) {
    renderHalfMoonCutouts(cutLayer, spec, spec.halfMoonCutouts, originX, originY)
  }

  if (foldLines.length > 0) {
    const minFoldX = liveOriginX + bleedInset
    const maxFoldX = liveOriginX + liveWidth - bleedInset
    const foldSegments = buildFoldLines(
      foldLines,
      liveOriginX,
      originX,
      originY,
      cutterWidth,
      cutterHeight,
      minFoldX,
      maxFoldX
    )
    renderFoldLines(foldLayer, foldSegments, liveOriginX, minFoldX, maxFoldX)
  }

  const doySealVisual = spec.doyPouch ? group("doy_seal_visual") : null
  if (doySealVisual) {
    doySealVisual.setAttribute("data-role", "doy-seal-visual")
    doySealVisual.setAttribute("opacity", ".32")
    doySealVisual.setAttribute("pointer-events", "none")
    if (doyTrimWidth > 0) {
      const clip = document.createElementNS(SVG_NS, "clipPath")
      clip.setAttribute("id", "doy-seal-live-clip")
      clip.appendChild(rect(originX + doyTrimWidth, originY, cutterWidth - 2 * doyTrimWidth, cutterHeight, "substrate"))
      svg.querySelector("defs")?.appendChild(clip)
      doySealVisual.setAttribute("clip-path", "url(#doy-seal-live-clip)")
    }
    sealLayer.appendChild(doySealVisual)
  }
  renderDoyPouchGuides(
    {
      sealVisual: doySealVisual ?? undefined,
      foldLine: gussetFoldLineLayer,
      sideGusset: gussetSideLayer,
      bottomGusset: gussetBottomLayer,
      gripSeal: gripSealLayer,
      zipper: zipperLayer,
      tearNotch: tearNotchLayer
    },
    warningLayer,
    spec,
    originX,
    originY,
    liveOriginX,
    liveWidth,
    cutterWidth,
    cutterHeight
  )


  const matchDoySealVisual = (sealRect: SVGRectElement) => {
    if (!spec.doyPouch) return
    sealRect.setAttribute("fill", "#2E8B57")
    sealRect.setAttribute("stroke", "none")
    sealRect.setAttribute("opacity", "1")
  }
  const topSealRect = rect(originX, originY, cutterWidth, seals.top, "seals")
  matchDoySealVisual(topSealRect)
  topSealRect.setAttribute("data-role", "seal-rect")
  topSealRect.setAttribute("data-seal-side", "top")
  ;(doySealVisual ?? sealLayer).appendChild(topSealRect)

  const bottomSealRect = rect(
    originX,
    liveOriginY + liveHeight,
    cutterWidth,
    seals.bottom,
    "seals"
  )
  matchDoySealVisual(bottomSealRect)
  bottomSealRect.setAttribute("data-role", "seal-rect")
  bottomSealRect.setAttribute("data-seal-side", "bottom")
  ;(doySealVisual ?? sealLayer).appendChild(bottomSealRect)

  const leftSealRect = rect(
    spec.doyPouch ? liveOriginX - seals.left : originX,
    originY,
    seals.left,
    cutterHeight,
    "seals"
  )
  matchDoySealVisual(leftSealRect)
  leftSealRect.setAttribute("data-role", "seal-rect")
  leftSealRect.setAttribute("data-seal-side", "left")
  ;(doySealVisual ?? sealLayer).appendChild(leftSealRect)

  const rightSealRect = rect(
    liveOriginX + liveWidth,
    originY,
    seals.right,
    cutterHeight,
    "seals"
  )
  matchDoySealVisual(rightSealRect)
  rightSealRect.setAttribute("data-role", "seal-rect")
  rightSealRect.setAttribute("data-seal-side", "right")
  ;(doySealVisual ?? sealLayer).appendChild(rightSealRect)

  const handleThickness = 10
  const topHandle = document.createElementNS(SVG_NS, "rect")
  topHandle.setAttribute("x", originX.toString())
  topHandle.setAttribute("y", (liveOriginY - handleThickness / 2).toString())
  topHandle.setAttribute("width", cutterWidth.toString())
  topHandle.setAttribute("height", handleThickness.toString())
  topHandle.setAttribute("fill", "transparent")
  topHandle.setAttribute("data-seal-side", "top")
  topHandle.setAttribute("data-role", "seal-handle")
  topHandle.setAttribute("cursor", "ns-resize")
  sealLayer.appendChild(topHandle)

  const bottomHandle = document.createElementNS(SVG_NS, "rect")
  bottomHandle.setAttribute("x", originX.toString())
  bottomHandle.setAttribute(
    "y",
    (liveOriginY + liveHeight - handleThickness / 2).toString()
  )
  bottomHandle.setAttribute("width", cutterWidth.toString())
  bottomHandle.setAttribute("height", handleThickness.toString())
  bottomHandle.setAttribute("fill", "transparent")
  bottomHandle.setAttribute("data-seal-side", "bottom")
  bottomHandle.setAttribute("data-role", "seal-handle")
  bottomHandle.setAttribute("cursor", "ns-resize")
  sealLayer.appendChild(bottomHandle)

  const leftHandle = document.createElementNS(SVG_NS, "rect")
  leftHandle.setAttribute("x", (liveOriginX - handleThickness / 2).toString())
  leftHandle.setAttribute("y", originY.toString())
  leftHandle.setAttribute("width", handleThickness.toString())
  leftHandle.setAttribute("height", cutterHeight.toString())
  leftHandle.setAttribute("fill", "transparent")
  leftHandle.setAttribute("data-seal-side", "left")
  leftHandle.setAttribute("data-role", "seal-handle")
  leftHandle.setAttribute("cursor", "ew-resize")
  sealLayer.appendChild(leftHandle)

  const rightHandle = document.createElementNS(SVG_NS, "rect")
  rightHandle.setAttribute(
    "x",
    (liveOriginX + liveWidth - handleThickness / 2).toString()
  )
  rightHandle.setAttribute("y", originY.toString())
  rightHandle.setAttribute("width", handleThickness.toString())
  rightHandle.setAttribute("height", cutterHeight.toString())
  rightHandle.setAttribute("fill", "transparent")
  rightHandle.setAttribute("data-seal-side", "right")
  rightHandle.setAttribute("data-role", "seal-handle")
  rightHandle.setAttribute("cursor", "ew-resize")
  sealLayer.appendChild(rightHandle)

  if (doyLayout) {
    safeZoneLayer.setAttribute("data-doy-arc-left-x", doyLayout.arcLeftX.toString())
    safeZoneLayer.setAttribute("data-doy-arc-right-x", doyLayout.arcRightX.toString())
    safeZoneLayer.setAttribute("data-doy-arc-depth", doyLayout.arcInsetDepth.toString())
    safeZoneLayer.setAttribute("data-doy-origin-y", originY.toString())
    safeZoneLayer.setAttribute("data-doy-height", cutterHeight.toString())
    const showCenterBox = spec.doyPouch?.showCenterBox !== false
    const showOval = spec.doyPouch?.showOval !== false
    void showCenterBox
    void showOval
  } else {
    safeZoneLayer.removeAttribute("data-doy-arc-left-x")
    safeZoneLayer.removeAttribute("data-doy-arc-right-x")
    safeZoneLayer.removeAttribute("data-doy-arc-depth")
    safeZoneLayer.removeAttribute("data-doy-origin-y")
    safeZoneLayer.removeAttribute("data-doy-height")
  }

  if (safeZones.length > 0) {
    renderSafeZones(safeZoneLayer, safeZones, liveOriginX, liveOriginY)
  }

  if (windows.length > 0) {
    renderWindows(windowLayer, windows, liveOriginX, liveOriginY)
  }

  if (attributeBoxes.length > 0) {
    renderAttributeBoxes(
      attributeBoxLayer,
      attributeBoxes,
      liveOriginX,
      liveOriginY,
      0,
      null,
      renderMode
    )
  }

  if (hangerSlots.length > 0) {
    renderHangerSlots(hangerSlotLayer, hangerSlots, liveOriginX, liveOriginY, liveWidth, {cutterOriginX:originX,cutterWidth})
    renderHangerSlotWarnings(warningLayer, hangerSlots, liveOriginX, liveOriginY,originX)
  }

  if (spec.perfs) {
    if (spec.perfs.mode === "regulated") {
      if (perfPatternOverflow) {
        appendWarning("Perf pattern exceeds seal area")
      }
    }
    renderPerfs(
      perfLayer,
      spec.perfs,
      liveOriginX,
      liveOriginY,
      liveWidth,
      liveHeight,
      originX,
      originY,
      cutterWidth,
      cutterHeight
    )
  }

  if (spec.eyeMarks) {
    renderEyeMarks(
      eyemarkLayer,
      spec.eyeMarks,
      originX,
      originY,
      cutterWidth,
      cutterHeight,
      seals,
      doyOval
    )
  }

  const perfMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-perf-measures") === "true"
  if (perfMeasuresEnabled && spec.perfs) {
    const perfMeasureLayer = document.createElementNS(SVG_NS, "g")
    annotationLayer.appendChild(perfMeasureLayer)
    const centers = perfCenters ?? buildPerfCenters(spec.perfs, liveOriginX, liveOriginY, liveWidth, liveHeight, originX, originY, cutterWidth, cutterHeight)
    const measurePack={x:originX,y:originY,width:cutterWidth,height:cutterHeight}
    renderPerfMeasurements(perfMeasureLayer,spec.perfs,centers,measurePack,annotationObstacles(spec,liveOriginX,liveOriginY,measurePack),annotationObstacles({...spec,safeZones:[]},liveOriginX,liveOriginY,measurePack))
  }

  const mainMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-main-measures") !== "false"
  const subMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-sub-measures") === "true"
  const dimTopY = originY - DIMENSION_OFFSET
  const totalDimY = subMeasuresEnabled ? originY - MAIN_DIMENSION_OFFSET : dimTopY
  if (mainMeasuresEnabled) {
    dimensionLine(
      annotationLayer,
      originX,
      totalDimY,
      originX + cutterWidth,
      totalDimY,
      `W ${formatMm(cutterWidth)}`,
      { x: 0, y: -4 }
    )
  }

  if (subMeasuresEnabled) {
    renderSubMeasureGroups(
      annotationLayer,
      spec,
      originX,
      originY,
      liveOriginX,
      liveOriginY,
      liveWidth,
      liveHeight,
      cutterWidth,
      cutterHeight
    )
  }

  const dimLeftX = originX - DIMENSION_OFFSET
  const totalDimX = subMeasuresEnabled ? originX - MAIN_DIMENSION_OFFSET : dimLeftX
  if (mainMeasuresEnabled) {
    dimensionLine(
      annotationLayer,
      totalDimX,
      originY,
      totalDimX,
      originY + cutterHeight,
      `H ${formatMm(cutterHeight)}`,
      { x: 0, y: 0 },
      -90
    )
  }

  if (!subMeasuresEnabled) {
    clearSubMeasureGroups(annotationLayer)
  }

  svg.setAttribute(
    "data-cutter-center-x",
    (originX + cutterWidth / 2).toString()
  )
  svg.setAttribute("data-dim-top-y", totalDimY.toString())
  updateDoyWarningsLayer(svg, spec)

  applySubstrateAppearance(svg,spec)
  return svg
}

export function generateFlowwrap(
  spec: FlowwrapSpec = {
    width: 300,
    height: 180,
    seal: 10
  },
  options: RenderOptions = {}
): SVGSVGElement {
  const layout = resolveFlowwrapLayout(spec)
  return renderResolvedFlowwrap(spec, layout, options)
}

export function updateSubMeasuresLayer(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  forcePreview = false
) {
  spec = normaliseOpeningStyle(spec)
  const annotationLayer = svg.querySelector<SVGGElement>("g#annotations")
  if (!annotationLayer) {
    return
  }
  const enabled =
    typeof document !== "undefined" &&
    (forcePreview || document.documentElement.getAttribute("data-sub-measures") === "true")
  const sealLayer = svg.querySelector("g#seal_areas")
  const safeLayer = svg.querySelector("g#safe_zones")
  const originX = Number(sealLayer?.getAttribute("data-origin-x") ?? "0")
  const originY = Number(sealLayer?.getAttribute("data-origin-y") ?? "0")
  const liveWidth = Number(sealLayer?.getAttribute("data-live-width") ?? "0")
  const liveHeight = Number(sealLayer?.getAttribute("data-live-height") ?? "0")
  const cutterWidth = Number(sealLayer?.getAttribute("data-cutter-width") ?? "0")
  const cutterHeight = Number(sealLayer?.getAttribute("data-cutter-height") ?? "0")
  const liveOriginX = Number(safeLayer?.getAttribute("data-live-origin-x") ?? originX)
  const liveOriginY = Number(safeLayer?.getAttribute("data-live-origin-y") ?? originY)
  if (!enabled) {
    clearSubMeasureGroups(annotationLayer)
    return
  }
  renderSubMeasureGroups(
    annotationLayer,
    spec,
    originX,
    originY,
    liveOriginX,
    liveOriginY,
    liveWidth,
    liveHeight,
    cutterWidth,
    cutterHeight
  )
}

export function updateDoyWarningsLayer(
  svg: SVGSVGElement,
  spec: FlowwrapSpec
) {
  const warningLayer = svg.querySelector<SVGGElement>("g#soft_warnings")
  if (!warningLayer) {
    return
  }
  warningLayer
    .querySelectorAll("[data-role=\"doy-error\"], [data-role=\"doy-warning\"]")
    .forEach(node => node.remove())
  const appendError = (message: string) => {
    const current = svg.getAttribute("data-error")
    const next = current ? `${current}\n${message}` : message
    svg.setAttribute("data-error", next)
  }
  const sealLayer = svg.querySelector("g#seal_areas")
  const safeLayer = svg.querySelector("g#safe_zones")
  const originX = Number(sealLayer?.getAttribute("data-origin-x") ?? "0")
  const originY = Number(sealLayer?.getAttribute("data-origin-y") ?? "0")
  const cutterWidth = Number(sealLayer?.getAttribute("data-cutter-width") ?? "0")
  const cutterHeight = Number(sealLayer?.getAttribute("data-cutter-height") ?? "0")
  const liveWidth = Number(sealLayer?.getAttribute("data-live-width") ?? "0")
  const liveOriginX = Number(safeLayer?.getAttribute("data-live-origin-x") ?? originX)
  const layout = resolveDoyLayout(spec, originX, liveOriginX, liveWidth, cutterWidth)
  if (!layout) {
    return
  }
  const {
    rectCenterX,
    centerLeft,
    centerRight,
    arcInsetDepth,
    arcLeftX,
    arcRightX,
    ovalCenterX,
    ovalLeftX,
    ovalRightX,
    gap1,
    gap2,
    cutterRightX
  } = layout
  const showCenterBox = spec.doyPouch?.showCenterBox !== false
  const showOval = spec.doyPouch?.showOval !== false
  const showGusset = spec.doyPouch?.showGusset !== false

  const ovalMisaligned =
    showOval && showCenterBox && Math.abs(ovalCenterX - rectCenterX) > 0.01
  if (ovalMisaligned) {
    const errorText = "Bottom Gusset not centred to bottom of pack"
    const fontSize = DIMENSION_TEXT_SIZE * 0.6
    const paddingX = 3
    const paddingY = 2
    const textWidth = estimateTextWidth(errorText, fontSize)
    const boxWidth = textWidth + paddingX * 2
    const boxHeight = fontSize + paddingY * 2
    const boxX = 10
    const boxY = 10
    const rectEl = document.createElementNS(SVG_NS, "rect")
    rectEl.setAttribute("x", boxX.toString())
    rectEl.setAttribute("y", boxY.toString())
    rectEl.setAttribute("width", boxWidth.toString())
    rectEl.setAttribute("height", boxHeight.toString())
    rectEl.setAttribute("fill", "#f9d9d7")
    rectEl.setAttribute("stroke", "#d23429")
    rectEl.setAttribute("stroke-width", "0.4")
    rectEl.setAttribute("data-role", "doy-error")
    warningLayer.appendChild(rectEl)

    const textEl = document.createElementNS(SVG_NS, "text")
    textEl.setAttribute("x", (boxX + paddingX).toString())
    textEl.setAttribute("y", (boxY + boxHeight - paddingY).toString())
    textEl.setAttribute("fill", "#7a1b17")
    textEl.setAttribute("font-size", fontSize.toString())
    textEl.textContent = errorText
    textEl.setAttribute("data-role", "doy-error")
    warningLayer.appendChild(textEl)
  }

  const centerLines = svg.querySelectorAll<SVGLineElement>(
    "[data-role=\"doy-center-line\"]"
  )
  centerLines.forEach(lineEl => {
    lineEl.setAttribute("stroke", FOLD_STROKE)
    lineEl.setAttribute("stroke-width", FOLD_STROKE_WIDTH.toString())
  })

  const arcLeftMidX = arcLeftX + ARC_MEASURE_FACTOR * arcInsetDepth
  const arcRightMidX = arcRightX - ARC_MEASURE_FACTOR * arcInsetDepth
  const arcLeftGap = centerLeft - arcLeftX
  const arcRightGap = arcRightX - centerRight
  const arcLeftMidGap = centerLeft - arcLeftMidX
  const arcRightMidGap = arcRightMidX - centerRight
  const ovalLeftGap = ovalLeftX - originX
  const ovalRightGap = cutterRightX - ovalRightX
  const arcUnsafe = showGusset && (arcLeftGap < gap1 || arcRightGap < gap1)
  const leftSideTooClose = arcLeftGap < 4
  const rightSideTooClose = arcRightGap < 4
  const sideGussetTooClose = showGusset && (leftSideTooClose || rightSideTooClose)
  if (sideGussetTooClose) {
    appendError("Consider Moving Gusset Fold Line away from Gusset Centre")
  }
  const ovalUnsafe =
    showOval && (ovalLeftGap < gap2 || ovalRightGap < gap2)
  const foldSafeWarning = arcUnsafe || ovalUnsafe
  if (sideGussetTooClose) {
    const errorText = "Side Gusset too close to Gusset Fold Line"
    const fontSize = DIMENSION_TEXT_SIZE * 0.55
    const paddingX = 3
    const paddingY = 2
    const textWidth = estimateTextWidth(errorText, fontSize)
    const boxWidth = textWidth + paddingX * 2
    const boxHeight = fontSize + paddingY * 2
    const boxX = 10
    const boxY = foldSafeWarning || ovalMisaligned ? 50 : 10
    const rectEl = document.createElementNS(SVG_NS, "rect")
    rectEl.setAttribute("x", boxX.toString())
    rectEl.setAttribute("y", boxY.toString())
    rectEl.setAttribute("width", boxWidth.toString())
    rectEl.setAttribute("height", boxHeight.toString())
    rectEl.setAttribute("fill", "#f9d9d7")
    rectEl.setAttribute("stroke", "#d23429")
    rectEl.setAttribute("stroke-width", "0.4")
    rectEl.setAttribute("data-role", "doy-error")
    warningLayer.appendChild(rectEl)

    const textEl = document.createElementNS(SVG_NS, "text")
    textEl.setAttribute("x", (boxX + paddingX).toString())
    textEl.setAttribute("y", (boxY + boxHeight - paddingY).toString())
    textEl.setAttribute("fill", "#7a1b17")
    textEl.setAttribute("font-size", fontSize.toString())
    textEl.textContent = errorText
    textEl.setAttribute("data-role", "doy-error")
    warningLayer.appendChild(textEl)
    const warnWidth = 4
    if (leftSideTooClose) {
      const leftWarn = rect(
        centerLeft - warnWidth,
        originY,
        warnWidth,
        cutterHeight,
        "cutLine"
      )
      leftWarn.setAttribute("fill", "#d7261d")
      leftWarn.setAttribute("opacity", "0.12")
      leftWarn.setAttribute("stroke", "none")
      leftWarn.setAttribute("pointer-events", "none")
      warningLayer.appendChild(leftWarn)
    }
    if (rightSideTooClose) {
      const rightWarn = rect(
        centerRight,
        originY,
        warnWidth,
        cutterHeight,
        "cutLine"
      )
      rightWarn.setAttribute("fill", "#d7261d")
      rightWarn.setAttribute("opacity", "0.12")
      rightWarn.setAttribute("stroke", "none")
      rightWarn.setAttribute("pointer-events", "none")
      warningLayer.appendChild(rightWarn)
    }
  }
  if (foldSafeWarning && !sideGussetTooClose && false) {
    const warningText =
      "Gusset Fold or Bottom Gusset in fold safe zone, consider moving"
    const warningFontSize = DIMENSION_TEXT_SIZE * 0.45
    const paddingX = 3
    const paddingY = 2
    const estimatedWidth = estimateTextWidth(warningText, warningFontSize)
    const boxWidth = estimatedWidth + paddingX * 2
    const boxHeight = warningFontSize + paddingY * 2
    const boxX = 10
    const boxY = 10
    const rectEl = document.createElementNS(SVG_NS, "rect")
    rectEl.setAttribute("x", boxX.toString())
    rectEl.setAttribute("y", boxY.toString())
    rectEl.setAttribute("width", boxWidth.toString())
    rectEl.setAttribute("height", boxHeight.toString())
    rectEl.setAttribute("fill", "#fff2a8")
    rectEl.setAttribute("stroke", "#000000")
    rectEl.setAttribute("stroke-width", "0.4")
    rectEl.setAttribute("data-role", "doy-warning")
    warningLayer.appendChild(rectEl)

    const textEl = document.createElementNS(SVG_NS, "text")
    textEl.setAttribute("x", (boxX + paddingX).toString())
    textEl.setAttribute("y", (boxY + boxHeight - paddingY).toString())
    textEl.setAttribute("fill", "#000000")
    textEl.setAttribute("font-size", warningFontSize.toString())
    textEl.textContent = warningText
    textEl.setAttribute("data-role", "doy-warning")
    warningLayer.appendChild(textEl)

    const legendText = document.createElementNS(SVG_NS, "text")
    legendText.setAttribute("x", boxX.toString())
    legendText.setAttribute(
      "y",
      (boxY + boxHeight + warningFontSize + 4).toString()
    )
    legendText.setAttribute("fill", "#000000")
    legendText.setAttribute("font-size", warningFontSize.toString())
    legendText.textContent = warningText
    legendText.setAttribute("data-role", "doy-warning")
    warningLayer.appendChild(legendText)
  }
}
