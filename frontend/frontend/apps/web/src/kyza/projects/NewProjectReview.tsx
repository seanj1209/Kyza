import { newProjectReviewRows, type NewProjectFormValues } from "./newProjectForm"

interface NewProjectReviewProps {
  values: NewProjectFormValues
  packTypeName?: string
  onBack: () => void
  onContinue: () => void
  creating: boolean
  creationError?: string
}

export function NewProjectReview({
  values,
  packTypeName,
  onBack,
  onContinue,
  creating,
  creationError,
}: NewProjectReviewProps) {
  const reviewValues = packTypeName ? { ...values, packType: packTypeName } : values

  return (
    <div className="kyza-project-review">
      <p>Review the manual Project information before creating the Project.</p>
      <dl>
        {newProjectReviewRows(reviewValues).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {creationError && <p className="kyza-creation-error" role="alert">{creationError}</p>}
      <span className="kyza-visually-hidden" role="status" aria-live="polite">
        {creating ? "Creating Project…" : ""}
      </span>
      <div className="kyza-modal-actions">
        <button className="kyza-secondary-action" type="button" onClick={onBack} disabled={creating}>Back to Edit</button>
        <button
          className="kyza-primary-action"
          type="button"
          onClick={onContinue}
          disabled={creating}
          aria-busy={creating}
        >
          {creating ? "Creating Project…" : "Continue"}
        </button>
      </div>
    </div>
  )
}
