import { getPackModule } from "../apps/web/src/packs"
import {
  createKSealEyemarkDefaults,
  reconcileKSealDualEyemarksForTrim
} from "../apps/web/src/rules/kSealEyemarkRules"
import { updateCutNFlowProject } from "../apps/web/src/project/projectUpdateService"
import { buildValidationCentreSummary } from "../apps/web/src/validation/validationCentre"
import { getStructuredValidationState } from "../apps/web/src/validation/activeValidation"
import { applyCutterValidationFix } from "../packages/cutter-engine/actions/validationFixes"
import { positionEyemarks } from "../packages/cutter-engine/actions/eyemarkPosition"
import {
  getEyemarkElementRefs,
  projectFromLegacySpec,
  type CutNFlowProjectV1
} from "../packages/cutter-engine/project"
import {
  BETA_CUTTER_RULESET_VERSION,
  getEffectiveValidationStatus,
  validateProjectCutter,
  type ValidationSeverity
} from "../packages/cutter-engine/validation"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const now = () => "2026-07-21T20:00:00.000Z"
const defaults = getPackModule("k-seal-pouch")?.getDefaults()
if (!defaults) throw new Error("Missing K-Seal pack fixture.")

const movedLeft = positionEyemarks({
  ...defaults,
  eyeMarks: { count: 1, position: "top-right", width: 10, height: 5, color: "black", manualPositioned: true, offsetX: -20 }
}, "bottom", "k-seal-pouch")
assert(movedLeft?.eyeMarks?.position === "bottom-left", "Top/mid/bottom eyemark actions must preserve the manually selected left side.")

const makeProject = (
  id: string,
  count: 1 | 2,
  width: number,
  height: number,
  width2 = width,
  height2 = height,
  trim = 15
) => projectFromLegacySpec("k-seal-pouch", id, {
  ...defaults,
  kSealPouch: { ...defaults.kSealPouch!, trim, trimEnabled: true },
  eyeMarks: {
    count,
    position: "centre",
    width,
    height,
    ...(count === 2 ? { width2, height2 } : {}),
    color: "black"
  }
}, {
  id,
  createdAt: now(),
  updatedAt: now()
})

const sizeIssues = (project: CutNFlowProjectV1) => validateProjectCutter(project, { now }).issues.filter(
  issue => issue.ruleId === "EYEMARK_MINIMUM_SIZE"
)

const assertThreshold = (
  label: string,
  count: 1 | 2,
  width: number,
  height: number,
  severity?: ValidationSeverity
) => {
  const project = makeProject(`threshold-${label}`, count, width, height)
  const run = validateProjectCutter(project, { now })
  const issues = run.issues.filter(issue => issue.ruleId === "EYEMARK_MINIMUM_SIZE")
  const expectedCount = severity ? count : 0
  assert(issues.length === expectedCount, `${label} expected ${expectedCount} size issues, received ${issues.length}.`)
  const activeIds = new Set(
    getEyemarkElementRefs(project).filter(ref => ref.status === "active").map(ref => ref.id)
  )
  issues.forEach(issue => {
    assert(issue.severity === severity, `${label} has the wrong severity.`)
    assert(issue.blocksExport === (severity === "critical"), `${label} has the wrong export policy.`)
    assert(!issue.acknowledgementAllowed, `${label} must not allow acknowledgement.`)
    assert(Boolean(issue.affectedElementId && activeIds.has(issue.affectedElementId)), `${label} must identify a real eyemark.`)
    assert(
      JSON.stringify(issue.currentValue) === JSON.stringify({ width, height }),
      `${label} must return the current width and height together.`
    )
    const expected = severity === "critical"
      ? count === 1 ? { width: 8, height: 4 } : { width: 5, height: 4 }
      : count === 1 ? { width: 10, height: 5 } : { width: 7, height: 5 }
    assert(
      JSON.stringify(issue.expectedValue) === JSON.stringify(expected),
      `${label} must return the correct production or critical threshold.`
    )
  })
  assert(new Set(issues.map(issue => issue.id)).size === issues.length, `${label} must not duplicate issue IDs.`)
  assert(
    run.status === (severity === "critical" ? "failed" : "passed"),
    `${label} must produce the correct overall lifecycle status.`
  )
}

