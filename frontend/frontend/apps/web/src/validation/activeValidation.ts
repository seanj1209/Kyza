import type { KyzaProjectV1 } from "../../../../packages/cutter-engine/project"
import {
  BETA_CUTTER_RULESET_VERSION,
  getEffectiveValidationStatus,
  validateProjectCutter,
  validationRunToLegacyResult,
  withLatestValidationRun,
  type LegacyValidationSeverity,
  type ValidationResult,
  type ValidationRun,
  type ValidationTrigger,
} from "../../../../packages/cutter-engine/validation"

export type ValidationIssueSource = "structured" | "svg-fallback"

export type ActiveValidationIssue = {
  id: string
  code: string
  severity: LegacyValidationSeverity
  message: string
  elementIds: string[]
  fieldPath?: string
  fixable?: boolean
  suggestedFixId?: string
  source: ValidationIssueSource
}

export type ActiveValidationDebug = {
  issuePanelSource: ValidationIssueSource
  exportGateSource: "structured"
  messages: Array<{
    code: string
    severity: LegacyValidationSeverity
    message: string
    packType?: string
    blocksExport: boolean
  }>
}

export type StructuredValidationState = {
  run: ValidationRun
  issueValidation: ValidationResult
  exportValidation: ValidationResult
  issues: ActiveValidationIssue[]
  debug: ActiveValidationDebug
}

export type ProjectValidationSnapshot = {
  project: KyzaProjectV1
  run: ValidationRun
  validation: StructuredValidationState
  reused: boolean
}

const parseIssueLines = (value: string | null) =>
  value
    ? value
        .split(/\r?\n/g)
        .map(line => line.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    : []

export const getStructuredValidationState = (
  project: KyzaProjectV1,
  run: ValidationRun = validateProjectCutter(project, { trigger: "live" }),
): StructuredValidationState => {
  const issueValidation = validationRunToLegacyResult(run)
  const exportValidation = issueValidation
  const issues = run.issues
    .map(issue => ({
      id: issue.id,
      code: issue.ruleId,
      severity:
        issue.severity === "critical"
          ? "error" as const
          : issue.severity === "warning"
            ? "warning" as const
            : "info" as const,
      message: issue.message,
      elementIds: issue.affectedElementId ? [issue.affectedElementId] : [],
      ...(issue.affectedArea ? { fieldPath: issue.affectedArea } : {}),
      ...(issue.fixAction ? { fixable: true, suggestedFixId: issue.fixAction.id } : {}),
      source: "structured" as const
    }))

  return {
    run,
    issueValidation,
    exportValidation,
    issues,
    debug: {
      issuePanelSource: "structured",
      exportGateSource: "structured",
      messages: exportValidation.messages.map(message => ({
        code: message.code,
        severity: message.severity,
        message: message.message,
        packType: project.cutter.packType,
        blocksExport: message.severity === "error"
      }))
    }
  }
}

export const getProjectValidationSnapshot = (
  project: KyzaProjectV1,
  options: {
    trigger?: ValidationTrigger
    force?: boolean
    now?: () => string
  } = {},
): ProjectValidationSnapshot => {
  const existing = project.latestValidationRun
  const effectiveStatus = getEffectiveValidationStatus(existing, project.revision)
  const canReuse = !options.force
    && Boolean(existing)
    && existing?.projectId === project.id
    && existing?.rulesetVersion === BETA_CUTTER_RULESET_VERSION
    && effectiveStatus !== "not_run"
    && effectiveStatus !== "stale"
  const run = canReuse
    ? existing!
    : validateProjectCutter(project, {
        trigger: options.trigger ?? "live",
        ...(options.now ? { now: options.now } : {}),
      })
  const evidencedProject = canReuse ? project : withLatestValidationRun(project, run)
  return {
    project: evidencedProject,
    run,
    validation: getStructuredValidationState(evidencedProject, run),
    reused: canReuse,
  }
}

export const getSvgFallbackValidationIssues = (
  errorAttribute: string | null,
  warningAttribute: string | null
): ActiveValidationIssue[] => {
  const errors = parseIssueLines(errorAttribute).map((message, index) => ({
    id: `SVG_ERROR-${index + 1}`,
    code: "SVG_ERROR",
    severity: "error" as const,
    message,
    elementIds: [],
    source: "svg-fallback" as const
  }))
  const errorMessages = new Set(errors.map(issue => issue.message))
  const warnings = parseIssueLines(warningAttribute)
    .filter(message => !errorMessages.has(message))
    .map((message, index) => ({
      id: `SVG_WARNING-${index + 1}`,
      code: "SVG_WARNING",
      severity: "warning" as const,
      message,
      elementIds: [],
      source: "svg-fallback" as const
    }))
  return [...errors, ...warnings]
}

export const getSvgFallbackValidationDebug = (
  issues: ActiveValidationIssue[],
  packType?: string
): ActiveValidationDebug => ({
  issuePanelSource: "svg-fallback",
  exportGateSource: "structured",
  messages: issues.map(issue => ({
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    packType,
    blocksExport: false
  }))
})
