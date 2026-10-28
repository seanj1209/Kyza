import { getHangerSlotTransform, hangerSlotPath } from "../apps/web/src/geometry/hangerSlotShapes"
import { getHangerSlotAxisX } from "../apps/web/src/constraints/hangerSlots"
import { getDefaultHangerSlotPosition, restoreLegacyHangerSlotPlacement } from "../packages/cutter-engine/actions/hangerSlotPlacement"
import { projectFromLegacySpec } from "../packages/cutter-engine/project"
import { synchroniseCutNFlowProject } from "../apps/web/src/project/projectUpdateService"
import type { FlowwrapSpec, HangerSlotSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const transform = getHangerSlotTransform(120, 45, 30, 10)

assert(
  transform === "translate(120 45) rotate(-90) scale(30 10)",
  "hanger silhouettes must rotate before non-uniform scaling"
)
assert(
  transform.indexOf("rotate(-90)") < transform.indexOf("scale(30 10)"),
  "rotation must be in silhouette coordinates, not screen coordinates"
)
assert(
  getHangerSlotTransform(120, 45, 30, 10, true) === "translate(120 45) rotate(-90) scale(30 -10)",
  "BOP Euro slots mirror horizontally while keeping their upright orientation."
)



const standardPath = hangerSlotPath("standard-euro-slot")
assert(/^M -.4 .5/.test(standardPath), "standard silhouette path changed unexpectedly")
assert(
  !standardPath.includes("rotate") && !standardPath.includes("scale"),
  "orientation belongs in the transform and must not mutate the source silhouette"
)

console.log("Hanger slot orientation regression checks passed.")

const spec = { width: 530, height: 210, seal: 10, seals: { left: 10, right: 10, top: 10, bottom: 10 }, bleed: 3, sealClearance: 5 } as FlowwrapSpec
const slot: HangerSlotSpec = { id: "old-auto", type: "hanger-slot", subtype: "standard-euro-slot", diameter: 10, width: 30, height: 10, centerX: 127.5, centerY: 28.5, mirrored: true }
const centred = getDefaultHangerSlotPosition(spec, slot)
assert(Math.abs(centred.centerX - 21.8) < .001 && centred.centerY === 95, "Slots start at the side edge and halfway down the live pack, matching the amendment screenshot.")
const old = { ...spec, hangerSlots: [slot] }
const restored = restoreLegacyHangerSlotPlacement(old)
assert(Math.abs(restored.hangerSlots![0].centerX - 21.8) < .001 && restored.hangerSlots![0].centerY === 95, "Known quarter-width/top-biased defaults are repaired.")
assert(restoreLegacyHangerSlotPlacement(restored) === restored, "Placement repair runs once.")
for (const variant of [{ ...slot, centerY: 70 }, { ...slot, purpose: "tac-hole" as const }, { ...slot, placementVersion: 4 as const }]) {
  const kept = restoreLegacyHangerSlotPlacement({ ...spec, hangerSlots: [variant] }).hangerSlots![0]
  assert(kept.centerX === variant.centerX && kept.centerY === variant.centerY, "Manual positions, TAC holes and already-versioned positions must be preserved.")
}
assert(restored.hangerSlots![0].width === 30 && restored.hangerSlots![0].height === 10 && restored.hangerSlots![0].id === slot.id, "Repair preserves shape size and identity.")
const project = projectFromLegacySpec("flowwrap", "Old automatic hanger placement", old)
const loaded = synchroniseCutNFlowProject(project, "save-load")
assert(loaded.ok && loaded.legacySpec!.hangerSlots![0].centerY === 95 && loaded.revision! > project.revision, "Loading repairs the authoritative project with a new revision, not only its SVG.")
const loadedAgain = synchroniseCutNFlowProject(loaded.project!, "save-load")
assert(loadedAgain.revision === loaded.revision, "A second load must not create another revision.")
console.log("Hanger default centring, saved-project repair, manual/TAC preservation and idempotent revision checks passed.")

assert(Math.abs(getHangerSlotAxisX(slot, 510, 10) - 21.8) < .001, "The rotated silhouette starts 15 mm from the cutter edge.")
const v2 = restoreLegacyHangerSlotPlacement({ ...spec, hangerSlots: [{ ...slot, centerX: 51, centerY: 95, placementVersion: 2 }] })
assert(v2.hangerSlots![0].placementVersion === 4 && Math.abs(v2.hangerSlots![0].centerX - 21.8) < .001, "Previous centred automatic positions also migrate.")

const oldV3 = restoreLegacyHangerSlotPlacement({ ...spec, hangerSlots: [{ ...slot, centerX: 11.8, centerY: 95, placementVersion: 3 }] })
assert(oldV3.hangerSlots![0].placementVersion === 4 && Math.abs(oldV3.hangerSlots![0].centerX - 21.8) < .001, "Outer-trim v3 defaults move 15mm inside the working edge.")
