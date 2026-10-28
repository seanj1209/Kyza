import { buildPerfCenters } from "../geometry/perfs"
import type { PerfSpec, PerfStyle } from "../types/perfs"

const SVG_NS = "http://www.w3.org/2000/svg"
const PERF_DEFAULT_COLOR = "#B80F0A"
const PERF_DEFAULT_STYLE: PerfStyle = "circles"

const resolveLaneDiameter = (perfs: PerfSpec, laneIndex: number) => {
  const lane = perfs.lanes?.[laneIndex]
  return Math.max(0.1, lane?.diameter ?? perfs.diameter)
}

const resolveLaneColor = (perfs: PerfSpec, laneIndex: number) => {
  return perfs.lanes?.[laneIndex]?.color ?? perfs.color ?? PERF_DEFAULT_COLOR
}

const resolveLaneFillColor = (perfs: PerfSpec, laneIndex: number) => {
  return perfs.lanes?.[laneIndex]?.fillColor ?? perfs.fillColor ?? resolveLaneColor(perfs, laneIndex)
}

const resolveLaneFillOpacity = (perfs: PerfSpec, laneIndex: number) => {
  const value = perfs.lanes?.[laneIndex]?.fillOpacity ?? perfs.fillOpacity ?? 1
  return Math.max(0, Math.min(1, value))
}

const resolveLaneStrokeColor = (perfs: PerfSpec, laneIndex: number) => {
  return (
    perfs.lanes?.[laneIndex]?.strokeColor ??
    perfs.lanes?.[laneIndex]?.fillColor ??
    perfs.strokeColor ??
    perfs.fillColor ??
    resolveLaneColor(perfs, laneIndex)
  )
}

const resolveLaneStrokeWidth = (perfs: PerfSpec, laneIndex: number, diameter: number) => {
  const fallback = Math.max(0.2, diameter * 0.18)
  const value = perfs.lanes?.[laneIndex]?.strokeWidth ?? perfs.strokeWidth ?? fallback
  return Math.max(0.1, Math.min(6, value))
}

const resolveLaneStyle = (perfs: PerfSpec, laneIndex: number): PerfStyle => {
  return perfs.lanes?.[laneIndex]?.style ?? perfs.style ?? PERF_DEFAULT_STYLE
}

const applyMarkerMeta = (node: SVGElement, laneIndex: number) => {
  node.setAttribute("cursor", "move")
  node.setAttribute("data-role", "perf-dot")
  node.setAttribute("data-lane-index", laneIndex.toString())
}

const createLine = (x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number) => {
  const line = document.createElementNS(SVG_NS, "line")
  line.setAttribute("x1", x1.toString())
  line.setAttribute("y1", y1.toString())
  line.setAttribute("x2", x2.toString())
  line.setAttribute("y2", y2.toString())
  line.setAttribute("stroke", color)
  line.setAttribute("stroke-width", strokeWidth.toString())
  line.setAttribute("stroke-linecap", "round")
  line.setAttribute("fill", "none")
  return line
}

const appendPerfMarker = (
  group: SVGGElement,
  style: PerfStyle,
  x: number,
  y: number,
  diameter: number,
  fillColor: string,
  fillOpacity: number,
  strokeColor: string,
  strokeWidth: number,
  laneIndex: number
) => {
  const radius = diameter / 2
  switch (style) {
    case "x-markers": {
      const d = radius * 0.72
      const lineA = createLine(x - d, y - d, x + d, y + d, strokeColor, strokeWidth)
      const lineB = createLine(x + d, y - d, x - d, y + d, strokeColor, strokeWidth)
      lineA.setAttribute("stroke-opacity", fillOpacity.toString())
      lineB.setAttribute("stroke-opacity", fillOpacity.toString())
      applyMarkerMeta(lineA, laneIndex)
      applyMarkerMeta(lineB, laneIndex)
      group.appendChild(lineA)
      group.appendChild(lineB)
      return
    }
    case "scope": {
      const ring = document.createElementNS(SVG_NS, "circle")
      ring.setAttribute("cx", x.toString())
      ring.setAttribute("cy", y.toString())
      ring.setAttribute("r", Math.max(0.2, radius - strokeWidth / 3).toString())
      ring.setAttribute("fill", "none")
      ring.setAttribute("stroke", strokeColor)
      ring.setAttribute("stroke-width", strokeWidth.toString())
      ring.setAttribute("stroke-opacity", fillOpacity.toString())
      applyMarkerMeta(ring, laneIndex)
      group.appendChild(ring)

      const crossA = createLine(x - radius, y, x + radius, y, strokeColor, Math.max(0.2, strokeWidth * 0.6))
      const crossB = createLine(x, y - radius, x, y + radius, strokeColor, Math.max(0.2, strokeWidth * 0.6))
      crossA.setAttribute("stroke-opacity", fillOpacity.toString())
      crossB.setAttribute("stroke-opacity", fillOpacity.toString())
      applyMarkerMeta(crossA, laneIndex)
      applyMarkerMeta(crossB, laneIndex)
      group.appendChild(crossA)
      group.appendChild(crossB)

      const center = document.createElementNS(SVG_NS, "circle")
      center.setAttribute("cx", x.toString())
      center.setAttribute("cy", y.toString())
      center.setAttribute("r", Math.max(0.15, radius * 0.18).toString())
      center.setAttribute("fill", fillColor)
      center.setAttribute("fill-opacity", fillOpacity.toString())
      center.setAttribute("stroke", strokeColor)
      center.setAttribute("stroke-width", Math.max(0.1, strokeWidth * 0.25).toString())
      applyMarkerMeta(center, laneIndex)
      group.appendChild(center)
      return
    }
    case "crosshair": {
      const outer = document.createElementNS(SVG_NS, "circle")
      outer.setAttribute("cx", x.toString())
      outer.setAttribute("cy", y.toString())
      outer.setAttribute("r", Math.max(0.2, radius - strokeWidth / 4).toString())
      outer.setAttribute("fill", "none")
      outer.setAttribute("stroke", strokeColor)
      outer.setAttribute("stroke-width", strokeWidth.toString())
      outer.setAttribute("stroke-opacity", fillOpacity.toString())
      applyMarkerMeta(outer, laneIndex)
      group.appendChild(outer)

      const span = radius * 0.65
      const lineH = createLine(x - span, y, x + span, y, strokeColor, Math.max(0.2, strokeWidth * 0.58))
      const lineV = createLine(x, y - span, x, y + span, strokeColor, Math.max(0.2, strokeWidth * 0.58))
      lineH.setAttribute("stroke-opacity", fillOpacity.toString())
      lineV.setAttribute("stroke-opacity", fillOpacity.toString())
      applyMarkerMeta(lineH, laneIndex)
      applyMarkerMeta(lineV, laneIndex)
      group.appendChild(lineH)
      group.appendChild(lineV)
      return
    }
    case "circles":
    default: {
      const c = document.createElementNS(SVG_NS, "circle")
      c.setAttribute("cx", x.toString())
      c.setAttribute("cy", y.toString())
      c.setAttribute("r", radius.toString())
      c.setAttribute("fill", fillColor)
      c.setAttribute("fill-opacity", fillOpacity.toString())
      c.setAttribute("stroke", strokeColor)
      c.setAttribute("stroke-width", strokeWidth.toString())
      applyMarkerMeta(c, laneIndex)
      group.appendChild(c)
    }
  }
}

