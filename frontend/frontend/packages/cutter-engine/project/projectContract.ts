import type { FlowwrapSpec } from "../types"
import {
  CUTNFLOW_EXPORT_RECORD_VERSION,
  type CutterExportAuditRecord,
  type ValidationAcknowledgement,
  type ValidationIssue,
  type ValidationRun
} from "../validation/validationTypes"
import { normaliseElementIdentityMap } from "./elementIdentity"
import {
  CUTNFLOW_PROJECT_COORDINATE_SPACE,
  CUTNFLOW_PROJECT_SCHEMA_VERSION,
  CUTNFLOW_PROJECT_UNITS,
  type CreateCutNFlowProjectV1Input,
  type CutNFlowCutterProjectV1,
  type CutNFlowProjectDraftV1,
  type CutNFlowProjectV1,
  type ExportSettingsV1,
  type ProjectMetadataV1,
  type ParseResult
} from "./projectTypes"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  Number.isFinite(Date.parse(value))

const cloneJson = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T

const normalizeTimestamp = (value: string) => new Date(value).toISOString()

const rejectUnknownFields = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
  errors: string[]
) => {
  Object.keys(value)
    .filter(field => !allowed.has(field))
    .forEach(field => {
      errors.push(`${path}${field} is not supported by Project schema version 1.`)
    })
}

const projectFields = new Set([
  "schemaVersion",
  "id",
  "revision",
  "name",
  "createdAt",
  "updatedAt",
  "metadata",
  "cutter",
  "projectDraft",
  "artwork",
  "exportSettings",
  "latestValidationRun",
  "validationRuns",
  "validationAcknowledgements",
  "exportAuditRecords"
])

const cutterFields = new Set([
  "units",
  "coordinateSpace",
  "packType",
  "legacySpec",
  "identityMap"
])

const metadataFields = [
  "customerOrBrand",
  "productName",
  "jobReference",
  "description",
  "notes",
  "requestedPackType"
] as const

const parseProjectMetadata = (
  value: unknown,
  errors: string[]
): ProjectMetadataV1 | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    errors.push("metadata must be an object when provided.")
    return undefined
  }
  rejectUnknownFields(value, new Set(metadataFields), "metadata.", errors)
  const metadata: ProjectMetadataV1 = {}
  metadataFields.forEach(field => {
    const fieldValue = value[field]
    if (fieldValue === undefined) return
    if (!isNonEmptyString(fieldValue)) {
      errors.push(`metadata.${field} must be a non-empty string when provided.`)
      return
    }
    metadata[field] = fieldValue.trim()
  })
  return metadata
}

const validateLegacySpec = (value: unknown, errors: string[]) => {
  if (!isRecord(value)) {
    errors.push("cutter.legacySpec must be an object.")
    return false
  }

  for (const field of ["width", "height", "seal"] as const) {
    if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
      errors.push(`cutter.legacySpec.${field} must be a finite number.`)
    }
  }
  return true
}

const parseExportSettings = (
  value: unknown,
  errors: string[]
): ExportSettingsV1 | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    errors.push("exportSettings must be an object when provided.")
    return undefined
  }

  const format = value.format
  if (format !== undefined && format !== "pdf" && format !== "svg" && format !== "ai") {
    errors.push('exportSettings.format must be "pdf", "svg", or "ai".')
  }
  if (value.preserveVector !== undefined && typeof value.preserveVector !== "boolean") {
    errors.push("exportSettings.preserveVector must be a boolean.")
  }
  if (value.includeLayers !== undefined && typeof value.includeLayers !== "boolean") {
    errors.push("exportSettings.includeLayers must be a boolean.")
  }

  return {
    ...(format === "pdf" || format === "svg" || format === "ai" ? { format } : {}),
    ...(typeof value.preserveVector === "boolean"
      ? { preserveVector: value.preserveVector }
      : {}),
    ...(typeof value.includeLayers === "boolean"
      ? { includeLayers: value.includeLayers }
      : {})
  }
}

const validationStatuses = ["not_run", "running", "passed", "failed", "stale", "error"] as const
const validationTriggers = ["live", "manual", "pre_export"] as const
const validationSeverities = ["critical", "warning", "advisory"] as const

