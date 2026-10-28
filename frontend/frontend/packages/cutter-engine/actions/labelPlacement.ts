import type { AttributeBoxSpec, FlowwrapSpec } from "../types"
import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"
import { buildFoldLines } from "../../../apps/web/src/geometry/foldLines"
import { annotationObstacles, largestClearRect, rotatedRect } from "../../../apps/web/src/geometry/annotationPlacement"
import { resolveSachetLayout } from "../../../apps/web/src/core/geometry/resolvers/resolveSachetLayout"
import { resolveSachetEyemarkPlacements } from "../../../apps/web/src/core/geometry/resolvers/resolveSachetEyemarkPlacement"

/**
 * Amends v12 — deterministic Place for label elements.
 *
 * Coordinates are the attribute-box frame: the live area's top-left is (0, 0), so seals sit at
 * negative positions (top/left) or beyond the live size (bottom/right).
 *
 * Seal labels: "seal-area" may use any seal, "top-seal"/"bottom-seal" their named seal, and
 * "side-seal" the left or right seal. A placed label is squared to its seal (0° on top/bottom,
 * 90° on left/right so it runs along the seal), centred in the seal band, and scaled down only
 * if it would not fit. One seal label per seal: an occupied seal is never shared or displaced.
 *
 * FOP/BOP (interpretation, see handoff): two vertical folds split the live area into a front
 * panel between them (FOP, one slot) and two back halves outside them (BOP, two slots: left,
 * then right). Without two vertical folds there is no FOP/BOP structure, so Place is disabled.
 */
export const SEAL_LABEL_KEYS = ["seal-area", "top-seal", "bottom-seal", "side-seal"] as const
export const PANEL_LABEL_KEYS = ["fop", "bop"] as const
export type SealSide = "top" | "bottom" | "left" | "right"
type Rect = { x: number; y: number; width: number; height: number }
type Slot = { id: string; kind: "seal" | "panel"; area: Rect; rotation: number }

export type LabelPlacementResult =
  | { enabled: true; box: AttributeBoxSpec; slot: string }
  | { enabled: false; reason: string }

const ALLOWED_SEALS: Record<(typeof SEAL_LABEL_KEYS)[number], SealSide[]> = {
  "seal-area": ["top", "bottom", "left", "right"],
  "top-seal": ["top"],
  "bottom-seal": ["bottom"],
  "side-seal": ["left", "right"]
}
const SEAL_NAMES: Record<SealSide, string> = { top: "top seal", bottom: "bottom seal", left: "left seal", right: "right seal" }

export const isSealLabel = (box?: AttributeBoxSpec) => box?.kind === "label" && (SEAL_LABEL_KEYS as readonly string[]).includes(box.labelKey ?? "")
export const isPanelLabel = (box?: AttributeBoxSpec) => box?.kind === "label" && (PANEL_LABEL_KEYS as readonly string[]).includes(box.labelKey ?? "")
export const isPlaceableLabel = (box?: AttributeBoxSpec) => isSealLabel(box) || isPanelLabel(box)

