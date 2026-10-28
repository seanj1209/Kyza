import { buildArtworkPreflightReport } from "../apps/web/src/artwork/artworkPreflight.helpers"
import type { PrintRules } from "../apps/web/src/config/activeCutterState"
import type { ArtworkCollection, ArtworkItem } from "../apps/web/src/artwork/artworkTypes"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertClose(actual: number | undefined, expected: number, message: string) {
  if (actual == null || Math.abs(actual - expected) > 0.0001) {
    throw new Error(`${message} Expected ${expected}, got ${actual}.`)
  }
}

type FakeSvgElement = {
  getAttribute(name: string): string | null
  getBBox?: () => { x: number; y: number; width: number; height: number }
}

type FakeSvg = {
  querySelector(selector: string): FakeSvgElement | null
  querySelectorAll(selector: string): FakeSvgElement[]
}

const createRectElement = (bounds: { x: number; y: number; width: number; height: number }): FakeSvgElement => ({
  getAttribute(name: string) {
    if (name === "x") return String(bounds.x)
    if (name === "y") return String(bounds.y)
    if (name === "width") return String(bounds.width)
    if (name === "height") return String(bounds.height)
    return null
  },
  getBBox() {
    return bounds
  }
})

const createLineElement = (line: {
  x1: number
  y1: number
  x2: number
  y2: number
  strokeWidth?: number
}): FakeSvgElement => ({
  getAttribute(name: string) {
    if (name === "x1") return String(line.x1)
    if (name === "y1") return String(line.y1)
    if (name === "x2") return String(line.x2)
    if (name === "y2") return String(line.y2)
    if (name === "stroke-width") return String(line.strokeWidth ?? 0.3)
    return null
  },
  getBBox() {
    return {
      x: Math.min(line.x1, line.x2),
      y: Math.min(line.y1, line.y2),
      width: Math.abs(line.x2 - line.x1),
      height: Math.abs(line.y2 - line.y1)
    }
  }
})

const createFakeSvg = (input: {
  cutterBounds: { x: number; y: number; width: number; height: number }
  safeZones?: Array<{ x: number; y: number; width: number; height: number }>
  sealZones?: Array<{ x: number; y: number; width: number; height: number }>
  foldLines?: Array<{ x1: number; y1: number; x2: number; y2: number; strokeWidth?: number }>
  eyemarkTrack?: Array<{ x: number; y: number; width: number; height: number }>
}): SVGSVGElement => {
  const cutter = createRectElement(input.cutterBounds)
  const selectorMap = new Map<string, FakeSvgElement[]>([
    ["#safe_zones [data-role='safe-zone-outline']", (input.safeZones ?? []).map(createRectElement)],
    ["#seal_areas [data-role='seal-rect']", (input.sealZones ?? []).map(createRectElement)],
    ["#fold_lines [data-role='fold-line']", (input.foldLines ?? []).map(createLineElement)],
    ["#eyemark_track [data-role='eye-mark']", (input.eyemarkTrack ?? []).map(createRectElement)]
  ])

  const fakeSvg: FakeSvg = {
    querySelector(selector: string) {
      if (selector === "#cut_line" || selector === "#cut_lines" || selector === "#cutter_outline") {
        return cutter
      }
      return selectorMap.get(selector)?.[0] ?? null
    },
    querySelectorAll(selector: string) {
      return selectorMap.get(selector) ?? []
    }
  }

  return fakeSvg as unknown as SVGSVGElement
}

const createArtworkItem = (overrides: Partial<ArtworkItem> = {}): ArtworkItem => ({
  id: "artwork-1",
  uploadType: "badge",
  filename: "badge.png",
  mimeType: "image/png",
  sourceDataUrl: "data:image/png;base64,AAA",
  baseWidthMm: 10,
  baseHeightMm: 10,
  category: "Critical",
  canEnterSafeZone: false,
  canEnterSealZoneWhenFlood: false,
  canEnterEyemarkTrack: false,
  orientation: "landscape",
  rotation: 0,
  flipped: false,
  flipMode: null,
  x: 50,
  y: 50,
  scale: 1,
  opacity: 1,
  locked: false,
  visible: true,
  initialX: 50,
  initialY: 50,
  initialScale: 1,
  createdAt: new Date().toISOString(),
  ...overrides
})

const createCollection = (item: ArtworkItem): ArtworkCollection => ({
  items: [item],
  selectedId: item.id
})

const createRules = (overrides: Partial<PrintRules> = {}): PrintRules => ({
  floodPrint: false,
  printInSeals: false,
  keepEyemarkTrackClear: true,
  safeZoneMode: "use-cutter-safe-zones",
  cutterOrientation: "landscape",
  printDirectionMode: "maintain-md-td",
  slitAllowanceEnabled: false,
  slitAllowanceMm: 0,
  slitAllowanceAxis: "TD",
  slitAllowanceReason: "manual",
  ...overrides
})

