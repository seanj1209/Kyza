import type { ExportReadiness } from "../../../../packages/cutter-engine/export/exportReadiness"
import type { ExportPackage } from "../../../../packages/cutter-engine/export/exportPackage"
import type { ExportReleaseAction } from "../../../../packages/cutter-engine/export/exportReleasePresentation"
import "./exportSelection.css"

const NS = "http://www.w3.org/2000/svg"
const glyphs = {
  critical: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m-6 0 6-6"/>',
  warning: '<path d="m12 3 10 18H2Zm0 6v5m0 3v1"/>',
  advisory: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  pass: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  file: '<path d="M5 2h9l5 5v15H5Zm9 0v6h5M8 12h8m-8 4h8"/>'
}
function icon(name: keyof typeof glyphs) {
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "1.6"); svg.innerHTML = glyphs[name]; return svg
}
export function renderCompactReadiness(host: HTMLElement, readiness: ExportReadiness) {
  host.dataset.exportReadiness = readiness.state; host.replaceChildren()
  const heading = document.createElement("strong")
  heading.textContent = readiness.state === "blocked" ? "Export blocked" : readiness.state === "ready_with_advisories" ? "Ready for review" : readiness.state === "ready" ? "Checks passed" : "Checks required"
  const counts = document.createElement("div"); counts.className = "export-validation-counts"
  ;(["critical", "warning", "advisory", "pass"] as const).forEach(severity => {
    const item = document.createElement("span"); item.className = `export-count export-count-${severity}`
    const label = `${severity}: ${readiness.validationRun ? readiness.counts[severity] : "not checked"}`
    item.title = label; item.setAttribute("aria-label", label); item.append(icon(severity), document.createTextNode(readiness.validationRun ? String(readiness.counts[severity]) : "–")); counts.appendChild(item)
  })
  const notes = document.createElement("details"); notes.className = "export-review-notes"; notes.open = readiness.state === "blocked"
  const summary = document.createElement("summary"); summary.textContent = `Review notes (${readiness.advisoryNotes.length + 1})`
  const list = document.createElement("ul")
  ;[readiness.message, ...readiness.advisoryNotes].forEach(note => { const li = document.createElement("li"); li.textContent = note; list.appendChild(li) })
  notes.append(summary, list); host.append(heading, counts, notes)
}
export function renderCompactPackage(host: HTMLElement, draft: ExportPackage | null) {
  host.replaceChildren(); host.hidden = !draft
  if (!draft) { host.removeAttribute("data-export-package-id"); return }
  host.dataset.exportPackageId = draft.id
  const context = document.createElement("strong"); context.textContent = draft.displayPackType ?? "Cutter guide"
  const sub = document.createElement("span"); sub.textContent = `${draft.enginePackTypeId ?? draft.packTypeId} · Artwork ${draft.artworkStatus === "uploaded" ? "uploaded" : "not checked"}`
  host.append(context, sub)
}
export function createExportSelection(
  host: HTMLElement,
  actions: ExportReleaseAction[],
  run: (
    action: ExportReleaseAction,
    trigger: HTMLElement,
    options: { overrideCriticalErrors: boolean }
  ) => Promise<boolean>
) {
  const fieldset = document.createElement("fieldset"); fieldset.className = "export-format-selection"
  const legend = document.createElement("legend"); legend.textContent = "Choose your outputs"; fieldset.appendChild(legend)
  const future = document.createElement("details"); future.className = "export-future-formats"
  const futureSummary = document.createElement("summary"); futureSummary.textContent = `Planned outputs (${actions.filter(a => !a.available).length})`
  const futureGrid = document.createElement("div"); futureGrid.className = "export-future-grid"; future.append(futureSummary, futureGrid)
  const choices = new Map<ExportReleaseAction, HTMLInputElement>()
  actions.forEach(action => {
    const label = document.createElement("label"); label.className = "export-format-card"; label.title = action.disabledReason ?? action.description
    const input = document.createElement("input"); input.type = "checkbox"; input.disabled = !action.available; input.checked = action.format === "svg"; input.dataset.exportFormat = action.format
    const copy = document.createElement("span"), title = document.createElement("strong"), detail = document.createElement("small")
    title.textContent = action.label; detail.textContent = action.available ? action.extensions.join(" / ") : "Coming soon"; copy.append(title, detail)
    label.append(input, icon("file"), copy); (action.available ? fieldset : futureGrid).appendChild(label); choices.set(action, input)
  })
  if (actions.some(a => !a.available)) fieldset.appendChild(future)
  const overrideLabel = document.createElement("label"); overrideLabel.className = "export-error-override"; overrideLabel.hidden = true
  const overrideInput = document.createElement("input"); overrideInput.type = "checkbox"; overrideInput.name = "export-error-override"
  const overrideCopy = document.createElement("span")
  const overrideTitle = document.createElement("strong"); overrideTitle.textContent = "Override errors"
  const overrideDetail = document.createElement("small"); overrideDetail.textContent = "Export this revision with its Critical errors and validation/spec snapshot recorded."
  overrideCopy.append(overrideTitle, overrideDetail); overrideLabel.append(overrideInput, overrideCopy)
  const button = document.createElement("button"); button.type = "button"; button.className = "export-selected-button"; button.textContent = "Export selected"
  const feedback = document.createElement("p"); feedback.className = "export-selection-feedback"; feedback.setAttribute("role", "status"); feedback.textContent = "Each selected output uses the validation review and its own save dialog."
  let allowed = false, busy = false, criticalOverrideAvailable = false
  const update = () => { button.disabled = busy || !allowed || ![...choices].some(([action, input]) => action.available && input.checked) }
  choices.forEach(input => input.addEventListener("change", update))
  overrideInput.addEventListener("change", () => {
    allowed = criticalOverrideAvailable ? overrideInput.checked : allowed
    update()
  })
  button.addEventListener("click", async () => {
    if (busy || button.disabled) return
    const selected = [...choices].filter(([action, input]) => action.available && input.checked).map(([action]) => action)
    busy = true; choices.forEach(input => { input.disabled = true }); update()
    let completed = 0
    try {
      for (const action of selected) {
        feedback.textContent = `Reviewing ${action.label} (${completed + 1} of ${selected.length})…`
        if (!await run(action, button, {
          overrideCriticalErrors: criticalOverrideAvailable && overrideInput.checked
        })) break
        completed++
      }
      feedback.textContent = `${completed} of ${selected.length} output deliveries completed or initiated. Review individual save/download results.`
    } catch (error) { feedback.textContent = error instanceof Error ? error.message : "Export failed. Try again." }
    finally { busy = false; choices.forEach((input, action) => { input.disabled = !action.available }); update() }
  })
  host.append(fieldset, overrideLabel, button, feedback); update()
  return {
    setReadiness(readiness: ExportReadiness) {
      criticalOverrideAvailable = readiness.state === "blocked" &&
        Boolean(readiness.validationRun) &&
        readiness.counts.critical > 0
      overrideLabel.hidden = !criticalOverrideAvailable
      if (!criticalOverrideAvailable) overrideInput.checked = false
      allowed = readiness.state === "ready" ||
        readiness.state === "ready_with_advisories" ||
        (criticalOverrideAvailable && overrideInput.checked)
      update()
    }
  }
}