const parseValidationIssue = (
  value: unknown,
  index: number,
  errors: string[],
  runPath = "latestValidationRun"
): ValidationIssue | undefined => {
  const path = `${runPath}.issues[${index}]`
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`)
    return undefined
  }
  for (const field of ["id", "ruleId", "title", "message"] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`${path}.${field} must be a non-empty string.`)
  }
  if (!validationSeverities.includes(value.severity as typeof validationSeverities[number])) {
    errors.push(`${path}.severity is invalid.`)
  }
  const severity = value.severity
  const expectedBlocksExport = severity === "critical"
  const expectedAcknowledgement = severity === "warning"
  if (value.blocksExport !== expectedBlocksExport) {
    errors.push(`${path}.blocksExport must follow the central severity policy.`)
  }
  if (value.acknowledgementAllowed !== expectedAcknowledgement) {
    errors.push(`${path}.acknowledgementAllowed must follow the central severity policy.`)
  }
  for (const field of ["affectedElementId", "affectedElementType", "affectedArea", "unit", "suggestedAction"] as const) {
    if (value[field] !== undefined && !isNonEmptyString(value[field])) {
      errors.push(`${path}.${field} must be a non-empty string when provided.`)
    }
  }
  if (value.fixAction !== undefined) {
    if (!isRecord(value.fixAction)) {
      errors.push(`${path}.fixAction must be an object when provided.`)
    } else {
      for (const field of ["id", "label", "actionType"] as const) {
        if (!isNonEmptyString(value.fixAction[field])) {
          errors.push(`${path}.fixAction.${field} must be a non-empty string.`)
        }
      }
      if (
        !Array.isArray(value.fixAction.affectedElementIds) ||
        !value.fixAction.affectedElementIds.every(isNonEmptyString)
      ) {
        errors.push(`${path}.fixAction.affectedElementIds must be a string array.`)
      }
      if (value.fixAction.parameters !== undefined && !isRecord(value.fixAction.parameters)) {
        errors.push(`${path}.fixAction.parameters must be an object when provided.`)
      }
    }
  }
  return cloneJson(value as ValidationIssue)
}

const parseValidationRun = (
  value: unknown,
  projectId: unknown,
  errors: string[],
  path = "latestValidationRun"
): ValidationRun | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    errors.push(`${path} must be an object when provided.`)
    return undefined
  }
  if (!isNonEmptyString(value.id)) errors.push(`${path}.id must be a non-empty string.`)
  if (!isNonEmptyString(value.projectId)) {
    errors.push(`${path}.projectId must be a non-empty string.`)
  } else if (isNonEmptyString(projectId) && value.projectId !== projectId) {
    errors.push(`${path}.projectId must match the parent project ID.`)
  }
  if (!(
    (typeof value.projectRevision === "string" && value.projectRevision.trim().length > 0) ||
    (typeof value.projectRevision === "number" && Number.isFinite(value.projectRevision))
  )) {
    errors.push(`${path}.projectRevision must be a non-empty string or finite number.`)
  }
  if (!validationStatuses.includes(value.status as typeof validationStatuses[number])) {
    errors.push(`${path}.status is invalid.`)
  }
  if (!validationTriggers.includes(value.trigger as typeof validationTriggers[number])) {
    errors.push(`${path}.trigger is invalid.`)
  }
  if (!isIsoTimestamp(value.startedAt)) errors.push(`${path}.startedAt must be a valid timestamp.`)
  if (value.completedAt !== undefined && !isIsoTimestamp(value.completedAt)) {
    errors.push(`${path}.completedAt must be a valid timestamp when provided.`)
  }
  if (!isNonEmptyString(value.rulesetVersion)) {
    errors.push(`${path}.rulesetVersion must be a non-empty string.`)
  }

  const issues = Array.isArray(value.issues)
    ? value.issues.map((issue, index) => parseValidationIssue(issue, index, errors, path)).filter(
        (issue): issue is ValidationIssue => Boolean(issue)
      )
    : []
  if (!Array.isArray(value.issues)) errors.push(`${path}.issues must be an array.`)

  const summary = value.summary
  if (!isRecord(summary)) {
    errors.push(`${path}.summary must be an object.`)
  } else {
    for (const field of ["criticalCount", "warningCount", "advisoryCount", "issueCount"] as const) {
      if (!Number.isInteger(summary[field]) || (summary[field] as number) < 0) {
        errors.push(`${path}.summary.${field} must be a non-negative integer.`)
      }
    }
    if (typeof summary.blocksExport !== "boolean") {
      errors.push(`${path}.summary.blocksExport must be a boolean.`)
    }
    const criticalCount = issues.filter(issue => issue.severity === "critical").length
    const warningCount = issues.filter(issue => issue.severity === "warning").length
    const advisoryCount = issues.filter(issue => issue.severity === "advisory").length
    if (
      summary.criticalCount !== criticalCount ||
      summary.warningCount !== warningCount ||
      summary.advisoryCount !== advisoryCount ||
      summary.issueCount !== issues.length ||
      summary.blocksExport !== (criticalCount > 0)
    ) {
      errors.push(`${path}.summary must match its structured issues.`)
    }
  }
  return cloneJson(value as ValidationRun)
}

const hasRevision = (value: unknown) =>
  (typeof value === "string" && value.trim().length > 0) ||
  (typeof value === "number" && Number.isFinite(value))

const parseValidationAcknowledgement = (
  value: unknown,
  projectId: unknown,
  index: number,
  errors: string[]
): ValidationAcknowledgement | undefined => {
  const path = `validationAcknowledgements[${index}]`
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`)
    return undefined
  }
  for (const field of ["id", "projectId", "validationRunId", "rulesetVersion"] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`${path}.${field} must be a non-empty string.`)
  }
  if (isNonEmptyString(projectId) && value.projectId !== projectId) {
    errors.push(`${path}.projectId must match the parent project ID.`)
  }
  if (!hasRevision(value.projectRevision)) errors.push(`${path}.projectRevision must be a string or finite number.`)
  if (!Array.isArray(value.acknowledgedIssueIds) || !value.acknowledgedIssueIds.every(isNonEmptyString)) {
    errors.push(`${path}.acknowledgedIssueIds must be a string array.`)
  }
  if (!isIsoTimestamp(value.acknowledgedAt)) errors.push(`${path}.acknowledgedAt must be a valid timestamp.`)
  if (value.overrideCriticalErrors !== undefined && typeof value.overrideCriticalErrors !== "boolean") {
    errors.push(`${path}.overrideCriticalErrors must be boolean when provided.`)
  }
  if (value.overriddenCriticalIssueIds !== undefined && (
    !Array.isArray(value.overriddenCriticalIssueIds) ||
    !value.overriddenCriticalIssueIds.every(isNonEmptyString)
  )) {
    errors.push(`${path}.overriddenCriticalIssueIds must be a string array when provided.`)
  }
  for (const field of ["acknowledgedBy", "reason", "exportRequestId"] as const) {
    if (value[field] !== undefined && !isNonEmptyString(value[field])) {
      errors.push(`${path}.${field} must be a non-empty string when provided.`)
    }
  }
  return cloneJson(value as ValidationAcknowledgement)
}

