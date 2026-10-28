import {
  resolveKSealLayout,
  type ResolvedKSealLayout
} from "../core/geometry/resolvers/resolveKSealLayout"
import { renderAttributeBoxes } from "./svgAttributeBoxes"
import { applySubstrateAppearance } from "./substrateAppearance"
import { renderDoyPouchGuides } from "./flowwrapSvg"
import { renderEyeMarks } from "./svgEyeMarks"
import { renderHalfMoonCutouts } from "./svgHalfMoonCutouts"
import { renderHangerSlotWarnings, renderHangerSlots } from "./svgHangerSlots"
import { renderPerfs } from "./svgPerfs"
import { renderSafeZones } from "./svgSafeZones"
import { renderWindows } from "./svgWindows"
import { buildKSealEyeMarkRects } from "../geometry/kSealPouchGeometry"
import { clampKSealTacHole, isKSealTacHole } from "../rules/kSealTacHoleRules"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"
import { outlinePathData, resolveKSealGussetOutline } from "../geometry/kSealGussetOutline"
import {
  KSEAL_GUSSET_FILL_DEFAULTS,
  KSEAL_GUSSET_OUTLINE_DEFAULTS,
  KSEAL_SIDE_SEAL_DEFAULTS,
  LINE_STYLE_DASH
} from "./elementAppearance"

const SVG_NS = "http://www.w3.org/2000/svg"

type StrokeStyle = {
  stroke: string
  strokeWidth: number
  dash?: string
  fill?: string
  opacity?: number
}

const STYLES: Record<
  "substrate" | "cut" | "fold" | "seal" | "sealGuide" | "safe" | "measure",
  StrokeStyle
> = {
  substrate: {
    stroke: "#b9dfe8",
    strokeWidth: 0,
    fill: "#b9dfe8",
    opacity: 0.6
  },
  cut: { stroke: "#2eb774", strokeWidth: 0.75 },
  fold: { stroke: "#2eb774", strokeWidth: 0.3 },
  seal: {
    stroke: "#2E8B57",
    strokeWidth: 0,
    fill: "#2E8B57"
  },
  sealGuide: { stroke: "#2eb774", strokeWidth: 0.6 },
  safe: { stroke: "#fca1f4", strokeWidth: 0.6, dash: "3 3" },
  measure: { stroke: "#d23429", strokeWidth: 0.6 }
}
const SUB_DIMENSION_TEXT_SIZE = 4
const SUB_DIMENSION_MIN_TEXT_SIZE = 3
const SUB_DIMENSION_STROKE_WIDTH = 0.3
const SUB_DIMENSION_CAP = 2
const SUB_DIMENSION_OFFSET = 3
const SUB_DIMENSION_TEXT_OFFSET = 4
const SUB_DIMENSION_TEXT_GAP = 1.5

function estimateTextWidth(value: string, fontSize: number) {
  return value.length * fontSize * 0.6
}

export function fitKSealSubMeasureLabel(
  label: string,
  length: number,
  allowCompact = true
) {
  const availableWidth = Math.max(0, length - SUB_DIMENSION_TEXT_GAP * 2)
  const fits = (value: string, fontSize: number) =>
    estimateTextWidth(value, fontSize) <= availableWidth

  if (!label || length <= 0) {
    return {
      label,
      fontSize: SUB_DIMENSION_TEXT_SIZE,
      shouldConstrainTextLength: false
    }
  }

  if (fits(label, SUB_DIMENSION_TEXT_SIZE)) {
    return {
      label,
      fontSize: SUB_DIMENSION_TEXT_SIZE,
      shouldConstrainTextLength: false
    }
  }

  const reducedFontSize = Math.max(
    SUB_DIMENSION_MIN_TEXT_SIZE,
    Math.min(
      SUB_DIMENSION_TEXT_SIZE,
      availableWidth / Math.max(1, label.length * 0.6)
    )
  )
  if (fits(label, reducedFontSize)) {
    return {
      label,
      fontSize: reducedFontSize,
      shouldConstrainTextLength: false
    }
  }

  const compactLabel = label.endsWith("mm") ? label.slice(0, -2) : label
  if (allowCompact && compactLabel !== label) {
    if (fits(compactLabel, SUB_DIMENSION_TEXT_SIZE)) {
      return {
        label: compactLabel,
        fontSize: SUB_DIMENSION_TEXT_SIZE,
        shouldConstrainTextLength: false
      }
    }
    const compactFontSize = Math.max(
      SUB_DIMENSION_MIN_TEXT_SIZE,
      Math.min(
        SUB_DIMENSION_TEXT_SIZE,
        availableWidth / Math.max(1, compactLabel.length * 0.6)
      )
    )
    if (fits(compactLabel, compactFontSize)) {
      return {
        label: compactLabel,
        fontSize: compactFontSize,
        shouldConstrainTextLength: false
      }
    }
  }

  return {
    label: allowCompact ? compactLabel : label,
    fontSize: SUB_DIMENSION_MIN_TEXT_SIZE,
    shouldConstrainTextLength: true
  }
}

