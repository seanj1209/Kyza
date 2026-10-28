import type { PrintRules } from "../config/activeCutterState"
import type { ArtworkBounds, ArtworkCollection, ArtworkItem } from "./artworkTypes"
import type {
  ArtworkMdTdEdges,
  ArtworkPreflightSeverity,
  ArtworkPreflightWarning,
  ArtworkRuleAxis,
  ArtworkTdEdgeSide,
  ArtworkZoneOverlay
} from "./artworkRules.types"
import {
  getArtworkBounds,
  getCutterBounds,
} from "./artworkRenderer"
import {
  applySlitAllowanceState,
  getMdTdEdges,
  getSlitAllowanceZone
} from "./mdTd.helpers"
import { buildArtworkLabel } from "./artworkMedia"
import { pointInConvexContour } from "../../../../packages/cutter-engine/actions/safeZoneContours"

const TD_EYEMARK_EDGE_THRESHOLD_MM = 1.5
const isDevEnvironment = Boolean(import.meta.env?.DEV)

const parseNumberAttr = (element: Element | null, attribute: string, fallback: number) => {
  const raw = Number(element?.getAttribute(attribute))
  return Number.isFinite(raw) ? raw : fallback
}

const readLineBounds = (element: Element): ArtworkBounds | null => {
  const x1 = parseNumberAttr(element, "x1", Number.NaN)
  const y1 = parseNumberAttr(element, "y1", Number.NaN)
  const x2 = parseNumberAttr(element, "x2", Number.NaN)
  const y2 = parseNumberAttr(element, "y2", Number.NaN)
  if (![x1, y1, x2, y2].every(value => Number.isFinite(value))) {
    return null
  }

  const strokeWidth = Math.max(0.3, parseNumberAttr(element, "stroke-width", 0.3))
  const halfStroke = strokeWidth / 2
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)
  const minY = Math.min(y1, y2)
  const maxY = Math.max(y1, y2)

  if (minX === maxX) {
    return {
      x: minX - halfStroke,
      y: minY,
      width: strokeWidth,
      height: Math.max(strokeWidth, maxY - minY)
    }
  }

  if (minY === maxY) {
    return {
      x: minX,
      y: minY - halfStroke,
      width: Math.max(strokeWidth, maxX - minX),
      height: strokeWidth
    }
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(strokeWidth, maxX - minX),
    height: Math.max(strokeWidth, maxY - minY)
  }
}

const readBounds = (element: Element | null): ArtworkBounds | null => {
  if (!element) {
    return null
  }
  try {
    const bbox = (element as SVGGraphicsElement).getBBox?.()
    if (bbox && (bbox.width > 0 || bbox.height > 0)) {
      const strokeWidth = Math.max(0.3, parseNumberAttr(element, "stroke-width", 0.3))
      return {
        x: bbox.width > 0 ? bbox.x : bbox.x - strokeWidth / 2,
        y: bbox.height > 0 ? bbox.y : bbox.y - strokeWidth / 2,
        width: Math.max(strokeWidth, bbox.width),
        height: Math.max(strokeWidth, bbox.height)
      }
    }
  } catch {
    // Fall back to rect-like attributes below.
  }

  const lineBounds = readLineBounds(element)
  if (lineBounds) {
    return lineBounds
  }

  const width = parseNumberAttr(element, "width", 0)
  const height = parseNumberAttr(element, "height", 0)
  if (!(width > 0) || !(height > 0)) {
    return null
  }
  return {
    x: parseNumberAttr(element, "x", 0),
    y: parseNumberAttr(element, "y", 0),
    width,
    height
  }
}

type SafeBounds = ArtworkBounds & { contour?: {x:number;y:number}[] }
const containsBounds = (outer: SafeBounds, inner: ArtworkBounds) => outer.contour
  ? [{x:inner.x,y:inner.y},{x:inner.x+inner.width,y:inner.y},{x:inner.x+inner.width,y:inner.y+inner.height},{x:inner.x,y:inner.y+inner.height}].every(p=>pointInConvexContour(p,outer.contour!))
  :
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.width <= outer.x + outer.width &&
  inner.y + inner.height <= outer.y + outer.height

const intersectBounds = (a: ArtworkBounds, b: ArtworkBounds) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

const gapBetweenBounds = (a: ArtworkBounds, b: ArtworkBounds) => {
  const horizontalGap =
    a.x + a.width < b.x
      ? b.x - (a.x + a.width)
      : b.x + b.width < a.x
        ? a.x - (b.x + b.width)
        : 0
  const verticalGap =
    a.y + a.height < b.y
      ? b.y - (a.y + a.height)
      : b.y + b.height < a.y
        ? a.y - (b.y + b.height)
        : 0
  return Math.max(horizontalGap, verticalGap)
}

