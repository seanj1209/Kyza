import type { FlowwrapSpec, HangerSlotSpec } from "../../../apps/web/src/types/flowwrap"
import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"
import { getHangerSlotAxisX, getHangerSlotHalfHeight, HANGER_SLOT_SIDE_CLEARANCE_MM } from "../../../apps/web/src/constraints/hangerSlots"

/** The sideways cutter hangs from its left/right edges; slots start halfway down the pack. */
export function getDefaultHangerSlotPosition(spec: FlowwrapSpec, slot: HangerSlotSpec) {
  const { liveRect } = resolveFlowwrapGeometry(spec)
  const halfHeight = getHangerSlotHalfHeight(slot)
  return {
    centerX: getHangerSlotAxisX(slot, liveRect.width, liveRect.x),
    centerY: Math.max(halfHeight, Math.min(liveRect.height - halfHeight, liveRect.height / 2))
  }
}

/** Repair only the recognisable old automatic placements on load, never TAC holes or custom positions. */
export function restoreLegacyHangerSlotPlacement(spec: FlowwrapSpec): FlowwrapSpec {
  let changed = false
  const { liveRect } = resolveFlowwrapGeometry(spec)
  const hangerSlots = spec.hangerSlots?.map(slot => {
    if (slot.purpose === "tac-hole" || slot.placementVersion === 4) return slot
    const halfHeight = getHangerSlotHalfHeight(slot)
    const legacyY = Math.min(Math.max(halfHeight, liveRect.height - halfHeight),
      Math.max(halfHeight, Math.max(halfHeight + HANGER_SLOT_SIDE_CLEARANCE_MM, liveRect.height * .15)))
    const oldAxis = [.10, .25].some(ratio => Math.abs(slot.centerX - liveRect.width * ratio) < .001)
    const previousEdgeAxis = getHangerSlotAxisX(slot, liveRect.width) - liveRect.x
    const v3Automatic = slot.placementVersion === 3 && Math.abs(slot.centerX - previousEdgeAxis) < .001
    const automatic = slot.mirrored && (v3Automatic || oldAxis) && Math.abs(slot.centerY - (slot.placementVersion ? liveRect.height / 2 : legacyY)) < .001
    if (!automatic) return slot
    changed = true
    return { ...slot, ...getDefaultHangerSlotPosition(spec, slot), placementVersion: 4 as const }
  })
  return changed ? { ...spec, hangerSlots } : spec
}
