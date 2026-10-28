import {
  LIDDING_EDGE_CLEARANCE_MM,
  MAX_LIDDING_AROUND_MM,
  liddingClearanceIssues,
  liddingEyemarkRects,
  liddingMinimumCutterSize,
  moveLiddingEyemark,
  resolveLiddingLayout,
  setLiddingOverallSize,
  syncLiddingCutterSize,
  updateLiddingSpec,
  validateLiddingSpec,
} from "../apps/web/src/constraints/lidding"
import { liddingPack } from "../apps/web/src/packs/liddingPack"
import { doyPouchPack } from "../apps/web/src/packs/doyPouchPack"
import { kSealPouchPack } from "../apps/web/src/packs/kSealPouchPack"
import { threeSideSealPouchPack, twoSideSealPouchPack } from "../apps/web/src/packs/amends7Packs"
import { resolveKSealLayout } from "../apps/web/src/core/geometry/resolvers/resolveKSealLayout"
import {
  clampPouchPreviewView,
  fitPouchPreviewElement,
  POUCH_PREVIEW_ROTATION,
  resolvePouchPreviewViewport,
} from "../apps/web/src/ui/pouchPreview"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { createCutterSpecFromConfirmedPackValues } from "../apps/web/src/packGen/packGenHandoff"

// Local assertions (the test build has no Node type definitions).
const assert = {
  ok(condition: unknown, message = "assertion failed") {
    if (!condition) throw new Error(message)
  },
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected) throw new Error(`${message ?? "equal"}: expected ${String(expected)}, got ${String(actual)}`)
  },
  deepEqual(actual: unknown, expected: unknown, message?: string) {
    const a = JSON.stringify(actual), b = JSON.stringify(expected)
    if (a !== b) throw new Error(`${message ?? "deepEqual"}: expected ${b}, got ${a}`)
  },
}

