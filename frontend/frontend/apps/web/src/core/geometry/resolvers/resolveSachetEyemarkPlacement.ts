import { buildEyeMarkRects } from "../../../geometry/eyeMarks"
import type { Rect } from "../../../geometry/rect"
import type { FlowwrapSpec } from "../../../types/flowwrap"
import { resolveSachetLayout, type ResolvedSachetLayout } from "./resolveSachetLayout"

export type SachetEyemarkPlacementStatus = "ok" | "outside-cutter" | "outside-zone" | "no-zone"

export type SachetEyemarkPlacement = {
  index: number
  /** Rendered mark, in sachet layout coordinates (the same frame the SVG uses). */
  rect: Rect
  /** 4SS pairs render a top and bottom half; this is the bottom half. */
  pairRect?: Rect
  /** The band the mark must sit in: a trim band (3SS) or the lane boundary (4SS pairs). */
  allowedZones: Rect[]
  status: SachetEyemarkPlacementStatus
  message: string | null
}

export type SachetEyemarkPlacementResult = {
  mode: "trim" | "pair" | "none"
  /** Full finished sachet (all steps plus trim), layout coordinates. */
  content: Rect
  frame: { originX: number; originY: number }
  placements: SachetEyemarkPlacement[]
}

const inside = (rect: Rect, area: Rect, tolerance = 0.001) =>
  rect.x >= area.x - tolerance &&
  rect.y >= area.y - tolerance &&
  rect.x + rect.width <= area.x + area.width + tolerance &&
  rect.y + rect.height <= area.y + area.height + tolerance

/**
 * Amends v12: exposes the 3SS / 4SS eyemark placement the renderer draws so validation can
 * check it instead of reporting "pack-specific position geometry that is not exposed".
 * 3SS: marks are placed in the trim + step "eyemark cutter" with the shared 1.5 mm edge
 * clearance, and must sit inside a selected trim band. 4SS pairs: marks straddle the lane
 * boundary and must be centred on it (the renderer's own alignment rule).
 */
export function resolveSachetEyemarkPlacements(
  spec: FlowwrapSpec,
  layout: ResolvedSachetLayout = resolveSachetLayout(spec)
): SachetEyemarkPlacementResult {
  const frame = { originX: layout.margin, originY: layout.originY }
  const content = { x: layout.margin, y: layout.originY, width: layout.contentWidth, height: spec.height }
  const eyeMarks = spec.eyeMarks
  if (!eyeMarks || eyeMarks.count <= 0) return { mode: "none", content, frame, placements: [] }

  if (spec.sideSealPouch) {
    const trimZones: Rect[] = [
      ...(layout.leftTrimWidth > 0 ? [{ x: layout.margin, y: layout.originY, width: layout.leftTrimWidth, height: spec.height }] : []),
      ...(layout.rightTrimWidth > 0 ? [{ x: layout.margin + layout.contentWidth - layout.rightTrimWidth, y: layout.originY, width: layout.rightTrimWidth, height: spec.height }] : []),
    ]
    const placements = Array.from({ length: Math.min(2, eyeMarks.count) }, (_, index): SachetEyemarkPlacement => {
      const zone = trimZones[index]
      const width = index === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width
      const height = index === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
      const offsetX = (index === 1 ? eyeMarks.offsetX2 : eyeMarks.offsetX) ?? 0
      const offsetY = (index === 1 ? eyeMarks.offsetY2 : eyeMarks.offsetY) ?? 0
      const rect = { x: (zone ? zone.x + (zone.width - width) / 2 : layout.margin) + offsetX, y: layout.originY + 1.5 + offsetY, width, height }
      const status: SachetEyemarkPlacementStatus = !zone ? "no-zone" : inside(rect, zone) ? "ok" : "outside-zone"
      return { index, rect, allowedZones: trimZones, status, message: status === "ok" ? null : "Each pouch eyemark needs its own trim band and must fit inside it." }
    })
    return { mode: "trim", content, frame, placements }
  }

  if (layout.usePairEyeMarks) {
    const pair = layout.pairEyeMarks
    if (!pair) {
      return {
        mode: "pair", content, frame,
        placements: [{
          index: 0,
          rect: { x: layout.margin, y: layout.originY, width: 0, height: 0 },
          allowedZones: [],
          status: "no-zone",
          message: "Paired eyemarks need at least two steps to straddle a lane boundary."
        }]
      }
    }
    const rect = { x: pair.x, y: pair.topY, width: pair.width, height: pair.halfHeight }
    const pairRect = { x: pair.x, y: pair.bottomY, width: pair.width, height: pair.halfHeight }
    const status: SachetEyemarkPlacementStatus = !inside(rect, content) || !inside(pairRect, content)
      ? "outside-cutter"
      : pair.warning ? "outside-zone" : "ok"
    return {
      mode: "pair", content, frame,
      placements: [{ index: 0, rect, pairRect, allowedZones: [], status, message: status === "outside-zone" ? pair.warning : null }]
    }
  }

  const cutter = {
    x: layout.eyemarkCutterOriginX,
    y: layout.originY,
    width: layout.eyemarkCutterWidth,
    height: spec.height
  }
  const rects = buildEyeMarkRects(eyeMarks, cutter.x, cutter.y, cutter.width, cutter.height, {
    seals: { top: spec.height, bottom: spec.height, left: layout.eyeMarkWidth, right: layout.eyeMarkWidth }
  })
  const zones: Rect[] = [
    ...(layout.leftTrimWidth > 0 ? [{ x: layout.margin, y: layout.originY, width: layout.leftTrimWidth, height: spec.height }] : []),
    ...(layout.rightTrimWidth > 0 ? [{ x: layout.margin + layout.contentWidth - layout.rightTrimWidth, y: layout.originY, width: layout.rightTrimWidth, height: spec.height }] : [])
  ]
  const placements = rects.map((rect, index): SachetEyemarkPlacement => {
    if (!inside(rect, content)) {
      return { index, rect, allowedZones: zones, status: "outside-cutter", message: `Eyemark ${index + 1} is outside the sachet cutter.` }
    }
    if (zones.length === 0) {
      return { index, rect, allowedZones: zones, status: "no-zone", message: `Eyemark ${index + 1} is inside the sachet, but Trim Width is 0 mm, so there is no trim band to check its position against.` }
    }
    if (!zones.some(zone => inside(rect, zone))) {
      return { index, rect, allowedZones: zones, status: "outside-zone", message: `Eyemark ${index + 1} sits outside the 3SS trim band. Keep it within the ${layout.trimWidth} mm trim.` }
    }
    return { index, rect, allowedZones: zones, status: "ok", message: null }
  })
  return { mode: "trim", content, frame, placements }
}
