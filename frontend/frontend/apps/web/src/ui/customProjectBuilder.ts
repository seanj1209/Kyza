import {
  clampPaperStripPositionX,
  getPaperStripPlacementMetrics,
  PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW,
  PAPER_STRIP_DEFAULT_STEPPING
} from "../constraints/paperStrip"
import {
  getGeometryRegistryEntriesForPack,
  getRuleRegistryEntriesForPack
} from "../core/registries"
import {
  buildCustomPack,
  DEFAULT_SANDBOX_CONSTRAINT_PROFILE_ID,
  deleteSavedCustomProject,
  exportSavedCustomProject,
  getFeatureRegistryEntriesForPack,
  getSandboxPreset,
  getSandboxPresets,
  importCustomProjectRecord,
  listSavedCustomProjects,
  loadSavedCustomProject,
  SANDBOX_CONSTRAINT_PROFILE_REGISTRY,
  saveCustomProject
} from "../sandbox"
import type {
  CustomPackDefinition,
  SandboxBuildResult,
  SandboxFeatureId,
  SandboxPackId,
  SandboxProjectMode,
  SavedCustomProjectRecord
} from "../sandbox"
import { getPackModule, packModules } from "../packs"
import type { FlowwrapSpec } from "../types/flowwrap"

type CustomProjectBuilderOptions = {
  host: HTMLElement
  getDefaultPackId: () => SandboxPackId
  onBuild: (result: SandboxBuildResult) => void
}

type CustomProjectBuilderApi = {
  element: HTMLDivElement
  open: () => void
  close: () => void
  importCutter: () => void
}

type PaperStripOverridePatch = {
  paperColor?: string
  clearStripWindow?: Partial<
    NonNullable<NonNullable<FlowwrapSpec["paperStrip"]>["clearStripWindow"]>
  >
  stepping?: Partial<
    NonNullable<NonNullable<FlowwrapSpec["paperStrip"]>["stepping"]>
  >
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "custom-project"
}

function cloneSpec(spec: FlowwrapSpec) {
  return JSON.parse(JSON.stringify(spec)) as FlowwrapSpec
}

function supportsPlainFilmMode(packId: SandboxPackId) {
  return (
    packId === "flowwrap" ||
    packId === "doy-pouch" ||
    packId === "pillow-pack" ||
    packId === "plain-web"
  )
}

function isPaperStripPack(packId: SandboxPackId) {
  return packId === "paper-strip"
}