assertThreshold("single-default", 1, 15, 5)
assertThreshold("single-production-minimum", 1, 10, 5)
assertThreshold("single-width-advisory", 1, 9, 5, "advisory")
assertThreshold("single-height-advisory", 1, 10, 4.5, "advisory")
assertThreshold("single-critical-boundary", 1, 8, 4, "advisory")
assertThreshold("single-width-critical", 1, 7.9, 5, "critical")
assertThreshold("single-height-critical", 1, 10, 3.9, "critical")
assertThreshold("single-one-by-one", 1, 1, 1, "critical")

assertThreshold("dual-production-minimum", 2, 7, 5)
assertThreshold("dual-width-advisory", 2, 6, 5, "advisory")
assertThreshold("dual-height-advisory", 2, 7, 4.5, "advisory")
assertThreshold("dual-critical-boundary", 2, 5, 4, "advisory")
assertThreshold("dual-width-critical", 2, 4.9, 5, "critical")
assertThreshold("dual-height-critical", 2, 7, 3.9, "critical")
assertThreshold("dual-one-by-one", 2, 1, 1, "critical")

for (const [trim, width] of [[10, 7], [12, 9], [15, 12]] as const) {
  const created = createKSealEyemarkDefaults(2, trim)
  assert(created.width === width && created.width2 === width, `Trim ${trim} must create ${width} mm dual widths.`)
  assert(created.height === 5 && created.height2 === 5, `Trim ${trim} must retain independent 5 mm heights.`)
}

const dualAtFifteen = createKSealEyemarkDefaults(2, 15)
const reducedToTen = reconcileKSealDualEyemarksForTrim(
  { ...dualAtFifteen, color: "black" } as NonNullable<FlowwrapSpec["eyeMarks"]>,
  15,
  10
)
assert(
  reducedToTen.width === 7 && reducedToTen.width2 === 7 &&
    reducedToTen.height === 5 && reducedToTen.height2 === 5,
  "Reducing trim from 15 to 10 mm must update both auto-managed widths to 7 mm without changing height."
)
assert(
  reducedToTen.offsetX === 0 && reducedToTen.offsetX2 === 0,
  "Trim reconciliation must retain the two 1.5 mm centred buffers."
)

const trimSource = makeProject("trim-revision-source", 2, 12, 5, 12, 5, 15)
const trimUpdatedSpec: FlowwrapSpec = {
  ...trimSource.cutter.legacySpec,
  kSealPouch: { ...trimSource.cutter.legacySpec.kSealPouch!, trim: 10 },
  eyeMarks: reconcileKSealDualEyemarksForTrim(
    trimSource.cutter.legacySpec.eyeMarks!,
    15,
    10
  )
}
const trimUpdate = updateCutNFlowProject({
  project: trimSource,
  reason: "controls-edit",
  update: { type: "replace-legacy-spec", spec: trimUpdatedSpec }
})
assert(trimUpdate.ok && Boolean(trimUpdate.project), "A trim dependency update must use the canonical Project update path.")
assert(trimUpdate.project!.revision === trimSource.revision + 1, "A trim dependency update must increment Project revision once.")
const trimRun = validateProjectCutter(trimUpdate.project!, { now, trigger: "live" })
assert(trimRun.projectRevision === trimUpdate.project!.revision, "Live validation must run against the updated trim revision.")
assert(
  !trimRun.issues.some(issue =>
    issue.ruleId === "EYEMARK_TRIM_FIT" ||
    issue.ruleId === "EYEMARK_CUTTER_BOUNDS" ||
    issue.ruleId === "EYEMARK_TRACK_PLACEMENT"
  ),
  "A reconciled 10 mm trim must not retain avoidable fit, bounds, or track issues."
)

