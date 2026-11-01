import type {
  KyzaProjectV1,
  ParseResult
} from "../../../../packages/cutter-engine/project"
import {
  BETA_CUTTER_RULESET_VERSION,
  getEffectiveValidationStatus,
  type ValidateProjectCutterOptions,
  type ValidationAcknowledgement,
  type ValidationIssue,
  type ValidationRun
} from "../../../../packages/cutter-engine/validation"
import {
  createExportRecordId,
  createValidationAcknowledgement,
  runPreExportValidation
} from "../../../../packages/cutter-engine/export/preExportValidation"

export type PreExportReviewState =
  | "critical"
  | "warning"
  | "advisory"
  | "clear"
  | "stale"
  | "error"

export type PreExportReviewModel = {
  state: PreExportReviewState
  projectId: string
  projectName: string
  packType: string
  projectRevision: number
  validationRunId: string
  rulesetVersion: string
  completedAt?: string
  issues: ValidationIssue[]
  criticalCount: number
  warningCount: number
  advisoryCount: number
  canExport: boolean
  canAcknowledge: boolean
  requiresAcknowledgement: boolean
}

const severityOrder: Record<ValidationIssue["severity"], number> = {
  critical: 0,
  warning: 1,
  advisory: 2
}

export const buildPreExportReviewModel = (
  project: KyzaProjectV1,
  run: ValidationRun
): PreExportReviewModel => {
  const effectiveStatus = getEffectiveValidationStatus(run, project.revision)
  const issues = run.issues
    .map((issue, index) => ({ issue, index }))
    .sort((left, right) =>
      severityOrder[left.issue.severity] - severityOrder[right.issue.severity] ||
      left.index - right.index
    )
    .map(candidate => candidate.issue)
  const state: PreExportReviewState =
    effectiveStatus === "error"
      ? "error"
      : effectiveStatus === "stale" ||
          (effectiveStatus !== "passed" && effectiveStatus !== "failed") ||
          run.rulesetVersion !== BETA_CUTTER_RULESET_VERSION ||
          run.trigger !== "pre_export"
        ? "stale"
        : run.summary.criticalCount > 0
          ? "critical"
          : run.summary.warningCount > 0
            ? "warning"
            : run.summary.advisoryCount > 0
              ? "advisory"
              : "clear"
  return {
    state,
    projectId: project.id,
    projectName: project.name,
    packType: project.projectDraft?.packSpecification?.displayName ?? project.cutter?.packType ?? "Not assigned",
    projectRevision: project.revision,
    validationRunId: run.id,
    rulesetVersion: run.rulesetVersion,
    ...(run.completedAt ? { completedAt: run.completedAt } : {}),
    issues,
    criticalCount: run.summary.criticalCount,
    warningCount: run.summary.warningCount,
    advisoryCount: run.summary.advisoryCount,
    canExport: state === "advisory" || state === "clear",
    canAcknowledge: state === "warning",
    requiresAcknowledgement: state === "warning"
  }
}

type ReviewDecision =
  | { action: "cancel" }
  | { action: "retry" }
  | { action: "return" }
  | { action: "view"; affectedElementId: string }
  | { action: "export"; warningNote?: string }

const formatFieldName = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, match => match.toUpperCase())

const formatIssueValue = (value: unknown, unit?: string): string => {
  if (value === null || value === undefined) return "Not supplied"
  if (Array.isArray(value)) return value.map(candidate => formatIssueValue(candidate, unit)).join(", ")
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, candidate]) => `${formatFieldName(key)}: ${formatIssueValue(candidate, unit)}`)
      .join(" · ")
  }
  return `${String(value)}${unit && typeof value === "number" ? ` ${unit}` : ""}`
}

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",")

const canReceiveReturnedFocus = (
  element: HTMLElement | null | undefined
): element is HTMLElement => {
  if (
    !element?.isConnected ||
    element.matches(":disabled, [aria-disabled='true']")
  ) return false
  if (element.closest("[hidden], [inert], [aria-hidden='true']")) return false
  const style = window.getComputedStyle(element)
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  )
}

