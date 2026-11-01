import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { packModules } from "../../packs"
import { NewProjectForm } from "./NewProjectDetailsForm"
import { NewProjectReview } from "./NewProjectReview"
import {
  createCanonicalProject,
  createProjectSubmissionId,
} from "../../project/projectCreationService"
import {
  EMPTY_NEW_PROJECT_DRAFT,
  hasNewProjectDraftInput,
  validateNewProjectForm,
  type NewProjectFormDraft,
  type NewProjectFormErrors,
  type NewProjectFormValues,
} from "./newProjectForm"

interface NewProjectModalProps {
  open: boolean
  onRequestClose: () => void
}

type ModalView = "edit" | "review"

const packTypes = packModules.map(({ id, name }) => ({ id, name }))
const focusableSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"

export function NewProjectModal({ open, onRequestClose }: NewProjectModalProps) {
  const [draft, setDraft] = useState<NewProjectFormDraft>({ ...EMPTY_NEW_PROJECT_DRAFT })
  const [errors, setErrors] = useState<NewProjectFormErrors>({})
  const [values, setValues] = useState<NewProjectFormValues | null>(null)
  const [view, setView] = useState<ModalView>("edit")
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creationError, setCreationError] = useState<string>()
  const modalRef = useRef<HTMLElement>(null)
  const projectNameRef = useRef<HTMLInputElement>(null)
  const actionFocusRef = useRef<HTMLButtonElement>(null)
  const reviewFocusRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const creatingRef = useRef(false)
  const submissionProjectIdRef = useRef<string | null>(null)

  const resetModal = () => {
    setDraft({ ...EMPTY_NEW_PROJECT_DRAFT })
    setErrors({})
    setValues(null)
    setView("edit")
    setConfirmDiscard(false)
    setCreating(false)
    setCreationError(undefined)
    creatingRef.current = false
    submissionProjectIdRef.current = null
  }

  useEffect(() => {
    if (open && !wasOpen.current) resetModal()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      if (confirmDiscard) actionFocusRef.current?.focus()
      else if (view === "review") reviewFocusRef.current?.focus()
      else projectNameRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [confirmDiscard, open, view])

  const isDirty = hasNewProjectDraftInput(draft) || values !== null

  const closeAndReset = () => {
    resetModal()
    onRequestClose()
  }

  const requestClose = () => {
    if (creatingRef.current) return
    if (isDirty) {
      setConfirmDiscard(true)
      return
    }
    closeAndReset()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault()
      requestClose()
      return
    }

    if (event.key !== "Tab" || !modalRef.current) return
    const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.offsetParent !== null)
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

  const submitForReview = () => {
    const result = validateNewProjectForm(draft, packTypes.map(({ id }) => id))
    if (result.ok === false) {
      setErrors(result.errors)
      requestAnimationFrame(() => modalRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus())
      return
    }

    setErrors({})
    setCreationError(undefined)
    setValues(result.value)
    setView("review")
  }

  const createProject = async () => {
    if (!values || creatingRef.current) return
    creatingRef.current = true
    setCreating(true)
    setCreationError(undefined)
    submissionProjectIdRef.current ??= createProjectSubmissionId()

    await Promise.resolve()
    const result = createCanonicalProject({
      ...values,
      projectId: submissionProjectIdRef.current,
    })
    if (result.ok === false) {
      creatingRef.current = false
      setCreating(false)
      setCreationError(result.errors.join(" ") || "The Project could not be saved. Please try again.")
      return
    }
    window.location.assign(result.destinationUrl)
  }

  const packTypeName = useMemo(
    () => packTypes.find(({ id }) => id === values?.packType)?.name,
    [values?.packType],
  )

  if (!open) return null

  return (
    <div
      className="kyza-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose()
      }}
    >
      <section
        className="kyza-project-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        aria-describedby="new-project-description"
        aria-busy={creating}
        onKeyDown={handleKeyDown}
      >
        <header className="kyza-modal-header">
          <div>
            <div className="kyza-eyebrow">Manual Project setup</div>
            <h2 id="new-project-title">New Project</h2>
            <p id="new-project-description">Add the initial Project details and choose where the packaging workflow should begin.</p>
          </div>
          <button className="kyza-modal-close" type="button" onClick={requestClose} aria-label="Close New Project dialog" title="Close" disabled={creating}>
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <div className="kyza-modal-body">
          {confirmDiscard ? (
            <div className="kyza-discard-confirmation" role="alertdialog" aria-labelledby="discard-project-title" aria-describedby="discard-project-description">
              <h3 id="discard-project-title">Discard this Project setup?</h3>
              <p id="discard-project-description">Your entries will be cleared from this dialog. Existing saved Projects are not deleted.</p>
              <div className="kyza-modal-actions">
                <button ref={actionFocusRef} className="kyza-secondary-action" type="button" onClick={() => setConfirmDiscard(false)}>Continue Editing</button>
                <button className="kyza-primary-action" type="button" onClick={closeAndReset}>Discard</button>
              </div>
            </div>
          ) : view === "edit" ? (
            <NewProjectForm
              draft={draft}
              errors={errors}
              packTypes={packTypes}
              projectNameRef={projectNameRef}
              onChange={(nextDraft) => {
                setDraft(nextDraft)
                setErrors({})
                setCreationError(undefined)
              }}
              onSubmit={submitForReview}
              onCancel={requestClose}
            />
          ) : values ? (
            <div ref={reviewFocusRef} tabIndex={-1}>
              <NewProjectReview
                values={values}
                packTypeName={packTypeName}
                creating={creating}
                creationError={creationError}
                onBack={() => {
                  setCreationError(undefined)
                  setView("edit")
                }}
                onContinue={createProject}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