const getSealInnerEdgeDistances = (
  artworkBounds: ArtworkBounds,
  cutterBounds: ArtworkBounds,
  sealZones: ArtworkBounds[]
) => {
  const cutterCenterX = cutterBounds.x + cutterBounds.width / 2
  const cutterCenterY = cutterBounds.y + cutterBounds.height / 2
  const topInner = sealZones
    .filter(zone => zone.y + zone.height <= cutterCenterY)
    .reduce((max, zone) => Math.max(max, zone.y + zone.height), cutterBounds.y)
  const bottomInner = sealZones
    .filter(zone => zone.y >= cutterCenterY)
    .reduce((min, zone) => Math.min(min, zone.y), cutterBounds.y + cutterBounds.height)
  const leftInner = sealZones
    .filter(zone => zone.x + zone.width <= cutterCenterX)
    .reduce((max, zone) => Math.max(max, zone.x + zone.width), cutterBounds.x)
  const rightInner = sealZones
    .filter(zone => zone.x >= cutterCenterX)
    .reduce((min, zone) => Math.min(min, zone.x), cutterBounds.x + cutterBounds.width)

  return {
    top: artworkBounds.y - topInner,
    bottom: bottomInner - (artworkBounds.y + artworkBounds.height),
    left: artworkBounds.x - leftInner,
    right: rightInner - (artworkBounds.x + artworkBounds.width)
  }
}

const getNearestFoldDistance = (
  artworkBounds: ArtworkBounds,
  foldLines: ArtworkBounds[]
) =>
  foldLines.length
    ? Math.min(...foldLines.map(line => gapBetweenBounds(line, artworkBounds)))
    : null

const collectBounds = (svg: SVGSVGElement, selector: string) =>
  Array.from(svg.querySelectorAll<SVGElement>(selector))
    .map(readBounds)
    .filter((bounds): bounds is ArtworkBounds => Boolean(bounds))

const roundWarningValue = (value: number) => Math.round(value * 10)

const serializeBounds = (bounds: ArtworkBounds) =>
  [
    roundWarningValue(bounds.x),
    roundWarningValue(bounds.y),
    roundWarningValue(bounds.width),
    roundWarningValue(bounds.height)
  ].join(",")

const serializeBoundsList = (boundsList: ArtworkBounds[]) =>
  boundsList.length ? boundsList.map(serializeBounds).join("|") : "none"

const buildWarningId = (
  ruleType: string,
  itemId: string | null,
  itemBounds: ArtworkBounds[],
  context: Array<string | number | boolean>
) =>
  [
    ruleType,
    itemId ?? "global",
    serializeBoundsList(itemBounds),
    ...context.map(value => String(value))
  ].join(":")

export const getSafeZoneBounds = (svg: SVGSVGElement): SafeBounds[] =>
  Array.from(svg.querySelectorAll<SVGGraphicsElement>("#safe_zones [data-role='safe-zone-outline']")).flatMap(outline=>{
    const bounds=readBounds(outline)
    if(!bounds)return []
    const id=outline.getAttribute('data-zone-id')
    const shape=Array.from(outline.parentElement?.querySelectorAll<SVGPathElement>('[data-fit-outline="true"]')??[]).find(n=>n.getAttribute('data-zone-id')===id)
    if(!shape)return [bounds]
    const numbers=(shape.getAttribute('d')??'').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)?.map(Number)??[]
    const matrix=shape.getCTM(),root=svg.getCTM(),transform=matrix&&root?root.inverse().multiply(matrix):null
    const contour=[]
    for(let i=0;i<numbers.length;i+=2){const p=new DOMPoint(numbers[i],numbers[i+1]);contour.push(transform?p.matrixTransform(transform):p)}
    return [{...bounds,contour}]
  })

export const getSealZoneBounds = (svg: SVGSVGElement) =>
  collectBounds(svg, "#seal_areas [data-role='seal-rect']")

export const getFoldLineGeometry = (svg: SVGSVGElement) =>
  collectBounds(svg, "#fold_lines [data-role='fold-line']")

export const getEyemarkTrackBounds = (svg: SVGSVGElement) =>
  collectBounds(svg, "#eyemark_track [data-role='eye-mark']")

export const checkSafeZoneViolation = (
  artwork: ArtworkItem,
  safeZones: ArtworkBounds[]
) => {
  const artworkBounds = getArtworkBounds(artwork)
  if (!safeZones.length || artwork.canEnterSafeZone) {
    return null
  }
  const insideSafeZone = safeZones.some(zone => containsBounds(zone, artworkBounds))
  if (insideSafeZone) {
    return null
  }
  return {
    title: "Critical artwork outside safe zone.",
    message: "Keep critical artwork inside the safe zone.",
    axis: "Safe" as ArtworkRuleAxis,
    severity: "critical" as ArtworkPreflightSeverity,
    zone: "Safe zone",
    bounds: [artworkBounds]
  }
}

