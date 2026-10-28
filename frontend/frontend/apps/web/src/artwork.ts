import {
  MVP_DEMO_PACK,
  createCurrentProject,
  cutterRouteParams,
  loadCurrentProject,
  projectFromSearchParams,
  resolveCurrentProject,
  saveCurrentProject,
} from "./config/mvpDemoPack"
import {
  collectActiveCutterAttributes,
  DEFAULT_PRINT_RULES,
  buildActiveCutterState,
  loadActiveCutterState,
  saveActiveCutterState,
  type PrintRules
} from "./config/activeCutterState"
import { getPackModule } from "./packs"
import { applyBaseLayerCustomisation } from "./renderers/baseLayerCustomisation"
import type { FlowwrapSpec } from "./types/flowwrap"
import {
  ARTWORK_FILE_ACCEPT,
  ARTWORK_UPLOAD_TYPE_LABELS,
  ARTWORK_UPLOAD_TYPES,
  type ArtworkOrientation,
  type ArtworkCollection,
  type ArtworkItem,
  type ArtworkUploadType
} from "./artwork/artworkTypes"
import {
  buildArtworkLabel,
  getArtworkCapabilityFlags,
  getDefaultArtworkCategory,
  isSupportedArtworkFile,
  readArtworkFile,
} from "./artwork/artworkMedia"
import {
  centerArtworkInBounds,
  fitArtworkToArea,
  fitArtworkToHeight,
  fitArtworkToWidth,
  getArtworkBounds,
  getBleedBounds,
  getCutterBounds,
  type ArtworkCornerHandle,
  resetArtworkPosition,
  syncArtworkSelectionOverlay,
  syncArtworkLayer,
  syncFloodPreviewLayer,
} from "./artwork/artworkRenderer"
import {
  applyArtworkProofLayerVisibility,
  buildArtworkProofPageSvg,
  createArtworkProofFilename,
  createRasterProofPdfBlobFromSvg,
  DEFAULT_ARTWORK_PROOF_EXPORT_OPTIONS,
  downloadProofBlob,
  openProofSavePicker,
  type ArtworkProofExportOptions,
} from "./artwork/artworkProofExport"
import {
  buildArtworkPreflightReport
} from "./artwork/artworkPreflight.helpers"
import {
  getEyeMarkOffsetsForIndex,
  setEyeMarkOffsetsForIndex
} from "./geometry/eyeMarkState"
import type {
  ArtworkAffectedEyemark,
  ArtworkBounds,
  ArtworkCategory,
  ArtworkTdEdgeSide
} from "./artwork/artworkRules.types"
import {
  loadArtworkCollection,
  removeArtworkItem,
  saveArtworkCollection,
  selectArtworkItem,
  updateArtworkItem,
  upsertArtworkItem,
} from "./artwork/artworkStore"
import { runEngineRequest } from "../../../packages/engine-api"
import { projectFromLegacySpec } from "../../../packages/cutter-engine/project"
import {
  buildProjectValidationWorkflowState,
  type ProjectValidationWorkflowState
} from "./validation/validationCentre"

const app = document.getElementById("artwork-app")

if (!app) {
  throw new Error("Artwork app root not found.")
}

let activeCutterState = loadActiveCutterState()
const currentProjectFromStorage = loadCurrentProject()
const currentProjectFromUrl = projectFromSearchParams(window.location.search)
const hasUrlParams = Boolean(
  currentProjectFromUrl.packType ||
    currentProjectFromUrl.prompt ||
    currentProjectFromUrl.width ||
    currentProjectFromUrl.height ||
    currentProjectFromUrl.displayName ||
    currentProjectFromUrl.productName
)
const currentProject = activeCutterState?.project
  ?? resolveCurrentProject(window.location.search, {
    stage: "artwork"
  })
saveCurrentProject(currentProject)
let artworkCollection: ArtworkCollection = loadArtworkCollection(currentProject)
let artworkImportModalOpen = false
let proofExportModalOpen = false
let pendingArtworkUploadType: ArtworkUploadType | null = null
let artworkEditModeId: string | null = null
let proofExportOptions: ArtworkProofExportOptions = {
  ...DEFAULT_ARTWORK_PROOF_EXPORT_OPTIONS,
  includeFloodPreview: Boolean(DEFAULT_PRINT_RULES.floodPrint || DEFAULT_PRINT_RULES.printInSeals)
}
const ignoredArtworkWarningIds = new Set<string>()
let lastPreflightDebugSignature = ""

const packModule =
  getPackModule(currentProject.packType) ?? getPackModule(MVP_DEMO_PACK.packType)

const buildRenderedSpec = (): FlowwrapSpec =>
  activeCutterState?.spec
    ? {
        ...activeCutterState.spec,
        width: currentProject.width,
        height: currentProject.height
      }
    : {
        ...(packModule?.getDefaults() ??
          (() => {
            throw new Error("Pillow Pack renderer not available.")
          })()),
        width: currentProject.width,
        height: currentProject.height
      }

let renderedSpec: FlowwrapSpec = buildRenderedSpec()

const refreshRenderedSpec = () => {
  renderedSpec = buildRenderedSpec()
}

const dataSourceLabel = activeCutterState
  ? "active cutter state"
  : hasUrlParams
    ? "URL params"
    : currentProjectFromStorage
      ? "currentProject localStorage"
      : "MVP fallback"
const renderedAttributeGroups =
  activeCutterState?.attributes ?? collectActiveCutterAttributes(renderedSpec)
const attributeTypesLabel = renderedAttributeGroups.length
  ? renderedAttributeGroups.map(attribute => attribute.type).join(", ")
  : "none"
let printRules: PrintRules = {
  ...DEFAULT_PRINT_RULES,
  ...(activeCutterState?.printRules ?? {})
}

if (activeCutterState && !renderedAttributeGroups.length) {
  console.warn("[Artwork Studio] No active attributes found in cutter state.")
}

logArtworkDebugState("mount", {
  dataSource: dataSourceLabel,
  hasActiveState: Boolean(activeCutterState)
})

const projectSizeLabel = `width=${currentProject.width} height=${currentProject.height}`

console.log("[Artwork Studio] Data source:", dataSourceLabel)
console.log("[Artwork Studio] Project size source:", projectSizeLabel)
console.log("[Artwork Studio] Attributes loaded:", renderedAttributeGroups.length)
console.log("[Artwork Studio] Attribute types:", attributeTypesLabel)
console.log("[Artwork Studio] Print rules:", printRules)

const technicalProject = {
  ...currentProject,
  packLabel: currentProject.packLabel ?? MVP_DEMO_PACK.packLabel,
  width: renderedSpec.width,
  height: renderedSpec.height,
  stage: "artwork"
}

document.title = `${technicalProject.displayName} - Artwork Studio`

const backProject = createCurrentProject({
  ...technicalProject,
  stage: "cutter"
})

type PreviewViewState = {
  zoomPercent: number
  panX: number
  panY: number
}

type PreviewContentBounds = {
  x: number
  y: number
  width: number
  height: number
}

const PREVIEW_MIN_ZOOM_PERCENT = 70
const PREVIEW_MAX_ZOOM_PERCENT = 250
const PREVIEW_ZOOM_STEP_PERCENT = 5
const PREVIEW_FIT_PADDING = 48

let previewViewState: PreviewViewState = {
  zoomPercent: 100,
  panX: 0,
  panY: 0
}

let previewSvg: SVGSVGElement | null = null
let previewContentBounds: PreviewContentBounds | null = null

let previewDragState:
  | {
      pointerId: number
      startX: number
      startY: number
      originPanX: number
      originPanY: number
    }
  | null = null

let artworkDragState:
  | {
      pointerId: number
      itemId: string
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | null = null

const clampPreviewZoomPercent = (value: number) =>
  Math.max(PREVIEW_MIN_ZOOM_PERCENT, Math.min(PREVIEW_MAX_ZOOM_PERCENT, value))

const measurePreviewContentBounds = (svg: SVGSVGElement): PreviewContentBounds => {
  try {
    const bbox = svg.getBBox()
    if (bbox.width > 0 && bbox.height > 0) {
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      }
    }
  } catch {
    // Fall back to the SVG viewBox below.
  }
  const viewBox = svg.viewBox.baseVal
  return {
    x: viewBox.x,
    y: viewBox.y,
    width: viewBox.width || parseNumberAttr(svg, "width", 1),
    height: viewBox.height || parseNumberAttr(svg, "height", 1)
  }
}

const syncPreviewViewport = () => {
  const viewport = document.getElementById("artwork-preview-viewport")
  const stage = document.getElementById("artwork-preview-stage")
  const slider = document.getElementById("artwork-zoom-slider")

  if (
    !(viewport instanceof HTMLElement) ||
    !(stage instanceof HTMLElement) ||
    !previewSvg
  ) {
    return
  }

  const viewportRect = viewport.getBoundingClientRect()
  const bounds = previewContentBounds ?? measurePreviewContentBounds(previewSvg)
  previewContentBounds = bounds
  const padding = Math.max(16, Math.round(Math.min(bounds.width, bounds.height) * 0.08))
  const baseViewBox = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2
  }
  const zoomFactor = previewViewState.zoomPercent / 100
  const currentWidth = baseViewBox.width / zoomFactor
  const currentHeight = baseViewBox.height / zoomFactor
  const currentX =
    baseViewBox.x + (baseViewBox.width - currentWidth) / 2 + previewViewState.panX
  const currentY =
    baseViewBox.y + (baseViewBox.height - currentHeight) / 2 + previewViewState.panY
  const maxPanX = Math.max(0, (baseViewBox.width - currentWidth) / 2)
  const maxPanY = Math.max(0, (baseViewBox.height - currentHeight) / 2)

  previewViewState.panX = previewViewState.zoomPercent <= 100 ? 0 : Math.max(-maxPanX, Math.min(maxPanX, previewViewState.panX))
  previewViewState.panY = previewViewState.zoomPercent <= 100 ? 0 : Math.max(-maxPanY, Math.min(maxPanY, previewViewState.panY))

  previewSvg.setAttribute("viewBox", `${currentX} ${currentY} ${currentWidth} ${currentHeight}`)
  previewSvg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  stage.style.width = "100%"
  stage.style.height = "100%"
  previewSvg.style.width = "100%"
  previewSvg.style.height = "100%"

  const selectedItem =
    artworkCollection.selectedId
      ? artworkCollection.items.find(item => item.id === artworkCollection.selectedId && item.visible) ?? null
      : null
  const handleSizeMm =
    viewportRect.width > 0
      ? Math.max(4, (currentWidth / viewportRect.width) * 14)
      : 8
  syncArtworkSelectionOverlay(previewSvg, selectedItem, handleSizeMm)

  if (slider instanceof HTMLInputElement) {
    slider.value = String(Math.round(previewViewState.zoomPercent))
  }
}

const setPreviewZoomPercent = (nextZoomPercent: number) => {
  const clampedZoom = clampPreviewZoomPercent(nextZoomPercent)
  previewViewState = {
    ...previewViewState,
    zoomPercent: clampedZoom,
    panX: clampedZoom <= 100 ? 0 : previewViewState.panX,
    panY: clampedZoom <= 100 ? 0 : previewViewState.panY
  }
  syncPreviewViewport()
}

window.addEventListener("resize", () => {
  syncPreviewViewport()
})

const resetPreviewView = () => {
  previewViewState = {
    zoomPercent: 100,
    panX: 0,
    panY: 0
  }
  syncPreviewViewport()
}

const renderSvg = (renderMode: "artwork" | "export" = "artwork") => {
  if (!packModule) {
    throw new Error("Pillow Pack renderer not available.")
  }
  const svg = packModule.render(renderedSpec, { renderMode })
  applyBaseLayerCustomisation(svg, renderedSpec)
  svg.setAttribute("aria-label", `${technicalProject.displayName} technical cutter preview`)
  return svg
}

const stripTechnicalEditorUi = (svg: SVGSVGElement) => {
  svg.querySelectorAll(
    "#selection_overlay, #issue_flash_overlay, [data-role*='hit'], [data-role*='handle'], [data-role*='rotate'], [data-role*='move']"
  ).forEach(node => node.remove())
}

const getSelectedArtworkItem = () =>
  artworkCollection.items.find(item => item.id === artworkCollection.selectedId) ?? null

const getArtworkReferenceSvg = () => previewSvg

const getArtworkCutterBounds = () => {
  const svg = getArtworkReferenceSvg()
  return svg ? getCutterBounds(svg) : {
    x: 0,
    y: 0,
    width: currentProject.width,
    height: currentProject.height
  }
}

const getArtworkPlacementCenter = () => {
  const bounds = getArtworkCutterBounds()
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

const getArtworkDefaultScale = (item: ArtworkItem) => {
  const bounds = getArtworkCutterBounds()
  const intrinsicBounds = getArtworkBounds({ ...item, scale: 1 })
  return Math.min(
    1,
    bounds.width / Math.max(0.01, intrinsicBounds.width),
    bounds.height / Math.max(0.01, intrinsicBounds.height)
  )
}

const persistArtworkCollection = (next: ArtworkCollection) => {
  artworkCollection = selectArtworkItem(next, next.selectedId)
  saveArtworkCollection(currentProject, artworkCollection)
}

const updateArtworkCollection = (update: (collection: ArtworkCollection) => ArtworkCollection) => {
  persistArtworkCollection(update(artworkCollection))
}

const updateSelectedArtworkItem = (update: (item: ArtworkItem) => ArtworkItem) => {
  const selectedId = artworkCollection.selectedId
  if (!selectedId) {
    return
  }
  updateArtworkCollection(collection => updateArtworkItem(collection, selectedId, update))
  render()
}

const syncArtworkListSelectionState = () => {
  document.querySelectorAll<HTMLElement>("[data-artwork-item]").forEach(item => {
    item.classList.toggle(
      "is-selected",
      item.getAttribute("data-artwork-item") === artworkCollection.selectedId
    )
  })
}

const selectArtwork = (itemId: string) => {
  artworkEditModeId = itemId
  persistArtworkCollection(selectArtworkItem(artworkCollection, itemId))
  syncArtworkListSelectionState()
  syncArtworkPreviewLayer()
}

const removeArtwork = (itemId: string) => {
  if (artworkEditModeId === itemId) {
    artworkEditModeId = null
  }
  persistArtworkCollection(removeArtworkItem(artworkCollection, itemId))
  render()
}

const toggleArtworkVisibility = (itemId: string) => {
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, item => ({
      ...item,
      visible: !item.visible
    }))
  )
  const nextItem = artworkCollection.items.find(item => item.id === itemId)
  if (nextItem && !nextItem.visible && artworkEditModeId === itemId) {
    artworkEditModeId = null
  }
  render()
}

const toggleArtworkLock = (itemId: string) => {
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, item => ({
      ...item,
      locked: !item.locked
    }))
  )
  render()
}

const updateArtworkItemAndSelect = (
  itemId: string,
  update: (item: ArtworkItem) => ArtworkItem
) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  if (artworkEditModeId && artworkEditModeId !== itemId) {
    artworkEditModeId = null
  }
  artworkCollection = selectArtworkItem(artworkCollection, itemId)
  artworkCollection = updateArtworkItem(artworkCollection, itemId, update)
  saveArtworkCollection(currentProject, artworkCollection)
  render()
}

const setArtworkOrientation = (itemId: string, orientation: ArtworkOrientation) => {
  updateArtworkItemAndSelect(itemId, item => ({
    ...item,
    orientation,
    rotation: orientation === "portrait" ? 90 : 0
  }))
}

const toggleArtworkFlip = (itemId: string) => {
  updateArtworkItemAndSelect(itemId, item => ({
    ...item,
    flipped: !item.flipped,
    flipMode: !item.flipped ? item.flipMode ?? "horizontal" : item.flipMode
  }))
}

const setArtworkCategory = (itemId: string, category: ArtworkCategory) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked || item.uploadType !== "image") {
    return
  }
  const capabilityFlags = getArtworkCapabilityFlags(category, item.uploadType)
  updateArtworkItemAndSelect(itemId, current => ({
    ...current,
    category,
    canEnterSafeZone: capabilityFlags.canEnterSafeZone,
    canEnterSealZoneWhenFlood: capabilityFlags.canEnterSealZoneWhenFlood,
    canEnterEyemarkTrack: capabilityFlags.canEnterEyemarkTrack
  }))
}