function dimensionLineWithCaps(
  layer: SVGGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  textOffsetY: number,
  row: string,
  seg: number
) {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2 + textOffsetY
  const strokeWidth = SUB_DIMENSION_STROKE_WIDTH
  const capSize = SUB_DIMENSION_CAP
  const length = Math.max(0, Math.abs(x2 - x1))
  const fittedLabel = fitKSealSubMeasureLabel(label, length, row === "bottom")
  const labelToRender = fittedLabel.label
  const fontSize = fittedLabel.fontSize
  if (label) {
    const textWidth = estimateTextWidth(labelToRender, fontSize)
    const leftEnd = Math.max(
      x1,
      Math.min(midX, midX - textWidth / 2 - SUB_DIMENSION_TEXT_GAP)
    )
    const rightStart = Math.min(
      x2,
      Math.max(midX, midX + textWidth / 2 + SUB_DIMENSION_TEXT_GAP)
    )
    const leftLine = document.createElementNS(SVG_NS, "line")
    leftLine.setAttribute("x1", x1.toString())
    leftLine.setAttribute("y1", y1.toString())
    leftLine.setAttribute("x2", leftEnd.toString())
    leftLine.setAttribute("y2", y2.toString())
    leftLine.setAttribute("stroke", STYLES.measure.stroke)
    leftLine.setAttribute("stroke-width", strokeWidth.toString())
    leftLine.setAttribute("data-role", "kseal-submeasure-line")
    leftLine.setAttribute("data-row", row)
    leftLine.setAttribute("data-seg", seg.toString())
    leftLine.setAttribute("data-part", "left")
    layer.appendChild(leftLine)

    const rightLine = document.createElementNS(SVG_NS, "line")
    rightLine.setAttribute("x1", rightStart.toString())
    rightLine.setAttribute("y1", y1.toString())
    rightLine.setAttribute("x2", x2.toString())
    rightLine.setAttribute("y2", y2.toString())
    rightLine.setAttribute("stroke", STYLES.measure.stroke)
    rightLine.setAttribute("stroke-width", strokeWidth.toString())
    rightLine.setAttribute("data-role", "kseal-submeasure-line")
    rightLine.setAttribute("data-row", row)
    rightLine.setAttribute("data-seg", seg.toString())
    rightLine.setAttribute("data-part", "right")
    layer.appendChild(rightLine)
  } else {
    const lineEl = document.createElementNS(SVG_NS, "line")
    lineEl.setAttribute("x1", x1.toString())
    lineEl.setAttribute("y1", y1.toString())
    lineEl.setAttribute("x2", x2.toString())
    lineEl.setAttribute("y2", y2.toString())
    lineEl.setAttribute("stroke", STYLES.measure.stroke)
    lineEl.setAttribute("stroke-width", strokeWidth.toString())
    lineEl.setAttribute("data-role", "kseal-submeasure-line")
    lineEl.setAttribute("data-row", row)
    lineEl.setAttribute("data-seg", seg.toString())
    lineEl.setAttribute("data-part", "full")
    layer.appendChild(lineEl)
  }

  const cap1 = document.createElementNS(SVG_NS, "line")
  cap1.setAttribute("x1", x1.toString())
  cap1.setAttribute("y1", (y1 - capSize).toString())
  cap1.setAttribute("x2", x1.toString())
  cap1.setAttribute("y2", (y1 + capSize).toString())
  cap1.setAttribute("stroke", STYLES.measure.stroke)
  cap1.setAttribute("stroke-width", strokeWidth.toString())
  cap1.setAttribute("data-role", "kseal-submeasure-cap")
  cap1.setAttribute("data-row", row)
  cap1.setAttribute("data-seg", seg.toString())
  cap1.setAttribute("data-cap-end", "start")
  layer.appendChild(cap1)

  const cap2 = document.createElementNS(SVG_NS, "line")
  cap2.setAttribute("x1", x2.toString())
  cap2.setAttribute("y1", (y2 - capSize).toString())
  cap2.setAttribute("x2", x2.toString())
  cap2.setAttribute("y2", (y2 + capSize).toString())
  cap2.setAttribute("stroke", STYLES.measure.stroke)
  cap2.setAttribute("stroke-width", strokeWidth.toString())
  cap2.setAttribute("data-role", "kseal-submeasure-cap")
  cap2.setAttribute("data-row", row)
  cap2.setAttribute("data-seg", seg.toString())
  cap2.setAttribute("data-cap-end", "end")
  layer.appendChild(cap2)

  const textEl = document.createElementNS(SVG_NS, "text")
  textEl.setAttribute("x", midX.toString())
  textEl.setAttribute("y", midY.toString())
  textEl.setAttribute("fill", STYLES.measure.stroke)
  textEl.setAttribute("font-size", fontSize.toString())
  textEl.setAttribute("text-anchor", "middle")
  textEl.setAttribute("dominant-baseline", "middle")
  textEl.setAttribute("data-role", "kseal-submeasure-text")
  textEl.setAttribute("data-row", row)
  textEl.setAttribute("data-seg", seg.toString())
  textEl.setAttribute("data-full-label", label)
  if (fittedLabel.shouldConstrainTextLength) {
    textEl.setAttribute(
      "textLength",
      Math.max(0.1, length - SUB_DIMENSION_TEXT_GAP * 2).toString()
    )
    textEl.setAttribute("lengthAdjust", "spacingAndGlyphs")
  }
  textEl.textContent = labelToRender
  layer.appendChild(textEl)
}

function verticalDimensionLineWithCaps(
  layer: SVGGElement,
  x: number,
  y1: number,
  y2: number,
  label: string,
  row: string,
  seg: number
) {
  const strokeWidth = SUB_DIMENSION_STROKE_WIDTH
  const capSize = SUB_DIMENSION_CAP
  const lineEl = line(x, y1, x, y2, "measure")
  lineEl.setAttribute("stroke-width", strokeWidth.toString())
  lineEl.setAttribute("data-role", "kseal-submeasure-line")
  lineEl.setAttribute("data-row", row)
  lineEl.setAttribute("data-seg", seg.toString())
  layer.appendChild(lineEl)
  ;[y1, y2].forEach((y, index) => {
    const cap = line(x - capSize, y, x + capSize, y, "measure")
    cap.setAttribute("stroke-width", strokeWidth.toString())
    cap.setAttribute("data-role", "kseal-submeasure-cap")
    cap.setAttribute("data-row", row)
    cap.setAttribute("data-seg", seg.toString())
    cap.setAttribute("data-cap-end", index === 0 ? "start" : "end")
    layer.appendChild(cap)
  })
  const labelEl = text(x + 4, (y1 + y2) / 2, label)
  labelEl.setAttribute("font-size", SUB_DIMENSION_TEXT_SIZE.toString())
  labelEl.setAttribute("text-anchor", "start")
  labelEl.setAttribute("data-role", "kseal-submeasure-text")
  labelEl.setAttribute("data-row", row)
  labelEl.setAttribute("data-seg", seg.toString())
  labelEl.setAttribute("data-full-label", label)
  layer.appendChild(labelEl)
}

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
  styleKey: keyof typeof STYLES
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
  styleKey: keyof typeof STYLES
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

function bandPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  styleKey: keyof typeof STYLES
) {
  const style = STYLES[styleKey]
  const p = document.createElementNS(SVG_NS, "path")
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  if (length <= 0 || width <= 0) {
    return p
  }

  const halfWidth = width / 2
  const offsetX = (-dy / length) * halfWidth
  const offsetY = (dx / length) * halfWidth
  const points = [
    [x1 + offsetX, y1 + offsetY],
    [x2 + offsetX, y2 + offsetY],
    [x2 - offsetX, y2 - offsetY],
    [x1 - offsetX, y1 - offsetY]
  ]
  const d = [
    `M ${points[0][0]} ${points[0][1]}`,
    `L ${points[1][0]} ${points[1][1]}`,
    `L ${points[2][0]} ${points[2][1]}`,
    `L ${points[3][0]} ${points[3][1]}`,
    "Z"
  ].join(" ")
  p.setAttribute(
    "d",
    d
  )
  p.setAttribute("fill", style.fill ?? style.stroke)
  p.setAttribute("stroke", "none")
  if (style.opacity !== undefined) {
    p.setAttribute("opacity", style.opacity.toString())
  }
  return p
}

function text(x: number, y: number, value: string) {
  const t = document.createElementNS(SVG_NS, "text")
  t.setAttribute("x", x.toString())
  t.setAttribute("y", y.toString())
  t.setAttribute("fill", STYLES.measure.stroke)
  t.setAttribute("font-size", "6")
  t.setAttribute("text-anchor", "middle")
  t.setAttribute("dominant-baseline", "middle")
  t.textContent = value
  return t
}