const userEditedAtFifteen = {
  ...(createKSealEyemarkDefaults(2, 15) as NonNullable<FlowwrapSpec["eyeMarks"]>),
  width: 8,
  width2: 8,
  color: "black" as const
}
const sameTrim = reconcileKSealDualEyemarksForTrim(userEditedAtFifteen, 15, 15)
assert(sameTrim.width === 8 && sameTrim.width2 === 8, "A user-edited width below the trim maximum must remain unchanged.")
const increasedTrim = reconcileKSealDualEyemarksForTrim(userEditedAtFifteen, 15, 20)
assert(increasedTrim.width === 8 && increasedTrim.width2 === 8, "Increasing trim must not increase a smaller user-edited width.")
const reducedUserWidth = reconcileKSealDualEyemarksForTrim(userEditedAtFifteen, 15, 10)
assert(reducedUserWidth.width === 7 && reducedUserWidth.width2 === 7, "A user width that no longer fits must clamp to the new maximum.")
const impossibleTrim = reconcileKSealDualEyemarksForTrim(userEditedAtFifteen, 15, 7)
const impossibleProject = makeProject(
  "trim-below-critical",
  2,
  impossibleTrim.width,
  impossibleTrim.height,
  impossibleTrim.width2,
  impossibleTrim.height2,
  7
)
assert(
  sizeIssues(impossibleProject).every(issue => issue.severity === "critical") &&
    sizeIssues(impossibleProject).length === 2,
  "A 7 mm trim may clamp to 4 mm but must remain visibly Critical rather than appearing valid."
)

const quickFixSource: FlowwrapSpec = {
  ...defaults,
  kSealPouch: { ...defaults.kSealPouch!, trim: 12, trimEnabled: true },
  eyeMarks: {
    count: 2,
    position: "centre",
    width: 6,
    height: 5,
    width2: 6,
    height2: 5,
    color: "black"
  }
}
const quickFixed = applyCutterValidationFix(quickFixSource, "kseal-fit-dual-eyemarks-to-trim")
assert(
  quickFixed.eyeMarks?.width === 9 && quickFixed.eyeMarks.width2 === 9 &&
    quickFixed.eyeMarks.height === 5 && quickFixed.eyeMarks.height2 === 5,
  "Fit eyemarks to trim must produce two 9 x 5 mm marks for 12 mm trim."
)
const quickFixProject = makeProject("quick-fix-project", 2, 6, 5, 6, 5, 12)
const quickFixBeforeRun = validateProjectCutter(quickFixProject, { now })
const quickFixAction = quickFixBeforeRun.issues.find(
  issue => issue.ruleId === "EYEMARK_MINIMUM_SIZE"
)?.fixAction
assert(
  quickFixAction?.actionType === "FIT_DUAL_EYEMARKS_TO_TRIM" &&
    quickFixAction.label === "Fit eyemarks to trim" &&
    quickFixAction.parameters?.targetWidth === 9,
  "The dual-eyemark Advisory must expose a structured, trim-current Quick Fix."
)
const liveAdvisory = getStructuredValidationState(quickFixProject).issues.find(
  issue => issue.code === "EYEMARK_MINIMUM_SIZE"
)
assert(
  liveAdvisory?.severity === "info" &&
    liveAdvisory.fixable === true &&
    liveAdvisory.suggestedFixId === "kseal-fit-dual-eyemarks-to-trim",
  "The existing Cutter Studio issue-action adapter must expose the dual Advisory Quick Fix."
)
const quickFixUpdate = updateCutNFlowProject({
  project: quickFixProject,
  reason: "engine-action",
  update: {
    type: "replace-legacy-spec",
    spec: applyCutterValidationFix(
      quickFixProject.cutter.legacySpec,
      quickFixAction?.id ?? ""
    )
  }
})
assert(quickFixUpdate.ok && Boolean(quickFixUpdate.project), "Quick Fix must update through the canonical Project service.")
assert(quickFixUpdate.project!.revision === quickFixProject.revision + 1, "Quick Fix must increment revision.")
assert(
  sizeIssues(quickFixUpdate.project!).length === 0,
  "A 12 mm trim Quick Fix must remove the 6 x 5 mm size Advisory using 9 x 5 mm output."
)
const changedAfterSuggestion: FlowwrapSpec = {
  ...quickFixProject.cutter.legacySpec,
  kSealPouch: { ...quickFixProject.cutter.legacySpec.kSealPouch!, trim: 15 }
}
const staleSafeFix = applyCutterValidationFix(
  changedAfterSuggestion,
  quickFixAction?.id ?? ""
)
assert(
  staleSafeFix.eyeMarks?.width === 12 && staleSafeFix.eyeMarks.width2 === 12,
  "Quick Fix must re-read current trim instead of applying stale 9 mm action parameters."
)

