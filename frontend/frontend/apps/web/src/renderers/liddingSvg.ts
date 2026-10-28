import { LIDDING_CANVAS_MARGIN_MM, LIDDING_DEFAULTS, LIDDING_EDGE_CLEARANCE_MM, liddingEyemarkInstances, liddingPullTabAngle, resolveLiddingLayout } from "../constraints/lidding"
import { liddingActiveLane, liddingLaneElements, liddingSynced } from "../constraints/liddingSteps"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import { renderAttributeBoxes } from "./svgAttributeBoxes"
import { renderSafeZones } from "./svgSafeZones"
import { renderWindows } from "./svgWindows"

const NS = "http://www.w3.org/2000/svg"
const svg = <K extends keyof SVGElementTagNameMap>(tag: K) => document.createElementNS(NS, tag)
const attrs = <T extends Element>(element: T, values: Record<string, string | number>): T => {
  for (const [key, value] of Object.entries(values)) element.setAttribute(key, String(value))
  return element
}

type ContourPoint = { x: number; y: number; nx: number; ny: number }
type SlitBounds = { left: number; top: number; right: number; bottom: number }
const perimeter = (width: number, height: number, round: boolean) => round
  ? Math.PI * width
  : 2 * (width + height - 4 * Math.min(width, height) * .17) + 2 * Math.PI * Math.min(width, height) * .17

/** Walk from the top centre clockwise. Each quarter-turn has the same perimeter length. */
function contourPoint(x: number, y: number, width: number, height: number, round: boolean, distance: number): ContourPoint {
  const cx = x + width / 2, cy = y + height / 2
  if (round) {
    const angle = -Math.PI / 2 + distance / (width / 2)
    return { x: cx + width / 2 * Math.cos(angle), y: cy + width / 2 * Math.sin(angle), nx: Math.cos(angle), ny: Math.sin(angle) }
  }
  const r = Math.min(width, height) * .17, quarterArc = Math.PI * r / 2
  let s = distance
  const topHalf = width / 2 - r
  if (s <= topHalf) return { x: cx + s, y, nx: 0, ny: -1 }
  s -= topHalf
  const arc = (centreX: number, centreY: number, startAngle: number): ContourPoint => {
    const angle = startAngle + s / r
    return { x: centreX + r * Math.cos(angle), y: centreY + r * Math.sin(angle), nx: Math.cos(angle), ny: Math.sin(angle) }
  }
  if (s <= quarterArc) return arc(x + width - r, y + r, -Math.PI / 2)
  s -= quarterArc
  if (s <= height - 2 * r) return { x: x + width, y: y + r + s, nx: 1, ny: 0 }
  s -= height - 2 * r
  if (s <= quarterArc) return arc(x + width - r, y + height - r, 0)
  s -= quarterArc
  if (s <= width - 2 * r) return { x: x + width - r - s, y: y + height, nx: 0, ny: 1 }
  s -= width - 2 * r
  if (s <= quarterArc) return arc(x + r, y + height - r, Math.PI / 2)
  s -= quarterArc
  if (s <= height - 2 * r) return { x, y: y + height - r - s, nx: -1, ny: 0 }
  s -= height - 2 * r
  if (s <= quarterArc) return arc(x + r, y + r, Math.PI)
  s -= quarterArc
  return { x: x + r + s, y, nx: 0, ny: -1 }
}

/** A smooth, closed tabbed contour; the lobe is limited by every slit edge. */
function tabbedPath(x: number, y: number, width: number, height: number, round: boolean, angle: number, requestedDepth: number, slit: SlitBounds) {
  const length = perimeter(width, height, round)
  const count = Math.ceil(length / .75)
  const target = length * angle / 360
  const halfSpan = Math.min(22, length / 24)
  const samples = Array.from({ length: count }, (_, index) => {
    const distance = length * index / count
    const point = contourPoint(x, y, width, height, round, distance)
    const separation = Math.min(Math.abs(distance - target), length - Math.abs(distance - target))
    const factor = separation < halfSpan ? (1 + Math.cos(Math.PI * separation / halfSpan)) / 2 : 0
    return { ...point, factor }
  })
  let depth = requestedDepth
  for (const point of samples) {
    if (!point.factor) continue
    const xFactor = point.nx * point.factor, yFactor = point.ny * point.factor
    if (xFactor > 0) depth = Math.min(depth, (slit.right - point.x) / xFactor)
    if (xFactor < 0) depth = Math.min(depth, (slit.left - point.x) / xFactor)
    if (yFactor > 0) depth = Math.min(depth, (slit.bottom - point.y) / yFactor)
    if (yFactor < 0) depth = Math.min(depth, (slit.top - point.y) / yFactor)
  }
  depth = Math.max(0, depth)
  const coordinate = (value: number) => Number(value.toFixed(3))
  return samples.map((point, index) => `${index ? "L" : "M"} ${coordinate(point.x + point.nx * point.factor * depth)} ${coordinate(point.y + point.ny * point.factor * depth)}`).join(" ") + " Z"
}

