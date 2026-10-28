import { updateDoyWarningsLayer, updateSubMeasuresLayer } from "../renderers/flowwrapSvg"
import {
  constrainDoyGeometry,
  DOY_CENTER_GAP_MM,
  GUSSET_DEPTH_MIN,
  GUSSET_DEPTH_TO_ARC_RATIO,
  clampDoyCenterWidth,
  clampDoyGussetDepth,
  clampDoyOvalWidth,
  resolveDoyBounds
} from "../core/geometry/resolvers/doyBounds"
import type { FlowwrapSpec } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"

type DragState =
  | {
      kind: "arc"
      startX: number
      startOffset: number
      side: "left" | "right"
    }
  | {
      kind: "rect"
      startX: number
      startOffset: number
    }
  | {
      kind: "rect-resize"
      startX: number
      startWidth: number
      side: "left" | "right"
    }
  | {
      kind: "oval"
      startX: number
      startOffset: number
    }
  | {
      kind: "oval-resize"
      startX: number
      startWidth: number
      side: "left" | "right"
    }
  | {
      kind: "gusset-depth"
      startX: number
      startDepth: number
      side: "left" | "right"
    }

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return { x: clientX, y: clientY }
  }
  const inverse = ctm.inverse()
  const transformed = point.matrixTransform(inverse)
  return { x: transformed.x, y: transformed.y }
}

function getCutterMeta(svg: SVGSVGElement) {
  const sealLayer = svg.querySelector("g#seal_areas")
  const safeLayer = svg.querySelector("g#safe_zones")
  return {
    originX: Number(sealLayer?.getAttribute("data-origin-x") ?? "0"),
    originY: Number(sealLayer?.getAttribute("data-origin-y") ?? "0"),
    liveOriginX: Number(safeLayer?.getAttribute("data-live-origin-x") ?? "0"),
    liveWidth: Number(sealLayer?.getAttribute("data-live-width") ?? "0"),
    cutterWidth: Number(sealLayer?.getAttribute("data-cutter-width") ?? "0"),
    cutterHeight: Number(sealLayer?.getAttribute("data-cutter-height") ?? "0")
  }
}

function computeDoyLayout(
  spec: FlowwrapSpec,
  originX: number,
  liveOriginX: number,
  liveWidth: number,
  cutterWidth: number
) {
  return resolveDoyBounds(spec, {
    originX,
    liveOriginX,
    liveWidth,
    cutterWidth
  })
}

function updateCenterLines(svg: SVGSVGElement, leftX: number, rightX: number) {
  const updateLine = (line: SVGLineElement) => {
    const side = line.getAttribute("data-center-side")
    const x = side === "right" ? rightX : leftX
    line.setAttribute("x1", x.toString())
    line.setAttribute("x2", x.toString())
  }
  const lines = svg.querySelectorAll<SVGLineElement>("[data-role=\"doy-center-line\"]")
  lines.forEach(updateLine)
  const hits = svg.querySelectorAll<SVGLineElement>("[data-role=\"doy-center-hit\"]")
  hits.forEach(updateLine)
}

function updateOvalPath(
  svg: SVGSVGElement,
  centerX: number,
  originY: number,
  cutterHeight: number,
  ovalWidth: number
) {
  const oval = svg.querySelector<SVGPathElement>("[data-role=\"doy-oval\"]")
  if (!oval) {
    return
  }
  const rx = ovalWidth / 2
  const ry = cutterHeight / 2
  const centerY = originY + cutterHeight / 2
  const topY = centerY - ry
  const bottomY = centerY + ry
  const d = [
    `M ${centerX} ${topY}`,
    `C ${centerX + rx} ${topY} ${centerX + rx} ${bottomY} ${centerX} ${bottomY}`,
    `C ${centerX - rx} ${bottomY} ${centerX - rx} ${topY} ${centerX} ${topY}`,
    "Z"
  ].join(" ")
  oval.setAttribute("d", d)
  const curveDeg = Math.round(
    (Math.atan2(Math.abs(rx), Math.max(1, ry)) * 180) / Math.PI
  )
  const curveLabel = `${curveDeg}°`
  const labels = svg.querySelectorAll<SVGTextElement>("[data-role=\"doy-oval-label\"]")
  labels.forEach(label => {
    const side = label.getAttribute("data-oval-side")
    const direction = side === "right" ? 1 : -1
    const x = centerX + rx * 0.6 * direction
    label.setAttribute("x", x.toString())
    label.setAttribute("y", centerY.toString())
    label.textContent = curveLabel
  })
}

