import type { ChangeEvent, FormEvent, RefObject } from "react"
import {
  NEW_PROJECT_FIELD_LIMITS,
  type NewProjectFormDraft,
  type NewProjectFormErrors,
} from "./newProjectForm"

export interface PackTypeOption {
  readonly id: string
  readonly name: string
}

interface NewProjectFormProps {
  draft: NewProjectFormDraft
  errors: NewProjectFormErrors
  packTypes: readonly PackTypeOption[]
  projectNameRef: RefObject<HTMLInputElement | null>
  onChange: (draft: NewProjectFormDraft) => void
  onSubmit: () => void
  onCancel: () => void
}

export function NewProjectForm({
  draft,
  errors,
  packTypes,
  projectNameRef,
  onChange,
  onSubmit,
  onCancel,
}: NewProjectFormProps) {
  const updateField = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange({ ...draft, [event.currentTarget.name]: event.currentTarget.value })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }

  const fieldDescription = (field: keyof NewProjectFormErrors, helperId?: string) => (
    [helperId, errors[field] ? `${field}-error` : undefined].filter(Boolean).join(" ") || undefined
  )

  return (
    <form className="klyro-project-form" onSubmit={submit} noValidate>
      <div className="klyro-form-field is-full">
        <label htmlFor="new-project-name">Project Name <span aria-hidden="true">*</span></label>
        <input
          ref={projectNameRef}
          id="new-project-name"
          name="projectName"
          value={draft.projectName}
          maxLength={NEW_PROJECT_FIELD_LIMITS.projectName}
          onChange={updateField}
          aria-invalid={Boolean(errors.projectName)}
          aria-describedby={fieldDescription("projectName", "new-project-name-help")}
          required
        />
        <small id="new-project-name-help">Required · {NEW_PROJECT_FIELD_LIMITS.projectName} characters maximum</small>
        {errors.projectName && <span className="klyro-field-error" id="projectName-error" role="alert">{errors.projectName}</span>}
      </div>

      <div className="klyro-form-field">
        <label htmlFor="new-project-customer">Customer or Brand <small>Optional</small></label>
        <input id="new-project-customer" name="customerOrBrand" value={draft.customerOrBrand} maxLength={NEW_PROJECT_FIELD_LIMITS.customerOrBrand} onChange={updateField} aria-invalid={Boolean(errors.customerOrBrand)} aria-describedby={fieldDescription("customerOrBrand")} />
        {errors.customerOrBrand && <span className="klyro-field-error" id="customerOrBrand-error" role="alert">{errors.customerOrBrand}</span>}
      </div>

      <div className="klyro-form-field">
        <label htmlFor="new-project-product">Product Name <small>Optional</small></label>
        <input id="new-project-product" name="productName" value={draft.productName} maxLength={NEW_PROJECT_FIELD_LIMITS.productName} onChange={updateField} aria-invalid={Boolean(errors.productName)} aria-describedby={fieldDescription("productName")} />
        {errors.productName && <span className="klyro-field-error" id="productName-error" role="alert">{errors.productName}</span>}
      </div>

      <div className="klyro-form-field is-full">
        <label htmlFor="new-project-reference">Internal Job or Reference Number <small>Optional</small></label>
        <input id="new-project-reference" name="jobReference" value={draft.jobReference} maxLength={NEW_PROJECT_FIELD_LIMITS.jobReference} onChange={updateField} aria-invalid={Boolean(errors.jobReference)} aria-describedby={fieldDescription("jobReference")} />
        {errors.jobReference && <span className="klyro-field-error" id="jobReference-error" role="alert">{errors.jobReference}</span>}
      </div>

      <div className="klyro-form-field is-full">
        <label htmlFor="new-project-description">Product / Packaging Description <small>Optional</small></label>
        <textarea id="new-project-description" name="description" value={draft.description} maxLength={NEW_PROJECT_FIELD_LIMITS.description} rows={3} onChange={updateField} aria-invalid={Boolean(errors.description)} aria-describedby={fieldDescription("description")} />
        {errors.description && <span className="klyro-field-error" id="description-error" role="alert">{errors.description}</span>}
      </div>

      <div className="klyro-form-field is-full">
        <label htmlFor="new-project-notes">Notes <small>Optional</small></label>
        <textarea id="new-project-notes" name="notes" value={draft.notes} maxLength={NEW_PROJECT_FIELD_LIMITS.notes} rows={3} onChange={updateField} aria-invalid={Boolean(errors.notes)} aria-describedby={fieldDescription("notes")} />
        {errors.notes && <span className="klyro-field-error" id="notes-error" role="alert">{errors.notes}</span>}
      </div>

      <fieldset className="klyro-form-fieldset is-full">
        <legend>Starting route</legend>
        <div className="klyro-route-options">
          <label>
            <input type="radio" name="startingRoute" value="pack-gen" checked={draft.startingRoute === "pack-gen"} onChange={updateField} />
            <span><strong>Start with Pack Gen</strong><small>Define the pack before entering engineering.</small></span>
          </label>
          <label>
            <input type="radio" name="startingRoute" value="cutter-studio" checked={draft.startingRoute === "cutter-studio"} onChange={updateField} />
            <span><strong>Start directly in Cutter Studio</strong><small>Requires a production pack type.</small></span>
          </label>
        </div>
      </fieldset>

      <div className="klyro-form-field is-full">
        <label htmlFor="new-project-pack-type">
          Pack type <small>{draft.startingRoute === "cutter-studio" ? "Required" : "Optional"}</small>
        </label>
        <select id="new-project-pack-type" name="packType" value={draft.packType} onChange={updateField} required={draft.startingRoute === "cutter-studio"} aria-invalid={Boolean(errors.packType)} aria-describedby={fieldDescription("packType", "new-project-pack-type-help")}>
          <option value="">Select a pack type</option>
          {packTypes.map((packType) => <option value={packType.id} key={packType.id}>{packType.name}</option>)}
        </select>
        <small id="new-project-pack-type-help">Options come from the current production pack registry.</small>
        {errors.packType && <span className="klyro-field-error" id="packType-error" role="alert">{errors.packType}</span>}
      </div>

      <div className="klyro-modal-actions is-full">
        <button className="klyro-secondary-action" type="button" onClick={onCancel}>Cancel</button>
        <button className="klyro-primary-action" type="submit">Review Project</button>
      </div>
    </form>
  )
}
