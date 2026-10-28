import type {
  CutNFlowProjectV1,
  ParseResult
} from "../project"
import {
  BETA_CUTTER_RULESET_VERSION,
  getEffectiveValidationStatus,
  validateProjectCutter,
  withLatestValidationRun,
  type CutterExportAuthorizationAudit,
  type CutterExportRecordV1,
  type ValidateProjectCutterOptions,
  type ValidationAcknowledgement,
  type ValidationRun
} from "../validation"

export type PreExportValidationErrorCode =
  | "project_unavailable"
  | "revision_changed"
  | "ruleset_mismatch"
  | "persistence_failed"
  | "validation_failed"

export type PreExportValidationResult =
  | {
      ok: true
      project: CutNFlowProjectV1
      run: ValidationRun
      reused: boolean
    }
  | {
      ok: false
      code: PreExportValidationErrorCode
      errors: string[]
    }

export type PreExportValidationOptions = {
  getLatestProject: () => CutNFlowProjectV1 | null | Promise<CutNFlowProjectV1 | null>
  persistProject: (
    project: CutNFlowProjectV1
  ) => ParseResult<CutNFlowProjectV1> | Promise<ParseResult<CutNFlowProjectV1>>
  validate?: (
    project: CutNFlowProjectV1,
    options: ValidateProjectCutterOptions
  ) => ValidationRun | Promise<ValidationRun>
  now?: () => string
  maxRevisionRetries?: number
}

const sameRevision = (
  project: CutNFlowProjectV1,
  run: ValidationRun
) => project.id === run.projectId && String(project.revision) === String(run.projectRevision)

export const runPreExportValidation = async (
  options: PreExportValidationOptions
): Promise<PreExportValidationResult> => {
  const validate = options.validate ?? validateProjectCutter
  const maximumAttempts = Math.max(1, (options.maxRevisionRetries ?? 1) + 1)
  let lastRaceCode: "revision_changed" | "ruleset_mismatch" = "revision_changed"

  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const requestedProject = await options.getLatestProject()
    if (!requestedProject) {
      return {
        ok: false,
        code: "project_unavailable",
        errors: ["The current Project could not be loaded for export validation."]
      }
    }

    const existingRun = requestedProject.latestValidationRun
    const existingStatus = getEffectiveValidationStatus(
      existingRun,
      requestedProject.revision,
    )
    if (
      existingRun?.trigger === "pre_export"
      && (existingStatus === "passed" || existingStatus === "failed")
    ) {
      const currentProject = await options.getLatestProject()
      if (
        currentProject
        && currentProject.id === requestedProject.id
        && currentProject.revision === requestedProject.revision
        && currentProject.latestValidationRun?.id === existingRun.id
      ) {
        return {
          ok: true,
          project: currentProject,
          run: existingRun,
          reused: true,
        }
      }
      lastRaceCode = "revision_changed"
      continue
    }

    let run: ValidationRun
    try {
      run = await validate(requestedProject, {
        trigger: "pre_export",
        ...(options.now ? { now: options.now } : {})
      })
    } catch (error) {
      console.error("[CutNFlow][Pre-export validation] Validation execution failed.", error)
      return {
        ok: false,
        code: "validation_failed",
        errors: ["Validation could not complete."]
      }
    }

    if (run.rulesetVersion !== BETA_CUTTER_RULESET_VERSION) {
      lastRaceCode = "ruleset_mismatch"
      continue
    }

    const currentProject = await options.getLatestProject()
    if (!currentProject) {
      return {
        ok: false,
        code: "project_unavailable",
        errors: ["The current Project could not be loaded after validation."]
      }
    }
    if (!sameRevision(currentProject, run)) {
      lastRaceCode = "revision_changed"
      continue
    }

    const candidate = withLatestValidationRun(currentProject, run)
    const persisted = await options.persistProject(candidate)
    if (persisted.ok === false) {
      return {
        ok: false,
        code: "persistence_failed",
        errors: persisted.errors
      }
    }
    return { ok: true, project: persisted.value, run, reused: false }
  }

  return {
    ok: false,
    code: lastRaceCode,
    errors: [
      lastRaceCode === "ruleset_mismatch"
        ? "Validation used an outdated ruleset. Retry validation before export."
        : "The Project changed while validation was running. Retry validation for the latest revision."
    ]
  }
}

export type ValidationAcknowledgementResult =
  | { ok: true; value: ValidationAcknowledgement }
  | { ok: false; errors: string[] }

const stableIds = (values: readonly string[]) => [...new Set(values)].sort()

const warningIssueIds = (run: ValidationRun) =>
  stableIds(run.issues.filter(issue => issue.severity === "warning").map(issue => issue.id))

const criticalIssueIds = (run: ValidationRun) =>
  stableIds(run.issues.filter(issue => issue.severity === "critical").map(issue => issue.id))

