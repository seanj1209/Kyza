import { createElement as createReactElement } from "react"
import { createRoot } from "react-dom/client"
import "./klyro/styles/klyro.css"
import "./packGen.css"
import {
  generatePackGenRecommendations,
  type PackGenRecommendation,
  type PackGenResult,
} from "../../../packages/ai-engine"
import type { CutNFlowProjectDraftV1, CutNFlowProjectV1 } from "../../../packages/cutter-engine/project"
import { createPackGenCardViewModel } from "./packGen/packGenCardModel"
import { PackSpecBuilderModal, type PackSpecBuilderSession } from "./packGen/PackSpecBuilderModal"
import {
  createPackGenSuggestionPreviewModel,
  fitPackGenSuggestionPreview,
} from "./packGen/packGenSuggestionPreview"
import {
  applyRecommendationToPackGenDraft,
  connectStandalonePackGenToProject,
  createOrUpdateCutterFromPackGen,
  loadPackGenProject,
  setPackGenReviewState,
} from "./packGen/packGenProjectService"
import { createProjectSubmissionId, PROJECT_CREATION_FIELD_LIMITS } from "./project/projectCreationService"

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const focusableSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"

function trapFocus(container: HTMLElement, event: KeyboardEvent) {
  if (event.key !== "Tab") return
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
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

const renderRecovery = (host: HTMLElement, message: string) => {
  const shell = element("div", "pack-gen-shell")
  const panel = element("section", "pack-gen-panel pack-gen-recovery")
  panel.append(
    element("span", "pack-gen-eyebrow", "Pack Gen Project unavailable"),
    element("h1", "pack-gen-title", "This Project could not be opened"),
    element("p", "pack-gen-intro", message),
  )
  const actions = element("div", "pack-gen-actions")
  const dashboard = element("a", "pack-gen-secondary", "Return to Dashboard")
  dashboard.href = "/"
  actions.appendChild(dashboard)
  panel.appendChild(actions)
  shell.appendChild(panel)
  host.appendChild(shell)
}

// The suggestion flow is shared by Cutter landing and legacy draft links.
export function mountPackGen(host: HTMLElement, search = window.location.search) {
  if (host.dataset.packGenMounted === "true") return
  host.dataset.packGenMounted = "true"
  const loaded = loadPackGenProject(search)
  if (loaded.ok === false) renderRecovery(host, loaded.message)
  else renderPackGenWorkspace(host, loaded.mode === "project" ? loaded.project : undefined, loaded.draft)
}

type PackGenOverlayState =
  | { type: "closed" }
  | { type: "suggestions"; result: PackGenResult }
  | { type: "flow-score"; result: PackGenResult; suggestionId: string }
  | { type: "pack-spec-builder"; result: PackGenResult; suggestionId: string }

type SuggestionCarouselState = {
  activeIndex: number
  suggestionCount: number
}

function renderPackGenWorkspace(host: HTMLElement, initialProject: CutNFlowProjectV1 | undefined, initialDraft: CutNFlowProjectDraftV1) {
  let project = initialProject
  let draft = initialDraft
  let overlayState: PackGenOverlayState = { type: "closed" }
  let carouselState: SuggestionCarouselState = { activeIndex: 0, suggestionCount: 0 }
  let latestResult: PackGenResult | undefined
  let generatedPrompt = ""
  let generationBusy = false
  let projectDetailsBusy = false
  let projectDetailsProjectId: string | undefined
  let projectDetailsTimestamp: string | undefined
  let overlayTrigger: HTMLElement | undefined

  const shell = element("div", "pack-gen-shell")
  const promptPanel = element("section", "pack-gen-panel pack-gen-prompt-panel")
  const promptHeading = element("div", "pack-gen-composer-heading")
  const promptLabel = element("label", "pack-gen-label", "What are you creating?")
  promptLabel.htmlFor = "pack-gen-prompt"
  const flowAiPresence = element("span", "pack-gen-flowai-presence", "Flow")
  promptHeading.append(promptLabel, flowAiPresence)
  const promptInput = element("textarea", "pack-gen-prompt")
  promptInput.id = "pack-gen-prompt"
  promptInput.rows = 5
  promptInput.value = draft.productPrompt
  promptInput.placeholder = "Example: Create a 250g stand-up pouch, approximately 160 × 240mm, with one eyemark."
  const starterPrompts: Array<[string, string]> = [
    ["Stand-up pouch", "Create a 250g stand-up pouch with one eyemark."],
    ["Four-side seal", "Build a four-side seal sachet with one eyemark."],
    ["Flow wrap", "Create flow wrap rollstock for a 60g snack bar."],
    ["Paper strip", "Create a simple paper strip pack for a retail product."],
  ]
  const promptIdea = element("button", "pack-gen-prompt-idea")
  promptIdea.type = "button"
  promptIdea.setAttribute("aria-label", "Use the current prompt idea")
  let promptIdeaIndex = 0
  const syncPromptIdea = () => {
    const [label, prompt] = starterPrompts[promptIdeaIndex]
    promptIdea.innerHTML = ""
    promptIdea.append(element("span", undefined, "Prompt idea"), document.createTextNode(` ${label}: “${prompt}”`))
    promptIdea.setAttribute("aria-label", `Use prompt idea: ${prompt}`)
  }
  syncPromptIdea()
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.setInterval(() => {
      promptIdea.classList.add("is-changing")
      window.setTimeout(() => {
        promptIdeaIndex = (promptIdeaIndex + 1) % starterPrompts.length
        syncPromptIdea()
        promptIdea.classList.remove("is-changing")
      }, 180)
    }, 6200)
  }
  promptIdea.addEventListener("click", () => {
    const prompt = starterPrompts[promptIdeaIndex][1]
    promptInput.value = prompt
    draft = setPackGenReviewState(draft, { prompt })
    setSubmitLabel("Submit prompt")
    promptInput.focus()
  })
  const promptActions = element("div", "pack-gen-prompt-actions")
  const generateButton = element("button", "pack-gen-primary pack-gen-submit")
  generateButton.type = "button"
  generateButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>'
  const setSubmitLabel = (label: string) => {
    generateButton.setAttribute("aria-label", label)
    generateButton.title = label + " (Enter; Shift+Enter for a new line)"
  }
  setSubmitLabel("Submit prompt")
  promptActions.appendChild(generateButton)
  promptPanel.append(promptHeading, promptInput, promptActions)

  const status = element("div", "pack-gen-status")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")

  const suggestionBackdrop = element("div", "pack-gen-suggestion-backdrop")
  suggestionBackdrop.hidden = true
  const suggestionDialog = element("section", "pack-gen-suggestion-dialog")
  suggestionDialog.setAttribute("role", "dialog")
  suggestionDialog.setAttribute("aria-modal", "true")
  suggestionDialog.setAttribute("aria-labelledby", "pack-gen-suggestions-title")
  suggestionDialog.setAttribute("aria-describedby", "pack-gen-suggestions-description")
  const suggestionHeader = element("header", "pack-gen-suggestion-header")
  const suggestionHeading = element("div")
  const suggestionTitle = element("h2", undefined, "Suggested Pack Types")
  suggestionTitle.id = "pack-gen-suggestions-title"
  const suggestionIntro = element("p", "pack-gen-help", "Flow found supported starting points based on your request. Review the key details or open a suggestion for more information.")
  suggestionIntro.id = "pack-gen-suggestions-description"
  const promptSummary = element("p", "pack-gen-prompt-summary")
  suggestionHeading.append(element("span", "pack-gen-eyebrow", "Flow suggestions"), suggestionTitle, suggestionIntro, promptSummary)
  const suggestionHeaderActions = element("div", "pack-gen-suggestion-header-actions")
  const suggestionPosition = element("span", "pack-gen-carousel-position")
  suggestionPosition.setAttribute("role", "status")
  suggestionPosition.setAttribute("aria-live", "polite")
  suggestionPosition.setAttribute("aria-atomic", "true")
  const suggestionClose = element("button", "pack-gen-modal-close", "×")
  suggestionClose.type = "button"
  suggestionClose.setAttribute("aria-label", "Close Suggested Pack Types")
  suggestionHeaderActions.append(suggestionPosition, suggestionClose)
  suggestionHeader.append(suggestionHeading, suggestionHeaderActions)
  const suggestionContent = element("div", "pack-gen-suggestion-content")
  const suggestionFooter = element("footer", "pack-gen-suggestion-footer")
  suggestionDialog.append(suggestionHeader, suggestionContent, suggestionFooter)
  suggestionBackdrop.appendChild(suggestionDialog)

  const projectDetailsBackdrop = element("div", "pack-gen-modal-backdrop")
  projectDetailsBackdrop.hidden = true
  const projectDetailsDialog = element("section", "pack-gen-project-dialog")
  projectDetailsDialog.setAttribute("role", "dialog")
  projectDetailsDialog.setAttribute("aria-modal", "true")
  projectDetailsDialog.setAttribute("aria-labelledby", "pack-gen-project-details-title")
  const projectDetailsTitle = element("h2", undefined, "Project Details")
  projectDetailsTitle.id = "pack-gen-project-details-title"
  const projectDetailsForm = document.createElement("form")
  projectDetailsForm.className = "pack-gen-project-form"
  projectDetailsForm.noValidate = true
  const projectNameInput = document.createElement("input")
  const brandInput = document.createElement("input")
  const jobReferenceInput = document.createElement("input")
  const detailFields: Array<[string, string, string, HTMLInputElement, number, boolean]> = [
    ["Project Name", "pack-gen-project-name", "projectName", projectNameInput, PROJECT_CREATION_FIELD_LIMITS.projectName, true],
    ["Brand (optional)", "pack-gen-project-brand", "customerOrBrand", brandInput, PROJECT_CREATION_FIELD_LIMITS.customerOrBrand, false],
    ["Job Reference (optional)", "pack-gen-project-reference", "jobReference", jobReferenceInput, PROJECT_CREATION_FIELD_LIMITS.jobReference, false],
  ]
  detailFields.forEach(([labelText, id, name, input, maxLength, required]) => {
    const label = element("label", "pack-gen-field")
    label.htmlFor = id
    label.appendChild(element("span", "pack-gen-label", labelText))
    input.id = id
    input.name = name
    input.className = "pack-gen-input"
    input.maxLength = maxLength
    input.required = required
    label.appendChild(input)
    projectDetailsForm.appendChild(label)
  })
  const projectDetailsError = element("p", "pack-gen-project-error")
  projectDetailsError.setAttribute("role", "alert")
  const projectDetailsActions = element("div", "pack-gen-actions")
  const projectDetailsCancel = element("button", "pack-gen-secondary", "Back to Suggestions")
  projectDetailsCancel.type = "button"
  const projectDetailsConfirm = element("button", "pack-gen-primary", "Create Project and Cutter")
  projectDetailsConfirm.type = "submit"
  projectDetailsActions.append(projectDetailsCancel, projectDetailsConfirm)
  projectDetailsForm.append(projectDetailsError, projectDetailsActions)
  projectDetailsDialog.append(
    element("span", "pack-gen-eyebrow", "Canonical Project"),
    projectDetailsTitle,
    element("p", "pack-gen-help", "Add the Project identity. The selected Pack Specification and Flow assumptions will be carried forward automatically."),
    projectDetailsForm,
  )
  projectDetailsBackdrop.appendChild(projectDetailsDialog)

  const builderHost = element("div", "pack-gen-builder-host")
  const builderRoot = createRoot(builderHost)

  shell.append(promptPanel, promptIdea, status)
  // Keep dialogs outside the scrollable landing surface so they cannot be clipped.
  document.body.append(suggestionBackdrop, projectDetailsBackdrop, builderHost)
  host.appendChild(shell)

  function updateBodyScroll() {
    const modalOpen = overlayState.type !== "closed" || !projectDetailsBackdrop.hidden
    document.body.style.overflow = modalOpen ? "hidden" : ""
  }

  function setStatus(message: string, tone?: "error" | "success") {
    status.textContent = message
    status.className = `pack-gen-status${tone ? ` is-${tone}` : ""}`
  }

  function syncBuilder(open: boolean) {
    const session: PackSpecBuilderSession = { draft, ...(project ? { project } : {}) }
    builderRoot.render(createReactElement(PackSpecBuilderModal, {
      open,
      source: project ? "existing-project" : "pack-gen-suggestion",
      session,
      syncProjectUrl: true,
      onSessionChange: (nextSession: PackSpecBuilderSession) => {
        draft = nextSession.draft
        project = nextSession.project
      },
      onRequestClose: () => {
        if (latestResult) {
          overlayState = { type: "suggestions", result: latestResult }
          syncBuilder(false)
          renderSuggestionOverlay()
        } else {
          overlayState = { type: "closed" }
          syncBuilder(false)
          updateBodyScroll()
        }
      },
    }))
  }

  function closeSuggestionOverlay() {
    overlayState = { type: "closed" }
    suggestionBackdrop.hidden = true
    updateBodyScroll()
    overlayTrigger?.focus()
  }

  function openBuilder(recommendation: PackGenRecommendation, result: PackGenResult, trigger: HTMLElement) {
    draft = applyRecommendationToPackGenDraft(draft, recommendation, result.input.rawPrompt)
    overlayTrigger = trigger
    overlayState = { type: "pack-spec-builder", result, suggestionId: recommendation.id }
    suggestionBackdrop.hidden = true
    syncBuilder(true)
    updateBodyScroll()
  }

  function startCutterCreation() {
    if (!project) {
      projectDetailsError.textContent = ""
      suggestionDialog.inert = true
      projectDetailsBackdrop.hidden = false
      updateBodyScroll()
      // Focus before typing can begin; a deferred focus can steal input from
      // Brand or Job Reference after the user has already moved on.
      projectNameInput.focus()
      return
    }
    const result = createOrUpdateCutterFromPackGen(project.id, draft, project.revision)
    if (result.ok === false) {
      setStatus("This suggestion needs more information before a Cutter can be generated. Use Build Specification to complete the required details.", "error")
      return
    }
    project = result.project
    draft = result.draft
    setStatus("Cutter saved to the same Project. Opening Cutter Studio…", "success")
    window.location.assign(result.destinationUrl)
  }

  function renderDetails(result: PackGenResult, recommendation: PackGenRecommendation) {
    const viewModel = createPackGenCardViewModel(
      recommendation,
      result.recommendations.findIndex(({ id }) => id === recommendation.id),
      result.recommendations.filter(({ id }) => id !== recommendation.id).map(({ title }) => title),
    )
    suggestionDialog.dataset.view = "flow-score"
    suggestionPosition.hidden = true
    suggestionFooter.hidden = true
    suggestionContent.innerHTML = ""
    const back = element("button", "pack-gen-details-back", "← Back to Suggestions")
    back.type = "button"
    back.addEventListener("click", () => {
      overlayState = { type: "suggestions", result }
      renderSuggestionOverlay()
    })
    const detailsView = element("article", "pack-gen-further-details")
    detailsView.append(
      back,
      element("span", "pack-gen-card-number", recommendation.title),
      element("h3", undefined, "Flow Score"),
      element("p", "pack-gen-flow-score-intro", "Review the information currently affecting this pack starting point."),
    )
    const accordion = element("div", "pack-gen-expandable-details")
    viewModel.detailSections
      .filter(({ id }) => id !== "alternatives")
      .forEach((section) => {
        const details = document.createElement("details")
        details.className = "pack-gen-disclosure"
        details.appendChild(element("summary", undefined, section.label))
        const list = element("ul")
        section.items.forEach((item) => list.appendChild(element("li", undefined, item)))
        details.appendChild(list)
        details.addEventListener("toggle", () => {
          if (!details.open) return
          accordion.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((other) => {
            if (other !== details) other.open = false
          })
        })
        accordion.appendChild(details)
      })
    detailsView.appendChild(accordion)
    suggestionContent.appendChild(detailsView)
    requestAnimationFrame(() => back.focus())
  }

  function renderActiveSuggestion(result: PackGenResult) {
    const count = result.recommendations.length
    carouselState.suggestionCount = count
    carouselState.activeIndex = Math.min(Math.max(carouselState.activeIndex, 0), Math.max(count - 1, 0))
    const recommendation = result.recommendations[carouselState.activeIndex]
    if (!recommendation) return
    const index = carouselState.activeIndex
    const viewModel = createPackGenCardViewModel(recommendation, index)
    const previewModel = createPackGenSuggestionPreviewModel(draft, recommendation, result.input.rawPrompt)
    suggestionContent.innerHTML = ""
    suggestionFooter.innerHTML = ""
    suggestionFooter.hidden = false
    suggestionPosition.hidden = count <= 1
    suggestionPosition.textContent = `${index + 1} of ${count}`
    suggestionPosition.setAttribute("aria-label", `Suggestion ${index + 1} of ${count}: ${recommendation.title}`)

    const previous = element("button", "pack-gen-carousel-arrow", "‹")
    previous.type = "button"
    previous.disabled = index === 0
    previous.hidden = count <= 1
    previous.setAttribute("aria-label", "Previous suggestion")
    previous.dataset.carouselFocus = "previous"
    previous.addEventListener("click", () => setActiveSuggestion(result, index - 1))

    const next = element("button", "pack-gen-carousel-arrow", "›")
    next.type = "button"
    next.disabled = index === count - 1
    next.hidden = count <= 1
    next.setAttribute("aria-label", "Next suggestion")
    next.dataset.carouselFocus = "next"
    next.addEventListener("click", () => setActiveSuggestion(result, index + 1))

    const stage = element("div", `pack-gen-carousel-stage${count <= 1 ? " is-single" : ""}`)
    const card = element("article", `pack-gen-carousel-card${viewModel.bestMatch ? " is-best-match" : ""}`)
    card.setAttribute("aria-label", `Suggestion ${index + 1}: ${recommendation.title}`)
    const previewPanel = element("div", "pack-gen-carousel-preview")
    const heading = element("div", "pack-gen-card-header")
    const titleGroup = element("div")
    titleGroup.append(element("span", "pack-gen-card-number", viewModel.optionLabel), element("h3", undefined, recommendation.title))
    heading.appendChild(titleGroup)
    if (viewModel.bestMatch) heading.appendChild(element("span", "pack-gen-best-match", "Best match"))
    const preview = element("div", "pack-gen-card-preview")
    preview.setAttribute("role", "img")
    preview.setAttribute("aria-label", `${recommendation.title} cutter preview`)
    const previewSvg = previewModel.render()
    if (previewSvg) {
      preview.appendChild(previewSvg)
      requestAnimationFrame(() => fitPackGenSuggestionPreview(previewSvg))
    } else {
      preview.classList.add("is-unavailable")
      preview.appendChild(element("p", undefined, "Preview unavailable for this starting point."))
    }
    previewPanel.appendChild(preview)

    const information = element("div", "pack-gen-carousel-information")
    const summary = element("dl", "pack-gen-carousel-specification")
    const appendSpecification = (label: string, value: string) => {
      const row = element("div", "pack-gen-carousel-spec-row")
      row.append(element("dt", undefined, label), element("dd", undefined, value))
      summary.appendChild(row)
    }
    appendSpecification("Dimensions", `${recommendation.widthMm} × ${recommendation.heightMm}mm`)
    const gusset = previewModel.draft.workspace?.fields.gussetMm.value
    if (typeof gusset === "number" && gusset > 0) appendSpecification("Gusset", `${gusset}mm`)
    appendSpecification("Eyemarks", `${recommendation.eyemarks.count}`)
    if (previewModel.keyFeatures.length > 0) appendSpecification("Key features", previewModel.keyFeatures.join(" · "))
    const substrate = element("div", "pack-gen-substrate")
    substrate.append(
      element("span", "pack-gen-card-number", "Substrate"),
      element("strong", undefined, previewModel.substrate.value),
      element("small", undefined, previewModel.substrate.source),
    )
    const further = element("button", "pack-gen-flow-score-action", "Flow Score")
    further.type = "button"
    further.dataset.carouselFocus = "flow-score"
    further.addEventListener("click", () => {
      overlayState = { type: "flow-score", result, suggestionId: recommendation.id }
      renderDetails(result, recommendation)
    })
    const build = element("button", "pack-gen-secondary", "Build Specification")
    build.type = "button"
    build.dataset.carouselFocus = "build"
    build.disabled = !viewModel.canOpenBuilder
    build.addEventListener("click", () => openBuilder(recommendation, result, build))
    const cutter = element("button", "pack-gen-primary", "Open in Cutter Studio")
    cutter.type = "button"
    cutter.dataset.carouselFocus = "cutter"
    cutter.disabled = !viewModel.canOpenCutter
    cutter.title = viewModel.cutterUnavailableReason ?? "Create this supported starting point in Cutter Studio"
    cutter.addEventListener("click", () => {
      draft = applyRecommendationToPackGenDraft(draft, recommendation, result.input.rawPrompt)
      startCutterCreation()
    })
    information.append(heading, summary, substrate, further)
    card.append(previewPanel, information)
    stage.append(previous, card, next)
    suggestionContent.appendChild(stage)
    suggestionFooter.append(build, cutter)
  }

  function setActiveSuggestion(result: PackGenResult, nextIndex: number) {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), result.recommendations.length - 1)
    if (boundedIndex === carouselState.activeIndex) return
    const focusKey = document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.carouselFocus
      : undefined
    carouselState.activeIndex = boundedIndex
    renderActiveSuggestion(result)
    if (focusKey) {
      const preferred = suggestionDialog.querySelector<HTMLElement>(`[data-carousel-focus='${focusKey}']:not([disabled])`)
      const alternate = suggestionDialog.querySelector<HTMLElement>(`[data-carousel-focus='${focusKey === "previous" ? "next" : "previous"}']:not([disabled])`)
      ;(preferred ?? alternate)?.focus()
    }
  }

  function renderSuggestionOverlay() {
    if (overlayState.type !== "suggestions" && overlayState.type !== "flow-score") return
    const result = overlayState.result
    suggestionBackdrop.hidden = false
    promptSummary.textContent = `“${result.input.rawPrompt.length > 150 ? `${result.input.rawPrompt.slice(0, 147)}…` : result.input.rawPrompt}”`
    if (overlayState.type === "flow-score") {
      const recommendation = result.recommendations.find(({ id }) => id === overlayState.suggestionId)
      if (recommendation) renderDetails(result, recommendation)
      return
    }
    suggestionDialog.dataset.view = "suggestions"
    renderActiveSuggestion(result)
    updateBodyScroll()
    suggestionClose.focus({ preventScroll: true })
  }

  async function generate() {
    const prompt = promptInput.value.trim()
    const meaningfulWords = prompt.split(/\s+/).filter((word) => /[a-z0-9]{2,}/i.test(word))
    if (prompt.length < 3 || meaningfulWords.length < 1) {
      setStatus("Describe the pack you would like Flow to help create.", "error")
      promptInput.focus()
      return
    }
    if (latestResult && generatedPrompt === prompt) {
      overlayTrigger = generateButton
      overlayState = { type: "suggestions", result: latestResult }
      renderSuggestionOverlay()
      return
    }
    generationBusy = true
    generateButton.disabled = true
    setSubmitLabel("Finding starting points…")
    promptPanel.classList.add("is-generating")
    promptPanel.setAttribute("aria-busy", "true")
    setStatus("Flow is reviewing your request and matching supported pack types.")
    draft = setPackGenReviewState(draft, { prompt })
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    try {
      const result = generatePackGenRecommendations(prompt)
      if (!result.ok) {
        console.error("[Pack Gen] Flow recommendation failure", result.errors)
        setStatus("Flow could not generate suggestions from this request. Review the prompt and try again.", "error")
        return
      }
      if (result.recommendations.length === 0) {
        setStatus("No supported cutter starting point matched this request. Try simplifying the description or changing the requested pack format.", "error")
        return
      }
      latestResult = result
      generatedPrompt = prompt
      carouselState = { activeIndex: 0, suggestionCount: result.recommendations.length }
      overlayTrigger = generateButton
      overlayState = { type: "suggestions", result }
      setSubmitLabel("View suggestions")
      setStatus(`${result.recommendations.length} supported starting point${result.recommendations.length === 1 ? "" : "s"} ready to review.`)
      renderSuggestionOverlay()
    } catch (error) {
      console.error("[Pack Gen] Unexpected Flow failure", error)
      setStatus("Flow could not generate suggestions from this request. Review the prompt and try again.", "error")
    } finally {
      generationBusy = false
      generateButton.disabled = false
      promptPanel.classList.remove("is-generating")
      promptPanel.removeAttribute("aria-busy")
      if (!latestResult || generatedPrompt !== prompt) setSubmitLabel("Submit prompt")
    }
  }

  promptInput.addEventListener("input", () => {
    draft = setPackGenReviewState(draft, { prompt: promptInput.value })
    setSubmitLabel(promptInput.value.trim() === generatedPrompt ? "View suggestions" : "Submit prompt")
    if (!generationBusy) setStatus("")
  })
  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void generate()
    }
  })
  generateButton.addEventListener("click", () => void generate())
  suggestionClose.addEventListener("click", closeSuggestionOverlay)
  suggestionBackdrop.addEventListener("mousedown", (event) => {
    if (event.target === suggestionBackdrop) closeSuggestionOverlay()
  })
  suggestionDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      if (overlayState.type === "flow-score") {
        overlayState = { type: "suggestions", result: overlayState.result }
        renderSuggestionOverlay()
      } else {
        closeSuggestionOverlay()
      }
      return
    }
    const target = event.target
    const editable = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || (target instanceof HTMLElement && target.isContentEditable)
    if (!editable && overlayState.type === "suggestions" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault()
      setActiveSuggestion(overlayState.result, carouselState.activeIndex + (event.key === "ArrowLeft" ? -1 : 1))
      return
    }
    trapFocus(suggestionDialog, event)
  })

  projectDetailsCancel.addEventListener("click", () => {
    if (projectDetailsBusy) return
    projectDetailsBackdrop.hidden = true
    suggestionDialog.inert = false
    projectDetailsError.textContent = ""
    updateBodyScroll()
    requestAnimationFrame(() => suggestionDialog.querySelector<HTMLElement>(".pack-gen-primary:not([disabled])")?.focus())
  })
  projectDetailsBackdrop.addEventListener("mousedown", (event) => {
    if (event.target === projectDetailsBackdrop) projectDetailsCancel.click()
  })
  projectDetailsDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      projectDetailsCancel.click()
      return
    }
    trapFocus(projectDetailsDialog, event)
  })
  projectDetailsForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (project || projectDetailsBusy) return
    if (!projectNameInput.value.trim()) {
      projectDetailsError.textContent = "Add a Project name before continuing."
      projectNameInput.focus()
      return
    }
    projectDetailsBusy = true
    projectDetailsConfirm.disabled = true
    projectDetailsCancel.disabled = true
    projectDetailsError.textContent = ""
    await Promise.resolve()
    projectDetailsProjectId ??= createProjectSubmissionId()
    projectDetailsTimestamp ??= new Date().toISOString()
    const connected = connectStandalonePackGenToProject(draft, {
      projectId: projectDetailsProjectId,
      projectName: projectNameInput.value,
      brand: brandInput.value,
      jobReference: jobReferenceInput.value,
      createCutter: true,
    }, { now: () => projectDetailsTimestamp! })
    if (connected.ok === false) {
      projectDetailsBusy = false
      projectDetailsConfirm.disabled = false
      projectDetailsCancel.disabled = false
      projectDetailsError.textContent = "Complete the required pack size and type before creating the Cutter."
      return
    }
    project = connected.project
    draft = connected.draft
    window.history.replaceState({}, "", connected.destinationUrl)
    const cutterResult = createOrUpdateCutterFromPackGen(project.id, draft, project.revision)
    projectDetailsBusy = false
    projectDetailsConfirm.disabled = false
    projectDetailsCancel.disabled = false
    if (cutterResult.ok === false) {
      projectDetailsError.textContent = "Klyro could not create the Cutter from this starting specification. Your Project and specification were saved."
      return
    }
    project = cutterResult.project
    draft = cutterResult.draft
    window.location.assign(cutterResult.destinationUrl)
  })

  // Reopen a saved specification directly; generating again would replace its reviewed values.
  syncBuilder(Boolean(project?.projectDraft?.workspace))
}