export function renderResolvedKSealPouch(
  spec: FlowwrapSpec,
  layout: ResolvedKSealLayout,
  options: RenderOptions = {}
): SVGSVGElement {
  const renderMode = options.renderMode ?? "edit"
  const {
    geometry,
    flowGeometry,
    margin,
    width,
    height,
    viewWidth,
    viewHeight,
    originX,
    originY,
    centerX,
    topShoulderY,
    bottomShoulderY,
    midY,
    leftFoldX,
    rightFoldX,
    sealWidth,
    seals,
    liveOriginX,
    liveOriginY,
    liveWidth,
    liveHeight,
    substrate,
    substrateFill,
    substrateOpacity,
    topMeasureSegments,
    featureMeasureSegments,
    heightMeasureSegments,
    softWarnings
  } = layout

  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`)
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.setAttribute("data-substrate", substrate)
  svg.style.background = "#fff"
  svg.setAttribute("data-pack", "k-seal-pouch")

  const substrateLayer = group("substrate")
  // AMENDS 6.1: side seals (Seals customise) and the gusset fill (Gusset ▸ Fill)
  // are siblings at the same layer level. The gusset fill is clipped to the band
  // between the side seals, so the two semi-transparent fills meet edge to edge
  // and blend instead of stacking into a darker overlap.
  const sealVisualLayer = document.createElementNS(SVG_NS, "g")
  sealVisualLayer.setAttribute("id", "kseal_seal_visual")
  sealVisualLayer.setAttribute("data-role", "kseal-seal-visual")
  const sealLayer = group("seal_areas")
  sealLayer.setAttribute("opacity", KSEAL_SIDE_SEAL_DEFAULTS.opacity.toString())
  const gussetSealVisualLayer = group("kseal_gusset_seal_visual")
  gussetSealVisualLayer.setAttribute("data-role", "kseal-gusset-seal-visual")
  gussetSealVisualLayer.setAttribute("opacity", KSEAL_GUSSET_FILL_DEFAULTS.opacity.toString())
  gussetSealVisualLayer.setAttribute("clip-path", "url(#kseal_gusset_live_clip)")
  const bottomSealLayer = group("kseal_bottom_seals")
  const kArmLayer = group("kseal_arms")
  const gussetGuideLayer = group("kseal_gusset_guides")
  const safeZoneLayer = group("safe_zones")
  const windowLayer = group("windows")
  const attributeBoxLayer = group("attribute_boxes")
  const hangerSlotLayer = group("hanger_slots")
  const foldLayer = group("fold_lines")
  const gussetFoldLineLayer = group("gusset_fold_line")
  const gussetSideLayer = group("gusset_side")
  const gussetBottomLayer = group("gusset_bottom")
  const gripSealLayer = group("grip_seal_layer")
  const zipperLayer = group("zipper_layer")
  const tearNotchLayer = group("tear_notches")
  const perfLayer = group("perf_layer")
  const cutLayer = group("cut_lines")
  const eyemarkLayer = group("eyemark_track")
  const measurementLayer = group("measurement_guides")
  const annotationLayer = group("annotations")
  const warningLayer = group("soft_warnings")

  svg.appendChild(substrateLayer)
  svg.appendChild(gussetFoldLineLayer)
  svg.appendChild(sealVisualLayer)
  sealVisualLayer.appendChild(sealLayer)
  sealVisualLayer.appendChild(gussetSealVisualLayer)
  gussetSealVisualLayer.appendChild(bottomSealLayer)
  gussetSealVisualLayer.appendChild(kArmLayer)
  svg.appendChild(gussetGuideLayer)
  svg.appendChild(safeZoneLayer)
  svg.appendChild(windowLayer)
  svg.appendChild(attributeBoxLayer)
  svg.appendChild(hangerSlotLayer)
  svg.appendChild(foldLayer)
  svg.appendChild(gussetSideLayer)
  svg.appendChild(gussetBottomLayer)
  svg.appendChild(gripSealLayer)
  svg.appendChild(zipperLayer)
  svg.appendChild(tearNotchLayer)
  svg.appendChild(perfLayer)
  svg.appendChild(cutLayer)
  svg.appendChild(eyemarkLayer)
  svg.appendChild(measurementLayer)
  svg.appendChild(annotationLayer)
  svg.appendChild(warningLayer)

  cutLayer.setAttribute("data-layer-id", "cutter-outline")
  substrateLayer.setAttribute("data-layer-id", "substrate")
  sealLayer.setAttribute("data-layer-id", "seal-areas")
  bottomSealLayer.setAttribute("data-layer-id", "kseal-bottom-seals")
  kArmLayer.setAttribute("data-layer-id", "kseal-arms")
  foldLayer.setAttribute("data-layer-id", "fold-lines")
  gussetFoldLineLayer.setAttribute("data-layer-id", "gusset-fold-line")
  gussetSideLayer.setAttribute("data-layer-id", "gusset-side")
  gussetBottomLayer.setAttribute("data-layer-id", "gusset-bottom")
  gripSealLayer.setAttribute("data-layer-id", "grip-seals")
  zipperLayer.setAttribute("data-layer-id", "zips")
  tearNotchLayer.setAttribute("data-layer-id", "tear-notches")
  perfLayer.setAttribute("data-layer-id", "perf-lines")
  safeZoneLayer.setAttribute("data-layer-id", "safe-zones")
  windowLayer.setAttribute("data-layer-id", "windows")
  attributeBoxLayer.setAttribute("data-layer-id", "notes")
  hangerSlotLayer.setAttribute("data-layer-id", "hanger-slots")
  eyemarkLayer.setAttribute("data-layer-id", "eyemarks")
  measurementLayer.setAttribute("data-layer-id", "measurement-guides")
  annotationLayer.setAttribute("data-layer-id", "annotations")

  safeZoneLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  safeZoneLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  const leftFitArm = geometry.armLines.find(line => line.side === "top-left" && line.position === "outer")!
  const rightFitArm = geometry.armLines.find(line => line.side === "top-right" && line.position === "outer")!
  const bottomFitArm = geometry.armLines.find(line => line.side === "bottom-left" && line.position === "outer")!
  safeZoneLayer.setAttribute("data-kseal-left-run", String(leftFitArm.endX - leftFitArm.startX))
  safeZoneLayer.setAttribute("data-kseal-right-run", String(rightFitArm.startX - rightFitArm.endX))
  safeZoneLayer.setAttribute("data-kseal-top-arm-y", String(originY + leftFitArm.endY))
  safeZoneLayer.setAttribute("data-kseal-bottom-arm-y", String(originY + bottomFitArm.endY))
  safeZoneLayer.setAttribute("data-handle-size", "12")
  windowLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  windowLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  windowLayer.setAttribute("data-live-width", liveWidth.toString())
  windowLayer.setAttribute("data-live-height", liveHeight.toString())
  attributeBoxLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  attributeBoxLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  hangerSlotLayer.setAttribute("data-live-origin-x", liveOriginX.toString())
  hangerSlotLayer.setAttribute("data-live-origin-y", liveOriginY.toString())
  hangerSlotLayer.setAttribute("data-live-width", liveWidth.toString())
  sealLayer.setAttribute("data-origin-x", originX.toString())
  sealLayer.setAttribute("data-origin-y", originY.toString())
  sealLayer.setAttribute("data-live-width", liveWidth.toString())
  sealLayer.setAttribute("data-live-height", liveHeight.toString())
  sealLayer.setAttribute("data-cutter-width", width.toString())
  sealLayer.setAttribute("data-cutter-height", height.toString())

  eyemarkLayer.setAttribute("data-cutter-origin-x", originX.toString())
  eyemarkLayer.setAttribute("data-cutter-origin-y", originY.toString())
  eyemarkLayer.setAttribute("data-cutter-width", width.toString())
  eyemarkLayer.setAttribute("data-cutter-height", height.toString())
  eyemarkLayer.setAttribute("data-seal-top", seals.top.toString())
  eyemarkLayer.setAttribute("data-seal-bottom", seals.bottom.toString())
  eyemarkLayer.setAttribute("data-seal-left", seals.left.toString())
  eyemarkLayer.setAttribute("data-seal-right", seals.right.toString())
  eyemarkLayer.setAttribute("data-pack-id", "k-seal-pouch")
  eyemarkLayer.setAttribute("data-kseal-trim-width", geometry.trimWidth.toString())

  const defs = document.createElementNS(SVG_NS, "defs")
  const clipPath = document.createElementNS(SVG_NS, "clipPath")
  clipPath.setAttribute("id", "cut_clip")
  const clipRect = document.createElementNS(SVG_NS, "rect")
  clipRect.setAttribute("x", originX.toString())
  clipRect.setAttribute("y", originY.toString())
  clipRect.setAttribute("width", width.toString())
  clipRect.setAttribute("height", height.toString())
  clipPath.appendChild(clipRect)
  defs.appendChild(clipPath)
  // Gusset fill lives only between the top and bottom side seals.
  const gussetLiveClip = document.createElementNS(SVG_NS, "clipPath")
  gussetLiveClip.setAttribute("id", "kseal_gusset_live_clip")
  const gussetLiveRect = document.createElementNS(SVG_NS, "rect")
  gussetLiveRect.setAttribute("x", originX.toString())
  gussetLiveRect.setAttribute("y", (originY + geometry.sideSeal).toString())
  gussetLiveRect.setAttribute("width", width.toString())
  gussetLiveRect.setAttribute("height", Math.max(0, height - geometry.sideSeal * 2).toString())
  gussetLiveRect.setAttribute("data-role", "kseal-gusset-live-band")
  gussetLiveClip.appendChild(gussetLiveRect)
  defs.appendChild(gussetLiveClip)
  svg.appendChild(defs)

  ;[
    sealLayer,
    bottomSealLayer,
    gussetGuideLayer,
    kArmLayer,
    safeZoneLayer,
    windowLayer,
    attributeBoxLayer,
    hangerSlotLayer,
    foldLayer,
    gussetFoldLineLayer,
    gussetSideLayer,
    gussetBottomLayer,
    gripSealLayer,
    zipperLayer,
    tearNotchLayer,
    perfLayer,
    cutLayer,
    eyemarkLayer
  ].forEach(layer => {
    layer.setAttribute("clip-path", "url(#cut_clip)")
  })

  const substrateRect = rect(originX, originY, width, height, "substrate")
  substrateRect.setAttribute("fill", substrateFill)
  substrateRect.setAttribute("opacity", substrateOpacity.toString())
  substrateLayer.appendChild(substrateRect)
  const cutterOutlineInset = STYLES.cut.strokeWidth / 2
  const cutterOutline = rect(
    originX + cutterOutlineInset,
    originY + cutterOutlineInset,
    Math.max(0, width - STYLES.cut.strokeWidth),
    Math.max(0, height - STYLES.cut.strokeWidth),
    "cut"
  )
  cutterOutline.setAttribute("data-role", "kseal-cutter-outline")
  cutterOutline.setAttribute("pointer-events", "none")
  cutLayer.appendChild(cutterOutline)

  const appendSealZone = (
    targetLayer: SVGGElement,
    x: number,
    y: number,
    zoneWidth: number,
    zoneHeight: number,
    role: string,
    side?: string,
    fill?: string
  ) => {
    if (zoneWidth <= 0 || zoneHeight <= 0) {
      return
    }
    const zone = rect(x, y, zoneWidth, zoneHeight, "seal")
    zone.setAttribute("data-role", role)
    if (fill) {
      zone.setAttribute("fill", fill)
    }
    if (side) {
      zone.setAttribute("data-seal-side", side)
    }
    targetLayer.appendChild(zone)
  }

  if (geometry.trimEnabled && geometry.trimWidth > 0) {
    const leftTrim = rect(
      originX + geometry.leftTrimX,
      originY,
      geometry.leftTrimWidth,
      height,
      "substrate"
    )
    leftTrim.setAttribute("fill", substrateFill)
    leftTrim.setAttribute("opacity", substrateOpacity.toString())
    leftTrim.setAttribute("data-role", "kseal-trim")
    leftTrim.setAttribute("data-side", "left")
    substrateLayer.appendChild(leftTrim)

    const rightTrim = rect(
      originX + geometry.rightTrimX,
      originY,
      geometry.rightTrimWidth,
      height,
      "substrate"
    )
    rightTrim.setAttribute("fill", substrateFill)
    rightTrim.setAttribute("opacity", substrateOpacity.toString())
    rightTrim.setAttribute("data-role", "kseal-trim")
    rightTrim.setAttribute("data-side", "right")
    substrateLayer.appendChild(rightTrim)
  }

  const sideSealX = originX + geometry.trimWidth
  const sideSealWidth = Math.max(0, width - geometry.trimWidth * 2)
  appendSealZone(
    sealLayer,
    sideSealX,
    originY,
    sideSealWidth,
    geometry.sideSeal,
    "kseal-side-seal",
    "top",
    KSEAL_SIDE_SEAL_DEFAULTS.color
  )
  appendSealZone(
    sealLayer,
    sideSealX,
    originY + height - geometry.sideSeal,
    sideSealWidth,
    geometry.sideSeal,
    "kseal-side-seal",
    "bottom",
    KSEAL_SIDE_SEAL_DEFAULTS.color
  )
  appendSealZone(
    bottomSealLayer,
    originX + geometry.leftBottomSealX,
    originY,
    geometry.bottomSealAreaWidth,
    height,
    "kseal-bottom-seal",
    "left"
  )
  appendSealZone(
    bottomSealLayer,
    originX + geometry.rightBottomSealX,
    originY,
    geometry.bottomSealAreaWidth,
    height,
    "kseal-bottom-seal",
    "right"
  )

  if (geometry.trimEnabled && geometry.trimWidth > 0) {
    ;[geometry.trimWidth, width - geometry.trimWidth].forEach((trimX, index) => {
      const trimLine = line(
        originX + trimX,
        originY,
        originX + trimX,
        originY + height,
        "cut"
      )
      trimLine.setAttribute("data-role", "kseal-trim-boundary")
      trimLine.setAttribute("data-side", index === 0 ? "left" : "right")
      trimLine.setAttribute("pointer-events", "none")
      foldLayer.appendChild(trimLine)
    })
  }

  const appendSealGuide = (
    targetLayer: SVGGElement,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    role: string,
    side?: string,
    strokeWidth = STYLES.sealGuide.strokeWidth,
    stroke = STYLES.sealGuide.stroke
  ) => {
    const guide = line(x1, y1, x2, y2, "sealGuide")
    guide.setAttribute("data-role", role)
    guide.setAttribute("stroke", stroke)
    guide.setAttribute("stroke-width", strokeWidth.toString())
    guide.setAttribute("pointer-events", "none")
    guide.setAttribute("stroke-linecap", "butt")
    if (side) {
      guide.setAttribute("data-seal-side", side)
    }
    targetLayer.appendChild(guide)
  }

  const topSideSealGuideY = originY + geometry.sideSeal
  const bottomSideSealGuideY = originY + height - geometry.sideSeal
  const leftBottomSealGuideX =
    originX + geometry.leftBottomSealX + geometry.bottomSealAreaWidth / 2
  const rightBottomSealGuideX =
    originX + geometry.rightBottomSealX + geometry.bottomSealAreaWidth / 2
  // Gusset ▸ Outline defaults (Customise overrides are applied afterwards by applyElementAppearance).
  const applyGussetOutlineStyle = (node: SVGElement) => {
    node.setAttribute("stroke", KSEAL_GUSSET_OUTLINE_DEFAULTS.color)
    node.setAttribute("stroke-width", KSEAL_GUSSET_OUTLINE_DEFAULTS.thickness.toString())
    node.setAttribute("opacity", KSEAL_GUSSET_OUTLINE_DEFAULTS.opacity.toString())
    node.setAttribute("stroke-dasharray", LINE_STYLE_DASH[KSEAL_GUSSET_OUTLINE_DEFAULTS.lineStyle])
    node.setAttribute("fill", "none")
  }
  appendSealGuide(
    sealLayer,
    sideSealX,
    topSideSealGuideY,
    sideSealX + sideSealWidth,
    topSideSealGuideY,
    "kseal-side-seal-guide",
    "top",
    STYLES.cut.strokeWidth,
    STYLES.cut.stroke
  )
  appendSealGuide(
    sealLayer,
    sideSealX,
    bottomSideSealGuideY,
    sideSealX + sideSealWidth,
    bottomSideSealGuideY,
    "kseal-side-seal-guide",
    "bottom",
    STYLES.cut.strokeWidth,
    STYLES.cut.stroke
  )
  // Gusset outline: the traced boundary of the gusset fill, then the two fold
  // guides — all limited to the band between the side seals.
  gussetGuideLayer.setAttribute("data-role", "kseal-gusset-outline-layer")
  // Inner group clipped to the live band: even the square ends of diagonal
  // dashes cannot paint into a side seal.
  const gussetOutlineGroup = document.createElementNS(SVG_NS, "g")
  gussetOutlineGroup.setAttribute("data-role", "kseal-gusset-outline-group")
  gussetOutlineGroup.setAttribute("clip-path", "url(#kseal_gusset_live_clip)")
  gussetGuideLayer.appendChild(gussetOutlineGroup)
  resolveKSealGussetOutline(geometry).paths.forEach((outlinePath, index) => {
    const path = document.createElementNS(SVG_NS, "path")
    path.setAttribute("d", outlinePathData(outlinePath, originX, originY))
    path.setAttribute("data-role", "kseal-gusset-outline")
    path.setAttribute("data-outline-index", index.toString())
    path.setAttribute("data-gusset-side", outlinePath.side)
    path.setAttribute("data-gusset-edge", outlinePath.edge)
    path.setAttribute("pointer-events", "none")
    path.setAttribute("stroke-linejoin", "round")
    applyGussetOutlineStyle(path)
    gussetOutlineGroup.appendChild(path)
  })
  ;[
    { x: leftBottomSealGuideX, side: "left" },
    { x: rightBottomSealGuideX, side: "right" }
  ].forEach(guideLine => {
    appendSealGuide(
      gussetOutlineGroup,
      guideLine.x,
      topSideSealGuideY,
      guideLine.x,
      bottomSideSealGuideY,
      "kseal-bottom-seal-guide",
      guideLine.side
    )
    applyGussetOutlineStyle(gussetOutlineGroup.lastElementChild as SVGElement)
  })

  foldLayer.setAttribute("data-center-x", centerX.toString())
  foldLayer.setAttribute("data-origin-x", originX.toString())
  foldLayer.setAttribute("data-origin-y", originY.toString())
  foldLayer.setAttribute("data-width", width.toString())
  foldLayer.setAttribute("data-height", height.toString())
  foldLayer.setAttribute("data-seal-width", sealWidth.toString())
  gussetFoldLineLayer.setAttribute("data-center-x", centerX.toString())
  gussetFoldLineLayer.setAttribute("data-origin-x", originX.toString())
  gussetFoldLineLayer.setAttribute("data-origin-y", originY.toString())
  gussetFoldLineLayer.setAttribute("data-width", width.toString())
  gussetFoldLineLayer.setAttribute("data-height", height.toString())
  gussetFoldLineLayer.setAttribute("data-seal-width", sealWidth.toString())

  // The centre fold is part of the Gusset outline. It stays in the gusset fold
  // layer (behind the seal fills, where its drag interaction lives) but no
  // longer runs through the side seals.
  const centerLine = line(
    centerX,
    topSideSealGuideY,
    centerX,
    bottomSideSealGuideY,
    "fold"
  )
  centerLine.setAttribute("data-role", "kseal-center-line")
  applyGussetOutlineStyle(centerLine)
  gussetFoldLineLayer.appendChild(centerLine)

  const armSides = ["top-left", "top-right", "bottom-left", "bottom-right"] as const
  armSides.forEach(side => {
    const inner = geometry.armLines.find(
      arm => arm.side === side && arm.position === "inner"
    )
    const outer = geometry.armLines.find(
      arm => arm.side === side && arm.position === "outer"
    )
    if (!inner || !outer) {
      return
    }
    const junctionFill = document.createElementNS(SVG_NS, "path")
    junctionFill.setAttribute(
      "d",
      [
        `M ${originX + outer.startX} ${originY + outer.startY}`,
        `L ${originX + inner.startX} ${originY + inner.startY}`,
        `L ${originX + inner.endX} ${originY + inner.endY}`,
        "Z"
      ].join(" ")
    )
    junctionFill.setAttribute("fill", STYLES.seal.fill ?? STYLES.seal.stroke)
    junctionFill.setAttribute("stroke", "none")
    junctionFill.setAttribute("data-role", "kseal-arm-junction-fill")
    junctionFill.setAttribute("data-arm-side", side)
    kArmLayer.appendChild(junctionFill)
  })

  geometry.armLines.forEach(armPoint => {
    const arm = bandPath(
      originX + armPoint.startX,
      originY + armPoint.startY,
      originX + armPoint.endX,
      originY + armPoint.endY,
      geometry.armWidth,
      "seal"
    )
    arm.setAttribute("data-role", "kseal-arm")
    arm.setAttribute("data-arm", `${armPoint.position}-${armPoint.side}`)
    arm.setAttribute("data-arm-position", armPoint.position)
    arm.setAttribute("data-arm-side", armPoint.side)
    arm.setAttribute("data-arm-width", geometry.armWidth.toString())
    kArmLayer.appendChild(arm)
    // AMENDS 6.1: the dark inner-arm guide lines are replaced by the Gusset outline.
  })

  const kSealFeatureSpec =
    spec.doyPouch
      ? {
          ...spec,
          doyPouch: {
            ...spec.doyPouch,
            showCenterBox: false,
            showGusset: false,
            showOval: false
          }
        }
      : spec
  renderDoyPouchGuides(
    {
      foldLine: gussetFoldLineLayer,
      sideGusset: gussetSideLayer,
      bottomGusset: gussetBottomLayer,
      gripSeal: gripSealLayer,
      zipper: zipperLayer,
      tearNotch: tearNotchLayer
    },
    warningLayer,
    kSealFeatureSpec,
    originX,
    originY,
    liveOriginX,
    liveWidth,
    width,
    height
  )

  softWarnings.forEach((warningText, warningIndex) => {
    const warningFontSize = 6
    const paddingX = 3
    const paddingY = 2
    const boxWidth = warningText.length * warningFontSize * 0.5 + paddingX * 2
    const boxHeight = warningFontSize + paddingY * 2
    const boxX = originX - 60
    const boxY = originY - 55 + warningIndex * (boxHeight + 3)
    const rectEl = document.createElementNS(SVG_NS, "rect")
    rectEl.setAttribute("x", boxX.toString())
    rectEl.setAttribute("y", boxY.toString())
    rectEl.setAttribute("width", boxWidth.toString())
    rectEl.setAttribute("height", boxHeight.toString())
    rectEl.setAttribute("fill", "#fff2a8")
    rectEl.setAttribute("stroke", "#000000")
    rectEl.setAttribute("stroke-width", "0.4")
    warningLayer.appendChild(rectEl)

    const textEl = document.createElementNS(SVG_NS, "text")
    textEl.setAttribute("x", (boxX + paddingX).toString())
    textEl.setAttribute("y", (boxY + boxHeight / 2).toString())
    textEl.setAttribute("fill", "#000000")
    textEl.setAttribute("font-size", warningFontSize.toString())
    textEl.setAttribute("text-anchor", "start")
    textEl.setAttribute("dominant-baseline", "middle")
    textEl.textContent = warningText
    warningLayer.appendChild(textEl)
  })

  const cornerHandles = [
    { x: leftFoldX, y: topShoulderY, corner: "top-left" },
    { x: rightFoldX, y: topShoulderY, corner: "top-right" },
    { x: leftFoldX, y: bottomShoulderY, corner: "bottom-left" },
    { x: rightFoldX, y: bottomShoulderY, corner: "bottom-right" }
  ]
  cornerHandles.forEach(point => {
    const h = document.createElementNS(SVG_NS, "circle")
    h.setAttribute("cx", point.x.toString())
    h.setAttribute("cy", point.y.toString())
    h.setAttribute("r", "0.8")
    h.setAttribute("fill", "#8b5cf6")
    h.setAttribute("stroke", "#111111")
    h.setAttribute("stroke-width", "0.2")
    h.setAttribute("cursor", "move")
    h.setAttribute("data-role", "kseal-corner-handle")
    h.setAttribute("data-handle-type", "corner")
    h.setAttribute("opacity", "0")
    h.setAttribute("pointer-events", "none")
    h.setAttribute("data-corner", point.corner)
    kArmLayer.appendChild(h)

    const hit = document.createElementNS(SVG_NS, "circle")
    hit.setAttribute("cx", point.x.toString())
    hit.setAttribute("cy", point.y.toString())
    hit.setAttribute("r", "4")
    hit.setAttribute("fill", "transparent")
    hit.setAttribute("pointer-events", "all")
    hit.setAttribute("cursor", "move")
    hit.setAttribute("data-role", "kseal-corner-hit")
    hit.setAttribute("data-handle-type", "corner")
    hit.setAttribute("opacity", "0")
    hit.setAttribute("pointer-events", "none")
    hit.setAttribute("data-corner", point.corner)
    kArmLayer.appendChild(hit)
  })

  const sideHandles = [
    { x: leftFoldX, y: midY, side: "left" },
    { x: rightFoldX, y: midY, side: "right" }
  ]
  sideHandles.forEach(point => {
    const h = document.createElementNS(SVG_NS, "circle")
    h.setAttribute("cx", point.x.toString())
    h.setAttribute("cy", point.y.toString())
    h.setAttribute("r", "0.7")
    h.setAttribute("fill", "#f59f3b")
    h.setAttribute("stroke", "#111111")
    h.setAttribute("stroke-width", "0.2")
    h.setAttribute("cursor", "ew-resize")
    h.setAttribute("data-role", "kseal-side-handle")
    h.setAttribute("data-handle-type", "side")
    h.setAttribute("opacity", "0")
    h.setAttribute("pointer-events", "none")
    h.setAttribute("data-side", point.side)
    gussetFoldLineLayer.appendChild(h)

    const hit = document.createElementNS(SVG_NS, "circle")
    hit.setAttribute("cx", point.x.toString())
    hit.setAttribute("cy", point.y.toString())
    hit.setAttribute("r", "4")
    hit.setAttribute("fill", "transparent")
    hit.setAttribute("pointer-events", "all")
    hit.setAttribute("cursor", "ew-resize")
    hit.setAttribute("data-role", "kseal-side-hit")
    hit.setAttribute("data-handle-type", "side")
    hit.setAttribute("opacity", "0")
    hit.setAttribute("pointer-events", "none")
    hit.setAttribute("data-side", point.side)
    gussetFoldLineLayer.appendChild(hit)
  })

  const handleThickness = 10
  const topHandle = document.createElementNS(SVG_NS, "rect")
  topHandle.setAttribute("x", originX.toString())
  topHandle.setAttribute("y", (liveOriginY - handleThickness / 2).toString())
  topHandle.setAttribute("width", width.toString())
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
  bottomHandle.setAttribute("width", width.toString())
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
  leftHandle.setAttribute("height", height.toString())
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
  rightHandle.setAttribute("height", height.toString())
  rightHandle.setAttribute("fill", "transparent")
  rightHandle.setAttribute("data-seal-side", "right")
  rightHandle.setAttribute("data-role", "seal-handle")
  rightHandle.setAttribute("cursor", "ew-resize")
  sealLayer.appendChild(rightHandle)

  if (spec.halfMoonCutouts && spec.halfMoonCutouts.length > 0) {
    renderHalfMoonCutouts(cutLayer, spec, spec.halfMoonCutouts, originX, originY)
  }

  const safeZones =
    spec.safeZones && spec.safeZones.length > 0 ? spec.safeZones : []
  if (safeZones.length > 0) {
    renderSafeZones(safeZoneLayer, safeZones, liveOriginX, liveOriginY)
  }

  const windows = spec.windows && spec.windows.length > 0 ? spec.windows : []
  if (windows.length > 0) {
    renderWindows(windowLayer, windows, liveOriginX, liveOriginY)
  }

  const attributeBoxes =
    spec.attributeBoxes && spec.attributeBoxes.length > 0 ? spec.attributeBoxes : []
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

  const hangerSlots =
    spec.hangerSlots && spec.hangerSlots.length > 0
      ? spec.hangerSlots.map(slot =>
          isKSealTacHole(slot) ? clampKSealTacHole(spec, slot) : slot
        )
      : []
  if (hangerSlots.length > 0) {
    renderHangerSlots(hangerSlotLayer, hangerSlots, liveOriginX, liveOriginY, liveWidth, {
      tacFill: substrateFill,
      tacFillOpacity: Math.min(1, substrateOpacity + 0.22),
      tacStroke: "#65747a",
      cutterOriginX:originX,
      cutterWidth:width
    })
    renderHangerSlotWarnings(
      warningLayer,
      hangerSlots.filter(slot => slot.purpose !== "tac-hole"),
      liveOriginX,
      liveOriginY,
      originX
    )
  }

  if (spec.perfs) {
    renderPerfs(
      perfLayer,
      spec.perfs,
      liveOriginX,
      liveOriginY,
      liveWidth,
      liveHeight,
      originX,
      originY,
      width,
      height
    )
  }

  const mainMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-main-measures") !== "false"
  const measureOffset = 12
  if (mainMeasuresEnabled) {
    const measureLine = line(
      originX,
      originY - measureOffset,
      originX + width,
      originY - measureOffset,
      "measure"
    )
    measureLine.setAttribute("stroke-width", "0.4")
    measurementLayer.appendChild(measureLine)
    const measureCapLeft = line(
      originX,
      originY - measureOffset - 4,
      originX,
      originY - measureOffset + 4,
      "measure"
    )
    measureCapLeft.setAttribute("stroke-width", "0.4")
    measurementLayer.appendChild(measureCapLeft)
    const measureCapRight = line(
      originX + width,
      originY - measureOffset - 4,
      originX + width,
      originY - measureOffset + 4,
      "measure"
    )
    measureCapRight.setAttribute("stroke-width", "0.4")
    measurementLayer.appendChild(measureCapRight)
    const measureText = text(
      originX + width / 2,
      originY - measureOffset - 6,
      formatMetricMeasurement(width)
    )
    measureText.setAttribute("font-size", "4")
    measurementLayer.appendChild(measureText)

  }

  const subMeasuresEnabled =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-sub-measures") === "true"
  if (subMeasuresEnabled) {
    topMeasureSegments.forEach(segment => {
      dimensionLineWithCaps(
        measurementLayer,
        segment.startX,
        segment.y,
        segment.endX,
        segment.y,
        segment.label,
        -SUB_DIMENSION_TEXT_OFFSET,
        segment.row,
        segment.index
      )
    })

    featureMeasureSegments.forEach(segment => {
      dimensionLineWithCaps(
        measurementLayer,
        segment.startX,
        segment.y,
        segment.endX,
        segment.y,
        segment.label,
        SUB_DIMENSION_TEXT_OFFSET,
        segment.row,
        segment.index
      )
    })

    heightMeasureSegments.forEach(segment => {
      verticalDimensionLineWithCaps(
        measurementLayer,
        segment.x,
        segment.startY,
        segment.endY,
        segment.label,
        segment.row,
        segment.index
      )
    })

  }

  if (spec.eyeMarks) {
    const kSealEyeMarkRects = buildKSealEyeMarkRects(
      spec,
      geometry,
      originX,
      originY
    )
    renderEyeMarks(
      eyemarkLayer,
      spec.eyeMarks,
      originX,
      originY,
      width,
      height,
      seals,
      null,
      kSealEyeMarkRects
    )
  }

  svg.setAttribute(
    "data-cutter-center-x",
    (originX + width / 2).toString()
  )
  svg.setAttribute("data-dim-top-y", (originY - measureOffset).toString())

  applySubstrateAppearance(svg,spec)
  return svg
}

export function renderKSealPouch(spec: FlowwrapSpec, options: RenderOptions = {}): SVGSVGElement {
  const layout = resolveKSealLayout(spec)
  return renderResolvedKSealPouch(spec, layout, options)
}