function updateArcs(
  svg: SVGSVGElement,
  leftX: number,
  rightX: number,
  originY: number,
  cutterHeight: number,
  arcDepth: number
) {
  const updatePath = (arc: SVGPathElement) => {
    const side = arc.getAttribute("data-arc-side")
    const x = side === "right" ? rightX : leftX
    const direction = side === "right" ? -1 : 1
    const topY = originY
    const bottomY = originY + cutterHeight
    const c1Y = originY + cutterHeight * 0.25
    const c2Y = originY + cutterHeight * 0.75
    const controlX = x + arcDepth * direction
    const d = [`M ${x} ${topY}`, `C ${controlX} ${c1Y} ${controlX} ${c2Y} ${x} ${bottomY}`].join(" ")
    arc.setAttribute("d", d)
  }
  const arcs = svg.querySelectorAll<SVGPathElement>("[data-role=\"gusset-arc\"]")
  arcs.forEach(updatePath)
  const hits = svg.querySelectorAll<SVGPathElement>("[data-role=\"gusset-arc-hit\"]")
  hits.forEach(updatePath)

  const curveDeg = Math.round(
    (Math.atan2(Math.abs(arcDepth), cutterHeight / 2) * 180) / Math.PI
  )
  const curveLabel = `${curveDeg}°`
  const labels = svg.querySelectorAll<SVGTextElement>("[data-role=\"gusset-arc-label\"]")
  labels.forEach(label => {
    const side = label.getAttribute("data-arc-side")
    const x = side === "right" ? rightX : leftX
    const direction = side === "right" ? -1 : 1
    const midY = originY + cutterHeight * 0.5
    const midX = x + 0.4 * arcDepth * direction
    label.setAttribute("x", midX.toString())
    label.setAttribute("y", midY.toString())
    label.textContent = curveLabel
  })
}

function updateGussetDepthHandles(
  svg: SVGSVGElement,
  layout: ReturnType<typeof computeDoyLayout>,
  meta: ReturnType<typeof getCutterMeta>
) {
  const handles = svg.querySelectorAll<SVGCircleElement>(
    "[data-role=\"gusset-depth-handle\"]"
  )
  if (!handles.length || !layout) {
    return
  }
  handles.forEach(handle => {
    const side = handle.getAttribute("data-arc-side")
    const edge = handle.getAttribute("data-edge")
    const x = side === "right" ? layout.arcRightX : layout.arcLeftX
    const y =
      edge === "bottom" ? meta.originY + meta.cutterHeight : meta.originY
    const radius = Number(handle.getAttribute("r") ?? "0")
    const yAligned = edge === "top" ? y + radius : y - radius
    handle.setAttribute("cx", x.toString())
    handle.setAttribute("cy", yAligned.toString())
  })
}

const HANDLE_RADIUS_MM = 0.5
const HANDLE_STROKE = "#111111"
const HANDLE_STROKE_WIDTH = "0.2"
const HANDLE_MOVE_FILL = "#f59f3b"
const HANDLE_RESIZE_FILL = "#8b5cf6"
const ORANGE_MEASURE = "#f59f3b"
const ORANGE_MEASURE_WIDTH = "0.3"
const ORANGE_MEASURE_TEXT = 4

function ensureDistanceLayer(svg: SVGSVGElement) {
  let layer = svg.querySelector<SVGGElement>("g#doy_distance_overlay")
  if (!layer) {
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g")
    layer.setAttribute("id", "doy_distance_overlay")
    layer.setAttribute("pointer-events", "none")
    svg.appendChild(layer)
  }
  return layer
}

function clearDistanceLayer(svg: SVGSVGElement) {
  const layer = svg.querySelector<SVGGElement>("g#doy_distance_overlay")
  if (layer) {
    layer.innerHTML = ""
  }
}

function renderDistanceLine(
  layer: SVGGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string
) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
  line.setAttribute("x1", x1.toString())
  line.setAttribute("y1", y1.toString())
  line.setAttribute("x2", x2.toString())
  line.setAttribute("y2", y2.toString())
  line.setAttribute("stroke", ORANGE_MEASURE)
  line.setAttribute("stroke-width", ORANGE_MEASURE_WIDTH)
  layer.appendChild(line)

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
  text.setAttribute("x", ((x1 + x2) / 2).toString())
  text.setAttribute("y", (y1 - 2).toString())
  text.setAttribute("fill", ORANGE_MEASURE)
  text.setAttribute("font-size", ORANGE_MEASURE_TEXT.toString())
  text.setAttribute("text-anchor", "middle")
  text.setAttribute("dominant-baseline", "middle")
  text.textContent = label
  layer.appendChild(text)
}