export const checkSealZoneViolation = (
  artwork: ArtworkItem,
  sealZones: ArtworkBounds[],
  floodPrint: boolean
) => {
  const artworkBounds = getArtworkBounds(artwork)
  if (!sealZones.length) {
    return null
  }
  const intersectsSeal = sealZones.some(zone => intersectBounds(zone, artworkBounds))
  const tooCloseToSeal = sealZones.some(zone => gapBetweenBounds(zone, artworkBounds) < 5)

  if (!floodPrint && intersectsSeal) {
    return {
      title: "Artwork enters seal zone.",
      message: "Seal zones remain restricted while Flood Print is off.",
      axis: "Seal" as ArtworkRuleAxis,
      severity: "warning" as ArtworkPreflightSeverity,
      zone: "Seal zone",
      bounds: [artworkBounds]
    }
  }

  if (!artwork.canEnterSealZoneWhenFlood && (intersectsSeal || tooCloseToSeal)) {
    return {
      title: "Critical artwork too close to seal zone.",
      message: "Critical artwork must stay 5mm away from the seal edge.",
      axis: "Seal" as ArtworkRuleAxis,
      severity: "critical" as ArtworkPreflightSeverity,
      zone: "Seal zone",
      bounds: [artworkBounds]
    }
  }

  return null
}

export const checkFoldLineDistance = (
  artwork: ArtworkItem,
  foldLines: ArtworkBounds[]
) => {
  const artworkBounds = getArtworkBounds(artwork)
  if (!foldLines.length || artwork.category !== "Critical") {
    return null
  }
  const tooClose = foldLines.some(line => gapBetweenBounds(line, artworkBounds) < 3)
  if (!tooClose) {
    return null
  }
  return {
    title: "Critical artwork too close to fold line.",
    message: "Critical artwork must stay 3mm away from fold lines when no safe zone exists.",
    axis: "MD" as ArtworkRuleAxis,
    severity: "warning" as ArtworkPreflightSeverity,
    zone: "Fold line",
    bounds: [artworkBounds]
  }
}

const checkCriticalSealFallback = (
  artwork: ArtworkItem,
  sealZones: ArtworkBounds[]
) => {
  const artworkBounds = getArtworkBounds(artwork)
  if (!sealZones.length || artwork.category !== "Critical") {
    return null
  }
  const intersectsSeal = sealZones.some(zone => intersectBounds(zone, artworkBounds))
  const tooCloseToSeal = sealZones.some(zone => gapBetweenBounds(zone, artworkBounds) < 5)
  if (!intersectsSeal && !tooCloseToSeal) {
    return null
  }
  return {
    title: "Critical artwork too close to seal zone.",
    message: "Critical artwork must stay 5mm away from the seal edge.",
    axis: "Seal" as ArtworkRuleAxis,
    severity: "critical" as ArtworkPreflightSeverity,
    zone: "Seal zone",
    bounds: [artworkBounds]
  }
}

export const checkEyemarkTrackOverlap = (
  artwork: ArtworkItem,
  eyemarkTrack: ArtworkBounds[],
  floodPrint: boolean
) => {
  const artworkBounds = getArtworkBounds(artwork)
  if (!eyemarkTrack.length) {
    return null
  }
  const overlapsTrack = eyemarkTrack.some(track => intersectBounds(track, artworkBounds))
  if (!overlapsTrack) {
    return null
  }
  if (!floodPrint) {
    return {
      title: "Artwork overlaps eyemark track.",
      message: "Eyemark track stays clear while Flood Print is off.",
      axis: "Eyemark" as ArtworkRuleAxis,
      severity: "warning" as ArtworkPreflightSeverity,
      zone: "Eyemark track",
      bounds: [artworkBounds]
    }
  }
  if (artwork.uploadType === "image" && artwork.category === "Background") {
    return {
      title: "Background image in eyemark track must be solid flood only.",
      message: "Imported background images should not sit inside the eyemark track.",
      axis: "Eyemark" as ArtworkRuleAxis,
      severity: "warning" as ArtworkPreflightSeverity,
      zone: "Eyemark track",
      bounds: [artworkBounds]
    }
  }
  if (!artwork.canEnterEyemarkTrack) {
    return {
      title: "Critical artwork overlaps eyemark track.",
      message: "Critical artwork must stay out of the eyemark track.",
      axis: "Eyemark" as ArtworkRuleAxis,
      severity: "critical" as ArtworkPreflightSeverity,
      zone: "Eyemark track",
      bounds: [artworkBounds]
    }
  }
  return null
}

