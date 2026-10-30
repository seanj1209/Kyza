import { getPackModule } from "../apps/web/src/packs"
import type { FlowwrapSpec } from "../apps/web/src/types/flowwrap"
import {
  loadKyzaProject,
  projectFromLegacySpec,
  saveKyzaProject,
  type KyzaProjectStorage,
  type KyzaProjectV1,
  type ParseResult
} from "../packages/cutter-engine/project"
import {
  BETA_CUTTER_RULESET_VERSION,
  createValidationIssue,
  validateProjectCutter,
  type ValidationIssue,
  type ValidationRule,
  type ValidationRun
} from "../packages/cutter-engine/validation"
import {
  authorizeProjectExport,
  createValidationAcknowledgement,
  runPreExportValidation
} from "../packages/cutter-engine/export/preExportValidation"
import { executeProjectExport } from "../packages/cutter-engine/export/projectExportService"
import { exportKyzaProject } from "../packages/cutter-engine/export/cutterExportService"
import { createExportPackageDraft } from "../packages/cutter-engine/export/exportPackage"
import { buildKyzaJsonExport } from "../packages/cutter-engine/export/jsonExport"
import { validationRunToLegacyResult } from "../packages/cutter-engine/validation"
import { buildPreExportReviewModel } from "../apps/web/src/ui/preExportReview"

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`
  )
}

class MemoryStorage implements KyzaProjectStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

const timestamp = "2026-07-21T12:00:00.000Z"
const laterTimestamp = "2026-07-21T12:01:00.000Z"
const defaults = getPackModule("flowwrap")?.getDefaults()
if (!defaults) throw new Error("Flow-wrap fixture unavailable.")

const makeProject = (revision = 10) => projectFromLegacySpec(
  "flowwrap",
  "Pre-export test",
  defaults as FlowwrapSpec,
  {
    id: "pre-export-project",
    revision,
    createdAt: timestamp,
    updatedAt: timestamp
  }
)

const issue = (severity: "critical" | "warning" | "advisory", key: string): ValidationIssue =>
  createValidationIssue({
    ruleId: `TEST_${severity.toUpperCase()}`,
    key,
    severity,
    title: `${severity} ${key}`,
    message: `${severity} ${key}`,
    affectedElementId: `eyemark-${key}`,
    affectedElementType: "eyemark",
    currentValue: 1,
    expectedValue: 2,
    unit: "mm",
    suggestedAction: "Review the eyemark."
  })

const ruleReturning = (...issues: ValidationIssue[]): ValidationRule => ({
  id: "TEST_PRE_EXPORT_RULE",
  description: "Test-only pre-export rule.",
  appliesTo: () => true,
  evaluate: () => issues
})

const runFor = (
  project: KyzaProjectV1,
  issues: ValidationIssue[],
  now = timestamp
) => validateProjectCutter(project, {
  trigger: "pre_export",
  now: () => now,
  rules: [ruleReturning(...issues)]
})

const persistInMemory = (holder: { project: KyzaProjectV1 }) =>
  (project: KyzaProjectV1): ParseResult<KyzaProjectV1> => {
    holder.project = project
    return { ok: true, value: project }
  }

const main = async () => {
  // Fresh pre-export validation and persistence.
  const holder = { project: makeProject() }
  const existingLiveRun = validateProjectCutter(holder.project, {
    trigger: "live",
    now: () => timestamp,
    rules: []
  })
  holder.project = { ...holder.project, latestValidationRun: existingLiveRun }
  const coordinated = await runPreExportValidation({
    getLatestProject: () => holder.project,
    persistProject: persistInMemory(holder),
    now: () => laterTimestamp,
    validate: project => runFor(project, [], laterTimestamp)
  })
  assert(coordinated.ok, "A current Project must complete pre-export validation.")
  if (!coordinated.ok) return
  assert(!coordinated.reused, "Pre-export must create a fresh dedicated run.")
  assert(coordinated.run.trigger === "pre_export", "The persisted run must use the pre_export trigger.")
  assert(coordinated.run.projectRevision === 10, "The run must use the current Project revision.")
  assert(holder.project.latestValidationRun?.id === coordinated.run.id, "The exact run must persist as latest.")
  assert(holder.project.validationRuns?.some(run => run.id === coordinated.run.id), "The run must persist in validation history.")
  assert(holder.project.validationRuns?.some(run => run.id === existingLiveRun.id), "The previous live run must remain as historical evidence.")
  let reusedValidationExecuted = false
  const reusedCurrent = await runPreExportValidation({
    getLatestProject: () => holder.project,
    persistProject: () => {
      throw new Error("A stored current pre-export run must not be persisted again.")
    },
    validate: project => {
      reusedValidationExecuted = true
      return runFor(project, [], laterTimestamp)
    },
  })
  assert(
    reusedCurrent.ok
      && reusedCurrent.reused
      && reusedCurrent.run.id === coordinated.run.id
      && !reusedValidationExecuted,
    "Repeated export preparation must reuse the exact stored current Validation Run.",
  )

  // Stored runs with a mismatched revision or ruleset are historical only and must be replaced.
  const staleStoredRun = { ...coordinated.run, projectRevision: 9 }
  const staleStoredHolder = {
    project: {
      ...makeProject(),
      latestValidationRun: staleStoredRun,
      validationRuns: [staleStoredRun],
    },
  }
  let staleStoredValidationCalls = 0
  const replacedStaleStored = await runPreExportValidation({
    getLatestProject: () => staleStoredHolder.project,
    persistProject: persistInMemory(staleStoredHolder),
    validate: project => {
      staleStoredValidationCalls += 1
      return runFor(project, [], laterTimestamp)
    },
  })
  assert(
    replacedStaleStored.ok
      && !replacedStaleStored.reused
      && staleStoredValidationCalls === 1
      && replacedStaleStored.run.projectRevision === staleStoredHolder.project.revision,
    "Pre-export must replace, not reuse, a stored run for a different Project revision.",
  )

  const oldRulesetStoredRun = { ...coordinated.run, rulesetVersion: "old-rules" }
  const oldRulesetStoredHolder = {
    project: {
      ...makeProject(),
      latestValidationRun: oldRulesetStoredRun,
      validationRuns: [oldRulesetStoredRun],
    },
  }
  let oldRulesetStoredValidationCalls = 0
  const replacedOldRulesetStored = await runPreExportValidation({
    getLatestProject: () => oldRulesetStoredHolder.project,
    persistProject: persistInMemory(oldRulesetStoredHolder),
    validate: project => {
      oldRulesetStoredValidationCalls += 1
      return runFor(project, [], laterTimestamp)
    },
  })
  assert(
    replacedOldRulesetStored.ok
      && !replacedOldRulesetStored.reused
      && oldRulesetStoredValidationCalls === 1
      && replacedOldRulesetStored.run.rulesetVersion === BETA_CUTTER_RULESET_VERSION,
    "Pre-export must replace, not reuse, a stored run for an outdated ruleset.",
  )

  // A revision race discards the obsolete result and reruns once.
  const racing = { project: makeProject(10), calls: 0 }
  const raced = await runPreExportValidation({
    getLatestProject: () => racing.project,
    persistProject: persistInMemory(racing),
    now: () => laterTimestamp,
    validate: project => {
      racing.calls += 1
      const run = runFor(project, [], laterTimestamp)
      if (racing.calls === 1) racing.project = { ...racing.project, revision: 11 }
      return run
    }
  })
  assert(raced.ok && raced.run.projectRevision === 11, "An obsolete async result must be discarded and rerun for revision 11.")
  assert(racing.calls === 2, "A single revision race must invoke validation twice.")

  // A ruleset mismatch cannot become export authorization.
  const mismatch = await runPreExportValidation({
    getLatestProject: () => makeProject(),
    persistProject: () => ({ ok: false, errors: ["must not persist mismatch"] }),
    validate: project => ({ ...runFor(project, []), rulesetVersion: "old-rules" }),
    maxRevisionRetries: 0
  })
  assert(mismatch.ok === false && mismatch.code === "ruleset_mismatch", "An old ruleset must be rejected before persistence.")

  const retryHolder = { project: makeProject() }
  const failedValidation = await runPreExportValidation({
    getLatestProject: () => retryHolder.project,
    persistProject: persistInMemory(retryHolder),
    validate: project => ({ ...runFor(project, []), status: "error" })
  })
  assert(failedValidation.ok && failedValidation.run.status === "error", "A validation-system error must persist as Error evidence.")
  const retriedValidation = await runPreExportValidation({
    getLatestProject: () => retryHolder.project,
    persistProject: persistInMemory(retryHolder),
    validate: project => runFor(project, [], laterTimestamp)
  })
  assert(retriedValidation.ok && retriedValidation.run.status === "passed", "Retry must be able to replace an Error run with a successful run.")

  // Critical errors remain blocked unless the user explicitly overrides the exact run and revision.
  const project = makeProject()
  const oneCritical = runFor(project, [issue("critical", "one")])
  const multipleCritical = runFor(project, [issue("critical", "one"), issue("critical", "two")])
  for (const run of [oneCritical, multipleCritical]) {
    const blocked = authorizeProjectExport({ project, validationRun: run, exportFormat: "svg" })
    assert(blocked.ok === false && blocked.code === "critical_issues", "Every unacknowledged Critical run must remain blocked.")
  }
  const criticalExportId = "export-critical-override"
  const criticalOverrideResult = createValidationAcknowledgement({
    project,
    validationRun: multipleCritical,
    acknowledgedIssueIds: multipleCritical.issues.map(candidate => candidate.id),
    acknowledgedAt: laterTimestamp,
    exportRequestId: criticalExportId,
    overrideCriticalErrors: true
  })
  assert(criticalOverrideResult.ok, "The exact Critical issue set must create an explicit export override.")
  if (!criticalOverrideResult.ok) return
  const criticalAuthorized = authorizeProjectExport({
    project,
    validationRun: multipleCritical,
    acknowledgement: criticalOverrideResult.value,
    exportFormat: "svg",
    exportId: criticalExportId,
    exportedAt: laterTimestamp
  })
  assert(criticalAuthorized.ok, "An exact Critical override must authorize this export.")
  if (!criticalAuthorized.ok) return
  assertEqual(
    criticalAuthorized.audit.overriddenCriticalIssueIds,
    multipleCritical.issues.map(candidate => candidate.id),
    "The audit must retain every overridden Critical issue ID."
  )
  for (const invalidOverride of [
    { ...criticalOverrideResult.value, projectRevision: 11 },
    { ...criticalOverrideResult.value, validationRunId: "another-run" },
    { ...criticalOverrideResult.value, acknowledgedIssueIds: [multipleCritical.issues[0]!.id] },
    { ...criticalOverrideResult.value, overriddenCriticalIssueIds: [multipleCritical.issues[0]!.id] }
  ]) {
    const rejected = authorizeProjectExport({
      project,
      validationRun: multipleCritical,
      acknowledgement: invalidOverride,
      exportFormat: "svg",
      exportId: criticalExportId
    })
    assert(rejected.ok === false && rejected.code === "invalid_acknowledgement", "A stale or partial Critical override must be rejected.")
  }

  // Warnings require an exact run/revision/ruleset acknowledgement.
  const warnings = [issue("warning", "one"), issue("warning", "two")]
  const warningRun = runFor(project, warnings)
  const unacknowledged = authorizeProjectExport({
    project,
    validationRun: warningRun,
    exportFormat: "ai-compatible-svg"
  })
  assert(unacknowledged.ok === false && unacknowledged.code === "warning_acknowledgement_required", "Warnings must not export automatically.")
  const acknowledgementResult = createValidationAcknowledgement({
    project,
    validationRun: warningRun,
    acknowledgedIssueIds: warningRun.issues.map(candidate => candidate.id),
    acknowledgedAt: laterTimestamp,
    acknowledgedBy: "test-user",
    reason: "Reviewed for this revision",
    exportRequestId: "export-warning"
  })
  assert(acknowledgementResult.ok, "The exact Warning set must create an acknowledgement.")
  if (!acknowledgementResult.ok) return
  const acknowledgement = acknowledgementResult.value
  assertEqual(
    acknowledgement.acknowledgedIssueIds,
    warningRun.issues.map(candidate => candidate.id),
    "Acknowledgement must retain exact Warning IDs."
  )
  const warningAuthorized = authorizeProjectExport({
    project,
    validationRun: warningRun,
    acknowledgement,
    exportFormat: "ai-compatible-svg",
    exportId: "export-warning",
    exportedAt: laterTimestamp,
    userId: "test-user"
  })
  assert(warningAuthorized.ok, "A matching Warning acknowledgement must authorize export.")
  if (!warningAuthorized.ok) return

  const svgSource = '<svg data-origin-x="0" data-origin-y="0" data-cutter-width="460" data-cutter-height="200"><g data-layer-id="cutter-outline"><path d="M0 0H460V200H0Z"/></g></svg>'
  const exportOptions = {
    format: "ai-compatible-svg" as const,
    tierId: "illustrator-ready" as const,
    includeLayers: true,
    preserveVector: true,
    includeValidationReport: true
  }
  const serviceBlocked = exportKyzaProject(project, exportOptions, svgSource, {
    validationRun: warningRun
  })
  assert(serviceBlocked.ok === false && serviceBlocked.code === "warning_acknowledgement_required", "The SVG service must independently reject unacknowledged Warnings.")
  const serviceExport = exportKyzaProject(project, exportOptions, svgSource, {
    validationRun: warningRun,
    acknowledgement,
    exportId: "export-warning",
    exportedAt: laterTimestamp,
    userId: "test-user"
  })
  assert(serviceExport.ok, "The SVG service must accept a matching acknowledgement.")
  if (!serviceExport.ok) return
  assert(serviceExport.exportAudit.validationRunId === warningRun.id, "SVG result must expose its exact Validation Run audit.")
  assert(serviceExport.metadata.validationAudit?.id === serviceExport.exportAudit.id, "Generated SVG metadata must embed the export audit record.")

  for (const invalidAcknowledgement of [
    { ...acknowledgement, projectRevision: 11 },
    { ...acknowledgement, validationRunId: "another-run" },
    { ...acknowledgement, rulesetVersion: "old-rules" },
    { ...acknowledgement, exportRequestId: "another-export" },
    { ...acknowledgement, acknowledgedIssueIds: [warningRun.issues[0]!.id] }
  ]) {
    const rejected = authorizeProjectExport({
      project,
      validationRun: warningRun,
      acknowledgement: invalidAcknowledgement,
      exportFormat: "svg"
    })
    assert(rejected.ok === false && rejected.code === "invalid_acknowledgement", "Mismatched acknowledgement evidence must be rejected.")
  }

  // Advisory-only and issue-free runs need no acknowledgement but retain audit evidence.
  const advisoryRun = runFor(project, [issue("advisory", "one")])
  const advisoryAuthorized = authorizeProjectExport({
    project,
    validationRun: advisoryRun,
    exportFormat: "svg",
    exportId: "export-advisory",
    exportedAt: laterTimestamp
  })
  assert(advisoryAuthorized.ok, "Advisory-only export must not require acknowledgement.")
  if (!advisoryAuthorized.ok) return
  assertEqual(advisoryAuthorized.audit.advisoryIssueIds, advisoryRun.issues.map(candidate => candidate.id), "Advisory IDs must remain in export audit.")
  const clearRun = runFor(project, [])
  const clearAuthorized = authorizeProjectExport({ project, validationRun: clearRun, exportFormat: "svg" })
  assert(clearAuthorized.ok && !clearAuthorized.audit.acknowledgementId, "Issue-free export must not create acknowledgement evidence.")

  const orderedReview = buildPreExportReviewModel(project, runFor(project, [
    issue("advisory", "third"),
    issue("warning", "second"),
    issue("critical", "first")
  ]))
  assertEqual(orderedReview.issues.map(candidate => candidate.severity), ["critical", "warning", "advisory"], "Review issues must be ordered Critical, Warning, Advisory.")
  assert(orderedReview.state === "critical" && !orderedReview.canExport && !orderedReview.canAcknowledge, "Critical review must expose no acknowledgement bypass.")
  const warningReview = buildPreExportReviewModel(project, warningRun)
  assert(warningReview.state === "warning" && warningReview.requiresAcknowledgement && warningReview.canAcknowledge, "Warning review must require explicit acknowledgement.")
  const advisoryReview = buildPreExportReviewModel(project, advisoryRun)
  assert(advisoryReview.state === "advisory" && advisoryReview.canExport && !advisoryReview.requiresAcknowledgement, "Advisories must remain visible without acknowledgement.")
  const clearReview = buildPreExportReviewModel(project, clearRun)
  assert(clearReview.state === "clear" && clearReview.canExport, "Issue-free review must enable Export Cutter.")
  const staleReview = buildPreExportReviewModel({ ...project, revision: 11 }, clearRun)
  assert(staleReview.state === "stale" && !staleReview.canExport, "A stale review cannot enable export.")

  // Error, stale, wrong-trigger and old-ruleset runs fail closed without fake engineering Criticals.
  const errorRun: ValidationRun = { ...clearRun, status: "error" }
  const errorAuthorization = authorizeProjectExport({ project, validationRun: errorRun, exportFormat: "svg" })
  assert(errorAuthorization.ok === false && errorAuthorization.code === "validation_error", "Validation execution errors must prevent export.")
  assert(errorRun.issues.length === 0, "A validation-system error must not become a Critical issue.")
  const staleAuthorization = authorizeProjectExport({ project: { ...project, revision: 11 }, validationRun: clearRun, exportFormat: "svg" })
  assert(staleAuthorization.ok === false && staleAuthorization.code === "stale_validation", "Revision 10 cannot export revision 11.")
  const rulesetAuthorization = authorizeProjectExport({ project, validationRun: { ...clearRun, rulesetVersion: "old-rules" }, exportFormat: "svg" })
  assert(rulesetAuthorization.ok === false && rulesetAuthorization.code === "ruleset_mismatch", "Old ruleset evidence must not authorize export.")
  const liveAuthorization = authorizeProjectExport({ project, validationRun: { ...clearRun, trigger: "live" }, exportFormat: "svg" })
  assert(liveAuthorization.ok === false && liveAuthorization.code === "pre_export_required", "A live run cannot replace a dedicated pre-export run.")
  const runningAuthorization = authorizeProjectExport({ project, validationRun: { ...clearRun, status: "running" }, exportFormat: "svg" })
  assert(runningAuthorization.ok === false && runningAuthorization.code === "validation_incomplete", "An incomplete run cannot enable export.")
  const runningReview = buildPreExportReviewModel(project, { ...clearRun, status: "running" })
  assert(!runningReview.canExport, "An incomplete review must not enable Export Cutter.")

  // Completed evidence persists exact IDs and survives reopen without applying to a new revision.
  const evidenceHolder: { project: KyzaProjectV1 } = {
    project: { ...project, latestValidationRun: warningRun, validationRuns: [warningRun] }
  }
  const completedExport = await executeProjectExport({
    getLatestProject: () => evidenceHolder.project,
    persistProject: projectWithEvidence => {
      evidenceHolder.project = projectWithEvidence
      return { ok: true, value: projectWithEvidence }
    },
    validationRun: warningRun,
    acknowledgement,
    request: {
      format: "ai-compatible-svg",
      tierId: "illustrator-ready",
      source: svgSource,
      options: { includeLayers: true, preserveVector: true, includeValidationReport: true }
    },
    exportId: "export-warning",
    exportedAt: laterTimestamp,
    userId: "test-user",
    deliver: () => ({ status: "saved", method: "file_system_access" })
  })
  assert(completedExport.ok, "A delivered export must append complete immutable evidence.")
  if (!completedExport.ok) return
  const evidenced = completedExport.project
  assert(evidenced.validationAcknowledgements?.[0]?.id === acknowledgement.id, "Acknowledgement must attach to the Project.")
  assert(evidenced.exportAuditRecords?.[0]?.validationRunId === warningRun.id, "Export audit must retain Validation Run ID.")
  assertEqual(evidenced.exportAuditRecords?.[0]?.acknowledgedWarningIssueIds, warningRun.issues.map(candidate => candidate.id), "Audit must retain exact acknowledged Warning IDs.")
  assert(evidenced.exportAuditRecords?.[0]?.projectRevision === project.revision, "Audit must retain Project revision.")
  assert(evidenced.exportAuditRecords?.[0]?.rulesetVersion === BETA_CUTTER_RULESET_VERSION, "Audit must retain ruleset version.")
  assert(evidenced.exportAuditRecords?.[0]?.exportedAt === laterTimestamp, "Audit must retain export timestamp.")
  assert(evidenced.exportAuditRecords?.[0]?.exportFormat === "ai-compatible-svg", "Audit must retain export format.")
  const exportPackage = createExportPackageDraft({
    project: evidenced,
    validation: validationRunToLegacyResult(warningRun),
    exportAudit: warningAuthorized.audit,
    source: "save_export",
    createdAt: laterTimestamp
  })
  assert(exportPackage.exportAudit?.id === warningAuthorized.audit.id, "Export Package metadata must retain the audit record.")
  const jsonPayload = buildKyzaJsonExport({
    project: evidenced,
    validation: validationRunToLegacyResult(warningRun),
    exportPackage,
    exportedAt: laterTimestamp
  })
  assert(jsonPayload.validation.validationRunId === warningRun.id, "JSON export must retain Validation Run ID.")
  assert(jsonPayload.validation.acknowledgementId === acknowledgement.id, "JSON export must retain acknowledgement ID.")
  assertEqual(jsonPayload.validation.acknowledgedWarningIssueIds, warningRun.issues.map(candidate => candidate.id), "JSON export must retain exact acknowledged Warning IDs.")

  const storage = new MemoryStorage()
  assert(saveKyzaProject(evidenced, storage).ok, "Project evidence must save through canonical storage.")
  const reopened = loadKyzaProject(project.id, storage)
  assert(reopened.ok, "Project evidence must reopen.")
  if (!reopened.ok) return
  assert(reopened.value.validationRuns?.[0]?.id === warningRun.id, "Validation history must survive reopen.")
  assert(reopened.value.validationAcknowledgements?.[0]?.id === acknowledgement.id, "Acknowledgement must survive reopen.")
  assert(reopened.value.exportAuditRecords?.[0]?.id === warningAuthorized.audit.id, "Export audit must survive reopen.")
  const newerProject = { ...reopened.value, revision: reopened.value.revision + 1 }
  const oldAcknowledgementRejected = authorizeProjectExport({
    project: newerProject,
    validationRun: warningRun,
    acknowledgement: reopened.value.validationAcknowledgements?.[0],
    exportFormat: "svg"
  })
  assert(!oldAcknowledgementRejected.ok, "Historical acknowledgement must not apply to a newer revision.")

  console.log("Pre-export validation tests passed.")
}

main().catch(error => {
  throw error
})
