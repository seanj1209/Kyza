import type { KyzaProjectV1, ParseResult } from "../../../../packages/cutter-engine/project"
import { runPreExportValidation } from "../../../../packages/cutter-engine/export/preExportValidation"
import { createBetaReviewSnapshot, buildBetaReviewPackage, betaReviewAudit } from "../../../../packages/cutter-engine/export/betaReviewSnapshot"
import { deliverProjectExportLocally, type SaveFilePickerLike } from "../../../../packages/cutter-engine/export/projectExportService"
import "./betaReview.css"

type BetaReviewOptions = {
  getLatestProject: () => KyzaProjectV1 | null
  persistProject: (project: KyzaProjectV1, expectedRevision?: number) => ParseResult<KyzaProjectV1> | Promise<ParseResult<KyzaProjectV1>>
  getSvg: () => SVGSVGElement | null
  trigger: HTMLElement
}

export async function requestBetaReviewSnapshot(options: BetaReviewOptions) {
  options.trigger.setAttribute("aria-busy", "true")
  const validation = await runPreExportValidation({ getLatestProject: options.getLatestProject, persistProject: options.persistProject }).finally(() => options.trigger.removeAttribute("aria-busy"))
  if (validation.ok === false) { window.alert(validation.errors.join(" ")); return }
  const project = validation.project, run = validation.run
  const backdrop = document.createElement("div")
  backdrop.className = "pre-export-review-backdrop"
  const dialog = document.createElement("section")
  dialog.className = "pre-export-review beta-review-dialog"
  dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true")
  dialog.setAttribute("aria-labelledby", "beta-review-title"); dialog.setAttribute("aria-describedby", "beta-review-description")
  const header = document.createElement("header"); header.className = "pre-export-review-header"
  const title = document.createElement("h2"); title.id = "beta-review-title"; title.textContent = "Beta review / export override"
  const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Close beta review")
  header.append(title, close)
  const body = document.createElement("div"); body.className = "pre-export-review-body beta-review-body"
  const description = document.createElement("p"); description.id = "beta-review-description"
  description.textContent = `Unapproved beta review material only. ${project.name}, revision ${project.revision}: ${run.summary.criticalCount} critical, ${run.summary.warningCount} warnings, ${run.summary.advisoryCount} advisories. Validation remains ${run.status}.`
  const limitations = document.createElement("p")
  limitations.textContent = "You may override critical findings for this review bundle. It is not production approval. Reviewer identity is self-declared. The snapshot includes project details and artwork references; share it only with intended reviewers."
  const list = document.createElement("ul"); list.className = "beta-review-findings"
  run.issues.forEach(issue => { const li = document.createElement("li"); li.textContent = `${issue.severity.toUpperCase()} · ${issue.ruleId}: ${issue.message}`; list.appendChild(li) })
  const field = (labelText: string, input: HTMLInputElement | HTMLTextAreaElement) => {
    const label = document.createElement("label"); label.className = "beta-review-field"
    const text = document.createElement("span"); text.textContent = labelText; label.append(text, input); body.appendChild(label)
  }
  body.append(description, limitations, list)
  const reviewer = document.createElement("input"); reviewer.maxLength = 100; reviewer.required = true
  field("Reviewer name (self-declared)", reviewer)
  const reason = document.createElement("textarea"); reason.rows = 3; reason.maxLength = 1000; reason.required = true
  field("Reason for beta export / critical override", reason)
  const checkbox = document.createElement("input"); checkbox.type = "checkbox"
  const acknowledgement = document.createElement("label"); acknowledgement.className = "beta-review-acknowledgement"
  acknowledgement.append(checkbox, document.createTextNode("I have reviewed all findings and authorise this unapproved beta snapshot. It must not be used for production."))
  const status = document.createElement("p"); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite")
  body.append(acknowledgement, status)
  const footer = document.createElement("footer"); footer.className = "pre-export-review-actions"
  const download = document.createElement("button"); download.type = "button"; download.className = "pre-export-review-primary"
  download.textContent = "Export unapproved beta snapshot"; download.disabled = true; footer.append(download)
  dialog.append(header, body, footer); backdrop.appendChild(dialog); document.body.appendChild(backdrop)
  const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"
  let busy = false
  const sync = () => { download.disabled = busy || !reviewer.value.trim() || !reason.value.trim() || !checkbox.checked }
  reviewer.addEventListener("input", sync); reason.addEventListener("input", sync); checkbox.addEventListener("change", sync)
  const finish = () => { if (busy) return; backdrop.remove(); document.body.style.overflow = previousOverflow; options.trigger.focus() }
  close.addEventListener("click", finish)
  backdrop.addEventListener("pointerdown", event => { if (event.target === backdrop) finish() })
  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(); return }
    if (event.key !== "Tab") return
    const nodes = [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), textarea:not([disabled])")]
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  })
  reviewer.focus()
  download.addEventListener("click", async () => {
    if (download.disabled || busy) return
    busy = true; close.disabled = true; sync(); status.textContent = "Capturing the reviewed revision and preparing the evidence bundle…"
    let delivered = false
    try {
      const current = options.getLatestProject()
      if (!current || current.id !== project.id || current.revision !== project.revision || current.latestValidationRun?.id !== run.id) throw new Error("The Project changed. Close this review and run it again for the latest revision.")
      const snapshot = createBetaReviewSnapshot({ project: current, run, reviewer: reviewer.value, reason: reason.value,
        acknowledgedIssueIds: run.issues.filter(issue => issue.severity !== "advisory").map(issue => issue.id) })
      const source = options.getSvg()
      const artifact = await buildBetaReviewPackage(snapshot, source ? new XMLSerializer().serializeToString(source) : undefined)
      const latest = options.getLatestProject()
      if (!latest || latest.id !== project.id || latest.revision !== project.revision || latest.latestValidationRun?.id !== run.id) throw new Error("The design changed while the snapshot was being generated. Reopen review for the latest revision.")
      const picker = "showSaveFilePicker" in window ? (window as unknown as { showSaveFilePicker: SaveFilePickerLike }).showSaveFilePicker.bind(window) : undefined
      const delivery = await deliverProjectExportLocally(artifact, picker ? { showSaveFilePicker: picker } : {})
      if (delivery.status === "cancelled") { status.textContent = "Snapshot export cancelled. No review decision was recorded."; return }
      delivered = true
      const beforePersist = options.getLatestProject()
      if (!beforePersist || beforePersist.id !== project.id || beforePersist.revision !== project.revision) throw new Error("The Project changed during delivery; the downloaded snapshot is retained but its history could not be attached.")
      const persisted = await options.persistProject({ ...beforePersist, exportAuditRecords: [...(beforePersist.exportAuditRecords ?? []), betaReviewAudit(snapshot)] }, project.revision)
      if (!persisted.ok) throw new Error("The snapshot was delivered, but its review decision could not be saved. Keep the bundle as the decision record.")
      status.textContent = `${delivery.status === "saved" ? "Snapshot saved" : "Snapshot download started"}. The review decision is recorded; validation remains ${run.status}.${artifact.manifest.errors.length ? " Some previews were unavailable; see the report in the bundle." : ""}`
    } catch (error) { status.textContent = error instanceof Error ? error.message : "The snapshot could not be created." }
    finally { busy = false; close.disabled = false; sync(); if (delivered) download.disabled = true }
  })
}
