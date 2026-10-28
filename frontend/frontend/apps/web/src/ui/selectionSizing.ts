import type { FlowwrapSpec } from "../types/flowwrap"
import { constrainPouchSafeZone } from "../../../../packages/cutter-engine/actions/safeZoneContours"

/** Exact values from the Size menu are not rounded like pointer resize steps. */
export function sizeSelectedElement(spec: FlowwrapSpec, id: string, width: number, height: number): FlowwrapSpec | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (id.startsWith("safe-zone:")) {
    const target = spec.safeZones?.find(zone => zone.id === id.slice(10))
    if (!target || width < 1 || height < 1) return null
    const sized = constrainPouchSafeZone(spec, target, { ...target, width, height })
    if (Math.abs(sized.width - width) > .0001 || Math.abs(sized.height - height) > .0001) return null
    return { ...spec, safeZones: spec.safeZones!.map(zone => zone.id === target.id ? sized : zone) }
  }
  if (id.startsWith("window:")) {
    const target = spec.windows?.find(win => win.id === id.slice(7))
    if (!target || width < 5 || height < 5) return null
    if (target.shape === "circle" && Math.abs(width - height) > .0001) return null
    if (target.shape === "half-circle" && Math.abs(width - 2 * height) > .0001) return null
    return { ...spec, windows: spec.windows!.map(win => win.id === target.id ? { ...win, width, height } : win) }
  }
  if (id.startsWith("attribute-box:")) {
    const target = spec.attributeBoxes?.find(box => box.id === id.slice(14))
    if (!target || !["barcode", "qr", "bbe"].includes(target.kind) || width < 1 || height < 1) return null
    return { ...spec, attributeBoxes: spec.attributeBoxes!.map(box => box.id === target.id ? { ...box, width, height } : box) }
  }
  return null
}