const hasWarning = (report: ReturnType<typeof buildArtworkPreflightReport>, title: string) =>
  report.warnings.some(warning => !warning.ignored && warning.title === title)

const activeProblemOverlayCount = (report: ReturnType<typeof buildArtworkPreflightReport>) =>
  report.overlays.filter(overlay => overlay.kind === "problem").length

const cutterBounds = { x: 0, y: 0, width: 100, height: 100 }
const safeZoneBounds = [{ x: 20, y: 20, width: 60, height: 60 }]
const sealZones = [
  { x: 0, y: 0, width: 100, height: 10 },
  { x: 0, y: 90, width: 100, height: 10 },
  { x: 0, y: 0, width: 10, height: 100 },
  { x: 90, y: 0, width: 10, height: 100 }
]
const foldLines = [{ x1: 50, y1: 0, x2: 50, y2: 100, strokeWidth: 0.3 }]

const safeZoneSvg = createFakeSvg({
  cutterBounds,
  safeZones: safeZoneBounds,
  sealZones,
  foldLines
})

const outsideSafeZone = createArtworkItem({ x: 12, y: 12 })
const outsideReport = buildArtworkPreflightReport(
  createCollection(outsideSafeZone),
  safeZoneSvg,
  createRules(),
  new Set()
)
assert(
  hasWarning(outsideReport, "Critical artwork outside safe zone."),
  "Expected safe-zone warning when critical artwork is outside the active safe zone."
)

const insideSafeZone = createArtworkItem({ x: 50, y: 50 })
const insideReport = buildArtworkPreflightReport(
  createCollection(insideSafeZone),
  safeZoneSvg,
  createRules(),
  new Set()
)
assert(
  !hasWarning(insideReport, "Critical artwork outside safe zone."),
  "Expected safe-zone warning to clear when artwork moves fully inside the safe zone."
)
assert(
  activeProblemOverlayCount(insideReport) === 1,
  `Expected no artwork problem overlays for the inside-safe-zone case except fold guides, got ${activeProblemOverlayCount(insideReport)}.`
)

const fallbackSvg = createFakeSvg({
  cutterBounds,
  sealZones,
  foldLines
})

const centralFallback = createArtworkItem({ x: 25, y: 25 })
const centralFallbackReport = buildArtworkPreflightReport(
  createCollection(centralFallback),
  fallbackSvg,
  createRules({ safeZoneMode: "fallback-distance" }),
  new Set()
)
assert(
  !hasWarning(centralFallbackReport, "Critical artwork outside safe zone."),
  "Expected no safe-zone warning when safe zones are inactive."
)
assert(
  !hasWarning(centralFallbackReport, "Critical artwork too close to seal zone."),
  "Expected no fallback seal warning for artwork in the central usable area."
)
assert(
  !hasWarning(centralFallbackReport, "Critical artwork too close to fold line."),
  "Expected no fallback fold warning for artwork away from the fold line."
)

const nearSealFallback = createArtworkItem({ x: 20, y: 16 })
const nearSealReport = buildArtworkPreflightReport(
  createCollection(nearSealFallback),
  fallbackSvg,
  createRules({ safeZoneMode: "fallback-distance" }),
  new Set()
)
assert(
  hasWarning(nearSealReport, "Critical artwork too close to seal zone."),
  "Expected fallback seal warning when artwork is within 5mm of the seal inner edge."
)

const nearFoldFallback = createArtworkItem({ x: 46, y: 50 })
const nearFoldReport = buildArtworkPreflightReport(
  createCollection(nearFoldFallback),
  fallbackSvg,
  createRules({ safeZoneMode: "fallback-distance" }),
  new Set()
)
assert(
  hasWarning(nearFoldReport, "Critical artwork too close to fold line."),
  "Expected fallback fold warning when artwork is within 3mm of the fold line."
)

const tdEyemarkSvg = createFakeSvg({
  cutterBounds,
  sealZones,
  foldLines,
  eyemarkTrack: [
    { x: 0.5, y: 20, width: 10, height: 5 },
    { x: 89.8, y: 20, width: 8.9, height: 5 }
  ]
})

const tdEyemarkReport = buildArtworkPreflightReport(
  createCollection(insideSafeZone),
  tdEyemarkSvg,
  createRules({ floodPrint: true }),
  new Set()
)
const tdEyemarkWarnings = tdEyemarkReport.warnings.filter(
  warning => warning.title === "TD eyemark clearance warning."
)
assert(tdEyemarkWarnings.length === 1, `Expected 1 grouped TD eyemark warning, got ${tdEyemarkWarnings.length}.`)