/** One closed contour for the outer cut and seal, including the pull tab. */
function lidPath(x: number, y: number, width: number, height: number, round: boolean, tab: boolean, angle: number, depth: number, slit: SlitBounds) {
  const cx = x + width / 2, cy = y + height / 2
  if (tab && depth > 0) return tabbedPath(x, y, width, height, round, angle, depth, slit)
  if (round) {
    const r = width / 2
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`
  }
  const r = Math.min(width, height) * .17
  return `M ${x + r} ${y} L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${y + r} L ${x + width} ${y + height - r} Q ${x + width} ${y + height} ${x + width - r} ${y + height} L ${x + r} ${y + height} Q ${x} ${y + height} ${x} ${y + height - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
}

export function renderLidding(spec: FlowwrapSpec, options: RenderOptions = {}): SVGSVGElement {
  const lid = spec.lidding ?? LIDDING_DEFAULTS
  const layout = resolveLiddingLayout(spec)
  const size = layout.cutter, margin = LIDDING_CANVAS_MARGIN_MM
  const root = attrs(svg("svg"), {
    viewBox: `0 0 ${size.width + margin * 2} ${size.height + margin * 2}`,
    width: "100%", height: "100%", "data-pack": "lidding", "data-lid-style": lid.style,
    "data-cutter-width": size.width, "data-cutter-height": size.height,
    "data-min-cutter-width": layout.minimumCutter.width, "data-min-cutter-height": layout.minimumCutter.height,
    "data-slit-width": layout.slit.width, "data-slit-height": layout.slit.height,
    "data-lid-width": lid.outerCutWidth, "data-lid-height": lid.outerCutHeight,
    "data-active-lid-cell": `${liddingActiveLane(spec) + 1}A`,
  }) as SVGSVGElement
  const layer = (id: string) => {
    const group = attrs(svg("g"), { "data-layer-id": id })
    root.append(group)
    return group
  }
  const substrate = layer("substrate")
  substrate.append(attrs(svg("rect"), { x: margin, y: margin, width: size.width, height: size.height, fill: "#dff5fa", stroke: "none" }))
  const slit = layer("cutter-outline")
  const cutter = layer("cutter-lines"), seals = layer("seal-areas"), windows = layer("windows"), safe = layer("safe-zones"), notes = layer("notes")
  const active = liddingActiveLane(spec), synced = liddingSynced(spec)
  const slitEdge = (x: number, y: number, width: number, height: number, id: string) =>
    slit.append(attrs(svg("rect"), {
      x: x + .25, y: y + .25, width: Math.max(0, width - .5), height: Math.max(0, height - .5),
      fill: "none", stroke: "#2eb774", "stroke-width": .5, "pointer-events": "none",
      "data-role": "lidding-cutter-edge", "data-slit-cell": id,
    }))
  slitEdge(margin, margin, size.width, size.height, "web")
  if (lid.innerLines) {
    for (let column = 1; column < lid.across; column++) {
      const x = margin + column * layout.slit.width
      slit.append(attrs(svg("line"), {
        x1: x, y1: margin, x2: x, y2: margin + size.height,
        stroke: "#2eb774", "stroke-width": .5, "pointer-events": "none",
        "data-role": "lidding-inner-edge", "data-boundary": `across-${column}`,
      }))
    }
    for (let row = 1; row < lid.around; row++) {
      const y = margin + layout.rows[row].top
      slit.append(attrs(svg("line"), {
        x1: margin, y1: y, x2: margin + size.width, y2: y,
        stroke: "#2eb774", "stroke-width": .5, "pointer-events": "none",
        "data-role": "lidding-inner-edge", "data-boundary": `around-${row}`,
      }))
    }
  }
  for (const cell of layout.cells) {
    const { id, column, row } = cell
    const x = margin + cell.x, y = margin + cell.y
    const editable = row === 0 && (synced ? column === 0 : column === active)
    if (lid.style !== "plain") {
      const ring = (parent: SVGGElement, reduction: number, color: string, role?: string, dashed = false, withTab = false) => {
        const w = Math.max(.1, lid.outerCutWidth - reduction), h = Math.max(.1, lid.outerCutHeight - reduction)
        const rx = x + reduction / 2, ry = y + reduction / 2
        const slitBounds = {
          left: margin + cell.slitX + LIDDING_EDGE_CLEARANCE_MM,
          top: margin + cell.slitY + LIDDING_EDGE_CLEARANCE_MM,
          right: margin + cell.slitX + cell.slitWidth - LIDDING_EDGE_CLEARANCE_MM,
          bottom: margin + cell.slitY + cell.slitHeight - LIDDING_EDGE_CLEARANCE_MM,
        }
        const path = attrs(svg("path"), {
          d: lidPath(rx, ry, w, h, lid.style === "round", withTab && lid.pullTab, liddingPullTabAngle(lid), Math.max(0, 6 - reduction / 2), slitBounds),
          fill: "none", stroke: color, "stroke-width": .4, "pointer-events": "none",
        })
        if (role) path.setAttribute("data-role", role)
        if (withTab) path.setAttribute("data-tab-angle", String(liddingPullTabAngle(lid)))
        if (dashed) path.setAttribute("stroke-dasharray", "3 2")
        parent.append(path)
      }
      const cutCell = attrs(svg("g"), { "data-lid-cell": id })
      ring(cutCell, 0, "#1499d0", "lid-outer-cut", false, true)
      cutter.append(cutCell)
      const sealCell = attrs(svg("g"), { "data-lid-cell": id })
      ring(sealCell, lid.outerBleed, "#36b2d9", "lid-outer-seal", false, true)
      ring(sealCell, lid.outerBleed + lid.sealOuter, "#36b2d9", "lid-inner-seal")
      ring(sealCell, lid.outerBleed + lid.sealOuter + lid.sealInner, "#36b2d9", "lid-inner-seal")
      seals.append(sealCell)
      const safeCell = attrs(svg("g"), { "data-lid-cell": id })
      ring(safeCell, Math.max(0, lid.outerCutWidth - lid.artworkSafeArea), "#77b3c9", undefined, true)
      safe.append(safeCell)
    }
    const elements = liddingLaneElements(spec, column)
    const liveMeta = {
      "data-live-origin-x": x, "data-live-origin-y": y,
      "data-live-width": cell.width, "data-live-height": cell.height,
      "data-handle-size": 12,
    }
    const safeCell = attrs(svg("g"), { ...liveMeta, "data-lid-cell": id })
    if (editable) { safeCell.id = "safe_zones"; safeCell.setAttribute("data-layer-id", "safe-zones") }
    renderSafeZones(safeCell, elements.safeZones ?? [], x, y)
    if (!editable) safeCell.setAttribute("pointer-events", "none")
    safe.append(safeCell)
    const windowCell = attrs(svg("g"), { ...liveMeta, "data-lid-cell": id })
    if (editable) { windowCell.id = "window_layer"; windowCell.setAttribute("data-layer-id", "windows") }
    renderWindows(windowCell, elements.windows ?? [], x, y)
    if (!editable) windowCell.setAttribute("pointer-events", "none")
    windows.append(windowCell)
    const noteCell = attrs(svg("g"), {
      ...liveMeta, "data-lid-cell": id, "data-pack-id": "lidding",
      "data-cutter-origin-x": x, "data-cutter-origin-y": y,
      "data-cutter-width": cell.width, "data-cutter-height": cell.height,
    })
    if (editable) { noteCell.id = "attribute_boxes"; noteCell.setAttribute("data-layer-id", "notes") }
    renderAttributeBoxes(noteCell, elements.attributeBoxes ?? [], x, y, 0, null, options.renderMode ?? "edit")
    if (!editable) noteCell.setAttribute("pointer-events", "none")
    notes.append(noteCell)
  }
  const eyemarks = layer("eyemarks")
  liddingEyemarkInstances(spec).forEach(({ rect: mark, sideIndex, cellId }, index) => eyemarks.append(attrs(svg("rect"), {
    x: mark.x + margin, y: mark.y + margin, width: mark.width, height: mark.height,
    fill: "#111", "data-role": "eye-mark", "data-eye-index": index,
    "data-eye-side": sideIndex,
    "data-slit-cell": cellId,
  })))
  const measures = layer("measurement-guides")
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    measures.append(attrs(svg("line"), { x1, y1, x2, y2, stroke: "#d23429", "stroke-width": .45 }))
  const label = (x: number, y: number, value: string, rotate = false) => {
    const t = attrs(svg("text"), { x, y, fill: "#d23429", "font-size": 5, "text-anchor": "middle", "dominant-baseline": "central" })
    if (rotate) t.setAttribute("transform", `rotate(-90 ${x} ${y})`)
    t.textContent = value
    measures.append(t)
  }
  const width = `${size.width} mm`, height = `${size.height} mm`
  const cx = margin + size.width / 2, cy = margin + size.height / 2
  const horizontalY = margin - 23, verticalX = margin + size.width + 23
  const gapW = Math.max(10, width.length * 1.5), gapH = Math.max(10, height.length * 1.5)
  line(margin, horizontalY, cx - gapW, horizontalY)
  line(cx + gapW, horizontalY, margin + size.width, horizontalY)
  line(margin, horizontalY - 3, margin, horizontalY + 3)
  line(margin + size.width, horizontalY - 3, margin + size.width, horizontalY + 3)
  label(cx, horizontalY, width)
  measures.lastElementChild?.setAttribute("data-role", "lidding-cutter-width-measure")
  line(verticalX, margin, verticalX, cy - gapH)
  line(verticalX, cy + gapH, verticalX, margin + size.height)
  line(verticalX - 3, margin, verticalX + 3, margin)
  line(verticalX - 3, margin + size.height, verticalX + 3, margin + size.height)
  label(verticalX, cy, height, true)
  measures.lastElementChild?.setAttribute("data-role", "lidding-cutter-height-measure")
  return root
}