const setArtworkScale = (itemId: string, scale: number) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, item => ({
      ...item,
      scale: Math.max(0.01, Math.min(20, scale))
    }))
  )
  render()
}

const setArtworkOpacity = (itemId: string, opacity: number) => {
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, item => ({
      ...item,
      opacity: Math.max(0, Math.min(1, opacity))
    }))
  )
  render()
}

const setArtworkPosition = (itemId: string, x: number, y: number) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, item => ({
      ...item,
      x,
      y
    }))
  )
  render()
}

const centerArtworkToCutter = (itemId: string) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  const bounds = getArtworkCutterBounds()
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, entry =>
      centerArtworkInBounds(entry, bounds, entry.scale)
    )
  )
  render()
}

const fitArtworkToCutterWidth = (itemId: string) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  const bounds = getArtworkCutterBounds()
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, entry => fitArtworkToWidth(entry, bounds))
  )
  render()
}

const fitArtworkToCutterHeight = (itemId: string) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  const bounds = getArtworkCutterBounds()
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, entry => fitArtworkToHeight(entry, bounds))
  )
  render()
}

const fitArtworkToBleedArea = (itemId: string) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  const svg = getArtworkReferenceSvg()
  const bounds = svg ? getBleedBounds(svg) ?? getArtworkCutterBounds() : getArtworkCutterBounds()
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, entry => fitArtworkToArea(entry, bounds))
  )
  render()
}

const resetArtwork = (itemId: string) => {
  const item = artworkCollection.items.find(entry => entry.id === itemId)
  if (!item || item.locked) {
    return
  }
  updateArtworkCollection(collection =>
    updateArtworkItem(collection, itemId, entry => resetArtworkPosition(entry))
  )
  render()
}

const openArtworkImportModal = () => {
  proofExportModalOpen = false
  artworkImportModalOpen = true
  pendingArtworkUploadType = null
  render()
}

const closeArtworkImportModal = () => {
  artworkImportModalOpen = false
  pendingArtworkUploadType = null
  render()
}

const queueArtworkFilePicker = (uploadType: ArtworkUploadType) => {
  pendingArtworkUploadType = uploadType
  artworkImportModalOpen = false
  render()
  window.requestAnimationFrame(() => {
    const fileInput = document.getElementById("artwork-file-input")
    if (fileInput instanceof HTMLInputElement) {
      fileInput.click()
    }
  })
}

const createArtworkItemFromFile = async (
  file: File,
  uploadType: ArtworkUploadType
) => {
  const imported = await readArtworkFile(file)
  const center = getArtworkPlacementCenter()
  const bounds = getArtworkCutterBounds()
  const category = getDefaultArtworkCategory(uploadType)
  const capabilityFlags = getArtworkCapabilityFlags(category, uploadType)
  const initialScale = Math.max(
    0.01,
    Math.min(
      20,
      Math.min(1, bounds.width / imported.baseWidthMm, bounds.height / imported.baseHeightMm)
    )
  )
  const baseItem: ArtworkItem = {
    id: crypto.randomUUID(),
    uploadType,
    filename: imported.filename,
    mimeType: imported.mimeType,
    sourceDataUrl: imported.sourceDataUrl,
    baseWidthMm: imported.baseWidthMm,
    baseHeightMm: imported.baseHeightMm,
    category,
    canEnterSafeZone: capabilityFlags.canEnterSafeZone,
    canEnterSealZoneWhenFlood: capabilityFlags.canEnterSealZoneWhenFlood,
    canEnterEyemarkTrack: capabilityFlags.canEnterEyemarkTrack,
    orientation: "landscape",
    rotation: 0,
    flipped: false,
    flipMode: null,
    x: center.x,
    y: center.y,
    scale: initialScale,
    opacity: 1,
    locked: false,
    visible: true,
    initialX: center.x,
    initialY: center.y,
    initialScale,
    createdAt: new Date().toISOString()
  }
  return baseItem
}

const logArtworkPreflightDebug = (
  report: ReturnType<typeof buildArtworkPreflightReport>
) => {
  if (!import.meta.env.DEV) {
    return
  }
  const selectedItem = getArtworkSelectedItem()
  const debugPayload = {
    sessionId:
      activeCutterState?.project.displayName ??
      `${currentProject.packType}-${currentProject.width}x${currentProject.height}`,
    geometryHash: `${Math.round(report.cutterBounds.width)}x${Math.round(report.cutterBounds.height)}:${JSON.stringify(renderedSpec.seals ?? renderedSpec.seal ?? null)}`,
    safeZonesEnabled: report.safeZoneChecksEnabled,
    fallbackRulesActive: !report.safeZoneChecksEnabled,
    sealZonesAvailable: report.sealZones.length > 0,
    artworkCount: artworkCollection.items.length,
    selectedArtworkId: artworkCollection.selectedId,
    selectedArtworkName: selectedItem
      ? buildArtworkLabel(selectedItem.uploadType, selectedItem.filename)
      : null,
    artworkBounds: artworkCollection.items.map(item => ({
      id: item.id,
      name: buildArtworkLabel(item.uploadType, item.filename),
      visible: item.visible,
      locked: item.locked,
      bounds: getArtworkBounds(item)
    })),
    activeWarningCount: report.warnings.filter(warning => !warning.ignored).length,
    warningIds: report.warnings
      .filter(warning => !warning.ignored)
      .map(warning => ({
        id: warning.id,
        title: warning.title
      }))
  }
  const nextSignature = JSON.stringify(debugPayload)
  if (nextSignature === lastPreflightDebugSignature) {
    return
  }
  lastPreflightDebugSignature = nextSignature
  console.log("[Artwork Studio][Preflight]", debugPayload)
}

const getArtworkPreflightReport = () => {
  const report = buildArtworkPreflightReport(
    artworkCollection,
    getArtworkReferenceSvg(),
    printRules,
    ignoredArtworkWarningIds
  )
  const activeWarningIds = new Set(report.warnings.map(warning => warning.id))
  ignoredArtworkWarningIds.forEach(warningId => {
    if (!activeWarningIds.has(warningId)) {
      ignoredArtworkWarningIds.delete(warningId)
    }
  })
  logArtworkPreflightDebug(report)
  return report
}

const highlightArtworkWarning = (warningId: string) => {
  const report = getArtworkPreflightReport()
  const warning = report.warnings.find(entry => entry.id === warningId)
  if (!warning?.itemId) {
    return
  }
  selectArtworkItemOnCanvas(warning.itemId)
  artworkEditModeId = warning.itemId
  render()
}

const ignoreArtworkWarning = (warningId: string) => {
  ignoredArtworkWarningIds.add(warningId)
  render()
}

type TdEyemarkWarningContext = {
  warningId: string
  affectedEyemarkId: string
  eyemarkIndex: number
  affectedSide: ArtworkTdEdgeSide
  leftDistance: number
  rightDistance: number
  currentTdClearanceMm: number
  requiredTdClearanceMm: number
  currentWidth: number
  currentHeight: number
  currentOffsetX: number
  currentOffsetY: number
  bounds: ArtworkBounds
  tdStartEdge: number
  tdEndEdge: number
}

type TdEyemarkWarningActionContext = {
  warningId: string
  isGrouped: boolean
  eyemarkCount: number
  recommendedWidthIncreaseMm: number
  affectedEyemarks: TdEyemarkWarningContext[]
}

const getTdEyemarkWarningEntries = (warning: ReturnType<typeof getArtworkPreflightReport>["warnings"][number]) => {
  if (warning.affectedEyemarks?.length) {
    return [...warning.affectedEyemarks].sort((left, right) => left.eyemarkIndex - right.eyemarkIndex)
  }
  if (
    warning.affectedEyemarkId &&
    warning.affectedEyemarkIndex != null &&
    warning.affectedSide &&
    warning.currentTdClearanceMm != null &&
    warning.requiredTdClearanceMm != null
  ) {
    const entry: ArtworkAffectedEyemark = {
      eyemarkId: warning.affectedEyemarkId,
      eyemarkIndex: warning.affectedEyemarkIndex,
      affectedSide: warning.affectedSide,
      currentTdClearanceMm: warning.currentTdClearanceMm,
      requiredTdClearanceMm: warning.requiredTdClearanceMm
    }
    return [entry]
  }
  return []
}

const getTdEyemarkWarningActionContext = (
  warningId: string,
  report = getArtworkPreflightReport()
): TdEyemarkWarningActionContext | null => {
  const warning = report.warnings.find(entry => entry.id === warningId)
  const currentSpec = activeCutterState?.spec ?? renderedSpec
  const eyeMarks = currentSpec.eyeMarks
  const affectedEyemarkEntries = warning ? getTdEyemarkWarningEntries(warning) : []
  if (!warning || !warning.bounds.length || !eyeMarks || !affectedEyemarkEntries.length) {
    return null
  }
  const portraitMapping =
    report.mdTdEdges.cutterOrientation === "portrait" ||
    report.mdTdEdges.printDirectionMode === "display-orientation"
  const tdStartEdge = portraitMapping
    ? report.mdTdEdges.tdEdges.left.y
    : report.mdTdEdges.tdEdges.left.x
  const tdEndEdge = portraitMapping
    ? report.mdTdEdges.tdEdges.right.y + report.mdTdEdges.tdEdges.right.height
    : report.mdTdEdges.tdEdges.right.x + report.mdTdEdges.tdEdges.right.width

  const affectedEyemarks = affectedEyemarkEntries.flatMap((entry, index) => {
    const bounds = warning.bounds[Math.min(index, warning.bounds.length - 1)]
    if (
      !bounds ||
      !Number.isFinite(entry.eyemarkIndex) ||
      entry.eyemarkIndex < 0 ||
      entry.eyemarkIndex >= Math.max(eyeMarks.count, 1)
    ) {
      return []
    }

    const eyemarkStart = portraitMapping ? bounds.y : bounds.x
    const eyemarkEnd = portraitMapping ? bounds.y + bounds.height : bounds.x + bounds.width
    const currentWidth = entry.eyemarkIndex === 1 ? eyeMarks.width2 ?? eyeMarks.width : eyeMarks.width
    const currentHeight = entry.eyemarkIndex === 1 ? eyeMarks.height2 ?? eyeMarks.height : eyeMarks.height
    const offsets = getEyeMarkOffsetsForIndex(eyeMarks, entry.eyemarkIndex)

    return [{
      warningId,
      affectedEyemarkId: entry.eyemarkId,
      eyemarkIndex: entry.eyemarkIndex,
      affectedSide: entry.affectedSide,
      leftDistance: eyemarkStart - tdStartEdge,
      rightDistance: tdEndEdge - eyemarkEnd,
      currentTdClearanceMm: entry.currentTdClearanceMm,
      requiredTdClearanceMm: entry.requiredTdClearanceMm,
      currentWidth,
      currentHeight,
      currentOffsetX: offsets.offsetX,
      currentOffsetY: offsets.offsetY,
      bounds,
      tdStartEdge,
      tdEndEdge
    }]
  })

  if (!affectedEyemarks.length) {
    return null
  }

  return {
    warningId,
    isGrouped: Boolean(warning.isGrouped),
    eyemarkCount: warning.eyemarkCount ?? eyeMarks.count,
    recommendedWidthIncreaseMm: warning.recommendedWidthIncreaseMm ?? 2,
    affectedEyemarks
  }
}

const logTdEyemarkAction = (
  action: "move" | "reduce" | "increase-width",
  beforeContext: TdEyemarkWarningContext,
  afterContext: TdEyemarkWarningContext | null
) => {
  if (!import.meta.env.DEV) {
    return
  }

  console.log("[Artwork Studio][TD Eyemark Action]", {
    action,
    warningId: beforeContext.warningId,
    affectedEyemarkId: beforeContext.affectedEyemarkId,
    affectedEyemarkIndex: beforeContext.eyemarkIndex,
    affectedSide: beforeContext.affectedSide,
    before: {
      bounds: beforeContext.bounds,
      tdStartEdge: beforeContext.tdStartEdge,
      tdEndEdge: beforeContext.tdEndEdge,
      currentTdClearanceMm: beforeContext.currentTdClearanceMm,
      requiredTdClearanceMm: beforeContext.requiredTdClearanceMm,
      width: beforeContext.currentWidth,
      height: beforeContext.currentHeight,
      offsetX: beforeContext.currentOffsetX,
      offsetY: beforeContext.currentOffsetY
    },
    after: afterContext
      ? {
          bounds: afterContext.bounds,
          tdStartEdge: afterContext.tdStartEdge,
          tdEndEdge: afterContext.tdEndEdge,
          currentTdClearanceMm: afterContext.currentTdClearanceMm,
          requiredTdClearanceMm: afterContext.requiredTdClearanceMm,
          width: afterContext.currentWidth,
          height: afterContext.currentHeight,
          offsetX: afterContext.currentOffsetX,
          offsetY: afterContext.currentOffsetY
        }
      : null,
    warningCleared: afterContext == null
  })
}

const logTdEyemarkActions = (
  action: "move" | "reduce" | "increase-width",
  beforeContexts: TdEyemarkWarningContext[],
  afterContexts: TdEyemarkWarningContext[]
) => {
  beforeContexts.forEach(beforeContext => {
    logTdEyemarkAction(
      action,
      beforeContext,
      afterContexts.find(afterContext => afterContext.eyemarkIndex === beforeContext.eyemarkIndex) ?? null
    )
  })
}

const reduceTdEyemarkSize = (warningId: string) => {
  const beforeContext = getTdEyemarkWarningActionContext(warningId)
  const currentSpec = activeCutterState?.spec ?? renderedSpec
  const eyeMarks = currentSpec.eyeMarks
  if (!beforeContext || !eyeMarks) {
    return
  }

  const bridgeResponse = runEngineRequest({
    requestId: `td-reduce-${warningId}`,
    engine: "cutter",
    action: "reduceTdEyemarkSize",
    payload: {
      eyeMarks,
      isGrouped: beforeContext.isGrouped,
      affectedEyemarks: beforeContext.affectedEyemarks.map(context => ({
        eyemarkIndex: context.eyemarkIndex,
        affectedSide: context.affectedSide,
        currentTdClearanceMm: context.currentTdClearanceMm,
        requiredTdClearanceMm: context.requiredTdClearanceMm
      }))
    },
    meta: {
      source: "artwork-ui-td-warning"
    }
  })

  if (!bridgeResponse.success || !bridgeResponse.updatedState?.eyeMarks) {
    window.alert(
      bridgeResponse.errors[0]?.message
        ?? "Eyemark size could not be reduced."
    )
    return
  }

  saveRenderedCutterSpec({
    ...currentSpec,
    eyeMarks: bridgeResponse.updatedState.eyeMarks
  })
  const afterContext = getTdEyemarkWarningActionContext(warningId, getArtworkPreflightReport())
  logTdEyemarkActions(
    "reduce",
    beforeContext.affectedEyemarks,
    afterContext?.affectedEyemarks ?? []
  )
  render()
}

const increaseTdEyemarkCutterWidth = (warningId: string) => {
  const beforeContext = getTdEyemarkWarningActionContext(warningId)
  const currentSpec = activeCutterState?.spec ?? renderedSpec
  const eyeMarks = currentSpec.eyeMarks
  if (!beforeContext || !eyeMarks) {
    return
  }

  const bridgeResponse = runEngineRequest({
    requestId: `td-increase-${warningId}`,
    engine: "cutter",
    action: "increaseTdEyemarkCutterWidth",
    payload: {
      eyeMarks,
      currentWidth: currentProject.width,
      isGrouped: beforeContext.isGrouped && beforeContext.affectedEyemarks.length > 1,
      recommendedWidthIncreaseMm: beforeContext.recommendedWidthIncreaseMm,
      affectedEyemarks: beforeContext.affectedEyemarks.map(context => ({
        eyemarkIndex: context.eyemarkIndex,
        affectedSide: context.affectedSide,
        currentTdClearanceMm: context.currentTdClearanceMm,
        requiredTdClearanceMm: context.requiredTdClearanceMm
      }))
    },
    meta: {
      source: "artwork-ui-td-warning"
    }
  })

  if (!bridgeResponse.success || !bridgeResponse.updatedState?.eyeMarks || !bridgeResponse.updatedState.width) {
    window.alert(
      bridgeResponse.errors[0]?.message
        ?? "Cutter/web width could not be increased."
    )
    return
  }

  const nextWidth = bridgeResponse.updatedState.width
  currentProject.width = nextWidth
  technicalProject.width = nextWidth
  backProject.width = nextWidth
  saveCurrentProject(currentProject)
  saveArtworkCollection(currentProject, artworkCollection)

  saveRenderedCutterSpec({
    ...currentSpec,
    width: nextWidth,
    eyeMarks: bridgeResponse.updatedState.eyeMarks
  })
  const afterContext = getTdEyemarkWarningActionContext(warningId, getArtworkPreflightReport())
  logTdEyemarkActions(
    "increase-width",
    beforeContext.affectedEyemarks,
    afterContext?.affectedEyemarks ?? []
  )
  render()
}