const showPreExportReview = (input: {
  project?: KyzaProjectV1 | null
  run?: ValidationRun
  errorMessage?: string
  triggerElement?: HTMLElement | null
  fallbackFocusElement?: HTMLElement | null
  overrideCriticalErrors?: boolean
}): Promise<ReviewDecision> => new Promise(resolve => {
  const project = input.project ?? null
  const model = project && input.run ? buildPreExportReviewModel(project, input.run) : null
  const errorState = input.errorMessage || model?.state === "error" || model?.state === "stale"
  const previousFocus = input.triggerElement ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const backdrop = document.createElement("div")
  backdrop.className = "pre-export-review-backdrop"
  backdrop.setAttribute("role", "presentation")
  const dialog = document.createElement("section")
  dialog.className = "pre-export-review"
  dialog.setAttribute("role", "dialog")
  dialog.setAttribute("aria-modal", "true")
  dialog.setAttribute("aria-labelledby", "pre-export-review-title")
  dialog.setAttribute("aria-describedby", "pre-export-review-description")
  dialog.tabIndex = -1

  const header = document.createElement("header")
  header.className = "pre-export-review-header"
  const headingWrap = document.createElement("div")
  const eyebrow = document.createElement("span")
  eyebrow.className = "pre-export-review-eyebrow"
  eyebrow.textContent = "PRE-EXPORT REVIEW"
  const title = document.createElement("h2")
  title.id = "pre-export-review-title"
  title.textContent = project?.name ?? "Cutter export"
  const description = document.createElement("p")
  description.id = "pre-export-review-description"
  description.textContent = model
    ? `Revision ${model.projectRevision} checked${model.completedAt ? ` at ${new Date(model.completedAt).toLocaleString()}` : ""}.`
    : "Kyza could not check the current cutter revision."
  headingWrap.append(eyebrow, title, description)
  const close = document.createElement("button")
  close.type = "button"
  close.className = "pre-export-review-close"
  close.setAttribute("aria-label", "Close pre-export review")
  close.textContent = "×"
  header.append(headingWrap, close)

  const body = document.createElement("div")
  body.className = "pre-export-review-body"
  if (model) {
    const context = document.createElement("dl")
    context.className = "pre-export-review-context"
    for (const [label, value] of [
      ["Project", model.projectName],
      ["Pack type", model.packType],
      ["Revision", String(model.projectRevision)],
      ["Validation Run", model.validationRunId]
    ]) {
      const term = document.createElement("dt")
      term.textContent = label
      const detail = document.createElement("dd")
      detail.textContent = value
      context.append(term, detail)
    }
    body.appendChild(context)
  }

  const status = document.createElement("section")
  status.className = `pre-export-review-status is-${errorState ? "error" : model?.state ?? "error"}`
  status.setAttribute("role", errorState || model?.state === "critical" ? "alert" : "status")
  status.setAttribute("aria-live", errorState || model?.state === "critical" ? "assertive" : "polite")
  const statusTitle = document.createElement("strong")
  const statusMessage = document.createElement("span")
  if (errorState) {
    statusTitle.textContent = model?.state === "stale" ? "Validation is no longer current." : "Validation could not complete."
    statusMessage.textContent = input.errorMessage ?? "Kyza could not check the current cutter revision. Retry validation before export."
  } else if (model?.state === "critical") {
    statusTitle.textContent = input.overrideCriticalErrors
      ? "Critical errors will be overridden for this export."
      : "Critical issues must be fixed before export."
    statusMessage.textContent = input.overrideCriticalErrors
      ? "The errors remain visible and will be recorded with the exact cutter and validation snapshot."
      : "Tick Override errors in Save/Export to export this revision while keeping its errors on record."
  } else if (model?.state === "warning") {
    statusTitle.textContent = "Warnings require review."
    statusMessage.textContent = "Review every Warning below and explicitly acknowledge the remaining Warning issues to continue."
  } else if (model?.state === "advisory") {
    statusTitle.textContent = "Advisories found."
    statusMessage.textContent = "Advisories are recommendations or additional information and do not block this export."
  } else {
    statusTitle.textContent = "No cutter issues were found by the current beta validation rules."
    statusMessage.textContent = "This result applies only to the Project revision shown above."
  }
  status.append(statusTitle, statusMessage)
  body.appendChild(status)

  if (model) {
    const counts = document.createElement("div")
    counts.className = "pre-export-review-counts"
    for (const [label, count, severity] of [
      ["Critical", model.criticalCount, "critical"],
      ["Warnings", model.warningCount, "warning"],
      ["Advisory", model.advisoryCount, "advisory"]
    ] as const) {
      const countItem = document.createElement("span")
      countItem.dataset.severity = severity
      countItem.textContent = `${count} ${label}`
      counts.appendChild(countItem)
    }
    body.appendChild(counts)

    if (model.issues.length > 0) {
      const issueList = document.createElement("div")
      issueList.className = "pre-export-review-issues"
      model.issues.forEach(issue => {
        const item = document.createElement("article")
        item.className = "pre-export-review-issue"
        item.dataset.severity = issue.severity
        const severity = document.createElement("span")
        severity.className = "pre-export-review-severity"
        severity.textContent = issue.severity === "critical"
          ? "Critical"
          : issue.severity === "warning"
            ? "Warning"
            : "Advisory"
        const issueTitle = document.createElement("h3")
        issueTitle.textContent = issue.title
        const message = document.createElement("p")
        message.textContent = issue.message
        item.append(severity, issueTitle, message)
        if (issue.currentValue !== undefined || issue.expectedValue !== undefined) {
          const values = document.createElement("dl")
          values.className = "pre-export-review-values"
          if (issue.currentValue !== undefined) {
            const term = document.createElement("dt")
            term.textContent = "Current"
            const detail = document.createElement("dd")
            detail.textContent = formatIssueValue(issue.currentValue, issue.unit)
            values.append(term, detail)
          }
          if (issue.expectedValue !== undefined) {
            const term = document.createElement("dt")
            term.textContent = "Expected"
            const detail = document.createElement("dd")
            detail.textContent = formatIssueValue(issue.expectedValue, issue.unit)
            values.append(term, detail)
          }
          item.appendChild(values)
        }
        if (issue.affectedElementId) {
          const affected = document.createElement("span")
          affected.className = "pre-export-review-affected"
          affected.textContent = `Affected element: ${issue.affectedElementType ?? "cutter element"}`
          const view = document.createElement("button")
          view.type = "button"
          view.className = "pre-export-review-link"
          view.textContent = "View on Cutter"
          view.setAttribute("aria-label", `View ${issue.title} on Cutter`)
          view.addEventListener("click", () => finish({ action: "view", affectedElementId: issue.affectedElementId! }))
          item.append(affected, view)
        }
        if (issue.suggestedAction) {
          const suggestion = document.createElement("p")
          suggestion.className = "pre-export-review-suggestion"
          suggestion.textContent = `Suggested action: ${issue.suggestedAction}`
          item.appendChild(suggestion)
        }
        issueList.appendChild(item)
      })
      body.appendChild(issueList)
    }
  }

  const scope = document.createElement("p")
  scope.className = "pre-export-review-scope"
  scope.textContent = "Beta validation currently covers supported cutter geometry and active eyemark rules. Artwork, print and wider production checks are not included unless explicitly shown."
  body.appendChild(scope)

  const actions = document.createElement("footer")
  actions.className = "pre-export-review-actions"
  const returnButton = document.createElement("button")
  returnButton.type = "button"
  returnButton.className = "pre-export-review-secondary"
  returnButton.textContent = "Return to Cutter Studio"
  returnButton.addEventListener("click", () => finish({ action: "return" }))
  const retryButton = document.createElement("button")
  retryButton.type = "button"
  retryButton.className = "pre-export-review-secondary"
  retryButton.textContent = model?.state === "critical" ? "Run Validation Again" : "Retry Validation"
  retryButton.addEventListener("click", () => finish({ action: "retry" }))
  actions.append(returnButton, retryButton)

  let note: HTMLTextAreaElement | undefined
  if (model?.state === "warning" && !errorState) {
    const acknowledgement = document.createElement("div")
    acknowledgement.className = "pre-export-review-acknowledgement"
    const checkboxLabel = document.createElement("label")
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.name = "pre-export-warning-acknowledgement"
    const checkboxText = document.createElement("span")
    checkboxText.textContent = `I have reviewed all warnings listed for revision ${model.projectRevision} and choose to continue with export.`
    checkboxLabel.append(checkbox, checkboxText)
    const noteLabel = document.createElement("label")
    noteLabel.textContent = "Reason or production note (optional)"
    note = document.createElement("textarea")
    note.rows = 3
    note.maxLength = 500
    noteLabel.appendChild(note)
    acknowledgement.append(checkboxLabel, noteLabel)
    body.appendChild(acknowledgement)
    const exportButton = document.createElement("button")
    exportButton.type = "button"
    exportButton.className = "pre-export-review-primary"
    exportButton.textContent = "Export with acknowledged warnings"
    exportButton.disabled = true
    checkbox.addEventListener("change", () => {
      exportButton.disabled = !checkbox.checked
    })
    exportButton.addEventListener("click", () => {
      if (!checkbox.checked || exportButton.disabled) return
      finish({ action: "export", ...(note?.value.trim() ? { warningNote: note.value.trim() } : {}) })
    })
    actions.appendChild(exportButton)
  } else if (model?.state === "critical" && input.overrideCriticalErrors && !errorState) {
    const exportButton = document.createElement("button")
    exportButton.type = "button"
    exportButton.className = "pre-export-review-primary"
    exportButton.textContent = "Export with overridden errors"
    exportButton.addEventListener("click", () => finish({ action: "export" }))
    actions.appendChild(exportButton)
  } else if (model?.canExport && !errorState) {
    const exportButton = document.createElement("button")
    exportButton.type = "button"
    exportButton.className = "pre-export-review-primary"
    exportButton.textContent = "Export Cutter"
    exportButton.addEventListener("click", () => finish({ action: "export" }))
    actions.appendChild(exportButton)
  }

  dialog.append(header, body, actions)
  backdrop.appendChild(dialog)
  document.body.appendChild(backdrop)
  const previousOverflow = document.body.style.overflow
  document.body.style.overflow = "hidden"

  let completed = false
  function finish(decision: ReviewDecision) {
    if (completed) return
    completed = true
    document.body.style.overflow = previousOverflow
    backdrop.remove()
    const returnTarget = [previousFocus, input.fallbackFocusElement]
      .find(canReceiveReturnedFocus)
    returnTarget?.focus()
    resolve(decision)
  }

  close.addEventListener("click", () => finish({ action: "cancel" }))
  backdrop.addEventListener("pointerdown", event => {
    if (event.target === backdrop) finish({ action: "cancel" })
  })
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      finish({ action: "cancel" })
      return
    }
    if (event.key !== "Tab") return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })
  // The dialog is already mounted. Focus immediately so a quick Escape or Tab
  // cannot reach the studio while waiting for the next animation frame.
  const initialFocus = dialog.querySelector<HTMLElement>(focusableSelector) ?? dialog
  initialFocus.focus()
})

