import "./brandBootstrap"
import { attachLegendPlacement } from "./ui/legendPlacement"
import { initSandboxStudio, SANDBOX_DEFAULT_FILM_COLOUR, SANDBOX_DEFAULT_HEIGHT_MM, SANDBOX_DEFAULT_WIDTH_MM, type SandboxStudioApi } from "./ui/sandboxStudio"
import { renderSandboxCutter } from "./renderers/sandboxCutterSvg"
import { mountPackGen } from "./packGen"
import "./kyza/styles/kyza.css"
import "./style.css"
import "./ui/studioPanels.css"
import "./ui/startLanding.css"
import "./ui/studioAmends.css"
import "./ui/studioRefinements.css"
import { createFlowAssistantDock } from "./ui/flowAssistantDock"
import { createStudioGuide } from "./ui/studioGuide"
import { createStudioPackCarousel } from "./ui/studioPackCarousel"
import "./ui/landingAmends.css"
import { KYZA_LOGO_HTML, createKyzaMarkIcon } from "./kyza/shell/kyzaMark"
import { initFlowwrapControls } from "./ui/controls"
import { attachFoldLineInteractions } from "./ui/foldLineInteractions"
import { attachOpeningInteractions } from "./ui/openingInteractions"
import { attachDoyGeometryInteractions } from "./ui/doyGeometryInteractions"
import { attachTearNotchInteractions } from "./ui/tearNotchInteractions"
import { attachMeasureTool } from "./ui/measureInteractions"
import { clampCanvasZoom, zoomViewBox, wheelZoomFactor } from "./ui/canvasViewport"
import { attachCanvasWheel } from "./ui/canvasWheel"
import { attachPerfInteractions } from "./ui/perfInteractions"
import { attachSealInteractions } from "./ui/sealInteractions"
import { attachSafeZoneInteractions } from "./ui/safeZoneInteractions"
import { attachAttributeBoxInteractions } from "./ui/attributeBoxInteractions"
import { attachEyeMarkInteractions } from "./ui/eyeMarkInteractions"
import { attachHangerSlotInteractions } from "./ui/hangerSlotInteractions"
import { attachHalfMoonCutoutInteractions } from "./ui/halfMoonCutoutInteractions"
import { attachWindowInteractions } from "./ui/windowInteractions"
import { attachKSealPouchInteractions } from "./ui/kSealPouchInteractions"
import { attachPaperStripInteractions } from "./ui/paperStripInteractions"
import { attachPaperStripEditing } from "./ui/paperStripEditing"
import { commitPaperStripStepEdit } from "../../../packages/cutter-engine/actions/paperStripSteps"
import { initialiseSachetSteps, commitSachetStepEdit } from "../../../packages/cutter-engine/actions/sachetSteps"
import { studioNavigationHref, getStudioDestination } from "./kyza/account/studioNavigation"
import { attachGussetDock } from "./ui/gussetDock"
import { attachStepNavigation } from "./ui/stepNavigation"
import { attachLiddingDock, openLiddingSetup } from "./ui/liddingStudio"
import { refreshFittedSafeZones } from "../../../packages/cutter-engine/actions/safeZoneFit"
import { constrainPouchSafeZone } from "../../../packages/cutter-engine/actions/safeZoneContours"
import { constrainDoyGeometry } from "./core/geometry/resolvers/doyBounds"
import { initCustomProjectBuilder } from "./ui/customProjectBuilder"
import { attachSelectionInteractions } from "./ui/selectionInteractions"
import { syncLiddingCutterSize } from "./constraints/lidding"
import { commitLiddingLaneElements } from "./constraints/liddingSteps"
import { createDefaultLayerManager } from "./layers/layerManager"
import { initLayersPanel } from "./ui/layersPanel"
import { selectionStore, type CutterElement, type CutterElementType } from "./state/selectionStore"
import { applyBaseLayerCustomisation } from "./renderers/baseLayerCustomisation"
import { updateSubMeasuresLayer } from "./renderers/flowwrapSvg"
import { initCustomisationPanel } from "./ui/customisationPanel"
import { attachCanvasPan } from "./ui/canvasPan"
import { clampPouchPreviewView, fitPouchPreviewElement, POUCH_PREVIEW_ROTATION, resolvePouchPreviewViewport, showPouchPreviewMeasures, type PouchPreviewViewport } from "./ui/pouchPreview"
import { attachSelectionContextActions } from "./ui/selectionContextActions"
import { getPackModule, packModules } from "./packs"
import { loadPreferences } from "./kyza/account/preferenceService"
import {
  createArtworkHandoffProject,
  getArtworkStudioAvailability
} from "./artwork/artworkHandoff"
import {
  MVP_DEMO_PACK,
  createCurrentProject,
  loadCurrentProject,
  projectToSearchParams,
  saveCurrentProject as saveHandoffProject
} from "./config/mvpDemoPack"
import {
  buildActiveCutterState,
  clearActiveCutterState,
  loadActiveCutterState,
  saveActiveCutterState
} from "./config/activeCutterState"
import { runEngineRequest } from "../../../packages/engine-api"
import {
  deleteKyzaProject,
  legacySpecFromProject,
  loadKyzaProject,
  listKyzaProjects,
  hasCutterDocument,
  projectFromLegacySpec,
  saveKyzaProject,
  type KyzaCutterProjectV1,
  type KyzaProjectV1,
  type ParseResult
} from "../../../packages/cutter-engine/project"
import {
  migrateSavedProjectRecord,
  synchroniseKyzaProject,
  updateKyzaProject,
  type ProjectUpdateReason
} from "./project/projectUpdateService"
import {
  chooseCutterStartupSource,
  parseRequestedProjectId,
  type RequestedProjectId
} from "./project/projectNavigation"
import {
  loadRequestedProject,
  prepareProjectPresentationCard,
  type CutterProjectPresentationCard
} from "./project/projectOpenService"
import { resolveCutterElementSelection } from "./project/cutterElementSelection"
import {
  getBlockingValidationMessages,
  validateForExport
} from "../../../packages/cutter-engine/validation"
import {
  getExportResultPresentation,
  listExportReleaseActions,
  type ExportReleaseAction
} from "../../../packages/cutter-engine/export/exportReleasePresentation"
import {
  deliverProjectExportLocally,
  executeProjectExport,
  type SaveFilePickerLike
} from "../../../packages/cutter-engine/export/projectExportService"
import { requestPreExportReview } from "./ui/preExportReview"
import { transformSelectedElements } from "../../../packages/cutter-engine/actions/selectionTransforms"
import { applyCutterValidationFix } from "../../../packages/cutter-engine/actions/validationFixes"
import type { FlowwrapSpec } from "./types/flowwrap"
import {
  getProjectValidationSnapshot,
  getSvgFallbackValidationDebug,
  getSvgFallbackValidationIssues,
  type ActiveValidationIssue
} from "./validation/activeValidation"
import {
  buildValidationCentreSummary,
  getValidationIssuePresentation,
  type ValidationCentreSummary
} from "./validation/validationCentre"

const app = document.getElementById("app") as HTMLDivElement
const CUTTER_PAGE_ZOOM_PERCENT = 100
const DEFAULT_PAGE_ZOOM_PERCENT = 100
const HOME_ICON_STATIC = "/Icons/Home Button __STATIC.png"
const HOME_ICON_HOVER = "/Icons/Home Button __HOVER.png"
const STUDIO_TOPBAR_ACTIONS = [
  { id: "user", label: "User", icon: '<path d="M17.925 20.056a6 6 0 0 0-11.851.001"/><circle cx="12" cy="11" r="4"/><circle cx="12" cy="12" r="10"/>' }
]
const SAVED_PROJECTS_STORAGE_KEY = "cutter_saved_projects_v1"

const applyHomeIconButton = (button: HTMLButtonElement) => {
  button.classList.add("home-icon-button")
  button.textContent = ""
  button.setAttribute("aria-label", "Home")
  const icon = document.createElement("img")
  icon.src = HOME_ICON_STATIC
  icon.alt = ""
  icon.className = "home-button-icon"
  icon.decoding = "async"
  button.appendChild(icon)
  const setHover = (hovered: boolean) => {
    icon.src = hovered ? HOME_ICON_HOVER : HOME_ICON_STATIC
  }
  button.addEventListener("mouseenter", () => setHover(true))
  button.addEventListener("mouseleave", () => setHover(false))
  button.addEventListener("focus", () => setHover(true))
  button.addEventListener("blur", () => setHover(false))
}

const applyIconSwapButton = (
  button: HTMLButtonElement,
  label: string,
  iconPaths: string
) => {
  button.classList.add("studio-topbar-icon-button")
  button.textContent = ""
  button.setAttribute("aria-label", label)
  button.setAttribute("title", label)
  button.appendChild(makeLucideIcon(iconPaths, "studio-topbar-action-icon"))
}

const layout = document.createElement("div")
layout.className = "app-shell"