const parseExportAuditRecord = (
  value: unknown,
  projectId: unknown,
  index: number,
  errors: string[]
): CutterExportAuditRecord | undefined => {
  const path = `exportAuditRecords[${index}]`
  if (!isRecord(value)) {
    errors.push(`${path} must be an object.`)
    return undefined
  }
  for (const field of ["id", "projectId", "validationRunId", "rulesetVersion", "exportFormat"] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`${path}.${field} must be a non-empty string.`)
  }
  if (isNonEmptyString(projectId) && value.projectId !== projectId) {
    errors.push(`${path}.projectId must match the parent project ID.`)
  }
  if (!hasRevision(value.projectRevision)) errors.push(`${path}.projectRevision must be a string or finite number.`)
  if (!validationStatuses.includes(value.validationStatus as typeof validationStatuses[number])) {
    errors.push(`${path}.validationStatus is invalid.`)
  }
  for (const field of ["criticalCount", "warningCount", "advisoryCount"] as const) {
    if (!Number.isInteger(value[field]) || (value[field] as number) < 0) {
      errors.push(`${path}.${field} must be a non-negative integer.`)
    }
  }
  for (const field of ["criticalIssueIds", "warningIssueIds", "advisoryIssueIds", "acknowledgedWarningIssueIds"] as const) {
    if (!Array.isArray(value[field]) || !(value[field] as unknown[]).every(isNonEmptyString)) {
      errors.push(`${path}.${field} must be a string array.`)
    }
  }
  if (value.overriddenCriticalIssueIds !== undefined && (
    !Array.isArray(value.overriddenCriticalIssueIds) ||
    !value.overriddenCriticalIssueIds.every(isNonEmptyString)
  )) {
    errors.push(`${path}.overriddenCriticalIssueIds must be a string array when provided.`)
  }
  for (const field of ["acknowledgementId", "userId"] as const) {
    if (value[field] !== undefined && !isNonEmptyString(value[field])) {
      errors.push(`${path}.${field} must be a non-empty string when provided.`)
    }
  }
  if (value.betaReview !== undefined || value.exportFormat === "beta-review-snapshot") {
    const review = value.betaReview
    if (!isRecord(review) || review.purpose !== "unapproved-beta-review" || review.productionApproved !== false ||
      !isNonEmptyString(review.reviewer) || !isNonEmptyString(review.reason) || !isNonEmptyString(review.snapshotVersion) ||
      !Array.isArray(review.acknowledgedIssueIds) || !review.acknowledgedIssueIds.every(isNonEmptyString) ||
      value.exportFormat !== "beta-review-snapshot") {
      errors.push(`${path}.betaReview requires an unapproved beta review decision, reviewer, reason and acknowledged issue IDs.`)
    } else {
      const requiredIds = [...new Set([...(Array.isArray(value.criticalIssueIds) ? value.criticalIssueIds : []), ...(Array.isArray(value.warningIssueIds) ? value.warningIssueIds : [])])].sort()
      const acknowledged = [...new Set(review.acknowledgedIssueIds as string[])].sort()
      if (JSON.stringify(requiredIds) !== JSON.stringify(acknowledged) || (review.reviewer as string).trim().length > 100 || (review.reason as string).trim().length > 1000) {
        errors.push(`${path}.betaReview must acknowledge all critical/warning findings and use valid reviewer/reason lengths.`)
      }
    }
  }
  if (!isIsoTimestamp(value.exportedAt)) errors.push(`${path}.exportedAt must be a valid timestamp.`)
  if (value.recordVersion !== undefined) {
    if (value.recordVersion !== CUTNFLOW_EXPORT_RECORD_VERSION) {
      errors.push(`${path}.recordVersion is unsupported.`)
    }
    for (const field of ["exportTier", "filename", "mimeType", "generatorResult", "deliveryStatus", "deliveryMethod"] as const) {
      if (!isNonEmptyString(value[field])) errors.push(`${path}.${field} must be a non-empty string.`)
    }
    if (value.generatorResult !== "generated") errors.push(`${path}.generatorResult is invalid.`)
    if (!["saved", "download_initiated"].includes(String(value.deliveryStatus))) errors.push(`${path}.deliveryStatus is invalid.`)
    if (!["file_system_access", "browser_download"].includes(String(value.deliveryMethod))) errors.push(`${path}.deliveryMethod is invalid.`)
    if (!Number.isInteger(value.sizeBytes) || (value.sizeBytes as number) < 0) errors.push(`${path}.sizeBytes must be a non-negative integer.`)
    const options = value.options
    if (!isRecord(options)) {
      errors.push(`${path}.options must be an object.`)
    } else {
      for (const field of ["includeLayers", "preserveVector", "includeValidationReport"] as const) {
        if (typeof options[field] !== "boolean") errors.push(`${path}.options.${field} must be boolean.`)
      }
      if (options.marginMm !== undefined && (typeof options.marginMm !== "number" || !Number.isFinite(options.marginMm))) {
        errors.push(`${path}.options.marginMm must be a finite number when provided.`)
      }
    }
    const packReference = value.packReference
    if (!isRecord(packReference)) {
      errors.push(`${path}.packReference must be an object.`)
    } else {
      for (const field of ["packTypeId", "enginePackTypeId"] as const) {
        if (!isNonEmptyString(packReference[field])) errors.push(`${path}.packReference.${field} must be a non-empty string.`)
      }
    }
    const cutterReference = value.cutterReference
    if (!isRecord(cutterReference)) {
      errors.push(`${path}.cutterReference must be an object.`)
    } else {
      for (const field of ["packTypeId", "units", "coordinateSpace"] as const) {
        if (!isNonEmptyString(cutterReference[field])) errors.push(`${path}.cutterReference.${field} must be a non-empty string.`)
      }
      if (cutterReference.units !== "mm") errors.push(`${path}.cutterReference.units must be "mm".`)
      if (!Array.isArray(cutterReference.elementIds) || !cutterReference.elementIds.every(isNonEmptyString)) {
        errors.push(`${path}.cutterReference.elementIds must be a string array.`)
      }
    }
    const validateDimensions = (field: "dimensions" | "page") => {
      const dimensions = value[field]
      if (!isRecord(dimensions)) {
        errors.push(`${path}.${field} must be an object.`)
        return
      }
      for (const axis of ["widthMm", "heightMm"] as const) {
        if (typeof dimensions[axis] !== "number" || !Number.isFinite(dimensions[axis]) || (dimensions[axis] as number) <= 0) {
          errors.push(`${path}.${field}.${axis} must be a positive finite number.`)
        }
      }
    }
    validateDimensions("dimensions")
    validateDimensions("page")
    if (isRecord(value.dimensions) && value.dimensions.units !== "mm") errors.push(`${path}.dimensions.units must be "mm".`)
    if (value.snapshot !== undefined) {
      const snapshot = value.snapshot
      if (!isRecord(snapshot)) {
        errors.push(`${path}.snapshot must be an object when provided.`)
      } else {
        if (!isNonEmptyString(snapshot.projectName)) errors.push(`${path}.snapshot.projectName must be a non-empty string.`)
        if (!isNonEmptyString(snapshot.packType)) errors.push(`${path}.snapshot.packType must be a non-empty string.`)
        if (!isRecord(snapshot.cutterSpec)) errors.push(`${path}.snapshot.cutterSpec must be an object.`)
        if (!isRecord(snapshot.validationRun)) errors.push(`${path}.snapshot.validationRun must be an object.`)
      }
    }
    const layers = value.layers
    if (!isRecord(layers) || !Number.isInteger(layers.count) || !Array.isArray(layers.ids) || !layers.ids.every(isNonEmptyString) || !Array.isArray(layers.names) || !layers.names.every(isNonEmptyString)) {
      errors.push(`${path}.layers must contain a count plus string ID and name arrays.`)
    } else if (layers.count !== layers.ids.length || layers.ids.length !== layers.names.length) {
      errors.push(`${path}.layers count, IDs and names must align.`)
    }
  }
  return cloneJson(value as CutterExportAuditRecord)
}