const saveRenderedCutterSpec = (nextSpec: FlowwrapSpec) => {
  activeCutterState = buildActiveCutterState({
    project: backProject,
    spec: nextSpec,
    selectedElementIds: activeCutterState?.activeElements.selectedElementIds ?? [],
    printRules
  })
  saveActiveCutterState(activeCutterState)
  refreshRenderedSpec()
}

function logArtworkDebugState(label: string, extras: Record<string, unknown> = {}) {
  if (!import.meta.env.DEV) {
    return
  }
  const spec = activeCutterState?.spec ?? renderedSpec
  console.log(`[Artwork Studio][${label}]`, {
    width: spec.width,
    height: spec.height,
    seals: spec.seals ?? null,
    eyeMarks: spec.eyeMarks
      ? {
          count: spec.eyeMarks.count,
          width: spec.eyeMarks.width,
          height: spec.eyeMarks.height,
          position: spec.eyeMarks.position
        }
      : null,
    attributeCount: spec.attributeBoxes?.length ?? 0,
    floodPrint: printRules.floodPrint,
    printInSeals: printRules.printInSeals,
    ...extras
  })
}

const moveTdEyemarkAwayFromEdge = (warningId: string) => {
  const report = getArtworkPreflightReport()
  const beforeContext = getTdEyemarkWarningActionContext(warningId, report)
  const currentSpec = activeCutterState?.spec ?? renderedSpec
  const eyeMarks = currentSpec.eyeMarks
  if (!beforeContext || !eyeMarks) {
    return
  }

  const portraitMapping =
    report.mdTdEdges.cutterOrientation === "portrait" ||
    report.mdTdEdges.printDirectionMode === "display-orientation"
  // Future AI-built screens should call the Engine API bridge with structured
  // cutter requests only. The bridge can route requests, but engines remain
  // the source of truth for geometry and validation.
  const bridgeResponse = runEngineRequest({
    requestId: `td-move-${warningId}`,
    engine: "cutter",
    action: "moveTdEyemarksInward",
    payload: {
      eyeMarks,
      portraitMapping,
      affectedEyemarks: beforeContext.affectedEyemarks.map(context => ({
        eyemarkIndex: context.eyemarkIndex,
        affectedSide: context.affectedSide,
        currentTdClearanceMm: context.currentTdClearanceMm,
        requiredTdClearanceMm: context.requiredTdClearanceMm
      }))
    },
    meta: {
      source: "artwork-ui-td-warning"
    }
  })

  let nextEyeMarks = bridgeResponse.success && bridgeResponse.updatedState?.eyeMarks
    ? bridgeResponse.updatedState.eyeMarks
    : eyeMarks

  if (!bridgeResponse.success) {
    beforeContext.affectedEyemarks.forEach(context => {
      const shiftAmount = context.requiredTdClearanceMm - context.currentTdClearanceMm
      if (!(shiftAmount > 0)) {
        return
      }

      const shiftDirection = context.affectedSide === "left" ? 1 : -1
      const currentOffsets = getEyeMarkOffsetsForIndex(nextEyeMarks, context.eyemarkIndex)
      const nextOffsetX = portraitMapping
        ? currentOffsets.offsetX
        : currentOffsets.offsetX + shiftDirection * shiftAmount
      const nextOffsetY = portraitMapping
        ? currentOffsets.offsetY + shiftDirection * shiftAmount
        : currentOffsets.offsetY

      nextEyeMarks = setEyeMarkOffsetsForIndex(
        nextEyeMarks,
        context.eyemarkIndex,
        nextOffsetX,
        nextOffsetY
      )
    })
  }

  saveRenderedCutterSpec({
    ...currentSpec,
    eyeMarks: nextEyeMarks
  })
  const afterContext = getTdEyemarkWarningActionContext(warningId, getArtworkPreflightReport())
  logTdEyemarkActions(
    "move",
    beforeContext.affectedEyemarks,
    afterContext?.affectedEyemarks ?? []
  )
  render()
}

const getTdEyemarkActionAvailability = (
  warningId: string,
  report = getArtworkPreflightReport()
) => {
  const context = getTdEyemarkWarningActionContext(warningId, report)
  if (!context) {
    return {
      reduce: { enabled: false, title: "Eyemark warning context is unavailable." },
      increase: { enabled: false, title: "Eyemark warning context is unavailable." },
      move: { enabled: false, title: "Eyemark warning context is unavailable." }
    }
  }

  const reductions = context.affectedEyemarks.map(target =>
    getTdEyemarkReduceAction({
      leftDistance: target.affectedSide === "left" ? target.currentTdClearanceMm : Number.POSITIVE_INFINITY,
      rightDistance: target.affectedSide === "right" ? target.currentTdClearanceMm : Number.POSITIVE_INFINITY,
      currentWidthMm: target.currentWidth,
      currentOffsetXMm: target.currentOffsetX,
      thresholdMm: target.requiredTdClearanceMm
    })
  )
  const blockedReduction = reductions.find(reduction => !reduction.enabled)
  const primaryTarget = context.affectedEyemarks[0]
  const increase = context.isGrouped
    ? {
        enabled: true,
        title: `Increase cutter/web width on the TD axis by minimum ${context.recommendedWidthIncreaseMm}mm.`
      }
    : getTdEyemarkWidthIncreaseAction({
        leftDistance: primaryTarget?.affectedSide === "left" ? primaryTarget.currentTdClearanceMm : Number.POSITIVE_INFINITY,
        rightDistance: primaryTarget?.affectedSide === "right" ? primaryTarget.currentTdClearanceMm : Number.POSITIVE_INFINITY,
        thresholdMm: primaryTarget?.requiredTdClearanceMm
      })

  return {
    reduce: {
      enabled: !blockedReduction,
      title: !blockedReduction
        ? "Reduce eyemark width on the TD axis only."
        : context.isGrouped
          ? "One or more eyemarks cannot be reduced further without going below minimum size."
          : blockedReduction.reason
    },
    increase: {
      enabled: increase.enabled,
      title: increase.enabled
        ? context.isGrouped
          ? `Increase cutter/web width on the TD axis by minimum ${context.recommendedWidthIncreaseMm}mm.`
          : `Increase cutter/web width on the TD axis by at least ${context.recommendedWidthIncreaseMm}mm.`
        : increase.reason
    },
    move: {
      enabled: true,
      title: context.isGrouped
        ? "Move both eyemarks inward to exactly 1.5mm TD clearance."
        : "Move the eyemark inward to exactly 1.5mm TD clearance."
    }
  }
}

const getTdEyemarkActionLabels = (warning: ReturnType<typeof getArtworkPreflightReport>["warnings"][number]) => ({
  increase: `Increase cutter/web width by minimum ${warning.recommendedWidthIncreaseMm ?? 2}mm`,
  move: warning.isGrouped ? "Move eyemarks 1.5mm inward" : "Move eyemark 1.5mm inward"
})

const createArtworkWarnings = () => {
  const report = getArtworkPreflightReport()
  const warnings = report.warnings.filter(warning => !warning.ignored)
  if (!artworkCollection.items.length) {
    return `<li class="artwork-warning-ok">No artwork imported.</li>`
  }
  if (!warnings.length) {
    return `<li class="artwork-warning-ok">No active preflight warnings.</li>`
  }

  return warnings
    .map(warning => {
      const severityClass =
        warning.severity === "critical"
          ? "critical"
          : warning.severity === "warning"
            ? "warning"
            : "info"
      const axisLabel = warning.axis ? `<span class="artwork-warning-badge">${warning.axis}</span>` : ""
      const tdActionState =
        warning.isPrompt && warning.id.startsWith("td-eyemark")
          ? getTdEyemarkActionAvailability(warning.id, report)
          : null
      const tdActionLabels = getTdEyemarkActionLabels(warning)
      const promptActions = warning.isPrompt && warning.id.startsWith("td-eyemark")
        ? `
          <button class="artwork-chip" type="button" data-warning-td-reduce="${warning.id}" ${tdActionState?.reduce.enabled ? "" : "disabled"} title="${tdActionState?.reduce.title ?? ""}">Reduce eyemark size</button>
          <button class="artwork-chip" type="button" data-warning-td-increase="${warning.id}" ${tdActionState?.increase.enabled ? "" : "disabled"} title="${tdActionState?.increase.title ?? ""}">${tdActionLabels.increase}</button>
          <button class="artwork-chip" type="button" data-warning-td-move="${warning.id}" ${tdActionState?.move.enabled ? "" : "disabled"} title="${tdActionState?.move.title ?? ""}">${tdActionLabels.move}</button>
          <button class="artwork-chip" type="button" data-warning-ignore="${warning.id}">Ignore and continue</button>
        `
        : `
          <button class="artwork-chip" type="button" data-warning-highlight="${warning.id}">Highlight</button>
          <button class="artwork-chip" type="button" data-warning-ignore="${warning.id}">Ignore</button>
          <button class="artwork-chip" type="button" data-warning-rectify="${warning.id}" disabled title="Placeholder only">Rectify</button>
        `
      return `
        <li class="artwork-warning-card ${severityClass}" data-warning-id="${warning.id}">
          <div class="artwork-warning-card-head">
            <div class="artwork-warning-card-title-wrap">
              <p class="artwork-warning-title">${warning.title}</p>
              <p class="artwork-warning-meta">${warning.itemLabel}</p>
            </div>
            <div class="artwork-warning-meta-row">
              <span class="artwork-warning-badge">${warning.severity}</span>
              ${axisLabel}
              <span class="artwork-warning-badge">${warning.zone}</span>
            </div>
          </div>
          <p class="artwork-warning-message">${warning.message}</p>
          <div class="artwork-warning-actions">
            ${promptActions}
          </div>
        </li>
      `
    })
    .join("")
}

const createArtworkRulesMarkup = () => {
  const report = getArtworkPreflightReport()
  const safeZoneState = report.safeZoneChecksEnabled ? "Using cutter safe zones" : "Fallback seal / fold rules"
  const eyemarkState = report.eyemarkTrack.length > 0 ? "Eyemark track detected" : "No eyemark track detected"
  const sealState = report.sealZones.length > 0 ? "Seal zones available" : "No seal zones detected"
  const mdEdgeSummary =
    report.mdTdEdges.cutterOrientation === "portrait"
      ? "MD edges: left / right"
      : "MD edges: top / bottom"
  const tdEdgeSummary =
    report.mdTdEdges.cutterOrientation === "portrait"
      ? "TD edges: top / bottom"
      : "TD edges: left / right"

  return `
    <section class="artwork-panel artwork-sidebar-section artwork-rules-section" id="artwork-rules-panel">
      <h2>Artwork Rules / Print Conditions</h2>
      <div class="artwork-rules-grid">
        <div class="artwork-rule-group">
          <span class="artwork-rule-label">Flood Print</span>
          <div class="artwork-rule-toggle-row">
            <button class="artwork-chip${printRules.floodPrint ? " is-active" : ""}" type="button" data-print-flood="true" aria-pressed="${printRules.floodPrint ? "true" : "false"}">Yes</button>
            <button class="artwork-chip${!printRules.floodPrint ? " is-active" : ""}" type="button" data-print-flood="false" aria-pressed="${!printRules.floodPrint ? "true" : "false"}">No</button>
          </div>
        </div>
        <div class="artwork-rule-group">
          <span class="artwork-rule-label">Rule Axis Mode</span>
          <div class="artwork-rule-toggle-row">
            <button class="artwork-chip${printRules.printDirectionMode === "maintain-md-td" ? " is-active" : ""}" type="button" data-print-direction-mode="maintain-md-td" aria-pressed="${printRules.printDirectionMode === "maintain-md-td" ? "true" : "false"}">Maintain MD/TD</button>
            <button class="artwork-chip" type="button" data-print-direction-mode="display-orientation" aria-pressed="false" disabled title="Placeholder for future orientation-aware print direction">Display orientation</button>
          </div>
        </div>
      </div>
      <div class="artwork-rule-notes">
        <p>${safeZoneState}</p>
        <p>${eyemarkState}</p>
        <p>${sealState}</p>
        <p>${mdEdgeSummary}</p>
        <p>${tdEdgeSummary}</p>
      </div>
    </section>
  `
}

const createArtworkListMarkup = () => {
  if (!artworkCollection.items.length) {
    return `<p class="artwork-empty-state"><strong>No artwork uploaded yet.</strong><br />${technicalProject.packLabel} project context loaded. Upload artwork to review bleed, safe zones, cutter alignment, barcode placement and print-readiness against this cutter.</p>`
  }

  return artworkCollection.items
    .map(item => {
      const isSelected = artworkCollection.selectedId === item.id
      const statusBits = [
        item.category,
        item.orientation === "portrait" ? "Portrait" : "Landscape",
        item.flipped ? "Flipped" : "",
        item.visible ? "" : "Hidden",
        item.locked ? "Locked" : ""
      ].filter(Boolean)
      return `
        <div class="artwork-list-item${isSelected ? " is-selected" : ""}" data-artwork-item="${item.id}">
          <button class="artwork-list-main" type="button" data-artwork-select="${item.id}">
            <img class="artwork-list-thumb" src="${item.sourceDataUrl}" alt="" />
            <span class="artwork-list-copy">
              <span class="artwork-list-title">${buildArtworkLabel(item.uploadType, item.filename)}</span>
              <span class="artwork-list-subtitle">${statusBits.join(" / ") || "Ready"}</span>
            </span>
          </button>
          <div class="artwork-list-actions">
            <button class="artwork-chip" type="button" data-artwork-visibility="${item.id}">
              ${item.visible ? "Hide" : "Show"}
            </button>
            <button class="artwork-chip" type="button" data-artwork-lock="${item.id}">
              ${item.locked ? "Unlock" : "Lock"}
            </button>
            <button class="artwork-chip danger" type="button" data-artwork-remove="${item.id}">
              Remove
            </button>
          </div>
          <div class="artwork-list-actions artwork-list-orientation-actions">
            <button
              class="artwork-chip artwork-orientation-chip${item.orientation === "landscape" ? " is-active" : ""}"
              type="button"
              data-artwork-orientation="${item.id}"
              data-artwork-orientation-value="landscape"
              aria-pressed="${item.orientation === "landscape" ? "true" : "false"}"
            >
              <span class="artwork-orientation-icon landscape" aria-hidden="true"></span>
              <span>Landscape</span>
            </button>
            <button
              class="artwork-chip artwork-orientation-chip${item.orientation === "portrait" ? " is-active" : ""}"
              type="button"
              data-artwork-orientation="${item.id}"
              data-artwork-orientation-value="portrait"
              aria-pressed="${item.orientation === "portrait" ? "true" : "false"}"
            >
              <span class="artwork-orientation-icon portrait" aria-hidden="true"></span>
              <span>Portrait</span>
            </button>
            <button
              class="artwork-chip artwork-flip-chip${item.flipped ? " is-active" : ""}"
              type="button"
              data-artwork-flip="${item.id}"
              aria-pressed="${item.flipped ? "true" : "false"}"
            >
              <span class="artwork-flip-icon" aria-hidden="true">⇆</span>
              <span>Flip</span>
            </button>
          </div>
          <div class="artwork-list-actions artwork-list-category-actions">
            <button
              class="artwork-chip artwork-category-chip${item.category === "Critical" ? " is-active" : ""}"
              type="button"
              data-artwork-category="${item.id}"
              data-artwork-category-value="Critical"
              aria-pressed="${item.category === "Critical" ? "true" : "false"}"
              ${item.uploadType !== "image" ? "disabled" : ""}
            >
              Critical
            </button>
            <button
              class="artwork-chip artwork-category-chip${item.category === "Background" ? " is-active" : ""}"
              type="button"
              data-artwork-category="${item.id}"
              data-artwork-category-value="Background"
              aria-pressed="${item.category === "Background" ? "true" : "false"}"
              ${item.uploadType !== "image" ? "disabled" : ""}
            >
              Background
            </button>
          </div>
          <label class="artwork-list-opacity">
            <span>Opacity</span>
            <input type="range" min="0" max="1" step="0.01" data-artwork-opacity="${item.id}" value="${item.opacity.toFixed(2)}" />
          </label>
        </div>
      `
    })
    .join("")
}