const cutterAppFrame = document.createElement("div")
cutterAppFrame.className = "kyza-app cutter-kyza-app"
const cutterGlobalHeader = document.createElement("header")
cutterGlobalHeader.className = "kyza-header cutter-global-header"
const cutterHeaderLeading = document.createElement("div")
cutterHeaderLeading.className = "kyza-header-leading cutter-header-leading"
const cutterNavigationToggle = document.createElement("button")
cutterNavigationToggle.type = "button"
cutterNavigationToggle.className = "kyza-icon-button kyza-navigation-toggle cutter-shell-icon-button"
cutterNavigationToggle.setAttribute("aria-label", "Expand navigation")
cutterNavigationToggle.setAttribute("aria-expanded", "false")
const makeLucideIcon = (paths: string, className = "") => {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  icon.setAttribute("viewBox", "0 0 24 24")
  icon.setAttribute("width", "22")
  icon.setAttribute("height", "22")
  icon.setAttribute("fill", "none")
  icon.setAttribute("stroke", "currentColor")
  icon.setAttribute("stroke-width", "2")
  icon.setAttribute("stroke-linecap", "round")
  icon.setAttribute("stroke-linejoin", "round")
  icon.setAttribute("aria-hidden", "true")
  if (className) icon.setAttribute("class", className)
  icon.innerHTML = paths
  return icon
}
const cutterIcons = {
  panelOpen: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>',
  panelClose: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1 1 0 0 1 .6-1.6h2a4 4 0 0 0 4-4 9 9 0 0 0-9-9Z"/><circle cx="7.5" cy="10" r=".6"/><circle cx="10" cy="6.5" r=".6"/><circle cx="15" cy="7" r=".6"/><circle cx="17" cy="11" r=".6"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>',
  validation: '<path d="M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="m14 20 2 2 4-4"/>',
  export: '<path d="M12 22V12"/><path d="m16 17 2 2 4-4"/><path d="M21 11.127V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.729l7 4a2 2 0 0 0 2 .001l1.32-.753"/><path d="M3.29 7 12 12l8.71-5"/><path d="m7.5 4.27 8.997 5.148"/>',
  account: '<circle cx="9" cy="8" r="4"/><path d="M3 20a6 6 0 0 1 10.5-4"/><circle cx="18" cy="18" r="2"/><path d="M18 13v1m0 8v1m5-5h-1m-8 0h-1m8.5-3.5-.7.7m-5.6 5.6-.7.7m7 0-.7-.7m-5.6-5.6-.7-.7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>'
}
cutterNavigationToggle.appendChild(makeLucideIcon(cutterIcons.panelOpen, "kyza-desktop-toggle-icon"))
const cutterBrand = document.createElement("a")
cutterBrand.className = "kyza-brand cutter-shell-brand"
cutterBrand.href = "/"
cutterBrand.setAttribute("aria-label", "Kyza dashboard")
cutterBrand.innerHTML = KYZA_LOGO_HTML
cutterHeaderLeading.append(cutterBrand)
const cutterRoutePill = document.createElement("div")
cutterRoutePill.className = "kyza-route-pill cutter-shell-route-pill"
cutterRoutePill.textContent = "Cutter Studio"
const cutterHeaderActions = document.createElement("div")
cutterHeaderActions.className = "kyza-header-actions cutter-header-actions"
const cutterThemeToggle = document.createElement("button")
cutterThemeToggle.type = "button"
cutterThemeToggle.className = "kyza-icon-button cutter-shell-icon-button"
const readCutterTheme = () => {
  try {
    const stored = window.localStorage.getItem("kyza.theme")
    return stored === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}
const applyCutterTheme = (theme: "dark" | "light") => {
  document.documentElement.dataset.kyzaTheme = theme
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  cutterThemeToggle.replaceChildren(makeLucideIcon(theme === "dark" ? cutterIcons.sun : cutterIcons.moon))
  cutterThemeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`)
  try {
    window.localStorage.setItem("kyza.theme", theme)
  } catch {
    // The active theme remains available when storage is restricted.
  }
  window.dispatchEvent(new CustomEvent("kyza-theme-change", { detail: { theme } }))
}
let cutterTheme = readCutterTheme()
cutterThemeToggle.addEventListener("click", () => {
  cutterTheme = cutterTheme === "dark" ? "light" : "dark"
  applyCutterTheme(cutterTheme)
})
applyCutterTheme(cutterTheme)
cutterHeaderActions.appendChild(cutterThemeToggle)
cutterGlobalHeader.append(cutterHeaderLeading, cutterRoutePill, cutterHeaderActions)

const cutterWorkspaceShell = document.createElement("div")
cutterWorkspaceShell.className = "kyza-workspace cutter-shell-workspace"
const cutterPrimaryNavigation = document.createElement("aside")
cutterPrimaryNavigation.id = "kyza-navigation"
cutterPrimaryNavigation.className = "kyza-navigation cutter-primary-navigation"
const cutterNavigation = document.createElement("nav")
cutterNavigation.setAttribute("aria-label", "Primary navigation")
const cutterNavigationGroups = [
  { label: "Workspace", items: [{ label: "Dashboard", icon: cutterIcons.gauge, href: "/" }] },
  { label: "Create", items: [
    { label: "Cutter Studio", icon: cutterIcons.scissors, href: studioNavigationHref(), active: true },
    { label: "Artwork Studio", icon: cutterIcons.palette, href: "/artwork" }
  ] },
  { label: "QC & Export", items: [
    { label: "Validation Centre", icon: cutterIcons.validation, href: "/validation" },
    { label: "Export Release", icon: cutterIcons.export, href: "/cutter#save-export" }
  ] },
  { label: "User", items: [{ label: "Accounts & Preferences", icon: cutterIcons.account, href: "/account" }] }
]
cutterNavigationGroups.forEach(group => {
  const section = document.createElement("section")
  section.className = "kyza-navigation-group"
  section.setAttribute("aria-label", group.label)
  const groupLabel = document.createElement("div")
  groupLabel.className = "kyza-navigation-group-label"
  groupLabel.textContent = group.label
  const items = document.createElement("div")
  items.className = "kyza-navigation-items"
  group.items.forEach(item => {
    const link = document.createElement("a")
    link.className = `kyza-navigation-item cutter-navigation-item${item.active ? " is-active" : ""}`
    link.href = item.href
    link.setAttribute("aria-label", item.label)
    link.setAttribute("title", item.label)
    if (item.active) link.setAttribute("aria-current", "page")
    const icon = makeLucideIcon(item.icon, "kyza-navigation-icon cutter-navigation-icon")
    const label = document.createElement("span")
    label.className = "kyza-navigation-label cutter-navigation-label"
    label.textContent = item.label
    link.append(icon, label)
    items.appendChild(link)
  })
  section.append(groupLabel, items)
  cutterNavigation.appendChild(section)
})
cutterNavigationToggle.classList.add("kyza-rail-toggle")
cutterNavigationToggle.setAttribute("aria-controls", "kyza-navigation")
cutterPrimaryNavigation.append(cutterNavigation, cutterNavigationToggle)
const cutterShellMain = document.createElement("main")
cutterShellMain.id = "cutter-shell-main"
cutterShellMain.className = "kyza-main cutter-shell-main"
const cutterProjectTabs = document.createElement("div")
cutterProjectTabs.className = "cutter-project-tabs"
const cutterTabActions = document.createElement("div")
cutterTabActions.className = "cutter-tab-actions"
cutterTabActions.setAttribute("aria-label", "Cutter workspace actions")
cutterWorkspaceShell.append(cutterPrimaryNavigation, cutterShellMain)
cutterAppFrame.append(cutterGlobalHeader, cutterWorkspaceShell)

cutterNavigationToggle.addEventListener("click", () => {
  const expanded = cutterPrimaryNavigation.classList.toggle("is-expanded")
  cutterNavigationToggle.replaceChildren(makeLucideIcon(expanded ? cutterIcons.panelClose : cutterIcons.panelOpen, "kyza-desktop-toggle-icon"))
  cutterNavigationToggle.setAttribute("aria-expanded", String(expanded))
  cutterNavigationToggle.setAttribute("aria-label", expanded ? "Collapse navigation" : "Expand navigation")
})

const controls = document.createElement("div")
controls.id = "controls"

const controlsBody = document.createElement("div")

controls.appendChild(controlsBody)

const rightRail = document.createElement("div")
rightRail.id = "right-rail"
const mainButton = document.createElement("button")
mainButton.type = "button"
mainButton.className = "right-rail-button is-main"
mainButton.setAttribute("title", "Main")
const mainIcon = createKyzaMarkIcon()
mainIcon.classList.add("studio-menu-icon")
const mainLabel = document.createElement("span")
mainLabel.className = "right-rail-label"
mainLabel.textContent = "Main"
mainButton.appendChild(mainIcon)
mainButton.appendChild(mainLabel)

const customButton = document.createElement("button")
customButton.type = "button"
customButton.className = "right-rail-button"
customButton.setAttribute("title", "Customisation Panel")
customButton.setAttribute("aria-label", "Customise")
customButton.appendChild(makeLucideIcon('<path d="m14 5 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16Z"/><path d="M4 4v4m-2-2h4M19 16v4m-2-2h4"/>', "studio-menu-icon"))
const customLabel = document.createElement("span")
customLabel.className = "right-rail-label"
customLabel.textContent = "Customise"
customButton.appendChild(customLabel)

const makeInspectorRailButton = (label: string) => {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "right-rail-button"
  button.setAttribute("title", label)
  button.setAttribute("aria-label", label)
  const paths = label === "Base" ? '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9h16M9 9v11"/>'
    : label === "Elements" ? '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M17.5 14v7M14 17.5h7"/>'
    : '<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>'
  button.appendChild(makeLucideIcon(paths, "studio-menu-icon"))
  const buttonLabel = document.createElement("span")
  buttonLabel.className = "right-rail-label"
  buttonLabel.textContent = label
  button.appendChild(buttonLabel)
  return button
}
const baseRailButton = makeInspectorRailButton("Base")
const attributesRailButton = makeInspectorRailButton("Elements")
const layersRailButton = makeInspectorRailButton("Layers")
rightRail.appendChild(baseRailButton)
rightRail.appendChild(attributesRailButton)
rightRail.appendChild(customButton)
rightRail.appendChild(layersRailButton)

const baseModelPanelHost = document.createElement("div")
baseModelPanelHost.id = "base-model-panel"
baseModelPanelHost.className = "side-panel-section"

const attributesPanelHost = document.createElement("div")
attributesPanelHost.id = "attributes-panel"
attributesPanelHost.className = "side-panel-section"

const layersPanelHost = document.createElement("div")
layersPanelHost.id = "layers-panel"
layersPanelHost.className = "side-panel-section"

const mainMenu = document.createElement("div")
mainMenu.id = "right-rail-menu"
mainMenu.className = "right-rail-menu"
const mainMenuItems = [
  { id: "new-project", label: "New Project" },
  { id: "import", label: "Import" },
  { id: "save-as", label: "Save As / Export" },
  { id: "save", label: "Save" },
  { id: "settings", label: "Settings" },
  { id: "preferences", label: "Preferences" }
]
mainMenuItems.forEach(item => {
  const menuButton = document.createElement("button")
  menuButton.type = "button"
  menuButton.className = "right-rail-menu-item"
  menuButton.textContent = item.label
  menuButton.addEventListener("click", () => {
    if (item.id === "new-project") {
      const artboard = createArtboard()
      setActiveArtboard(artboard.id)
    }
    if (item.id === "save") {
      saveCurrentProject()
    }
    if (item.id === "save-as") {
      saveCurrentProjectAs()
    }
    console.log(`main-menu:${item.id}`)
    mainMenu.classList.remove("is-open")
  })
  mainMenu.appendChild(menuButton)
})
rightRail.appendChild(mainMenu)
let saveCurrentProject: () => Promise<void> = async () => {}
let saveCurrentProjectAs: () => Promise<void> = async () => {}
const customPanelApi = initCustomisationPanel({
  host: controls,
  onChange: next => {
    commitActiveProjectSpec(next, "customisation-edit", {
      syncControls: true,
      renderNext: true
    })
  },
  getCurrentSvg: () =>
    previewCanvas.querySelector("svg") instanceof SVGSVGElement
      ? (previewCanvas.querySelector("svg") as SVGSVGElement)
      : null,
  getCurrentProjectName: () => getActiveArtboard()?.name ?? "CutterGuide"
  ,
  getCurrentProject: () => getActiveArtboard()?.project ?? null,
  onSaveProject: () => saveCurrentProject(),
  onSaveAsProject: () => saveCurrentProjectAs(),
  onProjectEvidenceUpdated: (project, expectedRevision) =>
    persistActiveProjectEvidence(project, expectedRevision),
  onViewValidationElement: affectedElementId => viewValidationElement(affectedElementId),
  onReturnToCutter: () => focusCutterCanvas(),
  onShowPerforations: () => {
    openInspectorPanel("attributes")
    controlsApi?.showPerforationsMenu()
  },
  onShowMeasures: () => {
    openInspectorPanel("base")
    const heading = Array.from(baseModelPanelHost.querySelectorAll("h2")).find(item => item.textContent === "Measures")
    heading?.closest("section")?.scrollIntoView({ block: "nearest" })
  }
})
customPanelApi.element.classList.remove("is-open")

const sidePanel = document.createElement("div")
sidePanel.id = "side-panel"
sidePanel.setAttribute("aria-label", "Cutter inspector")
const sidePanelClose = document.createElement("button")
sidePanelClose.type = "button"
sidePanelClose.className = "inspector-panel-close"
sidePanelClose.setAttribute("aria-label", "Close panel")
sidePanelClose.textContent = "×"
const sideTabs = document.createElement("div")
sideTabs.className = "side-panel-tabs"
sideTabs.setAttribute("role", "tablist")
sideTabs.setAttribute("aria-label", "Cutter inspector sections")
const sideBody = document.createElement("div")
sideBody.className = "side-panel-body"
const inspectorHeader = document.createElement("div")
inspectorHeader.className = "side-panel-header"
const inspectorTitle = document.createElement("h2")
inspectorTitle.textContent = "Base"
inspectorHeader.append(inspectorTitle, sidePanelClose)
sidePanel.appendChild(inspectorHeader)
sidePanel.appendChild(sideTabs)
sidePanel.appendChild(sideBody)

const baseTabButton = document.createElement("button")
baseTabButton.type = "button"
baseTabButton.className = "side-panel-tab is-active"
baseTabButton.textContent = "Base"
baseTabButton.setAttribute("role", "tab")
baseTabButton.setAttribute("aria-controls", "base-model-panel")
const layersTabButton = document.createElement("button")
layersTabButton.type = "button"
layersTabButton.className = "side-panel-tab"
layersTabButton.textContent = "Layers"
layersTabButton.setAttribute("role", "tab")
layersTabButton.setAttribute("aria-controls", "layers-panel")
const attributesTabButton = document.createElement("button")
attributesTabButton.type = "button"
attributesTabButton.className = "side-panel-tab"
attributesTabButton.textContent = "Elements"
attributesTabButton.setAttribute("role", "tab")
attributesTabButton.setAttribute("aria-controls", "attributes-panel")

sideTabs.appendChild(baseTabButton)
sideTabs.appendChild(layersTabButton)
sideTabs.appendChild(attributesTabButton)

sideBody.appendChild(baseModelPanelHost)
sideBody.appendChild(layersPanelHost)
sideBody.appendChild(attributesPanelHost)

const setSideTab = (tabId: "base" | "layers" | "attributes") => {
  inspectorTitle.textContent = tabId === "base" ? "Base" : tabId === "layers" ? "Layers" : "Elements"
  baseTabButton.classList.toggle("is-active", tabId === "base")
  layersTabButton.classList.toggle("is-active", tabId === "layers")
  attributesTabButton.classList.toggle("is-active", tabId === "attributes")
  baseTabButton.setAttribute("aria-selected", String(tabId === "base"))
  layersTabButton.setAttribute("aria-selected", String(tabId === "layers"))
  attributesTabButton.setAttribute("aria-selected", String(tabId === "attributes"))
  baseModelPanelHost.classList.toggle("is-active", tabId === "base")
  layersPanelHost.classList.toggle("is-active", tabId === "layers")
  attributesPanelHost.classList.toggle("is-active", tabId === "attributes")
}

baseTabButton.addEventListener("click", () => setSideTab("base"))
layersTabButton.addEventListener("click", () => setSideTab("layers"))
attributesTabButton.addEventListener("click", () => setSideTab("attributes"))

setSideTab("base")
controls.appendChild(sidePanel)
controls.appendChild(rightRail)

const inspectorRailButtons = [baseRailButton, attributesRailButton, customButton, layersRailButton]
let activeInspectorPanel: "base" | "attributes" | "customise" | "layers" | null = null
const closeInspectorPanels = () => {
  customPanelApi.element.classList.remove("is-open", "is-file-mode")
  sidePanel.classList.remove("is-open")
  studioSaveExportButton?.classList.remove("is-active")
  activeInspectorPanel = null
  inspectorRailButtons.forEach(button => {
    button.classList.remove("is-active")
    button.setAttribute("aria-pressed", "false")
    button.setAttribute("aria-expanded", "false")
  })
}
const openInspectorPanel = (panel: "base" | "attributes" | "customise" | "layers") => {
  if (activeInspectorPanel === panel) {
    closeInspectorPanels()
    return
  }
  const opensCustomise = panel === "customise"
  const openPanel = opensCustomise ? customPanelApi.element : sidePanel
  const railRect = rightRail.getBoundingClientRect()
  const panelWidth = openPanel.offsetWidth || (opensCustomise ? 280 : 310)
  openPanel.style.left = `${Math.max(16, railRect.left - panelWidth - 14)}px`
  openPanel.style.right = "auto"
  customPanelApi.element.classList.toggle("is-open", opensCustomise)
  if (opensCustomise) {
    customPanelApi.showCustomise()
  }
  sidePanel.classList.toggle("is-open", !opensCustomise)
  activeInspectorPanel = panel
  if (!opensCustomise) {
    setSideTab(panel)
  }
  inspectorRailButtons.forEach(button => {
    const active = button === (
      panel === "base" ? baseRailButton
        : panel === "attributes" ? attributesRailButton
          : panel === "layers" ? layersRailButton
            : customButton
    )
    button.classList.toggle("is-active", active)
    button.setAttribute("aria-pressed", String(active))
    button.setAttribute("aria-expanded", String(active))
  })
}
sidePanelClose.addEventListener("click", closeInspectorPanels)
customPanelApi.element.addEventListener("custom-panel-close", () => {
  studioSaveExportButton.classList.remove("is-active")
  activeInspectorPanel = null
  inspectorRailButtons.forEach(button => {
    button.classList.remove("is-active")
    button.setAttribute("aria-expanded", "false")
    button.setAttribute("aria-pressed", "false")
  })
})
baseRailButton.addEventListener("click", () => openInspectorPanel("base"))
attributesRailButton.addEventListener("click", () => openInspectorPanel("attributes"))
customButton.addEventListener("click", () => openInspectorPanel("customise"))
layersRailButton.addEventListener("click", () => openInspectorPanel("layers"))

const toggleMainMenu = (next?: boolean) => {
  const isOpen = mainMenu.classList.contains("is-open")
  const open = next ?? !isOpen
  mainMenu.classList.toggle("is-open", open)
}
mainButton.addEventListener("click", event => {
  event.stopPropagation()
  toggleMainMenu()
})
document.addEventListener("pointerdown", event => {
  if (!mainMenu.classList.contains("is-open")) {
    return
  }
  if (event.target instanceof Node) {
    if (mainMenu.contains(event.target) || mainButton.contains(event.target)) {
      return
    }
  }
  toggleMainMenu(false)
})

const preview = document.createElement("div")
preview.id = "preview"
const artboardTabs = document.createElement("div")
artboardTabs.id = "artboard-tabs"
// The preview already has a CSS background. The old video/poster files were
// never shipped and requested missing resources on every deployed cutter page.
const previewBackground = document.createElement("div")
previewBackground.className = "preview-bg-video"
previewBackground.setAttribute("aria-hidden", "true")
previewBackground.setAttribute("tabindex", "-1")
const previewFrame = document.createElement("div")
previewFrame.id = "preview-frame"
const previewReturnButton = document.createElement("button")
previewReturnButton.type = "button"
previewReturnButton.id = "preview-return"
previewReturnButton.setAttribute("aria-label", "Return to cutter view")
previewReturnButton.setAttribute("title", "Return")
previewReturnButton.innerHTML = "<span aria-hidden=\"true\">&#8592;</span>"
const previewCanvas = document.createElement("div")
previewCanvas.id = "preview-canvas"
const studioTopbar = document.createElement("div")
studioTopbar.id = "studio-topbar"
const studioTopbarLeft = document.createElement("div")
studioTopbarLeft.className = "studio-topbar-left"
const studioHomeButton = document.createElement("button")
studioHomeButton.type = "button"
studioHomeButton.className = "studio-topbar-button"
studioHomeButton.classList.add("studio-return-button")
studioHomeButton.setAttribute("aria-label", "Return to Cutter Studio start page")
studioHomeButton.title = "Return to Cutter Studio start page"
studioHomeButton.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m10 6-6 6 6 6M4 12h16"/></svg><span>Return</span>'
const studioBadge = document.createElement("span")
studioBadge.className = "studio-topbar-badge"
studioBadge.textContent = "Cutter Studio"
const studioTopbarRight = document.createElement("div")
studioTopbarRight.className = "studio-topbar-right"
const artworkStudioButton = document.createElement("button")
artworkStudioButton.type = "button"
artworkStudioButton.className = "studio-topbar-text-button"
artworkStudioButton.textContent = "Continue to Artwork Studio"
artworkStudioButton.disabled = true
studioTopbarRight.appendChild(artworkStudioButton)
const studioActionButtons = new Map<string, HTMLButtonElement>()
const errorsPanel = document.createElement("div")
errorsPanel.id = "studio-errors-panel"
const errorsPanelHeader = document.createElement("div")
errorsPanelHeader.className = "studio-errors-header"
errorsPanelHeader.textContent = "Validation Centre"
const errorsPanelClose = document.createElement("button")
errorsPanelClose.type = "button"
errorsPanelClose.className = "studio-errors-close"
errorsPanelClose.setAttribute("aria-label", "Close validation")
errorsPanelClose.textContent = "×"
errorsPanelClose.addEventListener("click", () => {
  flowDock.collapse()
})
errorsPanel.setAttribute("role", "region")
errorsPanel.setAttribute("aria-label", "Cutter validation results")
errorsPanel.addEventListener("keydown", event => {
  if (event.key === "Escape") errorsPanelClose.click()
})
const errorsPanelList = document.createElement("div")
errorsPanelList.className = "studio-errors-list"
errorsPanel.appendChild(errorsPanelHeader)
errorsPanel.appendChild(errorsPanelClose)
errorsPanel.appendChild(errorsPanelList)
const flowDock = createFlowAssistantDock(errorsPanel)
STUDIO_TOPBAR_ACTIONS.forEach(action => {
  const actionButton = document.createElement("button")
  actionButton.type = "button"
  applyIconSwapButton(actionButton, action.label, action.icon)
  actionButton.dataset.actionId = action.id
  studioActionButtons.set(action.id, actionButton)
  actionButton.addEventListener("click", () => {
    if (action.id === "preview") {
      setPreviewMode(!previewMode)
      return
    }
    console.log(`studio-topbar:${action.id}`)
  })
  studioTopbarRight.appendChild(actionButton)
})
studioActionButtons.forEach(actionButton => {
  if (actionButton.dataset.actionId === "product-spec") {
    return
  }
  if (actionButton.dataset.actionId === "user") {
    cutterHeaderActions.insertBefore(actionButton, cutterThemeToggle)
    return
  }
  cutterTabActions.appendChild(actionButton)
})
studioTopbarLeft.appendChild(studioHomeButton)
studioTopbarLeft.appendChild(studioBadge)
studioTopbar.appendChild(studioTopbarLeft)
studioTopbar.appendChild(studioTopbarRight)
const studioProjectStrip = document.createElement("section")
studioProjectStrip.id = "studio-project-strip"
studioProjectStrip.setAttribute("aria-label", "Active cutter project status")
const studioProjectName = document.createElement("strong")
studioProjectName.id = "studio-project-name"
const studioProjectPack = document.createElement("span")
studioProjectPack.id = "studio-project-pack"
const studioProjectValidation = document.createElement("span")
studioProjectValidation.id = "studio-project-validation"
const studioProjectIssues = document.createElement("span")
studioProjectIssues.id = "studio-project-issues"
const studioProjectStock = document.createElement("span")
studioProjectStock.id = "studio-project-stock"
studioProjectStrip.append(studioProjectName, studioProjectPack, studioProjectValidation, studioProjectIssues, studioProjectStock)

const studioBottomActions = document.createElement("div")
studioBottomActions.id = "studio-bottom-actions"
const makeStudioBottomAction = (label: string, paths: string) => {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "studio-bottom-action"
  button.appendChild(makeLucideIcon(paths, "studio-action-icon"))
  const caption = document.createElement("span")
  caption.textContent = label
  button.appendChild(caption)
  return button
}
const studioPackSpecButton = makeStudioBottomAction("Pack Spec", '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6M8 12h8M8 16h5"/>')
const studioImportButton = makeStudioBottomAction("Import Assets", '<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>')
const studioSaveExportButton = makeStudioBottomAction("Export", '<path d="M12 15V3m-5 5 5-5 5 5M4 15v5h16v-5"/>')
const studioLegendButton = makeStudioBottomAction("Legend", '<path d="M4 5h16M4 10h16M4 15h16M4 20h11"/>')
studioLegendButton.setAttribute("aria-label", "Legend layouts")
studioLegendButton.setAttribute("aria-expanded", "false")
const studioLegendMenu = document.createElement("div")
studioLegendMenu.id = "studio-legend-menu"
studioLegendMenu.setAttribute("role", "menu")
studioLegendMenu.hidden = true
for (const orientation of ["portrait", "landscape"] as const) {
  const option = document.createElement("button")
  option.type = "button"
  option.setAttribute("role", "menuitem")
  option.textContent = `${orientation[0].toUpperCase()}${orientation.slice(1)} Kyza legend`
  option.addEventListener("click", () => {
    const spec = getActiveArtboard()?.spec ?? currentSpec
    if (spec) commitActiveProjectSpec({ ...spec, cutterLegend: true, cutterLegendOrientation: orientation, cutterLegendPosition: "right" }, "canvas-interaction", { renderNext: true })
    studioLegendMenu.hidden = true
    studioLegendButton.setAttribute("aria-expanded", "false")
  })
  studioLegendMenu.appendChild(option)
}
const hideLegendOption = document.createElement("button")
hideLegendOption.type = "button"
hideLegendOption.setAttribute("role", "menuitem")
hideLegendOption.textContent = "Hide legend"
hideLegendOption.addEventListener("click", () => {
  const spec = getActiveArtboard()?.spec ?? currentSpec
  if (spec) commitActiveProjectSpec({ ...spec, cutterLegend: false }, "canvas-interaction", { renderNext: true })
  studioLegendMenu.hidden = true
  studioLegendButton.setAttribute("aria-expanded", "false")
})
studioLegendMenu.appendChild(hideLegendOption)
studioLegendButton.addEventListener("click", () => {
  studioLegendMenu.hidden = !studioLegendMenu.hidden
  studioLegendButton.setAttribute("aria-expanded", String(!studioLegendMenu.hidden))
})
studioImportButton.addEventListener("click", () => console.log("main-menu:import"))
studioSaveExportButton.addEventListener("click", () => {
  closeInspectorPanels()
  customPanelApi.showFile()
  customPanelApi.element.classList.add("is-open", "is-file-mode")
  studioSaveExportButton.classList.add("is-active")
})
const studioLegendControl = document.createElement("div")
studioLegendControl.id = "studio-legend-control"
studioLegendControl.append(studioLegendButton, studioLegendMenu)
studioBottomActions.append(studioLegendControl, studioImportButton, studioPackSpecButton, studioSaveExportButton)
const packSpecDialog = document.createElement("div")
packSpecDialog.id = "pack-spec-dialog"
packSpecDialog.className = "pack-spec-dialog"
packSpecDialog.setAttribute("role", "dialog")
packSpecDialog.setAttribute("aria-modal", "true")
packSpecDialog.setAttribute("aria-labelledby", "pack-spec-dialog-title")
const packSpecCard = document.createElement("section")
packSpecCard.className = "pack-spec-card"
const packSpecHeader = document.createElement("header")
packSpecHeader.className = "pack-spec-header"
const packSpecTitle = document.createElement("h2")
packSpecTitle.id = "pack-spec-dialog-title"
packSpecTitle.textContent = "Pack specification"
const packSpecClose = document.createElement("button")
packSpecClose.type = "button"
packSpecClose.className = "pack-spec-close"
packSpecClose.setAttribute("aria-label", "Close pack specification")
packSpecClose.textContent = "×"
packSpecHeader.append(packSpecTitle, packSpecClose)
const packSpecList = document.createElement("dl")
packSpecList.className = "pack-spec-summary"
const packSpecValues = new Map<string, HTMLElement>()
;["Project name", "Pack type", "Cutter size", "Eyemarks"].forEach(label => {
  const row = document.createElement("div")
  row.className = "pack-spec-row"
  const term = document.createElement("dt")
  term.textContent = label
  const value = document.createElement("dd")
  value.textContent = "—"
  packSpecValues.set(label, value)
  row.append(term, value)
  packSpecList.appendChild(row)
})
packSpecCard.append(packSpecHeader, packSpecList)
packSpecDialog.appendChild(packSpecCard)
let packSpecReturnFocus: HTMLElement | null = null
const closePackSpecDialog = () => {
  packSpecDialog.classList.remove("is-open")
  packSpecReturnFocus?.focus()
  packSpecReturnFocus = null
}
const openPackSpecDialog = () => {
  const active = getActiveArtboard()
  const spec = active?.spec ?? currentSpec
  const activePack = active?.packId ? getPackModule(active.packId) : null
  packSpecValues.get("Project name")!.textContent = active?.name ?? "Untitled project"
  packSpecValues.get("Pack type")!.textContent = activePack?.name ?? "Not selected"
  packSpecValues.get("Cutter size")!.textContent = spec
    ? `${Math.round(spec.width)} × ${Math.round(spec.height)} mm`
    : "Not available"
  packSpecValues.get("Eyemarks")!.textContent = String(spec?.eyeMarks?.count ?? 0)
  packSpecReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  packSpecDialog.classList.add("is-open")
  packSpecClose.focus()
}
studioPackSpecButton.addEventListener("click", openPackSpecDialog)
packSpecClose.addEventListener("click", closePackSpecDialog)
packSpecDialog.addEventListener("click", event => {
  if (event.target === packSpecDialog) closePackSpecDialog()
})
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && packSpecDialog.classList.contains("is-open")) {
    closePackSpecDialog()
  }
})
const startOverlay = document.createElement("div")
startOverlay.id = "start-overlay"
startOverlay.className = "start-overlay is-visible"
const startSelect = document.createElement("select")
startSelect.className = "start-select-hidden"
packModules.forEach(packModule => {
  const option = document.createElement("option")
  option.value = packModule.id
  option.textContent = packModule.name
  startSelect.appendChild(option)
})
let selectedStartPackId = packModules.some(module => module.id === "plain-film") ? "plain-film" : packModules[0]?.id ?? ""
startSelect.value = selectedStartPackId
const startButton = document.createElement("button")
startButton.type = "button"
startButton.className = "start-primary-button start-pack-create"
startButton.setAttribute("data-action", "start-project")
startButton.textContent = "Start Project"

const startShell = document.createElement("div")
startShell.className = "start-shell"

const startTopbar = document.createElement("div")
startTopbar.className = "start-topbar"
const topbarLeft = document.createElement("div")
topbarLeft.className = "start-topbar-left"
const homeButton = document.createElement("button")
homeButton.type = "button"
homeButton.className = "start-icon-button"
applyHomeIconButton(homeButton)
topbarLeft.appendChild(homeButton)
const topbarRight = document.createElement("div")
topbarRight.className = "start-topbar-right"
startTopbar.appendChild(topbarLeft)
startTopbar.appendChild(topbarRight)

const startBody = document.createElement("div")
startBody.className = "start-body"

const startSidebar = document.createElement("aside")
startSidebar.className = "start-sidebar"

const projectHeader = document.createElement("div")
projectHeader.className = "start-section-header"
const projectTitle = document.createElement("h2")
projectTitle.className = "start-studio-title"
projectTitle.textContent = "Cutter Studio"
const customProjectButton = document.createElement("button")
customProjectButton.type = "button"
customProjectButton.className = "start-pill"
customProjectButton.textContent = "Sandbox Mode"
customProjectButton.title = "Open a sandbox cutter for trials and bespoke project work"
projectHeader.appendChild(projectTitle)

const resumeWorkButton=document.createElement("button")
resumeWorkButton.type="button";resumeWorkButton.className="start-pill resume-work-button";resumeWorkButton.textContent="Resume Work";resumeWorkButton.hidden=true
resumeWorkButton.addEventListener("click",()=>{const active=getActiveArtboard();if(!active?.started || !active.spec)return;hideStartOverlay();render(active.spec)})


const packHeader = document.createElement("h2")
packHeader.className = "start-pack-heading"
packHeader.textContent = "Get Started"
const packCarousel = createStudioPackCarousel({
  packs: packModules,
  initialPackId: selectedStartPackId,
  createButton: startButton,
  onSelect: packId => setSelectedStartPack(packId)
})
startButton.className = "create"
const setSelectedStartPack = (packId: string) => {
  const resolvedPackId = getPackModule(packId)?.id ?? packModules[0]?.id ?? ""
  if (!resolvedPackId) return
  selectedStartPackId = resolvedPackId
  startSelect.value = resolvedPackId
  packCarousel.select(resolvedPackId)
  const selectedPack = getPackModule(resolvedPackId)
  if (selectedPack) {
    startButton.textContent = "Create"
    startButton.setAttribute("aria-label", `Create ${selectedPack.name} cutter guide`)
  }
  const active = getActiveArtboard()
  if (active && !active.started) {
    active.packId = resolvedPackId
    updateArtboardTabs()
  }
}

const applyMeasureDefaultsForPack = (packId: string) => {
  if (typeof document === "undefined") {
    return
  }
  const sachetPackIds = new Set(["sachet-3-side-seal"])
  document.documentElement.setAttribute("data-main-measures", "true")
  if (document.documentElement.getAttribute("data-sub-measures-user-set") === "true") return
  if (sachetPackIds.has(packId)) {
    document.documentElement.setAttribute("data-sub-measures", "true")
    return
  }
  document.documentElement.setAttribute("data-sub-measures", "false")
}

const saveArtboardToLibrary = (artboard: Artboard, name: string, forceReplaceId?: string) => {
  if (!artboard.spec) {
    return
  }
  if (!artboard.project && !initialiseArtboardProject(artboard, artboard.spec, "save-load")) {
    return
  }
  if (!updateArtboardProjectName(artboard, name, "save-load") || !artboard.project) {
    return
  }
  const versionedSave = saveKyzaProject(artboard.project)
  if (versionedSave.ok === false) {
    console.warn("[Kyza][Project Storage] Versioned save failed.", versionedSave.errors)
  }
  const nowIso = artboard.project.updatedAt
  const replaceId = forceReplaceId ?? artboard.savedProjectId
  if (replaceId) {
    const existing = savedProjectCards.find(item => item.id === replaceId)
    if (existing) {
      existing.name = name
      existing.packId = artboard.packId
      existing.spec = cloneSpec(artboard.spec) as FlowwrapSpec
      existing.project = artboard.project
      existing.updatedAt = nowIso
      artboard.savedProjectId = existing.id
      artboard.name = name
      persistSavedProjectCards()
      renderSavedProjectCards()
      updateArtboardTabs()
      return
    }
  }
  const card: SavedProjectCard = {
    id: `saved-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    name,
    packId: artboard.packId,
    spec: cloneSpec(artboard.spec) as FlowwrapSpec,
    project: artboard.project,
    updatedAt: nowIso
  }
  savedProjectCards = [card, ...savedProjectCards]
  artboard.savedProjectId = card.id
  artboard.name = name
  persistSavedProjectCards()
  renderSavedProjectCards()
  updateArtboardTabs()
}