const packWorkspaceStringFields = [
  "packType",
  "productDescription",
  "orientation",
  "materialNotes",
  "machineConstraints",
  "openingRequirements",
  "foldsOrGussetNotes",
  "featuresNotes"
] as const

const packWorkspaceNumberFields = [
  "finishedWidthMm",
  "finishedHeightMm",
  "gussetMm",
  "trimMm",
  "fillWeightG",
  "fillVolumeMl",
  "sealTopMm",
  "sealBottomMm",
  "sealLeftMm",
  "sealRightMm",
  "eyemarkCount",
  "minimumSafeZoneMm",
  "bleedMm"
] as const

const packWorkspaceBooleanFields = ["zipEnabled"] as const

const parsePackWorkspace = (value: unknown, errors: string[]) => {
  if (value === undefined) return
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.fields)) {
    errors.push("projectDraft.workspace must be a version 1 Pack Specification workspace.")
    return
  }
  const validStates = ["missing", "proposed", "confirmed"]
  const validSources = ["user", "flowai", "import", "cnf-tech", "preset"]
  const validateField = (field: string, expected: "string" | "number" | "boolean", optional = false) => {
    const entry = value.fields[field]
    if (entry === undefined && optional) return
    if (!isRecord(entry)) {
      errors.push(`projectDraft.workspace.fields.${field} must be a provenance value.`)
      return
    }
    if (!validStates.includes(String(entry.state)) || !validSources.includes(String(entry.source))) {
      errors.push(`projectDraft.workspace.fields.${field} has invalid provenance.`)
    }
    if (entry.state === "missing" && entry.value !== undefined) {
      errors.push(`projectDraft.workspace.fields.${field} cannot hold a value while missing.`)
    }
    if ((entry.state === "proposed" || entry.state === "confirmed") && entry.value === undefined) {
      errors.push(`projectDraft.workspace.fields.${field} requires a value when ${entry.state}.`)
    }
    if (entry.value !== undefined && (
      typeof entry.value !== expected ||
      (expected === "number" && !Number.isFinite(entry.value as number))
    )) {
      errors.push(`projectDraft.workspace.fields.${field}.value must be ${expected === "number" ? "a finite number" : `a ${expected}`}.`)
    }
    if (field === "eyemarkCount" && entry.value !== undefined && ![0, 1, 2].includes(entry.value as number)) {
      errors.push("projectDraft.workspace.fields.eyemarkCount must be 0, 1, or 2.")
    }
    if (entry.confidence !== undefined && !["low", "medium", "high"].includes(String(entry.confidence))) {
      errors.push(`projectDraft.workspace.fields.${field}.confidence is invalid.`)
    }
    if (entry.note !== undefined && typeof entry.note !== "string") {
      errors.push(`projectDraft.workspace.fields.${field}.note must be a string.`)
    }
  }
  packWorkspaceStringFields.forEach(field => validateField(field, "string"))
  packWorkspaceNumberFields.forEach(field => validateField(field, "number", field === "trimMm"))
  packWorkspaceBooleanFields.forEach(field => validateField(field, "boolean", true))
  if (!Array.isArray(value.assumptions) || !value.assumptions.every(isNonEmptyString)) {
    errors.push("projectDraft.workspace.assumptions must be a string array.")
  }
  if (typeof value.assumptionsReviewed !== "boolean") {
    errors.push("projectDraft.workspace.assumptionsReviewed must be a boolean.")
  }
  if (!Array.isArray(value.unresolvedQuestions) || !value.unresolvedQuestions.every(isNonEmptyString)) {
    errors.push("projectDraft.workspace.unresolvedQuestions must be a string array.")
  }
  if (value.selectedRecommendationId !== undefined && !isNonEmptyString(value.selectedRecommendationId)) {
    errors.push("projectDraft.workspace.selectedRecommendationId must be a non-empty string when provided.")
  }
  if (value.lastSavedAt !== undefined && !isIsoTimestamp(value.lastSavedAt)) {
    errors.push("projectDraft.workspace.lastSavedAt must be a valid timestamp when provided.")
  }
  const completion = value.completion
  const statuses = ["Empty", "Draft", "Needs Information", "Ready for Cutter Review"]
  if (!isRecord(completion) || !statuses.includes(String(completion.status))) {
    errors.push("projectDraft.workspace.completion has an invalid status.")
  } else if (
    !Array.isArray(completion.requiredCompleted) ||
    !completion.requiredCompleted.every(isNonEmptyString) ||
    !Array.isArray(completion.requiredMissing) ||
    !completion.requiredMissing.every(isNonEmptyString) ||
    !Array.isArray(completion.proposedAwaitingConfirmation) ||
    !completion.proposedAwaitingConfirmation.every(isNonEmptyString) ||
    !Number.isInteger(completion.assumptionsAwaitingReview) ||
    (completion.assumptionsAwaitingReview as number) < 0
  ) {
    errors.push("projectDraft.workspace.completion is invalid.")
  }
}