export type PreExportReviewApproval = {
  ok: true
  project: KyzaProjectV1
  validationRun: ValidationRun
  acknowledgement?: ValidationAcknowledgement
  exportId: string
  exportedAt: string
}

export type PreExportReviewCancellation = {
  ok: false
  cancelled: true
}

export const requestPreExportReview = async (options: {
  getLatestProject: () => KyzaProjectV1 | null | Promise<KyzaProjectV1 | null>
  persistProject: (
    project: KyzaProjectV1
  ) => ParseResult<KyzaProjectV1> | Promise<ParseResult<KyzaProjectV1>>
  triggerElement?: HTMLElement | null
  fallbackFocusElement?: HTMLElement | null
  onViewElement?: (affectedElementId: string) => void
  onReturnToCutter?: () => void
  acknowledgedBy?: string
  overrideCriticalErrors?: boolean
  validate?: (
    project: KyzaProjectV1,
    options: ValidateProjectCutterOptions
  ) => ValidationRun | Promise<ValidationRun>
}): Promise<PreExportReviewApproval | PreExportReviewCancellation> => {
  for (;;) {
    const announcement = document.createElement("div")
    announcement.className = "pre-export-review-announcement"
    announcement.setAttribute("role", "status")
    announcement.setAttribute("aria-live", "polite")
    announcement.textContent = "Running pre-export validation for the current Project revision."
    document.body.appendChild(announcement)
    options.triggerElement?.setAttribute("aria-busy", "true")
    const validation = await runPreExportValidation({
      getLatestProject: options.getLatestProject,
      persistProject: options.persistProject,
      ...(options.validate ? { validate: options.validate } : {})
    })
    options.triggerElement?.removeAttribute("aria-busy")
    announcement.textContent = validation.ok
      ? `Pre-export validation completed for revision ${validation.project.revision}.`
      : "Pre-export validation could not complete."
    window.setTimeout(() => announcement.remove(), 1000)
    if (validation.ok === false) {
      const decision = await showPreExportReview({
        project: await options.getLatestProject(),
        errorMessage: validation.errors[0] ?? "Validation could not complete.",
        triggerElement: options.triggerElement,
        fallbackFocusElement: options.fallbackFocusElement
      })
      if (decision.action === "retry") continue
      if (decision.action === "return") options.onReturnToCutter?.()
      return { ok: false, cancelled: true }
    }

    const decision = await showPreExportReview({
      project: validation.project,
      run: validation.run,
      triggerElement: options.triggerElement,
      fallbackFocusElement: options.fallbackFocusElement,
      ...(options.overrideCriticalErrors ? { overrideCriticalErrors: true } : {})
    })
    if (decision.action === "retry") continue
    if (decision.action === "view") {
      options.onViewElement?.(decision.affectedElementId)
      return { ok: false, cancelled: true }
    }
    if (decision.action === "return") {
      options.onReturnToCutter?.()
      return { ok: false, cancelled: true }
    }
    if (decision.action !== "export") return { ok: false, cancelled: true }

    const latestProject = await options.getLatestProject()
    if (
      !latestProject ||
      latestProject.id !== validation.project.id ||
      latestProject.revision !== validation.project.revision ||
      validation.run.rulesetVersion !== BETA_CUTTER_RULESET_VERSION
    ) {
      continue
    }
    const exportedAt = new Date().toISOString()
    const exportId = createExportRecordId(latestProject.id)
    if (
      validation.run.summary.criticalCount === 0 &&
      validation.run.summary.warningCount === 0
    ) {
      return {
        ok: true,
        project: latestProject,
        validationRun: validation.run,
        exportId,
        exportedAt
      }
    }
    const acknowledgement = createValidationAcknowledgement({
      project: latestProject,
      validationRun: validation.run,
      acknowledgedIssueIds: validation.run.issues
        .filter(issue => issue.severity === "critical" || issue.severity === "warning")
        .map(issue => issue.id),
      acknowledgedAt: exportedAt,
      ...(options.acknowledgedBy ? { acknowledgedBy: options.acknowledgedBy } : {}),
      ...(decision.warningNote ? { reason: decision.warningNote } : {}),
      exportRequestId: exportId,
      overrideCriticalErrors: validation.run.summary.criticalCount > 0 &&
        options.overrideCriticalErrors === true
    })
    if (acknowledgement.ok === false) continue
    return {
      ok: true,
      project: latestProject,
      validationRun: validation.run,
      acknowledgement: acknowledgement.value,
      exportId,
      exportedAt
    }
  }
}