const groupedWarning = tdEyemarkWarnings[0]
assert(groupedWarning?.isGrouped === true, "Expected TD warning to be grouped when both eyemarks are affected.")
assert(groupedWarning?.itemLabel === "Eyemarks 1 & 2", `Expected grouped eyemark label, got ${groupedWarning?.itemLabel}.`)
assert(
  groupedWarning?.recommendedWidthIncreaseMm === 3,
  `Expected grouped width recommendation to be 3mm, got ${groupedWarning?.recommendedWidthIncreaseMm}.`
)
assert(groupedWarning?.affectedEyemarks?.length === 2, `Expected 2 affected eyemark entries, got ${groupedWarning?.affectedEyemarks?.length}.`)

const leftWarning = groupedWarning?.affectedEyemarks?.find(warning => warning.eyemarkIndex === 0)
assert(Boolean(leftWarning), "Expected grouped TD warning entry for eyemark 1.")
assert(leftWarning?.eyemarkId === "eyemark-1", `Expected eyemark-1 id, got ${leftWarning?.eyemarkId}.`)
assert(leftWarning?.affectedSide === "left", `Expected left side warning, got ${leftWarning?.affectedSide}.`)
assertClose(leftWarning?.currentTdClearanceMm, 0.5, "Expected left eyemark TD clearance to match.")
assertClose(leftWarning?.requiredTdClearanceMm, 1.5, "Expected required TD clearance to match.")

const rightWarning = groupedWarning?.affectedEyemarks?.find(warning => warning.eyemarkIndex === 1)
assert(Boolean(rightWarning), "Expected grouped TD warning entry for eyemark 2.")
assert(rightWarning?.eyemarkId === "eyemark-2", `Expected eyemark-2 id, got ${rightWarning?.eyemarkId}.`)
assert(rightWarning?.affectedSide === "right", `Expected right side warning, got ${rightWarning?.affectedSide}.`)
assertClose(rightWarning?.currentTdClearanceMm, 1.3, "Expected right eyemark TD clearance to match.")
assertClose(rightWarning?.requiredTdClearanceMm, 1.5, "Expected required TD clearance to match.")

const leftOnlyTdEyemarkSvg = createFakeSvg({
  cutterBounds,
  sealZones,
  foldLines,
  eyemarkTrack: [
    { x: 0.5, y: 20, width: 10, height: 5 },
    { x: 80, y: 20, width: 8.5, height: 5 }
  ]
})
const leftOnlyTdEyemarkReport = buildArtworkPreflightReport(
  createCollection(insideSafeZone),
  leftOnlyTdEyemarkSvg,
  createRules({ floodPrint: true }),
  new Set()
)
const leftOnlyWarning = leftOnlyTdEyemarkReport.warnings.find(
  warning => warning.title === "TD eyemark clearance warning."
)
assert(Boolean(leftOnlyWarning), "Expected a single TD warning when only eyemark 1 is affected.")
assert(leftOnlyWarning?.isGrouped !== true, "Expected single-eyemark warning to remain ungrouped.")
assert(leftOnlyWarning?.itemLabel === "Eyemark 1", `Expected Eyemark 1 label, got ${leftOnlyWarning?.itemLabel}.`)
assert(leftOnlyWarning?.recommendedWidthIncreaseMm === 2, `Expected single warning width recommendation to be 2mm, got ${leftOnlyWarning?.recommendedWidthIncreaseMm}.`)

const rightOnlyTdEyemarkSvg = createFakeSvg({
  cutterBounds,
  sealZones,
  foldLines,
  eyemarkTrack: [
    { x: 10, y: 20, width: 10, height: 5 },
    { x: 89.8, y: 20, width: 8.9, height: 5 }
  ]
})
const rightOnlyTdEyemarkReport = buildArtworkPreflightReport(
  createCollection(insideSafeZone),
  rightOnlyTdEyemarkSvg,
  createRules({ floodPrint: true }),
  new Set()
)
const rightOnlyWarning = rightOnlyTdEyemarkReport.warnings.find(
  warning => warning.title === "TD eyemark clearance warning."
)
assert(Boolean(rightOnlyWarning), "Expected a single TD warning when only eyemark 2 is affected.")
assert(rightOnlyWarning?.isGrouped !== true, "Expected single-eyemark warning to remain ungrouped.")
assert(rightOnlyWarning?.itemLabel === "Eyemark 2", `Expected Eyemark 2 label, got ${rightOnlyWarning?.itemLabel}.`)
assert(rightOnlyWarning?.recommendedWidthIncreaseMm === 2, `Expected single warning width recommendation to be 2mm, got ${rightOnlyWarning?.recommendedWidthIncreaseMm}.`)

console.log("Artwork preflight regression checks passed.")