export function renderPerfs(
  layer: SVGGElement,
  perfs: PerfSpec,
  liveOriginX: number,
  liveOriginY: number,
  liveWidth: number,
  liveHeight: number,
  cutterOriginX: number,
  cutterOriginY: number,
  cutterWidth: number,
  cutterHeight: number
) {
  if (perfs.diameter <= 0) {
    return
  }

  const centers = buildPerfCenters(
    perfs,
    liveOriginX,
    liveOriginY,
    liveWidth,
    liveHeight,
    cutterOriginX,
    cutterOriginY,
    cutterWidth,
    cutterHeight
  )

  if (centers.length === 0) {
    return
  }

  const laneGroups = new Map<number, SVGGElement>()
  const ensureLaneGroup = (laneIndex: number) => {
    const key = Number.isNaN(laneIndex) ? 0 : laneIndex
    if (laneGroups.has(key)) {
      return laneGroups.get(key)!
    }
    const group = document.createElementNS(SVG_NS, "g")
    group.setAttribute("data-role", "perf-group")
    group.setAttribute("data-lane-index", key.toString())
    laneGroups.set(key, group)
    layer.appendChild(group)
    return group
  }

  const laneBounds = new Map<number, { minX: number; maxX: number; minY: number; maxY: number }>()
  for (const center of centers) {
    const laneIndex = center.laneIndex ?? 0
    const radius = center.radius ?? resolveLaneDiameter(perfs, laneIndex) / 2
    const bounds = laneBounds.get(laneIndex) ?? {
      minX: center.x - radius,
      maxX: center.x + radius,
      minY: center.y - radius,
      maxY: center.y + radius
    }
    bounds.minX = Math.min(bounds.minX, center.x - radius)
    bounds.maxX = Math.max(bounds.maxX, center.x + radius)
    bounds.minY = Math.min(bounds.minY, center.y - radius)
    bounds.maxY = Math.max(bounds.maxY, center.y + radius)
    laneBounds.set(laneIndex, bounds)
  }

  laneBounds.forEach((bounds, laneIndex) => {
    const group = ensureLaneGroup(laneIndex)
    const hitbox = document.createElementNS(SVG_NS, "rect")
    hitbox.setAttribute("x", bounds.minX.toString())
    hitbox.setAttribute("y", bounds.minY.toString())
    hitbox.setAttribute("width", Math.max(0, bounds.maxX - bounds.minX).toString())
    hitbox.setAttribute("height", Math.max(0, bounds.maxY - bounds.minY).toString())
    hitbox.setAttribute("fill", "transparent")
    hitbox.setAttribute("pointer-events", "all")
    hitbox.setAttribute("cursor", "move")
    hitbox.setAttribute("data-role", "perf-drag")
    hitbox.setAttribute("data-lane-index", laneIndex.toString())
    group.appendChild(hitbox)
  })

  for (const center of centers) {
    const laneIndex = center.laneIndex ?? 0
    const group = ensureLaneGroup(laneIndex)
    appendPerfMarker(
      group,
      resolveLaneStyle(perfs, laneIndex),
      center.x,
      center.y,
      resolveLaneDiameter(perfs, laneIndex),
      resolveLaneFillColor(perfs, laneIndex),
      resolveLaneFillOpacity(perfs, laneIndex),
      resolveLaneStrokeColor(perfs, laneIndex),
      resolveLaneStrokeWidth(perfs, laneIndex, resolveLaneDiameter(perfs, laneIndex)),
      laneIndex
    )
  }
}