const sharedTrimIssueProject = makeProject("shared-trim-fit", 2, 13, 5, 13, 5, 15)
const sharedTrimIssues = validateProjectCutter(sharedTrimIssueProject, { now }).issues.filter(
  issue => issue.ruleId === "EYEMARK_TRIM_FIT"
)
assert(
  sharedTrimIssues.length === 1 &&
    sharedTrimIssues[0]?.fixAction?.parameters?.targetWidth === 12,
  "Two oversized marks must produce one shared trim-fit root-cause issue."
)

const duplicateSource = makeProject("dedupe-size-and-bounds", 2, 1, 1, 1, 1, 15)
duplicateSource.cutter.legacySpec.eyeMarks!.offsetX = -100
duplicateSource.cutter.legacySpec.eyeMarks!.offsetX2 = 100
const duplicateRun = validateProjectCutter(duplicateSource, { now })
const duplicateSizeIssues = duplicateRun.issues.filter(issue => issue.ruleId === "EYEMARK_MINIMUM_SIZE")
const duplicatePlacementIssues = duplicateRun.issues.filter(
  issue => issue.ruleId === "EYEMARK_CUTTER_BOUNDS" || issue.ruleId === "EYEMARK_TRACK_PLACEMENT"
)
assert(duplicateSizeIssues.length === 2, "Each invalid eyemark must have one combined size root-cause issue.")
assert(
  duplicatePlacementIssues.length === 2,
  `Each genuinely misplaced eyemark must retain one placement issue: ${JSON.stringify(duplicatePlacementIssues)}.`
)
assert(
  !duplicateRun.issues.some(issue => issue.message.includes("7mm by 7mm")),
  "The obsolete square-eyemark message must not survive compatibility mapping."
)
assert(
  new Set(duplicateRun.issues.map(issue => issue.id)).size === duplicateRun.issues.length,
  "Deduplicated validation output must contain unique domain issue IDs."
)
assert(
  new Set(duplicateRun.issues.map(issue => issue.message)).size === duplicateRun.issues.length,
  "Deduplicated validation output must not repeat identical message content."
)
assert(
  duplicateRun.summary.issueCount === duplicateRun.issues.length,
  "Summary counts must be calculated from the deduplicated issue list."
)

const cutterOnly = makeProject("cutter-only-no-artwork", 1, 15, 5)
const cutterSummary = buildValidationCentreSummary(cutterOnly, false)
assert(
  !cutterSummary.messages.some(message => message.message.includes("No artwork uploaded")),
  "Cutter-only validation must not include the artwork-not-uploaded advisory."
)
assert(
  buildValidationCentreSummary(cutterOnly, false, "artwork").messages.some(
    message => message.message.includes("No artwork uploaded")
  ),
  "The artwork workflow advisory must remain available outside cutter-only validation."
)
const withArtwork = { ...cutterOnly, artwork: { id: "artwork-fixture" } }
assert(
  JSON.stringify(validateProjectCutter(cutterOnly, { now }).issues) ===
    JSON.stringify(validateProjectCutter(withArtwork, { now }).issues),
  "Cutter-only deterministic issues must be unaffected by artwork presence."
)

const flowwrapDefaults = getPackModule("flowwrap")!.getDefaults()
const flowwrapNineByFive = projectFromLegacySpec("flowwrap", "pack-isolation", {
  ...flowwrapDefaults,
  eyeMarks: { count: 1, position: "top-left", width: 9, height: 5, color: "black" }
})
assert(
  sizeIssues(flowwrapNineByFive).length === 0,
  "K-Seal production thresholds must not be applied globally to Flow-wrap."
)

assert(String(BETA_CUTTER_RULESET_VERSION) === "beta-cutter-4", "The cutter-edge advisory must increment the ruleset version.")
const oldRun = validateProjectCutter(cutterOnly, { now })
assert(
  getEffectiveValidationStatus(
    { ...oldRun, rulesetVersion: "beta-cutter-1" },
    cutterOnly.revision
  ) === "stale",
  "An old ruleset run must become stale at the same Project revision."
)

console.log("Beta eyemark refinement tests passed.")