saveCurrentProject = async () => {
  const active = getActiveArtboard()
  if (!active || !active.spec) {
    return
  }
  if (active.savedProjectId) {
    saveArtboardToLibrary(active, active.name, active.savedProjectId)
    return
  }
  await saveCurrentProjectAs()
}

saveCurrentProjectAs = async () => {
  const active = getActiveArtboard()
  if (!active || !active.spec) {
    return
  }
  const entered = window.prompt("Save project as", active.name)
  if (!entered) {
    return
  }
  const nextName = entered.trim()
  if (!nextName) {
    return
  }
  const duplicate = savedProjectCards.find(
    item => item.name.toLowerCase() === nextName.toLowerCase() && item.id !== active.savedProjectId
  )
  if (duplicate) {
    const replace = window.confirm(
      `A project named \"${nextName}\" already exists.\nOK = Save and replace\nCancel = Rename or don't save`
    )
    if (replace) {
      saveArtboardToLibrary(active, nextName, duplicate.id)
      return
    }
    const rename = window.prompt("Enter a different project name", `${nextName} Copy`)
    if (!rename || !rename.trim()) {
      return
    }
    saveArtboardToLibrary(active, rename.trim())
    return
  }
  saveArtboardToLibrary(active, nextName)
}

const launchSelectedPackProject = () => {
  let active = getActiveArtboard()
  if (!active || active.started || active.sandbox) {
    active = createArtboard()
    activeArtboardId = active.id
    updateArtboardTabs()
  }
  active.packId = selectedStartPackId || startSelect.value
  const nextPack = getPackModule(active.packId) ?? packModules[0]
  if (!nextPack) {
    return
  }

  // Future AI-built screens should call the Engine API bridge with
  // structured requests rather than duplicating pack rules in the UI.
  const bridgeResponse = runEngineRequest({
    requestId: `pack-start-${active.id}`,
    engine: "pack-generator",
    action: "generatePack",
    payload: {
      packId: nextPack.id
    },
    meta: {
      source: "cutter-ui-start-project"
    }
  })
  const bridgeSpec = bridgeResponse.success
    ? bridgeResponse.updatedState?.spec
    : null

  pack = nextPack
  applyMeasureDefaultsForPack(nextPack.id)
  const nextSpec = bridgeSpec ?? pack.getDefaults()
  const initialisedSpec = initialiseArtboardProject(active, nextSpec, "pack-created")
  if (!initialisedSpec) {
    return
  }
  active.started = true
  active.savedProjectId = undefined
  active.viewBoxState = { zoom: 1, panX: 0, panY: 0 }
  viewBoxState = { ...active.viewBoxState }
  currentSpec = initialisedSpec
  logCutterDebugState("cutter-state-reset", currentSpec, {
    packId: nextPack.id,
    artboardId: active.id,
    defaultsApplied: true,
    hasUserModifiedState: false
  })
  updateArtboardTabs()
  controlsApi?.syncSpecFromProject(currentSpec)
  customPanelApi.setSpec(currentSpec)
  hideStartOverlay()
  render(currentSpec)
  if (nextPack.id === "lidding") {
    liddingSetupCleanup?.()
    liddingSetupCleanup = openLiddingSetup(previewFrame, currentSpec, next => {
      liddingSetupCleanup = null
      commitActiveProjectSpec(next, "canvas-interaction", { syncControls: true, renderNext: true })
    })
  }
}

startSidebar.appendChild(projectHeader)
startSidebar.appendChild(createStudioGuide())

const startMain = document.createElement("main")
startMain.className = "start-main"
const startPackSection = document.createElement("section")
startPackSection.className = "start-pack-section"
const startPackIntro = document.createElement("p")
startPackIntro.className = "start-pack-intro"
startPackIntro.textContent = "Choose a pack, import a cutter, or tell Kyza what you need."
startPackSection.append(packHeader, startPackIntro, packCarousel.element)
const mainHeader = document.createElement("div")
mainHeader.className = "start-main-header"
const mainTitle = document.createElement("h2")
mainTitle.textContent = "Recent projects"
mainHeader.appendChild(mainTitle)
const allProjectsLink = document.createElement("a")
allProjectsLink.className = "start-all-projects-link"
allProjectsLink.href = "/"
allProjectsLink.textContent = "View all on dashboard →"
mainHeader.appendChild(allProjectsLink)

const startGrid = document.createElement("div")
startGrid.className = "start-grid is-empty"

function openSavedProjectCard(cardId: string) {
  const card = savedProjectCards.find(item => item.id === cardId)
  if (!card) {
    return
  }
  let active = getActiveArtboard()
  if (!active) {
    active = createArtboard()
    activeArtboardId = active.id
    updateArtboardTabs()
  }
  active.project = card.project
  active.packId = card.project.cutter.packType
  active.name = card.project.name
  const loadedSpec = synchroniseArtboardProject(active, "save-load")
  active.started = true
  active.savedProjectId = card.id
  active.viewBoxState = { zoom: 1, panX: 0, panY: 0 }
  const nextPack = getPackModule(active.packId) ?? packModules[0]
  if (!nextPack || !loadedSpec) {
    return
  }
  pack = nextPack
  applyMeasureDefaultsForPack(nextPack.id)
  viewBoxState = { ...active.viewBoxState }
  currentSpec = loadedSpec
  updateArtboardTabs()
  controlsApi?.syncSpecFromProject(currentSpec)
  customPanelApi.setSpec(currentSpec)
  hideStartOverlay()
  render(currentSpec)
}

function renderSavedProjectCards() {
  startGrid.innerHTML = ""
  openStartCardMenu = null
  if (savedProjectCards.length === 0) {
    startGrid.classList.add("is-empty")
    return
  }
  startGrid.classList.remove("is-empty")
  const sorted = [...savedProjectCards].sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : -1
  )
  sorted.slice(0, 3).forEach(card => {
    const item = document.createElement("article")
    item.className = "start-file-card"
    const openButton = document.createElement("button")
    openButton.type = "button"
    openButton.className = "start-file-card-open"
    openButton.setAttribute("aria-label", `Open ${card.name}`)
    const projectGlyph = document.createElement("span")
    projectGlyph.className = "start-file-card-glyph"
    projectGlyph.setAttribute("aria-hidden", "true")
    try {
      const preview = getPackModule(card.packId)?.render(card.spec as never, { renderMode: "artwork" })
      if (preview) {
        preview.removeAttribute("width")
        preview.removeAttribute("height")
        preview.setAttribute("aria-hidden", "true")
        preview.setAttribute("focusable", "false")
        // Thumbnails must not share canvas IDs or interaction selectors with the live cutter.
        const prefix = `recent-${card.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-`
        for (const node of [preview, ...preview.querySelectorAll<SVGElement>("*")]) {
          if (node.id) node.id = prefix + node.id
          for (const attribute of [...node.attributes]) {
            if (attribute.name.startsWith("data-")) node.removeAttribute(attribute.name)
            else if (attribute.name !== "id") {
              let value = attribute.value.replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
              if ((attribute.name === "href" || attribute.name === "xlink:href") && value.startsWith("#")) value = `#${prefix}${value.slice(1)}`
              node.setAttribute(attribute.name, value)
            }
          }
        }
        projectGlyph.appendChild(preview)
      }
    } catch { projectGlyph.appendChild(makeLucideIcon(cutterIcons.box)) }
    const projectDetails = document.createElement("span")
    projectDetails.className = "start-file-card-details"
    const nameOverlay = document.createElement("span")
    nameOverlay.className = "start-file-card-name-overlay"
    nameOverlay.textContent = card.name
    const dateOverlay = document.createElement("span")
    dateOverlay.className = "start-file-card-date-overlay"
    dateOverlay.textContent = formatSavedDate(card.updatedAt)
    const version = document.createElement("span")
    version.textContent = `Version V${card.project.revision}`
    projectDetails.append(nameOverlay, projectGlyph, dateOverlay, version)
    openButton.appendChild(projectDetails)
    const menuButton = document.createElement("button")
    menuButton.type = "button"
    menuButton.className = "start-file-card-menu-trigger"
    menuButton.textContent = "⋮"
    menuButton.setAttribute("aria-label", `Options for ${card.name}`)
    menuButton.setAttribute("aria-expanded", "false")
    const menu = document.createElement("div")
    menu.className = "start-file-card-menu"
    const exportRow = document.createElement("div")
    exportRow.className = "start-file-card-export-row"
    const makeAction = (label: string, onClick: () => void) => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "start-file-card-menu-item"
      button.textContent = label
      button.addEventListener("click", event => {
        event.stopPropagation()
        onClick()
      })
      return button
    }
    const listButton = makeAction("List", () => {
      window.alert(
        `Name: ${card.name}\nPack: ${card.packId}\nLast Updated: ${formatSavedDate(card.updatedAt)}`
      )
      menu.classList.remove("is-open")
      openStartCardMenu = null
    })
    const renameButton = makeAction("Rename", () => {
      const entered = window.prompt("Rename project", card.name)
      const nextName = entered?.trim()
      if (!nextName) {
        return
      }
      const existing = savedProjectCards.find(
        item => item.id !== card.id && item.name.toLowerCase() === nextName.toLowerCase()
      )
      if (existing) {
        window.alert("A project with this name already exists.")
        return
      }
      const target = savedProjectCards.find(item => item.id === card.id)
      if (!target) {
        return
      }
      target.name = nextName
      const renamed = updateKyzaProject({
        project: target.project,
        reason: "save-load",
        update: { type: "replace-project", project: { ...target.project, name: nextName } }
      })
      if (!renamed.ok || !renamed.project || !renamed.legacySpec) {
        reportProjectUpdateFailure("save-load", renamed.errors)
        return
      }
      target.project = renamed.project
      target.packId = renamed.project.cutter.packType
      target.spec = renamed.legacySpec
      target.updatedAt = renamed.project.updatedAt
      saveKyzaProject(renamed.project)
      const active = getActiveArtboard()
      if (active?.savedProjectId === target.id) {
        active.name = nextName
        active.project = renamed.project
        active.spec = cloneSpec(renamed.legacySpec)
        updateArtboardTabs()
      }
      persistSavedProjectCards()
      renderSavedProjectCards()
    })
    const copyButton = makeAction("Make Copy", () => {
      const duplicateProject = projectFromLegacySpec(
        card.packId,
        `${card.name} Copy`,
        card.spec,
        {
          identityMap: card.project.cutter.identityMap,
          artwork: card.project.artwork,
          exportSettings: card.project.exportSettings
        }
      )
      const duplicate: SavedProjectCard = {
        id: `saved-${Date.now()}-${Math.round(Math.random() * 10000)}`,
        name: duplicateProject.name,
        packId: duplicateProject.cutter.packType,
        spec: legacySpecFromProject(duplicateProject),
        project: duplicateProject,
        updatedAt: duplicateProject.updatedAt
      }
      saveKyzaProject(duplicateProject)
      savedProjectCards = [duplicate, ...savedProjectCards]
      persistSavedProjectCards()
      renderSavedProjectCards()
    })
    const deleteButton = makeAction("Delete", () => {
      const ok = window.confirm(`Delete \"${card.name}\"?`)
      if (!ok) {
        return
      }
      savedProjectCards = savedProjectCards.filter(item => item.id !== card.id)
      deleteKyzaProject(card.project.id)
      const active = getActiveArtboard()
      if (active?.savedProjectId === card.id) {
        active.savedProjectId = undefined
      }
      persistSavedProjectCards()
      renderSavedProjectCards()
    })
    const exportButton = makeAction("Export", () => {
      exportRow.classList.toggle("is-open")
    })
    listExportReleaseActions().forEach(action => {
      const actionButton = makeAction(action.label, () => {
        if (!action.available) return
        exportSavedProjectCard(card, action, actionButton).catch(error => {
          const message = error instanceof Error ? error.message : "Unknown export error."
          window.alert(`${action.label} export failed: ${message}`)
        })
      })
      actionButton.disabled = !action.available
      actionButton.title = action.available ? action.description : action.disabledReason ?? action.description
      actionButton.dataset.exportFormat = action.format
      actionButton.dataset.exportTier = action.tierId
      exportRow.appendChild(actionButton)
    })
    menu.appendChild(listButton)
    menu.appendChild(renameButton)
    menu.appendChild(copyButton)
    menu.appendChild(deleteButton)
    menu.appendChild(exportButton)
    menu.appendChild(exportRow)
    menuButton.addEventListener("click", event => {
      event.preventDefault()
      event.stopPropagation()
      if (openStartCardMenu && openStartCardMenu !== menu) {
        openStartCardMenu.classList.remove("is-open")
        openStartCardMenu.previousElementSibling?.setAttribute("aria-expanded", "false")
      }
      const isOpen = menu.classList.toggle("is-open")
      menuButton.setAttribute("aria-expanded", String(isOpen))
      openStartCardMenu = isOpen ? menu : null
    })
    item.append(openButton, menuButton, menu)
    openButton.addEventListener("click", () => {
      openSavedProjectCard(card.id)
    })
    startGrid.appendChild(item)
  })
}

const startFeatureRow = document.createElement("div")
startFeatureRow.className = "start-feature-row"
startFeatureRow.setAttribute("aria-label", "Start or continue a cutter")
const decorateStartAction = (button: HTMLButtonElement, icon: string | SVGSVGElement, description: string) => {
  const label = button.textContent ?? ""
  button.className = "start-entry-action"
  button.replaceChildren(typeof icon === "string" ? makeLucideIcon(icon) : icon)
  const copy = document.createElement("span")
  const title = document.createElement("strong")
  title.textContent = label
  const hint = document.createElement("small")
  hint.textContent = description
  copy.append(title, hint)
  button.appendChild(copy)
}
decorateStartAction(resumeWorkButton, cutterIcons.scissors, "Continue your current cutter project")
decorateStartAction(customProjectButton, cutterIcons.box, "For Trials and Bespoke Project Work")
const importCutterButton = document.createElement("button")
importCutterButton.type = "button"
importCutterButton.textContent = "Import Cutter"
decorateStartAction(importCutterButton, '<path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5"/>', "Import a saved custom cutter JSON file")
importCutterButton.addEventListener("click", () => customProjectBuilderApi.importCutter())
const chooseButton = document.createElement("button")
chooseButton.type = "button"
chooseButton.textContent = "Help Me Choose"
// Help Me Choose uses the supplied Flow F mark (icon only, no wordmark).
decorateStartAction(chooseButton, createKyzaMarkIcon(), "Describe your product and explore Kyza suggestions")
const choosePanel = document.createElement("div")
choosePanel.id = "start-choose-panel"
choosePanel.className = "start-choose-panel"
choosePanel.hidden = true
chooseButton.setAttribute("aria-controls", choosePanel.id)
chooseButton.setAttribute("aria-expanded", "false")
chooseButton.addEventListener("click", () => {
  choosePanel.hidden = !choosePanel.hidden
  chooseButton.setAttribute("aria-expanded", String(!choosePanel.hidden))
  if (!choosePanel.hidden) {
    mountPackGen(choosePanel, new URLSearchParams(window.location.search).has("choose") ? window.location.search : "")
    choosePanel.querySelector<HTMLTextAreaElement>("textarea")?.focus()
  }
})
startFeatureRow.append(resumeWorkButton, customProjectButton, importCutterButton, chooseButton, choosePanel)
const startPackCanvas = document.createElement("div")
startPackCanvas.className = "start-pack-canvas"
startPackCanvas.append(startPackSection, startFeatureRow)
startMain.appendChild(startPackCanvas)
startMain.appendChild(mainHeader)
startMain.appendChild(startGrid)

startBody.appendChild(startSidebar)
startBody.appendChild(startMain)
startShell.appendChild(startTopbar)
startShell.appendChild(startBody)

const customProjectBuilderApi = initCustomProjectBuilder({
  host: startShell,
  getDefaultPackId: () =>
    (selectedStartPackId || packModules[0]?.id || "flowwrap") as
      | "flowwrap"
      | "doy-pouch"
      | "pillow-pack"
      | "k-seal-pouch"
      | "sachet-3-side-seal"
      | "sachet-4-side-seal",
  onBuild: result => {
    let active = getActiveArtboard()
    if (!active || active.started) {
      active = createArtboard()
      activeArtboardId = active.id
      updateArtboardTabs()
    }
    active.packId = result.definition.basePackId
    const nextPack = getPackModule(active.packId) ?? packModules[0]
    if (!nextPack) {
      return
    }
    pack = nextPack
    applyMeasureDefaultsForPack(nextPack.id)
    const resolvedSpec = cloneSpec(result.resolvedSpec)
    if (!resolvedSpec) {
      return
    }
    active.name = result.definition.label.trim() || formatProjectName(pack.name, resolvedSpec)
    const initialisedSpec = initialiseArtboardProject(active, resolvedSpec, "pack-created")
    if (!initialisedSpec) {
      return
    }
    active.started = true
    active.savedProjectId = undefined
    active.viewBoxState = { zoom: 1, panX: 0, panY: 0 }
    viewBoxState = { ...active.viewBoxState }
    currentSpec = initialisedSpec
    updateArtboardTabs()
    controlsApi?.syncSpecFromProject(currentSpec)
    customPanelApi.setSpec(currentSpec)
    hideStartOverlay()
    render(currentSpec)
  }
})
startOverlay.appendChild(startShell)

// ── Sandbox Studio UI ──────────────────────────────────────
let sandboxStudioApi: SandboxStudioApi | null = null
const openSandboxStudio = (forceNew = false, initial?: { name: string; width: number; height: number; film: string }) => {
  let active = getActiveArtboard()
  if (forceNew || !active || active.started) {
    persistActiveCutterReturnState()
    active = createArtboard()
    activeArtboardId = active.id
    updateArtboardTabs()
  }
  if (!active.sandbox) {
    const usedNames = new Set(artboards.map(item => item.name.toLowerCase()))
    while (usedNames.has(`sandbox_${nextSandboxIndex}`)) nextSandboxIndex++
    active.name = `SANDBOX_${nextSandboxIndex++}`
    active.sandbox = true
  }
  if (initial) active.name = initial.name
  updateArtboardTabs()
  hideStartOverlay()
  closeInspectorPanels()
  previewCanvas.replaceChildren()
  currentSpec = null
  document.body.classList.add("sandbox-mode")
  // AMENDS 6.2: Set Up draws a 540 × 250 green cutter outline on a clear
  // substrate — no eyemarks or other elements — sized from the Set-Up panel.
  let sandboxCutter = { width: initial?.width ?? SANDBOX_DEFAULT_WIDTH_MM, height: initial?.height ?? SANDBOX_DEFAULT_HEIGHT_MM, film: initial?.film ?? SANDBOX_DEFAULT_FILM_COLOUR }
  const drawSandboxCutter = () => previewCanvas.replaceChildren(renderSandboxCutter(sandboxCutter.width, sandboxCutter.height, sandboxCutter.film))
  sandboxStudioApi = initSandboxStudio({
    host: previewFrame,
    ...(initial ? { initialSetup: { width: initial.width, height: initial.height, filmColour: initial.film } } : {}),
    onSetUp: drawSandboxCutter,
    onDimensionChange: (width, height, unit) => {
      const toMm = unit === "in" ? 25.4 : 1
      sandboxCutter = { ...sandboxCutter, width: width * toMm, height: height * toMm }
      if (previewCanvas.querySelector('svg[data-pack="sandbox"]')) drawSandboxCutter()
    },
    onSubstrateChange: film => {
      sandboxCutter = { ...sandboxCutter, film }
      if (previewCanvas.querySelector('svg[data-pack="sandbox"]')) drawSandboxCutter()
    }
  })
}
const closeSandboxStudio = () => {
  sandboxStudioApi?.destroy()
  sandboxStudioApi = null
  document.body.classList.remove("sandbox-mode")
}

const requestedProjectErrorOverlay = document.createElement("div")
requestedProjectErrorOverlay.className = "requested-project-error"
requestedProjectErrorOverlay.setAttribute("role", "alert")
requestedProjectErrorOverlay.setAttribute("aria-labelledby", "requested-project-error-title")
const requestedProjectErrorCard = document.createElement("div")
requestedProjectErrorCard.className = "requested-project-error-card"
const requestedProjectErrorTitle = document.createElement("h1")
requestedProjectErrorTitle.id = "requested-project-error-title"
requestedProjectErrorTitle.textContent = "This Project could not be opened"
const requestedProjectErrorMessage = document.createElement("p")
const requestedProjectErrorActions = document.createElement("div")
requestedProjectErrorActions.className = "requested-project-error-actions"
const requestedProjectDashboardLink = document.createElement("a")
requestedProjectDashboardLink.href = "/"
requestedProjectDashboardLink.textContent = "Return to Dashboard"
const requestedProjectNormalStart = document.createElement("button")
requestedProjectNormalStart.type = "button"
requestedProjectNormalStart.textContent = "Open normal Cutter start screen"
requestedProjectErrorActions.appendChild(requestedProjectDashboardLink)
requestedProjectErrorActions.appendChild(requestedProjectNormalStart)
requestedProjectErrorCard.appendChild(requestedProjectErrorTitle)
requestedProjectErrorCard.appendChild(requestedProjectErrorMessage)
requestedProjectErrorCard.appendChild(requestedProjectErrorActions)
requestedProjectErrorOverlay.appendChild(requestedProjectErrorCard)