const createTechnicalValidationProject = () => {
  const draft = technicalProject.projectDraft
  return projectFromLegacySpec(
    technicalProject.packType,
    technicalProject.displayName,
    renderedSpec,
    {
      ...(technicalProject.projectId ? { id: technicalProject.projectId } : {}),
      ...(draft
        ? {
            projectDraft: draft,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt
          }
        : {})
    }
  )
}

type ArtworkWorkflowValidationState = ProjectValidationWorkflowState & {
  artworkCriticalIssues: ReturnType<typeof getArtworkPreflightReport>["warnings"]
  exportBlocked: boolean
}

const getArtworkWorkflowValidationState = (): ArtworkWorkflowValidationState => {
  const projectState = buildProjectValidationWorkflowState(
    createTechnicalValidationProject(),
    artworkCollection.items.length > 0
  )
  const artworkCriticalIssues = artworkCollection.items.length > 0
    ? getArtworkPreflightReport().warnings.filter(
        warning => warning.severity === "critical" && !warning.ignored
      )
    : []
  return {
    ...projectState,
    artworkCriticalIssues,
    exportBlocked:
      projectState.exportReadiness.state === "blocked" || artworkCriticalIssues.length > 0
  }
}

const createValidationCentreMarkup = (
  validationState = getArtworkWorkflowValidationState()
) => {
  const { summary, exportReadiness, cutterCriticalIssues, artworkCriticalIssues } = validationState
  const primaryCutterAffectedElement =
    cutterCriticalIssues[0]?.message.match(/Eyemark\s+\d+/i)?.[0]
  const messages = summary.messages
    .map(item => {
      const label = item.severity === "critical"
        ? item.id.includes("EYEMARK")
          ? "Critical cutter issue"
          : "Critical cutter / pack issue"
        : `${item.severity[0].toUpperCase()}${item.severity.slice(1)}`
      return `<li><strong>${label}:</strong> ${item.message}</li>`
    })
    .join("")
  const artworkMessages = artworkCriticalIssues
    .map(item => `<li><strong>Critical artwork issue:</strong> ${item.message}</li>`)
    .join("")
  const readinessMessage = cutterCriticalIssues.length > 0
    ? "Critical cutter validation issue remains. Export blocked until critical validation issues are fixed."
    : artworkCriticalIssues.length > 0
      ? "Critical artwork validation issue remains. Export blocked until critical validation issues are fixed."
      : exportReadiness.message
  return `
    <section class="artwork-panel artwork-sidebar-section" id="artwork-validation-centre">
      <h2>Validation Centre</h2>
      <p class="artwork-sidebar-note">
        ${summary.displayPackType} · ${summary.enginePackTypeId} · Project context loaded
      </p>
      <p class="artwork-sidebar-note">
        Cutter / pack validation: ${summary.counts.critical} critical · ${summary.counts.warning} warning · ${summary.counts.advisory} advisory · ${summary.counts.pass} pass
      </p>
      <p class="artwork-sidebar-note">
        Artwork validation: ${artworkCollection.items.length > 0 ? `${artworkCriticalIssues.length} critical` : "not run - advisory only"}
      </p>
      <div class="artwork-export-readiness ${validationState.exportBlocked ? "is-blocked" : "is-ready"}" data-export-readiness="${validationState.exportBlocked ? "blocked" : exportReadiness.state}">
        <strong>Export readiness: ${validationState.exportBlocked ? "Blocked" : exportReadiness.state === "ready" ? "Ready" : "Ready with advisories"}</strong>
        <span>${readinessMessage}</span>
        ${cutterCriticalIssues.length > 0 ? `<span>Return to Cutter Studio to fix ${primaryCutterAffectedElement ?? "cutter issues"}.</span><button class="artwork-chip" type="button" data-return-to-cutter-validation>Return to Cutter Studio</button>` : ""}
      </div>
      <ul class="artwork-list">${messages}${artworkMessages}</ul>
    </section>
  `
}

