import { resolveFlowwrapLayout } from "../apps/web/src/core/geometry/resolvers/resolveFlowwrapLayout"
import { createPackValidator } from "../apps/web/src/engines/validation-engine"
import { getPackModule } from "../apps/web/src/packs"
import { positionEyemarks } from "../packages/cutter-engine/actions/eyemarkPosition"
import { resolveKSealLayout } from "../apps/web/src/core/geometry/resolvers/resolveKSealLayout"
import { liddingEyemarkInstances, liddingRepeatRows, syncLiddingCutterSize, updateLiddingSpec, validateLiddingSpec } from "../apps/web/src/constraints/lidding"
import { addLegendPreset, loadLegendConfig, saveLegendConfig } from "../apps/web/src/klyro/legendConfig"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

const doyDefaults = getPackModule("doy-pouch")?.getDefaults()
if (!doyDefaults?.doyPouch) throw new Error("Missing DOY pouch defaults.")
assert(doyDefaults.doyPouch.trimEnabled === false, "DOY trim must be disabled on a fresh load.")

const doyWithoutTrim = resolveFlowwrapLayout(doyDefaults)
const doyWithTrim = resolveFlowwrapLayout({
  ...doyDefaults,
  doyPouch: { ...doyDefaults.doyPouch, trimEnabled: true, trim: 15 }
})
assert(
  doyWithTrim.cutterWidth === doyWithoutTrim.cutterWidth + 30,
  "Enabled DOY trim must expand the outer cutter width by 15 mm on each side."
)
assert(
  doyWithTrim.liveOriginX === doyWithoutTrim.liveOriginX + 15,
  "The DOY pouch body must start inward of the left outer trim band."
)
assert(
  doyWithTrim.liveWidth === doyWithoutTrim.liveWidth,
  "Outer trim must not consume or expand the pouch body width."
)

const sachetDefaults = getPackModule("sachet-3-side-seal")?.getDefaults()
if (!sachetDefaults) throw new Error("Missing 3SS sachet defaults.")
const validate3ss = createPackValidator("sachet-3-side-seal")
const countIssue = "3-side sachet with Left or Right trim requires exactly one eyemark."
const bothIssue = "3-side sachet with Both trim requires one or two eyemarks."
assert(
  !validate3ss({ ...sachetDefaults, eyeMarks: { ...sachetDefaults.eyeMarks!, count: 1 }, sachet: { ...sachetDefaults.sachet!, trimPosition: "left" } }).errors.includes(countIssue),
  "Left trim with one eyemark must be valid."
)
assert(
  validate3ss({ ...sachetDefaults, eyeMarks: { ...sachetDefaults.eyeMarks!, count: 2 }, sachet: { ...sachetDefaults.sachet!, trimPosition: "right" } }).errors.includes(countIssue),
  "Right trim with two eyemarks must be invalid."
)
assert(
  validate3ss({ ...sachetDefaults, eyeMarks: { ...sachetDefaults.eyeMarks!, count: 0 }, sachet: { ...sachetDefaults.sachet!, trimPosition: "both" } }).errors.includes(bothIssue),
  "Both trim with zero eyemarks must be invalid."
)
assert(
  !validate3ss({ ...sachetDefaults, eyeMarks: { ...sachetDefaults.eyeMarks!, count: 2 }, sachet: { ...sachetDefaults.sachet!, trimPosition: "both" } }).errors.includes(bothIssue),
  "Both trim with two eyemarks must be valid."
)

const flowwrapDefaults = getPackModule("flowwrap")?.getDefaults()
if (!flowwrapDefaults) throw new Error("Missing flowwrap defaults.")
const actualRight = {
  ...flowwrapDefaults,
  eyeMarks: {
    ...flowwrapDefaults.eyeMarks!,
    count: 1 as const,
    position: "top-right" as const,
    manualPositioned: true,
    offsetX: -1
  }
}
const repositionedRight = positionEyemarks(actualRight, "bottom", "flowwrap")
assert(
  repositionedRight?.eyeMarks?.position === "bottom-right",
  "A negative anchor-relative offset must not flip an actually right-side flowwrap eyemark when moving vertically."
)