const newArtboardOverlay = document.createElement("div")
newArtboardOverlay.id = "new-artboard-overlay"
newArtboardOverlay.className = "new-artboard-overlay"
const newArtboardCard = document.createElement("div")
newArtboardCard.className = "new-artboard-card"
const newArtboardButton = document.createElement("button")
newArtboardButton.type = "button"
newArtboardButton.className = "new-artboard-button"
newArtboardButton.textContent = "Open"
const newArtboardSelect = document.createElement("select")
newArtboardSelect.className = "new-artboard-select"
packModules.forEach(packModule => {
  const option = document.createElement("option")
  option.value = packModule.id
  option.textContent = packModule.name
  newArtboardSelect.appendChild(option)
})
newArtboardCard.appendChild(newArtboardButton)
newArtboardCard.appendChild(newArtboardSelect)
newArtboardOverlay.appendChild(newArtboardCard)
preview.appendChild(previewBackground)
preview.appendChild(studioTopbar)
cutterProjectTabs.prepend(studioHomeButton, artboardTabs)
cutterProjectTabs.append(studioBottomActions, cutterTabActions)
preview.appendChild(previewReturnButton)
preview.appendChild(previewFrame)
preview.appendChild(flowDock.element)
preview.appendChild(packSpecDialog)
previewFrame.appendChild(previewCanvas)
const pouchPreviewOverlay = document.createElement("div")
pouchPreviewOverlay.className = "pouch-preview-overlay"
pouchPreviewOverlay.hidden = true
pouchPreviewOverlay.setAttribute("aria-label", "Finished pouch preview")
const pouchPreviewTabs = document.createElement("div")
pouchPreviewTabs.className = "pouch-preview-tabs"
const pouchPreviewFop = document.createElement("button")
pouchPreviewFop.type = "button"
pouchPreviewFop.textContent = "FOP"
const pouchPreviewBop = document.createElement("button")
pouchPreviewBop.type = "button"
pouchPreviewBop.textContent = "BOP"
const pouchPreviewTrimButton = document.createElement("button")
pouchPreviewTrimButton.type = "button"
pouchPreviewTrimButton.textContent = "Trim"
pouchPreviewTabs.append(pouchPreviewFop, pouchPreviewBop, pouchPreviewTrimButton)
pouchPreviewOverlay.append(pouchPreviewTabs)
previewFrame.appendChild(pouchPreviewOverlay)
preview.appendChild(startOverlay)
preview.appendChild(newArtboardOverlay)
preview.appendChild(requestedProjectErrorOverlay)

const errors = document.createElement("div")
errors.id = "errors"
const reportStartupError = (label: string, error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error)
  const nextLine = `${label}: ${detail}`
  errors.textContent = errors.textContent ? `${errors.textContent}\n${nextLine}` : nextLine
}

layout.appendChild(controls)
layout.appendChild(preview)
cutterShellMain.append(cutterProjectTabs, errors, layout)
app.appendChild(cutterAppFrame)
document.body.classList.add("start-mode")
document.body.classList.remove("studio-mode")

type Artboard = {
  id: string
  name: string
  packId: string
  spec: FlowwrapSpec | null
  project: KyzaProjectV1 | null
  started: boolean
  viewBoxState: { zoom: number; panX: number; panY: number }
  savedProjectId?: string
  sandbox?: boolean
}

type IssueEntry = ActiveValidationIssue & {
  layerId: string | null
}

type SavedProjectCard = CutterProjectPresentationCard

let pack = packModules[0]
if (!pack) {
  throw new Error("No pack modules registered.")
}

let artboards: Artboard[] = []
let nextArtboardIndex = 1
let nextSandboxIndex = 1
let activeArtboardId: string | null = null
let currentSpec: FlowwrapSpec | null = null
let measureApi: ReturnType<typeof attachMeasureTool> | null = null
let selectionApi: { destroy: () => void; refreshMarkers: () => void } | null = null
let paperStripInteractionApi: { destroy: () => void } | null = null
let paperStripEditingApi: ReturnType<typeof attachPaperStripEditing> | null = null
let gussetDockCleanup: (()=>void)|undefined
let stepNavigationCleanup: (()=>void) | undefined
let liddingDockCleanup: (()=>void) | undefined
let liddingSetupCleanup: (()=>void) | null = null
let canvasPanApi: ReturnType<typeof attachCanvasPan> | null = null
let selectionContextApi: ReturnType<typeof attachSelectionContextActions> | null = null
let canvasWheelApi: ReturnType<typeof attachCanvasWheel> | null = null
let measureEnabled = false
let referenceGridEnabled = false
let panEnabled = true
let selectEnabled = false
let viewBoxBase: { x: number; y: number; width: number; height: number } | null = null
let normalViewBoxBase: typeof viewBoxBase = null
let normalViewBoxState: { zoom: number; panX: number; panY: number } | null = null
let applyCurrentViewBox: (() => void) | null = null
const MM_TO_PX = 96 / 25.4
const ARTBOARD_TAB_OFFSET_MM = 10
const STUDIO_TOPBAR_HEIGHT_PX = 54
let viewBoxState: { zoom: number; panX: number; panY: number } = {
  zoom: 1,
  panX: 0,
  panY: 0
}
let pendingArtboardId: string | null = null
let previewMode = false
let pouchPreviewActive = false
let pouchPreviewFace: "fop" | "bop" = "fop"
let pouchPreviewShowTrim = true
/** Bounds of the face shown in Pouch Preview; zoom and pan stay inside it. */
let pouchPreviewViewport: PouchPreviewViewport | null = null
let issueEntries: IssueEntry[] = []
let validationCentreSummary: ValidationCentreSummary | null = null
let validationSelectionMessage: string | null = null
let savedProjectCards: SavedProjectCard[] = []
let undoStack: Artboard[] = []
let undoLocked = false
let copyBuffer: { kind: "safe-zone" | "window" | "attribute-box" | "hanger-slot"; payload: unknown } | null = null
let openStartCardMenu: HTMLElement | null = null

loadSavedProjectCards()
// Dashboard-created cutters are canonical Projects even before their first legacy Save.
const canonicalRecentProjects = listKyzaProjects()
if (canonicalRecentProjects.ok) {
  canonicalRecentProjects.value.filter(hasCutterDocument).forEach(project => {
    const existingIndex = savedProjectCards.findIndex(card => card.project.id === project.id)
    const card: SavedProjectCard = {
      id: existingIndex >= 0 ? savedProjectCards[existingIndex].id : project.id,
      name: project.name,
      packId: project.cutter.packType,
      spec: legacySpecFromProject(project),
      project,
      updatedAt: project.updatedAt
    }
    if (existingIndex >= 0) savedProjectCards[existingIndex] = card
    else savedProjectCards.push(card)
  })
}
renderSavedProjectCards()
const startupActiveCutterState = loadActiveCutterState()

const getActiveArtboard = () =>
  artboards.find(artboard => artboard.id === activeArtboardId) ?? null

setSelectedStartPack(selectedStartPackId)

const persistActiveCutterReturnState = () => {
  const active = getActiveArtboard()
  if (!active?.started || !active.spec) {
    return
  }
  const returnProject = createCurrentProject({
    ...(active.project?.id ? { projectId: active.project.id } : {}),
    ...(active.project?.projectDraft ? { projectDraft: active.project.projectDraft } : {}),
    productName: active.name,
    displayName: active.name,
    prompt: "",
    packType: active.packId,
    packLabel: getPackModule(active.packId)?.name ?? active.name,
    width: active.spec.width,
    height: active.spec.height,
    mode: "flat",
    source: "cutter-studio",
    stage: "cutter"
  })
  saveActiveCutterState(buildActiveCutterState({
    project: returnProject,
    spec: active.spec,
    selectedElementIds: selectionStore.getState().selectedElementIds
  }))
}

window.addEventListener("pagehide", persistActiveCutterReturnState)

const syncStudioWorkspaceHeader = () => {
  const active = getActiveArtboard()
  const activePack = active?.packId ? getPackModule(active.packId) : null
  studioProjectName.textContent = active?.name || "Untitled project"
  studioProjectPack.textContent = `Pack type: ${activePack?.name ?? "Not selected"}`
  const issueCount = validationCentreSummary
    ? validationCentreSummary.counts.critical + validationCentreSummary.counts.warning
    : issueEntries.length
  studioProjectValidation.textContent = issueCount === 0 && active?.started ? "Validated" : "Review required"
  studioProjectIssues.textContent = `Issues: ${issueCount}`
  studioProjectStock.textContent = active?.spec
    ? `Stock: ${Math.round(active.spec.width)} × ${Math.round(active.spec.height)} mm`
    : "Stock: —"
}

const syncArtworkStudioButton = () => {
  const active = getActiveArtboard()
  const availability = getArtworkStudioAvailability({
    studioMode: document.body.classList.contains("studio-mode"),
    hasCutterSpec: Boolean(currentSpec),
    artboardStarted: Boolean(active?.started),
    packTypeSelected: Boolean(active?.packId),
    packBuilderAvailable: Boolean(active?.packId && getPackModule(active.packId)),
    routeAvailable: true
  })
  artworkStudioButton.disabled = !availability.enabled
  artworkStudioButton.title = availability.message
  artworkStudioButton.setAttribute("aria-description", availability.message)
}

const readPositiveInputValue = (selector: string) => {
  const input = document.querySelector<HTMLInputElement>(selector)
  const next = Number(input?.value ?? "")
  return Number.isFinite(next) && next > 0 ? next : null
}

const logCutterDebugState = (
  label: string,
  spec: FlowwrapSpec | null,
  extras: Record<string, unknown> = {}
) => {
  if (!import.meta.env.DEV) {
    return
  }
  console.log(`[Cutter Studio][${label}]`, {
    width: spec?.width ?? null,
    height: spec?.height ?? null,
    seals: spec?.seals ?? null,
    eyeMarks: spec?.eyeMarks
      ? {
          count: spec.eyeMarks.count,
          width: spec.eyeMarks.width,
          height: spec.eyeMarks.height,
          position: spec.eyeMarks.position
        }
      : null,
    attributeCount: spec?.attributeBoxes?.length ?? 0,
    ...extras
  })
}

artworkStudioButton.addEventListener("click", () => {
  const active = getActiveArtboard()
  const availability = getArtworkStudioAvailability({
    studioMode: document.body.classList.contains("studio-mode"),
    hasCutterSpec: Boolean(currentSpec),
    artboardStarted: Boolean(active?.started),
    packTypeSelected: Boolean(active?.packId),
    packBuilderAvailable: Boolean(active?.packId && getPackModule(active.packId)),
    routeAvailable: true
  })
  if (!availability.enabled || !currentSpec || !active) {
    return
  }
  const stored = loadCurrentProject()
  const width = readPositiveInputValue('[data-cutter-field="width"]')
    ?? stored?.width
    ?? Math.round(currentSpec.width)
  const height = readPositiveInputValue('[data-cutter-field="height"]')
    ?? stored?.height
    ?? Math.round(currentSpec.height)
  const project = createArtworkHandoffProject({
    storedProject: stored,
    packType: active.packId,
    packLabel: getPackModule(active.packId)?.name ?? stored?.packLabel ?? active.name,
    width,
    height
  })
  const activeState = buildActiveCutterState({
    project,
    spec: currentSpec,
    selectedElementIds: selectionStore.getState().selectedElementIds
  })
  saveActiveCutterState(activeState)
  logCutterDebugState("handoff-to-artwork", currentSpec, {
    packId: active.packId,
    artboardId: active.id,
    defaultsApplied: false,
    hasUserModifiedState: true
  })
  saveHandoffProject(project)
  window.location.href = `./artwork.html?${projectToSearchParams(project).toString()}`
})

const cloneSpec = (spec: FlowwrapSpec | null) =>
  spec ? (JSON.parse(JSON.stringify(spec)) as FlowwrapSpec) : null

const reportProjectUpdateFailure = (reason: ProjectUpdateReason, errors: string[]) => {
  console.error(`[Kyza][Project Update][${reason}]`, errors)
}

function persistActiveProjectEvidence(
  project: KyzaProjectV1,
  expectedRevision?: number
): ParseResult<KyzaProjectV1> {
  const active = getActiveArtboard()
  if (!active?.project || active.project.id !== project.id) {
    return { ok: false, errors: ["The active Project changed before validation evidence could be saved."] }
  }
  if (active.project.revision !== project.revision) {
    return { ok: false, errors: ["The active Project revision changed before validation evidence could be saved."] }
  }
  const saved = saveKyzaProject(
    project,
    undefined,
    expectedRevision === undefined ? {} : { expectedRevision }
  )
  if (saved.ok === false) return saved
  active.project = saved.value
  const savedCard = savedProjectCards.find(card => card.project.id === saved.value.id)
  if (savedCard && saved.value.cutter) {
    savedCard.project = saved.value as KyzaCutterProjectV1
    savedCard.updatedAt = saved.value.updatedAt
    persistSavedProjectCards()
  }
  validationCentreSummary = buildValidationCentreSummary(
    saved.value,
    false,
    "cutter",
    saved.value.latestValidationRun,
  )
  issueEntries = collectIssuesFromValidation(validationCentreSummary.issues)
  renderIssuePanel()
  return saved
}

function viewValidationElement(affectedElementId: string) {
  const project = getActiveArtboard()?.project
  if (!project) {
    validationSelectionMessage = "The affected Cutter element cannot be opened because no Project is active."
    renderIssuePanel()
    return false
  }
  const resolution = resolveCutterElementSelection(project, affectedElementId)
  if (!resolution.ok || !selectionStore.canSelect(resolution.rendererSelectionId)) {
    validationSelectionMessage = resolution.ok
      ? "The affected Cutter element is not selectable in the current renderer."
      : resolution.message
    renderIssuePanel()
    return false
  }
  validationSelectionMessage = null
  selectionStore.setSelectionMode(true)
  selectionStore.selectElement(resolution.rendererSelectionId, false)
  focusCutterCanvas()
  return selectionStore.getState().selectedElementIds.includes(resolution.rendererSelectionId)
}

function focusCutterCanvas() {
  previewCanvas.tabIndex = -1
  previewCanvas.focus()
}

function refreshActiveValidation(
  project: KyzaProjectV1,
  options: { force?: boolean; trigger?: "live" | "manual" } = {},
) {
  const snapshot = getProjectValidationSnapshot(project, options)
  const active = getActiveArtboard()
  if (active?.project?.id === snapshot.project.id) {
    active.project = snapshot.project
  }
  validationCentreSummary = buildValidationCentreSummary(
    snapshot.project,
    false,
    "cutter",
    snapshot.run,
  )
  issueEntries = collectIssuesFromValidation(validationCentreSummary.issues)
  return snapshot
}

function initialiseArtboardProject(
  artboard: Artboard,
  spec: FlowwrapSpec,
  reason: ProjectUpdateReason
) {
  const created = projectFromLegacySpec(artboard.packId, artboard.name, spec)
  const result = synchroniseKyzaProject(created, reason)
  if (!result.ok || !result.project || !result.legacySpec) {
    reportProjectUpdateFailure(reason, result.errors)
    return null
  }
  artboard.project = result.project
  artboard.packId = result.project.cutter.packType
  artboard.name = result.project.name
  artboard.spec = cloneSpec(result.legacySpec)
  return cloneSpec(result.legacySpec)
}

function synchroniseArtboardProject(
  artboard: Artboard,
  reason: Extract<ProjectUpdateReason, "save-load" | "artboard-switch">
) {
  const project =
    artboard.project ??
    (artboard.spec
      ? projectFromLegacySpec(artboard.packId, artboard.name, artboard.spec)
      : null)
  if (!project) {
    return null
  }
  const result = synchroniseKyzaProject(project, reason)
  if (!result.ok || !result.project || !result.legacySpec) {
    reportProjectUpdateFailure(reason, result.errors)
    return null
  }
  artboard.project = result.project
  artboard.packId = result.project.cutter.packType
  artboard.name = result.project.name
  artboard.spec = cloneSpec(result.legacySpec)
  return cloneSpec(result.legacySpec)
}

function updateArtboardProjectSpec(
  artboard: Artboard,
  next: FlowwrapSpec,
  reason: ProjectUpdateReason
) {
  next = refreshFittedSafeZones(artboard.spec, constrainDoyGeometry(next))
  next = {...next, safeZones: next.safeZones?.map(zone => {
    const before = artboard.spec.safeZones?.find(item => item.id === zone.id)
    return before && JSON.stringify(before) !== JSON.stringify(zone) ? constrainPouchSafeZone(next, before, zone) : zone
  })}
  const project =
    artboard.project ?? projectFromLegacySpec(artboard.packId, artboard.name, next)
  const result = updateKyzaProject({
    project,
    reason,
    update: { type: "replace-legacy-spec", spec: next }
  })
  if (!result.ok || !result.project || !result.legacySpec) {
    reportProjectUpdateFailure(reason, result.errors)
    return null
  }
  artboard.project = result.project
  artboard.packId = result.project.cutter.packType
  artboard.spec = cloneSpec(result.legacySpec)
  return cloneSpec(result.legacySpec)
}

function updateArtboardProjectName(
  artboard: Artboard,
  name: string,
  reason: ProjectUpdateReason
) {
  if (!artboard.spec) {
    return false
  }
  const project =
    artboard.project ?? projectFromLegacySpec(artboard.packId, artboard.name, artboard.spec)
  if (project.name === name) {
    artboard.name = name
    artboard.project = project
    return true
  }
  const result = updateKyzaProject({
    project,
    reason,
    update: {
      type: "replace-project",
      project: { ...project, name }
    }
  })
  if (!result.ok || !result.project || !result.legacySpec) {
    reportProjectUpdateFailure(reason, result.errors)
    return false
  }
  artboard.project = result.project
  artboard.name = result.project.name
  artboard.packId = result.project.cutter.packType
  artboard.spec = cloneSpec(result.legacySpec)
  return true
}

function commitActiveProjectSpec(
  next: FlowwrapSpec,
  reason: ProjectUpdateReason,
  options: { syncControls?: boolean; syncCustomPanel?: boolean; renderNext?: boolean } = {}
) {
  const active = getActiveArtboard()
  if (!active) {
    return null
  }
  const updatedSpec = updateArtboardProjectSpec(active, syncLiddingCutterSize(next), reason)
  if (!updatedSpec) {
    return null
  }
  currentSpec = cloneSpec(updatedSpec)
  if (options.syncControls !== false) {
    controlsApi?.syncSpecFromProject(updatedSpec)
  }
  if (options.syncCustomPanel) {
    customPanelApi.setSpec(updatedSpec)
  }
  if (options.renderNext && active.started) {
    render(updatedSpec)
  }
  return updatedSpec
}

const getCurrentSvg = () => {
  const svg = previewCanvas.querySelector("svg")
  return svg instanceof SVGSVGElement ? svg : null
}

const isEditableTextTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLElement && target.isContentEditable)

const hasActiveTool = () =>
  measureEnabled || selectionStore.getState().selectionMode

const setSvgToolFlags = (svg: SVGSVGElement | null) => {
  if (!svg) {
    return
  }
  svg.setAttribute("data-measure-enabled", measureEnabled ? "true" : "false")
  svg.setAttribute("data-reference-grid", String(referenceGridEnabled))
  svg.setAttribute("data-pan-enabled", panEnabled ? "true" : "false")
  svg.setAttribute("data-select-enabled", selectEnabled ? "true" : "false")
}

const clearActiveTool = () => {
  if (!hasActiveTool()) {
    return false
  }
  measureEnabled = false
  panEnabled = true
  selectEnabled = false
  measureApi?.setEnabled(false)
  selectionStore.setSelectionMode(false)
  controlsApi?.setMeasureToolEnabled?.(false)
  controlsApi?.setPanEnabled?.(true)
  controlsApi?.setSelectEnabled?.(false)
  setSvgToolFlags(getCurrentSvg())
  return true
}

// Selectable objects handle their own double-click before this blank-canvas
// fallback restores Pan outside the working area.
previewFrame.addEventListener("dblclick", event => {
  if (event.defaultPrevented || event.target instanceof Element && event.target.closest("[data-context-action]")) return
  if (clearActiveTool()) {
    event.preventDefault()
  }
})

const nudgeSelectedEditableObjects = (deltaX: number, deltaY: number) => {
  if (!currentSpec) {
    return false
  }
  const result = transformSelectedElements(currentSpec, {
    kind: "nudge",
    selectedIds: selectionStore.getState().selectedElementIds,
    deltaX,
    deltaY
  })
  if (!result.changed) {
    return false
  }
  pushUndo()
  commitSpecUpdate(result.spec)
  return true
}

const getNudgeIncrementMm = () => {
  try {
    return loadPreferences(window.localStorage).value.nudgeIncrementMm
  } catch {
    return 0.5
  }
}

const resizeSelectedEditableObjects = (delta: number) => {
  if (!currentSpec) {
    return false
  }
  const result = transformSelectedElements(currentSpec, {
    kind: "resize",
    selectedIds: selectionStore.getState().selectedElementIds,
    deltaWidth: delta,
    deltaHeight: delta
  })
  if (!result.changed) {
    return false
  }
  pushUndo()
  commitSpecUpdate(result.spec)
  return true
}

function loadSavedProjectCards() {
  try {
    const raw = window.localStorage.getItem(SAVED_PROJECTS_STORAGE_KEY)
    if (!raw) {
      savedProjectCards = []
      return
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      savedProjectCards = []
      return
    }
    savedProjectCards = parsed
      .filter(item => item && typeof item === "object")
      .map(item => {
        const migrated = migrateSavedProjectRecord(item)
        if (!migrated.ok) {
          return null
        }
        const { cardId: id, project } = migrated.value
        return {
          id,
          name: project.name,
          packId: project.cutter.packType,
          spec: legacySpecFromProject(project),
          project,
          updatedAt: project.updatedAt
        }
      })
      .filter((item): item is SavedProjectCard => Boolean(item?.id && item.project))
  } catch {
    savedProjectCards = []
  }
}

function persistSavedProjectCards() {
  window.localStorage.setItem(
    SAVED_PROJECTS_STORAGE_KEY,
    JSON.stringify(savedProjectCards)
  )
}

function formatSavedDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return date.toLocaleString()
}