function ensureHandleLayer(svg: SVGSVGElement) {
  let layer = svg.querySelector<SVGGElement>("g#doy_handle_overlay")
  if (!layer) {
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g")
    layer.setAttribute("id", "doy_handle_overlay")
    layer.setAttribute("pointer-events", "none")
    svg.appendChild(layer)
  }
  return layer
}

function clearDoyHandles(svg: SVGSVGElement) {
  const layer = svg.querySelector<SVGGElement>("g#doy_handle_overlay")
  if (!layer) {
    return
  }
  layer.innerHTML = ""
}

function renderDoyHandles(
  svg: SVGSVGElement,
  layout: ReturnType<typeof computeDoyLayout>,
  meta: ReturnType<typeof getCutterMeta>,
  state: { oval: boolean; gusset: boolean; center: boolean }
) {
  if (!layout) {
    clearDoyHandles(svg)
    return
  }
  const layer = ensureHandleLayer(svg)
  layer.innerHTML = ""

  const createHandle = (
    x: number,
    y: number,
    fill: string,
    role: string,
    handleType?: string,
    extra?: Record<string, string>
  ) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", x.toString())
    circle.setAttribute("cy", y.toString())
    circle.setAttribute("r", HANDLE_RADIUS_MM.toString())
    circle.setAttribute("fill", fill)
    circle.setAttribute("stroke", HANDLE_STROKE)
    circle.setAttribute("stroke-width", HANDLE_STROKE_WIDTH)
    circle.setAttribute("data-role", role)
    if (handleType) {
      circle.setAttribute("data-handle", handleType)
    }
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        circle.setAttribute(key, value)
      })
    }
    circle.setAttribute("pointer-events", "all")
    layer.appendChild(circle)
  }

  const centerY = meta.originY + meta.cutterHeight / 2
  if (state.oval) {
    const ovalHandleOffset = (layout.ovalWidth / 2) * 0.6
    createHandle(
      layout.ovalCenterX,
      centerY,
      HANDLE_MOVE_FILL,
      "doy-oval-handle",
      "move"
    )
    createHandle(
      layout.ovalCenterX - ovalHandleOffset,
      centerY,
      HANDLE_RESIZE_FILL,
      "doy-oval-handle",
      "resize-left"
    )
    createHandle(
      layout.ovalCenterX + ovalHandleOffset,
      centerY,
      HANDLE_RESIZE_FILL,
      "doy-oval-handle",
      "resize-right"
    )
  }
  if (state.gusset) {
    createHandle(
      layout.arcLeftX,
      centerY,
      HANDLE_MOVE_FILL,
      "doy-gusset-handle",
      "move",
      { "data-arc-side": "left" }
    )
    createHandle(
      layout.arcRightX,
      centerY,
      HANDLE_MOVE_FILL,
      "doy-gusset-handle",
      "move",
      { "data-arc-side": "right" }
    )
  }
  if (state.center) {
    createHandle(
      layout.centerLeft,
      centerY,
      HANDLE_MOVE_FILL,
      "doy-center-handle",
      "move",
      { "data-center-side": "left" }
    )
    createHandle(
      layout.centerRight,
      centerY,
      HANDLE_MOVE_FILL,
      "doy-center-handle",
      "move",
      { "data-center-side": "right" }
    )
  }
}

function setGussetPanelOpen(open: boolean) {
  const toggle=document.querySelector<HTMLButtonElement>('.gusset-dock button[aria-expanded]')
  if(open && toggle?.getAttribute('aria-expanded')==='false')toggle.click()
}

function isPointInsideOval(
  layout: ReturnType<typeof computeDoyLayout>,
  meta: ReturnType<typeof getCutterMeta>,
  point: { x: number; y: number }
) {
  if (!layout) {
    return false
  }
  const rx = layout.ovalWidth / 2
  const ry = meta.cutterHeight / 2
  if (rx <= 0 || ry <= 0) {
    return false
  }
  const centerY = meta.originY + meta.cutterHeight / 2
  const dx = (point.x - layout.ovalCenterX) / rx
  const dy = (point.y - centerY) / ry
  return dx * dx + dy * dy <= 1
}