const parseProjectDraft = (
  value: unknown,
  errors: string[]
): CutNFlowProjectDraftV1 | undefined => {
  if (value === undefined) return undefined
  if (!isRecord(value)) {
    errors.push("projectDraft must be an object when provided.")
    return undefined
  }
  for (const field of ["id", "name"] as const) {
    if (!isNonEmptyString(value[field])) {
      errors.push(`projectDraft.${field} must be a non-empty string.`)
    }
  }
  if (typeof value.productPrompt !== "string") {
    errors.push("projectDraft.productPrompt must be a string.")
  }
  if (value.status !== "draft") errors.push('projectDraft.status must be "draft".')
  if (value.source !== "pack_generator") {
    errors.push('projectDraft.source must be "pack_generator".')
  }
  if (!isIsoTimestamp(value.createdAt) || !isIsoTimestamp(value.updatedAt)) {
    errors.push("projectDraft timestamps must be valid ISO-compatible timestamps.")
  }

  const specification = value.packSpecification
  if (specification !== undefined && !isRecord(specification)) {
    errors.push("projectDraft.packSpecification must be an object when provided.")
  } else if (isRecord(specification)) {
    if (!isNonEmptyString(specification.packTypeId) || !isNonEmptyString(specification.displayName)) {
      errors.push("projectDraft.packSpecification requires packTypeId and displayName.")
    }
    if (specification.enginePackTypeId !== undefined && !isNonEmptyString(specification.enginePackTypeId)) {
      errors.push("projectDraft.packSpecification.enginePackTypeId must be a non-empty string when provided.")
    }
    if (specification.source !== "pack_generator") {
      errors.push('projectDraft.packSpecification.source must be "pack_generator".')
    }
    if (!["high", "medium", "low", "needs_review"].includes(String(specification.confidence))) {
      errors.push("projectDraft.packSpecification.confidence is invalid.")
    }
    if (!Array.isArray(specification.assumptions) || !specification.assumptions.every(isNonEmptyString)) {
      errors.push("projectDraft.packSpecification.assumptions must be a string array.")
    }
    const defaults = specification.starterDefaults
    if (!isRecord(defaults) || !isRecord(defaults.sealsMm)) {
      errors.push("projectDraft.packSpecification.starterDefaults is invalid.")
    } else {
      const numericValues = [
        defaults.sealsMm.top,
        defaults.sealsMm.bottom,
        defaults.sealsMm.left,
        defaults.sealsMm.right,
        defaults.bleedMm,
        defaults.minimumSafeZoneMm,
        defaults.eyemarkCount
      ]
      if (!numericValues.every(item => typeof item === "number" && Number.isFinite(item))) {
        errors.push("projectDraft starter defaults must contain finite numeric values.")
      }
      if (![0, 1, 2].includes(defaults.eyemarkCount as number)) {
        errors.push("projectDraft starter default eyemarkCount must be 0, 1, or 2.")
      }
      if (typeof defaults.dimensionsRequireConfirmation !== "boolean") {
        errors.push("projectDraft starter defaults require a dimensions confirmation flag.")
      }
    }
  }
  parsePackWorkspace(value.workspace, errors)
  const validHistoryActions = [
    "pack_recommendation_accepted",
    "pack_draft_saved",
    "cutter_created",
    "cutter_updated"
  ]
  if (!Array.isArray(value.history) || value.history.some(entry =>
    !isRecord(entry) ||
    !isNonEmptyString(entry.id) ||
    !validHistoryActions.includes(String(entry.action)) ||
    !isIsoTimestamp(entry.createdAt)
  )) {
    errors.push("projectDraft.history contains an invalid entry.")
  }
  return cloneJson(value as CutNFlowProjectDraftV1)
}