const kSealDefaults = getPackModule("k-seal-pouch")?.getDefaults()
if (!kSealDefaults?.kSealPouch) throw new Error("Missing K Seal defaults.")
const kSealLayout = resolveKSealLayout(kSealDefaults)
assert(kSealLayout.topMeasureSegments.length === 2, "K Seal must replace the old three-part top submeasure row with two pack-height spans.")
const [leftPackHeight, rightPackHeight] = kSealLayout.topMeasureSegments
assert(leftPackHeight.startX === kSealLayout.originX, "Left K Seal pack height must start at the cutter edge.")
assert(rightPackHeight.endX === kSealLayout.originX + kSealLayout.width, "Right K Seal pack height must end at the cutter edge.")
assert(leftPackHeight.endX === kSealLayout.originX + kSealLayout.geometry.leftFoldX, "Left K Seal pack height must end on the bottom-seal centre line.")
assert(rightPackHeight.startX === kSealLayout.originX + kSealLayout.geometry.rightFoldX, "Right K Seal pack height must start on the bottom-seal centre line.")
assert(kSealLayout.featureMeasureSegments.some(segment => segment.row === "bottom"), "K Seal must expose its DOY-style bottom submeasures.")
assert(kSealLayout.heightMeasureSegments.length === 3, "K Seal must expose the vertical seal and panel submeasures.")

const liddingDefaults = getPackModule("lidding")?.getDefaults()
if (!liddingDefaults?.lidding || !liddingDefaults.eyeMarks) throw new Error("Missing Lidding defaults.")
const multipackBase = updateLiddingSpec({
  ...liddingDefaults,
  eyeMarks: { ...liddingDefaults.eyeMarks, count: 2, position: "top" },
}, { around: 4, multipack: true, multipackSingleSide: "right" })
for (const position of ["top", "centre", "bottom"] as const) {
  const spec = syncLiddingCutterSize({ ...multipackBase, eyeMarks: { ...multipackBase.eyeMarks!, position } })
  const rows = liddingRepeatRows(spec.lidding!, spec.eyeMarks)
  const instances = liddingEyemarkInstances(spec)
  const single = instances.filter(instance => instance.sideIndex === 1)
  const repeated = instances.filter(instance => instance.sideIndex === 0)
  const repeatHeight = rows.at(-1)!.top + rows.at(-1)!.height
  assert(single.length === 1, `Multipack ${position} must keep one eyemark on the selected single side.`)
  assert(repeated.length === 4, `Multipack ${position} must keep one eyemark in every cutter on the repeated side.`)
  if (position === "top") assert(single[0].rect.y === 1.5, "Top single eyemark must stay at the top of the complete repeat.")
  if (position === "centre") assert(single[0].rect.y + single[0].rect.height / 2 === repeatHeight / 2, "Mid single eyemark must centre on the complete repeat.")
  if (position === "bottom") assert(single[0].rect.y + single[0].rect.height === repeatHeight - 1.5, "Bottom single eyemark must sit at the bottom of the complete repeat.")
  assert(validateLiddingSpec(spec).errors.length === 0, `Multipack ${position} positions must validate.`)
}
const switched = updateLiddingSpec(multipackBase, { multipackSingleSide: "left" })
assert(switched.eyeMarks?.position === multipackBase.eyeMarks?.position, "Switching multipack sides must preserve the selected top/mid/bottom position.")

const memory = new Map<string, string>()
const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value) } }
const legend = addLegendPreset(loadLegendConfig(storage))
legend.presets.find(preset => preset.id === legend.activePresetId)!.name = "Customer proof"
assert(saveLegendConfig(legend, storage), "Legend preset must save locally.")
assert(loadLegendConfig(storage).presets.some(preset => preset.name === "Customer proof"), "Saved Legend presets must reload.")

console.log("Amends v10 DOY trim, 3SS eyemark-count, and eyemark-side regressions passed.")
