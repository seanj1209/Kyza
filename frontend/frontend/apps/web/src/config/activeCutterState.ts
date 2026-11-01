import type {
  AttributeBoxSpec,
  FlowwrapSpec,
  HalfMoonCutoutSpec,
  HangerSlotSpec,
  PlainWebGuideLineSpec,
  SafeZoneSpec,
  WindowSpec
} from "../types/flowwrap"
import type { EyeMarkSpec } from "../types/eyeMarks"
import type { FoldLineSpec } from "../geometry/foldLines"
import type { CurrentProject } from "./mvpDemoPack"
import type {
  ArtworkCutterOrientation,
  ArtworkPrintDirectionMode,
  ArtworkSlitAllowanceMm,
  ArtworkSlitAllowanceReason
} from "../artwork/artworkRules.types"

export const ACTIVE_CUTTER_STATE_SCHEMA_VERSION =
  "mvp-demo-attribute-handoff-001" as const

export const ACTIVE_CUTTER_STATE_STORAGE_KEY = "kyza.activeCutterState"

export type PrintRules = {
  floodPrint: boolean
  printInSeals: boolean
  keepEyemarkTrackClear: boolean
  safeZoneMode: "use-cutter-safe-zones" | "fallback-distance"
  cutterOrientation: ArtworkCutterOrientation
  printDirectionMode: ArtworkPrintDirectionMode
  slitAllowanceEnabled: boolean
  slitAllowanceMm: ArtworkSlitAllowanceMm
  slitAllowanceAxis: "TD"
  slitAllowanceReason: ArtworkSlitAllowanceReason
}

export const DEFAULT_PRINT_RULES: PrintRules = {
  floodPrint: false,
  printInSeals: false,
  keepEyemarkTrackClear: true,
  safeZoneMode: "use-cutter-safe-zones",
  cutterOrientation: "landscape",
  printDirectionMode: "maintain-md-td",
  slitAllowanceEnabled: false,
  slitAllowanceMm: 0,
  slitAllowanceAxis: "TD",
  slitAllowanceReason: "manual"
}

export type ActiveCutterAttribute =
  | { type: "safe-zone"; items: SafeZoneSpec[] }
  | { type: "attribute-box"; items: AttributeBoxSpec[] }
  | { type: "perforation"; items: NonNullable<FlowwrapSpec["perfs"]> }
  | { type: "fold-line"; items: FoldLineSpec[] }
  | { type: "eyemark"; items: EyeMarkSpec }
  | { type: "window"; items: WindowSpec[] }
  | { type: "hanger-slot"; items: HangerSlotSpec[] }
  | { type: "half-moon-cutout"; items: HalfMoonCutoutSpec[] }
  | { type: "guide-line"; items: PlainWebGuideLineSpec[] }

export type ActiveCutterState = {
  project: CurrentProject
  baseGeometry: {
    width: number
    height: number
    seal: number
    seals?: FlowwrapSpec["seals"]
    bleed?: number
    sealClearance?: number
    substrate?: FlowwrapSpec["substrate"]
  }
  attributes: ActiveCutterAttribute[]
  activeElements: {
    selectedElementIds: string[]
    layerIds: string[]
    attributeTypes: ActiveCutterAttribute["type"][]
  }
  printRules: PrintRules
  source: "cutter-studio"
  schemaVersion: typeof ACTIVE_CUTTER_STATE_SCHEMA_VERSION
  spec: FlowwrapSpec
}

const hasWindow = () => typeof window !== "undefined"

const cloneSpec = (spec: FlowwrapSpec): FlowwrapSpec =>
  JSON.parse(JSON.stringify(spec)) as FlowwrapSpec

const normalizePrintRules = (input?: Partial<PrintRules>): PrintRules => {
  const next = {
    ...DEFAULT_PRINT_RULES,
    ...(input ?? {})
  }
  const slitAllowanceMm =
    next.slitAllowanceMm === 1.5 || next.slitAllowanceMm === 2 ? next.slitAllowanceMm : 0
  return {
    ...next,
    floodPrint: Boolean(next.floodPrint || next.printInSeals),
    printInSeals: Boolean(next.printInSeals || next.floodPrint),
    keepEyemarkTrackClear: Boolean(next.keepEyemarkTrackClear),
    safeZoneMode:
      next.safeZoneMode === "fallback-distance"
        ? "fallback-distance"
        : "use-cutter-safe-zones",
    cutterOrientation:
      next.cutterOrientation === "portrait" ? "portrait" : "landscape",
    printDirectionMode:
      next.printDirectionMode === "display-orientation"
        ? "display-orientation"
        : "maintain-md-td",
    slitAllowanceEnabled: Boolean(next.slitAllowanceEnabled && slitAllowanceMm > 0),
    slitAllowanceMm,
    slitAllowanceAxis: "TD",
    slitAllowanceReason:
      next.slitAllowanceReason === "eyemark-track-risk" ||
      next.slitAllowanceReason === "manual"
        ? next.slitAllowanceReason
        : "full-width-flood"
  }
}