const sameIds = (left: readonly string[], right: readonly string[]) =>
  JSON.stringify(stableIds(left)) === JSON.stringify(stableIds(right))

const recordIdPart = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()

export const createExportRecordId = (projectId: string) => {
  const randomPart = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  return `export-${recordIdPart(projectId)}-${randomPart}`
}

export const createValidationAcknowledgement = (input: {
  project: CutNFlowProjectV1
  validationRun: ValidationRun
  acknowledgedIssueIds: string[]
  acknowledgedAt?: string
  acknowledgedBy?: string
  reason?: string
  exportRequestId?: string
  id?: string
  overrideCriticalErrors?: boolean
}): ValidationAcknowledgementResult => {
  const { project, validationRun } = input
  const criticalIds = criticalIssueIds(validationRun)
  const warningIds = warningIssueIds(validationRun)
  const expectedIds = input.overrideCriticalErrors
    ? stableIds([...criticalIds, ...warningIds])
    : warningIds
  const effectiveStatus = getEffectiveValidationStatus(validationRun, project.revision)
  const errors: string[] = []
  if (!sameRevision(project, validationRun)) errors.push("Acknowledgement must match the current Project revision.")
  if (validationRun.trigger !== "pre_export") errors.push("Acknowledgement requires a pre-export Validation Run.")
  if (validationRun.rulesetVersion !== BETA_CUTTER_RULESET_VERSION) errors.push("Acknowledgement requires the current validation ruleset.")
  if (input.overrideCriticalErrors) {
    if (effectiveStatus !== "failed" || criticalIds.length === 0) errors.push("Critical override requires a completed validation result with Critical issues.")
  } else {
    if (effectiveStatus !== "passed") errors.push("Acknowledgement requires a completed non-Critical validation result.")
    if (warningIds.length === 0) errors.push("Acknowledgement requires at least one Warning issue.")
  }
  if (!sameIds(input.acknowledgedIssueIds, expectedIds)) {
    errors.push(input.overrideCriticalErrors
      ? "Critical override must include every current Critical and Warning issue ID and no others."
      : "Acknowledgement must include every current Warning issue ID and no others.")
  }
  if (errors.length > 0) return { ok: false, errors }

  const acknowledgedAt = input.acknowledgedAt ?? new Date().toISOString()
  return {
    ok: true,
    value: {
      id: input.id ?? `validation-ack-${recordIdPart(project.id)}-${Date.parse(acknowledgedAt)}`,
      projectId: project.id,
      projectRevision: project.revision,
      validationRunId: validationRun.id,
      rulesetVersion: validationRun.rulesetVersion,
      acknowledgedIssueIds: expectedIds,
      acknowledgedAt,
      ...(input.acknowledgedBy ? { acknowledgedBy: input.acknowledgedBy } : {}),
      ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}),
      ...(input.exportRequestId ? { exportRequestId: input.exportRequestId } : {}),
      ...(input.overrideCriticalErrors
        ? { overrideCriticalErrors: true, overriddenCriticalIssueIds: criticalIds }
        : {})
    }
  }
}

export type ExportAuthorizationErrorCode =
  | "pre_export_required"
  | "stale_validation"
  | "ruleset_mismatch"
  | "validation_error"
  | "validation_incomplete"
  | "critical_issues"
  | "warning_acknowledgement_required"
  | "invalid_acknowledgement"

export type ExportAuthorizationResult =
  | { ok: true; audit: CutterExportAuthorizationAudit }
  | { ok: false; code: ExportAuthorizationErrorCode; errors: string[] }