export const createCutNFlowProjectId = () => {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) {
    return `cutnflow-project-${randomUuid}`
  }
  return `cutnflow-project-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export const createCutNFlowProjectV1 = (
  input: CreateCutNFlowProjectV1Input
): CutNFlowProjectV1 => {
  const now = new Date().toISOString()
  const createdAt = input.createdAt ?? now
  const updatedAt = input.updatedAt ?? createdAt
  const id = input.id?.trim() || createCutNFlowProjectId()
  const hasPackType = typeof input.packType === "string" && input.packType.trim().length > 0
  const hasLegacySpec = input.legacySpec !== undefined
  if (hasPackType !== hasLegacySpec) {
    throw new Error("A Project requires both packType and legacySpec when Cutter data is present.")
  }
  if (!hasLegacySpec && input.identityMap !== undefined) {
    throw new Error("A Project cannot contain Cutter element identity without Cutter data.")
  }
  const identity = hasPackType && input.legacySpec
    ? normaliseElementIdentityMap(input.legacySpec, input.identityMap, id)
    : null
  if (identity && identity.errors.length > 0) throw new Error(identity.errors.join(" "))
  return {
    schemaVersion: CUTNFLOW_PROJECT_SCHEMA_VERSION,
    id,
    revision:
      Number.isInteger(input.revision) && (input.revision ?? 0) > 0
        ? input.revision!
        : 1,
    name: input.name.trim(),
    createdAt: normalizeTimestamp(createdAt),
    updatedAt: normalizeTimestamp(updatedAt),
    ...(input.metadata !== undefined
      ? { metadata: cloneJson(input.metadata) }
      : {}),
    ...(hasPackType && input.legacySpec && identity
      ? {
          cutter: {
            units: CUTNFLOW_PROJECT_UNITS,
            coordinateSpace: CUTNFLOW_PROJECT_COORDINATE_SPACE,
            packType: input.packType!.trim(),
            legacySpec: cloneJson(input.legacySpec),
            identityMap: identity.identityMap
          }
        }
      : {}),
    ...(input.projectDraft !== undefined
      ? { projectDraft: cloneJson(input.projectDraft) }
      : {}),
    ...(input.artwork !== undefined ? { artwork: cloneJson(input.artwork) } : {}),
    ...(input.exportSettings !== undefined
      ? { exportSettings: cloneJson(input.exportSettings) }
      : {}),
    ...(input.latestValidationRun !== undefined
      ? { latestValidationRun: cloneJson(input.latestValidationRun) }
      : {}),
    ...(input.validationRuns !== undefined
      ? { validationRuns: cloneJson(input.validationRuns) }
      : {}),
    ...(input.validationAcknowledgements !== undefined
      ? { validationAcknowledgements: cloneJson(input.validationAcknowledgements) }
      : {}),
    ...(input.exportAuditRecords !== undefined
      ? { exportAuditRecords: cloneJson(input.exportAuditRecords) }
      : {})
  }
}

export const normaliseCutNFlowProject = (
  project: CutNFlowProjectV1
): CutNFlowProjectV1 =>
  createCutNFlowProjectV1({
    id: project.id,
    revision: project.revision,
    name: project.name,
    ...(project.metadata !== undefined ? { metadata: project.metadata } : {}),
    ...(project.cutter
      ? {
          packType: project.cutter.packType,
          legacySpec: project.cutter.legacySpec,
          identityMap: project.cutter.identityMap
        }
      : {}),
    projectDraft: project.projectDraft,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    artwork: project.artwork,
    exportSettings: project.exportSettings,
    latestValidationRun: project.latestValidationRun,
    validationRuns: project.validationRuns,
    validationAcknowledgements: project.validationAcknowledgements,
    exportAuditRecords: project.exportAuditRecords
  })

const parseProjectV1 = (
  value: unknown,
  allowMissingProjectId: boolean,
  allowMissingRevision: boolean
): ParseResult<CutNFlowProjectV1> => {
  if (!isRecord(value)) {
    return { ok: false, errors: ["Project must be an object."] }
  }

  const errors: string[] = []
  rejectUnknownFields(value, projectFields, "", errors)
  if (value.schemaVersion !== CUTNFLOW_PROJECT_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${CUTNFLOW_PROJECT_SCHEMA_VERSION}.`)
  }
  if (!isNonEmptyString(value.id)) {
    if (!(allowMissingProjectId && value.id === undefined)) {
      errors.push("id must be a non-empty string.")
    }
  }
  if (!(Number.isInteger(value.revision) && (value.revision as number) > 0)) {
    if (!(allowMissingRevision && value.revision === undefined)) {
      errors.push("revision must be a positive integer.")
    }
  }
  if (!isNonEmptyString(value.name)) {
    errors.push("name must be a non-empty string.")
  }
  if (!isIsoTimestamp(value.createdAt)) {
    errors.push("createdAt must be a valid timestamp.")
  }
  if (!isIsoTimestamp(value.updatedAt)) {
    errors.push("updatedAt must be a valid timestamp.")
  }

  const metadata = parseProjectMetadata(value.metadata, errors)

  const cutter = value.cutter
  if (cutter !== undefined && !isRecord(cutter)) {
    errors.push("cutter must be an object.")
  } else if (isRecord(cutter)) {
    rejectUnknownFields(cutter, cutterFields, "cutter.", errors)
    if (cutter.units !== CUTNFLOW_PROJECT_UNITS) {
      errors.push(`cutter.units must be "${CUTNFLOW_PROJECT_UNITS}".`)
    }
    if (cutter.coordinateSpace !== CUTNFLOW_PROJECT_COORDINATE_SPACE) {
      errors.push(
        `cutter.coordinateSpace must be "${CUTNFLOW_PROJECT_COORDINATE_SPACE}".`
      )
    }
    if (!isNonEmptyString(cutter.packType)) {
      errors.push("cutter.packType must be a non-empty string.")
    }
    validateLegacySpec(cutter.legacySpec, errors)
  }

  const exportSettings = parseExportSettings(value.exportSettings, errors)
  const latestValidationRun = parseValidationRun(value.latestValidationRun, value.id, errors)
  const validationRuns = value.validationRuns === undefined
    ? undefined
    : Array.isArray(value.validationRuns)
      ? value.validationRuns.map((run, index) =>
          parseValidationRun(run, value.id, errors, `validationRuns[${index}]`)
        ).filter((run): run is ValidationRun => Boolean(run))
      : (errors.push("validationRuns must be an array when provided."), undefined)
  const validationAcknowledgements = value.validationAcknowledgements === undefined
    ? undefined
    : Array.isArray(value.validationAcknowledgements)
      ? value.validationAcknowledgements.map((acknowledgement, index) =>
          parseValidationAcknowledgement(acknowledgement, value.id, index, errors)
        ).filter((acknowledgement): acknowledgement is ValidationAcknowledgement => Boolean(acknowledgement))
      : (errors.push("validationAcknowledgements must be an array when provided."), undefined)
  const exportAuditRecords = value.exportAuditRecords === undefined
    ? undefined
    : Array.isArray(value.exportAuditRecords)
      ? value.exportAuditRecords.map((record, index) =>
          parseExportAuditRecord(record, value.id, index, errors)
        ).filter((record): record is CutterExportAuditRecord => Boolean(record))
      : (errors.push("exportAuditRecords must be an array when provided."), undefined)
  if (exportAuditRecords) {
    const ids = new Set<string>()
    exportAuditRecords.forEach(record => {
      if (ids.has(record.id)) {
        errors.push(`exportAuditRecords contains duplicate ID "${record.id}".`)
      }
      ids.add(record.id)
    })
  }
  const projectDraft = parseProjectDraft(value.projectDraft, errors)
  if (projectDraft && isNonEmptyString(value.id) && projectDraft.id !== value.id) {
    errors.push("projectDraft.id must match the parent project ID.")
  }
  const identity = isRecord(cutter) && isRecord(cutter.legacySpec)
      ? normaliseElementIdentityMap(
          cutter.legacySpec as unknown as FlowwrapSpec,
          cutter.identityMap,
          isNonEmptyString(value.id) ? value.id : undefined
        )
      : { identityMap: { elements: [] }, warnings: [], errors: [] }
  errors.push(...identity.errors)
  if (errors.length > 0) {
    return { ok: false, errors }
  }

  try {
    const project = createCutNFlowProjectV1({
      id: isNonEmptyString(value.id) ? value.id : undefined,
      revision:
        Number.isInteger(value.revision) && (value.revision as number) > 0
          ? (value.revision as number)
          : 1,
      name: value.name as string,
      createdAt: value.createdAt as string,
      updatedAt: value.updatedAt as string,
      ...(metadata !== undefined ? { metadata } : {}),
      ...(isRecord(cutter)
        ? {
            packType: cutter.packType as string,
            legacySpec: cutter.legacySpec as FlowwrapSpec,
            identityMap: identity.identityMap
          }
        : {}),
      ...(projectDraft !== undefined ? { projectDraft } : {}),
      ...(value.artwork !== undefined ? { artwork: value.artwork } : {}),
      ...(exportSettings !== undefined ? { exportSettings } : {}),
      ...(latestValidationRun !== undefined ? { latestValidationRun } : {}),
      ...(validationRuns !== undefined ? { validationRuns } : {}),
      ...(validationAcknowledgements !== undefined ? { validationAcknowledgements } : {}),
      ...(exportAuditRecords !== undefined ? { exportAuditRecords } : {})
    })
    return {
      ok: true,
      value: project,
      ...(identity.warnings.length > 0 ? { warnings: identity.warnings } : {})
    }
  } catch {
    return {
      ok: false,
      errors: ["Project contains values that cannot be represented as JSON."]
    }
  }
}