export const collectActiveCutterAttributes = (
  spec: FlowwrapSpec
): ActiveCutterAttribute[] => {
  const attributes: ActiveCutterAttribute[] = []

  const safeZones = (spec.safeZones ?? []).filter(zone => zone.enabled !== false)
  if (safeZones.length > 0) {
    attributes.push({ type: "safe-zone", items: safeZones })
  }

  const attributeBoxes = (spec.attributeBoxes ?? []).filter(box => box.enabled !== false)
  if (attributeBoxes.length > 0) {
    attributes.push({ type: "attribute-box", items: attributeBoxes })
  }

  if (spec.perfs) {
    attributes.push({ type: "perforation", items: spec.perfs })
  }

  const foldLines = spec.foldLines ?? []
  if (foldLines.length > 0) {
    attributes.push({ type: "fold-line", items: foldLines })
  }

  if (spec.eyeMarks) {
    attributes.push({ type: "eyemark", items: spec.eyeMarks })
  }

  const windows = spec.windows ?? []
  if (windows.length > 0) {
    attributes.push({ type: "window", items: windows })
  }

  const hangerSlots = spec.hangerSlots ?? []
  if (hangerSlots.length > 0) {
    attributes.push({ type: "hanger-slot", items: hangerSlots })
  }

  const halfMoonCutouts = spec.halfMoonCutouts ?? []
  if (halfMoonCutouts.length > 0) {
    attributes.push({ type: "half-moon-cutout", items: halfMoonCutouts })
  }

  const guideLines = spec.plainWeb?.guideLines ?? []
  if (guideLines.length > 0) {
    attributes.push({ type: "guide-line", items: guideLines })
  }

  return attributes
}

const collectActiveLayerIds = (spec: FlowwrapSpec) => {
  const layerIds = new Set<string>([
    "cutter-outline",
    "substrate",
    "seal-areas",
    "eyemarks",
    "measurement-guides"
  ])

  if ((spec.safeZones ?? []).some(zone => zone.enabled !== false)) {
    layerIds.add("safe-zones")
  }
  if ((spec.attributeBoxes ?? []).some(box => box.enabled !== false)) {
    layerIds.add("notes")
  }
  if (spec.perfs) {
    layerIds.add("perf-lines")
  }
  if ((spec.foldLines ?? []).length > 0) {
    layerIds.add("fold-lines")
  }
  if ((spec.windows ?? []).length > 0) {
    layerIds.add("windows")
  }
  if ((spec.hangerSlots ?? []).length > 0) {
    layerIds.add("hanger-slots")
  }
  if ((spec.halfMoonCutouts ?? []).length > 0) {
    layerIds.add("tear-notches")
  }
  if ((spec.plainWeb?.guideLines ?? []).length > 0) {
    layerIds.add("cut-lines")
    layerIds.add("slit-lines")
  }
  if (spec.kSealPouch) {
    layerIds.add("gusset-fold-line")
    layerIds.add("kseal-bottom-seals")
    layerIds.add("kseal-arms")
  }

  return [...layerIds]
}

const buildBaseGeometry = (spec: FlowwrapSpec) => ({
  width: spec.width,
  height: spec.height,
  seal: spec.seal,
  seals: spec.seals,
  bleed: spec.bleed,
  sealClearance: spec.sealClearance,
  substrate: spec.substrate
})

export const buildActiveCutterState = (input: {
  project: CurrentProject
  spec: FlowwrapSpec
  selectedElementIds?: string[]
  printRules?: Partial<PrintRules>
}): ActiveCutterState => {
  const spec = cloneSpec(input.spec)
  const attributes = collectActiveCutterAttributes(spec)
  const printRules = normalizePrintRules(input.printRules)
  return {
    project: input.project,
    baseGeometry: buildBaseGeometry(spec),
    attributes,
    activeElements: {
      selectedElementIds: [...(input.selectedElementIds ?? [])],
      layerIds: collectActiveLayerIds(spec),
      attributeTypes: attributes.map(attribute => attribute.type)
    },
    printRules,
    source: "cutter-studio",
    schemaVersion: ACTIVE_CUTTER_STATE_SCHEMA_VERSION,
    spec
  }
}

export const saveActiveCutterState = (state: ActiveCutterState) => {
  if (!hasWindow()) {
    return
  }
  window.sessionStorage.setItem(
    ACTIVE_CUTTER_STATE_STORAGE_KEY,
    JSON.stringify(state)
  )
}

export const clearActiveCutterState = () => {
  if (!hasWindow()) {
    return
  }
  window.sessionStorage.removeItem(ACTIVE_CUTTER_STATE_STORAGE_KEY)
}

export const loadActiveCutterState = (): ActiveCutterState | null => {
  if (!hasWindow()) {
    return null
  }
  const raw = window.sessionStorage.getItem(ACTIVE_CUTTER_STATE_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveCutterState>
    if (parsed.schemaVersion !== ACTIVE_CUTTER_STATE_SCHEMA_VERSION) {
      return null
    }
    if (!parsed.project || !parsed.spec) {
      return null
    }
    return {
      ...parsed,
      project: parsed.project,
      spec: parsed.spec,
      baseGeometry: parsed.baseGeometry ?? buildBaseGeometry(parsed.spec),
      attributes: parsed.attributes ?? collectActiveCutterAttributes(parsed.spec),
      activeElements: parsed.activeElements ?? {
        selectedElementIds: [],
        layerIds: collectActiveLayerIds(parsed.spec),
        attributeTypes: collectActiveCutterAttributes(parsed.spec).map(attribute => attribute.type)
      },
      printRules: {
        ...normalizePrintRules(parsed.printRules as Partial<PrintRules> | undefined)
      },
      source: "cutter-studio",
      schemaVersion: ACTIVE_CUTTER_STATE_SCHEMA_VERSION
    }
  } catch {
    return null
  }
}
