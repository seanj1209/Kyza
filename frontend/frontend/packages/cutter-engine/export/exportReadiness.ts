import type { KyzaProjectV1 } from "../project"
import type { ValidationResult } from "../validation"

export type ExportReadinessState =
  | "not_checked"
  | "blocked"
  | "ready_with_advisories"
  | "ready"
  | "unsupported"

export type ExportReadinessCounts = {
  critical: number
  warning: number
  advisory: number
  pass: number
}

export type ExportReadiness = {
  state: ExportReadinessState
  validationRun: boolean
  projectId?: string
  packTypeId?: string
  displayPackType?: string
  enginePackTypeId?: string
  source?: string
  counts: ExportReadinessCounts
  advisoryNotes: string[]
  message: string
  createdAt: string
}

const EMPTY_COUNTS: ExportReadinessCounts = {
  critical: 0,
  warning: 0,
  advisory: 0,
  pass: 0
}

export const resolveExportReadiness = (input: {
  project?: KyzaProjectV1 | null
  validation?: ValidationResult
  supported?: boolean
  createdAt?: string
}): ExportReadiness => {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const project = input.project ?? undefined
  const draft = project?.projectDraft
  const context = project
    ? {
        projectId: project.id,
        packTypeId: draft?.packSpecification?.packTypeId ?? project.cutter.packType,
        displayPackType: draft?.packSpecification?.displayName ?? project.name,
        enginePackTypeId:
          draft?.packSpecification?.enginePackTypeId ?? project.cutter.packType,
        source: draft?.source ?? "cutter-studio"
      }
    : {}

  if (input.supported === false) {
    return {
      state: "unsupported",
      validationRun: Boolean(input.validation),
      ...context,
      counts: { ...EMPTY_COUNTS },
      advisoryNotes: [],
      message: "Export is not fully implemented for this pack type yet. Project context has been saved.",
      createdAt
    }
  }
  if (!project || !input.validation) {
    return {
      state: "not_checked",
      validationRun: false,
      ...context,
      counts: { ...EMPTY_COUNTS },
      advisoryNotes: [],
      message: "Run validation before export. Kyza needs to check the cutter and project state first.",
      createdAt
    }
  }

  const critical = input.validation.messages.filter(message => message.severity === "error").length
  const warning = input.validation.messages.filter(message => message.severity === "warning").length
  const advisoryNotes = input.validation.messages
    .filter(message => message.severity === "info")
    .map(message => message.message)
  if (!project.artwork) {
    advisoryNotes.push("Artwork checks have not been run because no artwork has been uploaded.")
  }
  if (draft?.packSpecification) {
    advisoryNotes.push("Starter cutter was created from Pack Generator assumptions.")
    if (draft.packSpecification.starterDefaults.dimensionsRequireConfirmation) {
      advisoryNotes.push("Exact production dimensions require user confirmation.")
    }
  }
  const counts: ExportReadinessCounts = {
    critical,
    warning,
    advisory: advisoryNotes.length,
    pass: critical === 0 ? 1 : 0
  }

  if (critical > 0) {
    const hasEyemarkIssue = input.validation.messages.some(message =>
      message.severity === "error" && message.code.includes("EYEMARK")
    )
    return {
      state: "blocked",
      validationRun: true,
      ...context,
      counts,
      advisoryNotes,
      message: hasEyemarkIssue
        ? "Export blocked: critical validation issues remain. Fix the eyemark placement and re-run validation before export."
        : "Export blocked: critical validation issues remain. Fix critical validation issues and re-run validation before export.",
      createdAt
    }
  }

  if (warning > 0 || advisoryNotes.length > 0) {
    return {
      state: "ready_with_advisories",
      validationRun: true,
      ...context,
      counts,
      advisoryNotes,
      message: "Export ready with advisory notes. Review assumptions before using this file for production.",
      createdAt
    }
  }

  return {
    state: "ready",
    validationRun: true,
    ...context,
    counts,
    advisoryNotes,
    message: "Export-ready draft. Validation checks passed; final production approval remains required.",
    createdAt
  }
}
