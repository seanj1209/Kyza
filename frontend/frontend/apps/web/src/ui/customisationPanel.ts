import { requestBetaReviewSnapshot } from "./betaReview"
import { resolveBaseCustomisation } from "../renderers/baseLayerCustomisation"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { PerfStyle } from "../types/perfs"
import { formatMetricValue, parseMetricDraft } from "../core/formatMetric"
import {
  saveCutNFlowProject,
  type CutNFlowProjectV1,
  type ParseResult
} from "../../../../packages/cutter-engine/project"
import {
  validateForExport
} from "../../../../packages/cutter-engine/validation"
import {
  getExportResultPresentation,
  listExportReleaseActions,
  getExportReleaseAction,
  type ExportReleaseAction
} from "../../../../packages/cutter-engine/export/exportReleasePresentation"
import {
  resolveExportReadiness,
  type ExportReadiness
} from "../../../../packages/cutter-engine/export/exportReadiness"
import {
  createExportPackageDraft,
  type ExportPackage,
} from "../../../../packages/cutter-engine/export/exportPackage"
import {
  deliverProjectExportLocally,
  executeProjectExport,
  type SaveFilePickerLike
} from "../../../../packages/cutter-engine/export/projectExportService"
import { requestPreExportReview } from "./preExportReview"
import { createVerticalTabs } from "./verticalTabs"
import { colourPalette, createAppearanceEditor, decorateCustomiseTarget, rememberColour } from "./customiseAppearanceControls"
import { createExportSelection, renderCompactPackage, renderCompactReadiness } from "./exportSelection"

const ICON_COLOUR_STATIC = "/Icons/UI Icons/Colour Circle_STATIC.png"
const ICON_COLOUR_HOVER = "/Icons/UI Icons/Colour Circle_HOVER.png"
const ICON_UI_PLUS_STATIC = "/Icons/UI Icons/Add_STATIC.png"
const ICON_UI_PLUS_CLICKED = "/Icons/UI Icons/Add_Clicked.png"
const ICON_UI_BIN_STATIC = "/Icons/UI Icons/Bin_STATIC.png"
const ICON_UI_BIN_HOVER = "/Icons/UI Icons/Bin_Hover.png"
const TAB_ICONS = {
  customise: {
    static: "/Icons/Customise_STATIC.png",
    hover: "/Icons/Customise_HOVER.png"
  },
  preferences: {
    static: "/Icons/Preferences_STATIC.png",
    hover: "/Icons/Preferences_HOVER.png"
  },
  file: {
    static: "/Icons/File_STATIC.png",
    hover: "/Icons/File_HOVER.png"
  }
}

type CustomiseMenuKey =
  | "base"
  | "elements"
  | "measures"
  | "legend"
  | "perforation"
  | "doy-gusset"
  | "k-seal"
  | "barcodes"
  | "die-cut-outs"
  | "openings"
  | "windows"
  | "other"

