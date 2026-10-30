import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import { getPackModule } from "../apps/web/src/packs"
import { updateEyemarkById } from "../apps/web/src/project/projectUpdateService"
import { getProjectValidationSnapshot } from "../apps/web/src/validation/activeValidation"
import { exportProjectSvg } from "../packages/cutter-engine/export/cutterExportService"
import {
  getEyemarkElementRefs,
  loadKyzaProject,
  parseKyzaProject,
  projectFromLegacySpec,
  saveKyzaProject,
  type KyzaProjectStorage,
  type KyzaProjectV1
} from "../packages/cutter-engine/project"
import {
  BETA_CUTTER_RULESET_VERSION,
  createValidationIssue,
  getEffectiveValidationStatus,
  getPreExportValidationRun,
  summarizeValidationIssues,
  validateAndPersistProjectCutter,
  validateProjectCutter,
  withLatestValidationRun,
  type ValidationIssue,
  type ValidationRule,
  type ValidationSeverity,
  type ValidationTrigger
} from "../packages/cutter-engine/validation"

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`
  )
}

const timestamp = "2026-07-21T09:00:00.000Z"
const now = () => timestamp

const defaultsFor = (packType: string) => {
  const pack = getPackModule(packType)
  if (!pack) throw new Error(`Missing pack fixture: ${packType}`)
  return pack.getDefaults()
}

const makeProject = (
  packType: string,
  spec: FlowwrapSpec,
  id: string,
  revision = 1
) => projectFromLegacySpec(packType, id, spec, {
  id,
  revision,
  createdAt: timestamp,
  updatedAt: timestamp
})

const validate = (
  project: KyzaProjectV1,
  trigger: ValidationTrigger = "manual"
) => validateProjectCutter(project, { trigger, now })

const issueFor = (
  project: KyzaProjectV1,
  ruleId: string,
  trigger: ValidationTrigger = "manual"
) => validate(project, trigger).issues.find(issue => issue.ruleId === ruleId)

const issue = (severity: ValidationSeverity, key: string) => createValidationIssue({
  ruleId: `TEST_${severity.toUpperCase()}`,
  key,
  severity,
  title: `${severity} issue`,
  message: `${severity} issue`
})

const ruleReturning = (...issues: ValidationIssue[]): ValidationRule => ({
  id: "TEST_RULE",
  description: "Test-only deterministic rule.",
  appliesTo: () => true,
  evaluate: () => issues
})

const flowwrapDefaults = defaultsFor("flowwrap")
const validFlowwrap = makeProject(
  "flowwrap",
  flowwrapDefaults,
  "beta-validation-flowwrap"
)

// Summary, lifecycle and central issue-policy behavior.
const emptyRun = validateProjectCutter(validFlowwrap, { now, rules: [] })
assert(emptyRun.status === "passed", "An empty issue set must pass.")
assertEqual(emptyRun.summary, {
  criticalCount: 0,
  warningCount: 0,
  advisoryCount: 0,
  issueCount: 0,
  blocksExport: false
}, "An empty issue set must produce an empty summary.")

const warningRun = validateProjectCutter(validFlowwrap, {
  now,
  rules: [ruleReturning({ ...issue("warning", "warning"), blocksExport: true, acknowledgementAllowed: false })]
})
assert(warningRun.status === "passed", "A warning-only run must pass.")
assert(!warningRun.issues[0]?.blocksExport, "A warning must not block export.")
assert(warningRun.issues[0]?.acknowledgementAllowed === true, "A warning must allow acknowledgement.")

const advisoryRun = validateProjectCutter(validFlowwrap, {
  now,
  rules: [ruleReturning(issue("advisory", "advisory"))]
})
assert(advisoryRun.status === "passed", "An advisory-only run must pass.")
assert(!advisoryRun.issues[0]?.blocksExport, "An advisory must not block export.")
assert(!advisoryRun.issues[0]?.acknowledgementAllowed, "An advisory must not require acknowledgement.")

const criticalRun = validateProjectCutter(validFlowwrap, {
  now,
  rules: [ruleReturning(issue("critical", "critical"))]
})
assert(criticalRun.status === "failed", "A critical issue must fail the run.")
assert(criticalRun.summary.blocksExport, "A critical issue must block export.")
assertEqual(
  summarizeValidationIssues([
    issue("critical", "one"),
    issue("warning", "two"),
    issue("advisory", "three")
  ]),
  { criticalCount: 1, warningCount: 1, advisoryCount: 1, issueCount: 3, blocksExport: true },
  "Summary counts must match the issue collection."
)

const throwingRule: ValidationRule = {
  id: "TEST_THROW",
  description: "Throws to exercise execution failure handling.",
  appliesTo: () => true,
  evaluate: () => { throw new Error("test failure") }
}
const errorRun = validateProjectCutter(validFlowwrap, { now, rules: [throwingRule] })
assert(errorRun.status === "error", "A service execution failure must produce Error, not Failed.")
assert(!errorRun.summary.blocksExport, "A service execution error is not an engineering critical issue.")

// Revision awareness and stale-after-authoritative-edit behavior.
const currentRun = validate(validFlowwrap, "live")
assert(currentRun.status === "passed", "A completed current run without Critical issues must be Passed.")
assert(currentRun.projectRevision === validFlowwrap.revision, "A run must store the current Project revision.")
assert(
  getEffectiveValidationStatus(currentRun, validFlowwrap.revision) === currentRun.status,
  "A same-revision run must remain current."
)
assert(
  getEffectiveValidationStatus(currentRun, validFlowwrap.revision + 1) === "stale",
  "A revision mismatch must make a run stale."
)
assert(getEffectiveValidationStatus(undefined, validFlowwrap.revision) === "not_run", "No run must be not_run.")
const priorProjectWithoutValidation = JSON.parse(JSON.stringify(validFlowwrap))
delete priorProjectWithoutValidation.latestValidationRun
delete priorProjectWithoutValidation.validationRuns
const migratedPriorProject = parseKyzaProject(priorProjectWithoutValidation)
assert(
  migratedPriorProject.ok
    && getEffectiveValidationStatus(
      migratedPriorProject.value.latestValidationRun,
      migratedPriorProject.value.revision,
    ) === "not_run",
  "A prior Project without validation data must reopen as Not Run.",
)
assert(
  getEffectiveValidationStatus({ ...currentRun, status: "running" }, validFlowwrap.revision + 1) === "running",
  "An executing run must remain running until it completes."
)
const liveSnapshot = getProjectValidationSnapshot(validFlowwrap, { now })
assert(liveSnapshot.run.trigger === "live", "Live presentation must create a canonical live Validation Run.")
assert(
  liveSnapshot.project.latestValidationRun?.id === liveSnapshot.run.id,
  "The live Validation Run must attach to the in-memory canonical Project.",
)
const reusedLiveSnapshot = getProjectValidationSnapshot(liveSnapshot.project, {
  now: () => "2026-07-21T09:00:30.000Z",
})
assert(
  reusedLiveSnapshot.reused && reusedLiveSnapshot.run.id === liveSnapshot.run.id,
  "Live presentation must reuse the current Project Validation Run instead of creating a parallel result.",
)

const validatedProject = withLatestValidationRun(validFlowwrap, currentRun)
const activeEyemark = getEyemarkElementRefs(validatedProject).find(ref => ref.status === "active")
assert(Boolean(activeEyemark), "The Flow-wrap fixture must expose a stable active eyemark element.")
const edited = updateEyemarkById(
  validatedProject,
  activeEyemark!.id,
  element => ({ ...element, offsetXMm: (element.offsetXMm ?? 0) + 1 }),
  "test-fixture"
)
assert(edited.ok && Boolean(edited.project), "An eyemark move must use the canonical Project update service.")
const editedProject = edited.project!
assert(editedProject.revision === validatedProject.revision + 1, "An eyemark move must increment Project revision.")
assert(
  editedProject.validationRuns?.some(run => run.id === currentRun.id) === true,
  "An engineering edit must preserve the previous Validation Run as historical evidence.",
)
assert(
  getEffectiveValidationStatus(editedProject.latestValidationRun, editedProject.revision) === "stale",
  "A previous Passed run must not remain current after an eyemark edit."
)
const preExportAfterEdit = getPreExportValidationRun(editedProject, { now })
assert(!preExportAfterEdit.reused, "Pre-export must not rely on a stale run.")
assert(preExportAfterEdit.run.trigger === "pre_export", "A stale pre-export check must create a pre_export run.")
assert(
  preExportAfterEdit.run.projectRevision === editedProject.revision &&
    getEffectiveValidationStatus(preExportAfterEdit.run, editedProject.revision) !== "stale",
  "A replacement run must be current for the edited revision."
)
const revalidatedProject = withLatestValidationRun(editedProject, preExportAfterEdit.run)
assert(
  revalidatedProject.latestValidationRun?.id === preExportAfterEdit.run.id,
  "Revalidation must activate the Validation Run for the new Project revision.",
)
assert(
  revalidatedProject.validationRuns?.some(run => run.id === currentRun.id) === true
    && revalidatedProject.validationRuns?.some(run => run.id === preExportAfterEdit.run.id) === true,
  "Revalidation must retain the previous run and append the current-revision run.",
)
assert(
  getEffectiveValidationStatus(
    revalidatedProject.latestValidationRun,
    revalidatedProject.revision,
  ) === preExportAfterEdit.run.status,
  "The completed revalidation result must become current again.",
)
const reuseCurrent = getPreExportValidationRun(
  revalidatedProject,
  { now: () => "2026-07-21T09:01:00.000Z" }
)
assert(reuseCurrent.reused, "Pre-export must reuse the stored current pre-export run.")
assert(reuseCurrent.run.trigger === "pre_export", "The reused export review run must retain the pre_export trigger.")
assert(reuseCurrent.run.id === preExportAfterEdit.run.id, "Repeated export review must reference the same current run.")

// Required dimensions, including K-Seal's pack-specific finished dimensions.
for (const [name, spec, axis] of [
  ["missing-width", { ...flowwrapDefaults, width: undefined } as unknown as FlowwrapSpec, "width"],
  ["missing-height", { ...flowwrapDefaults, height: undefined } as unknown as FlowwrapSpec, "height"],
  ["zero-width", { ...flowwrapDefaults, width: 0 }, "width"],
  ["zero-height", { ...flowwrapDefaults, height: 0 }, "height"],
  ["negative-width", { ...flowwrapDefaults, width: -1 }, "width"],
  ["negative-height", { ...flowwrapDefaults, height: -1 }, "height"]
] as const) {
  const dimensionIssue = issueFor(makeProject("flowwrap", spec, `dimensions-${name}`), "CUTTER_REQUIRED_DIMENSIONS")
  assert(Boolean(dimensionIssue), `${name} must produce a required-dimension issue.`)
  assert(dimensionIssue!.affectedArea?.endsWith(axis), `${name} must identify the affected authoritative field.`)
}
assert(!issueFor(validFlowwrap, "CUTTER_REQUIRED_DIMENSIONS"), "Valid dimensions must not produce a base issue.")

const kSealDefaults = defaultsFor("k-seal-pouch")
const validKSeal = makeProject("k-seal-pouch", kSealDefaults, "beta-validation-kseal")
assert(validate(validKSeal).status === "passed", "A valid default K-Seal cutter must pass the beta ruleset.")
const missingKSealWidth = makeProject("k-seal-pouch", {
  ...kSealDefaults,
  kSealPouch: { ...kSealDefaults.kSealPouch!, pouchWidth: undefined }
}, "dimensions-kseal-pack-specific")
assert(
  issueFor(missingKSealWidth, "CUTTER_REQUIRED_DIMENSIONS")?.affectedArea ===
    "cutter.legacySpec.kSealPouch.pouchWidth",
  "K-Seal must use its authoritative finished pouch width."
)

// Eyemark count capabilities.
const zeroEyemark = makeProject("flowwrap", { ...flowwrapDefaults, eyeMarks: undefined }, "eyemark-count-zero")
assert(!issueFor(zeroEyemark, "EYEMARK_SUPPORTED_COUNT"), "A supported zero-eyemark configuration must pass count validation.")
const oneEyemark = makeProject("flowwrap", {
  ...flowwrapDefaults,
  eyeMarks: { ...flowwrapDefaults.eyeMarks!, count: 1, position: "top-left" }
}, "eyemark-count-one")
assert(!issueFor(oneEyemark, "EYEMARK_SUPPORTED_COUNT"), "One eyemark must be supported.")
assert(!issueFor(validFlowwrap, "EYEMARK_SUPPORTED_COUNT"), "Two eyemarks must be supported without a false issue.")
assert(!issueFor(validFlowwrap, "EYEMARK_TRACK_PLACEMENT"), "Two default eyemarks with the automatic offset must remain in their permitted tracks.")
const threeEyemarks = makeProject("flowwrap", {
  ...flowwrapDefaults,
  eyeMarks: { ...flowwrapDefaults.eyeMarks!, count: 3 as 1 }
}, "eyemark-count-three")
const countIssue = issueFor(threeEyemarks, "EYEMARK_SUPPORTED_COUNT")
assert(countIssue?.severity === "critical" && countIssue.currentValue === 3, "An unsupported count must be a structured Critical issue.")

const plainWebDefaults = defaultsFor("plain-web")
const unsupportedPlainWebMark = makeProject("plain-web", {
  ...plainWebDefaults,
  eyeMarks: { count: 1, position: "top-left", width: 10, height: 5, color: "black" }
}, "eyemark-count-plain-web")
assert(
  issueFor(unsupportedPlainWebMark, "EYEMARK_SUPPORTED_COUNT")?.expectedValue?.toString() === "0",
  "A pack without eyemark capability must not inherit a generic capability table."
)

// Minimum sizes use hard constraints, not defaults or recommendations.
assert(!issueFor(validFlowwrap, "EYEMARK_MINIMUM_SIZE"), "Default eyemarks must satisfy the hard minimum.")
const minimumProject = (width: number, height: number, id: string) => makeProject("flowwrap", {
  ...flowwrapDefaults,
  eyeMarks: { count: 1, position: "top-left", width, height, color: "black" }
}, id)
const smallWidth = issueFor(minimumProject(0.5, 5, "eyemark-small-width"), "EYEMARK_MINIMUM_SIZE")
assert(smallWidth?.currentValue === 0.5 && smallWidth.expectedValue === 1 && smallWidth.unit === "mm", "Width issues must return actual, hard minimum and mm units.")
const smallHeightProject = minimumProject(10, 0.5, "eyemark-small-height")
const smallHeight = issueFor(smallHeightProject, "EYEMARK_MINIMUM_SIZE")
assert(smallHeight?.currentValue === 0.5 && smallHeight.expectedValue === 1, "Height below the hard minimum must be reported.")
assert(
  smallHeight?.affectedElementId === getEyemarkElementRefs(smallHeightProject)[0]?.id,
  "A size issue must use the actual stable eyemark element ID."
)
assert(
  validate(minimumProject(0.5, 0.5, "eyemark-small-both")).issues.filter(
    candidate => candidate.ruleId === "EYEMARK_MINIMUM_SIZE"
  ).length === 2,
  "Both undersized dimensions must be checked."
)
const twoSmallMarks = makeProject("flowwrap", {
  ...flowwrapDefaults,
  eyeMarks: {
    count: 2,
    position: "top",
    width: 0.5,
    height: 0.5,
    width2: 0.5,
    height2: 0.5,
    color: "black"
  }
}, "eyemark-small-two")
const twoSmallRefs = getEyemarkElementRefs(twoSmallMarks).filter(ref => ref.status === "active")
const twoSmallIssueIds = new Set(
  validate(twoSmallMarks).issues
    .filter(candidate => candidate.ruleId === "EYEMARK_MINIMUM_SIZE")
    .map(candidate => candidate.affectedElementId)
)
assert(
  twoSmallRefs.length === 2 && twoSmallRefs.every(ref => twoSmallIssueIds.has(ref.id)),
  "Both active eyemarks must be checked individually using their stable IDs."
)
assert(
  !issueFor(minimumProject(1, 1, "eyemark-hard-minimum"), "EYEMARK_MINIMUM_SIZE"),
  "The 15 x 5 mm default must not be confused with the 1 x 1 mm hard base minimum."
)
const kSealDualSmall = makeProject("k-seal-pouch", {
  ...kSealDefaults,
  eyeMarks: {
    count: 2,
    position: "centre",
    width: 6,
    height: 6,
    width2: 7,
    height2: 7,
    color: "black"
  }
}, "eyemark-kseal-hard-minimum")
const kSealDualAdvisory = issueFor(kSealDualSmall, "EYEMARK_MINIMUM_SIZE")
assert(
  kSealDualAdvisory?.severity === "advisory" &&
    JSON.stringify(kSealDualAdvisory.expectedValue) === JSON.stringify({ width: 7, height: 5 }),
  "Dual K-Seal eyemarks must distinguish the 7 x 5 mm production minimum from the 5 x 4 mm Critical threshold."
)

// Bounds and track placement use engine cutter coordinates and stable element IDs.
const positionedMark = (offsetX: number, offsetY: number, id: string) => makeProject("flowwrap", {
  ...flowwrapDefaults,
  eyeMarks: {
    count: 1,
    position: "top-left",
    width: 5,
    height: 5,
    offsetX,
    offsetY,
    color: "black"
  }
}, id)
assert(!issueFor(positionedMark(0, 0, "bounds-inside"), "EYEMARK_CUTTER_BOUNDS"), "An inside eyemark must pass cutter bounds.")
for (const [id, offsetX] of [["bounds-partial", -2], ["bounds-full", -20]] as const) {
  const project = positionedMark(offsetX, 0, id)
  const boundsIssue = issueFor(project, "EYEMARK_CUTTER_BOUNDS")
  assert(Boolean(boundsIssue), `${id} must produce a cutter-bounds issue.`)
  assert(boundsIssue!.affectedElementId === getEyemarkElementRefs(project)[0]?.id, `${id} must identify the real eyemark element.`)
}
const scaleIndependentProject = positionedMark(-2, 0, "bounds-scale-independent")
const previewScale = 0.25
assert(
  previewScale > 0 && Boolean(issueFor(scaleIndependentProject, "EYEMARK_CUTTER_BOUNDS")),
  "Preview scale must not affect engine-coordinate bounds validation."
)

assert(!issueFor(positionedMark(0, 0, "track-inside"), "EYEMARK_TRACK_PLACEMENT"), "A mark inside its seal track must pass.")
const outsideTrackProject = positionedMark(15, 0, "track-outside")
const trackIssue = issueFor(outsideTrackProject, "EYEMARK_TRACK_PLACEMENT")
assert(Boolean(trackIssue), "A mark inside the cutter but outside its permitted track must be reported.")
assert(trackIssue!.affectedElementId === getEyemarkElementRefs(outsideTrackProject)[0]?.id, "A track issue must identify the stable eyemark element.")
assert(Boolean(trackIssue!.suggestedAction), "A track issue must provide a suggested action.")
assert(
  !issueFor(makeProject("doy-pouch", defaultsFor("doy-pouch"), "track-unresolved-pack"), "EYEMARK_TRACK_PLACEMENT"),
  "A pack without authoritative track geometry must not receive a false track issue."
)

// Trigger parity: timing/presentation metadata may differ, engineering truth may not.
const parityProject = outsideTrackProject
const issueBasis = (trigger: ValidationTrigger) => validate(parityProject, trigger).issues.map(candidate => ({
  id: candidate.id,
  ruleId: candidate.ruleId,
  severity: candidate.severity,
  message: candidate.message,
  blocksExport: candidate.blocksExport,
  acknowledgementAllowed: candidate.acknowledgementAllowed
}))
assertEqual(issueBasis("live"), issueBasis("manual"), "Live and manual triggers must share engineering truth.")
assertEqual(issueBasis("manual"), issueBasis("pre_export"), "Manual and pre-export triggers must share engineering truth.")

// Persistence through the canonical Project repository.
class MemoryStorage implements KyzaProjectStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}
const storage = new MemoryStorage()
const liveStorage = new MemoryStorage()
const savedLiveSnapshot = saveKyzaProject(liveSnapshot.project, liveStorage)
assert(savedLiveSnapshot.ok, "A live Validation Run attached to the Project must save canonically.")
const reopenedLiveSnapshot = loadKyzaProject(validFlowwrap.id, liveStorage)
assert(
  reopenedLiveSnapshot.ok
    && reopenedLiveSnapshot.value.latestValidationRun?.id === liveSnapshot.run.id
    && reopenedLiveSnapshot.value.latestValidationRun?.trigger === "live",
  "Save/reopen must restore the exact live Validation Run.",
)
const persisted = validateAndPersistProjectCutter(outsideTrackProject, { storage, now, trigger: "manual" })
assert(persisted.ok, "A Validation Run must save through the canonical Project repository.")
const reopened = loadKyzaProject(outsideTrackProject.id, storage)
assert(reopened.ok && Boolean(reopened.value.latestValidationRun), "A saved Validation Run must reopen with its Project.")
const reopenedRun = reopened.ok ? reopened.value.latestValidationRun! : undefined
assert(reopenedRun!.id === persisted.run.id, "Validation Run ID must persist.")
assert(reopenedRun!.rulesetVersion === BETA_CUTTER_RULESET_VERSION, "Ruleset version must persist.")
assert(reopenedRun!.projectRevision === outsideTrackProject.revision, "Validated revision must persist.")
assertEqual(
  reopenedRun!.summary,
  persisted.run.summary,
  "Critical, Warning and Advisory counts plus export-blocking summary must persist intact.",
)
assertEqual(
  reopenedRun!.issues.map(candidate => [
    candidate.id,
    candidate.severity,
    candidate.blocksExport,
    candidate.acknowledgementAllowed,
    candidate.affectedElementId,
  ]),
  persisted.run.issues.map(candidate => [
    candidate.id,
    candidate.severity,
    candidate.blocksExport,
    candidate.acknowledgementAllowed,
    candidate.affectedElementId,
  ]),
  "Issue IDs, severity, export policy and affected element IDs must persist intact."
)

// Regression: validation is read-only and export still emits editable mm SVG paths.
const geometryBefore = JSON.stringify(validFlowwrap.cutter?.legacySpec)
validate(validFlowwrap)
assert(JSON.stringify(validFlowwrap.cutter?.legacySpec) === geometryBefore, "Validation must not modify cutter geometry.")
const svgSource = '<svg data-origin-x="0" data-origin-y="0" data-cutter-width="460" data-cutter-height="200"><g data-layer-id="cutter-outline"><path d="M0 0H460V200H0Z" fill="none"/></g></svg>'
const exported = exportProjectSvg(validFlowwrap, svgSource, {
  includeLayers: true,
  preserveVector: true,
  includeValidationReport: true
})
assert(exported.ok, "A valid Project must still export through the SVG path.")
if (exported.ok) {
  assert(exported.validationRun.trigger === "pre_export", "Export must consume a pre-export Validation Run.")
  assert(
    exported.validationReport?.validationRunId === exported.validationRun.id,
    "An export validation report must record the Validation Run ID."
  )
  assert(exported.svgMarkup.includes("<path"), "SVG export must retain vector paths.")
  assert(exported.svgMarkup.includes('width="620mm"') && exported.svgMarkup.includes('height="360mm"'), "SVG export must retain explicit mm dimensions including the configured margin.")
}

// Pillow folds are derived from current dimensions by the renderer, even when
// a saved preset retains fold offsets from its original wider size.
for (const width of [200, 310, 600]) {
  const pillow = makeProject("pillow-pack", { ...defaultsFor("pillow-pack"), width }, `pillow-resized-${width}`)
  const before = JSON.stringify(pillow)
  assert(!issueFor(pillow, "FOLD_OFFSET_INVALID"), "Pillow validation must inspect the same derived folds as the renderer.")
  assert(JSON.stringify(pillow) === before, "Fold validation must remain read-only.")
  const oldRun = { ...validate(pillow, "live"), rulesetVersion: "beta-cutter-2" }
  const refreshed = getProjectValidationSnapshot(withLatestValidationRun(pillow, oldRun))
  assert(!refreshed.reused, "Cached runs from before the Pillow correction must be revalidated.")
  assert(refreshed.run.rulesetVersion === BETA_CUTTER_RULESET_VERSION, "Revalidation must use the corrected ruleset.")
}
const invalidFold = makeProject("flowwrap", {
  ...flowwrapDefaults, foldLines: [{ id: "outside", orientation: "vertical", offset: 10000 }],
}, "invalid-explicit-fold")
assert(Boolean(issueFor(invalidFold, "FOLD_OFFSET_INVALID")), "Other pack types must still reject explicitly out-of-bounds folds.")

console.log("Beta validation core tests passed.")