const exportSavedProjectCard = async (
  card: SavedProjectCard,
  action: ExportReleaseAction,
  triggerElement: HTMLElement
) => {
  const getLatestProject = () => {
    const loaded = loadKyzaProject(card.project.id)
    if (loaded.ok && loaded.value.cutter) {
      card.project = loaded.value as KyzaCutterProjectV1
    }
    return card.project
  }
  const persistProject = (
    project: KyzaProjectV1,
    expectedRevision?: number
  ): ParseResult<KyzaProjectV1> => {
    if (project.id !== card.project.id || project.revision !== card.project.revision) {
      return { ok: false, errors: ["The saved Project changed before validation evidence could be stored."] }
    }
    const saved = saveKyzaProject(
      project,
      undefined,
      expectedRevision === undefined ? {} : { expectedRevision }
    )
    if (saved.ok === false) return saved
    if (!saved.value.cutter) {
      return { ok: false, errors: ["The saved Project no longer contains Cutter data."] }
    }
    card.project = saved.value as KyzaCutterProjectV1
    card.spec = legacySpecFromProject(card.project)
    card.updatedAt = card.project.updatedAt
    persistSavedProjectCards()
    return saved
  }
  const approval = await requestPreExportReview({
    getLatestProject,
    persistProject,
    triggerElement,
    onViewElement: affectedElementId => {
      openSavedProjectCard(card.id)
      requestAnimationFrame(() => viewValidationElement(affectedElementId))
    },
    onReturnToCutter: () => openSavedProjectCard(card.id)
  })
  if (!approval.ok) return

  const module = action.sourceRequired
    ? getPackModule(approval.project.cutter?.packType ?? card.packId)
    : undefined
  const exportSpec = approval.project.cutter?.legacySpec ?? card.spec
  const svg = module?.render(cloneSpec(exportSpec) as FlowwrapSpec)
  if (svg) applyBaseLayerCustomisation(svg, exportSpec)
  const picker = "showSaveFilePicker" in window
    ? (window as unknown as { showSaveFilePicker: SaveFilePickerLike }).showSaveFilePicker.bind(window)
    : undefined
  const result = await executeProjectExport({
    getLatestProject,
    persistProject,
    validationRun: approval.validationRun,
    ...(approval.acknowledgement ? { acknowledgement: approval.acknowledgement } : {}),
    request: {
      format: action.format,
      tierId: action.tierId,
      ...(svg ? { source: svg } : {}),
      options: {
        includeLayers: true,
        preserveVector: action.format !== "raster-preview-pdf",
        includeValidationReport: true,
        marginMm: 80
      }
    },
    exportId: approval.exportId,
    exportedAt: approval.exportedAt,
    deliver: artifact => deliverProjectExportLocally(artifact, {
      ...(picker ? { showSaveFilePicker: picker } : {})
    })
  })
  const presentation = getExportResultPresentation(result, action)
  if (presentation.state !== "cancelled") window.alert(presentation.message)
}

const positionArtboardTabs = () => {
  if (artboardTabs.parentElement === cutterProjectTabs) {
    artboardTabs.style.removeProperty("left")
    artboardTabs.style.removeProperty("top")
    artboardTabs.style.removeProperty("transform")
    const rect = artboardTabs.getBoundingClientRect()
    if (rect.width) artboardTabs.style.setProperty("transform", `translateX(${window.innerWidth / 2 - (rect.left + rect.width / 2)}px)`, "important")
    return
  }
  const previewRect = preview.getBoundingClientRect()
  if (!previewRect.width || !previewRect.height) {
    return
  }

  const tabsWidth = artboardTabs.offsetWidth || 0
  const tabsHeight = artboardTabs.offsetHeight || 0
  const svg = previewCanvas.querySelector("svg")
  const svgRect = svg?.getBoundingClientRect()
  const rawLeft = svgRect
    ? svgRect.left - previewRect.left + ARTBOARD_TAB_OFFSET_MM * MM_TO_PX
    : ARTBOARD_TAB_OFFSET_MM * MM_TO_PX
  const rawTop = svgRect
    ? svgRect.top - previewRect.top - tabsHeight / 2
    : STUDIO_TOPBAR_HEIGHT_PX - tabsHeight / 2
  const minLeft = 8
  const maxLeft = Math.max(minLeft, previewRect.width - tabsWidth - 8)
  const left = Math.min(maxLeft, Math.max(minLeft, rawLeft))
  const top = Math.max(0, rawTop)
  artboardTabs.style.left = `${left}px`
  artboardTabs.style.top = `${top}px`
}

const formatProjectName = (packName: string, spec: FlowwrapSpec) => {
  const packLabel = packName.trim().toUpperCase()
  const width = Math.round(spec.width)
  const height = Math.round(spec.height)
  return `${packLabel}_${width}Wx${height}H`
}

const snapshotArtboard = (artboard: Artboard): Artboard => ({
  ...artboard,
  spec: cloneSpec(artboard.spec),
  project: artboard.project
    ? synchroniseKyzaProject(artboard.project, "test-fixture").project ?? null
    : null,
  viewBoxState: { ...artboard.viewBoxState }
})

const pushUndo = () => {
  const active = getActiveArtboard()
  if (!active || undoLocked) {
    return
  }
  const snap = snapshotArtboard(active)
  const last = undoStack[undoStack.length - 1]
  const same =
    !!last &&
    last.id === snap.id &&
    last.name === snap.name &&
    last.packId === snap.packId &&
    JSON.stringify(last.spec) === JSON.stringify(snap.spec)
  if (same) {
    return
  }
  undoStack.push(snap)
  if (undoStack.length > 80) {
    undoStack.shift()
  }
}

const applyUndo = () => {
  const snap = undoStack.pop()
  if (!snap) {
    return
  }
  const target = artboards.find(item => item.id === snap.id)
  if (!target) {
    return
  }
  undoLocked = true
  const replacementProject = snap.project ?? (
    snap.spec ? projectFromLegacySpec(snap.packId, snap.name, snap.spec) : null
  )
  if (replacementProject && target.project) {
    const undoResult = updateKyzaProject({
      project: target.project,
      reason: "undo",
      update: { type: "replace-project", project: replacementProject }
    })
    if (!undoResult.ok || !undoResult.project || !undoResult.legacySpec) {
      reportProjectUpdateFailure("undo", undoResult.errors)
      undoLocked = false
      return
    }
    target.project = undoResult.project
    target.name = undoResult.project.name
    target.packId = undoResult.project.cutter.packType
    target.spec = cloneSpec(undoResult.legacySpec)
  } else {
    target.name = snap.name
    target.packId = snap.packId
    target.spec = cloneSpec(snap.spec)
    target.project = replacementProject
  }
  target.started = snap.started
  target.savedProjectId = snap.savedProjectId
  target.viewBoxState = { ...snap.viewBoxState }
  activeArtboardId = target.id
  updateArtboardTabs()
  if (target.started && target.spec) {
    pack = getPackModule(target.packId) ?? packModules[0]
    currentSpec = cloneSpec(target.spec)
    viewBoxState = { ...target.viewBoxState }
    controlsApi?.syncSpecFromProject(currentSpec)
    customPanelApi.setSpec(currentSpec)
    hideStartOverlay()
    render(currentSpec)
  } else {
    showStartOverlay(target)
  }
  undoLocked = false
}

const getNextUntitledProjectName = () => {
  const usedNames = new Set([...artboards, ...savedProjectCards].map(item => item.name.toLowerCase()))
  let index = 1
  while (usedNames.has(`untitled_project_${index}`)) index++
  return `Untitled_Project_${index}`
}

const renameArtboardProject = (artboard: Artboard, rawName: string) => {
  pushUndo()
  const nextName = rawName.trim().slice(0, 80) || "Untitled"
  if (!updateArtboardProjectName(artboard, nextName, "controls-edit")) {
    return
  }
  if (artboard.savedProjectId) {
    const card = savedProjectCards.find(item => item.id === artboard.savedProjectId)
    if (card) {
      card.name = nextName
      if (artboard.project && artboard.spec) {
        card.project = artboard.project
        card.packId = artboard.project.cutter.packType
        card.spec = cloneSpec(artboard.spec) as FlowwrapSpec
        card.updatedAt = artboard.project.updatedAt
        saveKyzaProject(artboard.project)
      }
      persistSavedProjectCards()
      renderSavedProjectCards()
    }
  }
  updateArtboardTabs()
}

const closeArtboardProject = (artboard: Artboard) => {
  const closingIndex = artboards.findIndex(item => item.id === artboard.id)
  if (closingIndex < 0) return
  const closingActive = artboard.id === activeArtboardId
  artboards = artboards.filter(item => item.id !== artboard.id)
  if (artboards.length === 0) {
    clearActiveCutterState()
    const emptyArtboard = createArtboard()
    activeArtboardId = emptyArtboard.id
    currentSpec = null
    previewCanvas.innerHTML = ""
    updateArtboardTabs()
    showStartOverlay(emptyArtboard)
    return
  }
  if (closingActive) {
    const nextArtboard = artboards[Math.min(closingIndex, artboards.length - 1)]
    activeArtboardId = null
    setActiveArtboard(nextArtboard.id)
    return
  }
  updateArtboardTabs()
}

const updateArtboardTabs = () => {
  artboardTabs.innerHTML = ""
  artboards.forEach(artboard => {
    const tabShell = document.createElement("div")
    tabShell.className = "artboard-tab-shell"
    const tab = document.createElement("button")
    tab.type = "button"
    tab.className = "artboard-tab"
    tab.textContent = artboard.name
    tab.title = "Double-click to rename project"
    tab.classList.toggle("is-active", artboard.id === activeArtboardId)
    tab.addEventListener("click", event => {
      const mouse = event as MouseEvent
      if (mouse.detail > 1) {
        return
      }
      setActiveArtboard(artboard.id)
    })
    tab.addEventListener("dblclick", event => {
      event.preventDefault()
      event.stopPropagation()
      const input = document.createElement("input")
      input.type = "text"
      input.className = "artboard-tab-input"
      input.value = artboard.name
      tab.textContent = ""
      tab.appendChild(input)
      input.focus()
      requestAnimationFrame(() => {
        input.setSelectionRange(0, input.value.length)
      })
      let committed = false
      let replaceOnType = true
      const commit = () => {
        if (committed) {
          return
        }
        committed = true
        renameArtboardProject(artboard, input.value)
      }
      const cancel = () => {
        if (committed) {
          return
        }
        committed = true
        updateArtboardTabs()
      }
      input.addEventListener("blur", commit)
      input.addEventListener("keydown", keyEvent => {
        keyEvent.stopPropagation()
        if (
          replaceOnType &&
          keyEvent.key.length === 1 &&
          !keyEvent.ctrlKey &&
          !keyEvent.metaKey &&
          !keyEvent.altKey
        ) {
          keyEvent.preventDefault()
          input.value = keyEvent.key
          input.setSelectionRange(input.value.length, input.value.length)
          replaceOnType = false
          return
        }
        if (keyEvent.key === "Enter") {
          keyEvent.preventDefault()
          commit()
        }
        if (keyEvent.key === "Escape") {
          keyEvent.preventDefault()
          cancel()
        }
      })
      input.addEventListener("input", () => {
        replaceOnType = false
      })
    })
    const closeTab = document.createElement("button")
    closeTab.type = "button"
    closeTab.className = "artboard-tab-close"
    closeTab.setAttribute("aria-label", `Close ${artboard.name}`)
    closeTab.setAttribute("title", "Close project tab")
    closeTab.textContent = "×"
    closeTab.addEventListener("click", event => {
      event.preventDefault()
      event.stopPropagation()
      closeArtboardProject(artboard)
    })
    tabShell.append(tab, closeTab)
    artboardTabs.appendChild(tabShell)
  })
  const addTab = document.createElement("button")
  addTab.type = "button"
  addTab.className = "artboard-tab artboard-tab-add"
  addTab.textContent = "+"
  addTab.addEventListener("click", () => {
    if (document.body.classList.contains("sandbox-mode")) {
      openSandboxStudio(true)
      return
    }
    const artboard = createArtboard()
    pendingArtboardId = artboard.id
    showNewArtboardOverlay(artboard)
  })
  artboardTabs.appendChild(addTab)
  syncStudioWorkspaceHeader()
  requestAnimationFrame(positionArtboardTabs)
}

const showStartOverlay = (artboard: Artboard) => {
  liddingSetupCleanup?.()
  liddingSetupCleanup = null
  setPouchPreviewMode(false)
  document.body.style.zoom = `${DEFAULT_PAGE_ZOOM_PERCENT}%`
  setPreviewMode(false)
  issueEntries = []
  validationCentreSummary = null
  renderIssuePanel()
  flowDock.collapse()
  customProjectBuilderApi.close()
  closeSandboxStudio()
  closeInspectorPanels()
  setSelectedStartPack(artboard.packId || selectedStartPackId)
  resumeWorkButton.hidden=!artboard.started || !artboard.spec
  resumeWorkButton.title=artboard.started?`Resume ${artboard.name}`:""
  startOverlay.classList.add("is-visible")
  document.body.classList.add("start-mode")
  document.body.classList.remove("studio-mode")
  syncArtworkStudioButton()
}

const hideStartOverlay = () => {
  setPouchPreviewMode(false)
  document.body.style.zoom = `${CUTTER_PAGE_ZOOM_PERCENT}%`
  setPreviewMode(false)
  customProjectBuilderApi.close()
  closeSandboxStudio()
  startOverlay.classList.remove("is-visible")
  document.body.classList.remove("start-mode")
  document.body.classList.add("studio-mode")
  syncArtworkStudioButton()
}

const showNewArtboardOverlay = (artboard: Artboard) => {
  document.body.style.zoom = `${CUTTER_PAGE_ZOOM_PERCENT}%`
  newArtboardSelect.value = artboard.packId
  newArtboardOverlay.classList.add("is-visible")
  document.body.classList.add("new-artboard-mode")
}

const hideNewArtboardOverlay = () => {
  setPreviewMode(false)
  newArtboardOverlay.classList.remove("is-visible")
  document.body.classList.remove("new-artboard-mode")
  pendingArtboardId = null
}

const setPreviewMode = (enabled: boolean) => {
  const next = enabled && document.body.classList.contains("studio-mode")
  previewMode = next
  document.body.classList.toggle("preview-mode", next)
}

const resolveIssueLayerId = (message: string): string | null => {
  const text = message.toLowerCase()
  if (text.includes("eyemark")) return "eyemarks"
  if (text.includes("safe zone")) return "safe-zones"
  if (text.includes("microperf") || text.includes("perf")) return "perf-lines"
  if (text.includes("barcode") || text.includes("bbe") || text.includes("qr")) return "notes"
  if (text.includes("substrate")) return "substrate"
  if (text.includes("tear")) return "tear-notches"
  if (text.includes("zip")) return "zips"
  if (text.includes("grip")) return "grip-seals"
  if (text.includes("window")) return "windows"
  if (text.includes("hanger")) return "hanger-slots"
  if (text.includes("tac hole")) return "hanger-slots"
  if (text.includes("k arm")) return "kseal-arms"
  if (text.includes("bottom seal")) return "kseal-bottom-seals"
  if (text.includes("gusset")) return "gusset-bottom"
  if (text.includes("fold")) return "fold-lines"
  if (text.includes("seal")) return "seal-areas"
  if (text.includes("cutter")) return "cutter-outline"
  return null
}

const collectIssuesFromSvg = (svg: SVGSVGElement): IssueEntry[] => {
  return getSvgFallbackValidationIssues(
    svg.getAttribute("data-error"),
    svg.getAttribute("data-warning")
  ).map(issue => ({
    ...issue,
    layerId: resolveIssueLayerId(issue.message)
  }))
}

const collectIssuesFromValidation = (issues: ActiveValidationIssue[]): IssueEntry[] =>
  issues.map(issue => ({
    ...issue,
    layerId: resolveIssueLayerId(`${issue.fieldPath ?? ""} ${issue.message}`)
  }))

const flashIssueOnArtboard = (issue: IssueEntry) => {
  const svg = previewCanvas.querySelector("svg")
  if (!(svg instanceof SVGSVGElement)) {
    return
  }
  const project = getActiveArtboard()?.project
  const eyeRef = project?.cutter.identityMap.elements.find(
    element => issue.elementIds.includes(element.id) && element.type === "eyemark"
  ) as ({ index?: number } | undefined)
  const eyeTarget = eyeRef?.index !== undefined
    ? svg.querySelector<SVGGraphicsElement>(`[data-eye-index="${eyeRef.index}"][data-role="eye-mark"]`)
    : null
  const tacTarget = issue.elementIds
    .map(id => svg.querySelector<SVGGraphicsElement>(`[data-slot-id="${id}"][data-role="hanger-slot"]`))
    .find((node): node is SVGGraphicsElement => Boolean(node)) ?? null
  const target =
    eyeTarget ??
    tacTarget ??
    (issue.layerId
      ? svg.querySelector<SVGGraphicsElement>(`[data-layer-id="${issue.layerId}"]`)
      : null) ??
    svg.querySelector<SVGGraphicsElement>("g#seal_areas") ??
    svg
  let box: DOMRect | null = null
  try {
    box = target.getBBox()
  } catch {
    return
  }
  const pad = 4
  const x = box.x - pad
  const y = box.y - pad
  const width = Math.max(2, box.width + pad * 2)
  const height = Math.max(2, box.height + pad * 2)
  const overlayId = "issue_flash_overlay"
  let overlay = svg.querySelector<SVGGElement>(`g#${overlayId}`)
  if (!overlay) {
    overlay = document.createElementNS("http://www.w3.org/2000/svg", "g")
    overlay.setAttribute("id", overlayId)
    overlay.setAttribute("pointer-events", "none")
    svg.appendChild(overlay)
  }
  overlay.innerHTML = ""
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
  rect.setAttribute("x", x.toString())
  rect.setAttribute("y", y.toString())
  rect.setAttribute("width", width.toString())
  rect.setAttribute("height", height.toString())
  rect.setAttribute("rx", "2")
  rect.setAttribute("ry", "2")
  rect.classList.add("issue-flash-marker")
  overlay.appendChild(rect)
  window.setTimeout(() => {
    rect.remove()
  }, 5000)
}

const renderIssuePanel = () => {
  const counts = validationCentreSummary?.counts
  flowDock.setValidation(counts ?? (issueEntries.length ? {
    critical: issueEntries.filter(item => item.severity === "error").length,
    warning: issueEntries.filter(item => item.severity === "warning").length,
    advisory: issueEntries.filter(item => item.severity !== "error" && item.severity !== "warning").length,
    pass: 0
  } : null))
  const hasCritical = (counts?.critical ?? 0) > 0
  errorsPanelList.innerHTML = ""
  errorsPanelHeader.textContent = hasCritical
    ? "Validation Centre · Critical"
    : "Validation Centre"
  if (!validationCentreSummary && issueEntries.length === 0) {
    const empty = document.createElement("div")
    empty.className = "studio-errors-empty"
    empty.textContent = "Start a cutter project to view validation results."
    errorsPanelList.appendChild(empty)
    return
  }
  if (validationCentreSummary) {
    if (hasCritical) {
      const state = document.createElement("div")
      state.className = "studio-validation-state is-critical"
      const stateTitle = document.createElement("strong")
      stateTitle.textContent = "Critical validation issue detected"
      const stateMessage = document.createElement("span")
      stateMessage.textContent = "Export blocked until critical issues are fixed."
      state.append(stateTitle, stateMessage)
      errorsPanelList.appendChild(state)
    }
    const context = document.createElement("div")
    context.className = "studio-validation-context"
    context.textContent = validationCentreSummary.displayPackType
    const counts = document.createElement("div")
    counts.className = "studio-validation-counts"
    counts.textContent = `${validationCentreSummary.counts.critical} critical · ${validationCentreSummary.counts.warning} warning · ${validationCentreSummary.counts.advisory} advisory · ${validationCentreSummary.counts.pass} pass`
    errorsPanelList.append(context, counts)
  }
  if (validationSelectionMessage) {
    const navigationState = document.createElement("div")
    navigationState.className = "studio-validation-state"
    navigationState.setAttribute("role", "status")
    navigationState.textContent = validationSelectionMessage
    errorsPanelList.appendChild(navigationState)
  }
  issueEntries.forEach(item => {
    const row = document.createElement("div")
    row.className = "studio-error-row"
    row.setAttribute("data-validation-severity", item.severity)
    row.setAttribute("data-validation-code", item.code)
    row.setAttribute("data-validation-source", item.source)
    const text = document.createElement("div")
    text.className = "studio-error-text"
    const presentation = getValidationIssuePresentation(item)
    const severityLabel = item.severity === "error"
      ? "Critical"
      : item.severity === "warning"
        ? "Warning"
        : "Advisory"
    const title = document.createElement("strong")
    title.textContent = `${severityLabel}: ${presentation.title}`
    const message = document.createElement("span")
    message.textContent = item.message
    text.append(title, message)
    if (presentation.affectedElement) {
      const affected = document.createElement("span")
      affected.textContent = `Affected element: ${presentation.affectedElement}`
      text.appendChild(affected)
    }
    if (presentation.suggestedFix) {
      const fix = document.createElement("span")
      fix.textContent = `Suggested fix: ${presentation.suggestedFix}`
      text.appendChild(fix)
    }
    const action = document.createElement("button")
    action.type = "button"
    action.className = "studio-error-view"
    action.textContent = "VIEW"
    action.addEventListener("click", () => {
      const affectedElementId = item.elementIds[0]
      if (affectedElementId) {
        viewValidationElement(affectedElementId)
      } else {
        validationSelectionMessage = "This validation issue is not linked to a selectable Cutter element."
        renderIssuePanel()
      }
      flashIssueOnArtboard(item)
    })
    row.appendChild(text)
    row.appendChild(action)
    if (item.fixable && item.suggestedFixId) {
      const quickFix = document.createElement("button")
      quickFix.type = "button"
      quickFix.className = "studio-error-view"
      quickFix.textContent = item.suggestedFixId === "kseal-fit-dual-eyemarks-to-trim"
        ? "FIT EYEMARKS TO TRIM"
        : "QUICK FIX"
      quickFix.addEventListener("click", () => {
        const active = getActiveArtboard()
        if (!active?.spec) {
          return
        }
        const next = applyCutterValidationFix(active.spec, item.suggestedFixId ?? "")
        commitActiveProjectSpec(next, "engine-action", {
          syncControls: true,
          syncCustomPanel: true,
          renderNext: true
        })
      })
      row.appendChild(quickFix)
    }
    errorsPanelList.appendChild(row)
  })
  validationCentreSummary?.messages
    .filter(item =>
      (item.severity === "advisory" || item.severity === "pass") &&
      !issueEntries.some(issue => issue.message === item.message)
    )
    .forEach(item => {
      const row = document.createElement("div")
      row.className = "studio-error-row studio-validation-note"
      row.setAttribute("data-validation-severity", item.severity)
      row.setAttribute("data-validation-source", item.source)
      const text = document.createElement("div")
      text.className = "studio-error-text"
      text.textContent = `${item.severity === "pass" ? "Pass" : "Advisory"}: ${item.message}`
      row.appendChild(text)
      errorsPanelList.appendChild(row)
    })
  if (validationCentreSummary) {
    const rerun = document.createElement("button")
    rerun.type = "button"
    rerun.className = "studio-validation-rerun"
    rerun.textContent = "Re-run validation"
    rerun.addEventListener("click", () => {
      const project = getActiveArtboard()?.project
      if (!project) {
        return
      }
      refreshActiveValidation(project, { force: true, trigger: "manual" })
      renderIssuePanel()
      customPanelApi.refreshExportReadiness()
    })
    errorsPanelList.appendChild(rerun)
  }
}

