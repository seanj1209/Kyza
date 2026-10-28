import type { AttributeBoxSpec, FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { getPackModule } from "../apps/web/src/packs"
import { resolveSachetLayout, resolveSachetMeasureSegments } from "../apps/web/src/core/geometry/resolvers/resolveSachetLayout"
import { resolveSachetEyemarkPlacements } from "../apps/web/src/core/geometry/resolvers/resolveSachetEyemarkPlacement"
import {
  getMinimumSealClearanceMm,
  DEFAULT_SEAL_CLEARANCE_MM,
  SACHET_MIN_SEAL_CLEARANCE_MM,
  validateFlowwrapSpec
} from "../apps/web/src/constraints/flowwrap"
import { DEFAULT_EYEMARK_EDGE_CLEARANCE_MM } from "../apps/web/src/geometry/eyemarkPlacement"
import { getSafeZoneFit } from "../packages/cutter-engine/actions/safeZoneFit"
import { resolveFlowwrapGeometry } from "../apps/web/src/geometry/flowwrapGeometry"
import { resolveDoyLayout } from "../apps/web/src/core/geometry/resolvers/resolveDoyLayout"
import { resolveKSealPouchGeometry } from "../apps/web/src/geometry/kSealPouchGeometry"
import { getLabelPlacement, getPanelSlots, placeLabels } from "../packages/cutter-engine/actions/labelPlacement"
import { createPackValidator } from "../apps/web/src/engines/validation-engine/createPackValidator"
import { validateForExport } from "../packages/cutter-engine/validation"
import { projectFromLegacySpec } from "../packages/cutter-engine/project"
import { eyemarkPositionActions, positionEyemarks } from "../packages/cutter-engine/actions/eyemarkPosition"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const near = (a: number, b: number, tolerance = 1e-6) => Math.abs(a - b) <= tolerance
const pack = (id: string) => {
  const module = getPackModule(id)
  assert(module, `Missing pack ${id}`)
  return module.getDefaults()
}
const withSachet = (spec: FlowwrapSpec, sachet: Partial<NonNullable<FlowwrapSpec["sachet"]>>): FlowwrapSpec => ({ ...spec, sachet: { ...spec.sachet!, ...sachet } })

// --- 3SS defaults: Left trim 8 mm, one existing-convention 5 x 5 mm eyemark ---------------
const s3 = pack("sachet-3-side-seal")
assert(s3.sachet?.trimPosition === "left", "3SS must default to Left trim (Amends v12).")
assert(s3.sachet?.trimWidth === 8, "3SS must default to an 8 mm trim width.")
assert(s3.eyeMarks?.count === 1, "3SS must start with one eyemark.")
assert(s3.eyeMarks?.width === 5 && s3.eyeMarks?.height === 5, "3SS keeps its existing 5 x 5 mm eyemark dimensions.")
assert(DEFAULT_EYEMARK_EDGE_CLEARANCE_MM === 1.5, "Eyemark edge clearance remains 1.5 mm.")
const s3Eye = resolveSachetEyemarkPlacements(s3)
assert(s3Eye.mode === "trim" && s3Eye.placements.length === 1, "3SS resolves one trim eyemark.")
const s3Mark = s3Eye.placements[0]
assert(near(s3Mark.rect.x - s3Eye.frame.originX, 1.5), "The eyemark sits 1.5 mm from the outer edge of the trim cutter.")
assert(s3Mark.rect.x + s3Mark.rect.width <= s3Eye.frame.originX + 8, "The default eyemark stays inside the 8 mm trim.")
assert(s3Mark.status === "ok", "Default 3SS eyemark placement validates.")

const right = resolveSachetEyemarkPlacements(withSachet({ ...s3, eyeMarks: { ...s3.eyeMarks!, position: "top-right" } }, { trimPosition: "right" }))
const rightContentEdge = right.content.x + right.content.width
assert(near(rightContentEdge - (right.placements[0].rect.x + right.placements[0].rect.width), 1.5), "Right trim: mark is 1.5 mm from the outer right trim edge.")
assert(right.placements[0].status === "ok", "Right trim mark sits inside the right trim band (regression: it used to overlap the last step).")
const multiRight = resolveSachetEyemarkPlacements(withSachet({ ...s3, eyeMarks: { ...s3.eyeMarks!, position: "top-right" } }, { trimPosition: "right", stepEnabled: true, stepCount: 3 }))
assert(multiRight.placements[0].status === "ok", "Right trim sits on the outermost step when stepping.")
assert(resolveSachetEyemarkPlacements(withSachet(s3, { trimWidth: 0 })).placements[0].status === "no-zone", "Without trim the mark is reported as unchecked, not silently passed.")
const outside = resolveSachetEyemarkPlacements({ ...s3, eyeMarks: { ...s3.eyeMarks!, offsetX: 20 } })
assert(outside.placements[0].status === "outside-zone", "A mark dragged out of the trim band is flagged.")

// Established count rule still applies.
const validate3ss = createPackValidator("sachet-3-side-seal")
assert(!validate3ss(s3).errors.some(error => /eyemark/i.test(error)), "Default 3SS eyemark count is valid for Left trim.")

// --- The pack-specific eyemark warning is replaced by real placement checks --------------
const timestamp = "2026-10-17T00:00:00.000Z"
const project = (packType: string, spec: FlowwrapSpec, id: string) => projectFromLegacySpec(packType, "Amends v12", spec, { id, createdAt: timestamp, updatedAt: timestamp })
const codes = (packType: string, spec: FlowwrapSpec, id: string) => validateForExport(project(packType, spec, id)).messages.map(message => message.code)
assert(!codes("sachet-3-side-seal", s3, "v12-3ss").includes("EYEMARK_POSITION_UNRESOLVED"), "3SS no longer reports 'pack-specific position geometry not exposed'.")
assert(!codes("sachet-3-side-seal", s3, "v12-3ss-ok").some(code => code.startsWith("SACHET_EYEMARK")), "A correctly placed 3SS mark raises no sachet eyemark finding.")
assert(codes("sachet-3-side-seal", { ...s3, eyeMarks: { ...s3.eyeMarks!, offsetX: 20 } }, "v12-3ss-out").includes("SACHET_EYEMARK_OUTSIDE_TRIM"), "A 3SS mark outside the trim band is reported.")
const s4 = pack("sachet-4-side-seal")
assert(!codes("sachet-4-side-seal", s4, "v12-4ss").includes("EYEMARK_POSITION_UNRESOLVED"), "4SS pairs are validated from their real placement.")
assert(codes("sachet-4-side-seal", { ...s4, eyeMarks: { ...s4.eyeMarks!, offsetX: 6 } }, "v12-4ss-off").includes("SACHET_EYEMARK_LANE_ALIGNMENT"), "A 4SS pair off the lane boundary is reported.")
assert(codes("flowwrap", pack("flowwrap"), "v12-flowwrap").every(code => code !== "SACHET_EYEMARK_OUTSIDE_TRIM"), "Other packs are unaffected.")

// --- Trim and overall measurements, single and multi step --------------------------------
const segments = (spec: FlowwrapSpec) => {
  const layout = resolveSachetLayout(spec)
  return resolveSachetMeasureSegments(layout.measureMeta, layout.stepEnabled)
}
const single = segments(s3)
const overall1 = single.find(item => item.role === "overall")
assert(overall1 && overall1.value === 76 + 8, "Single step: overall width appears and includes the left trim (84 mm).")
const trim1 = single.find(item => item.role === "trim")
assert(trim1 && trim1.x1 === overall1.x1 && trim1.x2 - trim1.x1 === 8 && trim1.side === "left", "Trim dimension runs from the outer cutter edge to the trim's inner boundary.")
assert(!single.some(item => item.role === "lane"), "Single step shows no per-lane dimension.")
const multi = segments(withSachet(s3, { stepEnabled: true, stepCount: 3 }))
assert(multi.find(item => item.role === "overall")?.value === 3 * 76 + 8, "Multi step: overall width spans every step plus trim (236 mm).")
const lanes = multi.filter(item => item.role === "lane")
assert(lanes.length === 3 && lanes[0].x1 === trim1.x2, "Lanes start at the trim's inner boundary.")
const both = segments(withSachet(s3, { trimPosition: "both", stepEnabled: true, stepCount: 2 }))
const bothOverall = both.find(item => item.role === "overall")!
const bothTrims = both.filter(item => item.role === "trim")
assert(bothOverall.value === 2 * 76 + 16, "Both trims are included in the overall width.")
assert(bothTrims.length === 2 && bothTrims[1].x2 === bothOverall.x2 && bothTrims[1].x2 - bothTrims[1].x1 === 8, "Right trim dimension ends at the outer right edge.")
const rightSingle = segments(withSachet(s3, { trimPosition: "right" }))
assert(rightSingle.find(item => item.role === "trim")?.x2 === rightSingle.find(item => item.role === "overall")?.x2, "Right trim measures to the outer edge on a single step.")

// --- 3SS / 4SS seal clearance: 1 mm or more, pack scoped ---------------------------------
assert(SACHET_MIN_SEAL_CLEARANCE_MM === 1, "Sachet minimum seal clearance is 1 mm.")
assert(getMinimumSealClearanceMm(s3) === 1 && getMinimumSealClearanceMm(s4) === 1, "3SS and 4SS allow 1 mm clearance.")
assert(getMinimumSealClearanceMm(pack("flowwrap")) === 5 && getMinimumSealClearanceMm(pack("pillow-pack"),"pillow-pack") === 3, "Pillow permits 3 mm; general packs keep the 5 mm minimum.")
assert(s3.sealClearance === 1 && s4.sealClearance === 1, "3SS and 4SS default to 1 mm clearance.")
assert(!validateFlowwrapSpec({ ...s3, sealClearance: 1 }).errors.some(error => /Seal clearance/.test(error)), "1 mm is valid for 3SS.")
assert(validateFlowwrapSpec({ ...s3, sealClearance: 0.5 }).errors.includes("Seal clearance must be at least 1mm."), "Below 1 mm is rejected for sachets.")
assert(validateFlowwrapSpec({ ...pack("flowwrap"), sealClearance: 1 }).errors.includes("Seal clearance must be at least 5mm."), "Flowwrap still requires 5 mm.")

const zone = { id: "fit-zone", label: "Fit", x: 20, y: 20, width: 20, height: 20, enabled: true }
for (const clearance of [1, 2.5]) {
  const fit = getSafeZoneFit({ ...s3, sealClearance: clearance, safeZones: [zone] }, "fit-zone")
  assert(fit.enabled === true, `Fit is available at ${clearance} mm.`)
  assert(fit.clearance === clearance, "Fit uses the configured seal clearance, not a fixed 5 mm.")
  assert(near(fit.zone.y, clearance), `Fitted zone keeps ${clearance} mm from the top seal.`)
  assert(near(90 - (fit.zone.y + fit.zone.height), clearance), `Fitted zone keeps ${clearance} mm from the bottom seal.`)
  const warnings = validateFlowwrapSpec({ ...s3, sealClearance: clearance, safeZones: [fit.zone] }).warnings ?? []
  assert(!warnings.some(warning => /Safe zone/.test(warning)), `A zone fitted at ${clearance} mm does not raise a clearance warning.`)
}
const flowwrapZoneWarning = validateFlowwrapSpec({ ...pack("flowwrap"), safeZones: [{ ...zone, x: 1, y: 1 }] }).warnings ?? []
assert(flowwrapZoneWarning.some(warning => /Safe zone/.test(warning)), "Flowwrap safe-zone clearance rule is unchanged.")

// Updates V1: Fit stays on the production panel, outside the DOY gusset and K arms.
const doy = pack("doy-pouch")
const doyFlow = resolveFlowwrapGeometry(doy)
const doyBounds = resolveDoyLayout(doy, 0, doyFlow.liveRect.x, doyFlow.liveRect.width, doy.width)!
const doyFit = getSafeZoneFit({ ...doy, safeZones: [zone] }, zone.id)
assert(doyFit.enabled && doyFit.zone.fitContour === "doy-left", "DOY Fit uses the left panel contour.")
assert(doyFit.zone.fitOutline!.length > 30 && doyFit.zone.x + doyFit.zone.width + doyFlow.liveRect.x < doyBounds.arcLeftX + .75*doyBounds.arcInsetDepth, "DOY contour follows the inset arc.")
const doyRightZone = { ...zone, x: doyFlow.liveRect.width - 30 }
const doyRightFit = getSafeZoneFit({ ...doy, safeZones: [doyRightZone] }, zone.id)
assert(doyRightFit.enabled && doyRightFit.zone.fitContour === "doy-right", "DOY Fit also selects the right panel.")
assert(doyRightFit.zone.x + doyFlow.liveRect.x > doyBounds.arcRightX - .75*doyBounds.arcInsetDepth, "Right DOY Fit respects the inset arc.")
const kseal = pack("k-seal-pouch")
const kGeometry = resolveKSealPouchGeometry(kseal)
const kFit = getSafeZoneFit({ ...kseal, safeZones: [zone] }, zone.id)
assert(kFit.enabled && kFit.zone.fitContour === "kseal-left", "K-Seal Fit follows the left outer-arm panel.")
assert(kFit.zone.x + kFit.zone.width + kGeometry.liveX < kGeometry.leftBottomSealX, "K-Seal Fit stays outside the bottom seal.")
assert(kFit.zone.y === (kseal.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM), "K-Seal Fit spans the panel height with the entered clearance.")
const kRightZone = { ...zone, x: kGeometry.liveWidth - 30 }
const kRightFit = getSafeZoneFit({ ...kseal, safeZones: [kRightZone] }, zone.id)
assert(kRightFit.enabled && kRightFit.zone.fitContour === "kseal-right", "K-Seal Fit also selects the right arm panel.")

// --- Pack naming keeps ids compatible ----------------------------------------------------
const strip = getPackModule("paper-strip")
assert(strip?.name === "Strip Laminate" && strip.id === "paper-strip", "Paper Strip displays as Strip Laminate with an unchanged id.")

// --- Smart Place for labels ---------------------------------------------------------------
const label = (id: string, labelKey: string, x = 20, y = 30): AttributeBoxSpec => ({ id, kind: "label", labelKey, label: labelKey, x, y, width: 16, height: 6, enabled: true })
const withLabels = (spec: FlowwrapSpec, labels: AttributeBoxSpec[]): FlowwrapSpec => ({ ...spec, attributeBoxes: [...(spec.attributeBoxes ?? []), ...labels] })
const sealSpec = withLabels(s3, [label("sa1", "seal-area", 30, 2), label("sa2", "seal-area", 30, 85), label("sa3", "seal-area", 2, 40), label("sa4", "seal-area", 66, 40), label("sa5", "seal-area"), label("ts", "top-seal")])
const sealResult = placeLabels(sealSpec, ["sa5", "ts", "sa4", "sa3", "sa2", "sa1"])
const box = (spec: FlowwrapSpec, id: string) => spec.attributeBoxes!.find(item => item.id === id)!
assert(sealResult.placed.join() === "sa1,sa2,sa3,sa4", "Four seal-area labels fill the four seals in spec order.")
const top = box(sealResult.spec, "sa1"), leftSeal = box(sealResult.spec, "sa3")
assert(top.placedSlot === "top" && near(top.x + top.width / 2, 35) && near(top.y + top.height / 2, -2.5) && (top.rotation ?? 0) === 0, "Top seal label is squared and centred in the top seal.")
assert(top.height <= 5, "A label never exceeds its seal band.")
assert(leftSeal.placedSlot === "left" && leftSeal.rotation === 90 && near(leftSeal.x + leftSeal.width / 2, -1.5) && near(leftSeal.y + leftSeal.height / 2, 45), "Side seal label runs along and is centred in the left seal.")
assert(box(sealResult.spec, "sa5").x === 20 && box(sealResult.spec, "sa5").placedSlot === undefined, "A fifth seal label stays unmoved.")
assert(sealResult.skipped.find(item => item.id === "sa5")?.reason === "All four seals already have a label. This label was left where it is.", "The fifth label explains why it was not moved.")
assert(/top seal already has a label/.test(sealResult.skipped.find(item => item.id === "ts")!.reason), "A top-seal label never shares an occupied top seal.")
assert(JSON.stringify(placeLabels(sealResult.spec, sealResult.placed).spec) === JSON.stringify(sealResult.spec), "Place is repeatable: running it again changes nothing.")
const unrelated = sealResult.spec.attributeBoxes!.filter(item => item.kind !== "label")
assert(JSON.stringify(unrelated) === JSON.stringify(sealSpec.attributeBoxes!.filter(item => item.kind !== "label")), "Place never moves unrelated artwork elements.")

// FOP/BOP: two vertical folds give one front slot and two back slots.
const pillow = pack("pillow-pack")
const panels = getPanelSlots(pillow)
assert(panels && panels.fop.length === 1 && panels.bop.length === 2, "Pillow Pack exposes one FOP and two BOP panels from its folds.")
const panelResult = placeLabels(withLabels(pillow, [label("fop1", "fop"), label("fop2", "fop"), label("bop1", "bop"), label("bop2", "bop")]), ["fop1", "fop2", "bop1", "bop2"])
assert(panelResult.placed.join() === "fop1,bop1,bop2", "FOP x1 and BOP x2 are placed; a second FOP is not.")
assert(box(panelResult.spec, "fop1").placedSlot === "front" && box(panelResult.spec, "bop1").placedSlot === "back-left" && box(panelResult.spec, "bop2").placedSlot === "back-right", "Each label lands in its own panel.")
const front = panels.fop[0].area, fop1 = box(panelResult.spec, "fop1")
assert(fop1.x >= front.x && fop1.x + fop1.width <= front.x + front.width, "FOP stays inside the front panel and its clearance.")
assert(/front panel already has an FOP/.test(panelResult.skipped[0].reason), "The extra FOP explains why it was not moved.")
const flowwrapFop = getLabelPlacement(withLabels(pack("flowwrap"), [label("f", "fop")]), "f")
assert(flowwrapFop.enabled === false && /two vertical fold lines/.test(flowwrapFop.reason), "FOP/BOP Place is disabled without the fold structure.")
assert(getLabelPlacement(withLabels(pack("doy-pouch"), [label("d", "seal-area")]), "d").enabled === false, "Curved-seal packs do not offer Place.")
assert(getLabelPlacement(withLabels(s3, [label("t", "text-this-way")]), "t").enabled === false, "Unsupported label types are not moved.")
const unplacedBlocker = placeLabels(withLabels(pillow, [label("fopA", "fop"), label("fopB", "fop")]), ["fopB"])
assert(unplacedBlocker.placed.join() === "fopB", "An unplaced label never blocks a slot just by sitting in it.")

const displacedS4 = { ...s4, eyeMarks: { ...s4.eyeMarks!, offsetX: 7, offsetY: -4, manualPositioned: true } }
assert(eyemarkPositionActions(displacedS4, "sachet-4-side-seal").join() === "centre", "4SS exposes Centre only, never Fit or position presets.")
const centredS4 = positionEyemarks(displacedS4, "centre", "sachet-4-side-seal")
assert(centredS4?.eyeMarks?.offsetX === 0 && centredS4.eyeMarks.offsetY === 0, "4SS Centre clears paired-mark displacement.")
assert(positionEyemarks(displacedS4, "top", "sachet-4-side-seal") === null, "4SS rejects non-centre positioning actions.")
assert(positionEyemarks(centredS4!, "centre", "sachet-4-side-seal") === null, "Centre becomes unavailable once the paired mark is centred.")

console.log("Amends v12: 3SS defaults/eyemark, sachet eyemark validation, trim and overall measures, 1 mm sachet clearance and Fit, Strip Laminate, and label Place passed.")
