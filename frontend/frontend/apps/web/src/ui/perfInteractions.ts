import { renderPerfs } from "../renderers/svgPerfs"
import { buildPerfCenters } from "../geometry/perfs"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { PerfSpec } from "../types/perfs"
import { renderPerfMeasurements } from "../renderers/perfMeasurements"
import { annotationObstacles } from "../geometry/annotationPlacement"
import { snapMoveWithin } from "./movementSnap"

const SVG_NS = "http://www.w3.org/2000/svg"

type DragState = {
  startX: number
  startY: number
  originX: number
  originY: number
  laneIndex: number
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

function getPerfGeometry(svg: SVGSVGElement) {
  const safeLayer = svg.querySelector("g#safe_zones")
  const sealLayer = svg.querySelector("g#seal_areas")
  const liveOriginX = Number(safeLayer?.getAttribute("data-live-origin-x") ?? "0")
  const liveOriginY = Number(safeLayer?.getAttribute("data-live-origin-y") ?? "0")
  const cutterOriginX = Number(sealLayer?.getAttribute("data-origin-x") ?? "0")
  const cutterOriginY = Number(sealLayer?.getAttribute("data-origin-y") ?? "0")
  const liveWidth = Number(sealLayer?.getAttribute("data-live-width") ?? "0")
  const liveHeight = Number(sealLayer?.getAttribute("data-live-height") ?? "0")
  const cutterWidth = Number(sealLayer?.getAttribute("data-cutter-width") ?? "0")
  const cutterHeight = Number(sealLayer?.getAttribute("data-cutter-height") ?? "0")
  return {
    liveOriginX,
    liveOriginY,
    liveWidth,
    liveHeight,
    cutterOriginX,
    cutterOriginY,
    cutterWidth,
    cutterHeight
  }
}

function redrawPerfs(svg: SVGSVGElement, perfs: PerfSpec) {
  const layer = svg.querySelector<SVGGElement>("g#perf_layer")
  if (!layer) {
    return
  }
  const geometry = getPerfGeometry(svg)
  const stepEnabled = layer.getAttribute("data-pack-step-enabled") === "true"
  const stepCount = Math.max(
    1,
    Number(layer.getAttribute("data-pack-step-count") ?? "1")
  )
  const stepSpan = Number(layer.getAttribute("data-pack-step-span") ?? "0")
  layer.innerHTML = ""
  const renderCount = stepEnabled ? stepCount : 1
  for (let index = 0; index < renderCount; index += 1) {
    const xOffset = stepEnabled ? stepSpan * index : 0
    renderPerfs(
      layer,
      perfs,
      geometry.liveOriginX + xOffset,
      geometry.liveOriginY,
      geometry.liveWidth,
      geometry.liveHeight,
      geometry.cutterOriginX + xOffset,
      geometry.cutterOriginY,
      geometry.cutterWidth,
      geometry.cutterHeight
    )
  }
}

function redrawPerfMeasures(svg: SVGSVGElement, perfs: PerfSpec, spec:FlowwrapSpec) {
  const annotationLayer = svg.querySelector<SVGGElement>("g#annotations")
  if (!annotationLayer) return
  let layer = annotationLayer.querySelector<SVGGElement>('g[data-role="perf-measures"]')
  if (document.documentElement.getAttribute("data-perf-measures") !== "true") { layer?.remove(); return }
  if (!layer) { layer = document.createElementNS(SVG_NS,"g"); annotationLayer.appendChild(layer) }
  const g = getPerfGeometry(svg)
  const centers = buildPerfCenters(perfs,g.liveOriginX,g.liveOriginY,g.liveWidth,g.liveHeight,g.cutterOriginX,g.cutterOriginY,g.cutterWidth,g.cutterHeight)
  const pack={x:g.cutterOriginX,y:g.cutterOriginY,width:g.cutterWidth,height:g.cutterHeight}
  renderPerfMeasurements(layer,perfs,centers,pack,annotationObstacles(spec,g.liveOriginX,g.liveOriginY,pack),annotationObstacles({...spec,safeZones:[]},g.liveOriginX,g.liveOriginY,pack))
}

export function attachPerfInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec

  const onPointerDown = (event: PointerEvent) => {
    // Another element listener can rebuild the SVG when clearing its selection.
    // A detached renderer must not capture the pointer during that handoff.
    if (!svg.isConnected) {
      return
    }
    if (svg.getAttribute("data-select-enabled") !== "true") {
      return
    }
    if (svg.getAttribute("data-pan-enabled") === "true") {
      return
    }
    if (svg.getAttribute("data-measure-enabled") === "true") {
      return
    }
    if (!pendingSpec.perfs) {
      return
    }
    const target = event.target as HTMLElement | null
    const role = target?.getAttribute("data-role")
    if (role !== "perf-dot" && role !== "perf-drag") {
      return
    }
    const laneIndex = Number(target?.getAttribute("data-lane-index") ?? "0")

    const start = getSvgPoint(svg, event.clientX, event.clientY)
    const lanes = pendingSpec.perfs.lanes?.length
      ? pendingSpec.perfs.lanes
      : [{ originX: pendingSpec.perfs.originX, originY: pendingSpec.perfs.originY }]
    const lane = lanes[laneIndex] ?? lanes[0]
    drag = {
      startX: start.x,
      startY: start.y,
      originX: lane?.originX ?? 0,
      originY: lane?.originY ?? 0,
      laneIndex
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.perfs) {
      return
    }
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    // AMENDS 6.1: lane origins land on the mouse movement grid (was a 0.5 mm delta step).
    const previousLane = pendingSpec.perfs.lanes?.[drag.laneIndex] ?? pendingSpec.perfs
    const nextOriginX = snapMoveWithin(drag.originX + (current.x - drag.startX), 0, Number.POSITIVE_INFINITY, previousLane.originX ?? drag.originX)
    const nextOriginY = snapMoveWithin(drag.originY + (current.y - drag.startY), 0, Number.POSITIVE_INFINITY, previousLane.originY ?? drag.originY)
    const lanes = pendingSpec.perfs.lanes?.length
      ? [...pendingSpec.perfs.lanes]
      : [{ originX: pendingSpec.perfs.originX, originY: pendingSpec.perfs.originY }]
    const updatedLane = { ...lanes[drag.laneIndex] }
    updatedLane.originX = nextOriginX
    if (pendingSpec.perfs.mode === "regulated") {
      updatedLane.originY = nextOriginY
    }
    lanes[drag.laneIndex] = updatedLane
    const nextPerfs = {
      ...pendingSpec.perfs,
      originX: updatedLane.originX,
      originY: updatedLane.originY,
      lanes
    }
    pendingSpec = {
      ...pendingSpec,
      perfs: nextPerfs
    }
    redrawPerfs(svg, nextPerfs)
    redrawPerfMeasures(svg, nextPerfs, pendingSpec)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    svg.releasePointerCapture(event.pointerId)
    onSpecChange(pendingSpec)
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointerleave", onPointerUp)
}