const centre = (rect: Rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
const contains = (area: Rect, point: { x: number; y: number }, tolerance = 0.01) =>
  point.x >= area.x - tolerance && point.x <= area.x + area.width + tolerance &&
  point.y >= area.y - tolerance && point.y <= area.y + area.height + tolerance
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

function straightSided(spec: FlowwrapSpec) {
  return !spec.doyPouch && !spec.kSealPouch
}

export function getSealSlots(spec: FlowwrapSpec): Slot[] {
  const { liveRect: live, seals } = resolveFlowwrapGeometry(spec)
  const slots: Slot[] = []
  // Top/bottom bands span between the side seals so corners are never double-claimed.
  if (seals.top > 0) slots.push({ id: "top", kind: "seal", area: { x: 0, y: -seals.top, width: live.width, height: seals.top }, rotation: 0 })
  if (seals.bottom > 0) slots.push({ id: "bottom", kind: "seal", area: { x: 0, y: live.height, width: live.width, height: seals.bottom }, rotation: 0 })
  if (seals.left > 0) slots.push({ id: "left", kind: "seal", area: { x: -seals.left, y: 0, width: seals.left, height: live.height }, rotation: 90 })
  if (seals.right > 0) slots.push({ id: "right", kind: "seal", area: { x: live.width, y: 0, width: seals.right, height: live.height }, rotation: 90 })
  return slots
}

/** Front/back panels from the vertical folds, or null when the structure is missing. */
export function getPanelSlots(spec: FlowwrapSpec): { fop: Slot[]; bop: Slot[] } | null {
  const { liveRect: live } = resolveFlowwrapGeometry(spec)
  const verticals = buildFoldLines(spec.foldLines ?? [], live.x, 0, 0, spec.width, spec.height, live.x, live.x + live.width)
    .filter(fold => Math.abs(fold.x1 - fold.x2) < 0.001)
    .map(fold => fold.x1 - live.x)
    .filter(x => x > 0.001 && x < live.width - 0.001)
    .sort((a, b) => a - b)
  if (verticals.length !== 2) return null
  const inset = Math.max(0, spec.sealClearance ?? 0)
  const panel = (id: string, x1: number, x2: number): Slot => {
    const area = { x: x1 + inset, y: inset, width: x2 - x1 - 2 * inset, height: live.height - 2 * inset }
    return { id, kind: "panel", area, rotation: 0 }
  }
  return {
    fop: [panel("front", verticals[0], verticals[1])],
    bop: [panel("back-left", 0, verticals[0]), panel("back-right", verticals[1], live.width)]
  }
}

/** The slot a label holds: it was placed there by Place and still sits inside it.
 * Unplaced labels never block a slot, so spawn positions cannot steal FOP/BOP or seals. */
function occupiedSlot(box: AttributeBoxSpec, slots: Slot[]) {
  if (!box.placedSlot) return null
  const slot = slots.find(item => item.id === box.placedSlot)
  return slot && contains(slot.area, centre(box)) ? slot.id : null
}

/** Obstacles in the attribute-box frame. Sachet eyemarks come from the sachet placement
 * (they sit in the trim / on lane boundaries), mapped into every step's frame. */
function placementObstacles(spec: FlowwrapSpec, excludeId: string) {
  const { liveRect: live } = resolveFlowwrapGeometry(spec)
  const pack = { x: -live.x, y: -live.y, width: spec.width, height: spec.height }
  if (!spec.sachet) return annotationObstacles({ ...spec, safeZones: [] }, 0, 0, pack, excludeId)
  const base = annotationObstacles({ ...spec, safeZones: [], eyeMarks: undefined }, 0, 0, pack, excludeId)
  const layout = resolveSachetLayout(spec)
  const eyes = resolveSachetEyemarkPlacements(spec, layout).placements.flatMap(item => [item.rect, ...(item.pairRect ? [item.pairRect] : [])])
  const mapped = layout.lanes.flatMap(lane => eyes.map(rect => ({ ...rect, x: rect.x - lane.bodyOriginX - live.x, y: rect.y - layout.originY - live.y })))
  return [...base, ...mapped]
}

function fitInSlot(spec: FlowwrapSpec, box: AttributeBoxSpec, slot: Slot): LabelPlacementResult {
  if (slot.area.width <= 0 || slot.area.height <= 0) return { enabled: false, reason: `The ${slot.id} panel is too small for its configured clearance.` }
  const obstacles = placementObstacles(spec, box.id)
  // Keep clear of other elements: no extra gap inside a thin seal band, the standard 1 mm in panels.
  const free = largestClearRect(slot.area, obstacles, slot.kind === "seal" ? 0 : 1)
  if (!free) return { enabled: false, reason: "No clear space remains here without overlapping another element." }
  // Footprint of the squared label: rotated 90° labels run along a side seal.
  const footprint = slot.rotation === 90 ? { width: box.height, height: box.width } : { width: box.width, height: box.height }
  const scale = Math.min(1, free.width / Math.max(0.001, footprint.width), free.height / Math.max(0.001, footprint.height))
  const width = box.width * scale, height = box.height * scale
  if (Math.min(width, height) < 0.5) return { enabled: false, reason: "The clear space is too small for a readable label." }
  const cx = free.x + free.width / 2, cy = free.y + free.height / 2
  // Stored width/height are pre-rotation; rotation is about the box centre.
  return { enabled: true, slot: slot.id, box: { ...box, x: cx - width / 2, y: cy - height / 2, width, height, rotation: slot.rotation, placedSlot: slot.id } }
}

export function getLabelPlacement(spec: FlowwrapSpec, id: string, pending: AttributeBoxSpec[] = spec.attributeBoxes ?? []): LabelPlacementResult {
  const box = pending.find(item => item.id === id && item.enabled !== false)
  if (!box || !isPlaceableLabel(box)) return { enabled: false, reason: "Select a seal, FOP or BOP label." }
  if (!straightSided(spec)) return { enabled: false, reason: "Automatic placement needs straight-sided seals and folds." }
  const current = { ...spec, attributeBoxes: pending }
  const others = pending.filter(item => item.id !== id && item.enabled !== false)

  if (isSealLabel(box)) {
    const slots = getSealSlots(current)
    const allowed = ALLOWED_SEALS[box.labelKey as (typeof SEAL_LABEL_KEYS)[number]]
    const occupied = new Set(others.filter(isSealLabel).map(item => occupiedSlot(item, slots)).filter(Boolean))
    const own = occupiedSlot(box, slots)
    const candidates = slots.filter(slot => allowed.includes(slot.id as SealSide) && !occupied.has(slot.id))
    if (!slots.some(slot => allowed.includes(slot.id as SealSide))) {
      return { enabled: false, reason: `This cutter has no ${allowed.map(side => SEAL_NAMES[side]).join(" or ")}.` }
    }
    if (candidates.length === 0) {
      return {
        enabled: false,
        reason: allowed.length === 4
          ? "All four seals already have a label. This label was left where it is."
          : `The ${allowed.map(side => SEAL_NAMES[side]).join(" and ")} already ${allowed.length > 1 ? "have" : "has"} a label. This label was left where it is.`
      }
    }
    // Deterministic: keep its current seal if free, else the nearest free seal (ties: top, bottom, left, right).
    const point = centre(box)
    const target = candidates.find(slot => slot.id === own) ??
      [...candidates].sort((a, b) => distance(point, centre(a.area)) - distance(point, centre(b.area)))[0]
    return fitInSlot(current, box, target)
  }

  const panels = getPanelSlots(current)
  if (!panels) return { enabled: false, reason: "FOP/BOP placement needs two vertical fold lines (front panel between them, back panels outside)." }
  const key = box.labelKey as "fop" | "bop"
  const slots = panels[key]
  const occupied = new Set(others.filter(item => item.kind === "label" && item.labelKey === key).map(item => occupiedSlot(item, slots)).filter(Boolean))
  const own = occupiedSlot(box, slots)
  const free = slots.filter(slot => !occupied.has(slot.id))
  if (free.length === 0) {
    return { enabled: false, reason: key === "fop" ? "The front panel already has an FOP label. This label was left where it is." : "Both back panels already have a BOP label. This label was left where it is." }
  }
  // BOP fills back-left then back-right; a label already in a free slot keeps it.
  const target = free.find(slot => slot.id === own) ?? free[0]
  return fitInSlot(current, box, target)
}

export type LabelBatchResult = { spec: FlowwrapSpec; placed: string[]; skipped: Array<{ id: string; reason: string }> }

/** Places labels in spec order so results do not depend on selection order. Unplaceable labels stay unmoved. */
export function placeLabels(spec: FlowwrapSpec, ids: string[]): LabelBatchResult {
  const wanted = new Set(ids)
  let boxes = [...(spec.attributeBoxes ?? [])]
  const placed: string[] = [], skipped: LabelBatchResult["skipped"] = []
  for (const box of spec.attributeBoxes ?? []) {
    if (!wanted.has(box.id)) continue
    const result = getLabelPlacement(spec, box.id, boxes)
    if (result.enabled === true) {
      boxes = boxes.map(item => item.id === box.id ? result.box : item)
      placed.push(box.id)
    } else skipped.push({ id: box.id, reason: result.reason })
  }
  return { spec: placed.length ? { ...spec, attributeBoxes: boxes } : spec, placed, skipped }
}

export const labelFootprint = (box: AttributeBoxSpec) => rotatedRect(box, box.rotation ?? 0)