export function attachDoyGeometryInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec
  let ovalSelected = spec.doyPouch?.ovalSelected ?? false
  let gussetSelected = spec.doyPouch?.gussetSelected ?? false
  let centerSelected = spec.doyPouch?.centerSelected ?? false
  const isLayerLocked = (layerId: string) =>
    Boolean(
      svg.querySelector<SVGGElement>(
        `[data-layer-id="${layerId}"][data-layer-locked="true"]`
      )
    )
  const snap = (value: number) => Math.round(value)
  const clampGussetDepth = (value: number) => clampDoyGussetDepth(value)
  const clampCenterWidth = (value: number) => {
    const meta = getCutterMeta(svg)
    return clampDoyCenterWidth(value, meta.liveWidth)
  }
  const clampOvalWidthToCutter = (width: number) => {
    const meta = getCutterMeta(svg)
    return clampDoyOvalWidth(width, meta.cutterWidth)
  }
  const syncOvalWidthFromDepth = (nextDoy: NonNullable<FlowwrapSpec["doyPouch"]>) => {
    if(nextDoy.gussetSync===false)return
    const clearWidth = GUSSET_DEPTH_TO_ARC_RATIO * (nextDoy.gussetDepth ?? GUSSET_DEPTH_MIN)
    nextDoy.panelWidths = { ...nextDoy.panelWidths, center: clearWidth + 2 * (nextDoy.bottomSeal ?? 7.5) }
    nextDoy.ovalWidth = clampOvalWidthToCutter(clearWidth)
  }
  const syncDepthFromOvalWidth = (nextDoy: NonNullable<FlowwrapSpec["doyPouch"]>) => {
    if(nextDoy.gussetSync===false)return
    const ovalWidth = Math.max(10, nextDoy.ovalWidth ?? 10)
    nextDoy.panelWidths = { ...nextDoy.panelWidths, center: ovalWidth + 2 * (nextDoy.bottomSeal ?? 7.5) }
    nextDoy.gussetDepth = clampGussetDepth(ovalWidth / GUSSET_DEPTH_TO_ARC_RATIO)
  }

  const updateHandles = (
    layout: ReturnType<typeof computeDoyLayout>,
    meta: ReturnType<typeof getCutterMeta>
  ) => {
    renderDoyHandles(svg, layout, meta, {
      oval: ovalSelected,
      gusset: gussetSelected,
      center: centerSelected
    })
  }

  const setGussetDomSelected = (selected: boolean) => {
    const arcs = svg.querySelectorAll<SVGPathElement>("[data-role=\"gusset-arc\"]")
    arcs.forEach(arc => {
      arc.setAttribute("data-selected", selected ? "true" : "false")
    })
  }

  const setCenterDomSelected = (selected: boolean) => {
    const lines = svg.querySelectorAll<SVGLineElement>("[data-role=\"doy-center-line\"]")
    lines.forEach(line => {
      line.setAttribute("data-selected", selected ? "true" : "false")
    })
  }

  const setOvalSelected = (next: boolean, commit: boolean) => {
    if (ovalSelected === next) {
      return
    }
    ovalSelected = next
    if (pendingSpec.doyPouch) {
      pendingSpec = {
        ...pendingSpec,
        doyPouch: { ...pendingSpec.doyPouch, ovalSelected: next }
      }
    }
    if (!next) {
      clearDoyHandles(svg)
      setGussetPanelOpen(false)
      if (commit) {
        onSpecChange(pendingSpec)
      }
      return
    }
    if (!pendingSpec.doyPouch) {
      return
    }
    const meta = getCutterMeta(svg)
    const layout = computeDoyLayout(
      pendingSpec,
      meta.originX,
      meta.liveOriginX,
      meta.liveWidth,
      meta.cutterWidth
    )
    if (!layout) {
      return
    }
    updateHandles(layout, meta)
    setGussetPanelOpen(true)
    if (commit) {
      onSpecChange(pendingSpec)
    }
  }

  const setGussetSelected = (next: boolean, commit: boolean) => {
    if (gussetSelected === next) {
      return
    }
    gussetSelected = next
    if (pendingSpec.doyPouch) {
      pendingSpec = {
        ...pendingSpec,
        doyPouch: { ...pendingSpec.doyPouch, gussetSelected: next }
      }
    }
    setGussetDomSelected(next)
    if (pendingSpec.doyPouch) {
      const meta = getCutterMeta(svg)
      const layout = computeDoyLayout(
        pendingSpec,
        meta.originX,
        meta.liveOriginX,
        meta.liveWidth,
        meta.cutterWidth
      )
      if (layout) {
        updateHandles(layout, meta)
      }
    }
    if (commit) {
      onSpecChange(pendingSpec)
    }
  }

  const setCenterSelected = (next: boolean, commit: boolean) => {
    if (centerSelected === next) {
      return
    }
    centerSelected = next
    if (pendingSpec.doyPouch) {
      pendingSpec = {
        ...pendingSpec,
        doyPouch: { ...pendingSpec.doyPouch, centerSelected: next }
      }
    }
    setCenterDomSelected(next)
    if (pendingSpec.doyPouch) {
      const meta = getCutterMeta(svg)
      const layout = computeDoyLayout(
        pendingSpec,
        meta.originX,
        meta.liveOriginX,
        meta.liveWidth,
        meta.cutterWidth
      )
      if (layout) {
        updateHandles(layout, meta)
      }
    }
    if (commit) {
      onSpecChange(pendingSpec)
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (svg.getAttribute("data-select-enabled") !== "true") {
      return
    }
    if (svg.getAttribute("data-pan-enabled") === "true") {
      return
    }
    if (svg.getAttribute("data-measure-enabled") === "true") {
      return
    }
    if (event.button !== 0) {
      return
    }
    const target = (event.target as Element)?.closest("[data-role]") as HTMLElement | null
    const handle = target?.closest?.("[data-role=\"doy-oval-handle\"]") as Element | null
    const gussetHandle = target?.closest?.("[data-role=\"doy-gusset-handle\"]") as Element | null
    const centerHandle = target?.closest?.("[data-role=\"doy-center-handle\"]") as Element | null
    const depthHandle = target?.closest?.("[data-role=\"gusset-depth-handle\"]") as Element | null
    const arc =
      (target?.closest?.("[data-role=\"gusset-arc\"]") as Element | null) ??
      (target?.closest?.("[data-role=\"gusset-arc-hit\"]") as Element | null)
    const rect =
      (target?.closest?.("[data-role=\"doy-center-line\"]") as Element | null) ??
      (target?.closest?.("[data-role=\"doy-center-hit\"]") as Element | null)
    if (handle && isLayerLocked("gusset-bottom")) {
      return
    }
    if ((gussetHandle || depthHandle || arc) && isLayerLocked("gusset-side")) {
      return
    }
    if ((centerHandle || rect) && isLayerLocked("gusset-fold-line")) {
      return
    }
    if (!pendingSpec.doyPouch) {
      return
    }
    const meta = getCutterMeta(svg)
    const layout = computeDoyLayout(
      pendingSpec,
      meta.originX,
      meta.liveOriginX,
      meta.liveWidth,
      meta.cutterWidth
    )
    const pointer = getSvgPoint(svg, event.clientX, event.clientY)
    const inOval = isPointInsideOval(layout, meta, pointer)
    const inArc = Boolean(arc)
    const inCenter = Boolean(rect)
    if (ovalSelected && !handle && !inOval) {
      setOvalSelected(false, true)
    }
    if (gussetSelected && !inArc && !gussetHandle && !depthHandle) {
      setGussetSelected(false, true)
    }
    if (centerSelected && !inCenter && !centerHandle) {
      setCenterSelected(false, true)
    }
    if (handle) {
      const handleType = handle.getAttribute("data-handle") ?? ""
      if (handleType === "move") {
        drag = {
          kind: "oval",
          startX: event.clientX,
          startOffset: pendingSpec.doyPouch.ovalOffsetX ?? 0
        }
      } else if (handleType === "resize-left" || handleType === "resize-right") {
        drag = {
          kind: "oval-resize",
          startX: event.clientX,
          startWidth: pendingSpec.doyPouch.ovalWidth ?? 0,
          side: handleType === "resize-right" ? "right" : "left"
        }
      }
      if (drag) {
        svg.setPointerCapture(event.pointerId)
        event.preventDefault()
      }
      return
    }
    if (gussetHandle) {
      const side = gussetHandle.getAttribute("data-arc-side") === "right" ? "right" : "left"
      drag = {
        kind: "arc",
        startX: event.clientX,
        startOffset: pendingSpec.doyPouch.arcOffsetX ?? 0,
        side
      }
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
      return
    }
    if (depthHandle) {
      const depthLayout = layout ?? computeDoyLayout(
        pendingSpec,
        meta.originX,
        meta.liveOriginX,
        meta.liveWidth,
        meta.cutterWidth
      )
      if (!depthLayout) {
        return
      }
      const startPoint = getSvgPoint(svg, event.clientX, event.clientY)
      const side =
        depthHandle.getAttribute("data-arc-side") === "right" ? "right" : "left"
      drag = {
        kind: "gusset-depth",
        startX: startPoint.x,
        startDepth: depthLayout.gussetDepth,
        side
      }
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
      return
    }
    if (centerHandle) {
      const side =
        centerHandle.getAttribute("data-center-side") === "right" ? "right" : "left"
      const defaultCenterWidth = DOY_CENTER_GAP_MM
      drag = {
        kind: "rect-resize",
        startX: event.clientX,
        startWidth: pendingSpec.doyPouch.panelWidths?.center ?? defaultCenterWidth,
        side
      }
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
      return
    }
    if (arc) {
      if (!gussetSelected) {
        return
      }
      drag = {
        kind: "arc",
        startX: event.clientX,
        startOffset: pendingSpec.doyPouch.arcOffsetX ?? 0,
        side: arc.getAttribute("data-arc-side") === "right" ? "right" : "left"
      }
    } else if (rect) {
      if (!centerSelected) {
        return
      }
      const side = pointer.x >= layout.rectCenterX ? "right" : "left"
      const defaultCenterWidth = DOY_CENTER_GAP_MM
      drag = {
        kind: "rect-resize",
        startX: event.clientX,
        startWidth: pendingSpec.doyPouch.panelWidths?.center ?? defaultCenterWidth,
        side
      }
    } else if (inOval) {
      return
    } else {
      return
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.doyPouch) {
      return
    }
    const meta = getCutterMeta(svg)
    const startPoint =
      drag.kind === "gusset-depth"
        ? { x: drag.startX, y: 0 }
        : getSvgPoint(svg, drag.startX, event.clientY)
    const currentPoint = getSvgPoint(svg, event.clientX, event.clientY)
    const dx = snap(currentPoint.x - startPoint.x)
    void snap(currentPoint.y - startPoint.y)
    const nextDoy = { ...pendingSpec.doyPouch }
    if (drag.kind === "arc") {
      const direction = drag.side === "right" ? -1 : 1
      nextDoy.arcOffsetX = drag.startOffset + dx * direction
    } else if (drag.kind === "rect") {
      nextDoy.centerOffsetX = drag.startOffset + dx
    } else if (drag.kind === "rect-resize") {
      const direction = drag.side === "right" ? 1 : -1
      const nextCenterWidth = clampCenterWidth(drag.startWidth + dx * 2 * direction)
      nextDoy.panelWidths = {
        ...nextDoy.panelWidths,
        center: nextCenterWidth
      }
    } else if (drag.kind === "gusset-depth") {
      const direction = drag.side === "right" ? -1 : 1
      const nextDepth = clampGussetDepth(drag.startDepth + dx * direction)
      nextDoy.gussetDepth = nextDepth
      syncOvalWidthFromDepth(nextDoy)
    } else if (drag.kind === "oval-resize") {
      const direction = drag.side === "right" ? 1 : -1
      const maxWidth = meta.cutterWidth
      const nextWidth = drag.startWidth + dx * 2 * direction
      nextDoy.ovalWidth = Math.max(10, Math.min(maxWidth, nextWidth))
      syncDepthFromOvalWidth(nextDoy)
    } else {
      nextDoy.ovalOffsetX = drag.startOffset + dx
    }
    pendingSpec = constrainDoyGeometry({ ...pendingSpec, doyPouch: nextDoy })
    const layout = computeDoyLayout(
      pendingSpec,
      meta.originX,
      meta.liveOriginX,
      meta.liveWidth,
      meta.cutterWidth
    )
    if (!layout) {
      return
    }
    updateCenterLines(svg, layout.centerLeft, layout.centerRight)
    updateOvalPath(
      svg,
      layout.ovalCenterX,
      meta.originY,
      meta.cutterHeight,
      layout.ovalWidth
    )
    updateArcs(
      svg,
      layout.arcLeftX,
      layout.arcRightX,
      meta.originY,
      meta.cutterHeight,
      layout.arcInsetDepth
    )
    updateHandles(layout, meta)
    updateGussetDepthHandles(svg, layout, meta)
    clearDistanceLayer(svg)
    if (drag.kind === "arc") {
      const layer = ensureDistanceLayer(svg)
      const direction = drag.side === "right" ? -1 : 1
      const arcX = drag.side === "right" ? layout.arcRightX : layout.arcLeftX
      const arcMidX = arcX + 0.75 * layout.arcInsetDepth * direction
      const centerY = meta.originY + meta.cutterHeight / 2
      const centerFoldX =
        drag.side === "right" ? layout.centerRight : layout.centerLeft
      const distance = Math.abs(centerFoldX - arcMidX)
      renderDistanceLine(
        layer,
        arcMidX,
        centerY,
        centerFoldX,
        centerY,
        formatMetricMeasurement(distance)
      )
    } else if (drag.kind === "oval" || drag.kind === "oval-resize") {
      const layer = ensureDistanceLayer(svg)
      const centerY = meta.originY + meta.cutterHeight / 2
      const rx = layout.ovalWidth / 2
      const arcFactor = 0.75
      const leftX = layout.ovalCenterX - rx * arcFactor
      const rightX = layout.ovalCenterX + rx * arcFactor
      const leftFoldX = layout.centerLeft
      const rightFoldX = layout.centerRight
      const leftDistance = Math.abs(leftFoldX - leftX)
      const rightDistance = Math.abs(rightX - rightFoldX)
      renderDistanceLine(
        layer,
        leftX,
        centerY,
        leftFoldX,
        centerY,
        formatMetricMeasurement(leftDistance)
      )
      renderDistanceLine(
        layer,
        rightFoldX,
        centerY,
        rightX,
        centerY,
        formatMetricMeasurement(rightDistance)
      )
    }
    updateSubMeasuresLayer(svg, pendingSpec)
    updateDoyWarningsLayer(svg, pendingSpec)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    svg.releasePointerCapture(event.pointerId)
    clearDistanceLayer(svg)
    if (pendingSpec.doyPouch) {
      pendingSpec = {
        ...pendingSpec,
        doyPouch: {
          ...pendingSpec.doyPouch,
          ovalSelected,
          gussetSelected,
          centerSelected
        }
      }
    }
    onSpecChange(pendingSpec)
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointerleave", onPointerUp)
  svg.addEventListener("dblclick", event => {
    if (svg.getAttribute("data-pan-enabled") === "true") {
      return
    }
    if (!pendingSpec.doyPouch) {
      return
    }
    const target = (event.target as Element)?.closest("[data-role]") as HTMLElement | null
    const arc =
      (target?.closest?.("[data-role=\"gusset-arc\"]") as Element | null) ??
      (target?.closest?.("[data-role=\"gusset-arc-hit\"]") as Element | null)
    if (arc) {
      if (isLayerLocked("gusset-side")) {
        return
      }
      setGussetSelected(true, true)
      return
    }
    const rect =
      (target?.closest?.("[data-role=\"doy-center-line\"]") as Element | null) ??
      (target?.closest?.("[data-role=\"doy-center-hit\"]") as Element | null)
    if (rect) {
      if (isLayerLocked("gusset-fold-line")) {
        return
      }
      setCenterSelected(true, true)
      return
    }
    const meta = getCutterMeta(svg)
    const layout = computeDoyLayout(
      pendingSpec,
      meta.originX,
      meta.liveOriginX,
      meta.liveWidth,
      meta.cutterWidth
    )
    const pointer = getSvgPoint(svg, event.clientX, event.clientY)
    if (isPointInsideOval(layout, meta, pointer)) {
      if (isLayerLocked("gusset-bottom")) {
        return
      }
      setOvalSelected(true, true)
    }
  })

  if ((ovalSelected || gussetSelected || centerSelected) && pendingSpec.doyPouch) {
    const meta = getCutterMeta(svg)
    const layout = computeDoyLayout(
      pendingSpec,
      meta.originX,
      meta.liveOriginX,
      meta.liveWidth,
      meta.cutterWidth
    )
    if (layout) {
      updateHandles(layout, meta)
      setGussetPanelOpen(true)
    }
  }
  if (gussetSelected) {
    setGussetDomSelected(true)
  }
  if (centerSelected) {
    setCenterDomSelected(true)
  }
}
