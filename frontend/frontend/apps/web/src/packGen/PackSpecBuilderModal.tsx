import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import "../packGen.css"
import type {
  KyzaProjectDraftV1,
  KyzaProjectV1,
} from "../../../../packages/cutter-engine/project"
import { toPackSpecificationPackTypeId } from "../../../../packages/cutter-engine/project"
import { packModules } from "../packs"
import { createProjectSubmissionId, PROJECT_CREATION_FIELD_LIMITS } from "../project/projectCreationService"
import { getPackGenActionState } from "./packGenActionState"
import { getPackGenFieldPolicy, type PackGenWorkspaceField } from "./packGenFieldPolicy"
import {
  PACK_SPEC_BUILDER_TABS,
  getPackSpecBuilderFields,
  type PackSpecBuilderTabId,
} from "./packSpecBuilderModel"
import {
  connectStandalonePackGenToProject,
  createOrUpdateCutterFromPackGen,
  getPackGenCutterReadiness,
  savePackGenDraft,
  setPackGenField,
  setPackGenReviewState,
} from "./packGenProjectService"

export type PackSpecBuilderSession = {
  project?: KyzaProjectV1
  draft: KyzaProjectDraftV1
}

type PackSpecBuilderModalProps = {
  open: boolean
  source: "pack-gen-suggestion" | "dashboard-new-project" | "existing-project"
  session: PackSpecBuilderSession
  onSessionChange: (session: PackSpecBuilderSession) => void
  onRequestClose: () => void
  syncProjectUrl?: boolean
}

const focusableSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"

const hasValue = (value: unknown) => value !== undefined && value !== ""

const provenanceLabel = (source: string) => {
  if (source === "user") return "User"
  if (source === "flowai") return "Kyza"
  if (source === "kyza-tech") return "Kyza Tech"
  return "Engine default"
}