const close = (actual: number, expected: number, message: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: expected ${expected}, got ${actual}`)

// ── Lidding: outer green cutter edge = reel slit; 1.5 mm edge → eyemark → lid ──
const base = liddingPack.getDefaults()
const withMarks = (spec: FlowwrapSpec, marks: Partial<NonNullable<FlowwrapSpec["eyeMarks"]>>) =>
  syncLiddingCutterSize({ ...spec, eyeMarks: { ...spec.eyeMarks!, ...marks } })

// 180 mm lid + two 10 mm eyemarks → 206 mm minimum overall width.
const twoMarks = updateLiddingSpec(withMarks(base, { count: 2, width: 10, width2: 10, height: 5, height2: 5 }), { outerCutWidth: 180, outerCutHeight: 170 })
close(liddingMinimumCutterSize(twoMarks.lidding!, twoMarks.eyeMarks).width, 206, "180 mm lid with two 10 mm eyemarks")
close(twoMarks.width, 206, "default overall width is the minimum")
// 170 mm lid + 6 mm of buffers + one 5 mm eyemark → 181 mm minimum overall height.
const oneMark = updateLiddingSpec(withMarks(base, { count: 1, width: 10, height: 5 }), { outerCutWidth: 180, outerCutHeight: 170 })
close(oneMark.height, 181, "170 mm lid with one 5 mm eyemark")
close(twoMarks.height, 181, "both marks share the top band")
close(oneMark.width, 180 + 13 + 13, "one eyemark reserves matching bands to centre the lid")
assert.deepEqual(validateLiddingSpec(twoMarks).errors, [])

// Default eyemarks sit 1.5 mm inside the outer cutter edge with 1.5 mm to the lid.
const defaultLayout = resolveLiddingLayout(twoMarks)
assert.deepEqual(defaultLayout.eyemarks.map(mark => [mark.x, mark.y]), [[1.5, 1.5], [194.5, 1.5]])
close(defaultLayout.cells[0].x - (defaultLayout.eyemarks[0].x + 10), 1.5, "left eyemark → lid")
close(defaultLayout.eyemarks[1].x - (defaultLayout.cells[0].x + 180), 1.5, "lid → right eyemark")
close(defaultLayout.cells[0].y, (twoMarks.height - 170) / 2, "lid is centred vertically in the cutter")

// Overall 206 → 210 keeps the 180 mm lid; the extra 4 mm goes between the
// eyemarks and the lid, 2 mm each side; the eyemarks stay 1.5 mm from the edge.
const wider = setLiddingOverallSize(twoMarks, { width: 210 })
assert.deepEqual(validateLiddingSpec(wider).errors, [])
close(wider.width, 210, "overall width")
close(wider.lidding!.outerCutWidth, 180, "lid outer cut is unchanged")
const widerLayout = resolveLiddingLayout(wider)
close(widerLayout.cells[0].x, 15, "lid block centred in the extra width")
close(widerLayout.eyemarks[0].x, LIDDING_EDGE_CLEARANCE_MM, "left eyemark at the edge clearance")
close(210 - (widerLayout.eyemarks[1].x + 10), LIDDING_EDGE_CLEARANCE_MM, "right eyemark at the edge clearance")
close(widerLayout.cells[0].x - (widerLayout.eyemarks[0].x + 10), 3.5, "left gap grows by half the extra")
close(widerLayout.eyemarks[1].x - (widerLayout.cells[0].x + 180), 3.5, "right gap grows by half the extra")
const taller = setLiddingOverallSize(twoMarks, { height: 191 })
close(taller.lidding!.outerCutHeight, 170, "lid outer cut height is unchanged")
close(resolveLiddingLayout(taller).cells[0].y, (191 - 170) / 2, "extra height split above and below the lid")

// Changing eyemark size moves the minimum and validation with it.
const widerMark = withMarks(twoMarks, { width2: 15 })
close(widerMark.width, 216, "a 15 mm right eyemark lifts both symmetric side bands")
const tallerMark = withMarks(twoMarks, { height: 8, height2: 8 })
close(tallerMark.height, 184, "an 8 mm eyemark height lifts the minimum to 184 mm")
const keepsRequested = withMarks(wider, { width2: 12 })
close(keepsRequested.width, 210, "a requested overall width above the new minimum is kept")
close(keepsRequested.lidding!.outerCutWidth, 180, "eyemark changes never resize the lid")
const lifted = withMarks(wider, { width: 14, width2: 14 })
close(lifted.width, 214, "a requested overall width below the new minimum is lifted to it")
assert.deepEqual(validateLiddingSpec(lifted).errors, [])

// Invalid clearances are rejected.
const narrower = setLiddingOverallSize(twoMarks, { width: 205 })
close(narrower.width, 205, "a smaller cutter width is accepted")
assert.ok(narrower.lidding!.outerCutWidth < 180, "reducing cutter width scales down the lid")
assert.deepEqual(validateLiddingSpec(narrower).errors, [])
const shorter = setLiddingOverallSize(twoMarks, { height: 180 })
close(shorter.height, 180, "a smaller cutter height is accepted")
assert.ok(shorter.lidding!.outerCutHeight < 170, "reducing cutter height scales down the lid")
assert.deepEqual(validateLiddingSpec(shorter).errors, [])
const intoLid = { ...wider, eyeMarks: { ...wider.eyeMarks!, offsetX: 4 } }
assert.ok(liddingClearanceIssues(intoLid).some(issue => issue.includes("lid outer cut")), "a mark within 1.5 mm of the lid is flagged")
assert.ok(validateLiddingSpec(intoLid).errors.length > 0)
const offEdge = { ...wider, eyeMarks: { ...wider.eyeMarks!, offsetX: -1 } }
assert.ok(liddingClearanceIssues(offEdge).some(issue => issue.includes("cutter edge")), "a mark within 1.5 mm of the edge is flagged")

// Manual movement is allowed only inside the legal band.
const nudged = moveLiddingEyemark(wider, 0, 1.5, 20)
assert.deepEqual(liddingEyemarkRects(nudged)[0], { x: 3, y: 21.5, width: 10, height: 5 })
assert.deepEqual(validateLiddingSpec(nudged).errors, [])
const pushedIntoLid = moveLiddingEyemark(wider, 0, 50, 0)
close(liddingEyemarkRects(pushedIntoLid)[0].x + 10, 15 - 1.5, "left mark stops 1.5 mm before the lid")
const pushedOffEdge = moveLiddingEyemark(wider, 1, 50, -20)
close(210 - (liddingEyemarkRects(pushedOffEdge)[1].x + 10), 1.5, "right mark stops 1.5 mm inside the edge")
close(liddingEyemarkRects(pushedOffEdge)[1].y, 1.5, "mark stops 1.5 mm below the top edge")
assert.deepEqual(validateLiddingSpec(pushedIntoLid).errors, [])
assert.deepEqual(validateLiddingSpec(pushedOffEdge).errors, [])
// Narrowing the slit again pulls a moved mark back inside its band.
const narrowedAgain = setLiddingOverallSize(moveLiddingEyemark(wider, 0, 2, 0), { width: 206 })
assert.deepEqual(validateLiddingSpec(narrowedAgain).errors, [])

// Zero, one and two eyemarks follow the same rule.
const none = withMarks(twoMarks, { count: 0 })
close(none.width, 186, "no eyemarks: 1.5 + 1.5 each side")
close(none.height, 176, "no eyemarks: 1.5 + 1.5 top and bottom")
assert.deepEqual(liddingEyemarkRects(none), [])

// Repeats and the 790 mm Around limit are preserved.
const repeated = setLiddingOverallSize(updateLiddingSpec(twoMarks, { across: 2, around: 4 }), { width: 400 })
close(repeated.width, 800, "two 400 mm slit repeats across")
assert.equal(resolveLiddingLayout(repeated).cells.length, 8)
close(resolveLiddingLayout(repeated).cells[1].x - resolveLiddingLayout(repeated).cells[0].x, 400, "lid repeats stay pitched at the slit edge")
assert.ok(validateLiddingSpec(updateLiddingSpec(twoMarks, { around: 5 })).errors.some(error => error.includes(`${MAX_LIDDING_AROUND_MM}mm`)))

// Pack Gen handoff: finished size drives the lid outer cut; the slit is derived.
const handoff = createCutterSpecFromConfirmedPackValues({
  packType: "lidding", finishedWidthMm: 180, finishedHeightMm: 170,
  sealTopMm: 0, sealBottomMm: 0, sealLeftMm: 0, sealRightMm: 0, bleedMm: 2,
  eyemarkCount: 2, zipEnabled: false, minimumSafeZoneMm: 5, substrate: "clear",
}, "v82-lidding-handoff")
assert.ok(handoff.ok, `lidding handoff: ${"errors" in handoff ? handoff.errors.join(" ") : ""}`)
if (handoff.ok) {
  assert.equal(handoff.spec.lidding!.outerCutWidth, 180)
  assert.equal(handoff.spec.lidding!.outerCutHeight, 170)
  const handoffMarks = handoff.spec.eyeMarks!
  close(handoff.spec.width, 180 + 2 * 3 + handoffMarks.width + (handoffMarks.width2 ?? handoffMarks.width), "handoff slit width")
  close(handoff.spec.height, 170 + 6 + Math.max(handoffMarks.height, handoffMarks.height2 ?? handoffMarks.height), "handoff slit height")
  assert.deepEqual(validateLiddingSpec(handoff.spec).errors, [])
}

// ── Pouch Preview: FOP = left half, BOP = right half, outer edge → centre bottom-seal line ──
assert.equal(POUCH_PREVIEW_ROTATION.fop, 90, "FOP turns clockwise so its outer (left) edge is at the top")
assert.equal(POUCH_PREVIEW_ROTATION.bop, -90, "BOP turns anticlockwise so its outer (right) edge is at the top")

const doy = doyPouchPack.getDefaults()
const doyFop = resolvePouchPreviewViewport(null, doy, { face: "fop", showTrim: true })!
const doyBop = resolvePouchPreviewViewport(null, doy, { face: "bop", showTrim: true })!
// DOY default: 580 mm web from x = 80; bottom-seal midlines at 330 and 410.
assert.deepEqual([doyFop.outerX, doyFop.innerX, doyFop.x, doyFop.width], [80, 330, 80, 250])
assert.deepEqual([doyBop.outerX, doyBop.innerX, doyBop.x, doyBop.width], [660, 410, 410, 250])

const kseal = kSealPouchPack.getDefaults()
const ksealLayout = resolveKSealLayout(kseal)
const guide = (x: number) => ksealLayout.originX + x + ksealLayout.geometry.bottomSealAreaWidth / 2
const ksealFop = resolvePouchPreviewViewport(null, kseal, { face: "fop", showTrim: true })!
const ksealBop = resolvePouchPreviewViewport(null, kseal, { face: "bop", showTrim: true })!
close(ksealFop.innerX, guide(ksealLayout.geometry.leftBottomSealX), "K Seal FOP ends on the left bottom-seal guide")
close(ksealBop.innerX, guide(ksealLayout.geometry.rightBottomSealX), "K Seal BOP ends on the right bottom-seal guide")
close(ksealFop.outerX, ksealLayout.originX, "K Seal FOP starts at the left cutter edge")
close(ksealBop.outerX, ksealLayout.originX + ksealLayout.width, "K Seal BOP starts at the right cutter edge")
const ksealTrim = { ...kseal, kSealPouch: { ...kseal.kSealPouch!, trimEnabled: true } }
const ksealTrimLayout = resolveKSealLayout(ksealTrim)
const ksealNoTrim = resolvePouchPreviewViewport(null, ksealTrim, { face: "fop", showTrim: false })!
close(ksealNoTrim.outerX, ksealTrimLayout.originX + ksealTrimLayout.geometry.trimWidth, "hidden trim starts the face at the trim boundary")

for (const pack of [twoSideSealPouchPack, threeSideSealPouchPack]) {
  const spec = pack.getDefaults()
  const fop = resolvePouchPreviewViewport(null, spec, { face: "fop", showTrim: true })!
  const bop = resolvePouchPreviewViewport(null, spec, { face: "bop", showTrim: true })!
  const fopNoTrim = resolvePouchPreviewViewport(null, spec, { face: "fop", showTrim: false })!
  const bopNoTrim = resolvePouchPreviewViewport(null, spec, { face: "bop", showTrim: false })!
  // 38 mm canvas margin, 15 mm trim, 250 mm panel each side of the centre line.
  assert.deepEqual([fop.outerX, fop.innerX, bop.innerX, bop.outerX], [38, 303, 303, 568], pack.id)
  assert.deepEqual([fopNoTrim.outerX, bopNoTrim.outerX], [53, 553], pack.id)
  close(fop.faceHeight, spec.width, `${pack.id} face height`)
}

// The element takes the face's exact aspect ratio: no letterbox, no other face.
const fitted = fitPouchPreviewElement(doyFop, { width: 1000, height: 500 })
close(fitted.width / fitted.height, doyFop.width / doyFop.height, "fitted aspect")
assert.ok(fitted.width <= 500 + 1e-9 && fitted.height <= 1000 + 1e-9, "fits once turned")
// Zoom out / pan never leave the face.
assert.deepEqual(clampPouchPreviewView(doyFop, { x: 0, y: 0, width: doyFop.width * 2, height: doyFop.height * 2 }), { x: doyFop.x, y: doyFop.y, width: doyFop.width, height: doyFop.height })
const zoomed = clampPouchPreviewView(doyFop, { x: doyFop.x + 400, y: doyFop.y, width: doyFop.width / 2, height: doyFop.height / 2 })
close(zoomed.x + zoomed.width, doyFop.x + doyFop.width, "panning stops at the bottom-seal line")

console.log("AMENDS 8.2 lidding cutter structure and pouch preview face bounds verified.")
