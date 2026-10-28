import type { CutNFlowProjectV1 } from "../../../../packages/cutter-engine/project"
import { resolveExportReadiness, type ExportReadiness } from "../../../../packages/cutter-engine/export/exportReadiness"
import {
  validateForExport,
  type ValidationRun,
} from "../../../../packages/cutter-engine/validation"
import {
  getStructuredValidationState,
  type ActiveValidationIssue
} from "./activeValidation"

export type ValidationCentreSeverity = "critical" | "warning" | "advisory" | "pass"

export type ValidationCentreMessage = {
  id: string
  severity: ValidationCentreSeverity
  message: string
  source: "cutter-engine" | "workflow"
}

export type ValidationCentreSummary = {
  projectId: string
  productPrompt?: string
  packTypeId: string
  displayPackType: string
  enginePackTypeId: string
  source: string
  artworkChecks: "available" | "not-run"
  issues: ActiveValidationIssue[]
  messages: ValidationCentreMessage[]
  counts: Record<ValidationCentreSeverity, number>
}

export type ValidationIssuePresentation = {
  title: string
  suggestedFix?: string
  affectedElement?: string
  focusLabel: string
}

export type ProjectValidationWorkflowState = {
  summary: ValidationCentreSummary
  exportReadiness: ExportReadiness
  cutterCriticalIssues: ActiveValidationIssue[]
}

export const getValidationIssuePresentation = (
  issue: ActiveValidationIssue
): ValidationIssuePresentation => {
  const eyemarkMatch = issue.message.match(/Eyemark\s+(\d+)/i)
  const isPlacementIssue =
    issue.code === "EYEMARK_ALLOWED_ZONE_VIOLATION" ||
    issue.code === "EYEMARK_OUTSIDE_CUTTER" ||
    issue.code === "EYEMARK_TRACK_PLACEMENT"
  if (isPlacementIssue && eyemarkMatch) {
    const affectedElement = `Eyemark ${eyemarkMatch[1]}`
    return {
      title: "Eyemark outside valid seal/track area",
      suggestedFix: `Move ${affectedElement} back into the valid seal/track area and re-run validation.`,
      affectedElement,
      focusLabel: `Focus ${affectedElement}`
    }
  }
  return {
    title: issue.message,
    focusLabel: "View affected area"
  }
}

export const buildValidationCentreSummary = (
  project: CutNFlowProjectV1,
  hasArtwork: boolean,
  domain: "cutter" | "artwork" = "cutter",
  run?: ValidationRun,
): ValidationCentreSummary => {
  const validation = getStructuredValidationState(project, run)
  const draft = project.projectDraft
  const messages: ValidationCentreMessage[] = validation.issueValidation.messages.map(
    (message, index) => ({
      id: `${message.code}-${index + 1}`,
      severity:
        message.severity === "error"
          ? "critical"
          : message.severity === "warning"
            ? "warning"
            : "advisory",
      message: message.message,
      source: "cutter-engine"
    })
  )

  if (domain === "artwork" && !hasArtwork) {
    messages.push({
      id: "artwork-not-run",
      severity: "advisory",
      message: "No artwork uploaded yet. Artwork checks have not been run.",
      source: "workflow"
    })
  }
  if (draft?.packSpecification) {
    messages.push({
      id: "pack-generator-assumptions",
      severity: "advisory",
      message: "Starter cutter was created from Pack Generator assumptions.",
      source: "workflow"
    })
    if (draft.packSpecification.starterDefaults.dimensionsRequireConfirmation) {
      messages.push({
        id: "dimensions-require-confirmation",
        severity: "advisory",
        message: "Exact production dimensions require user confirmation.",
        source: "workflow"
      })
    }
  }
  if (!messages.some(message => message.severity === "critical")) {
    messages.push({
      id: "cutter-checks-complete",
      severity: "pass",
      message: "Cutter and pack specification checks completed with no critical issues.",
      source: "cutter-engine"
    })
  }

  const counts: Record<ValidationCentreSeverity, number> = {
    critical: 0,
    warning: 0,
    advisory: 0,
    pass: 0
  }
  messages.forEach(message => {
    counts[message.severity] += 1
  })

  return {
    projectId: project.id,
    ...(draft?.productPrompt ? { productPrompt: draft.productPrompt } : {}),
    packTypeId: draft?.packSpecification?.packTypeId ?? project.cutter.packType,
    displayPackType: draft?.packSpecification?.displayName ?? project.name,
    enginePackTypeId:
      draft?.packSpecification?.enginePackTypeId ?? project.cutter.packType,
    source: draft?.source ?? "cutter-studio",
    artworkChecks: hasArtwork ? "available" : "not-run",
    issues: validation.issues,
    messages,
    counts
  }
}

export const buildProjectValidationWorkflowState = (
  project: CutNFlowProjectV1,
  hasArtwork: boolean
): ProjectValidationWorkflowState => {
  const summary = buildValidationCentreSummary(project, hasArtwork, "artwork")
  return {
    summary,
    exportReadiness: resolveExportReadiness({
      project,
      validation: validateForExport(project),
      supported: true
    }),
    cutterCriticalIssues: summary.issues.filter(issue => issue.severity === "error")
  }
}