renderIssuePanel()

const createArtboard = () => {
  while (artboards.some(item => item.id === `artboard-${nextArtboardIndex}`)) nextArtboardIndex++
  const nextIndex = nextArtboardIndex++
  const packId = packModules[0]?.id ?? ""
  const artboard: Artboard = {
    id: `artboard-${nextIndex}`,
    name: getNextUntitledProjectName(),
    packId,
    spec: null,
    project: null,
    started: false,
    viewBoxState: { zoom: 1, panX: 0, panY: 0 }
  }
  artboards = [...artboards, artboard]
  updateArtboardTabs()
  logCutterDebugState("default-config-created", artboard.spec, {
    packId,
    artboardId: artboard.id,
    defaultsApplied: true,
    hasUserModifiedState: false
  })
  return artboard
}

const setActiveArtboard = (id: string) => {
  if (id === activeArtboardId) {
    const same = getActiveArtboard()
    if (same && !same.started) {
      if (same.sandbox) {
        openSandboxStudio()
        return
      }
      previewCanvas.innerHTML = ""
      currentSpec = null
      showStartOverlay(same)
    }
    return
  }
  persistActiveCutterReturnState()
  activeArtboardId = id
  updateArtboardTabs()
  const artboard = getActiveArtboard()
  if (!artboard) {
    return
  }
  if (!artboard.started) {
    if (artboard.sandbox) {
      openSandboxStudio()
      return
    }
    previewCanvas.innerHTML = ""
    currentSpec = null
    showStartOverlay(artboard)
    return
  }
  hideStartOverlay()
  pack = getPackModule(artboard.packId) ?? packModules[0]
  if (!pack) {
    return
  }
  applyMeasureDefaultsForPack(pack.id)
  currentSpec = synchroniseArtboardProject(artboard, "artboard-switch")
    ?? (artboard.spec ? cloneSpec(artboard.spec) : pack.getDefaults())
  viewBoxState = { ...artboard.viewBoxState }
  controlsApi?.syncSpecFromProject(currentSpec)
  customPanelApi.setSpec(currentSpec)
  if (currentSpec) {
    logCutterDebugState("cutter-remount", currentSpec, {
      packId: artboard.packId,
      artboardId: artboard.id,
      defaultsApplied: false,
      hasUserModifiedState: Boolean(startupActiveCutterState)
    })
    render(currentSpec)
  }
}

const saveActiveViewBoxState = () => {
  const active = getActiveArtboard()
  if (!active) {
    return
  }
  active.viewBoxState = { ...(pouchPreviewActive && normalViewBoxState ? normalViewBoxState : viewBoxState) }
}
let dockPositionListenerAttached = false
let repositionOverlays: () => void = () => {}
let controlsApi: ReturnType<typeof initFlowwrapControls> | null = null
const layerManager = createDefaultLayerManager()
const resolveSelectedLayerForCustomPanel = (selectedIds: string[]) => {
  const explicitLayer = selectedIds.find(id => id.startsWith("layer:"))
  if (explicitLayer) {
    return explicitLayer.slice("layer:".length)
  }
  if (selectedIds.some(id => id.startsWith("safe-zone:"))) {
    return "safe-zones"
  }
  if (selectedIds.some(id => id.startsWith("window:"))) {
    return "windows"
  }
  if (selectedIds.some(id => id.startsWith("attribute-box:"))) {
    return "notes"
  }
  if (selectedIds.some(id => id.startsWith("eye-mark:"))) {
    return "eyemarks"
  }
  if (selectedIds.some(id => id.startsWith("hanger-slot:"))) {
    return "hanger-slots"
  }
  if (selectedIds.some(id => id.startsWith("half-moon:"))) {
    return "tear-notches"
  }
  return null
}
selectionStore.subscribe(state => {
  selectEnabled = state.selectionMode
  setSvgToolFlags(getCurrentSvg())
  controlsApi?.setSelectEnabled?.(state.selectionMode)
  if (state.selectedElementIds.length === 0) {
    layerManager.clearSelection()
  } else {
    const layerIds = state.selectedElementIds
      .filter(id => id.startsWith("layer:"))
      .map(id => id.slice("layer:".length))
    if (layerIds.length > 0) {
      layerManager.setSelectedLayerIds(layerIds)
    } else {
      const elementLayer = resolveSelectedLayerForCustomPanel(state.selectedElementIds)
      if (elementLayer) {
        layerManager.setSelectedLayerIds([elementLayer])
      } else {
        layerManager.clearSelection()
      }
    }
  }
  if (!currentSpec) {
    customPanelApi.setActiveLayer(resolveSelectedLayerForCustomPanel(state.selectedElementIds))
    return
  }
  customPanelApi.setActiveLayer(resolveSelectedLayerForCustomPanel(state.selectedElementIds))
  const nextSpec = applySelectionToSpec(currentSpec, state.selectedElementIds)
  if (nextSpec === currentSpec) {
    return
  }
  currentSpec = nextSpec
  controlsApi?.syncSpecFromProject(nextSpec)
  render(nextSpec)
})

const buildLayerChildrenMap = (spec: FlowwrapSpec) => {
  const children: Record<string, string[]> = {}

  if ((spec.eyeMarks?.count ?? 0) > 1) {
    children.eyemarks = Array.from({ length: spec.eyeMarks?.count ?? 0 }, (_, index) => {
      return `Eyemark ${index + 1}`
    })
  }

  const foldCount = spec.foldLines?.length ?? 0
  if (foldCount > 1) {
    children["fold-lines"] = Array.from({ length: foldCount }, (_, index) => {
      return `Fold Line ${index + 1}`
    })
  }

  const safeZoneCount = spec.safeZones?.filter(zone => zone.enabled !== false).length ?? 0
  if (safeZoneCount > 1) {
    children["safe-zones"] = Array.from({ length: safeZoneCount }, (_, index) => {
      return `Safe Zone ${index + 1}`
    })
  }

  const perfLaneCount = spec.perfs
    ? (spec.perfs.lanes?.length && spec.perfs.lanes.length > 0 ? spec.perfs.lanes.length : 1)
    : 0
  if (perfLaneCount > 1) {
    children["perf-lines"] = Array.from({ length: perfLaneCount }, (_, index) => {
      return `MP ${index + 1}`
    })
  }

  const windowCount = spec.windows?.length ?? 0
  if (windowCount > 1) {
    children.windows = Array.from({ length: windowCount }, (_, index) => {
      return `Window ${index + 1}`
    })
  }

  const barcodeKinds = ["barcode", "qr", "bbe"] as const
  const attrBoxes = spec.attributeBoxes?.filter(
    box => box.enabled !== false && barcodeKinds.includes(box.kind as (typeof barcodeKinds)[number])
  ) ?? []
  if (attrBoxes.length > 1) {
    children.notes = attrBoxes.map((box, index) => {
      const prefix =
        box.kind === "barcode" ? "Barcode" : box.kind === "qr" ? "QR" : "BBE"
      return `${prefix} ${index + 1}`
    })
  }

  return children
}

const applyLayerStateToSvg = (svg: SVGSVGElement | null) => {
  if (!svg) {
    return
  }
  const groups = layerManager.getGroups()
  const layers = groups.flatMap(group => layerManager.getLayersByGroup(group.id))
  const layerMap = new Map(layers.map(layer => [layer.id, layer]))
  svg.querySelectorAll<SVGGElement>("[data-layer-id]").forEach(node => {
    const layerId = node.getAttribute("data-layer-id")
    if (!layerId) {
      return
    }
    const layer = layerMap.get(layerId)
    if (!layer) {
      return
    }
    node.style.display = layer.visible ? "" : "none"
    node.style.pointerEvents = layer.locked ? "none" : "auto"
    node.setAttribute("data-layer-locked", layer.locked ? "true" : "false")
  })
}

const collectAvailableLayerIds = (svg: SVGSVGElement, spec: FlowwrapSpec) => {
  const ids = new Set<string>()
  const barcodeKinds = new Set(["barcode", "qr", "bbe"])
  const hasBarcodeBoxes =
    (spec.attributeBoxes ?? []).some(
      box => box.enabled !== false && barcodeKinds.has(box.kind)
    )
  svg.querySelectorAll<SVGGElement>("[data-layer-id]").forEach(node => {
    const layerId = node.getAttribute("data-layer-id")
    if (!layerId) {
      return
    }
    if (layerId === "notes" && !hasBarcodeBoxes) {
      return
    }
    if (node.childElementCount === 0) {
      return
    }
    ids.add(layerId)
  })
  return [...ids]
}

const mapLayerIdToElementType = (layerId: string): CutterElementType => {
  switch (layerId) {
    case "cutter-outline":
    case "fold-lines":
    case "gusset-fold-line":
    case "gusset-side":
    case "gusset-bottom":
    case "kseal-bottom-seals":
    case "kseal-arms":
    case "zips":
    case "grip-seals":
    case "windows":
    case "safe-zones":
      return "cutterLine"
    case "seal-areas":
      return "seal"
    case "eyemarks":
      return "eyeMark"
    case "substrate":
      return "substrate"
    case "tear-notches":
      return "tearNotch"
    case "notes":
      return "barcodeBox"
    case "perf-lines":
      return "perforation"
    default:
      return "cutterLine"
  }
}

const CANVAS_LOCKED_LAYER_SELECTIONS = new Set([
  "cutter-outline",
  "seal-areas",
  "substrate"
])

const getLayerSelectionCapabilities = (layerId: string) => ({
  movable: new Set([
    "fold-lines",
    "gusset-fold-line",
    "gusset-side",
    "gusset-bottom",
    "kseal-bottom-seals",
    "kseal-arms",
    "zips",
    "grip-seals",
    "tear-notches",
    "perf-lines"
  ]).has(layerId),
  resizable: false,
  rotatable: false,
  removable: isLayerDeletable(layerId)
})