type Config = {
  host: HTMLElement
  onChange: (next: FlowwrapSpec) => void
  getCurrentSvg?: () => SVGSVGElement | null
  getCurrentProjectName?: () => string
  getCurrentProject?: () => CutNFlowProjectV1 | null
  onSaveProject?: () => Promise<void> | void
  onSaveAsProject?: () => Promise<void> | void
  onProjectEvidenceUpdated?: (
    project: CutNFlowProjectV1,
    expectedRevision?: number
  ) => ParseResult<CutNFlowProjectV1> | Promise<ParseResult<CutNFlowProjectV1>>
  onViewValidationElement?: (affectedElementId: string) => void
  onReturnToCutter?: () => void
  onShowMeasures?: () => void
  onShowPerforations?: () => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const toPercent = (value: number) => Math.round(clamp(value, 0, 1) * 100)
const toOpacity = (value: number) => clamp(value / 100, 0, 1)
const DEFAULT_PERF_COLOR = "#B80F0A"
const DEFAULT_PERF_STYLE: PerfStyle = "circles"
const DEFAULT_PERF_DIAMETER = 1.5
const DEFAULT_PERF_FILL_OPACITY = 1
const DEFAULT_PERF_STROKE_COLOR = DEFAULT_PERF_COLOR
const DEFAULT_PERF_STROKE_WIDTH = 0.25

const applyIconButtonStates = (
  button: HTMLButtonElement,
  icon: HTMLImageElement,
  icons: { static: string; hover?: string; active?: string; activeDurationMs?: number }
) => {
  let activeUntil = 0
  let activeTimer: number | null = null

  const sync = () => {
    const now = performance.now()
    const isActive = now < activeUntil
    const isHover = button.matches(":hover") || button.matches(":focus-visible")
    icon.src = isActive
      ? (icons.active ?? icons.hover ?? icons.static)
      : isHover
        ? (icons.hover ?? icons.static)
        : icons.static
  }

  const clearTimer = () => {
    if (activeTimer !== null) {
      window.clearTimeout(activeTimer)
      activeTimer = null
    }
  }

  const activate = () => {
    clearTimer()
    const duration = icons.activeDurationMs ?? 0
    activeUntil = performance.now() + duration
    if (duration > 0) {
      activeTimer = window.setTimeout(() => {
        activeUntil = 0
        activeTimer = null
        sync()
      }, duration)
    }
    sync()
  }

  icon.src = icons.static
  button.addEventListener("mouseenter", sync)
  button.addEventListener("mouseleave", sync)
  button.addEventListener("focus", sync)
  button.addEventListener("blur", sync)
  return { activate, sync }
}

export function initCustomisationPanel({
  host,
  onChange,
  getCurrentSvg,
  getCurrentProject,
  onSaveProject,
  onSaveAsProject,
  onProjectEvidenceUpdated,
  onViewValidationElement,
  onReturnToCutter,
  onShowMeasures,
  onShowPerforations
}: Config) {
  let currentSpec: FlowwrapSpec | null = null
  let saveHandle: FileSystemFileHandle | null = null

  const panel = document.createElement("div")
  panel.id = "customisation-panel"
  panel.className = "right-rail-panel customisation-panel"
  const panelHeader = document.createElement("header")
  panelHeader.className = "customisation-panel-header"
  const panelTitle = document.createElement("strong")
  panelTitle.textContent = "Customise"
  const panelClose = document.createElement("button")
  panelClose.type = "button"
  panelClose.className = "inspector-panel-close customisation-panel-close"
  panelClose.setAttribute("aria-label", "Close panel")
  panelClose.textContent = "×"
  panelClose.addEventListener("click", () => {
    panel.classList.remove("is-open", "is-file-mode")
    panel.dispatchEvent(new CustomEvent("custom-panel-close"))
  })
  panelHeader.append(panelTitle, panelClose)
  panel.appendChild(panelHeader)

  const tabShell = document.createElement("div")
  tabShell.className = "right-rail-tab-shell"
  const tabBar = document.createElement("div")
  tabBar.className = "right-rail-tab-bar"
  const tabBody = document.createElement("div")
  tabBody.className = "right-rail-tab-body"
  const menuOrder: CustomiseMenuKey[] = [
    "base", "elements", "perforation", "measures", "legend"
  ]
  let activeMenu: CustomiseMenuKey = "base"
  const makeTabButton = (
    label: string,
    icons: { static: string; hover: string },
    active = false
  ) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = active ? "right-rail-tab is-active" : "right-rail-tab"
    button.setAttribute("aria-label", label)
    const icon = document.createElement("img")
    icon.className = "right-rail-tab-icon"
    icon.src = icons.static
    icon.alt = ""
    button.appendChild(icon)
    button.addEventListener("mouseenter", () => {
      icon.src = icons.hover
    })
    button.addEventListener("mouseleave", () => {
      icon.src = icons.static
    })
    button.addEventListener("focus", () => {
      icon.src = icons.hover
    })
    button.addEventListener("blur", () => {
      icon.src = icons.static
    })
    return button
  }
  const customTab = makeTabButton("Customise", TAB_ICONS.customise, true)
  const preferencesTab = makeTabButton("Preferences", TAB_ICONS.preferences)
  const fileTab = makeTabButton("File", TAB_ICONS.file)
  tabBar.appendChild(customTab)
  tabBar.appendChild(preferencesTab)
  tabBar.appendChild(fileTab)
  const customisePanel = document.createElement("div")
  customisePanel.className = "right-rail-tab-panel is-active"
  const customiseTabs = createVerticalTabs("customise", "Customise categories")
  const categoryPanels = new Map<CustomiseMenuKey, HTMLElement>()
  const addMenuButton = (key: CustomiseMenuKey, label: string, active = false) => {
    const category = document.createElement("div")
    category.className = "customise-category"
    categoryPanels.set(key, category)
    customiseTabs.add(key, label, category, () => {
      activeMenu = key
      activeLayerId = null
      applyCustomiseSectionMode()
    })
  }
  addMenuButton("base", "Base", true)
  addMenuButton("elements", "Elements")
  addMenuButton("perforation", "Perforations")
  addMenuButton("measures", "Measures")
  addMenuButton("legend", "Legend")
  customisePanel.appendChild(customiseTabs.root)
  const filePanel = document.createElement("div")
  filePanel.className = "right-rail-tab-panel"
  const preferencesPanel = document.createElement("div")
  preferencesPanel.className = "right-rail-tab-panel"
  const filePlaceholder = document.createElement("div")
  filePlaceholder.className = "file-menu-wrap"
  const fileTrigger = document.createElement("button")
  fileTrigger.type = "button"
  fileTrigger.id = "save-export"
  fileTrigger.className = "file-menu-trigger"
  fileTrigger.textContent = "Refresh checks"
  const exportReadinessStatus = document.createElement("div")
  exportReadinessStatus.className = "file-export-readiness"
  exportReadinessStatus.setAttribute("role", "status")
  exportReadinessStatus.setAttribute("aria-live", "polite")
  exportReadinessStatus.dataset.exportReadiness = "not_checked"
  exportReadinessStatus.textContent = "Run validation before export."
  const exportPackageSummary = document.createElement("section")
  exportPackageSummary.className = "file-export-package"
  exportPackageSummary.hidden = true
  const filePopout = document.createElement("div")
  filePopout.className = "file-menu-popout"
  const saveButton = document.createElement("button")
  saveButton.type = "button"
  saveButton.className = "file-menu-item"
  saveButton.textContent = "Save"
  const saveAsButton = document.createElement("button")
  saveAsButton.type = "button"
  saveAsButton.className = "file-menu-item"
  saveAsButton.textContent = "Save As"
  filePopout.appendChild(saveButton)
  filePopout.appendChild(saveAsButton)
  const exportActions = [...listExportReleaseActions(), ...["pdf-vector", "dxf", "ai"].map(format => getExportReleaseAction(format as ExportReleaseAction["format"])).filter((action): action is ExportReleaseAction => !!action)]
  filePlaceholder.appendChild(fileTrigger)
  filePlaceholder.appendChild(filePopout)
  filePlaceholder.appendChild(exportReadinessStatus)
  filePlaceholder.appendChild(exportPackageSummary)
  const exportSelection = createExportSelection(filePlaceholder, exportActions, (action, trigger, override) =>
    runSharedExport(action, trigger, {
      useExistingHandle: false,
      rememberHandle: false,
      overrideCriticalErrors: override.overrideCriticalErrors
    }))
  const betaReviewButton = document.createElement("button")
  betaReviewButton.type = "button"
  betaReviewButton.className = "beta-review-entry"
  betaReviewButton.textContent = "Beta review / override"
  betaReviewButton.title = "Capture the design and findings as unapproved beta review material, including critical findings"
  betaReviewButton.addEventListener("click", () => {
    if (betaReviewButton.getAttribute("aria-busy") === "true") return
    void requestBetaReviewSnapshot({
      getLatestProject: () => getCurrentProject?.() ?? null,
      persistProject: persistProjectEvidence,
      getSvg: () => getCurrentSvg?.() ?? null,
      trigger: betaReviewButton
    }).catch(error => window.alert(error instanceof Error ? error.message : "Beta review could not be opened."))
  })
  filePlaceholder.appendChild(betaReviewButton)
  const preferencesPlaceholder = document.createElement("div")
  preferencesPlaceholder.className = "customisation-empty"
  preferencesPlaceholder.append("Account preferences, including arrow-key nudge, are managed in ")
  const accountPreferencesLink = document.createElement("a")
  accountPreferencesLink.href = "/account"
  accountPreferencesLink.textContent = "Account > Preferences"
  preferencesPlaceholder.appendChild(accountPreferencesLink)
  filePanel.appendChild(filePlaceholder)
  preferencesPanel.appendChild(preferencesPlaceholder)
  tabBody.appendChild(customisePanel)
  tabBody.appendChild(preferencesPanel)
  tabBody.appendChild(filePanel)
  tabShell.appendChild(tabBar)
  tabShell.appendChild(tabBody)
  panel.appendChild(tabShell)
  const tabs = [
    { button: customTab, panel: customisePanel },
    { button: preferencesTab, panel: preferencesPanel },
    { button: fileTab, panel: filePanel }
  ]
  const setActiveTab = (index: number) => {
    panelTitle.textContent = index === 2 ? "Save / Export" : index === 1 ? "Preferences" : "Customise"
    tabs.forEach((item, tabIndex) => {
      const active = tabIndex === index
      item.button.classList.toggle("is-active", active)
      item.panel.classList.toggle("is-active", active)
    })
  }
  tabs.forEach((item, index) => {
    item.button.addEventListener("click", () => setActiveTab(index))
  })

  const layerSectionMap = new Map<string, HTMLElement>()
  const sectionMenuMap = new Map<HTMLElement, CustomiseMenuKey>()
  let activeLayerId: string | null = null

  const EXPORT_ARTBOARD_MARGIN_MM = 80

  const renderExportReadiness = (readiness: ExportReadiness) => {
    renderCompactReadiness(exportReadinessStatus, readiness)
    exportSelection.setReadiness(readiness)
  }

  let currentExportPackage: ExportPackage | null = null
  const renderExportPackage = (packageDraft: ExportPackage | null) => {
    currentExportPackage = packageDraft
    renderCompactPackage(exportPackageSummary, packageDraft)
  }

  const runExportReadinessCheck = () => {
    const project = getCurrentProject?.() ?? null
    const validation = project ? validateForExport(project) : undefined
    const readiness = resolveExportReadiness({
      project,
      ...(validation ? { validation } : {}),
      supported: true
    })
    renderExportReadiness(readiness)
    const packageAllowed =
      readiness.state === "ready" || readiness.state === "ready_with_advisories"
    renderExportPackage(
      project && validation && packageAllowed
        ? createExportPackageDraft({
            project,
            validation,
            source: "save_export",
            supported: true
          })
        : null
    )
    return readiness
  }

  const persistProjectEvidence = async (
    project: CutNFlowProjectV1,
    expectedRevision?: number
  ) =>
    onProjectEvidenceUpdated
      ? onProjectEvidenceUpdated(project, expectedRevision)
      : saveCutNFlowProject(
          project,
          undefined,
          expectedRevision === undefined ? {} : { expectedRevision }
        )

  const requestExportApproval = (
    triggerElement: HTMLElement,
    overrideCriticalErrors = false
  ) =>
    requestPreExportReview({
      getLatestProject: () => getCurrentProject?.() ?? null,
      persistProject: persistProjectEvidence,
      triggerElement,
      fallbackFocusElement: fileTrigger,
      overrideCriticalErrors,
      onViewElement: affectedElementId => {
        setActiveTab(0)
        onViewValidationElement?.(affectedElementId)
      },
      onReturnToCutter: () => {
        setActiveTab(0)
        onReturnToCutter?.()
      }
    })

  const runSharedExport = async (
    action: ExportReleaseAction,
    triggerElement: HTMLElement,
    options: {
      useExistingHandle: boolean
      rememberHandle: boolean
      overrideCriticalErrors?: boolean
    }
  ) => {
    const approval = await requestExportApproval(
      triggerElement,
      options.overrideCriticalErrors ?? false
    )
    if (!approval.ok) return false
    const source = action.sourceRequired ? getCurrentSvg?.() ?? undefined : undefined
    const picker = "showSaveFilePicker" in window
      ? (window as unknown as { showSaveFilePicker: SaveFilePickerLike }).showSaveFilePicker.bind(window)
      : undefined
    const result = await executeProjectExport({
      getLatestProject: () => getCurrentProject?.() ?? null,
      persistProject: persistProjectEvidence,
      validationRun: approval.validationRun,
      ...(approval.acknowledgement ? { acknowledgement: approval.acknowledgement } : {}),
      request: {
        format: action.format,
        tierId: action.tierId,
        ...(source ? { source } : {}),
        options: {
          includeLayers: true,
          preserveVector: action.format !== "raster-preview-pdf",
          includeValidationReport: true,
          marginMm: EXPORT_ARTBOARD_MARGIN_MM
        }
      },
      exportId: approval.exportId,
      exportedAt: approval.exportedAt,
      deliver: artifact => deliverProjectExportLocally(artifact, {
        ...(options.useExistingHandle && saveHandle ? { existingHandle: saveHandle } : {}),
        ...(picker ? { showSaveFilePicker: picker } : {})
      })
    })
    if (options.rememberHandle && result.delivery?.fileHandle) {
      saveHandle = result.delivery.fileHandle
    }
    const presentation = getExportResultPresentation(result, action)
    if (presentation.state !== "cancelled") window.alert(presentation.message)
    if (result.ok && action.format === "json") runExportReadinessCheck()
    return result.ok
  }

  const pdfProofAction = exportActions.find(action => action.format === "raster-preview-pdf")!
  const saveAsPreviewPdf = (triggerElement: HTMLElement) =>
    runSharedExport(pdfProofAction, triggerElement, { useExistingHandle: false, rememberHandle: true })

  const savePreviewPdf = (triggerElement: HTMLElement) =>
    runSharedExport(pdfProofAction, triggerElement, { useExistingHandle: true, rememberHandle: true })

  const toggleFileMenu = (open?: boolean) => {
    const isOpen = filePopout.classList.contains("is-open")
    filePopout.classList.toggle("is-open", open ?? !isOpen)
  }
  fileTrigger.addEventListener("click", event => {
    event.stopPropagation()
    runExportReadinessCheck()
    toggleFileMenu()
  })
  fileTab.addEventListener("click", runExportReadinessCheck)
  if (window.location.hash === "#save-export") {
    requestAnimationFrame(() => {
      setActiveTab(2)
      runExportReadinessCheck()
      toggleFileMenu(true)
      fileTrigger.focus()
    })
  }
  document.addEventListener("pointerdown", event => {
    if (!(event.target instanceof Node)) {
      return
    }
    if (filePlaceholder.contains(event.target)) {
      return
    }
    toggleFileMenu(false)
  })
  const safeRun = async (action: () => Promise<unknown>) => {
    try {
      await action()
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error(error)
      const message =
        error instanceof Error && error.message
          ? `File action failed: ${error.message}`
          : "File action failed. Please try again."
      window.alert(message)
    }
  }
  saveButton.addEventListener("click", async () => {
    toggleFileMenu(false)
    if (onSaveProject) {
      await safeRun(async () => {
        await onSaveProject()
      })
      return
    }
    await safeRun(() => savePreviewPdf(saveButton))
  })
  saveAsButton.addEventListener("click", async () => {
    toggleFileMenu(false)
    if (onSaveAsProject) {
      await safeRun(async () => {
        await onSaveAsProject()
      })
      return
    }
    await safeRun(() => saveAsPreviewPdf(saveAsButton))
  })

  const makeSection = (
    heading: string,
    options?: { layerId?: string; menu?: CustomiseMenuKey }
  ) => {
    const section = document.createElement("section")
    section.className = "customisation-section"
    const layerId = options?.layerId
    const requestedMenu = options?.menu ?? "base"
    const menu = menuOrder.includes(requestedMenu) ? requestedMenu : "elements"
    sectionMenuMap.set(section, menu)
    if (layerId) {
      section.setAttribute("data-layer-id", layerId)
      if (!layerSectionMap.has(layerId)) {
        layerSectionMap.set(layerId, section)
      }
    }
    const h = document.createElement("h3")
    h.textContent = heading
    section.appendChild(h)
    categoryPanels.get(menu)?.appendChild(section)
    return section
  }

  const makeRow = (section: HTMLElement, label: string) => {
    const row = document.createElement("label")
    row.className = "customisation-row"
    const span = document.createElement("span")
    span.textContent = label
    row.appendChild(span)
    section.appendChild(row)
    return row
  }

  const makeStyleSelect = (row: HTMLElement) => {
    const select = document.createElement("select")
    select.className = "customisation-select"
    const option = document.createElement("option")
    option.value = "default"
    option.textContent = "Default"
    select.appendChild(option)
    ;["dashed", "dotted"].forEach(style => {
      const choice = document.createElement("option")
      choice.value = style; choice.textContent = style[0].toUpperCase() + style.slice(1)
      select.appendChild(choice)
    })
    row.appendChild(select)
    return select
  }

  const makeNumber = (row: HTMLElement) => {
    const input = document.createElement("input")
    input.className = "customisation-number"
    input.type = "number"
    input.step = "0.1"
    input.min = "0.1"
    input.max = "10"
    row.appendChild(input)
    return input
  }

  const makeColorField = (row: HTMLElement) => {
    const wrap = document.createElement("div")
    wrap.className = "customisation-color-wrap"
    const text = document.createElement("input")
    text.type = "text"
    text.className = "customisation-color-text"
    const picker = document.createElement("input")
    picker.type = "color"
    picker.className = "customisation-color-native"
    const button = document.createElement("button")
    button.type = "button"
    button.className = "customisation-color-button"
    button.setAttribute("aria-label", "Pick colour")
    const icon = document.createElement("img")
    icon.src = ICON_COLOUR_STATIC
    icon.alt = ""
    button.appendChild(icon)
    button.addEventListener("mouseenter", () => {
      icon.src = ICON_COLOUR_HOVER
    })
    button.addEventListener("mouseleave", () => {
      icon.src = ICON_COLOUR_STATIC
    })
    button.addEventListener("click", () => {
      picker.click()
    })
    wrap.appendChild(text)
    wrap.appendChild(button)
    wrap.appendChild(picker)
    row.appendChild(wrap)
    const refreshPalette = colourPalette(row, () => text.value, hex => {
      text.value = hex; picker.value = hex; text.dispatchEvent(new Event("change", { bubbles: true }))
    })
    text.addEventListener("change", () => { rememberColour(text.value); refreshPalette() })
    picker.addEventListener("change", () => { rememberColour(picker.value); refreshPalette() })
    return { text, picker }
  }

  const makeOpacityField = (row: HTMLElement) => {
    const wrap = document.createElement("div")
    wrap.className = "customisation-opacity-wrap"
    const range = document.createElement("input")
    range.type = "range"
    range.min = "0"
    range.max = "100"
    range.value = "100"
    range.className = "customisation-opacity-range"
    const value = document.createElement("input")
    value.type = "number"
    value.min = "0"
    value.max = "100"
    value.step = "1"
    value.className = "customisation-opacity-value"
    value.value = "100"
    const suffix = document.createElement("span")
    suffix.className = "customisation-opacity-suffix"
    suffix.textContent = "%"
    wrap.appendChild(range)
    wrap.appendChild(value)
    wrap.appendChild(suffix)
    row.appendChild(wrap)
    return { range, value }
  }

  const cutterSection = makeSection("Cutter", { layerId: "cutter-outline", menu: "base" })
  const cutterStyle = makeStyleSelect(makeRow(cutterSection, "Style"))
  const cutterThickness = makeNumber(makeRow(cutterSection, "Thickness"))
  const cutterColour = makeColorField(makeRow(cutterSection, "Colour"))
  const cutterOpacity = makeOpacityField(makeRow(cutterSection, "Opacity"))

  const eyeSection = makeSection("Eyemark", { layerId: "eyemarks", menu: "base" })
  const eyeColour = makeColorField(makeRow(eyeSection, "Colour"))
  const eyeOpacity = makeOpacityField(makeRow(eyeSection, "Opacity"))

  const sealSection = makeSection("Seals", { layerId: "seal-areas", menu: "base" })
  const sealStyle = makeStyleSelect(makeRow(sealSection, "Style"))
  const sealThickness = makeNumber(makeRow(sealSection, "Thickness"))
  const sealColour = makeColorField(makeRow(sealSection, "Colour"))
  const sealOpacity = makeOpacityField(makeRow(sealSection, "Opacity"))

  const perfSection = makeSection("Microperfs", { layerId: "perf-lines", menu: "perforation" })
  const perfEmptyState = document.createElement("div")
  perfEmptyState.className = "customisation-empty-state"
  const perfEmptyText = document.createElement("p")
  perfEmptyText.textContent = "No Perforations Active"
  const perfEmptyAdd = document.createElement("button")
  perfEmptyAdd.type = "button"
  perfEmptyAdd.className = "customisation-empty-add"
  perfEmptyAdd.textContent = "Add"
  perfEmptyAdd.setAttribute("aria-label", "Add perforations")
  perfEmptyAdd.addEventListener("click", () => onShowPerforations?.())
  perfEmptyState.append(perfEmptyText, perfEmptyAdd)
  const perfDetails = document.createElement("div")
  perfDetails.className = "customisation-perf-details"
  perfSection.append(perfEmptyState, perfDetails)
  const perfSpecHeading = document.createElement("h4")
  perfSpecHeading.className = "customisation-subheading"
  perfSpecHeading.textContent = "Spec"
  perfDetails.appendChild(perfSpecHeading)
  const perfMode = document.createElement("select")
  perfMode.className = "customisation-select"
  ;[
    { value: "continuous", label: "Continuous" },
    { value: "regulated", label: "Regulated" }
  ].forEach(item => {
    const option = document.createElement("option")
    option.value = item.value
    option.textContent = item.label
    perfMode.appendChild(option)
  })
  makeRow(perfDetails, "Mode").appendChild(perfMode)

  const perfSpacing = makeNumber(makeRow(perfDetails, "Spacing"))
  perfSpacing.step = "0.5"
  perfSpacing.min = "0.1"

  const perfCount = makeNumber(makeRow(perfDetails, "Count"))
  perfCount.step = "1"
  perfCount.min = "1"

  const perfLaneList = document.createElement("div")
  perfLaneList.className = "customisation-perf-lanes"
  const perfStyleHeading = document.createElement("h4")
  perfStyleHeading.className = "customisation-subheading"
  perfStyleHeading.textContent = "Style"
  perfDetails.appendChild(perfStyleHeading)
  perfDetails.appendChild(perfLaneList)

  const perfLaneAddButton = document.createElement("button")
  perfLaneAddButton.type = "button"
  perfLaneAddButton.className = "customisation-perf-add"
  perfLaneAddButton.setAttribute("aria-label", "Add perf lane")
  const perfLaneAddIcon = document.createElement("img")
  perfLaneAddIcon.alt = ""
  applyIconButtonStates(perfLaneAddButton, perfLaneAddIcon, {
    static: ICON_UI_PLUS_STATIC,
    active: ICON_UI_PLUS_CLICKED,
    activeDurationMs: 700
  })
  perfLaneAddButton.appendChild(perfLaneAddIcon)
  perfDetails.appendChild(perfLaneAddButton)

  const makeListSection = (
    heading: string,
    menu: CustomiseMenuKey,
    items: string[],
    layerId?: string
  ) => {
    const section = makeSection(heading, { layerId, menu })
    const list = document.createElement("ul")
    list.className = "customisation-list"
    items.forEach(item => {
      const li = document.createElement("li")
      li.textContent = item
      list.appendChild(li)
    })
    section.appendChild(list)
    return { section, list }
  }

  const doyList = makeListSection("Doy Gusset", "doy-gusset", [
    "Centre Fold",
    "Side/Fin Seal",
    "Gusset Shoulder"
  ])
  const kSealList = makeListSection("K Seal", "k-seal", [
    "Centre Fold",
    "Side/Fin Seal",
    "Gusset Shoulder"
  ])
  const barcodeList = makeListSection("Barcodes / BBEs", "barcodes", [])
  const dieCutList = makeListSection("Die-Cut Outs", "die-cut-outs", [])
  const openingsList = makeListSection("Openings", "openings", [])
  const windowsList = makeListSection("Windows", "windows", [])
  const otherList = makeListSection("Other", "other", [])

  const measuresSection = makeSection("Measure display", { menu: "measures" })
  const measuresNote = document.createElement("p")
  measuresNote.className = "customisation-category-note"
  measuresNote.textContent = "Set main, sub and perforation measurements in the existing measure controls."
  const measuresButton = document.createElement("button")
  measuresButton.type = "button"
  measuresButton.className = "floating-panel-control"
  measuresButton.textContent = "Open measure controls"
  measuresButton.addEventListener("click", () => onShowMeasures?.())
  measuresSection.append(measuresNote, measuresButton)
  const legendSection = makeSection("Legend", { menu: "legend" })
  const legendNote = document.createElement("p")
  legendNote.className = "customisation-category-note"
  legendNote.textContent = "Use Show legend on the right of the cutter. The Klyro legend is editable vector artwork included in exports when enabled. Item and style customisation is coming later."
  legendSection.appendChild(legendNote)

  // Keep the existing perf/measure actions; replace informational element lists with real appearance controls.
  ;[doyList, kSealList, barcodeList, dieCutList, openingsList, windowsList, otherList].forEach(item => { item.section.hidden = true })
  const elementsEditor = createAppearanceEditor(categoryPanels.get("elements")!, "elements", () => currentSpec, next => {
    currentSpec = next; onChange(next)
  })
  const measuresEditor = createAppearanceEditor(categoryPanels.get("measures")!, "measures", () => currentSpec, next => {
    currentSpec = next; onChange(next)
  })
  const baseCategory = categoryPanels.get("base")!
  const baseTargets = document.createElement("div")
  baseTargets.className = "customise-targets"; baseTargets.setAttribute("role", "radiogroup"); baseTargets.setAttribute("aria-label", "Choose base appearance")
  const baseContent = document.createElement("div"); baseContent.className = "customise-target-content"
  const baseItems = [
    { section: cutterSection, name: "Cutter", icon: "window-rectangle", key: "cutter" as const },
    { section: sealSection, name: "Seals", icon: "grip", key: "seals" as const },
    { section: eyeSection, name: "Eyemark", icon: "window-rectangle", key: "eyemark" as const }
  ]
  let selectedBase = cutterSection
  const baseVisualSync = baseItems.map(item => {
    const button = document.createElement("button"); button.type = "button"; button.className = "customise-target"; button.textContent = item.name; button.setAttribute("role", "radio")
    button.addEventListener("click", () => { selectedBase = item.section; activeLayerId = null; applyCustomiseSectionMode() })
    baseTargets.appendChild(button); baseContent.appendChild(item.section)
    const sync = decorateCustomiseTarget(item.section, item.icon)
    const reset = document.createElement("button"); reset.type = "button"; reset.className = "customise-reset"; reset.textContent = "Reset appearance"
    reset.addEventListener("click", () => {
      if (!currentSpec) return
      const defaults = resolveBaseCustomisation({ ...currentSpec, baseCustomisation: undefined })
      applyPatch(custom => { Object.assign(custom[item.key], defaults[item.key]) })
    })
    item.section.appendChild(reset); return sync
  })
  baseTargets.addEventListener("keydown", event => {
    const buttons = [...baseTargets.querySelectorAll<HTMLButtonElement>("button")], index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % buttons.length : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length : -1
    if (next >= 0) { event.preventDefault(); buttons[next].click(); buttons[next].focus() }
  })
  baseCategory.append(baseTargets, baseContent)
  const perfContent = document.createElement("div"); perfContent.className = "customise-target-content"; perfContent.appendChild(perfSection); categoryPanels.get("perforation")!.appendChild(perfContent)
  measuresSection.classList.add("customise-measure-link")
  categoryPanels.get("measures")!.appendChild(measuresSection)
  const legendContent = document.createElement("div"); legendContent.className = "customise-target-content"; legendContent.appendChild(legendSection); categoryPanels.get("legend")!.appendChild(legendContent)

  host.appendChild(panel)

  const applyPatch = (
    updater: (custom: NonNullable<FlowwrapSpec["baseCustomisation"]>) => void
  ) => {
    if (!currentSpec) {
      return
    }
    const resolved = resolveBaseCustomisation(currentSpec)
    updater(resolved)
    const next: FlowwrapSpec = {
      ...currentSpec,
      baseCustomisation: resolved
    }
    currentSpec = next
    onChange(next)
  }

  const applySpecPatch = (updater: (spec: FlowwrapSpec) => FlowwrapSpec) => {
    if (!currentSpec) {
      return
    }
    const next = updater(currentSpec)
    currentSpec = next
    onChange(next)
    const perfs = normalizePerfs(next)
    perfMode.value = perfs?.mode ?? "continuous"
    perfSpacing.value = `${perfs?.separation ?? 10}`
    perfCount.value = `${perfs?.count ?? 6}`
    perfMode.disabled = !perfs
    perfSpacing.disabled = !perfs
    perfCount.disabled = (perfs?.mode ?? "continuous") !== "regulated"
    perfLaneAddButton.disabled = !perfs || (perfs?.lanes.length ?? 0) >= 3
    renderPerfLanes()
    applyCustomiseSectionMode()
    refreshFocusedSection()
  }

  const normalizePerfs = (spec: FlowwrapSpec) => {
    const perfs = spec.perfs
    if (!perfs) {
      return null
    }
    const lanes = perfs.lanes?.length
      ? perfs.lanes
      : [{ originX: perfs.originX, originY: perfs.originY }]
    return {
      ...perfs,
      style: perfs.style ?? DEFAULT_PERF_STYLE,
      color: perfs.color ?? DEFAULT_PERF_COLOR,
      fillColor: perfs.fillColor ?? perfs.color ?? DEFAULT_PERF_COLOR,
      fillOpacity: Math.max(0, Math.min(1, perfs.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)),
      strokeColor: perfs.fillColor ?? perfs.color ?? DEFAULT_PERF_COLOR,
      strokeWidth: Math.max(0.1, Math.min(6, perfs.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)),
      diameter: Math.max(0.1, Math.min(12, perfs.diameter ?? DEFAULT_PERF_DIAMETER)),
      lanes: lanes.map(lane => ({
        ...lane,
        style: lane.style ?? perfs.style ?? DEFAULT_PERF_STYLE,
        color: lane.color ?? perfs.color ?? DEFAULT_PERF_COLOR,
        fillColor:
          lane.fillColor ??
          perfs.fillColor ??
          lane.color ??
          perfs.color ??
          DEFAULT_PERF_COLOR,
        fillOpacity: Math.max(
          0,
          Math.min(1, lane.fillOpacity ?? perfs.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)
        ),
        strokeColor:
          lane.fillColor ??
          lane.color ??
          perfs.fillColor ??
          perfs.color ??
          DEFAULT_PERF_COLOR,
        strokeWidth: Math.max(
          0.1,
          Math.min(6, lane.strokeWidth ?? perfs.strokeWidth ?? DEFAULT_PERF_STROKE_WIDTH)
        ),
        diameter: Math.max(0.1, Math.min(12, lane.diameter ?? perfs.diameter ?? DEFAULT_PERF_DIAMETER))
      }))
    }
  }

  const menuForLayerId = (layerId: string | null): CustomiseMenuKey | null => {
    if (!layerId) {
      return null
    }
    if (layerId === "perf-lines") return "perforation"
    if (["notes", "tear-notches", "hanger-slots", "zips", "grip-seals", "windows", "safe-zones", "fold-lines"].includes(layerId)) return "elements"
    if (
      layerId === "kseal-bottom-seals" ||
      layerId === "kseal-arms" ||
      (layerId === "gusset-fold-line" && currentSpec?.kSealPouch)
    ) return "elements"
    if (layerId.startsWith("gusset-")) return "elements"
    return "base"
  }

  const refreshFocusedSection = () => {
    layerSectionMap.forEach(section => section.classList.remove("is-focused"))
    if (!activeLayerId) {
      return
    }
    const target = layerSectionMap.get(activeLayerId)
    if (!target) {
      return
    }
    if (baseItems.some(item => item.section === target)) { selectedBase = target; applyCustomiseSectionMode() }
    const targetMenu = sectionMenuMap.get(target)
    if (targetMenu && targetMenu !== activeMenu) {
      activeMenu = targetMenu
      applyCustomiseSectionMode()
    }
    target.classList.add("is-focused")
    target.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }

  const setListItems = (list: HTMLUListElement, items: string[]) => {
    list.innerHTML = ""
    items.forEach(item => {
      const li = document.createElement("li")
      li.textContent = item
      list.appendChild(li)
    })
  }

  const getVisibleMenus = (spec: FlowwrapSpec | null) => {
    if (!spec) {
      return ["base"] as CustomiseMenuKey[]
    }
    const windows = spec.windows ?? []
    const attrs = spec.attributeBoxes ?? []
    const hasAttr = (kind: "barcode" | "bbe" | "qr") =>
      attrs.some(box => box.kind === kind && box.enabled !== false)
    const hasTear = spec.sachet?.tearNotch?.enabled === true || spec.doyPouch?.showTearNotch === true
    const hasHalfMoon = (spec.halfMoonCutouts?.length ?? 0) > 0
    const hasHangers = (spec.hangerSlots?.length ?? 0) > 0
    const hasZip = spec.doyPouch?.showZipper === true
    const hasGrip = spec.doyPouch?.showGripSeal === true
    const hasSafe = (spec.safeZones?.length ?? 0) > 0
    const hasFold = (spec.foldLines?.length ?? 0) > 0
    setListItems(
      barcodeList.list,
      [
        hasAttr("barcode") ? "Barcode" : "",
        hasAttr("bbe") ? "BBE Box" : "",
        hasAttr("qr") ? "QR Code" : ""
      ].filter(Boolean)
    )
    setListItems(
      dieCutList.list,
      [
        hasTear ? "Tear Notch" : "",
        hasHalfMoon ? "Halfmoon Cut-Out" : "",
        hasHangers ? "Hanger Slots" : ""
      ].filter(Boolean)
    )
    setListItems(
      openingsList.list,
      [hasZip ? "Grip Seal (Zip)" : "", hasGrip ? "Grip Seal (Default)" : ""].filter(Boolean)
    )
    setListItems(
      windowsList.list,
      Array.from(
        new Set(
          windows.map(window => {
            const shape = (window.shape ?? "").toLowerCase()
            const names: Record<string, string> = {
              circle: "Circle",
              oval: "Oval",
              rectangle: "Rectangle",
              "rounded-rectangle": "Rounded Rectangle",
              triangle: "Triangle",
              "rounded-triangle": "Rounded Triangle",
              "half-circle": "Half Circle"
            }
            return names[shape] ?? ""
          }).filter(Boolean)
        )
      )
    )
    setListItems(
      otherList.list,
      [hasSafe ? "Safe Zones" : "", hasFold ? "Fold Lines" : ""].filter(Boolean)
    )

    return menuOrder
  }

  const applyCustomiseSectionMode = () => {
    const visibleMenus = getVisibleMenus(currentSpec)
    if (!visibleMenus.includes(activeMenu)) {
      activeMenu = visibleMenus[0] ?? "base"
    }
    customiseTabs.select(activeMenu)
    sectionMenuMap.forEach((menu, section) => {
      section.classList.toggle("is-hidden", menu !== activeMenu || !visibleMenus.includes(menu) || (menu === "base" && section !== selectedBase))
    })
    ;[...baseTargets.querySelectorAll<HTMLButtonElement>("button")].forEach((button, i) => {
      const active = baseItems[i].section === selectedBase; button.setAttribute("aria-checked", String(active)); button.tabIndex = active ? 0 : -1
    })
    elementsEditor.refresh(); measuresEditor.refresh()
  }

  const renderPerfLanes = () => {
    perfLaneList.innerHTML = ""
    const perfs = currentSpec ? normalizePerfs(currentSpec) : null
    perfEmptyState.hidden = Boolean(perfs)
    perfDetails.hidden = !perfs
    if (!perfs) {
      perfLaneList.style.display = "none"
      return
    }
    perfLaneList.style.display = ""
    perfs.lanes.forEach((lane, index) => {
      const card = document.createElement("div")
      card.className = "customisation-perf-lane"

      const laneHeader = document.createElement("div")
      laneHeader.className = "customisation-perf-lane-header"
      const laneTitle = document.createElement("strong")
      laneTitle.textContent = `Perf Lane ${index + 1}`
      const laneDelete = document.createElement("button")
      laneDelete.type = "button"
      laneDelete.className = "customisation-perf-lane-delete"
      laneDelete.setAttribute("aria-label", "Delete perf lane")
      const laneDeleteIcon = document.createElement("img")
      laneDeleteIcon.alt = ""
      applyIconButtonStates(laneDelete, laneDeleteIcon, {
        static: ICON_UI_BIN_STATIC,
        hover: ICON_UI_BIN_HOVER
      })
      laneDelete.appendChild(laneDeleteIcon)
      laneDelete.disabled = perfs.lanes.length <= 1
      laneDelete.addEventListener("click", () => {
        applySpecPatch(spec => {
          const resolved = normalizePerfs(spec)
          if (!resolved || resolved.lanes.length <= 1) {
            return spec
          }
          const lanes = resolved.lanes.filter((_, i) => i !== index)
          return {
            ...spec,
            perfs: {
              ...resolved,
              lanes,
              originX: lanes[0]?.originX ?? resolved.originX,
              originY: lanes[0]?.originY ?? resolved.originY
            }
          }
        })
      })
      laneHeader.appendChild(laneTitle)
      laneHeader.appendChild(laneDelete)
      card.appendChild(laneHeader)

      const styleRow = makeRow(card, "Style")
      const styleSelect = document.createElement("select")
      styleSelect.className = "customisation-select"
      ;[
        { value: "circles", label: "Circles" },
        { value: "x-markers", label: "X Markers" },
        { value: "scope", label: "Scope" },
        { value: "crosshair", label: "Crosshair" }
      ].forEach(item => {
        const option = document.createElement("option")
        option.value = item.value
        option.textContent = item.label
        styleSelect.appendChild(option)
      })
      styleSelect.value = lane.style ?? DEFAULT_PERF_STYLE
      styleRow.appendChild(styleSelect)

      const sizeRow = makeRow(card, "Size")
      const sizeWrap = document.createElement("div")
      sizeWrap.className = "customisation-opacity-wrap"
      const sizeRange = document.createElement("input")
      sizeRange.type = "range"
      sizeRange.className = "customisation-opacity-range"
      sizeRange.min = "0.1"
      sizeRange.max = "12"
      sizeRange.step = "0.5"
      sizeRange.value = (lane.diameter ?? DEFAULT_PERF_DIAMETER).toString()
      const sizeValue = document.createElement("input")
      sizeValue.type = "number"
      sizeValue.className = "customisation-opacity-value"
      sizeValue.min = "0.1"
      sizeValue.max = "12"
      sizeValue.step = "0.5"
      sizeValue.value = formatMetricValue(lane.diameter ?? DEFAULT_PERF_DIAMETER)
      const sizeSuffix = document.createElement("span")
      sizeSuffix.className = "customisation-opacity-suffix"
      sizeSuffix.textContent = "mm"
      sizeWrap.appendChild(sizeRange)
      sizeWrap.appendChild(sizeValue)
      sizeWrap.appendChild(sizeSuffix)
      sizeRow.appendChild(sizeWrap)

      const fillRow = makeRow(card, "Fill")
      const laneFill = makeColorField(fillRow)
      laneFill.text.value = lane.fillColor ?? lane.color ?? DEFAULT_PERF_COLOR
      laneFill.picker.value = lane.fillColor ?? lane.color ?? DEFAULT_PERF_COLOR

      const opacityRow = makeRow(card, "Opacity")
      const laneOpacity = makeOpacityField(opacityRow)
      const opacityPercent = Math.round(
        Math.max(0, Math.min(1, lane.fillOpacity ?? DEFAULT_PERF_FILL_OPACITY)) * 100
      )
      laneOpacity.range.value = `${opacityPercent}`
      laneOpacity.value.value = `${opacityPercent}`

      const strokeRow = makeRow(card, "Stroke")
      const laneStroke = makeColorField(strokeRow)
      laneStroke.text.value = lane.strokeColor ?? lane.fillColor ?? DEFAULT_PERF_COLOR
      laneStroke.picker.value = lane.strokeColor ?? lane.fillColor ?? DEFAULT_PERF_COLOR

      styleSelect.addEventListener("change", () => {
        applySpecPatch(spec => {
          const resolved = normalizePerfs(spec)
          if (!resolved) {
            return spec
          }
          const lanes = [...resolved.lanes]
          lanes[index] = { ...lanes[index], style: styleSelect.value as PerfStyle }
          return { ...spec, perfs: { ...resolved, style: styleSelect.value as PerfStyle, lanes } }
        })
      })

      const updateDiameter = (value: number) => {
        const diameter = Math.max(0.1, Math.min(12, value))
        sizeRange.value = diameter.toString()
        sizeValue.value = formatMetricValue(diameter)
        applySpecPatch(spec => {
          const resolved = normalizePerfs(spec)
          if (!resolved) {
            return spec
          }
          const lanes = [...resolved.lanes]
          lanes[index] = { ...lanes[index], diameter }
          return { ...spec, perfs: { ...resolved, diameter, lanes } }
        })
      }
      sizeRange.addEventListener("input", () => updateDiameter(Number(sizeRange.value)))
      sizeValue.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          sizeValue.blur()
        }
      })
      sizeValue.addEventListener("change", () => {
        const diameter = parseMetricDraft(sizeValue.value, { min: 0.1, max: 12 })
        if (diameter === null) {
          sizeValue.value = formatMetricValue(lane.diameter ?? DEFAULT_PERF_DIAMETER)
          return
        }
        updateDiameter(diameter)
      })

      const updateFillColor = (hex: string) => {
        applySpecPatch(spec => {
          const resolved = normalizePerfs(spec)
          if (!resolved) {
            return spec
          }
          const lanes = [...resolved.lanes]
          lanes[index] = {
            ...lanes[index],
            color: hex,
            fillColor: hex,
            strokeColor: hex
          }
          return {
            ...spec,
            perfs: {
              ...resolved,
              color: hex,
              fillColor: hex,
              strokeColor: hex,
              lanes
            }
          }
        })
      }
      laneFill.text.addEventListener("change", () => {
        const normalized = laneFill.text.value.trim().startsWith("#")
          ? laneFill.text.value.trim()
          : `#${laneFill.text.value.trim()}`
        if (!/^#([0-9a-f]{6})$/i.test(normalized)) {
          laneFill.text.value = lane.fillColor ?? lane.color ?? DEFAULT_PERF_COLOR
          return
        }
        laneFill.text.value = normalized
        laneFill.picker.value = normalized
        updateFillColor(normalized)
      })
      laneFill.picker.addEventListener("input", () => {
        laneFill.text.value = laneFill.picker.value
        updateFillColor(laneFill.picker.value)
      })

      const updateFillOpacity = (percent: number) => {
        const bounded = Math.max(0, Math.min(100, percent))
        laneOpacity.range.value = `${bounded}`
        laneOpacity.value.value = `${bounded}`
        applySpecPatch(spec => {
          const resolved = normalizePerfs(spec)
          if (!resolved) {
            return spec
          }
          const lanes = [...resolved.lanes]
          lanes[index] = { ...lanes[index], fillOpacity: bounded / 100 }
          return { ...spec, perfs: { ...resolved, fillOpacity: bounded / 100, lanes } }
        })
      }
      laneOpacity.range.addEventListener("input", () => {
        updateFillOpacity(Number(laneOpacity.range.value))
      })
      laneOpacity.value.addEventListener("change", () => {
        updateFillOpacity(Number(laneOpacity.value.value))
      })

      strokeRow.style.display = "none"

      perfLaneList.appendChild(card)
    })
  }

  const attachColorHandlers = (
    field: { text: HTMLInputElement; picker: HTMLInputElement },
    update: (hex: string) => void
  ) => {
    field.text.addEventListener("change", () => {
      const value = field.text.value.trim().toLowerCase()
      const normalized = value.startsWith("#") ? value : `#${value}`
      if (!/^#([0-9a-f]{6})$/i.test(normalized)) {
        return
      }
      field.text.value = normalized
      field.picker.value = normalized
      update(normalized)
    })
    field.picker.addEventListener("input", () => {
      field.text.value = field.picker.value
      update(field.picker.value)
    })
  }

  cutterStyle.addEventListener("change", () => {
    applyPatch(custom => {
      custom.cutter.style = cutterStyle.value as typeof custom.cutter.style
    })
  })
  cutterThickness.addEventListener("change", () => {
    applyPatch(custom => {
      custom.cutter.thickness = clamp(Number(cutterThickness.value) || 0.75, 0.1, 10)
    })
  })
  attachColorHandlers(cutterColour, hex => {
    applyPatch(custom => {
      custom.cutter.color = hex
    })
  })
  cutterOpacity.range.addEventListener("input", () => {
    const percent = clamp(Number(cutterOpacity.range.value) || 0, 0, 100)
    cutterOpacity.value.value = `${percent}`
    applyPatch(custom => {
      custom.cutter.opacity = toOpacity(percent)
    })
  })
  const applyCutterOpacityInput = () => {
    const percent = clamp(Number(cutterOpacity.value.value) || 0, 0, 100)
    cutterOpacity.value.value = `${percent}`
    cutterOpacity.range.value = `${percent}`
    applyPatch(custom => {
      custom.cutter.opacity = toOpacity(percent)
    })
  }
  cutterOpacity.value.addEventListener("input", applyCutterOpacityInput)
  cutterOpacity.value.addEventListener("change", applyCutterOpacityInput)

  attachColorHandlers(eyeColour, hex => {
    applyPatch(custom => {
      custom.eyemark.color = hex
    })
  })
  eyeOpacity.range.addEventListener("input", () => {
    const percent = clamp(Number(eyeOpacity.range.value) || 0, 0, 100)
    eyeOpacity.value.value = `${percent}`
    applyPatch(custom => {
      custom.eyemark.opacity = toOpacity(percent)
    })
  })
  const applyEyeOpacityInput = () => {
    const percent = clamp(Number(eyeOpacity.value.value) || 0, 0, 100)
    eyeOpacity.value.value = `${percent}`
    eyeOpacity.range.value = `${percent}`
    applyPatch(custom => {
      custom.eyemark.opacity = toOpacity(percent)
    })
  }
  eyeOpacity.value.addEventListener("input", applyEyeOpacityInput)
  eyeOpacity.value.addEventListener("change", applyEyeOpacityInput)

  sealStyle.addEventListener("change", () => {
    applyPatch(custom => {
      custom.seals.style = sealStyle.value as typeof custom.seals.style
    })
  })
  sealThickness.addEventListener("change", () => {
    applyPatch(custom => {
      custom.seals.thickness = clamp(Number(sealThickness.value) || 0.6, 0.1, 10)
    })
  })
  attachColorHandlers(sealColour, hex => {
    applyPatch(custom => {
      custom.seals.color = hex
    })
  })
  sealOpacity.range.addEventListener("input", () => {
    const percent = clamp(Number(sealOpacity.range.value) || 0, 0, 100)
    sealOpacity.value.value = `${percent}`
    applyPatch(custom => {
      custom.seals.opacity = toOpacity(percent)
    })
  })
  const applySealOpacityInput = () => {
    const percent = clamp(Number(sealOpacity.value.value) || 0, 0, 100)
    sealOpacity.value.value = `${percent}`
    sealOpacity.range.value = `${percent}`
    applyPatch(custom => {
      custom.seals.opacity = toOpacity(percent)
    })
  }
  sealOpacity.value.addEventListener("input", applySealOpacityInput)
  sealOpacity.value.addEventListener("change", applySealOpacityInput)

  const ensurePerfs = (spec: FlowwrapSpec) => {
    const resolved = normalizePerfs(spec)
    if (resolved) {
      return resolved
    }
    return normalizePerfs({
      ...spec,
      perfs: {
        mode: "continuous",
        separation: 10,
        originX: 5,
        originY: 5,
        count: 6,
        sealEdge: "top",
        diameter: DEFAULT_PERF_DIAMETER,
        style: DEFAULT_PERF_STYLE,
        color: DEFAULT_PERF_COLOR,
        fillColor: DEFAULT_PERF_COLOR,
        fillOpacity: DEFAULT_PERF_FILL_OPACITY,
        strokeColor: DEFAULT_PERF_COLOR,
        strokeWidth: DEFAULT_PERF_STROKE_WIDTH,
        lanes: [{
          originX: 5,
          originY: 5,
          diameter: DEFAULT_PERF_DIAMETER,
          style: DEFAULT_PERF_STYLE,
          color: DEFAULT_PERF_COLOR,
          fillColor: DEFAULT_PERF_COLOR,
          fillOpacity: DEFAULT_PERF_FILL_OPACITY,
          strokeColor: DEFAULT_PERF_COLOR,
          strokeWidth: DEFAULT_PERF_STROKE_WIDTH
        }]
      }
    })!
  }

  perfMode.addEventListener("change", () => {
    applySpecPatch(spec => {
      const perfs = ensurePerfs(spec)
      return { ...spec, perfs: { ...perfs, mode: perfMode.value as "continuous" | "regulated" } }
    })
  })
  perfSpacing.addEventListener("change", () => {
    const separation = parseMetricDraft(perfSpacing.value, { min: 0.1 })
    if (separation === null) {
      perfSpacing.value = formatMetricValue(currentSpec?.perfs?.separation ?? 10)
      return
    }
    applySpecPatch(spec => {
      const perfs = ensurePerfs(spec)
      return {
        ...spec,
        perfs: { ...perfs, separation }
      }
    })
  })
  perfSpacing.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      perfSpacing.blur()
    }
  })
  perfCount.addEventListener("change", () => {
    applySpecPatch(spec => {
      const perfs = ensurePerfs(spec)
      return {
        ...spec,
        perfs: { ...perfs, count: Math.max(1, Math.round(Number(perfCount.value) || 1)) }
      }
    })
  })
  perfLaneAddButton.addEventListener("click", () => {
    applySpecPatch(spec => {
      const perfs = ensurePerfs(spec)
      if (perfs.lanes.length >= 3) {
        return spec
      }
      const base = perfs.lanes[perfs.lanes.length - 1] ?? {
        originX: perfs.originX,
        originY: perfs.originY,
        diameter: perfs.diameter,
        style: perfs.style,
        color: perfs.color
      }
      const nextLane = {
        ...base,
        originX: Math.max(0, base.originX + 10)
      }
      return { ...spec, perfs: { ...perfs, lanes: [...perfs.lanes, nextLane] } }
    })
  })

  const setSpec = (spec: FlowwrapSpec) => {
    currentSpec = spec
    const custom = resolveBaseCustomisation(spec)
    cutterStyle.value = custom.cutter.style
    cutterThickness.value = custom.cutter.thickness.toFixed(2).replace(/\.00$/, "")
    cutterColour.text.value = custom.cutter.color
    cutterColour.picker.value = custom.cutter.color
    cutterOpacity.range.value = toPercent(custom.cutter.opacity).toString()
    cutterOpacity.value.value = `${toPercent(custom.cutter.opacity)}`

    eyeColour.text.value = custom.eyemark.color
    eyeColour.picker.value = custom.eyemark.color
    eyeOpacity.range.value = toPercent(custom.eyemark.opacity).toString()
    eyeOpacity.value.value = `${toPercent(custom.eyemark.opacity)}`

    sealStyle.value = custom.seals.style
    sealThickness.value = custom.seals.thickness.toFixed(2).replace(/\.00$/, "")
    sealColour.text.value = custom.seals.color
    sealColour.picker.value = custom.seals.color
    sealOpacity.range.value = toPercent(custom.seals.opacity).toString()
    sealOpacity.value.value = `${toPercent(custom.seals.opacity)}`
    baseVisualSync.forEach(sync => sync())

    const perfs = normalizePerfs(spec)
    perfMode.value = perfs?.mode ?? "continuous"
    perfSpacing.value = `${perfs?.separation ?? 10}`
    perfCount.value = `${perfs?.count ?? 6}`
    perfCount.disabled = (perfs?.mode ?? "continuous") !== "regulated"
    perfMode.disabled = !perfs
    perfSpacing.disabled = !perfs
    perfLaneAddButton.disabled = !perfs || (perfs?.lanes.length ?? 0) >= 3
    renderPerfLanes()
    applyCustomiseSectionMode()
    refreshFocusedSection()
  }

  return {
    element: panel,
    setSpec,
    showCustomise() {
      panel.classList.remove("is-file-mode")
      setActiveTab(0)
    },
    showFile() {
      panel.classList.add("is-file-mode")
      setActiveTab(2)
      runExportReadinessCheck()
    },
    refreshExportReadiness: runExportReadinessCheck,
    getExportPackageDraft: () => currentExportPackage,
    setActiveLayer(layerId: string | null) {
      activeLayerId = layerId
      const menu = menuForLayerId(layerId)
      if (menu) {
        activeMenu = menu
      }
      setActiveTab(0)
      applyCustomiseSectionMode()
      refreshFocusedSection()
    }
  }
}