export function PackSpecBuilderModal({
  open,
  source,
  session,
  onSessionChange,
  onRequestClose,
  syncProjectUrl = false,
}: PackSpecBuilderModalProps) {
  const [project, setProject] = useState(session.project)
  const [draft, setDraft] = useState(session.draft)
  const [activeTab, setActiveTab] = useState<PackSpecBuilderTabId>("details")
  const [advancedSettings, setAdvancedSettings] = useState(false)
  const [projectName, setProjectName] = useState(session.project?.name ?? "")
  const [brand, setBrand] = useState(session.project?.metadata?.customerOrBrand ?? "")
  const [jobReference, setJobReference] = useState(session.project?.metadata?.jobReference ?? "")
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [confirmClose, setConfirmClose] = useState(false)
  const dialogRef = useRef<HTMLElement>(null)
  const projectNameRef = useRef<HTMLInputElement>(null)
  const continueEditingRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openingSessionRef = useRef(session)
  const wasOpenRef = useRef(false)
  const projectIdRef = useRef<string>()
  const projectTimestampRef = useRef<string>()

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setProject(session.project)
      setDraft(session.draft)
      setProjectName(session.project?.name ?? "")
      setBrand(session.project?.metadata?.customerOrBrand ?? "")
      setJobReference(session.project?.metadata?.jobReference ?? "")
      setActiveTab("details")
      setAdvancedSettings(false)
      setDirty(false)
      setBusy(false)
      setError("")
      setConfirmClose(false)
      openingSessionRef.current = session
      projectIdRef.current = undefined
      projectTimestampRef.current = undefined
    }
    wasOpenRef.current = open
  }, [open, session])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const frame = requestAnimationFrame(() => {
      const firstField = project
        ? dialogRef.current?.querySelector<HTMLElement>("[data-field='packType']")
        : projectNameRef.current
      firstField?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [open, project])

  useEffect(() => {
    if (confirmClose) requestAnimationFrame(() => continueEditingRef.current?.focus())
  }, [confirmClose])

  const fields = draft.workspace?.fields
  const policy = getPackGenFieldPolicy(
    typeof fields?.packType.value === "string" ? fields.packType.value : undefined,
  )
  const visibleFieldDefinitions = useMemo(
    () => getPackSpecBuilderFields(policy, activeTab, advancedSettings),
    [activeTab, advancedSettings, policy],
  )
  const readiness = getPackGenCutterReadiness(draft)
  const completion = draft.workspace?.completion
  const actionState = getPackGenActionState({
    specificationReady: readiness.ready,
    hasProject: Boolean(project),
    hasCutter: Boolean(project?.cutter),
    incompleteBadgeLabel: completion?.status ?? "Empty",
  })

  const publish = (nextDraft: KyzaProjectDraftV1, nextProject = project) => {
    setDraft(nextDraft)
    setDirty(true)
    onSessionChange({ draft: nextDraft, ...(nextProject ? { project: nextProject } : {}) })
  }

  const updateField = (field: PackGenWorkspaceField, value: string | number | boolean | undefined) => {
    publish(setPackGenField(draft, field, value))
  }

  const friendlySaveFailure = () => {
    setError("Kyza could not save this Project. Your entries are still here; please try again.")
  }

  const connectProject = (createCutter: boolean) => {
    if (project) return { project, draft }
    if (!projectName.trim()) {
      setActiveTab("details")
      setError("Add a Project name before continuing.")
      requestAnimationFrame(() => projectNameRef.current?.focus())
      return undefined
    }
    projectIdRef.current ??= createProjectSubmissionId()
    projectTimestampRef.current ??= new Date().toISOString()
    const connected = connectStandalonePackGenToProject(draft, {
      projectId: projectIdRef.current,
      projectName,
      brand,
      jobReference,
      createCutter,
    }, { now: () => projectTimestampRef.current! })
    if (connected.ok === false) {
      setError(connected.errors[0] ?? (createCutter
        ? "Complete the required pack size and type before creating the Cutter."
        : "Kyza could not create this Project. Your entries are still here; please try again."))
      return undefined
    }
    setProject(connected.project)
    setDraft(connected.draft)
    setDirty(false)
    onSessionChange({ project: connected.project, draft: connected.draft })
    if (syncProjectUrl) window.history.replaceState({}, "", connected.destinationUrl)
    return { project: connected.project, draft: connected.draft }
  }

  const saveDraft = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    await Promise.resolve()
    const connected = connectProject(false)
    if (!connected) {
      setBusy(false)
      return
    }
    if (!project) {
      setBusy(false)
      return
    }
    const result = savePackGenDraft(connected.project.id, connected.draft, connected.project.revision)
    setBusy(false)
    if (result.ok === false) {
      friendlySaveFailure()
      return
    }
    setProject(result.project)
    setDraft(result.draft)
    setDirty(false)
    onSessionChange({ project: result.project, draft: result.draft })
  }

  const openCutter = async () => {
    if (busy || readiness.ready === false) return
    setBusy(true)
    setError("")
    await Promise.resolve()
    const connected = connectProject(true)
    if (!connected) {
      setBusy(false)
      return
    }
    const result = createOrUpdateCutterFromPackGen(
      connected.project.id,
      connected.draft,
      connected.project.revision,
    )
    if (result.ok === false) {
      setBusy(false)
      setError(result.errors[0]
        ? `The Cutter could not be created: ${result.errors[0]}`
        : "Kyza could not create the Cutter from this starting specification. Review the required fields and try again.")
      return
    }
    setProject(result.project)
    setDraft(result.draft)
    setDirty(false)
    onSessionChange({ project: result.project, draft: result.draft })
    window.location.assign(result.destinationUrl)
  }

  const requestClose = () => {
    if (busy) return
    if (dirty) {
      setConfirmClose(true)
      return
    }
    onRequestClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      if (confirmClose) setConfirmClose(false)
      else requestClose()
      return
    }
    if (event.key !== "Tab" || !dialogRef.current) return
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((node) => node.offsetParent !== null)
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open || !fields || !completion) return null

  const renderControl = (field: PackGenWorkspaceField, control?: string, step?: string) => {
    const entry = fields[field]
    const value = entry.value ?? ""
    if (control === "segments") {
      return (
        <div className="pack-gen-segments" role="group" aria-label="Eyemark count" data-testid={`pack-spec-${field}`}>
          {[0, 1, 2].map((count) => (
            <button
              className={`pack-gen-segment${value === count ? " is-active" : ""}`}
              type="button"
              aria-pressed={value === count}
              onClick={() => updateField(field, count)}
              key={count}
            >
              {count}
            </button>
          ))}
        </div>
      )
    }
    if (control === "boolean-segments") {
      return (
        <div className="pack-gen-segments" role="group" aria-label="Reclosable zip" data-testid={`pack-spec-${field}`}>
          {[
            { value: false, label: "Off" },
            { value: true, label: "On" },
          ].map((option) => (
            <button
              className={`pack-gen-segment${value === option.value ? " is-active" : ""}`}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => updateField(field, option.value)}
              key={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>
      )
    }
    if (control === "select") {
      const options = field === "packType"
        ? packModules.map(({ id, name }) => ({
            value: toPackSpecificationPackTypeId(id),
            label: name,
          }))
        : policy.supportedSubstrates.map((substrate) => ({
            value: substrate,
            label: substrate[0].toUpperCase() + substrate.slice(1),
          }))
      return (
        <select
          className="pack-gen-input"
          data-field={field}
          data-testid={`pack-spec-${field}`}
          value={String(value)}
          onChange={(event) => updateField(field, event.target.value)}
        >
          <option value="">Select an option</option>
          {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      )
    }
    const numeric = control === "number"
    return (
      <input
        className="pack-gen-input"
        data-field={field}
        data-testid={`pack-spec-${field}`}
        type={numeric ? "number" : "text"}
        min={numeric ? 0 : undefined}
        step={step}
        value={String(value)}
        onChange={(event) => updateField(
          field,
          numeric ? (event.target.value === "" ? undefined : Number(event.target.value)) : event.target.value,
        )}
      />
    )
  }

  const reviewRows: Array<[string, string]> = [
    ["Project name", project?.name ?? (projectName.trim() || "Not named yet")],
    ["Pack type", packModules.find(({ id }) => id === fields.packType.value)?.name ?? String(fields.packType.value ?? "Not selected")],
    ["Size", `${fields.finishedWidthMm.value ?? "—"} × ${fields.finishedHeightMm.value ?? "—"}mm`],
    ["Eyemarks", String(fields.eyemarkCount.value ?? "Engine default")],
    ["Substrate", String(fields.materialNotes.value ?? "Engine default")],
  ]
  if (hasValue(fields.gussetMm.value)) reviewRows.splice(3, 0, ["Gusset", `${fields.gussetMm.value}mm`])
  if (policy.visibleFields.includes("zipEnabled")) {
    reviewRows.splice(4, 0, ["Reclosable zip", fields.zipEnabled.value ? "On" : "Off"])
  }
  const sealSetup = [
    ["Top", fields.sealTopMm.value],
    ["Bottom", fields.sealBottomMm.value],
    ["Left", fields.sealLeftMm.value],
    ["Right", fields.sealRightMm.value],
  ]
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0)
    .map(([edge, value]) => `${edge} ${value}mm`)
    .join(" · ")
  if (sealSetup) reviewRows.push(["Seal setup", sealSetup])
  const productSummary = [
    fields.productDescription.value,
    hasValue(fields.fillWeightG.value) ? `${fields.fillWeightG.value}g` : undefined,
    hasValue(fields.fillVolumeMl.value) ? `${fields.fillVolumeMl.value}ml` : undefined,
  ].filter(Boolean).join(" · ")
  if (productSummary) reviewRows.push(["Product", productSummary])

  return (
    <div className="pack-gen-builder-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) requestClose()
    }}>
      <section
        className="pack-gen-builder-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-spec-builder-title"
        aria-describedby="pack-spec-builder-description"
        aria-busy={busy}
        onKeyDown={handleKeyDown}
      >
        <header className="pack-gen-builder-header">
          <div>
            <h2 id="pack-spec-builder-title">Pack Spec Builder</h2>
            <p className="pack-gen-help" id="pack-spec-builder-description">Build a useful starting specification. Kyza Tech remains responsible for geometry and validation.</p>
          </div>
          <button className="pack-gen-modal-close" type="button" onClick={requestClose} aria-label="Close Pack Spec Builder" disabled={busy}>×</button>
        </header>

        {confirmClose ? (
          <div className="pack-gen-builder-confirm" role="alertdialog" aria-labelledby="pack-gen-discard-title" aria-describedby="pack-gen-discard-description">
            <span className="pack-gen-eyebrow">Unsaved changes</span>
            <h3 id="pack-gen-discard-title">Discard your builder changes?</h3>
            <p id="pack-gen-discard-description">The selected suggestion will remain available, but edits made in this builder since it opened will be cleared.</p>
            <div className="pack-gen-actions">
              <button ref={continueEditingRef} className="pack-gen-secondary" type="button" onClick={() => setConfirmClose(false)}>Continue Editing</button>
              <button className="pack-gen-primary" type="button" onClick={() => {
                onSessionChange(openingSessionRef.current)
                onRequestClose()
              }}>Discard Changes</button>
            </div>
          </div>
        ) : (
          <>
        <div className="pack-gen-builder-toolbar">
          <div className="pack-gen-builder-tabs" role="tablist" aria-label="Specification sections">
            {PACK_SPEC_BUILDER_TABS.map(({ id, label }) => (
              <button
                className={`pack-gen-builder-tab${activeTab === id ? " is-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                tabIndex={activeTab === id ? 0 : -1}
                onClick={() => setActiveTab(id)}
                key={id}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="pack-gen-advanced-toggle">
            <input data-testid="pack-spec-advanced-settings" type="checkbox" checked={advancedSettings} onChange={(event) => setAdvancedSettings(event.target.checked)} />
            <span>Advanced Settings {advancedSettings ? "On" : "Off"}</span>
          </label>
        </div>

        <div className="pack-gen-builder-layout">
          <section className="pack-gen-editor" role="tabpanel">
            <div className="pack-gen-builder-status-row">
              <span className="pack-gen-status-badge" data-status={actionState.badgeLabel}>{actionState.badgeLabel}</span>
            </div>

            {activeTab === "details" ? (
              <div className="pack-gen-builder-identity">
                <label className="pack-gen-field">
                  <span className="pack-gen-label">Project Name</span>
                  <input
                    ref={projectNameRef}
                    className="pack-gen-input"
                    data-testid="pack-spec-project-name"
                    value={projectName}
                    maxLength={PROJECT_CREATION_FIELD_LIMITS.projectName}
                    disabled={Boolean(project)}
                    aria-invalid={Boolean(error && !projectName.trim())}
                    onChange={(event) => { setProjectName(event.target.value); setDirty(true); setError("") }}
                  />
                </label>
                {advancedSettings ? (
                  <>
                    <label className="pack-gen-field">
                      <span className="pack-gen-label">Brand (optional)</span>
                      <input className="pack-gen-input" value={brand} maxLength={PROJECT_CREATION_FIELD_LIMITS.customerOrBrand} disabled={Boolean(project)} onChange={(event) => { setBrand(event.target.value); setDirty(true) }} />
                    </label>
                    <label className="pack-gen-field">
                      <span className="pack-gen-label">Job Reference (optional)</span>
                      <input className="pack-gen-input" value={jobReference} maxLength={PROJECT_CREATION_FIELD_LIMITS.jobReference} disabled={Boolean(project)} onChange={(event) => { setJobReference(event.target.value); setDirty(true) }} />
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeTab !== "review" ? (
              <div className="pack-gen-form-grid">
                {visibleFieldDefinitions.map((definition) => (
                  <label className="pack-gen-field" key={definition.field}>
                    <span className="pack-gen-label">{definition.label}</span>
                    {renderControl(definition.field, definition.control, definition.step)}
                    <span className="pack-gen-provenance">
                      {provenanceLabel(fields[definition.field].source)}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="pack-gen-review-inputs">
                <h3>Assumptions and missing information</h3>
                {draft.workspace!.assumptions.length > 0 ? (
                  <>
                    <ul className="pack-gen-list">{draft.workspace!.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
                    <label className="pack-gen-check">
                      <input
                        type="checkbox"
                        checked={draft.workspace!.assumptionsReviewed}
                        onChange={(event) => publish(setPackGenReviewState(draft, { assumptionsReviewed: event.target.checked }))}
                      />
                      <span>I have reviewed the current assumptions</span>
                    </label>
                  </>
                ) : <p className="pack-gen-muted">No assumptions recorded.</p>}
                <label className="pack-gen-field">
                  <span className="pack-gen-label">Unresolved questions (one per line)</span>
                  <textarea
                    className="pack-gen-input pack-gen-questions"
                    rows={4}
                    value={draft.workspace!.unresolvedQuestions.join("\n")}
                    onChange={(event) => publish(setPackGenReviewState(draft, { unresolvedQuestions: event.target.value.split("\n") }))}
                  />
                </label>
                <div className="pack-gen-completion">
                  <p>{completion.requiredCompleted.length} of {completion.requiredCompleted.length + completion.requiredMissing.length} required inputs completed.</p>
                  <p>{completion.requiredMissing.length ? `Missing: ${completion.requiredMissing.join(", ")}.` : "No required fields are missing."}</p>
                  <p>{completion.proposedAwaitingConfirmation.length ? `${completion.proposedAwaitingConfirmation.length} inherited values remain editable.` : "All current values remain editable."}</p>
                  <p className="pack-gen-help">Completeness is not validation or production approval.</p>
                </div>
              </div>
            )}
          </section>

          <aside className="pack-gen-builder-summary" aria-label="Current specification summary">
            <span className="pack-gen-eyebrow">Current specification</span>
            <dl className="pack-gen-details">
              {reviewRows.map(([label, value]) => (
                <div className="pack-gen-detail" key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </aside>
        </div>

        <footer className="pack-gen-selected-action">
          <div>
            <p className="pack-gen-selected-status">{dirty ? "Unsaved Pack Specification changes" : draft.workspace.lastSavedAt ? `Saved ${new Date(draft.workspace.lastSavedAt).toLocaleString()}` : "This Pack Specification has not been saved yet."}</p>
            <p className="pack-gen-help">{readiness.ready ? "The starting specification can create a Cutter. This is not production approval." : "Complete the pack type and core dimensions to create a Cutter."}</p>
            <p className="pack-gen-project-error" role="alert">{error}</p>
          </div>
          <div className="pack-gen-actions">
            <button className="pack-gen-secondary" type="button" disabled={busy} onClick={saveDraft}>{busy ? "Working…" : "Save Draft"}</button>
            <button className="pack-gen-primary" type="button" disabled={busy || actionState.primaryDisabled} onClick={openCutter}>
              Open in Cutter Studio
            </button>
          </div>
        </footer>
          </>
        )}
      </section>
    </div>
  )
}