export const checkFullWidthFloodTD = (
  artwork: ArtworkItem,
  cutterBounds: ArtworkBounds,
  mdTdEdges: ArtworkMdTdEdges,
  floodPrint: boolean,
  eyemarkTrack: ArtworkBounds[]
) => {
  const artworkBounds = getArtworkBounds(artwork)
  if (!floodPrint || artwork.category !== "Background") {
    return null
  }

  const reachesStartEdge =
    artworkBounds.x <= cutterBounds.x + 0.5 ||
    intersectBounds(mdTdEdges.tdEdges.left, artworkBounds)
  const reachesEndEdge =
    artworkBounds.x + artworkBounds.width >= cutterBounds.x + cutterBounds.width - 0.5 ||
    intersectBounds(mdTdEdges.tdEdges.right, artworkBounds)
  const reachesEyemark = eyemarkTrack.some(track => intersectBounds(track, artworkBounds))

  if (!reachesEyemark && (!reachesStartEdge || !reachesEndEdge)) {
    return null
  }

  if (reachesEyemark || (reachesStartEdge && reachesEndEdge)) {
    return {
      title: "Full-width flood detected across the TD/slit direction.",
      message:
        "Add a slit allowance to protect against slitting movement and stop eyemark/track print carrying onto the next slit reel.",
      axis: "TD" as ArtworkRuleAxis,
      severity: "warning" as ArtworkPreflightSeverity,
      zone: "Slit allowance",
      bounds: [artworkBounds],
      isPrompt: true
    }
  }

  return null
}

const isPortraitTdMapping = (mdTdEdges: ArtworkMdTdEdges) =>
  mdTdEdges.cutterOrientation === "portrait" ||
  mdTdEdges.printDirectionMode === "display-orientation"

const getTdEdgeMetrics = (mdTdEdges: ArtworkMdTdEdges) => {
  const portraitMapping = isPortraitTdMapping(mdTdEdges)
  return {
    portraitMapping,
    tdStartEdge: portraitMapping
      ? mdTdEdges.tdEdges.left.y
      : mdTdEdges.tdEdges.left.x,
    tdEndEdge: portraitMapping
      ? mdTdEdges.tdEdges.right.y + mdTdEdges.tdEdges.right.height
      : mdTdEdges.tdEdges.right.x + mdTdEdges.tdEdges.right.width
  }
}

const buildTdEyemarkFloodWarning = (
  eyemarkBounds: ArtworkBounds,
  index: number,
  eyemarkCount: number,
  mdTdEdges: ArtworkMdTdEdges,
  floodPrint: boolean
) => {
  const { portraitMapping, tdStartEdge, tdEndEdge } = getTdEdgeMetrics(mdTdEdges)
  const eyemarkStart = portraitMapping ? eyemarkBounds.y : eyemarkBounds.x
  const eyemarkEnd = portraitMapping
    ? eyemarkBounds.y + eyemarkBounds.height
    : eyemarkBounds.x + eyemarkBounds.width
  const leftDistance = eyemarkStart - tdStartEdge
  const rightDistance = tdEndEdge - eyemarkEnd
  const shouldWarn =
    floodPrint &&
    (leftDistance < TD_EYEMARK_EDGE_THRESHOLD_MM ||
      rightDistance < TD_EYEMARK_EDGE_THRESHOLD_MM)

  if (isDevEnvironment) {
    console.log("[Artwork Studio][TD Eyemark Warning]", {
      floodPrintEnabled: floodPrint,
      eyemarkCount,
      eyemarkIndex: index,
      eyemarkBounds,
      tdLeftEdge: mdTdEdges.tdEdges.left,
      tdRightEdge: mdTdEdges.tdEdges.right,
      leftDistanceMm: leftDistance,
      rightDistanceMm: rightDistance,
      thresholdMm: TD_EYEMARK_EDGE_THRESHOLD_MM,
      shouldWarn
    })
  }

  if (!shouldWarn) {
    return null
  }

  const affectedSide: ArtworkTdEdgeSide =
    leftDistance < TD_EYEMARK_EDGE_THRESHOLD_MM && rightDistance < TD_EYEMARK_EDGE_THRESHOLD_MM
      ? leftDistance <= rightDistance
        ? "left"
        : "right"
      : leftDistance < TD_EYEMARK_EDGE_THRESHOLD_MM
        ? "left"
        : "right"
  const currentTdClearanceMm =
    affectedSide === "left"
      ? leftDistance
      : rightDistance

  const warningId = [
    "td-eyemark",
    index,
    Math.round(eyemarkBounds.x * 10),
    Math.round(eyemarkBounds.y * 10),
    Math.round(eyemarkBounds.width * 10),
    Math.round(eyemarkBounds.height * 10),
    Math.round(leftDistance * 10),
    Math.round(rightDistance * 10),
    floodPrint ? "flood-on" : "flood-off",
    mdTdEdges.cutterOrientation,
    mdTdEdges.printDirectionMode
  ].join(":")

  const warning: ArtworkPreflightWarning = {
    id: warningId,
    itemId: null,
    itemLabel: `Eyemark ${index + 1}`,
    title: "TD eyemark clearance warning.",
    message:
      "Eyemark is closer than 1.5mm to the TD/slit edge while Flood Print is enabled. Configure slit allowance to protect against slitting movement and stop eyemark/track print carrying onto the next slit reel.",
    severity: "warning",
    axis: "TD",
    zone: "TD/slit edge",
    bounds: [eyemarkBounds],
    canIgnore: true,
    ignored: false,
    isPrompt: true,
    affectedEyemarkId: `eyemark-${index + 1}`,
    affectedEyemarkIndex: index,
    affectedSide,
    currentTdClearanceMm,
    requiredTdClearanceMm: TD_EYEMARK_EDGE_THRESHOLD_MM,
    affectedEyemarks: [
      {
        eyemarkId: `eyemark-${index + 1}`,
        eyemarkIndex: index,
        affectedSide,
        currentTdClearanceMm,
        requiredTdClearanceMm: TD_EYEMARK_EDGE_THRESHOLD_MM
      }
    ],
    isGrouped: false,
    eyemarkCount,
    recommendedWidthIncreaseMm: 2
  }

  const overlay: ArtworkZoneOverlay = {
    id: `problem-td-eyemark-${index}`,
    kind: "problem",
    label: warning.title,
    note: warning.message,
    bounds: eyemarkBounds,
    severity: warning.severity,
    axis: warning.axis
  }

  return { warning, overlay }
}

