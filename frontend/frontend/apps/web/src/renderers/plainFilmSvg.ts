import { resolvePlainWebLayout } from "../core/geometry/resolvers/resolvePlainWebLayout"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { buildFoldLines } from "../geometry/foldLines"
import { renderResolvedPlainWeb } from "./plainWebSvg"
import { renderAttributeBoxes } from "./svgAttributeBoxes"
import { renderSafeZones } from "./svgSafeZones"
import { renderWindows } from "./svgWindows"
import { renderFoldLines } from "./svgFoldLines"
import { renderPerfs } from "./svgPerfs"
import { applySubstrateAppearance } from "./substrateAppearance"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"

const NS = "http://www.w3.org/2000/svg"

/** Plain Film shares the rectangular web frame, with the normal editable element layers. */
export function renderPlainFilm(spec: FlowwrapSpec, options: RenderOptions = {}): SVGSVGElement {
  const geometry = resolveFlowwrapGeometry(spec)
  const { liveRect: live, cutterRect: cutter, seals } = geometry
  // The entire Die Cut Outs group is unavailable on Plain Film, including hangers.
  const svg = renderResolvedPlainWeb(resolvePlainWebLayout({ ...spec, hangerSlots: [] }, geometry), spec)
  svg.querySelector('[data-layer-id="cutter"]')!.setAttribute("data-layer-id", "cutter-outline")
  const measureLayer = svg.querySelector('[data-layer-id="measures"]')!
  const packMeta = {
    "data-cutter-origin-x": cutter.x, "data-cutter-origin-y": cutter.y,
    "data-cutter-width": cutter.width, "data-cutter-height": cutter.height,
  }
  const liveMeta = {
    "data-live-origin-x": live.x, "data-live-origin-y": live.y,
    "data-live-width": live.width, "data-live-height": live.height,
  }
  const metadata = (node: Element, values: Record<string, string | number>) => {
    Object.entries(values).forEach(([key, value]) => node.setAttribute(key, String(value)))
  }
  const group = (id: string, layer: string, meta: Record<string, string | number> = {}) => {
    const node = document.createElementNS(NS, "g")
    node.setAttribute("id", id)
    node.setAttribute("data-layer-id", layer)
    metadata(node, meta)
    svg.insertBefore(node, measureLayer)
    return node
  }
  const appendRect = (layer: SVGGElement, rect: typeof cutter, attrs: Record<string, string | number>) => {
    const node = document.createElementNS(NS, "rect")
    metadata(node, { ...rect, ...attrs })
    layer.appendChild(node)
  }

  const sealLayer = group("seal_areas", "seal-areas", {
    ...packMeta, ...liveMeta, "data-origin-x": 0, "data-origin-y": 0,
  })
  Object.entries(geometry.sealRects).forEach(([side, rect]) => {
    if (rect.width <= 0 || rect.height <= 0) return
    appendRect(sealLayer, rect, {
      fill: "#2eb774", "fill-opacity": .15, stroke: "#2eb774", "stroke-width": .6,
      "data-role": "seal-rect", "data-seal-side": side,
    })
  })
  for (const side of ["top", "bottom", "left", "right"] as const) {
    const horizontal = side === "top" || side === "bottom"
    const edge = side === "top" ? live.y : side === "bottom" ? live.y + live.height : side === "left" ? live.x : live.x + live.width
    appendRect(sealLayer, horizontal
      ? { x: 0, y: edge - 1, width: cutter.width, height: 2 }
      : { x: edge - 1, y: 0, width: 2, height: cutter.height }, {
      fill: "transparent", cursor: horizontal ? "ns-resize" : "ew-resize",
      "data-role": "seal-handle", "data-seal-side": side,
    })
  }
  const bleed = group("bleed_guides", "bleed")
  const inset = spec.bleed ?? geometry.bleedInset
  if (inset > 0 && live.width > 2 * inset && live.height > 2 * inset) {
    appendRect(bleed, { x: live.x + inset, y: live.y + inset, width: live.width - 2 * inset, height: live.height - 2 * inset }, {
      fill: "none", stroke: "#6b6b6b", "stroke-width": .6, "stroke-dasharray": "3 3",
    })
  }
  const folds = group("fold_lines", "fold-lines")
  renderFoldLines(folds, buildFoldLines(spec.foldLines ?? [], live.x, 0, 0, cutter.width, cutter.height, live.x, live.x + live.width), live.x, live.x, live.x + live.width)
  const perfs = group("perf_layer", "perf-lines", { ...packMeta, ...liveMeta })
  if (spec.perfs) renderPerfs(perfs, spec.perfs, live.x, live.y, live.width, live.height, 0, 0, cutter.width, cutter.height)
  renderWindows(group("window_layer", "windows", liveMeta), spec.windows ?? [], live.x, live.y)
  renderSafeZones(group("safe_zones", "safe-zones", liveMeta), spec.safeZones ?? [], live.x, live.y)
  renderAttributeBoxes(group("attribute_boxes", "notes", {
    ...packMeta, ...liveMeta, "data-pack-id": "plain-film",
    "data-sachet-step-enabled": "false", "data-sachet-step-count": 1, "data-sachet-step-span": 0,
  }), spec.attributeBoxes ?? [], live.x, live.y, 0, undefined, options.renderMode ?? "edit")
  svg.querySelector('[data-layer-id="hanger-slots"]')!.remove()
  const eyes = svg.querySelector('[data-layer-id="eyemarks"]')
  if (eyes) {
    eyes.setAttribute("id", "eyemark_track")
    metadata(eyes, { ...packMeta, "data-pack-id": "plain-film", ...Object.fromEntries(Object.entries(seals).map(([side, size]) => [`data-seal-${side}`, size])) })
    svg.insertBefore(eyes, measureLayer)
  }
  group("annotations", "annotations")
  applySubstrateAppearance(svg, spec)
  return svg
}