export function initCustomProjectBuilder(
  options: CustomProjectBuilderOptions
): CustomProjectBuilderApi {
  const overlay = document.createElement("div")
  overlay.className = "custom-project-builder"

  const card = document.createElement("div")
  card.className = "custom-project-builder-card"

  const header = document.createElement("div")
  header.className = "custom-project-builder-header"
  const title = document.createElement("h3")
  title.textContent = "Custom Project"
  const closeButton = document.createElement("button")
  closeButton.type = "button"
  closeButton.className = "custom-project-builder-close"
  closeButton.textContent = "Close"
  header.appendChild(title)
  header.appendChild(closeButton)

  const body = document.createElement("div")
  body.className = "custom-project-builder-body"

  const note = document.createElement("p")
  note.className = "custom-project-builder-note"
  note.textContent =
    "Select a pack family, geometry pipeline, constraint profile, and rule set to start a custom project."

  const nameField = document.createElement("label")
  nameField.className = "custom-project-builder-field"
  const nameLabel = document.createElement("span")
  nameLabel.textContent = "Project Name"
  const nameInput = document.createElement("input")
  nameInput.type = "text"
  nameInput.value = "Custom Project"
  nameField.appendChild(nameLabel)
  nameField.appendChild(nameInput)

  const packField = document.createElement("label")
  packField.className = "custom-project-builder-field"
  const packLabel = document.createElement("span")
  packLabel.textContent = "Base Pack"
  const packSelect = document.createElement("select")
  packModules.forEach(packModule => {
    const option = document.createElement("option")
    option.value = packModule.id
    option.textContent = packModule.name
    packSelect.appendChild(option)
  })
  const plainWebModule = getPackModule("plain-web")
  if (plainWebModule) {
    const option = document.createElement("option")
    option.value = plainWebModule.id
    option.textContent = plainWebModule.name
    packSelect.appendChild(option)
  }
  packField.appendChild(packLabel)
  packField.appendChild(packSelect)

  const geometryField = document.createElement("label")
  geometryField.className = "custom-project-builder-field"
  const geometryLabel = document.createElement("span")
  geometryLabel.textContent = "Geometry"
  const geometrySelect = document.createElement("select")
  geometryField.appendChild(geometryLabel)
  geometryField.appendChild(geometrySelect)

  const profileField = document.createElement("label")
  profileField.className = "custom-project-builder-field"
  const profileLabel = document.createElement("span")
  profileLabel.textContent = "Constraint Profile"
  const profileSelect = document.createElement("select")
  SANDBOX_CONSTRAINT_PROFILE_REGISTRY.forEach(profile => {
    const option = document.createElement("option")
    option.value = profile.id
    option.textContent = profile.label
    profileSelect.appendChild(option)
  })
  profileField.appendChild(profileLabel)
  profileField.appendChild(profileSelect)

  const modeField = document.createElement("label")
  modeField.className = "custom-project-builder-field"
  const modeLabel = document.createElement("span")
  modeLabel.textContent = "Project Mode"
  const modeSelect = document.createElement("select")
  ;([
    { value: "sealed", label: "Sealed" },
    { value: "plainFilm", label: "Plain Film" }
  ] as const).forEach(mode => {
    const option = document.createElement("option")
    option.value = mode.value
    option.textContent = mode.label
    modeSelect.appendChild(option)
  })
  modeField.appendChild(modeLabel)
  modeField.appendChild(modeSelect)

  const presetField = document.createElement("label")
  presetField.className = "custom-project-builder-field"
  const presetLabel = document.createElement("span")
  presetLabel.textContent = "Presets"
  const presetSelect = document.createElement("select")
  const presetPlaceholder = document.createElement("option")
  presetPlaceholder.value = ""
  presetPlaceholder.textContent = "Select a preset"
  presetSelect.appendChild(presetPlaceholder)
  getSandboxPresets().forEach(preset => {
    const option = document.createElement("option")
    option.value = preset.id
    option.textContent = preset.label
    presetSelect.appendChild(option)
  })
  presetField.appendChild(presetLabel)
  presetField.appendChild(presetSelect)

  const paperStripSection = document.createElement("div")
  paperStripSection.className = "custom-project-builder-field"
  const paperStripLabel = document.createElement("span")
  paperStripLabel.textContent = "Strip Laminate Options"

  const createPaperStripInput = (labelText: string, step = "1") => {
    const field = document.createElement("label")
    field.className = "custom-project-builder-field"
    const label = document.createElement("span")
    label.textContent = labelText
    const input = document.createElement("input")
    input.type = "number"
    input.step = labelText.includes("(mm)") ? "0.5" : step
    field.appendChild(label)
    field.appendChild(input)
    return { field, input }
  }

  const stripCountField = createPaperStripInput("Strip Count")
  const stripWidthField = createPaperStripInput("Strip Width (mm)")
  const stripPositionField = createPaperStripInput("Strip Position X (mm)")
  const stepCountField = createPaperStripInput("Step Count")
  const stepGapField = createPaperStripInput("Step Gap (mm)")

  paperStripSection.appendChild(paperStripLabel)
  paperStripSection.appendChild(stripCountField.field)
  paperStripSection.appendChild(stripWidthField.field)
  paperStripSection.appendChild(stripPositionField.field)
  paperStripSection.appendChild(stepCountField.field)
  paperStripSection.appendChild(stepGapField.field)
  paperStripSection.hidden = true

  const rulesSection = document.createElement("div")
  rulesSection.className = "custom-project-builder-field"
  const rulesLabel = document.createElement("span")
  rulesLabel.textContent = "Enabled Rules"
  const rulesList = document.createElement("div")
  rulesList.className = "custom-project-builder-rules"
  rulesSection.appendChild(rulesLabel)
  rulesSection.appendChild(rulesList)

  const featuresSection = document.createElement("div")
  featuresSection.className = "custom-project-builder-field"
  const featuresLabel = document.createElement("span")
  featuresLabel.textContent = "Features"
  const featuresList = document.createElement("div")
  featuresList.className = "custom-project-builder-rules"
  featuresSection.appendChild(featuresLabel)
  featuresSection.appendChild(featuresList)

  const savedSection = document.createElement("div")
  savedSection.className = "custom-project-builder-field"
  const savedLabel = document.createElement("span")
  savedLabel.textContent = "Saved Custom Projects"
  const savedList = document.createElement("div")
  savedList.className = "custom-project-builder-rules"
  savedSection.appendChild(savedLabel)
  savedSection.appendChild(savedList)

  const errorBox = document.createElement("div")
  errorBox.className = "custom-project-builder-error"

  const previewStatus = document.createElement("div")
  previewStatus.className = "custom-project-builder-note"

  const importInput = document.createElement("input")
  importInput.type = "file"
  importInput.accept = "application/json,.json"
  importInput.hidden = true

  const actions = document.createElement("div")
  actions.className = "custom-project-builder-actions"
  const importButton = document.createElement("button")
  importButton.type = "button"
  importButton.className = "custom-project-builder-cancel"
  importButton.textContent = "Import JSON"
  const saveButton = document.createElement("button")
  saveButton.type = "button"
  saveButton.className = "custom-project-builder-cancel"
  saveButton.textContent = "Save Custom Project"
  const buildButton = document.createElement("button")
  buildButton.type = "button"
  buildButton.className = "custom-project-builder-submit"
  buildButton.textContent = "Start Custom Project"
  const cancelButton = document.createElement("button")
  cancelButton.type = "button"
  cancelButton.className = "custom-project-builder-cancel"
  cancelButton.textContent = "Cancel"
  actions.appendChild(importButton)
  actions.appendChild(saveButton)
  actions.appendChild(cancelButton)
  actions.appendChild(buildButton)

  body.appendChild(note)
  body.appendChild(nameField)
  body.appendChild(packField)
  body.appendChild(geometryField)
  body.appendChild(profileField)
  body.appendChild(modeField)
  body.appendChild(presetField)
  body.appendChild(paperStripSection)
  body.appendChild(featuresSection)
  body.appendChild(rulesSection)
  body.appendChild(savedSection)
  body.appendChild(errorBox)
  body.appendChild(previewStatus)
  body.appendChild(actions)

  card.appendChild(header)
  card.appendChild(body)
  overlay.appendChild(card)
  overlay.appendChild(importInput)
  options.host.appendChild(overlay)

  let draftBaseSpec: FlowwrapSpec | undefined
  let draftSpecOverrides: CustomPackDefinition["specOverrides"]
  let draftDefinitionId: string | undefined

  const getDefaultBaseSpec = (packId: SandboxPackId) => {
    const packModule = getPackModule(packId)
    return packModule ? cloneSpec(packModule.getDefaults()) : undefined
  }

  const close = () => {
    overlay.classList.remove("is-open")
    errorBox.textContent = ""
    previewStatus.textContent = ""
  }

  const populateGeometry = (packId: SandboxPackId) => {
    const entries = getGeometryRegistryEntriesForPack(packId)
    geometrySelect.innerHTML = ""
    entries.forEach(entry => {
      const option = document.createElement("option")
      option.value = entry.id
      option.textContent = entry.label
      geometrySelect.appendChild(option)
    })
  }

  const populateRules = (packId: SandboxPackId) => {
    const entries = getRuleRegistryEntriesForPack(packId)
    rulesList.innerHTML = ""
    entries.forEach(entry => {
      const label = document.createElement("label")
      label.className = "custom-project-builder-rule"
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = entry.id
      checkbox.checked = true
      const text = document.createElement("span")
      text.textContent = entry.label
      label.appendChild(checkbox)
      label.appendChild(text)
      rulesList.appendChild(label)
    })
  }

  const populateFeatures = (packId: SandboxPackId) => {
    const entries = getFeatureRegistryEntriesForPack(packId)
    featuresList.innerHTML = ""
    entries.forEach(entry => {
      const label = document.createElement("label")
      label.className = "custom-project-builder-rule"
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = entry.id
      checkbox.checked = false
      const text = document.createElement("span")
      text.textContent = entry.label
      label.appendChild(checkbox)
      label.appendChild(text)
      featuresList.appendChild(label)
    })
  }

  const setCheckedValues = (
    container: HTMLElement,
    values: readonly string[]
  ) => {
    const selected = new Set(values)
    container
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach(input => {
        input.checked = selected.has(input.value)
      })
  }

  const renderSavedProjects = () => {
    const savedProjects = listSavedCustomProjects()
    savedList.innerHTML = ""

    if (savedProjects.length === 0) {
      const empty = document.createElement("div")
      empty.className = "custom-project-builder-note"
      empty.textContent = "No saved custom projects yet."
      savedList.appendChild(empty)
      return
    }

    savedProjects.forEach(project => {
      const row = document.createElement("div")
      row.className = "custom-project-builder-actions custom-project-builder-saved-row"

      const label = document.createElement("span")
      label.textContent = project.name

      const loadButton = document.createElement("button")
      loadButton.type = "button"
      loadButton.className = "custom-project-builder-submit"
      loadButton.textContent = "Load"
      loadButton.addEventListener("click", () => {
        try {
          const saved = loadSavedCustomProject(project.id)
          if (!saved) {
            renderSavedProjects()
            return
          }
          applySavedProject(saved)
          errorBox.textContent = ""
        } catch (error) {
          errorBox.textContent =
            error instanceof Error
              ? error.message
              : "Unable to load custom project."
        }
      })

      const deleteButton = document.createElement("button")
      deleteButton.type = "button"
      deleteButton.className = "custom-project-builder-cancel"
      deleteButton.textContent = "Delete"
      deleteButton.addEventListener("click", () => {
        deleteSavedCustomProject(project.id)
        renderSavedProjects()
      })

      const exportButton = document.createElement("button")
      exportButton.type = "button"
      exportButton.className = "custom-project-builder-cancel"
      exportButton.textContent = "Export"
      exportButton.addEventListener("click", () => {
        try {
          const json = exportSavedCustomProject(project.id)
          const blob = new Blob([json], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${slugify(project.name)}.json`
          link.click()
          URL.revokeObjectURL(url)
          errorBox.textContent = ""
        } catch (error) {
          errorBox.textContent =
            error instanceof Error
              ? error.message
              : "Unable to export custom project."
        }
      })

      row.appendChild(label)
      row.appendChild(loadButton)
      row.appendChild(exportButton)
      row.appendChild(deleteButton)
      savedList.appendChild(row)
    })
  }

  const syncPackOptions = (packId: SandboxPackId) => {
    packSelect.value = packId
    populateGeometry(packId)
    populateFeatures(packId)
    populateRules(packId)
    const plainFilmOption = Array.from(modeSelect.options).find(
      option => option.value === "plainFilm"
    )
    if (plainFilmOption) {
      plainFilmOption.disabled = !supportsPlainFilmMode(packId)
    }
    if (!supportsPlainFilmMode(packId) && modeSelect.value === "plainFilm") {
      modeSelect.value = "sealed"
    }
    const packModule = getPackModule(packId)
    if (packModule) {
      nameInput.value = packModule.name
    }
  }

  const getPaperStripWorkingSpec = (): FlowwrapSpec | undefined => {
    const baseSpec =
      draftBaseSpec ?? getDefaultBaseSpec(packSelect.value as SandboxPackId)
    if (!baseSpec) {
      return undefined
    }

    const paperStripOverrides = draftSpecOverrides?.paperStrip
    return {
      ...cloneSpec(baseSpec),
      ...(draftSpecOverrides?.width !== undefined
        ? { width: draftSpecOverrides.width }
        : {}),
      ...(draftSpecOverrides?.height !== undefined
        ? { height: draftSpecOverrides.height }
        : {}),
      ...(draftSpecOverrides?.seal !== undefined
        ? { seal: draftSpecOverrides.seal }
        : {}),
      ...(draftSpecOverrides?.sealClearance !== undefined
        ? { sealClearance: draftSpecOverrides.sealClearance }
        : {}),
      ...(draftSpecOverrides?.seals
        ? {
            seals: {
              ...baseSpec.seals,
              ...draftSpecOverrides.seals
            }
          }
        : {}),
      paperStrip: {
        ...baseSpec.paperStrip,
        ...paperStripOverrides,
        clearStripWindow: ({
          ...baseSpec.paperStrip?.clearStripWindow,
          ...paperStripOverrides?.clearStripWindow
        } as NonNullable<NonNullable<FlowwrapSpec["paperStrip"]>["clearStripWindow"]>),
        stepping: {
          ...baseSpec.paperStrip?.stepping,
          stepCount: paperStripOverrides?.stepping?.stepCount??baseSpec.paperStrip?.stepping?.stepCount??1,
          gap: paperStripOverrides?.stepping?.gap??baseSpec.paperStrip?.stepping?.gap??0,
          syncMirror: paperStripOverrides?.stepping?.syncMirror??baseSpec.paperStrip?.stepping?.syncMirror??true
        }
      }
    }
  }

  const setPaperStripOverrides = (
    patch: PaperStripOverridePatch
  ) => {
    const currentPaperStrip = draftSpecOverrides?.paperStrip
    draftSpecOverrides = {
      ...(draftSpecOverrides ?? {}),
      paperStrip: {
        ...(currentPaperStrip ?? {}),
        ...patch,
        ...(patch.clearStripWindow || currentPaperStrip?.clearStripWindow
          ? {
              clearStripWindow: {
                ...(currentPaperStrip?.clearStripWindow ?? {}),
                ...(patch.clearStripWindow ?? {})
              }
            }
          : {}),
        ...(patch.stepping || currentPaperStrip?.stepping
          ? {
              stepping: {
                ...(currentPaperStrip?.stepping ?? {}),
                ...(patch.stepping ?? {})
              }
            }
          : {})
      }
    }
  }

  const syncPaperStripControls = () => {
    const packId = packSelect.value as SandboxPackId
    paperStripSection.hidden = !isPaperStripPack(packId)
    modeSelect.disabled = isPaperStripPack(packId)
    if (!isPaperStripPack(packId)) {
      return
    }

    modeSelect.value = "sealed"
    const workingSpec = getPaperStripWorkingSpec()
    if (!workingSpec) {
      return
    }
    const clearStripWindow =
      workingSpec.paperStrip?.clearStripWindow ??
      PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW
    const stepping =
      workingSpec.paperStrip?.stepping ?? PAPER_STRIP_DEFAULT_STEPPING
    const clampedPosition = clampPaperStripPositionX(
      workingSpec,
      clearStripWindow.positionX
    )
    const metrics = getPaperStripPlacementMetrics(workingSpec)

    stripCountField.input.value = String(clearStripWindow.stripCount)
    stripWidthField.input.value = String(clearStripWindow.stripWidth)
    stripPositionField.input.min = String(metrics.minX)
    stripPositionField.input.max = String(metrics.maxX)
    stripPositionField.input.value = String(clampedPosition)
    stepCountField.input.value = String(stepping.stepCount)
    stepGapField.input.value = String(stepping.gap)
  }

  const applyPreset = (presetId: string) => {
    const preset = getSandboxPreset(presetId)
    if (!preset) {
      return
    }
    syncPackOptions(preset.packId)
    draftDefinitionId = undefined
    draftBaseSpec = getDefaultBaseSpec(preset.packId)
    draftSpecOverrides = preset.definition.specOverrides
    nameInput.value = preset.label
    if (
      Array.from(geometrySelect.options).some(
        option => option.value === preset.definition.geometryId
      )
    ) {
      geometrySelect.value = preset.definition.geometryId
    }
    profileSelect.value = preset.definition.constraintProfileId
    modeSelect.value = preset.definition.mode
    setCheckedValues(rulesList, preset.definition.enabledRuleIds)
    setCheckedValues(featuresList, preset.definition.enabledFeatures)
    syncPaperStripControls()
    rebuildDraft()
  }

  const applySavedProject = (project: SavedCustomProjectRecord) => {
    const definition = project.definition
    syncPackOptions(definition.basePackId)
    draftDefinitionId = project.id
    nameInput.value = project.name
    if (
      Array.from(geometrySelect.options).some(
        option => option.value === definition.geometryId
      )
    ) {
      geometrySelect.value = definition.geometryId
    }
    profileSelect.value = definition.constraintProfileId
    modeSelect.value = definition.mode
    setCheckedValues(rulesList, definition.enabledRuleIds)
    setCheckedValues(featuresList, definition.enabledFeatures)
    draftBaseSpec = cloneSpec(project.baseSpec)
    draftSpecOverrides = definition.specOverrides
    syncPaperStripControls()
    rebuildDraft()
  }

  const readDefinitionFromForm = (): CustomPackDefinition => {
    const enabledRuleIds = Array.from(
      rulesList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
    ).map(input => input.value)
    const enabledFeatures = Array.from(
      featuresList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
    ).map(input => input.value as SandboxFeatureId)
    const label = nameInput.value.trim() || "Custom Project"
    draftDefinitionId ??= `${slugify(label)}-${Date.now()}`
    return {
      id: draftDefinitionId,
      label,
      basePackId: packSelect.value as SandboxPackId,
      geometryId: geometrySelect.value as CustomPackDefinition["geometryId"],
      mode: (
        isPaperStripPack(packSelect.value as SandboxPackId)
          ? "sealed"
          : modeSelect.value
      ) as SandboxProjectMode,
      constraintProfileId: profileSelect.value,
      enabledRuleIds,
      enabledFeatures,
      ...(draftSpecOverrides ? { specOverrides: draftSpecOverrides } : {})
    }
  }

  const rebuildDraft = () => {
    try {
      const result = buildCustomPack({
        definition: readDefinitionFromForm(),
        ...(draftBaseSpec ? { baseSpec: cloneSpec(draftBaseSpec) } : {})
      })
      errorBox.textContent = ""
      previewStatus.textContent = `Preview ready: ${result.definition.mode === "plainFilm" ? "Plain Film" : "Sealed"}`
    } catch (error) {
      previewStatus.textContent = ""
      errorBox.textContent =
        error instanceof Error ? error.message : "Unable to build custom project."
    }
  }

  const open = () => {
    const defaultPackId = options.getDefaultPackId()
    syncPackOptions(defaultPackId)
    draftBaseSpec = getDefaultBaseSpec(defaultPackId)
    draftSpecOverrides = undefined
    draftDefinitionId = undefined
    modeSelect.value = "sealed"
    syncPaperStripControls()
    profileSelect.value = DEFAULT_SANDBOX_CONSTRAINT_PROFILE_ID
    presetSelect.value = ""
    errorBox.textContent = ""
    previewStatus.textContent = ""
    renderSavedProjects()
    overlay.classList.add("is-open")
  }

  closeButton.addEventListener("click", close)
  cancelButton.addEventListener("click", close)
  overlay.addEventListener("pointerdown", event => {
    if (event.target === overlay) {
      close()
    }
  })

  packSelect.addEventListener("change", () => {
    const packId = packSelect.value as SandboxPackId
    syncPackOptions(packId)
    draftBaseSpec = getDefaultBaseSpec(packId)
    draftSpecOverrides = undefined
    draftDefinitionId = undefined
    presetSelect.value = ""
    syncPaperStripControls()
    previewStatus.textContent = ""
    errorBox.textContent = ""
  })

  presetSelect.addEventListener("change", () => {
    if (!presetSelect.value) {
      return
    }
    applyPreset(presetSelect.value)
  })

  modeSelect.addEventListener("change", rebuildDraft)
  profileSelect.addEventListener("change", rebuildDraft)
  rulesList.addEventListener("change", rebuildDraft)
  featuresList.addEventListener("change", rebuildDraft)

  const updatePaperStripDraft = (
    patch: PaperStripOverridePatch,
    options: { clampPosition?: boolean } = {}
  ) => {
    setPaperStripOverrides(patch)
    if (options.clampPosition) {
      const workingSpec = getPaperStripWorkingSpec()
      if (workingSpec) {
        const currentPosition =
          workingSpec.paperStrip?.clearStripWindow?.positionX ??
          PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.positionX
        setPaperStripOverrides({
          clearStripWindow: {
            positionX: clampPaperStripPositionX(workingSpec, currentPosition)
          }
        })
      }
    }
    syncPaperStripControls()
    rebuildDraft()
  }

  stripCountField.input.addEventListener("input", () => {
    updatePaperStripDraft(
      {
        clearStripWindow: {
          stripCount: Math.round(
            Number(stripCountField.input.value || PAPER_STRIP_DEFAULT_CLEAR_STRIP_WINDOW.stripCount)
          )
        }
      },
      { clampPosition: true }
    )
  })

  stripWidthField.input.addEventListener("change", () => {
    const rawValue = stripWidthField.input.value.trim()
    const stripWidth = Number(rawValue)
    if (!rawValue || !Number.isFinite(stripWidth)) {
      syncPaperStripControls()
      return
    }
    updatePaperStripDraft(
      {
        clearStripWindow: {
          stripWidth
        }
      },
      { clampPosition: true }
    )
  })

  stripPositionField.input.addEventListener("change", () => {
    const rawValue = stripPositionField.input.value.trim()
    const positionX = Number(rawValue)
    if (!rawValue || !Number.isFinite(positionX)) {
      syncPaperStripControls()
      return
    }
    const workingSpec = getPaperStripWorkingSpec()
    if (!workingSpec) {
      return
    }
    updatePaperStripDraft({
      clearStripWindow: {
        positionX: clampPaperStripPositionX(
          {
            ...workingSpec,
            paperStrip: {
              ...workingSpec.paperStrip,
              clearStripWindow: {
                ...workingSpec.paperStrip?.clearStripWindow,
                positionX
              }
            }
          },
          positionX
        )
      }
    })
  })

  stepCountField.input.addEventListener("input", () => {
    updatePaperStripDraft({
      stepping: {
        stepCount: Math.round(
          Number(stepCountField.input.value || PAPER_STRIP_DEFAULT_STEPPING.stepCount)
        )
      }
    })
  })

  stepGapField.input.addEventListener("change", () => {
    const rawValue = stepGapField.input.value.trim()
    const gap = Number(rawValue)
    if (!rawValue || !Number.isFinite(gap)) {
      syncPaperStripControls()
      return
    }
    updatePaperStripDraft({
      stepping: {
        gap
      }
    })
  })

  ;[stripWidthField.input, stripPositionField.input, stepGapField.input].forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        input.blur()
      }
    })
  })

  importButton.addEventListener("click", () => {
    importInput.value = ""
    importInput.click()
  })

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0]
    if (!file) {
      return
    }

    try {
      const text = await file.text()
      const saved = importCustomProjectRecord(text)
      renderSavedProjects()
      applySavedProject(saved)
      previewStatus.textContent = `Imported custom project: ${saved.name}`
      errorBox.textContent = ""
    } catch (error) {
      errorBox.textContent =
        error instanceof Error
          ? error.message
          : "Unable to import custom project."
    } finally {
      importInput.value = ""
    }
  })

  saveButton.addEventListener("click", () => {
    try {
      const definition = readDefinitionFromForm()
      const baseSpec =
        draftBaseSpec ?? getDefaultBaseSpec(definition.basePackId)
      if (!baseSpec) {
        throw new Error("Unable to resolve base spec for this custom project.")
      }
      buildCustomPack({
        definition,
        baseSpec: cloneSpec(baseSpec)
      })
      const requestedName = window.prompt(
        "Save custom project as:",
        nameInput.value.trim() || definition.label
      )
      if (!requestedName) {
        return
      }
      saveCustomProject({
        id: definition.id,
        name: requestedName.trim() || definition.label,
        definition: {
          ...definition,
          label: requestedName.trim() || definition.label
        },
        baseSpec: cloneSpec(baseSpec)
      })
      nameInput.value = requestedName.trim() || definition.label
      renderSavedProjects()
      previewStatus.textContent = `Saved custom project: ${nameInput.value}`
      errorBox.textContent = ""
    } catch (error) {
      errorBox.textContent =
        error instanceof Error ? error.message : "Unable to save custom project."
    }
  })

  buildButton.addEventListener("click", () => {
    try {
      const definition = readDefinitionFromForm()
      const result = buildCustomPack({
        definition,
        ...(draftBaseSpec ? { baseSpec: cloneSpec(draftBaseSpec) } : {})
      })
      close()
      options.onBuild(result)
    } catch (error) {
      errorBox.textContent =
        error instanceof Error ? error.message : "Unable to build custom project."
    }
  })

  return {
    element: overlay,
    open,
    close,
    importCutter: () => { open(); importButton.click() }
  }
}