const groupTdEyemarkWarnings = (
  warningEntries: Array<{ warning: ArtworkPreflightWarning; overlay: ArtworkZoneOverlay }>
) => {
  if (warningEntries.length !== 2) {
    return warningEntries.map(entry => entry.warning)
  }

  const sortedEntries = [...warningEntries].sort((left, right) => {
    const leftIndex = left.warning.affectedEyemarkIndex ?? Number.MAX_SAFE_INTEGER
    const rightIndex = right.warning.affectedEyemarkIndex ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })

  const affectedEyemarks = sortedEntries
    .flatMap(entry => entry.warning.affectedEyemarks ?? [])
    .sort((left, right) => left.eyemarkIndex - right.eyemarkIndex)

  if (
    affectedEyemarks.length !== 2 ||
    affectedEyemarks[0]?.eyemarkIndex !== 0 ||
    affectedEyemarks[1]?.eyemarkIndex !== 1
  ) {
    return warningEntries.map(entry => entry.warning)
  }

  const groupedWarning: ArtworkPreflightWarning = {
    id: [
      "td-eyemark-group",
      ...sortedEntries.map(entry => entry.warning.id)
    ].join(":"),
    itemId: null,
    itemLabel: "Eyemarks 1 & 2",
    title: "TD eyemark clearance warning.",
    message:
      "Eyemarks are closer than 1.5mm to the TD/slit edges while Flood Print is enabled. Configure slit allowance to protect against slitting movement and stop eyemark/track print carrying onto the next slit reel.",
    severity: "warning",
    axis: "TD",
    zone: "TD/slit edge",
    bounds: sortedEntries.map(entry => entry.warning.bounds[0]).filter(Boolean),
    canIgnore: true,
    ignored: false,
    isPrompt: true,
    affectedEyemarks,
    isGrouped: true,
    eyemarkCount: 2,
    recommendedWidthIncreaseMm: 3
  }

  return [groupedWarning]
}