const createArtworkImportModalMarkup = () => {
  if (!artworkImportModalOpen) {
    return ""
  }

  return `
    <div class="artwork-modal-backdrop" id="artwork-import-modal" role="presentation">
      <div class="artwork-modal" role="dialog" aria-modal="true" aria-labelledby="artwork-import-title">
        <div class="artwork-modal-header">
          <h3 id="artwork-import-title">What are you uploading?</h3>
          <button class="artwork-chip" type="button" data-artwork-import-close>Close</button>
        </div>
        <div class="artwork-modal-options">
          ${ARTWORK_UPLOAD_TYPES.map(type => `
            <button class="artwork-modal-option" type="button" data-artwork-import-type="${type}">
              ${ARTWORK_UPLOAD_TYPE_LABELS[type]}
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `
}

const createProofExportModalMarkup = () => {
  if (!proofExportModalOpen) {
    return ""
  }

  const floodPreviewEnabled = Boolean(printRules.floodPrint || printRules.printInSeals)

  return `
    <div class="artwork-modal-backdrop" id="artwork-proof-export-modal" role="presentation">
      <div class="artwork-modal artwork-proof-modal" role="dialog" aria-modal="true" aria-labelledby="artwork-proof-export-title">
        <div class="artwork-modal-header">
          <h3 id="artwork-proof-export-title">Export Proof PDF (Raster)</h3>
          <button class="artwork-chip" type="button" data-artwork-proof-close>Close</button>
        </div>
        <p class="artwork-modal-note">
          Choose which proof layers to include. The PDF uses the shared cutter render and hides editor controls.
        </p>
        <div class="artwork-proof-grid">
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeCutterGuide" ${proofExportOptions.includeCutterGuide ? "checked" : ""} />
            <span>Cutter guide</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeDimensions" ${proofExportOptions.includeDimensions ? "checked" : ""} />
            <span>Dimensions</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeSafeZones" ${proofExportOptions.includeSafeZones ? "checked" : ""} />
            <span>Safe zones</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeSealZones" ${proofExportOptions.includeSealZones ? "checked" : ""} />
            <span>Seal zones</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeEyemarkTrack" ${proofExportOptions.includeEyemarkTrack ? "checked" : ""} />
            <span>Eyemark / track</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeFloodPreview" ${proofExportOptions.includeFloodPreview && floodPreviewEnabled ? "checked" : ""} ${floodPreviewEnabled ? "" : "disabled"} />
            <span>Flood preview${floodPreviewEnabled ? "" : " (requires Flood Print = Yes)"}</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includePreflightSummary" ${proofExportOptions.includePreflightSummary ? "checked" : ""} />
            <span>Preflight summary</span>
          </label>
          <label class="artwork-proof-option">
            <input type="checkbox" data-proof-option="includeWarnings" ${proofExportOptions.includeWarnings ? "checked" : ""} />
            <span>Warnings on proof</span>
          </label>
        </div>
        <div class="artwork-modal-actions">
          <button class="artwork-button secondary" type="button" data-artwork-proof-close>Cancel</button>
          <button class="artwork-button primary" type="button" data-artwork-proof-export>Export Proof PDF (Raster)</button>
        </div>
      </div>
    </div>
  `
}

const openProofExportModal = () => {
  artworkImportModalOpen = false
  proofExportOptions = {
    ...DEFAULT_ARTWORK_PROOF_EXPORT_OPTIONS,
    includeFloodPreview: Boolean(printRules.floodPrint || printRules.printInSeals)
  }
  proofExportModalOpen = true
  render()
}

const closeProofExportModal = () => {
  if (!proofExportModalOpen) {
    return
  }
  proofExportModalOpen = false
  render()
}

const guardArtworkExport = () => {
  const validationState = getArtworkWorkflowValidationState()
  if (!validationState.exportBlocked) {
    return true
  }
  const cutterIssue = validationState.cutterCriticalIssues[0]
  const artworkIssue = validationState.artworkCriticalIssues[0]
  const guidance = cutterIssue
    ? `Critical cutter issue: ${cutterIssue.message}\nReturn to Cutter Studio to fix cutter issues.`
    : artworkIssue
      ? `Critical artwork issue: ${artworkIssue.message}`
      : "Fix critical validation issues before export."
  window.alert(`Export blocked: critical validation issues remain.\n${guidance}`)
  document.getElementById("artwork-validation-centre")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  })
  return false
}

const buildProofSummary = (svg: SVGSVGElement | null = getArtworkReferenceSvg()) => {
  const report = buildArtworkPreflightReport(
    artworkCollection,
    svg,
    printRules,
    ignoredArtworkWarningIds
  )
  const activeWarnings = report.warnings.filter(warning => !warning.ignored)
  const summaryLines = [
    `Flood Print: ${printRules.floodPrint ? "Yes" : "No"}`,
    `Rule Axis Mode: ${printRules.printDirectionMode === "maintain-md-td" ? "Maintain MD/TD" : "Display orientation"}`,
    `Safe zone status: ${report.safeZoneChecksEnabled ? "Using cutter safe zones" : "Fallback seal / fold rules"}`,
    `Seal zone status: ${report.sealZones.length > 0 ? "Seal zones available" : "No seal zones detected"}`,
    `Eyemark track status: ${report.eyemarkTrack.length > 0 ? "Eyemark track detected" : "No eyemark track detected"}`,
    `Warning count: ${activeWarnings.length}`
  ]
  const warningLines = activeWarnings.length
    ? activeWarnings.map(warning =>
        `${warning.severity.toUpperCase()} | ${warning.title} | ${warning.itemLabel} | ${warning.zone}`
      )
    : []
  return {
    report,
    summaryLines,
    warningLines
  }
}

const downloadProofFallback = (blob: Blob, filename: string) => {
  downloadProofBlob(blob, filename)
}

const exportProofPdf = async () => {
  if (!guardArtworkExport()) {
    return
  }
  if (!previewSvg) {
    return
  }
  const hasCutterGeometry =
    Number.isFinite(renderedSpec.width) &&
    Number.isFinite(renderedSpec.height) &&
    renderedSpec.width > 0 &&
    renderedSpec.height > 0
  if (!hasCutterGeometry) {
    return
  }

  const proofSvg = renderSvg("export")
  const { report, summaryLines, warningLines } = buildProofSummary(proofSvg)
  const effectiveFloodPreview = Boolean(
    proofExportOptions.includeFloodPreview &&
      (printRules.floodPrint || printRules.printInSeals)
  )

  if (effectiveFloodPreview) {
    syncFloodPreviewLayer(proofSvg, true)
  }
  syncArtworkLayer(proofSvg, artworkCollection, null)
  if (proofExportOptions.includeWarnings) {
    renderArtworkPreflightOverlay(proofSvg, report)
  }
  applyArtworkProofLayerVisibility(proofSvg, proofExportOptions, effectiveFloodPreview)

  const proofPage = buildArtworkProofPageSvg({
    proofSvg,
    metadata: {
      jobName: technicalProject.displayName,
      packLabel: technicalProject.packLabel,
      packType: technicalProject.packType,
      widthMm: renderedSpec.width,
      heightMm: renderedSpec.height,
      exportedAt: new Date()
    },
    summary: {
      summaryLines: proofExportOptions.includePreflightSummary ? summaryLines : [],
      warningLines: proofExportOptions.includeWarnings ? warningLines : []
    },
    options: proofExportOptions
  })

  const pdfBlob = await createRasterProofPdfBlobFromSvg(
    new XMLSerializer().serializeToString(proofPage),
    297,
    210
  )
  const filename = createArtworkProofFilename(
    technicalProject.displayName,
    renderedSpec.width,
    renderedSpec.height
  )
  if ("showSaveFilePicker" in window) {
    try {
      await openProofSavePicker(filename, pdfBlob)
      proofExportModalOpen = false
      render()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      console.error("[Artwork Studio] Proof PDF export failed.", error)
      return
    }
  }
  downloadProofFallback(pdfBlob, filename)
  proofExportModalOpen = false
  render()
}

const syncArtworkPreviewLayer = () => {
  if (!previewSvg) {
    return
  }
  syncArtworkLayer(previewSvg, artworkCollection, artworkEditModeId)
  renderArtworkPreflightOverlay(previewSvg)
  const warningList = document.getElementById("artwork-warning-list")
  if (warningList instanceof HTMLElement) {
    warningList.innerHTML = createArtworkWarnings()
  }
  const rulesPanel = document.getElementById("artwork-rules-panel")
  if (rulesPanel instanceof HTMLElement) {
    rulesPanel.outerHTML = createArtworkRulesMarkup()
  }
  syncPreviewViewport()
}

type ArtworkPointerPoint = {
  x: number
  y: number
}

type ArtworkMoveInteraction = {
  kind: "move"
  pointerId: number
  itemId: string
  startPoint: ArtworkPointerPoint
  originX: number
  originY: number
}

type ArtworkResizeInteraction = {
  kind: "resize"
  pointerId: number
  itemId: string
  handle: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  startPoint: ArtworkPointerPoint
  originBounds: ReturnType<typeof getArtworkBounds>
  originScale: number
}

type ArtworkInteractionState = ArtworkMoveInteraction | ArtworkResizeInteraction | null

let artworkInteractionState: ArtworkInteractionState = null

const clientPointToSvgPoint = (clientX: number, clientY: number, viewport: HTMLElement) => {
  const svg = previewSvg
  if (!svg) {
    return { x: 0, y: 0 }
  }
  const currentView = svg.viewBox.baseVal
  const rect = viewport.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0 || currentView.width <= 0 || currentView.height <= 0) {
    return { x: currentView.x, y: currentView.y }
  }
  return {
    x: currentView.x + ((clientX - rect.left) / rect.width) * currentView.width,
    y: currentView.y + ((clientY - rect.top) / rect.height) * currentView.height
  }
}

const getArtworkSelectedItem = () =>
  artworkCollection.items.find(item => item.id === artworkCollection.selectedId) ?? null

const getArtworkEditingItem = () =>
  artworkCollection.items.find(item => item.id === artworkEditModeId) ?? null

const exitArtworkEditMode = (keepSelection = true) => {
  artworkEditModeId = null
  artworkInteractionState = null
  if (!keepSelection) {
    artworkCollection = selectArtworkItem(artworkCollection, null)
  }
  saveArtworkCollection(currentProject, artworkCollection)
  syncArtworkListSelectionState()
  syncArtworkPreviewLayer()
}

const selectArtworkItemOnCanvas = (itemId: string) => {
  artworkCollection = selectArtworkItem(artworkCollection, itemId)
  artworkEditModeId = itemId
  saveArtworkCollection(currentProject, artworkCollection)
  syncArtworkListSelectionState()
  syncArtworkPreviewLayer()
}

const toggleArtworkEditMode = (itemId: string) => {
  artworkCollection = selectArtworkItem(artworkCollection, itemId)
  artworkEditModeId = artworkEditModeId === itemId ? null : itemId
  saveArtworkCollection(currentProject, artworkCollection)
  syncArtworkListSelectionState()
  syncArtworkPreviewLayer()
}

const clearArtworkEditMode = () => {
  if (!artworkEditModeId) {
    return
  }
  artworkEditModeId = null
  artworkInteractionState = null
  saveArtworkCollection(currentProject, artworkCollection)
  syncArtworkListSelectionState()
  syncArtworkPreviewLayer()
}

const deselectArtworkItem = () => {
  artworkCollection = selectArtworkItem(artworkCollection, null)
  artworkEditModeId = null
  artworkInteractionState = null
  saveArtworkCollection(currentProject, artworkCollection)
  syncArtworkListSelectionState()
  syncArtworkPreviewLayer()
}

document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || (!artworkEditModeId && !artworkCollection.selectedId)) {
    return
  }
  deselectArtworkItem()
})

const updateArtworkPositionAndScale = (itemId: string, nextX: number, nextY: number, nextScale: number) => {
  artworkCollection = updateArtworkItem(artworkCollection, itemId, item => ({
    ...item,
    x: nextX,
    y: nextY,
    scale: Math.max(0.01, Math.min(20, nextScale))
  }))
  saveArtworkCollection(currentProject, artworkCollection)
  syncArtworkPreviewLayer()
}

const resizeArtworkFromHandle = (
  interaction: ArtworkResizeInteraction,
  clientX: number,
  clientY: number,
  viewport: HTMLElement
) => {
  const currentPoint = clientPointToSvgPoint(clientX, clientY, viewport)
  const startBounds = interaction.originBounds
  const originScale = Math.max(0.01, interaction.originScale)
  const baseWidth = Math.max(0.01, startBounds.width / originScale)
  const baseHeight = Math.max(0.01, startBounds.height / originScale)

  const handleDirections: Record<ArtworkCornerHandle, { x: 1 | -1; y: 1 | -1 }> = {
    "top-left": { x: -1, y: -1 },
    "top-right": { x: 1, y: -1 },
    "bottom-left": { x: -1, y: 1 },
    "bottom-right": { x: 1, y: 1 }
  }
  const direction = handleDirections[interaction.handle]
  const anchorX = direction.x === 1 ? startBounds.x : startBounds.x + startBounds.width
  const anchorY = direction.y === 1 ? startBounds.y : startBounds.y + startBounds.height
  const dx = (currentPoint.x - anchorX) * direction.x
  const dy = (currentPoint.y - anchorY) * direction.y
  const scale = Math.max(0.05, Math.max(dx / Math.max(0.01, baseWidth), dy / Math.max(0.01, baseHeight)))
  const nextWidth = baseWidth * scale
  const nextHeight = baseHeight * scale
  const nextX = anchorX + direction.x * (nextWidth / 2)
  const nextY = anchorY + direction.y * (nextHeight / 2)
  updateArtworkPositionAndScale(interaction.itemId, nextX, nextY, scale)
}

const injectStyles = () => {
  const style = document.createElement("style")
  style.textContent = `
    .artwork-shell {
      min-height: 100vh;
      padding: 24px;
      display: grid;
      gap: 20px;
      grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
    }

    .artwork-panel {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(24, 24, 24, 0.08);
      border-radius: 22px;
      box-shadow: 0 18px 50px rgba(38, 31, 16, 0.08);
      overflow: hidden;
    }

    .artwork-main {
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .artwork-header {
      padding: 22px 24px 18px;
      border-bottom: 1px solid rgba(24, 24, 24, 0.08);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
    }

    .artwork-kicker {
      margin: 0 0 8px;
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #7a6653;
    }

    .artwork-title {
      margin: 0;
      font-size: clamp(1.5rem, 2.2vw, 2.35rem);
      line-height: 1.08;
    }

    .artwork-subtitle {
      margin: 10px 0 0;
      max-width: 52ch;
      color: #62584d;
      line-height: 1.5;
    }

    .artwork-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    .artwork-button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font: inherit;
      cursor: pointer;
      transition: transform 140ms ease, box-shadow 140ms ease;
    }

    .artwork-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(34, 34, 34, 0.12);
    }

    .artwork-button.primary {
      background: #1f4d42;
      color: #f7f6f0;
    }

    .artwork-button.secondary {
      background: #ece3d2;
      color: #3e3121;
    }

    .artwork-button[data-export-readiness="blocked"] {
      box-shadow: 0 0 0 2px rgba(158, 19, 22, 0.3);
    }

    .artwork-canvas-panel {
      padding: 24px;
      display: grid;
      gap: 16px;
      align-content: start;
    }

    .artwork-preview-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .artwork-preview-slider-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1 1 360px;
      min-width: 0;
    }

    .artwork-preview-slider-label {
      font-size: 0.88rem;
      font-weight: 700;
      color: #1f1b17;
      white-space: nowrap;
    }

    .artwork-preview-slider {
      flex: 1 1 auto;
      min-width: 180px;
      accent-color: #1f4d42;
    }

    .artwork-preview-reset {
      border: 1px solid rgba(24, 24, 24, 0.1);
      border-radius: 999px;
      background: #f4efe5;
      color: #3e3121;
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
      transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }

    .artwork-preview-reset:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(34, 34, 34, 0.12);
      background: #efe7d9;
    }

    .artwork-preview-viewport {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 244, 235, 0.96)),
        linear-gradient(90deg, rgba(52, 103, 78, 0.05), rgba(21, 84, 90, 0.03));
      border: 1px solid rgba(24, 24, 24, 0.1);
      border-radius: 20px;
      padding: 18px;
      overflow: hidden;
      height: clamp(520px, 64vh, 650px);
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
      cursor: grab;
      user-select: none;
    }

    .artwork-preview-viewport.is-dragging {
      cursor: grabbing;
    }

    .artwork-preview-stage {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      flex: 0 0 auto;
      will-change: transform;
    }

    .artwork-status {
      margin: 0;
      color: #234a63;
      font-weight: 600;
    }

    .artwork-canvas {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .artwork-canvas svg {
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
    }

    .artwork-preview-stage svg,
    .artwork-preview-stage svg * {
      shape-rendering: geometricPrecision;
      text-rendering: geometricPrecision;
    }

    .artwork-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .artwork-meta-card {
      padding: 14px 16px;
      border-radius: 16px;
      background: #f6f2e8;
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .artwork-meta-label {
      margin: 0 0 6px;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7b6b58;
    }

    .artwork-meta-value {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #1c1a17;
    }

    .artwork-sidebar {
      display: grid;
      gap: 20px;
      align-content: start;
    }

    .artwork-sidebar-section {
      padding: 22px 22px 20px;
    }

    .artwork-sidebar h2 {
      margin: 0 0 12px;
      font-size: 1.05rem;
    }

    .artwork-sidebar p,
    .artwork-sidebar li {
      color: #4e473f;
      line-height: 1.55;
    }

    .artwork-accordion {
      display: grid;
      gap: 14px;
    }

    .artwork-accordion > summary {
      list-style: none;
      cursor: pointer;
    }

    .artwork-accordion > summary::-webkit-details-marker {
      display: none;
    }

    .artwork-accordion-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .artwork-accordion-summary-main {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .artwork-accordion-title {
      margin: 0;
      font-size: 1.05rem;
      color: #1d1b18;
      font-weight: 700;
    }

    .artwork-accordion-summary-note {
      margin: 0;
      font-size: 0.85rem;
      color: #6b6258;
    }

    .artwork-accordion-chevron {
      flex: 0 0 auto;
      width: 9px;
      height: 9px;
      border-right: 2px solid #7b6b58;
      border-bottom: 2px solid #7b6b58;
      transform: rotate(45deg);
      transition: transform 160ms ease;
      margin-left: 6px;
    }

    .artwork-accordion[open] .artwork-accordion-chevron {
      transform: rotate(225deg);
    }

    .artwork-accordion-body {
      display: grid;
      gap: 14px;
    }

    .print-rules-card {
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid rgba(24, 24, 24, 0.1);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.93), rgba(245, 244, 240, 0.98));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .print-rules-summary {
      margin: 0;
      font-size: 0.88rem;
      color: #64594d;
      line-height: 1.45;
    }

    .print-rule-controls {
      display: grid;
      gap: 10px;
    }

    .print-rule-toggle {
      display: grid;
      gap: 4px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .print-rule-toggle-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      color: #1f1b17;
    }

    .print-rule-toggle input {
      width: 16px;
      height: 16px;
      accent-color: #1f4d42;
      margin: 0;
      flex: 0 0 auto;
    }

    .print-rule-toggle-note {
      margin: 0;
      font-size: 0.8rem;
      color: #665c52;
      line-height: 1.35;
    }

    .print-rules-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .print-rule-item {
      display: grid;
      gap: 8px;
      min-height: 106px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.76);
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .print-rule-sample {
      position: relative;
      display: grid;
      place-items: center;
      min-height: 40px;
      border-radius: 11px;
      overflow: hidden;
    }

    .print-rule-sample::before,
    .print-rule-sample::after {
      content: "";
      position: absolute;
    }

    .print-rule-sample.seal-allowed {
      background: rgba(58, 159, 105, 0.12);
      border: 1px solid rgba(58, 159, 105, 0.22);
    }

    .print-rule-sample.seal-allowed::before,
    .print-rule-sample.seal-restricted::before,
    .print-rule-sample.safe-guidance::before {
      inset: 8px;
      border-radius: 8px;
    }

    .print-rule-sample.seal-allowed::before {
      background: rgba(58, 159, 105, 0.18);
      border: 1px solid rgba(58, 159, 105, 0.5);
    }

    .print-rule-sample.seal-restricted {
      background: rgba(252, 161, 244, 0.1);
      border: 1px solid rgba(252, 161, 244, 0.25);
    }

    .print-rule-sample.seal-restricted::before {
      background: rgba(252, 161, 244, 0.18);
      border: 1px dashed rgba(210, 52, 41, 0.55);
    }

    .print-rule-sample.track-clear {
      background: rgba(252, 161, 244, 0.12);
      border: 1px solid rgba(252, 161, 244, 0.28);
      min-height: 84px;
    }

    .print-rule-sample.track-clear::before {
      inset: 8px 14px;
      border-radius: 9px;
      background: rgba(252, 161, 244, 0.18);
      border: 1px dashed rgba(210, 52, 41, 0.55);
    }

    .print-rule-sample.track-clear::after {
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) rotate(-90deg);
      content: attr(data-label);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      white-space: nowrap;
      color: #7c2f54;
    }

    .print-rule-sample.eyemark-protected {
      background: rgba(252, 161, 244, 0.14);
      border: 1px solid rgba(252, 161, 244, 0.32);
    }

    .print-rule-sample.eyemark-protected::before {
      inset: 10px 18px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.35);
      border: 1px solid rgba(210, 52, 41, 0.5);
    }

    .print-rule-sample.eyemark-protected::after {
      content: attr(data-label);
      left: 10px;
      bottom: 6px;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #7c2f54;
    }

    .print-rule-sample.safe-guidance {
      background: rgba(46, 183, 116, 0.08);
      border: 1px solid rgba(46, 183, 116, 0.22);
    }

    .print-rule-sample.safe-guidance::before {
      background: rgba(46, 183, 116, 0.16);
      border: 1px dashed rgba(31, 77, 66, 0.45);
    }

    .print-rule-sample.safe-guidance::after {
      content: attr(data-label);
      left: 10px;
      top: 6px;
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #1f4d42;
    }

    .print-rule-label {
      margin: 0;
      font-weight: 700;
      color: #1f1b17;
      font-size: 0.92rem;
    }

    .print-rule-note {
      margin: 0;
      color: #6b6258;
      font-size: 0.8rem;
      line-height: 1.35;
    }

    .artwork-legend-card {
      display: grid;
      gap: 14px;
      padding: 18px;
      border: 1px solid rgba(24, 24, 24, 0.1);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 242, 233, 0.96));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .artwork-legend-header {
      display: grid;
      gap: 4px;
    }

    .artwork-legend-title {
      margin: 0;
      font-size: 1.05rem;
      color: #1d1b18;
    }

    .artwork-legend-subtitle {
      margin: 0;
      font-size: 0.88rem;
      color: #6b6258;
    }

    .legend-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .legend-item {
      display: grid;
      gap: 8px;
      min-height: 118px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .legend-sample {
      position: relative;
      display: grid;
      place-items: center;
      height: 42px;
      border-radius: 11px;
      overflow: hidden;
      --legend-stroke: #2eb774;
      --legend-fill: transparent;
      --legend-opacity: 1;
      --legend-dash: none;
    }

    .legend-sample::before,
    .legend-sample::after {
      content: "";
      position: absolute;
    }

    .legend-sample.cutter {
      background: rgba(46, 183, 116, 0.08);
    }

    .legend-sample.cutter::before {
      width: 100%;
      height: 3px;
      border-radius: 999px;
      background: var(--legend-stroke);
    }

    .legend-sample.substrate {
      background: var(--legend-fill);
      opacity: var(--legend-opacity);
      border: 1px solid rgba(27, 87, 104, 0.16);
    }

    .legend-sample.flood-preview {
      background: rgba(74, 163, 255, 0.12);
      border: 1px solid rgba(74, 163, 255, 0.28);
    }

    .legend-sample.flood-preview::before {
      inset: 7px;
      border-radius: 8px;
      background: rgba(74, 163, 255, 0.22);
      border: 1px solid rgba(74, 163, 255, 0.45);
    }

    .legend-sample.seal {
      background: rgba(46, 183, 116, 0.08);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 35%, transparent);
    }

    .legend-sample.seal::before {
      inset: 10px 8px;
      border-radius: 8px;
      background: var(--legend-stroke);
      opacity: 0.12;
    }

    .legend-sample.safe {
      background: transparent;
      border: 2px dashed var(--legend-stroke);
    }

    .legend-sample.eyemark {
      background: transparent;
    }

    .legend-sample.eyemark::before {
      width: 22px;
      height: 12px;
      border-radius: 2px;
      background: var(--legend-fill);
      border: 1px solid var(--legend-stroke);
    }

    .legend-sample.attribute {
      background: var(--legend-fill);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 32%, transparent);
      color: var(--legend-stroke);
    }

    .legend-sample.attribute::before {
      inset: 9px 10px;
      border-radius: 8px;
      border: 1px solid var(--legend-stroke);
      background: rgba(255, 255, 255, 0.42);
    }

    .legend-sample.attribute::after {
      content: attr(data-label);
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      position: relative;
      z-index: 1;
    }

    .legend-sample.dimensions {
      background: rgba(255, 255, 255, 0.48);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 18%, transparent);
    }

    .legend-sample.dimensions::before {
      left: 10px;
      right: 10px;
      top: 50%;
      height: 2px;
      transform: translateY(-50%);
      background: var(--legend-stroke);
      border-radius: 999px;
    }

    .legend-sample.dimensions::after {
      left: 50%;
      top: 6px;
      bottom: 6px;
      width: 1px;
      transform: translateX(-50%);
      background:
        linear-gradient(180deg, transparent 0 10px, var(--legend-stroke) 10px 12px, transparent 12px calc(100% - 12px), var(--legend-stroke) calc(100% - 12px) calc(100% - 10px), transparent calc(100% - 10px) 100%);
      opacity: 0.9;
    }

    .legend-sample.fold {
      background: rgba(46, 183, 116, 0.06);
      border: 1px dashed color-mix(in srgb, var(--legend-stroke) 24%, transparent);
    }

    .legend-sample.fold::before {
      width: calc(100% - 16px);
      height: 0;
      border-top: 3px dashed var(--legend-stroke);
    }

    .legend-sample.problem {
      background: rgba(214, 79, 61, 0.08);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 24%, transparent);
    }

    .legend-sample.problem::before {
      inset: 10px 8px;
      border-radius: 8px;
      background: var(--legend-stroke);
      opacity: 0.16;
    }

    .legend-sample.guide {
      background: rgba(255, 255, 255, 0.42);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 18%, transparent);
    }

    .legend-sample.guide::before {
      width: 3px;
      height: calc(100% - 16px);
      border-radius: 999px;
      background: var(--legend-stroke);
    }

    .legend-sample.guide::after {
      content: "";
      position: absolute;
      inset: 10px 14px;
      background:
        radial-gradient(circle at center, var(--legend-stroke) 1px, transparent 1.2px) center center / 6px 6px repeat-y;
      opacity: 0.9;
    }

    .legend-sample.perf {
      background: rgba(255, 255, 255, 0.54);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 16%, transparent);
    }

    .legend-sample.perf::before {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--legend-stroke);
      box-shadow:
        -10px 0 0 var(--legend-stroke),
        10px 0 0 var(--legend-stroke),
        -20px 0 0 var(--legend-stroke);
    }

    .legend-sample.tear {
      background: rgba(46, 183, 116, 0.05);
      border: 1px solid color-mix(in srgb, var(--legend-stroke) 20%, transparent);
    }

    .legend-sample.tear::before {
      inset: 14px 10px;
      background:
        linear-gradient(135deg, transparent 46%, var(--legend-stroke) 46% 54%, transparent 54%) left center / 50% 100% no-repeat,
        linear-gradient(225deg, transparent 46%, var(--legend-stroke) 46% 54%, transparent 54%) right center / 50% 100% no-repeat;
      transform: scaleY(0.9);
    }

    .legend-label {
      margin: 0;
      color: #1f1b17;
      font-weight: 700;
      font-size: 0.92rem;
    }

    .legend-note {
      margin: 0;
      color: #6b6258;
      font-size: 0.8rem;
      line-height: 1.35;
    }

    .artwork-sidebar-note {
      margin: 0 0 14px;
      color: #5f564c;
    }

    .artwork-export-readiness {
      display: grid;
      gap: 6px;
      margin: 0 0 14px;
      padding: 10px;
      border: 1px solid rgba(31, 77, 66, 0.35);
      border-radius: 10px;
      color: #2f473f;
      background: rgba(31, 77, 66, 0.07);
      font-size: 0.88rem;
      line-height: 1.4;
    }

    .artwork-export-readiness.is-blocked {
      border-color: rgba(158, 19, 22, 0.55);
      color: #741113;
      background: rgba(158, 19, 22, 0.08);
    }

    .artwork-export-readiness .artwork-chip {
      justify-self: start;
    }

    .artwork-rules-section {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 241, 232, 0.98));
    }

    .artwork-rules-grid {
      display: grid;
      gap: 12px;
      margin-bottom: 12px;
    }

    .artwork-rule-group {
      display: grid;
      gap: 8px;
    }

    .artwork-rule-label {
      font-size: 0.88rem;
      font-weight: 700;
      color: #1f1b17;
    }

    .artwork-rule-toggle-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .artwork-rule-notes {
      display: grid;
      gap: 6px;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .artwork-rule-notes p {
      margin: 0;
      color: #5f564c;
      font-size: 0.84rem;
      line-height: 1.4;
    }

    .artwork-assets-section {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(246, 242, 233, 0.98));
    }

    .artwork-subpanel {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .artwork-subpanel-title {
      margin: 0;
      font-size: 0.9rem;
      color: #1f1b17;
      font-weight: 700;
    }

    .artwork-import-button {
      align-self: flex-start;
      margin-bottom: 12px;
    }

    .artwork-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .artwork-list-item {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(24, 24, 24, 0.08);
      box-shadow: 0 8px 18px rgba(34, 34, 34, 0.05);
    }

    .artwork-list-item.is-selected {
      border-color: rgba(31, 77, 66, 0.34);
      box-shadow: 0 10px 22px rgba(31, 77, 66, 0.12);
    }

    .artwork-list-main {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
    }

    .artwork-list-thumb {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      object-fit: cover;
      background: #f0ece4;
      border: 1px solid rgba(24, 24, 24, 0.08);
    }

    .artwork-list-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .artwork-list-title {
      font-weight: 700;
      color: #1d1b18;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .artwork-list-subtitle {
      font-size: 0.82rem;
      color: #6b6258;
    }

    .artwork-list-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .artwork-list-orientation-actions {
      align-items: center;
    }

    .artwork-list-category-actions {
      align-items: center;
    }

    .artwork-list-opacity {
      display: grid;
      gap: 6px;
      padding-top: 2px;
      color: #5f564c;
      font-size: 0.8rem;
    }

    .artwork-list-opacity input {
      width: 100%;
      accent-color: #1f4d42;
    }

    .artwork-chip {
      border: 1px solid rgba(24, 24, 24, 0.1);
      border-radius: 999px;
      background: #f4efe5;
      color: #3e3121;
      padding: 8px 12px;
      font: inherit;
      cursor: pointer;
      transition: transform 140ms ease, background 140ms ease, box-shadow 140ms ease;
    }

    .artwork-chip:hover {
      transform: translateY(-1px);
      background: #efe7d9;
      box-shadow: 0 10px 20px rgba(34, 34, 34, 0.1);
    }

    .artwork-chip:disabled,
    .artwork-chip[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.56;
      transform: none;
      box-shadow: none;
    }

    .artwork-chip:disabled:hover,
    .artwork-chip[aria-disabled="true"]:hover {
      background: #f4efe5;
      color: #3e3121;
      transform: none;
      box-shadow: none;
    }

    .artwork-chip.is-active {
      background: #1f4d42;
      border-color: rgba(31, 77, 66, 0.28);
      color: #f7f6f0;
    }

    .artwork-chip.is-active:hover {
      background: #1f4d42;
      color: #f7f6f0;
    }

    .artwork-chip.danger {
      background: #f9e3e1;
      color: #7c2f29;
      border-color: rgba(124, 47, 41, 0.18);
    }

    .artwork-chip.danger.is-active {
      background: #7c2f29;
      color: #f7f6f0;
    }

    .artwork-orientation-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .artwork-orientation-icon {
      display: inline-block;
      border-radius: 4px;
      border: 2px solid currentColor;
      box-sizing: border-box;
      opacity: 0.9;
    }

    .artwork-orientation-icon.landscape {
      width: 18px;
      height: 10px;
    }

    .artwork-orientation-icon.portrait {
      width: 10px;
      height: 18px;
    }

    .artwork-flip-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .artwork-flip-icon {
      display: inline-grid;
      place-items: center;
      width: 16px;
      height: 16px;
      font-size: 0.95rem;
      line-height: 1;
    }

    .artwork-empty-state,
    .artwork-warning-ok,
    .artwork-warning-item {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.45;
      color: #5f564c;
    }

    .artwork-sidebar-hint {
      margin-top: -4px;
      color: #6b6258;
    }

    .artwork-warning-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .artwork-warning-ok {
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(46, 183, 116, 0.08);
      border: 1px solid rgba(46, 183, 116, 0.18);
      color: #1f4d42;
    }

    .artwork-warning-card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(24, 24, 24, 0.08);
      box-shadow: 0 8px 18px rgba(34, 34, 34, 0.05);
    }

    .artwork-warning-card.info {
      border-color: rgba(52, 115, 146, 0.2);
      background: rgba(242, 248, 251, 0.9);
    }

    .artwork-warning-card.warning {
      border-color: rgba(194, 92, 63, 0.22);
      background: rgba(255, 247, 241, 0.92);
    }

    .artwork-warning-card.critical {
      border-color: rgba(194, 63, 63, 0.24);
      background: rgba(255, 242, 242, 0.95);
    }

    .artwork-warning-card-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .artwork-warning-card-title-wrap {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .artwork-warning-title {
      margin: 0;
      font-weight: 700;
      color: #1d1b18;
    }

    .artwork-warning-meta {
      margin: 0;
      font-size: 0.84rem;
      color: #6b6258;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .artwork-warning-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }

    .artwork-warning-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(31, 77, 66, 0.1);
      color: #1f4d42;
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .artwork-warning-message {
      margin: 0;
      color: #5f564c;
      line-height: 1.45;
      font-size: 0.88rem;
    }

    .artwork-warning-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .artwork-modal-backdrop {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(18, 18, 18, 0.45);
      backdrop-filter: blur(4px);
      z-index: 30;
    }

    .artwork-modal {
      width: min(92vw, 460px);
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 244, 236, 0.98));
      border: 1px solid rgba(24, 24, 24, 0.1);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.24);
      padding: 18px;
      display: grid;
      gap: 14px;
    }

    .artwork-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .artwork-modal-header h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #1d1b18;
    }

    .artwork-modal-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .artwork-modal-option {
      border: 1px solid rgba(24, 24, 24, 0.1);
      border-radius: 14px;
      background: #f4efe5;
      color: #3e3121;
      padding: 14px 12px;
      font: inherit;
      cursor: pointer;
      transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
    }

    .artwork-modal-option:hover {
      transform: translateY(-1px);
      background: #efe7d9;
      box-shadow: 0 10px 20px rgba(34, 34, 34, 0.1);
    }

    .artwork-proof-modal {
      width: min(92vw, 560px);
    }

    .artwork-modal-note {
      margin: 0;
      color: #5a5147;
      line-height: 1.45;
      font-size: 0.92rem;
    }

    .artwork-proof-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .artwork-proof-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(24, 24, 24, 0.1);
      background: rgba(255, 255, 255, 0.7);
      color: #342b21;
      font-size: 0.92rem;
    }

    .artwork-proof-option input {
      accent-color: #1f4d42;
    }

    .artwork-modal-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    @media (max-width: 980px) {
      .artwork-shell {
        grid-template-columns: 1fr;
        padding: 18px;
      }

      .artwork-header {
        flex-direction: column;
      }

      .artwork-actions {
        justify-content: flex-start;
      }
    }

    @media (max-width: 640px) {
      .artwork-canvas-panel,
      .artwork-sidebar-section {
        padding: 18px;
      }

      .artwork-meta {
        grid-template-columns: 1fr;
      }

      .artwork-control-grid,
      .artwork-modal-options {
        grid-template-columns: 1fr;
      }

      .artwork-accordion-summary {
        align-items: flex-start;
        flex-direction: column;
      }

      .legend-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 480px) {
      .legend-grid {
        grid-template-columns: 1fr;
      }
    }
  `
  document.head.appendChild(style)
}

type LegendItem = {
  sampleClass: string
  label: string
  note: string
  sampleLabel?: string
  stroke?: string
  fill?: string
  opacity?: string
  dash?: string
}

const readSvgStyle = (element: Element | null) => ({
  stroke: element?.getAttribute("stroke") ?? undefined,
  fill:
    element?.getAttribute("fill") && element.getAttribute("fill") !== "none"
      ? element.getAttribute("fill") ?? undefined
      : "transparent",
  opacity: element?.getAttribute("opacity") ?? undefined,
  dash: element?.getAttribute("stroke-dasharray") ?? undefined
})

type PermissionZone = {
  x: number
  y: number
  width: number
  height: number
  label: string
  note: string
  kind: "seal-allowed" | "seal-restricted" | "track-clear" | "eyemark-protected" | "safe-guidance"
}

type PrintPermissionZones = {
  noArtworkZones: PermissionZone[]
  restrictedZones: PermissionZone[]
  cleanNoiseZones: PermissionZone[]
}

const parseNumberAttr = (element: Element | null, attribute: string, fallback: number) => {
  const raw = Number(element?.getAttribute(attribute))
  return Number.isFinite(raw) ? raw : fallback
}

const readZoneRect = (element: SVGElement | null) => {
  if (!element) {
    return null
  }
  return {
    x: parseNumberAttr(element, "x", 0),
    y: parseNumberAttr(element, "y", 0),
    width: parseNumberAttr(element, "width", 0),
    height: parseNumberAttr(element, "height", 0)
  }
}

const getCutterMetrics = (svg: SVGSVGElement) => {
  const sealLayer = svg.querySelector<SVGGElement>("#seal_areas")
  const eyemarkLayer = svg.querySelector<SVGGElement>("#eyemark_track")
  const cutterOriginX = parseNumberAttr(
    eyemarkLayer ?? sealLayer,
    "data-cutter-origin-x",
    parseNumberAttr(sealLayer, "data-origin-x", 0)
  )
  const cutterOriginY = parseNumberAttr(
    eyemarkLayer ?? sealLayer,
    "data-cutter-origin-y",
    parseNumberAttr(sealLayer, "data-origin-y", 0)
  )
  const cutterWidth = parseNumberAttr(
    eyemarkLayer ?? sealLayer,
    "data-cutter-width",
    parseNumberAttr(sealLayer, "data-cutter-width", 0)
  )
  const cutterHeight = parseNumberAttr(
    eyemarkLayer ?? sealLayer,
    "data-cutter-height",
    parseNumberAttr(sealLayer, "data-cutter-height", 0)
  )
  return { cutterOriginX, cutterOriginY, cutterWidth, cutterHeight }
}

const resolveTrackSide = (
  position: string | null,
  rectIndex: number,
  rect: { x: number; width: number },
  cutterOriginX: number,
  cutterWidth: number,
  count: number
) => {
  if (position?.includes("left")) {
    return "left"
  }
  if (position?.includes("right")) {
    return "right"
  }
  if (count === 2 && (position === "top" || position === "bottom" || position === "centre")) {
    return rectIndex === 0 ? "left" : "right"
  }
  const centerX = rect.x + rect.width / 2
  return centerX < cutterOriginX + cutterWidth / 2 ? "left" : "right"
}

const buildPrintPermissionZones = (
  svg: SVGSVGElement,
  rules: PrintRules
): PrintPermissionZones => {
  const floodPrint = rules.floodPrint || rules.printInSeals
  const { cutterOriginX, cutterOriginY, cutterWidth, cutterHeight } = getCutterMetrics(svg)
  const eyeMarkRects = Array.from(
    svg.querySelectorAll<SVGRectElement>("#eyemark_track [data-role='eye-mark']")
  )
    .map(readZoneRect)
    .filter((rect): rect is NonNullable<ReturnType<typeof readZoneRect>> => Boolean(rect))
  const sealRects = Array.from(
    svg.querySelectorAll<SVGRectElement>("#seal_areas [data-role='seal-rect']")
  )
    .map(readZoneRect)
    .filter((rect): rect is NonNullable<ReturnType<typeof readZoneRect>> => Boolean(rect))
  const safeZones = Array.from(
    svg.querySelectorAll<SVGRectElement>("#safe_zones [data-role='safe-zone-outline']")
  )
    .map(readZoneRect)
    .filter((rect): rect is NonNullable<ReturnType<typeof readZoneRect>> => Boolean(rect))

  const noArtworkZones: PermissionZone[] = eyeMarkRects.map((rect, index) => ({
    ...rect,
    label: "Eyemark no-artwork",
    note: "Eyemark itself is always protected.",
    kind: "eyemark-protected"
  }))

  const restrictedZones: PermissionZone[] = []
  if (!floodPrint) {
    sealRects.forEach(rect => {
      restrictedZones.push({
        ...rect,
        label: "Seal no-print",
        note: "Seal area is restricted while Flood Print is off.",
        kind: "seal-restricted"
      })
    })
  }
  if (rules.keepEyemarkTrackClear) {
    eyeMarkRects.forEach((rect, index) => {
      const position = activeCutterState?.spec.eyeMarks?.position ?? renderedSpec.eyeMarks?.position ?? null
      const side = resolveTrackSide(
        position,
        index,
        rect,
        cutterOriginX,
        cutterWidth,
        eyeMarkRects.length
      )
      const trackWidth = Math.max(1, rect.width)
      const trackX = side === "left" ? cutterOriginX : cutterOriginX + cutterWidth - trackWidth
      restrictedZones.push({
        x: trackX,
        y: cutterOriginY,
        width: trackWidth,
        height: cutterHeight,
        label: "Eyemark track clear",
        note: "Protected track band for eyemark clearance.",
        kind: "track-clear"
      })
    })
  }

  const cleanNoiseZones: PermissionZone[] = safeZones.map(rect => ({
    ...rect,
    label: "Safe zone clean area",
    note: "Print is allowed here, but keep the artwork calm and low-noise.",
    kind: "safe-guidance"
  }))

  return {
    noArtworkZones,
    restrictedZones,
    cleanNoiseZones
  }
}

const renderArtworkPreflightOverlay = (
  svg: SVGSVGElement,
  report = getArtworkPreflightReport()
) => {
  const existing = svg.querySelector<SVGGElement>("#artwork-preflight-overlay")
  existing?.remove()

  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g")
  overlay.setAttribute("id", "artwork-preflight-overlay")
  overlay.setAttribute("pointer-events", "none")

  const activeWarnings = report.warnings.filter(warning => !warning.ignored)

  report.overlays
    .filter(overlayZone => {
      if (overlayZone.kind !== "problem") {
        return false
      }
      return activeWarnings.some(warning => {
        const matchesItem = overlayZone.targetId
          ? warning.itemId === overlayZone.targetId
          : warning.itemId === null
        return matchesItem && warning.title === overlayZone.label
      })
    })
    .forEach(zone => {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g")
      group.setAttribute("class", `artwork-preflight-zone ${zone.kind}`)
      group.setAttribute("data-zone-kind", zone.kind)
      group.setAttribute("data-zone-id", zone.id)

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
      rect.setAttribute("x", zone.bounds.x.toString())
      rect.setAttribute("y", zone.bounds.y.toString())
      rect.setAttribute("width", zone.bounds.width.toString())
      rect.setAttribute("height", zone.bounds.height.toString())
      rect.setAttribute("rx", "1.25")
      rect.setAttribute("ry", "1.25")
      rect.setAttribute("fill", "#d64f3d")
      rect.setAttribute("fill-opacity", "0.13")
      rect.setAttribute("stroke", "#d64f3d")
      rect.setAttribute("stroke-width", "0.7")
      rect.setAttribute("vector-effect", "non-scaling-stroke")
      group.appendChild(rect)

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
      label.setAttribute("x", (zone.bounds.x + zone.bounds.width / 2).toString())
      label.setAttribute("y", (zone.bounds.y + zone.bounds.height / 2).toString())
      label.setAttribute("fill", "#b33f33")
      label.setAttribute("font-size", "4")
      label.setAttribute("font-weight", "700")
      label.setAttribute("text-anchor", "middle")
      label.setAttribute("dominant-baseline", "middle")
      label.textContent = zone.label
      group.appendChild(label)

      overlay.appendChild(group)
    })

  const annotationsAnchor =
    svg.querySelector<SVGGElement>("#measurement_annotations") ??
    svg.querySelector<SVGGElement>("#annotations")
  if (annotationsAnchor?.parentNode) {
    annotationsAnchor.parentNode.insertBefore(overlay, annotationsAnchor)
    return
  }
  svg.appendChild(overlay)
}

const savePrintRules = (nextRules: PrintRules) => {
  printRules = {
    ...nextRules,
    floodPrint: Boolean(nextRules.floodPrint || nextRules.printInSeals),
    printInSeals: Boolean(nextRules.printInSeals || nextRules.floodPrint)
  }
  activeCutterState = buildActiveCutterState({
    project: backProject,
    spec: renderedSpec,
    selectedElementIds: activeCutterState?.activeElements.selectedElementIds ?? [],
    printRules
  })
  saveActiveCutterState(activeCutterState)
}

const createLegendMarkup = (svg: SVGSVGElement) => {
  const items: LegendItem[] = []
  const cutterLine = svg.querySelector("#cut_line rect, #cut_line line, #cut_line path")
  if (cutterLine) {
    items.push({
      sampleClass: "cutter",
      label: "Cutter line",
      note: "Outer technical cut path",
      ...readSvgStyle(cutterLine)
    })
  }

  const substrate = svg.querySelector("#substrate_background rect")
  if (substrate) {
    items.push({
      sampleClass: "substrate",
      label: "Substrate",
      note: "Base web / panel fill",
      ...readSvgStyle(substrate)
    })
  }

  if (printRules.floodPrint || printRules.printInSeals) {
    items.push({
      sampleClass: "flood-preview",
      label: "Flood preview",
      note: "Semi-transparent blue flood fill across the cutter area."
    })
  }

  const seal = svg.querySelector("#seal_areas [data-role='seal-rect']")
  if (seal) {
    items.push({
      sampleClass: "seal",
      label: "Seal area",
      note: "Heat-seal / bond band",
      ...readSvgStyle(seal)
    })
  }

  const safeZone =
    svg.querySelector("#safe_zones [data-role='safe-zone-outline']") ??
    svg.querySelector("#safe_zones [data-role='safe-zone-arc']")
  if (safeZone) {
    items.push({
      sampleClass: "safe",
      label: "Safe zone",
      note: "Clean / low-noise guidance area. Print is allowed, but avoid busy or clashing artwork.",
      ...readSvgStyle(safeZone)
    })
  }

  const foldLine = svg.querySelector("#fold_lines [data-role='fold-line']")
  if (foldLine) {
    items.push({
      sampleClass: "fold",
      label: "Fold line",
      note: "Green dashed panel fold guide.",
      ...readSvgStyle(foldLine)
    })
  }

  const problemHighlight = svg.querySelector("#artwork-preflight-overlay [data-zone-kind='problem'] rect")
  if (problemHighlight) {
    items.push({
      sampleClass: "problem",
      label: "Warning highlight",
      note: "Artwork preflight problem area.",
      ...readSvgStyle(problemHighlight)
    })
  }

  const eyemark = svg.querySelector("#eyemark_track [data-role='eye-mark']")
  if (eyemark) {
    items.push({
      sampleClass: "eyemark",
      label: "Eyemark",
      note: "Registration mark block",
      ...readSvgStyle(eyemark)
    })
  }

  const attributeBoxes = Array.from(
    svg.querySelectorAll<SVGRectElement>("#attribute_boxes [data-role='attribute-box'][data-kind]")
  )
  const seenKinds = new Set<string>()
  attributeBoxes.forEach(box => {
    const kind = box.getAttribute("data-kind")
    if (!kind || seenKinds.has(kind)) {
      return
    }
    seenKinds.add(kind)
    const label =
      kind === "barcode"
        ? "Barcode"
        : kind === "qr"
          ? "QR code"
          : kind === "bbe"
            ? "BBE"
            : kind === "label"
              ? "Label"
              : kind === "clear-strip"
                ? "Clear strip"
                : kind
    items.push({
      sampleClass: "attribute",
      label,
      note:
        kind === "clear-strip"
          ? "Clear strip window"
          : "Active attribute box",
      sampleLabel: label.toUpperCase(),
      ...readSvgStyle(box)
    })
  })

  const dimensions =
    svg.querySelector("#measurement_annotations line") ??
    svg.querySelector("#measurement_annotations text")
  if (dimensions) {
    items.push({
      sampleClass: "dimensions",
      label: "Dimensions",
      note: "Measurement annotation",
      ...readSvgStyle(dimensions)
    })
  }

  const cutGuide = svg.querySelector("#cut-lines line")
  if (cutGuide) {
    items.push({
      sampleClass: "guide",
      label: "Cut guide line",
      note: "Red dotted vertical guide",
      ...readSvgStyle(cutGuide)
    })
  }

  const slitGuide = svg.querySelector("#slit-lines line")
  if (slitGuide) {
    items.push({
      sampleClass: "guide",
      label: "Slit line",
      note: "Alternate guide line",
      ...readSvgStyle(slitGuide)
    })
  }

  const microPerf = svg.querySelector("#perf_layer [data-role='perf-dot']")
  if (microPerf) {
    items.push({
      sampleClass: "perf",
      label: "Micro-perf",
      note: "Dotted perforation line",
      ...readSvgStyle(microPerf)
    })
  }

  const tearNotch = svg.querySelector("#tear_notches [data-role='tear-notch']")
  if (tearNotch) {
    items.push({
      sampleClass: "tear",
      label: "Cut / tear line",
      note: "Tear-notch detail",
      ...readSvgStyle(tearNotch)
    })
  }

  return items
    .map(item => {
      const styleVars = [
        item.stroke ? `--legend-stroke:${item.stroke}` : "",
        item.fill ? `--legend-fill:${item.fill}` : "",
        item.opacity ? `--legend-opacity:${item.opacity}` : "",
        item.dash ? `--legend-dash:${item.dash}` : ""
      ]
        .filter(Boolean)
        .join(";")
      return `
        <li class="legend-item">
          <span class="legend-sample ${item.sampleClass}" ${item.sampleLabel ? `data-label="${item.sampleLabel}"` : ""} style="${styleVars}" aria-hidden="true"></span>
          <p class="legend-label">${item.label}</p>
          <p class="legend-note">${item.note}</p>
        </li>
      `
    })
    .join("")
}

const createPrintRulesMarkup = (svg: SVGSVGElement) => {
  const zones = buildPrintPermissionZones(svg, printRules)
  const items: LegendItem[] = []

  items.push({
    sampleClass: printRules.floodPrint || printRules.printInSeals ? "seal-allowed" : "seal-restricted",
    label: printRules.floodPrint || printRules.printInSeals ? "Seal print allowed area" : "Seal no-print area",
    note: printRules.floodPrint || printRules.printInSeals
      ? "Seal areas are open to artwork, subject to eyemark clearance."
      : "Seal areas are restricted while Flood Print is off."
  })

  if (printRules.keepEyemarkTrackClear) {
    items.push({
      sampleClass: "track-clear",
      label: "Eyemark track clear",
      note: "Protected eyemark track band. The eyemark itself remains no-artwork.",
      sampleLabel: "Eyemark track clear"
    })
  }

  items.push({
    sampleClass: "eyemark-protected",
    label: "Eyemark no-artwork",
    note: "Eyemark itself is always protected."
  })

  if (zones.cleanNoiseZones.length > 0) {
    items.push({
      sampleClass: "safe-guidance",
      label: "Safe zone clean area",
      note: "Print allowed, but keep the artwork calm and low-noise."
    })
  }

  return items
    .map(item => `
      <li class="print-rule-item">
        <span class="print-rule-sample ${item.sampleClass}" ${item.sampleLabel ? `data-label="${item.sampleLabel}"` : ""} aria-hidden="true"></span>
        <p class="print-rule-label">${item.label}</p>
        <p class="print-rule-note">${item.note}</p>
      </li>
    `)
    .join("")
}

const render = (
  statusMessage = "MVP technical cutter render generated."
) => {
  const workflowValidation = getArtworkWorkflowValidationState()
  app.innerHTML = `
    <div class="artwork-shell">
      <section class="artwork-panel artwork-main">
        <header class="artwork-header">
          <div>
            <p class="artwork-kicker">Artwork Studio MVP</p>
            <h1 class="artwork-title">${technicalProject.displayName}</h1>
            <p class="artwork-subtitle">
              Technical cutter preview sourced from the live Cutter App geometry.
            </p>
          </div>
          <div class="artwork-actions">
            <button class="artwork-button secondary" type="button" id="back-to-cutter">Back to Cutter Studio</button>
            <button class="artwork-button secondary" type="button" id="view-validation-centre">View Validation</button>
            <button class="artwork-button secondary" type="button" id="export-proof" data-export-readiness="${workflowValidation.exportBlocked ? "blocked" : workflowValidation.exportReadiness.state}" title="${workflowValidation.exportBlocked ? "Export blocked: critical validation issues remain." : workflowValidation.exportReadiness.message}" ${renderedSpec.width > 0 && renderedSpec.height > 0 ? "" : "disabled"}>Export Proof PDF (Raster)</button>
            <button class="artwork-button primary" type="button" id="regenerate-render">Regenerate Technical Render</button>
          </div>
        </header>

        <div class="artwork-canvas-panel">
          <div class="artwork-preview-toolbar">
            <div class="artwork-preview-slider-wrap">
              <span class="artwork-preview-slider-label">Zoom</span>
              <input
                class="artwork-preview-slider"
                type="range"
                id="artwork-zoom-slider"
                min="${PREVIEW_MIN_ZOOM_PERCENT}"
                max="${PREVIEW_MAX_ZOOM_PERCENT}"
                step="${PREVIEW_ZOOM_STEP_PERCENT}"
                value="100"
                aria-label="Preview zoom"
              />
            </div>
            <button class="artwork-preview-reset" type="button" id="artwork-zoom-reset">Reset View</button>
          </div>
          <div class="artwork-preview-viewport" id="artwork-preview-viewport">
            <div class="artwork-preview-stage" id="artwork-preview-stage">
              <div class="artwork-canvas" id="artwork-canvas"></div>
            </div>
          </div>
        </div>
      </section>

      <aside class="artwork-sidebar">
        ${createArtworkRulesMarkup()}
        ${createValidationCentreMarkup(workflowValidation)}

        <section class="artwork-panel artwork-sidebar-section">
          <details class="artwork-accordion">
            <summary class="artwork-accordion-summary">
              <span class="artwork-accordion-summary-main">
                <span class="artwork-accordion-title">Pack Spec</span>
                <span class="artwork-accordion-summary-note">
                  ${technicalProject.displayName} · ${technicalProject.packLabel} · ${Math.round(renderedSpec.width)} x ${Math.round(renderedSpec.height)} mm
                </span>
              </span>
              <span class="artwork-accordion-chevron" aria-hidden="true"></span>
            </summary>
            <div class="artwork-accordion-body">
              <div class="artwork-meta">
                <div class="artwork-meta-card">
                  <p class="artwork-meta-label">Product</p>
                  <p class="artwork-meta-value">${technicalProject.displayName}</p>
                </div>
                <div class="artwork-meta-card">
                  <p class="artwork-meta-label">Pack Type</p>
                  <p class="artwork-meta-value">${technicalProject.packLabel}</p>
                </div>
                <div class="artwork-meta-card">
                  <p class="artwork-meta-label">Size</p>
                  <p class="artwork-meta-value">${Math.round(renderedSpec.width)}mm x ${Math.round(renderedSpec.height)}mm</p>
                </div>
                <div class="artwork-meta-card">
                  <p class="artwork-meta-label">Data Source</p>
                  <p class="artwork-meta-value">${dataSourceLabel}</p>
                </div>
                <div class="artwork-meta-card">
                  <p class="artwork-meta-label">Attributes</p>
                  <p class="artwork-meta-value">${renderedAttributeGroups.length}</p>
                </div>
              </div>
            </div>
          </details>
        </section>

        <section class="artwork-panel artwork-sidebar-section">
          <details class="artwork-accordion">
            <summary class="artwork-accordion-summary">
              <span class="artwork-accordion-summary-main">
                <span class="artwork-accordion-title">Cutter Legend</span>
              </span>
              <span class="artwork-accordion-chevron" aria-hidden="true"></span>
            </summary>
            <div class="artwork-accordion-body">
              <div class="artwork-legend-card">
                <ul class="legend-grid" id="artwork-legend-grid"></ul>
              </div>
            </div>
          </details>
        </section>

        <section class="artwork-panel artwork-sidebar-section">
          <h2>Production Checks</h2>
          <ul class="artwork-list">
            <li>Cutter geometry is locked.</li>
            <li>Do not alter cutter, eyemark or seal positions.</li>
          </ul>
        </section>

        <section class="artwork-panel artwork-sidebar-section">
          <h2>Artwork Preflight / Zone Warnings</h2>
          <ul class="artwork-warning-list" id="artwork-warning-list">
            ${createArtworkWarnings()}
          </ul>
        </section>

        <section class="artwork-panel artwork-sidebar-section artwork-assets-section">
          <h2>Artwork Assets</h2>
          <p class="artwork-sidebar-note">
            Import logos, images, badges or text artwork. Imported artwork starts behind the cutter and centered.
          </p>
          <button class="artwork-button primary artwork-import-button" type="button" id="artwork-import-button">Import</button>
          <input type="file" id="artwork-file-input" accept="${ARTWORK_FILE_ACCEPT}" hidden />

          <div class="artwork-subpanel">
            <h3 class="artwork-subpanel-title">Artwork List</h3>
            <div class="artwork-list" id="artwork-list">
              ${createArtworkListMarkup()}
            </div>
          </div>
          <p class="artwork-sidebar-note artwork-sidebar-hint">
            Double-click artwork on the canvas to edit it.
          </p>
        </section>
      </aside>
      ${createArtworkImportModalMarkup()}
      ${createProofExportModalMarkup()}
    </div>
  `

  const canvas = document.getElementById("artwork-canvas")
  if (canvas) {
    canvas.innerHTML = ""
    const svg = renderSvg()
    stripTechnicalEditorUi(svg)
    previewSvg = svg
    canvas.appendChild(svg)
    syncFloodPreviewLayer(svg, printRules.floodPrint || printRules.printInSeals)
    syncArtworkLayer(svg, artworkCollection, artworkEditModeId)
    renderArtworkPreflightOverlay(svg)
    const rulesPanel = document.getElementById("artwork-rules-panel")
    if (rulesPanel) {
      rulesPanel.outerHTML = createArtworkRulesMarkup()
    }
    const warningList = document.getElementById("artwork-warning-list")
    if (warningList instanceof HTMLElement) {
      warningList.innerHTML = createArtworkWarnings()
    }
    previewContentBounds = measurePreviewContentBounds(svg)
    const legendGrid = document.getElementById("artwork-legend-grid")
    if (legendGrid instanceof HTMLUListElement) {
      legendGrid.innerHTML = createLegendMarkup(svg)
    }
    syncPreviewViewport()
  }

  const zoomSlider = document.getElementById("artwork-zoom-slider")
  if (zoomSlider instanceof HTMLInputElement) {
    zoomSlider.value = String(Math.round(previewViewState.zoomPercent))
    zoomSlider.oninput = () => {
      setPreviewZoomPercent(Number(zoomSlider.value))
    }
  }

  const viewport = document.getElementById("artwork-preview-viewport")
  if (viewport instanceof HTMLElement) {
    viewport.onpointerdown = event => {
      if (event.button !== 0) {
        return
      }

      const targetElement = event.target instanceof Element ? event.target : null
      const handleElement = targetElement?.closest("[data-artwork-handle]")
      const handleForId = handleElement?.getAttribute("data-artwork-handle-for") ?? null
      const artworkNode = targetElement?.closest("[data-artwork-id]")
      const artworkId = artworkNode?.getAttribute("data-artwork-id") ?? null
      const handleName = handleElement?.getAttribute("data-artwork-handle")
      const activeArtworkId = handleForId || artworkId
      const artworkItem = artworkId
        ? artworkCollection.items.find(item => item.id === artworkId) ?? null
        : null
      const handleArtworkItem = handleForId
        ? artworkCollection.items.find(item => item.id === handleForId) ?? null
        : null
      if (import.meta.env.DEV) {
        const hitTestIds = document
          .elementsFromPoint(event.clientX, event.clientY)
          .map(element => element.getAttribute?.("data-artwork-id"))
          .filter((value): value is string => Boolean(value))
        const topmostHitId = hitTestIds[0] ?? activeArtworkId
        const topmostHitItem =
          artworkCollection.items.find(item => item.id === topmostHitId) ?? null
        const selectedItem = getArtworkSelectedItem()
        console.log("[Artwork Studio][Selection]", {
          pointer: clientPointToSvgPoint(event.clientX, event.clientY, viewport),
          hitTestIds,
          selectedArtworkId: artworkCollection.selectedId,
          selectedArtworkName: selectedItem
            ? buildArtworkLabel(selectedItem.uploadType, selectedItem.filename)
            : null,
          topmostHitId,
          topmostHitName: topmostHitItem
            ? buildArtworkLabel(topmostHitItem.uploadType, topmostHitItem.filename)
            : null
        })
      }

      if (handleArtworkItem && handleName) {
        event.preventDefault()
        if (artworkEditModeId !== handleForId) {
          selectArtworkItemOnCanvas(handleForId)
          return
        }
        if (handleArtworkItem.locked) {
          return
        }
        artworkInteractionState = {
          kind: "resize",
          pointerId: event.pointerId,
          itemId: handleForId,
          handle: handleName as ArtworkCornerHandle,
          startPoint: clientPointToSvgPoint(event.clientX, event.clientY, viewport),
          originBounds: getArtworkBounds(handleArtworkItem),
          originScale: handleArtworkItem.scale
        }
        previewDragState = null
        viewport.setPointerCapture(event.pointerId)
        viewport.classList.add("is-dragging")
        return
      }

      if (artworkItem || activeArtworkId) {
        event.preventDefault()
        if (artworkCollection.selectedId !== activeArtworkId) {
          selectArtworkItemOnCanvas(activeArtworkId)
          return
        }
        if (artworkItem && !artworkItem.locked) {
          artworkEditModeId = activeArtworkId
          artworkInteractionState = {
            kind: "move",
            pointerId: event.pointerId,
            itemId: activeArtworkId,
            startPoint: clientPointToSvgPoint(event.clientX, event.clientY, viewport),
            originX: artworkItem.x,
            originY: artworkItem.y
          }
          previewDragState = null
          viewport.setPointerCapture(event.pointerId)
          viewport.classList.add("is-dragging")
        }
        return
      }

      if (artworkCollection.selectedId || artworkEditModeId) {
        event.preventDefault()
        deselectArtworkItem()
        return
      }

      if (previewViewState.zoomPercent <= 100) {
        return
      }

      event.preventDefault()
      previewDragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originPanX: previewViewState.panX,
        originPanY: previewViewState.panY
      }
      viewport.setPointerCapture(event.pointerId)
      viewport.classList.add("is-dragging")
    }

    viewport.ondblclick = event => {
      if (!(event.target instanceof Element)) {
        return
      }
      const handleNode = event.target.closest("[data-artwork-handle-for]")
      const artworkNode = event.target.closest("[data-artwork-id]")
      if (handleNode) {
        return
      }
      const artworkId = artworkNode?.getAttribute("data-artwork-id") ?? null
      if (!artworkId) {
        return
      }
      event.preventDefault()
      selectArtworkItemOnCanvas(artworkId)
    }

    viewport.onpointermove = event => {
      if (artworkInteractionState && artworkInteractionState.pointerId === event.pointerId) {
        event.preventDefault()
        if (artworkInteractionState.kind === "move") {
          const currentPoint = clientPointToSvgPoint(event.clientX, event.clientY, viewport)
          const dx = currentPoint.x - artworkInteractionState.startPoint.x
          const dy = currentPoint.y - artworkInteractionState.startPoint.y
          updateArtworkPositionAndScale(
            artworkInteractionState.itemId,
            artworkInteractionState.originX + dx,
            artworkInteractionState.originY + dy,
            artworkCollection.items.find(item => item.id === artworkInteractionState.itemId)?.scale ?? 1
          )
          return
        }

        resizeArtworkFromHandle(
          artworkInteractionState,
          event.clientX,
          event.clientY,
          viewport
        )
        return
      }

      if (!previewDragState || previewDragState.pointerId !== event.pointerId) {
        return
      }
      event.preventDefault()
      const currentView = previewSvg?.viewBox.baseVal
      if (!currentView || viewport.clientWidth <= 0 || viewport.clientHeight <= 0) {
        return
      }
      const scaleX = currentView.width / viewport.clientWidth
      const scaleY = currentView.height / viewport.clientHeight
      const dxClient = previewDragState.startX - event.clientX
      const dyClient = previewDragState.startY - event.clientY
      previewViewState = {
        ...previewViewState,
        panX: previewDragState.originPanX + dxClient * scaleX,
        panY: previewDragState.originPanY + dyClient * scaleY
      }
      syncPreviewViewport()
    }

    const finishDrag = (event: PointerEvent) => {
      const finishArtworkInteraction =
        artworkInteractionState && artworkInteractionState.pointerId === event.pointerId
      const finishPreviewDrag = previewDragState && previewDragState.pointerId === event.pointerId
      if (!finishArtworkInteraction && !finishPreviewDrag) {
        return
      }
      artworkInteractionState = null
      previewDragState = null
      viewport.classList.remove("is-dragging")
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId)
      }
    }

    viewport.onpointerup = finishDrag
    viewport.onpointercancel = finishDrag
    viewport.onlostpointercapture = () => {
      artworkInteractionState = null
      previewDragState = null
      viewport.classList.remove("is-dragging")
    }
  }

  document.getElementById("artwork-zoom-reset")?.addEventListener("click", () => {
    resetPreviewView()
  })

  document.getElementById("artwork-import-button")?.addEventListener("click", () => {
    openArtworkImportModal()
  })

  document.getElementById("export-proof")?.addEventListener("click", () => {
    if (!guardArtworkExport()) {
      return
    }
    openProofExportModal()
  })

  const importModal = document.getElementById("artwork-import-modal")
  if (importModal instanceof HTMLElement) {
    importModal.addEventListener("click", event => {
      if (event.target === importModal) {
        closeArtworkImportModal()
      }
    })
  }

  const proofExportModal = document.getElementById("artwork-proof-export-modal")
  if (proofExportModal instanceof HTMLElement) {
    proofExportModal.addEventListener("click", event => {
      if (event.target === proofExportModal) {
        closeProofExportModal()
      }
    })
  }

  document.querySelectorAll<HTMLElement>("[data-artwork-import-type]").forEach(button => {
    button.addEventListener("click", () => {
      const uploadType = button.getAttribute("data-artwork-import-type")
      if (
        uploadType === "logo" ||
        uploadType === "image" ||
        uploadType === "badge" ||
        uploadType === "text"
      ) {
        queueArtworkFilePicker(uploadType)
      }
    })
  })

  document.querySelectorAll<HTMLInputElement>("[data-proof-option]").forEach(input => {
    input.addEventListener("change", () => {
      const key = input.getAttribute("data-proof-option") as keyof ArtworkProofExportOptions | null
      if (!key) {
        return
      }
      if (key === "includeFloodPreview" && !(printRules.floodPrint || printRules.printInSeals)) {
        input.checked = false
        return
      }
      proofExportOptions = {
        ...proofExportOptions,
        [key]: input.checked
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-proof-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeProofExportModal()
    })
  })

  document.querySelector("[data-artwork-proof-export]")?.addEventListener("click", () => {
    exportProofPdf().catch(error => {
      console.error("[Artwork Studio] Proof PDF export failed.", error)
    })
  })

  document.querySelector("[data-artwork-import-close]")?.addEventListener("click", () => {
    closeArtworkImportModal()
  })

  const artworkFileInput = document.getElementById("artwork-file-input")
  if (artworkFileInput instanceof HTMLInputElement) {
    artworkFileInput.onchange = async () => {
      const file = artworkFileInput.files?.[0]
      const uploadType = pendingArtworkUploadType
      pendingArtworkUploadType = null
      if (!file || !uploadType) {
        artworkFileInput.value = ""
        return
      }
      if (!isSupportedArtworkFile(file)) {
        console.warn("[Artwork Studio] Unsupported artwork file selected.")
        artworkFileInput.value = ""
        return
      }
      try {
        const nextItem = await createArtworkItemFromFile(file, uploadType)
        artworkCollection = upsertArtworkItem(artworkCollection, nextItem)
        saveArtworkCollection(currentProject, artworkCollection)
        render()
      } catch (error) {
        console.error("[Artwork Studio] Failed to import artwork.", error)
      } finally {
        artworkFileInput.value = ""
      }
    }
  }

  document.querySelectorAll<HTMLElement>("[data-artwork-select]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-select")
      if (itemId) {
        selectArtwork(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-visibility]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-visibility")
      if (itemId) {
        toggleArtworkVisibility(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-lock]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-lock")
      if (itemId) {
        toggleArtworkLock(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-remove]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-remove")
      if (itemId) {
        removeArtwork(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-category]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-category")
      const nextCategory = button.getAttribute("data-artwork-category-value")
      if (itemId && (nextCategory === "Critical" || nextCategory === "Background")) {
        setArtworkCategory(itemId, nextCategory)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-orientation]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-orientation")
      const orientation = button.getAttribute("data-artwork-orientation-value")
      if (itemId && (orientation === "landscape" || orientation === "portrait")) {
        setArtworkOrientation(itemId, orientation)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-flip]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-flip")
      if (itemId) {
        toggleArtworkFlip(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-print-flood]").forEach(button => {
    button.addEventListener("click", () => {
      const nextFloodPrint = button.getAttribute("data-print-flood") === "true"
      printRules = {
        ...printRules,
        floodPrint: nextFloodPrint,
        printInSeals: nextFloodPrint
      }
      savePrintRules(printRules)
      render()
    })
  })

  document.querySelectorAll<HTMLElement>("[data-print-direction-mode]").forEach(button => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-print-direction-mode")
      if (mode !== "maintain-md-td" && mode !== "display-orientation") {
        return
      }
      printRules = {
        ...printRules,
        printDirectionMode: mode
      }
      savePrintRules(printRules)
      render()
    })
  })

  document.querySelectorAll<HTMLElement>("[data-warning-highlight]").forEach(button => {
    button.addEventListener("click", () => {
      const warningId = button.getAttribute("data-warning-highlight")
      if (warningId) {
        highlightArtworkWarning(warningId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-warning-ignore]").forEach(button => {
    button.addEventListener("click", () => {
      const warningId = button.getAttribute("data-warning-ignore")
      if (warningId) {
        ignoreArtworkWarning(warningId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-warning-td-move]").forEach(button => {
    button.addEventListener("click", () => {
      const warningId = button.getAttribute("data-warning-td-move")
      if (warningId) {
        moveTdEyemarkAwayFromEdge(warningId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-warning-td-reduce]").forEach(button => {
    button.addEventListener("click", () => {
      const warningId = button.getAttribute("data-warning-td-reduce")
      if (warningId) {
        reduceTdEyemarkSize(warningId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-warning-td-increase]").forEach(button => {
    button.addEventListener("click", () => {
      const warningId = button.getAttribute("data-warning-td-increase")
      if (warningId) {
        increaseTdEyemarkCutterWidth(warningId)
      }
    })
  })

  document.querySelectorAll<HTMLInputElement>("[data-artwork-x]").forEach(input => {
    input.addEventListener("change", () => {
      const itemId = input.getAttribute("data-artwork-x")
      if (!itemId) {
        return
      }
      const value = Number.parseFloat(input.value)
      if (!Number.isFinite(value)) {
        return
      }
      updateSelectedArtworkItem(item => {
        if (item.id !== itemId) {
          return item
        }
        return {
          ...item,
          x: value
        }
      })
      syncArtworkPreviewLayer()
    })
  })

  document.querySelectorAll<HTMLInputElement>("[data-artwork-y]").forEach(input => {
    input.addEventListener("change", () => {
      const itemId = input.getAttribute("data-artwork-y")
      if (!itemId) {
        return
      }
      const value = Number.parseFloat(input.value)
      if (!Number.isFinite(value)) {
        return
      }
      updateSelectedArtworkItem(item => {
        if (item.id !== itemId) {
          return item
        }
        return {
          ...item,
          y: value
        }
      })
      syncArtworkPreviewLayer()
    })
  })

  document.querySelectorAll<HTMLInputElement>("[data-artwork-scale]").forEach(input => {
    input.addEventListener("input", () => {
      const itemId = input.getAttribute("data-artwork-scale")
      if (!itemId) {
        return
      }
      const value = Number.parseFloat(input.value)
      if (!Number.isFinite(value)) {
        return
      }
      updateSelectedArtworkItem(item => {
        if (item.id !== itemId) {
          return item
        }
        return {
          ...item,
          scale: Math.max(0.01, Math.min(20, value))
        }
      })
      syncArtworkPreviewLayer()
    })
  })

  document.querySelectorAll<HTMLInputElement>("[data-artwork-opacity]").forEach(input => {
    input.addEventListener("input", () => {
      const itemId = input.getAttribute("data-artwork-opacity")
      if (!itemId) {
        return
      }
      const value = Number.parseFloat(input.value)
      if (!Number.isFinite(value)) {
        return
      }
      artworkCollection = updateArtworkItem(artworkCollection, itemId, item => ({
        ...item,
        opacity: Math.max(0, Math.min(1, value))
      }))
      saveArtworkCollection(currentProject, artworkCollection)
      syncArtworkPreviewLayer()
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-reset]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-reset")
      if (itemId) {
        updateArtworkCollection(collection =>
          updateArtworkItem(collection, itemId, item => resetArtworkPosition(item))
        )
        saveArtworkCollection(currentProject, artworkCollection)
        render()
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-center]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-center")
      if (itemId) {
        centerArtworkToCutter(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-fit-width]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-fit-width")
      if (itemId) {
        fitArtworkToCutterWidth(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-fit-height]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-fit-height")
      if (itemId) {
        fitArtworkToCutterHeight(itemId)
      }
    })
  })

  document.querySelectorAll<HTMLElement>("[data-artwork-fit-bleed]").forEach(button => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-artwork-fit-bleed")
      if (itemId) {
        fitArtworkToBleedArea(itemId)
      }
    })
  })

  document.getElementById("back-to-cutter")?.addEventListener("click", () => {
    logArtworkDebugState("back-to-cutter-click", {
      target: "./index.html",
      hasActiveState: Boolean(activeCutterState)
    })
    saveRenderedCutterSpec(renderedSpec)
    saveCurrentProject(backProject)

    try {
      const referrer = document.referrer ? new URL(document.referrer, window.location.href) : null
      if (
        referrer &&
        referrer.origin === window.location.origin &&
        referrer.pathname.endsWith("/index.html")
      ) {
        window.history.back()
        return
      }
    } catch {
      // Fall through to the explicit cutter route below.
    }

    window.location.href = `./index.html?${cutterRouteParams(backProject).toString()}`
  })

  document.getElementById("view-validation-centre")?.addEventListener("click", () => {
    document.getElementById("artwork-validation-centre")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    })
  })

  document.querySelector("[data-return-to-cutter-validation]")?.addEventListener(
    "click",
    () => document.getElementById("back-to-cutter")?.click()
  )

  document.getElementById("regenerate-render")?.addEventListener("click", () => {
    logArtworkDebugState("regenerate-technical-render", {
      hasActiveState: Boolean(activeCutterState)
    })
    render()
  })
}

injectStyles()
render()
