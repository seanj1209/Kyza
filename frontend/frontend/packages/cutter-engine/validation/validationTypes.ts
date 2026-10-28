import type {
  CutterDocumentV1,
  CutterElementRef,
  PackSpecificationDraftV1,
  PackSpecificationWorkspaceV1
} from "../project/projectTypes"

export type LegacyValidationSeverity = "info" | "warning" | "error"

export type ValidationStatus =
  | "not_run"
  | "running"
  | "passed"
  | "failed"
  | "stale"
  | "error"

export type ValidationSeverity = "critical" | "warning" | "advisory"

export type ValidationTrigger = "live" | "manual" | "pre_export"

export type ValidationFixAction = {
  id: string
  label: string
  actionType: string
  affectedElementIds: string[]
  parameters?: Record<string, unknown>
}

export type ValidationMessage = {
  code: string
  severity: LegacyValidationSeverity
  message: string
  elementIds: string[]
  packType?: string
  fieldPath?: string
  fixable?: boolean
  suggestedFixId?: string
}

export type ValidationResult = {
  projectId: string
  revision: string
  valid: boolean
  messages: ValidationMessage[]
}

export type ValidationContext = {
  projectId: string
  projectRevision: string | number
  packTypeId: string
  packSpecification: PackSpecificationDraftV1 | PackSpecificationWorkspaceV1 | null
  cutterSpecification: CutterDocumentV1 | null
  cutterElements: CutterElementRef[]
  trigger: ValidationTrigger
  requestedAt: string
}

export type ValidationIssue = {
  id: string
  ruleId: string
  severity: ValidationSeverity
  title: string
  message: string
  affectedElementId?: string
  affectedElementType?: string
  affectedArea?: string
  currentValue?: unknown
  expectedValue?: unknown
  unit?: string
  suggestedAction?: string
  fixAction?: ValidationFixAction
  blocksExport: boolean
  acknowledgementAllowed: boolean
}

export type ValidationSummary = {
  criticalCount: number
  warningCount: number
  advisoryCount: number
  issueCount: number
  blocksExport: boolean
}

export type ValidationRun = {
  id: string
  projectId: string
  projectRevision: string | number
  status: ValidationStatus
  trigger: ValidationTrigger
  startedAt: string
  completedAt?: string
  issues: ValidationIssue[]
  summary: ValidationSummary
  rulesetVersion: string
}

export type ValidationAcknowledgement = {
  id: string
  projectId: string
  projectRevision: string | number
  validationRunId: string
  rulesetVersion: string
  acknowledgedIssueIds: string[]
  acknowledgedAt: string
  acknowledgedBy?: string
  reason?: string
  exportRequestId?: string
  overrideCriticalErrors?: boolean
  overriddenCriticalIssueIds?: string[]
}

export type BetaReviewDecisionAudit = {
  purpose: "unapproved-beta-review"
  productionApproved: false
  reviewer: string
  reason: string
  acknowledgedIssueIds: string[]
  snapshotVersion: string
}

export type CutterExportAuthorizationAudit = {
  id: string
  projectId: string
  projectRevision: string | number
  validationRunId: string
  rulesetVersion: string
  validationStatus: ValidationStatus
  criticalCount: number
  warningCount: number
  advisoryCount: number
  criticalIssueIds: string[]
  warningIssueIds: string[]
  advisoryIssueIds: string[]
  acknowledgementId?: string
  acknowledgedWarningIssueIds: string[]
  betaReview?: BetaReviewDecisionAudit
  overriddenCriticalIssueIds?: string[]
  exportedAt: string
  exportFormat: string
  userId?: string
}

export const CUTNFLOW_EXPORT_RECORD_VERSION = "cutnflow-export-record-1" as const

export type CutterExportDeliveryStatus = "saved" | "download_initiated"

export type CutterExportRecordV1 = CutterExportAuthorizationAudit & {
  recordVersion: typeof CUTNFLOW_EXPORT_RECORD_VERSION
  exportTier: string
  filename: string
  mimeType: string
  options: {
    includeLayers: boolean
    preserveVector: boolean
    includeValidationReport: boolean
    marginMm?: number
  }
  packReference: {
    packTypeId: string
    enginePackTypeId: string
  }
  cutterReference: {
    packTypeId: string
    units: "mm"
    coordinateSpace: string
    elementIds: string[]
  }
  dimensions: {
    widthMm: number
    heightMm: number
    units: "mm"
  }
  page: {
    widthMm: number
    heightMm: number
  }
  layers: {
    count: number
    ids: string[]
    names: string[]
  }
  sizeBytes: number
  generatorResult: "generated"
  deliveryStatus: CutterExportDeliveryStatus
  deliveryMethod: "file_system_access" | "browser_download"
  snapshot?: {
    projectName: string
    packType: string
    cutterSpec: CutterDocumentV1["legacySpec"]
    validationRun: ValidationRun
  }
}

/** Saved V1 Projects may contain the original validation-only export evidence. */
export type LegacyCutterExportAuditRecord = CutterExportAuthorizationAudit & {
  recordVersion?: never
}

export type CutterExportAuditRecord =
  | LegacyCutterExportAuditRecord
  | CutterExportRecordV1

export type ValidationRule = {
  id: string
  description: string
  appliesTo: (context: ValidationContext) => boolean
  evaluate: (context: ValidationContext) => ValidationIssue[]
}