export const buildArtworkPreflightReport = (
  collection: ArtworkCollection,
  svg: SVGSVGElement | null,
  rules: PrintRules,
  ignoredIds: ReadonlySet<string>
) => {
  const safeZones = svg ? getSafeZoneBounds(svg) : []
  const sealZones = svg ? getSealZoneBounds(svg) : []
  const foldLines = svg ? getFoldLineGeometry(svg) : []
  const eyemarkTrack = svg ? getEyemarkTrackBounds(svg) : []
  const cutterBounds = svg ? getCutterBounds(svg) : {
    x: 0,
    y: 0,
    width: 1,
    height: 1
  }
  const mdTdEdges = getMdTdEdges(cutterBounds, {
    cutterOrientation: rules.cutterOrientation,
    printDirectionMode: rules.printDirectionMode
  })
  const safeZoneChecksEnabled =
    rules.safeZoneMode === "use-cutter-safe-zones" && safeZones.length > 0

  const warnings: ArtworkPreflightWarning[] = []
  const overlays: ArtworkZoneOverlay[] = []

  safeZones.forEach((bounds, index) => {
    overlays.push({
      id: `safe-zone-${index}`,
      kind: "safe-zone",
      label: "Safe zone",
      note: "Safe / low-noise guidance area.",
      bounds,
      axis: "Safe"
    })
  })

  sealZones.forEach((bounds, index) => {
    overlays.push({
      id: `seal-zone-${index}`,
      kind: "seal-zone",
      label: "Seal zone",
      note: "Seal / bond band.",
      bounds,
      axis: "Seal"
    })
  })

  foldLines.forEach((bounds, index) => {
    overlays.push({
      id: `fold-line-${index}`,
      kind: "problem",
      label: "Fold line",
      note: "Fold-line guide.",
      bounds,
      axis: "MD"
    })
  })

  eyemarkTrack.forEach((bounds, index) => {
    overlays.push({
      id: `eyemark-track-${index}`,
      kind: "eyemark-track",
      label: "Eyemark track",
      note: "Registration-track band.",
      bounds,
      axis: "Eyemark"
    })
  })

  const slitAllowanceBands = getSlitAllowanceZone(cutterBounds, mdTdEdges, rules.slitAllowanceMm)
  slitAllowanceBands.forEach((bounds, index) => {
    overlays.push({
      id: `slit-allowance-${index}`,
      kind: "slit-allowance",
      label: "Slit allowance",
      note: `${rules.slitAllowanceMm}mm TD slit guard.`,
      bounds,
      axis: "TD"
    })
  })

  // MD eyemark edge warnings intentionally disabled for MVP. This will be handled later
  // with plate gap / repeat edge configuration.
  const tdEyemarkWarnings = eyemarkTrack.flatMap((bounds, index) => {
    const tdEyemarkWarning = buildTdEyemarkFloodWarning(
      bounds,
      index,
      eyemarkTrack.length,
      mdTdEdges,
      rules.floodPrint
    )
    return tdEyemarkWarning ? [tdEyemarkWarning] : []
  })

  tdEyemarkWarnings.forEach(({ overlay }) => {
    overlays.push(overlay)
  })

  groupTdEyemarkWarnings(tdEyemarkWarnings).forEach(warning => {
    warnings.push({
      ...warning,
      ignored: ignoredIds.has(warning.id)
    })
  })

  overlays.push({
    id: "md-edge-start",
    kind: "md-edge",
    label: "MD edge start",
    note: "Machine direction start edge.",
    bounds: mdTdEdges.mdEdges.start,
    axis: "MD"
  })
  overlays.push({
    id: "md-edge-end",
    kind: "md-edge",
    label: "MD edge end",
    note: "Machine direction end edge.",
    bounds: mdTdEdges.mdEdges.end,
    axis: "MD"
  })
  overlays.push({
    id: "td-edge-left",
    kind: "td-edge",
    label: "TD edge left",
    note: "Transverse direction left edge.",
    bounds: mdTdEdges.tdEdges.left,
    axis: "TD"
  })
  overlays.push({
    id: "td-edge-right",
    kind: "td-edge",
    label: "TD edge right",
    note: "Transverse direction right edge.",
    bounds: mdTdEdges.tdEdges.right,
    axis: "TD"
  })

  collection.items.forEach(item => {
    const itemBounds = getArtworkBounds(item)
    const itemLabel = buildArtworkLabel(item.uploadType, item.filename)
    const isInsideSafeZone =
      safeZoneChecksEnabled && safeZones.length > 0
        ? safeZones.some(zone => containsBounds(zone, itemBounds))
        : null
    const sealEdgeDistances = getSealInnerEdgeDistances(itemBounds, cutterBounds, sealZones)
    const nearestFoldDistance = getNearestFoldDistance(itemBounds, foldLines)
    const debugRuleResults = {
      safeZone: false,
      fallbackSeal: false,
      fold: false,
      seal: false,
      eyemark: false,
      slit: false
    }
    const debugWarningIds: string[] = []

    if (!item.visible) {
      const warningId = buildWarningId("hidden", item.id, [itemBounds], [])
      debugWarningIds.push(warningId)
      warnings.push({
        id: warningId,
        itemId: item.id,
        itemLabel,
        title: "Artwork hidden.",
        message: "This artwork is currently hidden.",
        severity: "info",
        axis: "Safe",
        zone: "Artwork",
        bounds: [itemBounds],
        canIgnore: true,
        ignored: ignoredIds.has(warningId)
      })
    }

    if (item.locked) {
      const warningId = buildWarningId("locked", item.id, [itemBounds], [])
      debugWarningIds.push(warningId)
      warnings.push({
        id: warningId,
        itemId: item.id,
        itemLabel,
        title: "Artwork locked.",
        message: "This artwork is locked and cannot be moved or resized.",
        severity: "info",
        axis: "Safe",
        zone: "Artwork",
        bounds: [itemBounds],
        canIgnore: true,
        ignored: ignoredIds.has(warningId)
      })
    }

    const safeZoneWarning = safeZoneChecksEnabled
      ? checkSafeZoneViolation(item, safeZones)
      : null
    if (safeZoneWarning) {
      const warningId = buildWarningId("safe", item.id, safeZoneWarning.bounds, [
        serializeBounds(cutterBounds),
        serializeBoundsList(safeZones),
        rules.safeZoneMode
      ])
      debugRuleResults.safeZone = true
      debugWarningIds.push(warningId)
      warnings.push({
        id: warningId,
        itemId: item.id,
        itemLabel,
        title: safeZoneWarning.title,
        message: safeZoneWarning.message,
        severity: safeZoneWarning.severity,
        axis: safeZoneWarning.axis,
        zone: safeZoneWarning.zone,
        bounds: safeZoneWarning.bounds,
        canIgnore: true,
        ignored: ignoredIds.has(warningId)
      })
      overlays.push({
        id: `problem-safe-${item.id}`,
        kind: "problem",
        label: safeZoneWarning.title,
        note: safeZoneWarning.message,
        bounds: itemBounds,
        severity: safeZoneWarning.severity,
        axis: safeZoneWarning.axis,
        targetId: item.id
      })
    }

    if (!safeZoneChecksEnabled && item.category === "Critical") {
      const sealFallback = checkCriticalSealFallback(item, sealZones)
      if (sealFallback) {
        const warningId = buildWarningId("fallback-seal", item.id, sealFallback.bounds, [
          serializeBounds(cutterBounds),
          serializeBoundsList(sealZones)
        ])
        debugRuleResults.fallbackSeal = true
        debugWarningIds.push(warningId)
        warnings.push({
          id: warningId,
          itemId: item.id,
          itemLabel,
          title: sealFallback.title,
          message: sealFallback.message,
          severity: sealFallback.severity,
          axis: sealFallback.axis,
          zone: sealFallback.zone,
          bounds: sealFallback.bounds,
          canIgnore: true,
          ignored: ignoredIds.has(warningId)
        })
        overlays.push({
          id: `problem-fallback-seal-${item.id}`,
          kind: "problem",
          label: sealFallback.title,
          note: sealFallback.message,
          bounds: itemBounds,
          severity: sealFallback.severity,
          axis: sealFallback.axis,
          targetId: item.id
        })
      }
      const foldWarning = checkFoldLineDistance(item, foldLines)
      if (foldWarning) {
        const warningId = buildWarningId("fold", item.id, foldWarning.bounds, [
          serializeBounds(cutterBounds),
          serializeBoundsList(foldLines)
        ])
        debugRuleResults.fold = true
        debugWarningIds.push(warningId)
        warnings.push({
          id: warningId,
          itemId: item.id,
          itemLabel,
          title: foldWarning.title,
          message: foldWarning.message,
          severity: foldWarning.severity,
          axis: foldWarning.axis,
          zone: foldWarning.zone,
          bounds: foldWarning.bounds,
          canIgnore: true,
          ignored: ignoredIds.has(warningId)
        })
        overlays.push({
          id: `problem-fold-${item.id}`,
          kind: "problem",
          label: foldWarning.title,
          note: foldWarning.message,
          bounds: itemBounds,
          severity: foldWarning.severity,
          axis: foldWarning.axis,
          targetId: item.id
        })
      }
    }

    const usesFallbackDistanceRules = !safeZoneChecksEnabled && item.category === "Critical"
    const sealWarning = usesFallbackDistanceRules
      ? null
      : checkSealZoneViolation(item, sealZones, rules.floodPrint)
    if (sealWarning) {
      const warningId = buildWarningId("seal", item.id, sealWarning.bounds, [
        serializeBounds(cutterBounds),
        serializeBoundsList(sealZones),
        rules.floodPrint
      ])
      debugRuleResults.seal = true
      debugWarningIds.push(warningId)
      warnings.push({
        id: warningId,
        itemId: item.id,
        itemLabel,
        title: sealWarning.title,
        message: sealWarning.message,
        severity: sealWarning.severity,
        axis: sealWarning.axis,
        zone: sealWarning.zone,
        bounds: sealWarning.bounds,
        canIgnore: true,
        ignored: ignoredIds.has(warningId)
      })
      overlays.push({
        id: `problem-seal-${item.id}`,
        kind: "problem",
        label: sealWarning.title,
        note: sealWarning.message,
        bounds: itemBounds,
        severity: sealWarning.severity,
        axis: sealWarning.axis,
        targetId: item.id
      })
    }

    const eyemarkWarning = checkEyemarkTrackOverlap(item, eyemarkTrack, rules.floodPrint)
    if (eyemarkWarning) {
      const warningId = buildWarningId("eyemark", item.id, eyemarkWarning.bounds, [
        serializeBounds(cutterBounds),
        serializeBoundsList(eyemarkTrack),
        rules.floodPrint
      ])
      debugRuleResults.eyemark = true
      debugWarningIds.push(warningId)
      warnings.push({
        id: warningId,
        itemId: item.id,
        itemLabel,
        title: eyemarkWarning.title,
        message: eyemarkWarning.message,
        severity: eyemarkWarning.severity,
        axis: eyemarkWarning.axis,
        zone: eyemarkWarning.zone,
        bounds: eyemarkWarning.bounds,
        canIgnore: true,
        ignored: ignoredIds.has(warningId)
      })
      overlays.push({
        id: `problem-eyemark-${item.id}`,
        kind: "problem",
        label: eyemarkWarning.title,
        note: eyemarkWarning.message,
        bounds: itemBounds,
        severity: eyemarkWarning.severity,
        axis: eyemarkWarning.axis,
        targetId: item.id
      })
    }

    const widthTouchesCutter = itemBounds.x <= cutterBounds.x + 0.5 &&
      itemBounds.x + itemBounds.width >= cutterBounds.x + cutterBounds.width - 0.5
    const slitAllowancePrompt =
      rules.slitAllowanceEnabled && rules.slitAllowanceMm > 0
        ? null
        : checkFullWidthFloodTD(
            item,
            cutterBounds,
            mdTdEdges,
            rules.floodPrint,
            eyemarkTrack
          )
    if (slitAllowancePrompt) {
      const warningId = buildWarningId("slit", item.id, slitAllowancePrompt.bounds, [
        serializeBounds(cutterBounds),
        rules.floodPrint,
        rules.slitAllowanceEnabled,
        rules.slitAllowanceMm
      ])
      debugRuleResults.slit = true
      debugWarningIds.push(warningId)
      warnings.push({
        id: warningId,
        itemId: item.id,
        itemLabel,
        title: slitAllowancePrompt.title,
        message: slitAllowancePrompt.message,
        severity: slitAllowancePrompt.severity,
        axis: slitAllowancePrompt.axis,
        zone: slitAllowancePrompt.zone,
        bounds: slitAllowancePrompt.bounds,
        canIgnore: true,
        ignored: ignoredIds.has(warningId),
        isPrompt: true
      })
      overlays.push({
        id: `problem-slit-${item.id}`,
        kind: "slit-allowance",
        label: slitAllowancePrompt.title,
        note: slitAllowancePrompt.message,
        bounds: itemBounds,
        severity: slitAllowancePrompt.severity,
        axis: slitAllowancePrompt.axis,
        targetId: item.id
      })
    } else if (rules.floodPrint && item.category === "Background" && widthTouchesCutter) {
      overlays.push({
        id: `problem-td-${item.id}`,
        kind: "problem",
        label: "Full-width flood detected.",
        note: "TD/slit direction flood needs a slit allowance check.",
        bounds: itemBounds,
        severity: "warning",
        axis: "TD",
        targetId: item.id
      })
    }

    if (isDevEnvironment) {
      console.log("[Artwork Studio][Preflight Item]", {
        itemId: item.id,
        itemType: item.uploadType,
        itemCategory: item.category,
        selected: collection.selectedId === item.id,
        visible: item.visible,
        locked: item.locked,
        transformedBoundsMm: itemBounds,
        safeZonesActive: safeZoneChecksEnabled,
        fallbackRulesActive: !safeZoneChecksEnabled,
        safeZoneBounds: safeZones,
        sealZoneBounds: sealZones,
        foldLineBounds: foldLines,
        eyemarkTrackBounds: eyemarkTrack,
        sealInnerEdgeDistancesMm: sealEdgeDistances,
        nearestFoldDistanceMm: nearestFoldDistance,
        isInsideSafeZone,
        ruleResults: debugRuleResults,
        generatedWarningIds: debugWarningIds
      })
    }
  })

  return {
    warnings,
    overlays,
    safeZones,
    sealZones,
    foldLines,
    eyemarkTrack,
    cutterBounds,
    mdTdEdges,
    slitAllowanceBands,
    safeZoneChecksEnabled
  }
}

export const applyPromptSlitAllowance = applySlitAllowanceState