export const authorizeProjectExport = (input: {
  project: CutNFlowProjectV1
  validationRun: ValidationRun
  acknowledgement?: ValidationAcknowledgement
  exportFormat: string
  exportId?: string
  exportedAt?: string
  userId?: string
}): ExportAuthorizationResult => {
  const { project, validationRun } = input
  if (validationRun.trigger !== "pre_export") {
    return { ok: false, code: "pre_export_required", errors: ["Run pre-export validation before exporting."] }
  }
  if (validationRun.rulesetVersion !== BETA_CUTTER_RULESET_VERSION) {
    return { ok: false, code: "ruleset_mismatch", errors: ["Validation uses an outdated ruleset. Run validation again."] }
  }
  if (!sameRevision(project, validationRun)) {
    return { ok: false, code: "stale_validation", errors: ["Validation does not match the current Project revision."] }
  }
  const effectiveStatus = getEffectiveValidationStatus(validationRun, project.revision)
  if (effectiveStatus === "error" || validationRun.status === "error") {
    return { ok: false, code: "validation_error", errors: ["Validation could not complete. Retry validation before export."] }
  }
  if (effectiveStatus !== "passed" && effectiveStatus !== "failed") {
    return { ok: false, code: "validation_incomplete", errors: ["Validation has not completed for the current Project revision."] }
  }
  const criticalIds = criticalIssueIds(validationRun)
  const warningIds = warningIssueIds(validationRun)
  const exportedAt = input.exportedAt ?? new Date().toISOString()
  const exportId = input.exportId ?? createExportRecordId(project.id)
  if (criticalIds.length > 0 || effectiveStatus === "failed") {
    const acknowledgement = input.acknowledgement
    const expectedIds = stableIds([...criticalIds, ...warningIds])
    const valid =
      acknowledgement?.overrideCriticalErrors === true &&
      acknowledgement.projectId === project.id &&
      String(acknowledgement.projectRevision) === String(project.revision) &&
      acknowledgement.validationRunId === validationRun.id &&
      acknowledgement.rulesetVersion === validationRun.rulesetVersion &&
      (!acknowledgement.exportRequestId || acknowledgement.exportRequestId === exportId) &&
      sameIds(acknowledgement.acknowledgedIssueIds, expectedIds) &&
      sameIds(acknowledgement.overriddenCriticalIssueIds ?? [], criticalIds)
    if (!acknowledgement) {
      return { ok: false, code: "critical_issues", errors: ["Critical issues require the explicit Override errors export checkbox."] }
    }
    if (!valid) {
      return { ok: false, code: "invalid_acknowledgement", errors: ["Critical override does not match this validation run and Project revision."] }
    }
  }

  if (criticalIds.length === 0 && warningIds.length > 0 && !input.acknowledgement) {
    return { ok: false, code: "warning_acknowledgement_required", errors: ["Review and acknowledge the current Warnings before export."] }
  }
  if (criticalIds.length === 0 && warningIds.length > 0 && input.acknowledgement) {
    const acknowledgement = input.acknowledgement
    const valid =
      acknowledgement.projectId === project.id &&
      String(acknowledgement.projectRevision) === String(project.revision) &&
      acknowledgement.validationRunId === validationRun.id &&
      acknowledgement.rulesetVersion === validationRun.rulesetVersion &&
      (!acknowledgement.exportRequestId || acknowledgement.exportRequestId === exportId) &&
      sameIds(acknowledgement.acknowledgedIssueIds, warningIds)
    if (!valid) {
      return { ok: false, code: "invalid_acknowledgement", errors: ["Warning acknowledgement does not match this validation run and Project revision."] }
    }
  }

  const applicableAcknowledgement = criticalIds.length > 0 || warningIds.length > 0
    ? input.acknowledgement
    : undefined
  return {
    ok: true,
    audit: {
      id: exportId,
      projectId: project.id,
      projectRevision: project.revision,
      validationRunId: validationRun.id,
      rulesetVersion: validationRun.rulesetVersion,
      validationStatus: validationRun.status,
      criticalCount: validationRun.summary.criticalCount,
      warningCount: validationRun.summary.warningCount,
      advisoryCount: validationRun.summary.advisoryCount,
      criticalIssueIds: criticalIds,
      warningIssueIds: warningIds,
      advisoryIssueIds: stableIds(validationRun.issues.filter(issue => issue.severity === "advisory").map(issue => issue.id)),
      ...(applicableAcknowledgement ? { acknowledgementId: applicableAcknowledgement.id } : {}),
      acknowledgedWarningIssueIds: applicableAcknowledgement
        ? stableIds(applicableAcknowledgement.acknowledgedIssueIds.filter(id => warningIds.includes(id)))
        : [],
      ...(criticalIds.length > 0
        ? { overriddenCriticalIssueIds: criticalIds }
        : {}),
      exportedAt,
      exportFormat: input.exportFormat,
      ...(input.userId ? { userId: input.userId } : {})
    }
  }
}

export const withCompletedExportEvidence = (
  project: CutNFlowProjectV1,
  audit: CutterExportRecordV1,
  acknowledgement?: ValidationAcknowledgement
): ParseResult<CutNFlowProjectV1> => {
  if (audit.projectId !== project.id || String(audit.projectRevision) !== String(project.revision)) {
    return {
      ok: false,
      errors: ["Export evidence must match the current Project ID and revision."]
    }
  }
  if ((project.exportAuditRecords ?? []).some(candidate => candidate.id === audit.id)) {
    return {
      ok: false,
      errors: [`Duplicate export record ID "${audit.id}" is not allowed.`]
    }
  }
  const acknowledgements = [...(project.validationAcknowledgements ?? [])]
  if (acknowledgement) {
    const existing = acknowledgements.find(candidate => candidate.id === acknowledgement.id)
    if (existing && JSON.stringify(existing) !== JSON.stringify(acknowledgement)) {
      return {
        ok: false,
        errors: [`Validation acknowledgement "${acknowledgement.id}" is immutable.`]
      }
    }
    if (!existing) acknowledgements.push(acknowledgement)
  }
  return {
    ok: true,
    value: {
      ...project,
      ...(acknowledgement ? { validationAcknowledgements: acknowledgements } : {}),
      exportAuditRecords: [...(project.exportAuditRecords ?? []), audit]
    }
  }
}