const syncSelectionElements = (svg: SVGSVGElement) => {
  const groups = layerManager.getGroups()
  const layers = groups.flatMap(group => layerManager.getLayersByGroup(group.id))
  const elementMap = new Map<string, CutterElement>()
  const layerById = new Map(layers.map(layer => [layer.id, layer]))
  layers.forEach(layer => {
    const canvasLocked = CANVAS_LOCKED_LAYER_SELECTIONS.has(layer.id)
    const capabilities = getLayerSelectionCapabilities(layer.id)
    elementMap.set(`layer:${layer.id}`, {
      id: `layer:${layer.id}`,
      type: mapLayerIdToElementType(layer.id),
      packType: pack.id,
      layer: layer.id,
      ...capabilities,
      selectable: !canvasLocked,
      locked: canvasLocked || layer.locked
    })
  })
  svg.querySelectorAll<SVGGElement>("[data-layer-id]").forEach(node => {
    const layerId = node.getAttribute("data-layer-id")
    if (!layerId) {
      return
    }
    const key = `layer:${layerId}`
    if (!elementMap.has(key)) {
      const canvasLocked = CANVAS_LOCKED_LAYER_SELECTIONS.has(layerId)
      const capabilities = getLayerSelectionCapabilities(layerId)
      elementMap.set(key, {
        id: `layer:${layerId}`,
        type: mapLayerIdToElementType(layerId),
        packType: pack.id,
        layer: layerId,
        ...capabilities,
        selectable: !canvasLocked,
        locked: canvasLocked || node.getAttribute("data-layer-locked") === "true"
      })
    }
  })

  const addElement = (
    id: string,
    type: CutterElementType,
    layerId: string,
    capabilities: Pick<
      CutterElement,
      "movable" | "resizable" | "rotatable" | "removable"
    >,
    details: Partial<Pick<CutterElement, "bounds" | "rotation" | "constraints" | "metadata">> = {}
  ) => {
    const layer = layerById.get(layerId)
    elementMap.set(id, {
      id,
      type,
      packType: pack.id,
      layer: layerId,
      ...capabilities,
      ...details,
      selectable: true,
      locked: layer?.locked ?? false
    })
  }

  svg.querySelectorAll('[data-role="safe-zone"][data-zone-id]').forEach(node => {
    const zoneId = node.getAttribute("data-zone-id")
    if (zoneId) {
      const zone = currentSpec?.safeZones?.find(item => item.id === zoneId)
      addElement(
        `safe-zone:${zoneId}`,
        "safeZone",
        "safe-zones",
        { movable: true, resizable: true, rotatable: true, removable: true },
        zone
          ? {
              bounds: { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
              rotation: zone.rotation ?? 0,
              constraints: { minWidth: 1, minHeight: 1 }
            }
          : {}
      )
    }
  })
  svg.querySelectorAll('[data-role="window-shape"][data-window-id]').forEach(node => {
    const windowId = node.getAttribute("data-window-id")
    if (windowId) {
      const item = currentSpec?.windows?.find(window => window.id === windowId)
      addElement(
        `window:${windowId}`,
        "window",
        "windows",
        { movable: true, resizable: true, rotatable: true, removable: true },
        item
          ? {
              bounds: { x: item.x, y: item.y, width: item.width, height: item.height },
              rotation: item.rotation ?? 0,
              constraints: {
                minWidth: 1,
                minHeight: 1,
                preserveAspectRatio: item.shape === "circle"
              }
            }
          : {}
      )
    }
  })
  svg.querySelectorAll('[data-role="attribute-box"][data-box-id]').forEach(node => {
    const boxId = node.getAttribute("data-box-id")
    if (boxId) {
      addElement(
        `attribute-box:${boxId}`,
        "barcodeBox",
        "notes",
        { movable: true, resizable: true, rotatable: true, removable: true }
      )
    }
  })
  svg.querySelectorAll('[data-role="eye-mark"][data-eye-index]').forEach(node => {
    const index = node.getAttribute("data-eye-index")
    if (index !== null) {
      addElement(`eye-mark:${index}`, "eyeMark", "eyemarks", {
        movable: true,
        resizable: true,
        rotatable: false,
        removable: true
      })
    }
  })
  svg.querySelectorAll('[data-role="hanger-slot"][data-slot-id]').forEach(node => {
    const slotId = node.getAttribute("data-slot-id")
    if (slotId) {
      addElement(`hanger-slot:${slotId}`, "hangerSlot", "hanger-slots", {
        movable: true,
        resizable: true,
        rotatable: false,
        removable: true
      })
    }
  })
  svg.querySelectorAll('[data-role="half-moon-cutout"][data-cutout-id]').forEach(node => {
    const cutoutId = node.getAttribute("data-cutout-id")
    if (cutoutId) {
      addElement(`half-moon:${cutoutId}`, "halfMoon", "tear-notches", {
        movable: true,
        resizable: true,
        rotatable: false,
        removable: true
      })
    }
  })
  svg.querySelectorAll('[data-line-id]').forEach(node => {
    const lineId = node.getAttribute("data-line-id")
    if (lineId && !elementMap.has(`fold-line:${lineId}`)) {
      addElement(`fold-line:${lineId}`, "foldLine", "fold-lines", {
        movable: true,
        resizable: false,
        rotatable: false,
        removable: true
      })
    }
  })
  svg.querySelectorAll('[data-role="perf-dot"][data-lane-index]').forEach(node => {
    const laneIndex = node.getAttribute("data-lane-index")
    if (laneIndex !== null && !elementMap.has(`perf-lane:${laneIndex}`)) {
      addElement(`perf-lane:${laneIndex}`, "perforation", "perf-lines", {
        movable: true,
        resizable: false,
        rotatable: false,
        removable: true
      })
    }
  })
  selectionStore.registerElements([...elementMap.values()])
}

const applySelectionToSpec = (
  spec: FlowwrapSpec,
  selectedIds: string[]
): FlowwrapSpec => {
  const safeZoneIds = new Set(
    selectedIds
      .filter(id => id.startsWith("safe-zone:"))
      .map(id => id.slice("safe-zone:".length))
  )
  const windowIds = new Set(
    selectedIds
      .filter(id => id.startsWith("window:"))
      .map(id => id.slice("window:".length))
  )
  const boxIds = new Set(
    selectedIds
      .filter(id => id.startsWith("attribute-box:"))
      .map(id => id.slice("attribute-box:".length))
  )
  const slotIds = new Set(
    selectedIds
      .filter(id => id.startsWith("hanger-slot:"))
      .map(id => id.slice("hanger-slot:".length))
  )
  const cutoutIds = new Set(
    selectedIds
      .filter(id => id.startsWith("half-moon:"))
      .map(id => id.slice("half-moon:".length))
  )
  const eyeMarkSelection = selectedIds.find(id => id.startsWith("eye-mark:")) ?? null
  const selectedEyeMarkIndex =
    eyeMarkSelection !== null ? Number(eyeMarkSelection.slice("eye-mark:".length)) : undefined

  let changed = false
  const next: FlowwrapSpec = { ...spec }

  if (spec.safeZones) {
    const zones = spec.safeZones.map(zone => {
      const selected = safeZoneIds.has(zone.id)
      if ((zone.selected ?? false) === selected) {
        return zone
      }
      changed = true
      return { ...zone, selected }
    })
    next.safeZones = zones
  }
  if (spec.windows) {
    const windows = spec.windows.map(win => {
      const selected = windowIds.has(win.id)
      if ((win.selected ?? false) === selected) {
        return win
      }
      changed = true
      return { ...win, selected }
    })
    next.windows = windows
  }
  if (spec.attributeBoxes) {
    const boxes = spec.attributeBoxes.map(box => {
      const selected = boxIds.has(box.id)
      if ((box.selected ?? false) === selected) {
        return box
      }
      changed = true
      return { ...box, selected }
    })
    next.attributeBoxes = boxes
  }
  if (spec.hangerSlots) {
    const slots = spec.hangerSlots.map(slot => {
      const selected = slotIds.has(slot.id)
      if ((slot.selected ?? false) === selected) {
        return slot
      }
      changed = true
      return { ...slot, selected }
    })
    next.hangerSlots = slots
  }
  if (spec.halfMoonCutouts) {
    const cutouts = spec.halfMoonCutouts.map(cutout => {
      const selected = cutoutIds.has(cutout.id)
      if ((cutout.selected ?? false) === selected) {
        return cutout
      }
      changed = true
      return { ...cutout, selected }
    })
    next.halfMoonCutouts = cutouts
  }
  if (spec.eyeMarks) {
    const current = spec.eyeMarks.selectedIndex
    const nextIndex =
      selectedEyeMarkIndex !== undefined && !Number.isNaN(selectedEyeMarkIndex)
        ? selectedEyeMarkIndex
        : undefined
    if (current !== nextIndex) {
      changed = true
      next.eyeMarks = { ...spec.eyeMarks, selectedIndex: nextIndex }
    }
  }

  return changed ? next : spec
}

const syncLayerState = () => {
  const currentSvg = previewCanvas.querySelector("svg")
  if (currentSvg instanceof SVGSVGElement) {
    applyLayerStateToSvg(currentSvg)
  }
}

const isLayerDeletable = (layerId: string) =>
  new Set([
    "eyemarks",
    "fold-lines",
    "perf-lines",
    "safe-zones",
    "hanger-slots",
    "tear-notches",
    "zips",
    "grip-seals",
    "windows",
    "notes"
  ]).has(layerId)

const isSubLayerDeletable = (layerId: string, _index: number) =>
  new Set(["eyemarks", "fold-lines", "safe-zones", "perf-lines", "windows", "notes"]).has(
    layerId
  )

const deleteLayerFromSpec = (spec: FlowwrapSpec, layerId: string): FlowwrapSpec => {
  switch (layerId) {
    case "eyemarks":
      return { ...spec, eyeMarks: undefined }
    case "fold-lines":
      return { ...spec, foldLines: [] }
    case "perf-lines":
      return { ...spec, perfs: undefined }
    case "safe-zones":
      return { ...spec, safeZones: [] }
    case "hanger-slots":
      return { ...spec, hangerSlots: [] }
    case "tear-notches":
      return spec.doyPouch
        ? { ...spec, doyPouch: { ...spec.doyPouch, showTearNotch: false } }
        : spec
    case "zips":
      return spec.doyPouch
        ? { ...spec, doyPouch: { ...spec.doyPouch, showZipper: false } }
        : spec
    case "grip-seals":
      return spec.doyPouch
        ? { ...spec, doyPouch: { ...spec.doyPouch, showGripSeal: false } }
        : spec
    case "windows":
      return { ...spec, windows: [] }
    case "notes":
      return {
        ...spec,
        attributeBoxes: (spec.attributeBoxes ?? []).map(box => ({ ...box, enabled: false }))
      }
    default:
      return spec
  }
}

const deleteSubLayerFromSpec = (spec: FlowwrapSpec, layerId: string, index: number): FlowwrapSpec => {
  if (index < 0) {
    return spec
  }
  switch (layerId) {
    case "eyemarks": {
      if (!spec.eyeMarks) {
        return spec
      }
      const mapDoubleToSingle = (position: string, removedIndex: number) => {
        if (position === "top") {
          return removedIndex === 0 ? "top-right" : "top-left"
        }
        if (position === "bottom") {
          return removedIndex === 0 ? "bottom-right" : "bottom-left"
        }
        if (position === "centre") {
          return removedIndex === 0 ? "centre-right" : "centre-left"
        }
        return "top-left"
      }
      const count = spec.eyeMarks.count ?? 0
      if (count <= 1) {
        return { ...spec, eyeMarks: undefined }
      }
      if (index === 0) {
        return {
          ...spec,
          eyeMarks: {
            ...spec.eyeMarks,
            count: 1,
            position: mapDoubleToSingle(spec.eyeMarks.position, 0),
            width: spec.eyeMarks.width2 ?? spec.eyeMarks.width,
            height: spec.eyeMarks.height2 ?? spec.eyeMarks.height,
            width2: undefined,
            height2: undefined
          }
        }
      }
      return {
        ...spec,
        eyeMarks: {
          ...spec.eyeMarks,
          count: 1,
          position: mapDoubleToSingle(spec.eyeMarks.position, 1),
          width2: undefined,
          height2: undefined
        }
      }
    }
    case "fold-lines": {
      const lines = spec.foldLines ?? []
      if (index >= lines.length) {
        return spec
      }
      return { ...spec, foldLines: lines.filter((_, i) => i !== index) }
    }
    case "safe-zones": {
      const zones = spec.safeZones ?? []
      const enabledIndexes = zones
        .map((zone, i) => ({ zone, i }))
        .filter(item => item.zone.enabled !== false)
      const target = enabledIndexes[index]
      if (!target) {
        return spec
      }
      return { ...spec, safeZones: zones.filter((_, i) => i !== target.i) }
    }
    case "perf-lines": {
      if (!spec.perfs) {
        return spec
      }
      const lanes =
        spec.perfs.lanes && spec.perfs.lanes.length > 0
          ? spec.perfs.lanes
          : [{ originX: spec.perfs.originX, originY: spec.perfs.originY }]
      if (index >= lanes.length) {
        return spec
      }
      const nextLanes = lanes.filter((_, i) => i !== index)
      if (nextLanes.length === 0) {
        return { ...spec, perfs: undefined }
      }
      if (nextLanes.length === 1) {
        const lane = nextLanes[0]
        return {
          ...spec,
          perfs: {
            ...spec.perfs,
            originX: lane.originX,
            originY: lane.originY,
            lanes: undefined
          }
        }
      }
      return {
        ...spec,
        perfs: { ...spec.perfs, lanes: nextLanes }
      }
    }
    case "windows": {
      const windows = spec.windows ?? []
      if (index >= windows.length) {
        return spec
      }
      return { ...spec, windows: windows.filter((_, i) => i !== index) }
    }
    case "notes": {
      const barcodeKinds = new Set(["barcode", "qr", "bbe"])
      const boxes = spec.attributeBoxes ?? []
      const enabledIndexes = boxes
        .map((box, i) => ({ box, i }))
        .filter(item => item.box.enabled !== false && barcodeKinds.has(item.box.kind))
      const target = enabledIndexes[index]
      if (!target) {
        return spec
      }
      return {
        ...spec,
        attributeBoxes: boxes.filter((_, i) => i !== target.i)
      }
    }
    default:
      return spec
  }
}

const commitSpecUpdate = (next: FlowwrapSpec) => {
  commitActiveProjectSpec(next, "canvas-interaction", {
    syncControls: true,
    renderNext: true
  })
}

const deleteSelectedFromCurrentSpec = () => {
  if (!currentSpec) {
    return
  }
  const selectedIds = selectionStore
    .getState()
    .selectedElementIds
    .filter(id => selectionStore.getElement(id)?.removable && !id.startsWith("layer:"))
  if (!selectedIds.length) {
    return
  }
  pushUndo()
  let next = currentSpec
  selectedIds.forEach(id => {
    if (id.startsWith("safe-zone:")) {
      const zoneId = id.slice("safe-zone:".length)
      next = { ...next, safeZones: (next.safeZones ?? []).filter(zone => zone.id !== zoneId) }
      return
    }
    if (id.startsWith("window:")) {
      const windowId = id.slice("window:".length)
      next = { ...next, windows: (next.windows ?? []).filter(win => win.id !== windowId) }
      return
    }
    if (id.startsWith("attribute-box:")) {
      const boxId = id.slice("attribute-box:".length)
      next = {
        ...next,
        attributeBoxes: (next.attributeBoxes ?? []).filter(box => box.id !== boxId)
      }
      return
    }
    if (id.startsWith("hanger-slot:")) {
      const slotId = id.slice("hanger-slot:".length)
      next = {
        ...next,
        hangerSlots: (next.hangerSlots ?? []).filter(slot => slot.id !== slotId)
      }
      return
    }
    if (id.startsWith("half-moon:")) {
      const cutoutId = id.slice("half-moon:".length)
      next = {
        ...next,
        halfMoonCutouts: (next.halfMoonCutouts ?? []).filter(cutout => cutout.id !== cutoutId)
      }
      return
    }
    if (id.startsWith("eye-mark:")) {
      if (!next.eyeMarks) {
        return
      }
      const removedIndex = Number(id.slice("eye-mark:".length))
      const count = Math.max(0, (next.eyeMarks.count ?? 0) - 1)
      const remainingEyeMarks =
        removedIndex === 0 && next.eyeMarks.count === 2
          ? {
              ...next.eyeMarks,
              width: next.eyeMarks.width2 ?? next.eyeMarks.width,
              height: next.eyeMarks.height2 ?? next.eyeMarks.height,
              offsetX: next.eyeMarks.offsetX2,
              offsetY: next.eyeMarks.offsetY2,
              manualPositioned: next.eyeMarks.manualPositioned2,
              width2: undefined,
              height2: undefined,
              offsetX2: undefined,
              offsetY2: undefined,
              manualPositioned2: undefined
            }
          : next.eyeMarks
      next =
        count <= 0
          ? { ...next, eyeMarks: undefined }
          : {
              ...next,
              eyeMarks: { ...remainingEyeMarks, count, selectedIndex: undefined }
            }
      return
    }
    if (id.startsWith("fold-line:")) {
      const lineId = id.slice("fold-line:".length)
      next = {
        ...next,
        foldLines: (next.foldLines ?? []).filter(line => line.id !== lineId)
      }
      return
    }
    if (id.startsWith("perf-lane:")) {
      const laneIndex = Number(id.slice("perf-lane:".length))
      if (!next.perfs || !Number.isInteger(laneIndex)) {
        return
      }
      const lanes = next.perfs.lanes?.length
        ? next.perfs.lanes.filter((_, index) => index !== laneIndex)
        : []
      next = lanes.length
        ? {
            ...next,
            perfs: {
              ...next.perfs,
              originX: lanes[0].originX,
              originY: lanes[0].originY,
              lanes
            }
          }
        : { ...next, perfs: undefined }
    }
  })
  selectionStore.clearSelection()
  commitSpecUpdate(next)
}

const copySelectedToBuffer = () => {
  if (!currentSpec) {
    copyBuffer = null
    return
  }
  const selectedIds = selectionStore.getState().selectedElementIds
  if (selectedIds.length !== 1) {
    copyBuffer = null
    return
  }
  const id = selectedIds[0]
  if (id.startsWith("safe-zone:")) {
    const zone = currentSpec.safeZones?.find(item => item.id === id.slice("safe-zone:".length))
    copyBuffer = zone ? { kind: "safe-zone", payload: zone } : null
    return
  }
  if (id.startsWith("window:")) {
    const win = currentSpec.windows?.find(item => item.id === id.slice("window:".length))
    copyBuffer = win ? { kind: "window", payload: win } : null
    return
  }
  if (id.startsWith("attribute-box:")) {
    const box = currentSpec.attributeBoxes?.find(item => item.id === id.slice("attribute-box:".length))
    copyBuffer = box ? { kind: "attribute-box", payload: box } : null
    return
  }
  if (id.startsWith("hanger-slot:")) {
    const slot = currentSpec.hangerSlots?.find(item => item.id === id.slice("hanger-slot:".length))
    copyBuffer = slot ? { kind: "hanger-slot", payload: slot } : null
    return
  }
  copyBuffer = null
}

const pasteFromBuffer = () => {
  if (!currentSpec || !copyBuffer) {
    return
  }
  pushUndo()
  const offset = 5
  const token = `${Date.now()}-${Math.round(Math.random() * 1000)}`
  let next = currentSpec
  if (copyBuffer.kind === "safe-zone") {
    const source = copyBuffer.payload as FlowwrapSpec["safeZones"][number]
    const clone = { ...source, id: `safe-zone-${token}`, x: source.x + offset, y: source.y + offset }
    next = { ...next, safeZones: [...(next.safeZones ?? []), clone] }
  } else if (copyBuffer.kind === "window") {
    const source = copyBuffer.payload as FlowwrapSpec["windows"][number]
    const clone = { ...source, id: `window-${token}`, x: source.x + offset, y: source.y + offset }
    next = { ...next, windows: [...(next.windows ?? []), clone] }
  } else if (copyBuffer.kind === "attribute-box") {
    const source = copyBuffer.payload as FlowwrapSpec["attributeBoxes"][number]
    const clone = { ...source, id: `attribute-box-${token}`, x: source.x + offset, y: source.y + offset }
    next = { ...next, attributeBoxes: [...(next.attributeBoxes ?? []), clone] }
  } else if (copyBuffer.kind === "hanger-slot") {
    const source = copyBuffer.payload as FlowwrapSpec["hangerSlots"][number]
    const clone = { ...source, id: `hanger-slot-${token}`, centerX: source.centerX + offset }
    next = { ...next, hangerSlots: [...(next.hangerSlots ?? []), clone] }
  }
  commitSpecUpdate(next)
}

layerManager.subscribe(() => {
  syncLayerState()
  const currentSvg = previewCanvas.querySelector("svg")
  if (currentSvg instanceof SVGSVGElement) {
    syncSelectionElements(currentSvg)
    selectionApi?.refreshMarkers()
  }
})
try {
  initLayersPanel(layersPanelHost, layerManager, {
    onSelectLayer: (layerId, multi) => {
      customPanelApi.setActiveLayer(layerId)
      if (!selectionStore.getState().selectionMode) {
        selectionStore.setSelectionMode(true)
        controlsApi?.setSelectEnabled?.(true)
      }
      const selectionId = `layer:${layerId}`
      if (!multi) {
        selectionStore.selectElement(selectionId, false)
      } else {
        selectionStore.toggleSelection(selectionId, true)
      }
    },
    canDeleteLayer: isLayerDeletable,
    canDeleteSubLayer: isSubLayerDeletable,
    getSubLayerState: (layerId, _index) => {
      const layer = layerManager.getLayerById(layerId)
      return {
        visible: layer?.visible ?? true,
        locked: layer?.locked ?? false
      }
    },
    onToggleSubLayerVisibility: (layerId, _index) => {
      layerManager.toggleLayerVisibility(layerId)
    },
    onToggleSubLayerLock: (layerId, _index) => {
      layerManager.toggleLayerLock(layerId)
    },
    onDeleteSubLayer: (layerId, index) => {
      if (!currentSpec) {
        return
      }
      const next = deleteSubLayerFromSpec(currentSpec, layerId, index)
      commitActiveProjectSpec(next, "canvas-interaction", {
        syncControls: true,
        renderNext: true
      })
    },
    onDeleteLayer: layerId => {
      if (!currentSpec) {
        return
      }
      const next = deleteLayerFromSpec(currentSpec, layerId)
      commitActiveProjectSpec(next, "canvas-interaction", {
        syncControls: true,
        renderNext: true
      })
    }
  })
} catch (error) {
  reportStartupError("Layers panel init failed", error)
}
const initialSpec: FlowwrapSpec = pack.getDefaults()
function refreshPouchPreview() {
  const supported = Boolean(currentSpec && (currentSpec.doyPouch || currentSpec.kSealPouch || currentSpec.sideSealPouch))
  if (!supported && pouchPreviewActive) {
    setPouchPreviewMode(false)
    return
  }
  pouchPreviewOverlay.hidden = !pouchPreviewActive
  pouchPreviewFop.setAttribute("aria-pressed", String(pouchPreviewFace === "fop"))
  pouchPreviewBop.setAttribute("aria-pressed", String(pouchPreviewFace === "bop"))
  pouchPreviewTrimButton.setAttribute("aria-pressed", String(pouchPreviewShowTrim))
  const source = getCurrentSvg()
  if (!source) return
  const viewport = pouchPreviewActive && currentSpec
    ? resolvePouchPreviewViewport(source, currentSpec, { face: pouchPreviewFace, showTrim: pouchPreviewShowTrim })
    : null
  previewCanvas.classList.toggle("pouch-preview-active", Boolean(viewport))
  source.setAttribute("data-pouch-preview", String(Boolean(viewport)))
  source.setAttribute("data-pouch-preview-face", viewport ? pouchPreviewFace : "")
  source.setAttribute("data-preview-trim", viewport ? String(pouchPreviewShowTrim) : "")
  source.setAttribute("data-pouch-preview-rotation", viewport ? String(POUCH_PREVIEW_ROTATION[viewport.face]) : "")
  source.setAttribute("data-pouch-preview-bounds", viewport ? `${viewport.faceLeft} ${viewport.faceTop} ${viewport.faceWidth} ${viewport.faceHeight}` : "")
  pouchPreviewViewport = viewport
  if (viewport) {
    viewBoxBase = { x: viewport.x, y: viewport.y, width: viewport.width, height: viewport.height }
    // AMENDS 8.2: the element takes the face's exact aspect ratio, so the
    // viewBox is never letterboxed and no other part of the web is painted.
    const bounds = previewCanvas.getBoundingClientRect()
    // Reserve room around the selected face for preview dimensions without
    // widening its crop into the neighbouring face or hidden trim.
    const fitted = fitPouchPreviewElement(viewport, { width: Math.max(1, bounds.width - 176), height: Math.max(1, bounds.height - 176) })
    source.style.width = `${fitted.width}px`
    source.style.height = `${fitted.height}px`
    source.style.flex = "none"
    // Centre the unturned box on the canvas (it may be taller than the canvas
    // before its ±90° turn), so the turned face sits in the middle.
    source.style.alignSelf = "flex-start"
    source.style.margin = `${(bounds.height - fitted.height) / 2}px ${(bounds.width - fitted.width) / 2}px`
  } else {
    viewBoxBase = normalViewBoxBase
    for (const property of ["width", "height", "flex", "align-self", "margin"]) source.style.removeProperty(property)
  }
  if (currentSpec?.doyPouch || currentSpec?.kSealPouch) updateSubMeasuresLayer(source, currentSpec, Boolean(viewport))
  showPouchPreviewMeasures(source, viewport, currentSpec)
  applyCurrentViewBox?.()
  source.dispatchEvent(new Event("canvasviewportchange"))
  requestAnimationFrame(repositionOverlays)
}
function setPouchPreviewMode(enabled: boolean) {
  if (enabled !== pouchPreviewActive) {
    if (enabled) {
      normalViewBoxState = { ...viewBoxState }
      viewBoxState = { zoom: 1, panX: 0, panY: 0 }
    } else {
      viewBoxState = { ...(normalViewBoxState ?? viewBoxState) }
      normalViewBoxState = null
    }
  }
  pouchPreviewActive = enabled
  controlsApi?.setPouchPreviewEnabled(enabled)
  refreshPouchPreview()
}
pouchPreviewFop.addEventListener("click", () => { pouchPreviewFace = "fop"; viewBoxState.panX = 0; viewBoxState.panY = 0; refreshPouchPreview() })
pouchPreviewBop.addEventListener("click", () => { pouchPreviewFace = "bop"; viewBoxState.panX = 0; viewBoxState.panY = 0; refreshPouchPreview() })
pouchPreviewTrimButton.addEventListener("click", () => { pouchPreviewShowTrim = !pouchPreviewShowTrim; refreshPouchPreview() })
window.addEventListener("resize", () => { if (pouchPreviewActive) refreshPouchPreview() })
try {
  controlsApi = initFlowwrapControls({
    container: controlsBody,
    initialSpec,
    baseModelPanelHost,
    attributesPanelHost,
    enablePackPanel: false,
    onFocusLayer: layerId => {
      customPanelApi.setActiveLayer(layerId)
    },
    onElementAdded: id => {
      measureEnabled = false
      measureApi?.setEnabled(false)
      controlsApi?.setMeasureToolEnabled(false)
      panEnabled = false
      controlsApi?.setPanEnabled(false)
      selectEnabled = true
      selectionStore.setSelectionMode(true)
      controlsApi?.setSelectEnabled(true)
      selectionStore.setSelectedElementIds([id])
      setSvgToolFlags(getCurrentSvg())
      selectionApi?.refreshMarkers()
    },
    onChange: (next, changeReason) => {
      if (!undoLocked) {
        pushUndo()
      }
      const active = getActiveArtboard()
      if (!active) {
        return
      }
      const updated = commitActiveProjectSpec(active.spec?.lidding ? commitLiddingLaneElements(active.spec, next) : next, changeReason, {
        syncControls: false,
        renderNext: active.started
      })
      if (!updated) {
        return
      }
      if (!active.started) {
        return
      }
    },
    onMeasureToggle: enabled => {
      measureEnabled = enabled
      const currentSvg = previewCanvas.querySelector("svg")
      if (currentSvg) {
        currentSvg.setAttribute("data-measure-enabled", enabled ? "true" : "false")
      }
      if (measureApi) {
        measureApi.setEnabled(enabled)
      }
      if (enabled) {
        panEnabled = false
        currentSvg?.setAttribute("data-pan-enabled", "false")
        controlsApi?.setPanEnabled?.(false)
        selectEnabled = false
        selectionStore.setSelectionMode(false)
        controlsApi?.setSelectEnabled?.(false)
      } else {
        panEnabled = true
        currentSvg?.setAttribute("data-pan-enabled", "true")
        controlsApi?.setPanEnabled?.(true)
      }
    },
    onPanToggle: enabled => {
      panEnabled = enabled
      const currentSvg = previewCanvas.querySelector("svg")
      if (currentSvg) {
        currentSvg.setAttribute("data-pan-enabled", enabled ? "true" : "false")
      }
      if (enabled) {
        measureEnabled = false
        measureApi?.setEnabled(false)
        controlsApi?.setMeasureToolEnabled?.(false)
        selectEnabled = false
        selectionStore.setSelectionMode(false)
        controlsApi?.setSelectEnabled?.(false)
      }
    },
    onSelectToggle: enabled => {
      if (enabled) {
        measureEnabled = false
        measureApi?.setEnabled(false)
        controlsApi?.setMeasureToolEnabled?.(false)
        panEnabled = false
        getCurrentSvg()?.setAttribute("data-pan-enabled", "false")
        controlsApi?.setPanEnabled?.(false)
      }
      selectEnabled = enabled
      if (!enabled) {
        panEnabled = true
        getCurrentSvg()?.setAttribute("data-pan-enabled", "true")
        controlsApi?.setPanEnabled?.(true)
      }
      selectionStore.setSelectionMode(enabled)
      if (!enabled) {
        selectionStore.clearSelection()
      }
    },
    onPouchPreviewToggle: enabled => {
      setPouchPreviewMode(enabled)
    },
  onZoomChange: zoom => {
    const svg = getCurrentSvg()
    if (!svg || !viewBoxBase) return
    const next = zoomViewBox(viewBoxBase, svg.viewBox.baseVal, zoom)
    viewBoxState = { zoom: clampCanvasZoom(zoom), panX: next.x - viewBoxBase.x, panY: next.y - viewBoxBase.y }
    // One path sets the viewBox, so Pouch Preview's face clamp also applies here.
    applyCurrentViewBox?.()
    svg.dispatchEvent(new Event("canvasviewportchange"))
    saveActiveViewBoxState()
    requestAnimationFrame(repositionOverlays)
  },
  onReferenceGridToggle: enabled => {
    referenceGridEnabled = enabled
    getCurrentSvg()?.setAttribute("data-reference-grid", String(enabled))
  }
})
} catch (error) {
  controlsApi = null
  reportStartupError("Controls init failed", error)
}

startSelect.addEventListener("change", () => {
  setSelectedStartPack(startSelect.value)
})

startButton.addEventListener("click", () => {
  launchSelectedPackProject()
})
homeButton.addEventListener("click", () => {
  const active = getActiveArtboard()
  if (active) {
    showStartOverlay(active)
  }
})
customProjectButton.addEventListener("click", () => {
  openSandboxStudio()
})

studioHomeButton.addEventListener("click", () => {
  let active = getActiveArtboard()
  if (!active) {
    active = createArtboard()
    activeArtboardId = active.id
    updateArtboardTabs()
  }
  hideNewArtboardOverlay()
  showStartOverlay(active)
})

previewReturnButton.addEventListener("click", () => {
  setPreviewMode(false)
})

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && pouchPreviewActive) {
    event.preventDefault()
    setPouchPreviewMode(false)
    return
  }
  if (event.key === "Escape" && previewMode) {
    event.preventDefault()
    setPreviewMode(false)
    return
  }
  if (isEditableTextTarget(event.target)) {
    return
  }
  if (event.key === "Escape" && selectionStore.getState().selectedElementIds.length > 0) {
    event.preventDefault()
    selectionStore.clearSelection()
    return
  }
  if (event.key === "Escape" && hasActiveTool()) {
    event.preventDefault()
    clearActiveTool()
    return
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    if (selectionStore.getState().selectedElementIds.length > 0) {
      event.preventDefault()
      deleteSelectedFromCurrentSpec()
    } else if (event.key === "Backspace" && hasActiveTool()) {
      event.preventDefault()
      clearActiveTool()
    }
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
    event.preventDefault()
    copySelectedToBuffer()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
    event.preventDefault()
    pasteFromBuffer()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault()
    applyUndo()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault()
    saveCurrentProject()
    return
  }
  const arrowDeltaMap: Record<string, { x: number; y: number }> = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  }
  const arrowDelta = arrowDeltaMap[event.key]
  if (arrowDelta && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const multiplier = (event.shiftKey ? 5 : 1) * getNudgeIncrementMm()
    if (event.altKey) {
      const resized = resizeSelectedEditableObjects(
        (event.key === "ArrowUp" || event.key === "ArrowRight" ? 2 : -2) * multiplier
      )
      if (!resized) {
        return
      }
      return
    }
    nudgeSelectedEditableObjects(
      arrowDelta.x * multiplier,
      arrowDelta.y * multiplier
    )
  }
})