export const isCutNFlowProjectV1 = (value: unknown): value is CutNFlowProjectV1 =>
  parseProjectV1(value, false, false).ok

export const migrateCutNFlowProject = (
  value: unknown
): ParseResult<CutNFlowProjectV1> => {
  if (!isRecord(value)) {
    return { ok: false, errors: ["Project must be an object."] }
  }
  if (value.schemaVersion !== CUTNFLOW_PROJECT_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        value.schemaVersion === undefined
          ? "Project is missing schemaVersion; no legacy project-envelope migration is available."
          : `Unsupported project schemaVersion: ${String(value.schemaVersion)}.`
      ]
    }
  }
  return parseProjectV1(value, true, true)
}

export const parseCutNFlowProject = (
  value: unknown
): ParseResult<CutNFlowProjectV1> => migrateCutNFlowProject(value)

export const projectFromLegacySpec = (
  packType: string,
  name: string,
  spec: FlowwrapSpec,
  input: Omit<CreateCutNFlowProjectV1Input, "packType" | "name" | "legacySpec"> = {}
) =>
  createCutNFlowProjectV1({
    ...input,
    packType,
    name,
    legacySpec: spec
  }) as CutNFlowCutterProjectV1

export const hasCutterDocument = (
  project: CutNFlowProjectV1
): project is CutNFlowCutterProjectV1 => Boolean(project.cutter)

export const legacySpecFromProject = (project: CutNFlowProjectV1): FlowwrapSpec => {
  if (!project.cutter) {
    throw new Error("Project does not contain a Cutter Specification.")
  }
  return cloneJson(project.cutter.legacySpec)
}

export const touchCutNFlowProject = (
  project: CutNFlowProjectV1,
  updatedAt = new Date().toISOString()
): CutNFlowProjectV1 =>
  normaliseCutNFlowProject({
    ...project,
    updatedAt
  })