newArtboardButton.addEventListener("click", () => {
  if (!pendingArtboardId) {
    return
  }
  const artboard = artboards.find(item => item.id === pendingArtboardId)
  if (!artboard) {
    hideNewArtboardOverlay()
    return
  }
  artboard.packId = newArtboardSelect.value
  const nextPack = getPackModule(artboard.packId) ?? packModules[0]
  if (!nextPack) {
    return
  }
  pack = nextPack
  applyMeasureDefaultsForPack(nextPack.id)
  const nextSpec = pack.getDefaults()
  const initialisedSpec = initialiseArtboardProject(artboard, nextSpec, "pack-created")
  if (!initialisedSpec) {
    return
  }
  artboard.started = true
  artboard.savedProjectId = undefined
  artboard.viewBoxState = { zoom: 1, panX: 0, panY: 0 }
  activeArtboardId = artboard.id
  updateArtboardTabs()
  viewBoxState = { ...artboard.viewBoxState }
  currentSpec = initialisedSpec
  logCutterDebugState("cutter-state-reset", currentSpec, {
    packId: nextPack.id,
    artboardId: artboard.id,
    defaultsApplied: true,
    hasUserModifiedState: false
  })
  controlsApi?.syncSpecFromProject(currentSpec)
  customPanelApi.setSpec(currentSpec)
  hideNewArtboardOverlay()
  render(currentSpec)
})

function render(spec: FlowwrapSpec) {
  if(spec.sachet && !spec.sachet.activeStepId){
    spec=initialiseSachetSteps(spec)
    currentSpec=spec
    controlsApi?.syncSpecFromProject(spec)
  }
  errors.textContent = ""
  layerManager.setLayerChildrenMap(buildLayerChildrenMap(spec))
  customPanelApi.setSpec(spec)

  try {
    const setMeasurementActive = controlsApi?.setMeasurementActive ?? (() => {})
    const svg = pack.render(spec)
    applyBaseLayerCustomisation(svg, spec)
    applyLayerStateToSvg(svg)
    layerManager.setAvailableLayerIds(collectAvailableLayerIds(svg, spec))
    const initialViewBox = svg.viewBox.baseVal
    viewBoxBase = {
      x: initialViewBox.x,
      y: initialViewBox.y,
      width: initialViewBox.width,
      height: initialViewBox.height
    }
    normalViewBoxBase = { ...viewBoxBase }
    const applyViewBox = () => {
      if (!viewBoxBase) {
        return
      }
      let zoom = clampCanvasZoom(viewBoxState.zoom)
      viewBoxState.zoom = zoom
      svg.setAttribute("data-canvas-zoom", String(zoom))
      let width = viewBoxBase.width / zoom
      let height = viewBoxBase.height / zoom
      let x = viewBoxBase.x + viewBoxState.panX
      let y = viewBoxBase.y + viewBoxState.panY
      if (pouchPreviewViewport && svg.getAttribute("data-pouch-preview") === "true") {
        // Pouch Preview never zooms or pans beyond the selected face.
        const clamped = clampPouchPreviewView(pouchPreviewViewport, { x, y, width, height })
        ;({ x, y, width, height } = clamped)
        zoom = viewBoxBase.width / width
        viewBoxState.zoom = zoom
        viewBoxState.panX = x - viewBoxBase.x
        viewBoxState.panY = y - viewBoxBase.y
        svg.setAttribute("data-canvas-zoom", String(zoom))
      }
      svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`)
      controlsApi?.setCanvasZoom?.(zoom)
    }
    applyCurrentViewBox = applyViewBox
    applyViewBox()

    const getSvgPoint = (clientX: number, clientY: number) => {
      const point = svg.createSVGPoint()
      point.x = clientX
      point.y = clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) {
        return { x: clientX, y: clientY }
      }
      const inverse = ctm.inverse()
      const transformed = point.matrixTransform(inverse)
      return { x: transformed.x, y: transformed.y }
    }

    const onWheelZoom = (delta:number,clientX:number,clientY:number) => {
      if (!viewBoxBase) {
        return
      }
      const current = svg.viewBox.baseVal
      const cursor = getSvgPoint(clientX, clientY)
      const fx = (cursor.x - current.x) / current.width
      const fy = (cursor.y - current.y) / current.height
      const nextZoom = viewBoxState.zoom * wheelZoomFactor(delta)
      const clampedZoom = clampCanvasZoom(nextZoom)
      const nextWidth = viewBoxBase.width / clampedZoom
      const nextHeight = viewBoxBase.height / clampedZoom
      const nextX = cursor.x - fx * nextWidth
      const nextY = cursor.y - fy * nextHeight
      viewBoxState = {
        zoom: clampedZoom,
        panX: nextX - viewBoxBase.x,
        panY: nextY - viewBoxBase.y
      }
      applyViewBox()
      svg.dispatchEvent(new Event("canvasviewportchange"))
      requestAnimationFrame(repositionOverlays)
      saveActiveViewBoxState()
    }

    canvasPanApi?.destroy()
    canvasPanApi = attachCanvasPan(svg, selectionStore, () => panEnabled, (dx, dy) => {
      viewBoxState = {...viewBoxState,panX:viewBoxState.panX+dx,panY:viewBoxState.panY+dy}
      applyViewBox()
      svg.dispatchEvent(new Event("canvasviewportchange"))
      requestAnimationFrame(repositionOverlays)
      saveActiveViewBoxState()
    })
    canvasWheelApi?.destroy()
    canvasWheelApi = attachCanvasWheel(svg,onWheelZoom,resizeSelectedEditableObjects)
    svg.addEventListener("contextmenu", event => {
      event.preventDefault()
      clearActiveTool()
    })

    measureApi?.destroy()
    measureApi = null
    previewCanvas.innerHTML = ""
    previewCanvas.appendChild(svg)
    refreshPouchPreview()
    syncLayerState()
    setSvgToolFlags(svg)
    const commitCanvasInteraction = (next: FlowwrapSpec) => {
      const intent=paperStripEditingApi?.consumeMove()
      commitActiveProjectSpec(spec.paperStrip?commitPaperStripStepEdit(spec,next,intent):spec.sachet && !spec.sideSealPouch?commitSachetStepEdit(spec,next,intent):spec.lidding?commitLiddingLaneElements(spec,next):next, "canvas-interaction", {
        syncControls: true,
        renderNext: true
      })
    }
    paperStripEditingApi?.destroy()
    const activateStep=(next:FlowwrapSpec,id:string|null)=>{
      commitActiveProjectSpec(next,"canvas-interaction",{syncControls:true,renderNext:true})
      selectionStore.setSelectionMode(true)
      selectionStore.setSelectedElementIds(id?[id]:[])
    }
    paperStripEditingApi = (spec.paperStrip || spec.sachet) && !spec.sideSealPouch?attachPaperStripEditing(svg,spec,activateStep):null
    stepNavigationCleanup?.()
    stepNavigationCleanup=attachStepNavigation(previewCanvas,svg,spec,activateStep,next=>commitActiveProjectSpec(next,"canvas-interaction",{syncControls:true,renderNext:true}))
    gussetDockCleanup?.()
    gussetDockCleanup=attachGussetDock(previewCanvas,spec,next=>commitActiveProjectSpec(next,"canvas-interaction",{syncControls:true,renderNext:true}))
    liddingDockCleanup?.()
    liddingDockCleanup=attachLiddingDock(previewFrame,spec,next=>commitActiveProjectSpec(next,"canvas-interaction",{syncControls:true,renderNext:true}),baseModelPanelHost)
    const editorSvg=paperStripEditingApi?.editor??svg
    attachSafeZoneInteractions(editorSvg, spec, commitCanvasInteraction, setMeasurementActive)
    attachAttributeBoxInteractions(editorSvg, spec, commitCanvasInteraction)
    attachEyeMarkInteractions(spec.sachet?svg:editorSvg, spec, commitCanvasInteraction)
    attachHangerSlotInteractions(editorSvg, spec, commitCanvasInteraction)
    attachWindowInteractions(editorSvg, spec, commitCanvasInteraction)
    attachHalfMoonCutoutInteractions(editorSvg, spec, commitCanvasInteraction)
    attachKSealPouchInteractions(svg, spec, commitCanvasInteraction)
    attachFoldLineInteractions(editorSvg, spec, commitCanvasInteraction, setMeasurementActive)
    attachOpeningInteractions(svg, spec, commitCanvasInteraction)
    attachLegendPlacement(svg, spec, commitCanvasInteraction)
    attachTearNotchInteractions(svg, spec, commitCanvasInteraction)
    attachDoyGeometryInteractions(svg, spec, commitCanvasInteraction)
    attachPerfInteractions(editorSvg, spec, commitCanvasInteraction)
    paperStripInteractionApi?.destroy()
    paperStripInteractionApi =
      attachPaperStripInteractions(editorSvg, spec, commitCanvasInteraction) ?? null
    attachSealInteractions(svg, spec, next => {
      let resolvedNext = next
      if (controlsApi?.isSealAspectLocked?.()) {
        const currentSeals = {
          top: spec.seals?.top ?? spec.seal,
          bottom: spec.seals?.bottom ?? spec.seal,
          left: spec.seals?.left ?? spec.seal,
          right: spec.seals?.right ?? spec.seal
        }
        const nextSeals = {
          top: next.seals?.top ?? next.seal,
          bottom: next.seals?.bottom ?? next.seal,
          left: next.seals?.left ?? next.seal,
          right: next.seals?.right ?? next.seal
        }
        const deltas = [
          { key: "top", delta: Math.abs(nextSeals.top - currentSeals.top), value: nextSeals.top },
          {
            key: "bottom",
            delta: Math.abs(nextSeals.bottom - currentSeals.bottom),
            value: nextSeals.bottom
          },
          { key: "left", delta: Math.abs(nextSeals.left - currentSeals.left), value: nextSeals.left },
          {
            key: "right",
            delta: Math.abs(nextSeals.right - currentSeals.right),
            value: nextSeals.right
          }
        ]
        deltas.sort((a, b) => b.delta - a.delta)
        const changed = deltas[0]
        const uniformMax = Math.max(0, Math.min(next.width / 2, next.height / 2))
        const uniform = Math.max(0, Math.min(changed?.value ?? next.seal, uniformMax))
        resolvedNext = {
          ...next,
          seal: uniform,
          seals: { top: uniform, bottom: uniform, left: uniform, right: uniform }
        }
      }
      commitCanvasInteraction(resolvedNext)
    })
    selectionApi?.destroy()
    syncSelectionElements(editorSvg)
    selectionApi = attachSelectionInteractions(editorSvg, selectionStore, () => {
      measureEnabled = false
      measureApi?.setEnabled(false)
      controlsApi?.setMeasureToolEnabled?.(false)
      panEnabled = false
      controlsApi?.setPanEnabled?.(false)
      selectionStore.setSelectionMode(true)
      controlsApi?.setSelectEnabled?.(true)
      setSvgToolFlags(getCurrentSvg())
    })
    selectionApi.refreshMarkers()
    selectionContextApi?.destroy()
    selectionContextApi = attachSelectionContextActions(editorSvg, selectionStore, () => currentSpec, commitCanvasInteraction, () => pack.id)
    measureApi = attachMeasureTool(svg, value => {
      controlsApi?.setMeasurement(value)
    })
    if (measureApi) {
      measureApi.setEnabled(measureEnabled)
    }
    const active = getActiveArtboard()
    const activeProject = active?.project
    if (activeProject) {
      refreshActiveValidation(activeProject)
      if (import.meta.env.DEV) {
        console.debug("[Kyza][Validation Centre]", validationCentreSummary)
      }
    } else {
      validationCentreSummary = null
      issueEntries = collectIssuesFromSvg(svg)
      if (import.meta.env.DEV) {
        console.debug(
          "[Kyza][Validation Wiring]",
          getSvgFallbackValidationDebug(issueEntries, active?.packId)
        )
      }
    }
    renderIssuePanel()
    syncStudioWorkspaceHeader()
    customPanelApi.refreshExportReadiness()

    const dockShell = document.getElementById("dock-shell")
    const rightRailEl = document.getElementById("right-rail")
    const positionDock = () => {
      if (!dockShell) {
        return
      }
      const rect = svg.getBoundingClientRect()
      if (!rect.width || !rect.height) {
        return
      }
      const dockWidth = dockShell.offsetWidth || 0
      const dockHeight = dockShell.offsetHeight || 0
      const canvasRect = previewFrame.getBoundingClientRect()
      const railRect = rightRailEl?.getBoundingClientRect()
      const bottomActionsRect = studioBottomActions.getBoundingClientRect()
      const margin = 14
      const maximumRight = railRect && railRect.width > 0
        ? Math.min(canvasRect.right - margin, railRect.left - margin)
        : canvasRect.right - margin
      const maximumBottom = bottomActionsRect.height > 0 && bottomActionsRect.top > canvasRect.top && bottomActionsRect.top < canvasRect.bottom
        ? Math.min(canvasRect.bottom - margin, bottomActionsRect.top - margin)
        : canvasRect.bottom - margin
      const userPositioned = dockShell.getAttribute("data-user-position") === "true"
      const currentRect = dockShell.getBoundingClientRect()
      const x = userPositioned
        ? currentRect.left
        : canvasRect.left + (maximumRight - canvasRect.left - dockWidth) / 2
      const y = userPositioned ? currentRect.top : canvasRect.top + margin
      const clampedX = Math.min(
        maximumRight - dockWidth,
        Math.max(canvasRect.left + margin, x)
      )
      const clampedY = Math.min(
        maximumBottom - dockHeight,
        Math.max(canvasRect.top + margin, y)
      )
      dockShell.style.left = `${clampedX}px`
      dockShell.style.top = `${clampedY}px`
      dockShell.style.transform = "none"
    }

    const positionRightRail = () => {
      if (!rightRailEl) {
        return
      }
      rightRailEl.style.left = "auto"
      rightRailEl.style.right = "14px"
      rightRailEl.style.top = "50%"
      rightRailEl.style.transform = "translateY(-50%)"
    }

    repositionOverlays = () => {
      positionDock()
      positionRightRail()
      positionArtboardTabs()
    }
    requestAnimationFrame(repositionOverlays)
    if (!dockPositionListenerAttached) {
      dockPositionListenerAttached = true
      window.addEventListener("resize", () => {
        requestAnimationFrame(repositionOverlays)
      })
      window.addEventListener("dock-reposition-request", () => {
        requestAnimationFrame(repositionOverlays)
      })
    }
    syncArtworkStudioButton()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown rendering error."
    errors.textContent = message
    issueEntries = [
      { id: "render-error", message, layerId: null }
    ]
    renderIssuePanel()
    syncArtworkStudioButton()
  }
}

const hydrateStartupArtboard = () => {
  if (!startupActiveCutterState?.project || !startupActiveCutterState.spec) {
    return false
  }
  const nextPack = getPackModule(startupActiveCutterState.project.packType) ?? packModules[0]
  if (!nextPack) {
    return false
  }
  pack = nextPack
  applyMeasureDefaultsForPack(nextPack.id)
  const hydratedSpec = cloneSpec(startupActiveCutterState.spec)
  if (!hydratedSpec) {
    return false
  }
  const hydratedArtboard: Artboard = {
    id: "artboard-1",
    name: startupActiveCutterState.project.displayName,
    packId: startupActiveCutterState.project.packType,
    spec: hydratedSpec,
    project: projectFromLegacySpec(
      startupActiveCutterState.project.packType,
      startupActiveCutterState.project.displayName,
      hydratedSpec,
      {
        ...(startupActiveCutterState.project.projectId
          ? { id: startupActiveCutterState.project.projectId }
          : {}),
        ...(startupActiveCutterState.project.projectDraft
          ? {
              projectDraft: startupActiveCutterState.project.projectDraft,
              createdAt: startupActiveCutterState.project.projectDraft.createdAt,
              updatedAt: startupActiveCutterState.project.projectDraft.updatedAt
            }
          : {})
      }
    ),
    started: true,
    viewBoxState: { zoom: 1, panX: 0, panY: 0 }
  }
  artboards = [hydratedArtboard]
  activeArtboardId = hydratedArtboard.id
  currentSpec = synchroniseArtboardProject(hydratedArtboard, "save-load")
  if (!currentSpec) {
    return false
  }
  viewBoxState = { ...hydratedArtboard.viewBoxState }
  selectionStore.setSelectedElementIds(startupActiveCutterState.activeElements.selectedElementIds)
  selectionStore.setSelectionMode(startupActiveCutterState.activeElements.selectedElementIds.length > 0)
  updateArtboardTabs()
  hideStartOverlay()
  controlsApi?.syncSpecFromProject(currentSpec)
  customPanelApi.setSpec(currentSpec)
  logCutterDebugState("startup-hydrated", currentSpec, {
    packId: hydratedArtboard.packId,
    artboardId: hydratedArtboard.id,
    defaultsApplied: false,
    hasUserModifiedState: true,
    selectionCount: startupActiveCutterState.activeElements.selectedElementIds.length
  })
  render(currentSpec)
  return true
}

const showRequestedProjectError = (message: string) => {
  requestedProjectErrorMessage.textContent = message
  requestedProjectErrorOverlay.classList.add("is-visible")
  document.body.classList.remove("studio-mode")
  document.body.classList.add("start-mode")
  requestAnimationFrame(() => requestedProjectDashboardLink.focus())
}

const hydrateRequestedProject = (request: RequestedProjectId) => {
  if (request.status === "invalid") {
    showRequestedProjectError(request.message)
    return false
  }
  if (request.status !== "valid") {
    return false
  }
  const loaded = loadRequestedProject(request.projectId)
  if (loaded.ok === false) {
    showRequestedProjectError(loaded.errors.join(" "))
    return false
  }
  const nextPack = getPackModule(loaded.value.project.cutter.packType)
  if (!nextPack) {
    showRequestedProjectError(
      `The requested Project uses unsupported pack type "${loaded.value.project.cutter.packType}".`
    )
    return false
  }
  const hydratedArtboard: Artboard = {
    id: "artboard-1",
    name: loaded.value.project.name,
    packId: loaded.value.project.cutter.packType,
    spec: loaded.value.spec,
    project: loaded.value.project,
    started: true,
    viewBoxState: { zoom: 1, panX: 0, panY: 0 }
  }
  const presentation = prepareProjectPresentationCard(
    savedProjectCards,
    loaded.value.project,
    loaded.value.spec
  )
  savedProjectCards = presentation.cards
  hydratedArtboard.savedProjectId = presentation.cardId
  artboards = [hydratedArtboard]
  activeArtboardId = hydratedArtboard.id
  currentSpec = synchroniseArtboardProject(hydratedArtboard, "save-load")
  if (!currentSpec) {
    artboards = []
    activeArtboardId = null
    showRequestedProjectError("The requested Project contains invalid Cutter data.")
    return false
  }
  pack = nextPack
  applyMeasureDefaultsForPack(nextPack.id)
  viewBoxState = { ...hydratedArtboard.viewBoxState }
  selectionStore.setSelectedElementIds([])
  selectionStore.setSelectionMode(false)
  updateArtboardTabs()
  controlsApi?.syncSpecFromProject(currentSpec)
  customPanelApi.setSpec(currentSpec)
  hideStartOverlay()
  logCutterDebugState("requested-project-hydrated", currentSpec, {
    projectId: hydratedArtboard.project?.id,
    packId: hydratedArtboard.packId,
    artboardId: hydratedArtboard.id,
    defaultsApplied: false,
    hasUserModifiedState: true
  })
  render(currentSpec)
  return true
}

const openDefaultCutterStart = () => {
  requestedProjectErrorOverlay.classList.remove("is-visible")
  const initialArtboard = createArtboard()
  logCutterDebugState("startup-default", initialArtboard.spec, {
    artboardId: initialArtboard.id,
    defaultsApplied: true,
    hasUserModifiedState: false
  })
  setActiveArtboard(initialArtboard.id)
}

requestedProjectNormalStart.addEventListener("click", openDefaultCutterStart)

const choosingPack = new URLSearchParams(window.location.search).has("choose")
const requestedProject = parseRequestedProjectId(choosingPack ? "" : window.location.search)
const startupSource = chooseCutterStartupSource(
  requestedProject,
  Boolean(startupActiveCutterState?.project && startupActiveCutterState.spec)
)

const sandboxParams = new URLSearchParams(window.location.search)
const requestedSandbox = sandboxParams.get("studio") === "sandbox"
if (requestedSandbox) {
  const width = Number(sandboxParams.get("width"))
  const height = Number(sandboxParams.get("height"))
  const film = sandboxParams.get("substrate") ?? "clear"
  const name = sandboxParams.get("name")?.trim() || "Sandbox"
  openSandboxStudio(true, {
    name: name.slice(0, 100),
    width: Number.isFinite(width) && width > 0 ? width : SANDBOX_DEFAULT_WIDTH_MM,
    height: Number.isFinite(height) && height > 0 ? height : SANDBOX_DEFAULT_HEIGHT_MM,
    film: film === "white" ? "White" : film === "paper" ? "Paper" : film === "white-paper" ? "White Paper" : film === "black-paper" ? "Black Paper" : SANDBOX_DEFAULT_FILM_COLOUR,
  })
} else if (startupSource === "requested-project") {
  hydrateRequestedProject(requestedProject)
} else if (!hydrateStartupArtboard()) {
  openDefaultCutterStart()
} else {
  const entry=new URLSearchParams(window.location.search).get("studio")
  const resume=entry==="resume" || window.location.hash==="#save-export" || (!entry && getStudioDestination()==="app")
  const active=getActiveArtboard()
  if(!resume && active)showStartOverlay(active)
}

if (choosingPack) {
  const active = getActiveArtboard()
  if (active) showStartOverlay(active)
  chooseButton.click()
}

document.addEventListener("click", event => {
  if (openStartCardMenu && event.target instanceof Node && !openStartCardMenu.contains(event.target)) {
    openStartCardMenu.previousElementSibling?.setAttribute("aria-expanded", "false")
    openStartCardMenu.classList.remove("is-open")
    openStartCardMenu = null
  }
})
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && openStartCardMenu) {
    const trigger = openStartCardMenu.previousElementSibling as HTMLButtonElement | null
    trigger?.setAttribute("aria-expanded", "false")
    openStartCardMenu.classList.remove("is-open")
    openStartCardMenu = null
    trigger?.focus()
  }
})

