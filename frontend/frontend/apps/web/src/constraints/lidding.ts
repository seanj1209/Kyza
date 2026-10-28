import type { FlowwrapSpec, LiddingSpec } from "../types/flowwrap"
import type { EyeMarkSpec } from "../types/eyeMarks"

export const MAX_LIDDING_AROUND_MM = 790
/** Minimum space from the outer cutter (reel slit) edge to an eyemark. */
export const LIDDING_EDGE_CLEARANCE_MM = 1.5
/** Minimum space from an eyemark's inner edge to the lid's outer cut. */
export const LIDDING_EYEMARK_CLEARANCE_MM = 1.5
export const LIDDING_DEFAULT_EYEMARK_WIDTH_MM = 10
/** Canvas margin around the cutter in the lidding drawing. */
export const LIDDING_CANVAS_MARGIN_MM = 40
export const LIDDING_DEFAULTS: LiddingSpec = {
  style: "square", mode: "auto", outerCutWidth: 190, outerCutHeight: 190,
  outerBleed: 2, sealOuter: 4, sealInner: 2, artworkSafeArea: 180,
  pullTab: true, pullTabAngle: 45, across: 1, around: 1, repeatMode: "uniform", compensatedExtra: 0, compensatedRow: 1, innerLines: true, multipack: false, multipackSingleSide: "right", activeStep: "1A", syncMirror: true, slitSizingVersion: 2
}
const EPSILON = 1e-6
const round = (value: number) => Math.round(value * 1e6) / 1e6

/** The safe contour may coincide with the inner-bleed contour, never exceed it. */
export const liddingSafeAreaMaximum = (lid: LiddingSpec) =>
  lid.outerCutWidth - lid.outerBleed - lid.sealOuter - lid.sealInner

export const liddingSafeArea = (lid: LiddingSpec) => liddingSafeAreaMaximum(lid) - 2

export const liddingPullTabAngle = (lid: LiddingSpec) =>
  Number.isFinite(lid.pullTabAngle) ? ((lid.pullTabAngle! % 360) + 360) % 360 : 45

export const liddingSealOuterSize = (lid: LiddingSpec) =>
  lid.outerCutWidth - lid.outerBleed - lid.sealOuter

/** Overall contour widths; stored offsets remain compatible with older projects. */
export const liddingContourWidths = (lid: LiddingSpec) => ({
  outerBleed: round(lid.outerCutWidth - lid.outerBleed),
  outerSeal: round(lid.outerCutWidth - lid.outerBleed - lid.sealOuter),
  innerBleed: round(liddingSafeAreaMaximum(lid)),
})

export const liddingContourHeight = (lid: LiddingSpec, width: number) =>
  round(lid.outerCutHeight - (lid.outerCutWidth - width))

export function liddingContourChanges(lid: LiddingSpec, key: "outerBleed" | "sealOuter" | "sealInner", overallWidth: number): Partial<LiddingSpec> {
  const widths = liddingContourWidths(lid)
  const outer = key === "outerBleed" ? lid.outerCutWidth : key === "sealOuter" ? widths.outerBleed : widths.outerSeal
  return { [key]: round(outer - overallWidth) }
}

type MarkSize = { width: number; height: number }

/** Eyemark 1 sits on the selected side, eyemark 2 on the opposite side. */
export function liddingEyemarkSizes(eyeMarks?: EyeMarkSpec): MarkSize[] {
  const count = Math.max(0, Math.min(2, Math.floor(eyeMarks?.count ?? 0)))
  const first = {
    width: Math.max(0, eyeMarks?.width ?? LIDDING_DEFAULT_EYEMARK_WIDTH_MM),
    height: Math.max(0, eyeMarks?.height ?? 0),
  }
  const second = {
    width: Math.max(0, eyeMarks?.width2 ?? first.width),
    height: Math.max(0, eyeMarks?.height2 ?? first.height),
  }
  return [first, second].slice(0, count)
}

/**
 * Lidding (V2.0 lidding update): the outer green cutter edge is the reel slit.
 * Every side of the lid block keeps edge → eyemark → lid clearances of
 * 1.5 mm each, with a zero-size eyemark on unmarked sides:
 *   left/right = 1.5 + eyemark width + 1.5
 *   top/bottom = 1.5 + eyemark height + 1.5 on the selected edge;
 *                the opposite edge keeps the two 1.5 mm clearances.
 * Mid marks use the side bands and keep 1.5 mm clear of the top/bottom slit.
 * e.g. 180 mm lid + two 10 mm eyemarks = 206 mm; 170 mm lid + one 5 mm high
 * eyemark = 170 + 6 + 5 = 181 mm.
 */
export function liddingMinimumBands(eyeMarks?: EyeMarkSpec) {
  const marks = liddingEyemarkSizes(eyeMarks)
  const buffer = LIDDING_EDGE_CLEARANCE_MM + LIDDING_EYEMARK_CLEARANCE_MM
  const firstOnRight = marks.length === 1 && eyeMarks?.position.endsWith("right")
  const bottom = eyeMarks?.position === "bottom" || eyeMarks?.position.startsWith("bottom-")
  const centre = eyeMarks?.position === "centre" || eyeMarks?.position.startsWith("centre-")
  const markHeight = Math.max(0, ...marks.map(mark => mark.height))
  return {
    left: round(buffer + (firstOnRight ? 0 : marks[0]?.width ?? 0)),
    right: round(buffer + (firstOnRight ? marks[0]?.width : marks[1]?.width ?? 0)),
    top: round(buffer + (bottom || centre ? 0 : markHeight)),
    bottom: round(buffer + (bottom ? markHeight : 0)),
  }
}

/** Kept for existing callers: the minimum left/right bands beside the lid block. */
export const liddingEdgeMargins = (_lid: LiddingSpec, eyeMarks?: EyeMarkSpec) => {
  const bands = liddingMinimumBands(eyeMarks)
  return { left: bands.left, right: bands.right }
}

export const liddingLidBlockSize = (lid: LiddingSpec) => ({
  width: round(lid.outerCutWidth),
  height: round(lid.outerCutHeight),
})

/** A repeat owns its own reel slit and clearance bands. */
export function liddingMinimumSlitSize(lid: LiddingSpec, eyeMarks?: EyeMarkSpec) {
  const bands = liddingMinimumBands(eyeMarks)
  return {
    width: round(lid.outerCutWidth + 2 * Math.max(bands.left, bands.right)),
    height: round(lid.outerCutHeight + bands.top + bands.bottom),
  }
}

export function liddingSlitSize(lid: LiddingSpec, eyeMarks?: EyeMarkSpec) {
  const minimum = liddingMinimumSlitSize(lid, eyeMarks)
  return {
    width: Math.max(minimum.width, Number.isFinite(lid.overallWidth) ? lid.overallWidth! : 0),
    height: Math.max(minimum.height, Number.isFinite(lid.overallHeight) ? lid.overallHeight! : 0),
  }
}

const liddingExtra = (lid: LiddingSpec) => lid.repeatMode === "compensated" && Number.isFinite(lid.compensatedExtra)
  ? Math.max(0, lid.compensatedExtra ?? 0) : 0

/** One cutter may grow while all other Around cutters keep their base pitch. */
export function liddingRepeatRows(lid: LiddingSpec, eyeMarks?: EyeMarkSpec) {
  const base = liddingSlitSize(lid, eyeMarks).height
  const selected = lid.compensatedRow ?? 1
  let top = 0
  return Array.from({ length: lid.around }, (_, row) => {
    const extra = row + 1 === selected ? liddingExtra(lid) : 0
    const current = { top: round(top), height: round(base + extra), extra: round(extra) }
    top += current.height
    return current
  })
}

export const liddingOverallRepeat = (lid: LiddingSpec, eyeMarks?: EyeMarkSpec) =>
  round(liddingSlitSize(lid, eyeMarks).height * lid.around + liddingExtra(lid))

export const liddingUniformRepeat = (lid: LiddingSpec, eyeMarks?: EyeMarkSpec) =>
  round(liddingSlitSize(lid, eyeMarks).height * lid.around)

export const liddingAroundUsage = (lid: LiddingSpec) =>
  round(lid.outerCutHeight * lid.around + liddingExtra(lid))

/** Total web occupied by the side-by-side and around slit repeats. */
export function liddingMinimumCutterSize(lid: LiddingSpec, eyeMarks?: EyeMarkSpec) {
  const slit = liddingMinimumSlitSize(lid, eyeMarks)
  return { width: round(slit.width * lid.across), height: round(slit.height * lid.around) }
}

export function liddingCutterSize(lid: LiddingSpec, eyeMarks?: EyeMarkSpec) {
  const slit = liddingSlitSize(lid, eyeMarks)
  return { width: round(slit.width * lid.across), height: liddingOverallRepeat(lid, eyeMarks) }
}

/**
 * Lid block placement. Extra slit width/height beyond the minimum goes
 * between the eyemarks and the lid, split equally on both sides, so the lid's
 * outer cut never changes size.
 */
export function liddingLidOrigin(lid: LiddingSpec, eyeMarks?: EyeMarkSpec) {
  const size = liddingSlitSize(lid, eyeMarks)
  return {
    x: round((size.width - lid.outerCutWidth) / 2),
    y: round((size.height - lid.outerCutHeight) / 2),
  }
}

/** Requested slit sizes are lifted to the minimum; offsets stay legal. */
export function syncLiddingCutterSize(spec: FlowwrapSpec): FlowwrapSpec {
  if (!spec.lidding) return spec
  // Older saved stepped projects stored one overall web size. Convert those
  // requests to per-slit sizes once, then preserve the individual pitch.
  const old = spec.lidding
  const migrated = old.slitSizingVersion === 2 ? old : {
    ...old, slitSizingVersion: 2 as const,
    overallWidth: old.overallWidth === undefined ? undefined : old.overallWidth / Math.max(1, old.across),
    overallHeight: old.overallHeight === undefined ? undefined : old.overallHeight / Math.max(1, old.around),
  }
  const minimum = liddingMinimumSlitSize(migrated, spec.eyeMarks)
  const lift = (value: number | undefined, min: number) =>
    value === undefined || !Number.isFinite(value) ? undefined : Math.max(min, value)
  const overallWidth = lift(migrated.overallWidth, minimum.width)
  const overallHeight = lift(migrated.overallHeight, minimum.height)
  const lidding = overallWidth === migrated.overallWidth && overallHeight === migrated.overallHeight
    ? migrated
    : { ...migrated, overallWidth, overallHeight }
  const size = liddingCutterSize(lidding, spec.eyeMarks)
  const eyeMarks = clampLiddingEyemarkOffsets({ ...spec, lidding })
  if (lidding === spec.lidding && eyeMarks === spec.eyeMarks && spec.width === size.width && spec.height === size.height) return spec
  return { ...spec, lidding, eyeMarks, width: size.width, height: size.height }
}

export function resolveLiddingLayout(spec: FlowwrapSpec) {
  const lid = spec.lidding ?? LIDDING_DEFAULTS
  const cutter = liddingCutterSize(lid, spec.eyeMarks)
  const minimum = liddingMinimumCutterSize(lid, spec.eyeMarks)
  const origin = liddingLidOrigin(lid, spec.eyeMarks)
  const slit = liddingSlitSize(lid, spec.eyeMarks)
  const rows = liddingRepeatRows(lid, spec.eyeMarks)
  const cells = Array.from({ length: lid.around }, (_, row) =>
    Array.from({ length: lid.across }, (_, column) => ({
      id: `${column + 1}${String.fromCharCode(65 + row)}`,
      row, column,
      slitX: round(column * slit.width), slitY: rows[row].top,
      slitWidth: slit.width, slitHeight: rows[row].height,
      x: round(origin.x + column * slit.width),
      y: round(origin.y + rows[row].top + rows[row].extra / 2),
      width: lid.outerCutWidth,
      height: lid.outerCutHeight,
    }))
  ).flat()
  return {
    cutter,
    minimumCutter: minimum,
    lidBlock: { ...origin, ...liddingLidBlockSize(lid) },
    slit,
    rows,
    cells,
    ringReductions: {
      bleed: lid.outerBleed,
      sealOuter: lid.outerBleed + lid.sealOuter,
      sealInner: lid.outerBleed + lid.sealOuter + lid.sealInner,
      safe: Math.max(0, lid.outerCutWidth - lid.artworkSafeArea),
    },
    eyemarks: liddingEyemarkRects(spec),
  }
}

type Rect = { x: number; y: number; width: number; height: number }

/** Where each eyemark may sit: inside the slit edge and clear of the lid block. */
export function liddingEyemarkBounds(spec: FlowwrapSpec): Rect[] {
  if (!spec.lidding) return []
  const lid = spec.lidding
  const size = liddingSlitSize(lid, spec.eyeMarks)
  const origin = liddingLidOrigin(lid, spec.eyeMarks)
  const block = liddingLidBlockSize(lid)
  const edge = LIDDING_EDGE_CLEARANCE_MM
  const top = edge
  const height = size.height - 2 * edge
  return liddingEyemarkSizes(spec.eyeMarks).map((_, index) => {
    const onRight = index === 1 || (index === 0 && spec.eyeMarks?.count === 1 && spec.eyeMarks.position.endsWith("right"))
    const x = onRight ? origin.x + block.width + LIDDING_EYEMARK_CLEARANCE_MM : edge
    const right = onRight ? size.width - edge : origin.x - LIDDING_EYEMARK_CLEARANCE_MM
    return { x: round(x), y: round(top), width: round(right - x), height: round(height) }
  })
}

/** Default positions follow the selected top, bottom or mid side of each slit. */
export function liddingDefaultEyemarkRects(spec: FlowwrapSpec): Rect[] {
  if (!spec.lidding) return []
  const size = liddingSlitSize(spec.lidding, spec.eyeMarks)
  const edge = LIDDING_EDGE_CLEARANCE_MM
  return liddingEyemarkSizes(spec.eyeMarks).map((mark, index) => ({
    x: round(index === 1 || (spec.eyeMarks?.count === 1 && spec.eyeMarks.position.endsWith("right")) ? size.width - edge - mark.width : edge),
    y: spec.eyeMarks?.position === "bottom" || spec.eyeMarks?.position.startsWith("bottom-")
      ? round(size.height - edge - mark.height)
      : spec.eyeMarks?.position === "centre" || spec.eyeMarks?.position.startsWith("centre-")
        ? round((size.height - mark.height) / 2)
        : edge,
    width: mark.width,
    height: mark.height,
  }))
}

const offsetsOf = (eyeMarks: EyeMarkSpec | undefined, index: number) => ({
  x: (index === 1 ? eyeMarks?.offsetX2 : eyeMarks?.offsetX) ?? 0,
  y: (index === 1 ? eyeMarks?.offsetY2 : eyeMarks?.offsetY) ?? 0,
})

export function liddingEyemarkInstances(spec: FlowwrapSpec) {
  if (!spec.lidding || !spec.eyeMarks) return []
  const base = liddingDefaultEyemarkRects(spec).map((rect, index) => {
    const offset = offsetsOf(spec.eyeMarks, index)
    return { ...rect, x: round(rect.x + offset.x), y: round(rect.y + offset.y) }
  })
  const slit = liddingSlitSize(spec.lidding, spec.eyeMarks)
  const rows = liddingRepeatRows(spec.lidding, spec.eyeMarks)
  const position = spec.eyeMarks.position
  const alignment = position === "bottom" || position.startsWith("bottom-") ? 1
    : position === "centre" || position.startsWith("centre-") ? .5 : 0
  const lid = spec.lidding
  const multipack = lid.multipack === true && lid.around > 1 && spec.eyeMarks.count === 2
  const singleSide = lid.multipackSingleSide ?? "right"
  const repeatHeight = rows.at(-1)!.top + rows.at(-1)!.height
  return Array.from({ length: lid.around }, (_, row) =>
    Array.from({ length: lid.across }, (_, column) =>
      base.flatMap((rect, sideIndex) => {
        const onRight = sideIndex === 1 || (base.length === 1 && spec.eyeMarks?.position.endsWith("right"))
        const side = onRight ? "right" : "left"
        if (multipack) {
          if (side === singleSide && (row !== 0 || column !== (side === "right" ? lid.across - 1 : 0))) return []
          if (side !== singleSide && column !== (side === "right" ? lid.across - 1 : 0)) return []
        }
        const singleRepeatY = alignment === 1
          ? repeatHeight - LIDDING_EDGE_CLEARANCE_MM - rect.height
          : alignment === .5 ? (repeatHeight - rect.height) / 2 : rect.y
        return [{
          rect: {
            ...rect,
            x: round(rect.x + column * slit.width),
            y: round(multipack && side === singleSide ? singleRepeatY : rect.y + rows[row].top + rows[row].extra * alignment),
          },
          sideIndex, row, column, cellId: `${column + 1}${String.fromCharCode(65 + row)}`,
        }]
      })
    ).flat()
  ).flat()
}

export const liddingEyemarkRects = (spec: FlowwrapSpec): Rect[] => liddingEyemarkInstances(spec).map(instance => instance.rect)

const clampInto = (value: number, size: number, start: number, span: number) =>
  Math.min(Math.max(value, start), start + Math.max(0, span - size))

/** Offsets that keep each eyemark inside its allowed band. */
function clampLiddingEyemarkOffsets(spec: FlowwrapSpec): EyeMarkSpec | undefined {
  const eyeMarks = spec.eyeMarks
  if (!spec.lidding || !eyeMarks) return eyeMarks
  const defaults = liddingDefaultEyemarkRects(spec)
  const bounds = liddingEyemarkBounds(spec)
  let next = eyeMarks
  defaults.forEach((rect, index) => {
    const offset = offsetsOf(eyeMarks, index)
    const allowed = bounds[index]
    const x = round(clampInto(rect.x + offset.x, rect.width, allowed.x, allowed.width) - rect.x)
    const y = round(clampInto(rect.y + offset.y, rect.height, allowed.y, allowed.height) - rect.y)
    if (Math.abs(x - offset.x) < EPSILON && Math.abs(y - offset.y) < EPSILON) return
    next = index === 1 ? { ...next, offsetX2: x, offsetY2: y } : { ...next, offsetX: x, offsetY: y }
  })
  return next
}

/**
 * Manual eyemark movement. The move is accepted only while the edge and lid
 * clearances still hold; otherwise the mark stops at the nearest legal place.
 */
export function moveLiddingEyemark(spec: FlowwrapSpec, index: number, offsetX: number, offsetY: number): FlowwrapSpec {
  if (!spec.lidding || !spec.eyeMarks || index < 0 || index >= liddingEyemarkSizes(spec.eyeMarks).length) return spec
  const moved = index === 1
    ? { ...spec.eyeMarks, offsetX2: offsetX, offsetY2: offsetY, manualPositioned2: true }
    : { ...spec.eyeMarks, offsetX, offsetY, manualPositioned: true }
  return { ...spec, eyeMarks: clampLiddingEyemarkOffsets({ ...spec, eyeMarks: moved }) }
}

/** Clearance problems for each eyemark (empty when all clearances hold). */
export function liddingClearanceIssues(spec: FlowwrapSpec): string[] {
  if (!spec.lidding) return []
  const issues: string[] = []
  const size = liddingSlitSize(spec.lidding, spec.eyeMarks)
  const origin = liddingLidOrigin(spec.lidding, spec.eyeMarks)
  const block = liddingLidBlockSize(spec.lidding)
  const seen = new Set<number>()
  liddingEyemarkInstances(spec).forEach(({ rect, sideIndex: index, row, column }) => {
    if (seen.has(index)) return
    seen.add(index)
    const rows = liddingRepeatRows(spec.lidding!, spec.eyeMarks)
    const onRight = index === 1 || (index === 0 && spec.eyeMarks?.count === 1 && spec.eyeMarks.position.endsWith("right"))
    const side = onRight ? "right" : "left"
    const spansRepeat = spec.lidding!.multipack === true && spec.eyeMarks?.count === 2 && side === (spec.lidding!.multipackSingleSide ?? "right")
    const mark = { ...rect, x: rect.x - column * size.width, y: spansRepeat ? rect.y : rect.y - rows[row].top }
    const verticalExtent = spansRepeat ? rows.at(-1)!.top + rows.at(-1)!.height : rows[row].height
    const edgeGap = Math.min(
      onRight ? size.width - (mark.x + mark.width) : mark.x,
      mark.y,
      verticalExtent - (mark.y + mark.height)
    )
    const lidGap = onRight ? mark.x - (origin.x + block.width) : origin.x - (mark.x + mark.width)
    if (edgeGap < LIDDING_EDGE_CLEARANCE_MM - EPSILON) {
      issues.push(`Eyemark ${index + 1} (${side}) must stay at least ${LIDDING_EDGE_CLEARANCE_MM}mm inside the cutter edge.`)
    }
    if (lidGap < LIDDING_EYEMARK_CLEARANCE_MM - EPSILON) {
      issues.push(`Eyemark ${index + 1} (${side}) must stay at least ${LIDDING_EYEMARK_CLEARANCE_MM}mm from the lid outer cut.`)
    }
  })
  return issues
}

/** All lidding dimensions live in one spec; the UI never calculates geometry. */
export function updateLiddingSpec(spec: FlowwrapSpec, changes: Partial<LiddingSpec>): FlowwrapSpec {
  if (!spec.lidding) return spec
  const before = spec.lidding
  const lid = { ...before, ...changes }
  if (lid.around <= 1) lid.multipack = false
  if (changes.artworkSafeArea !== undefined && lid.mode === "auto") lid.mode = "manual"
  if (changes.pullTabAngle !== undefined) lid.pullTabAngle = liddingPullTabAngle(lid)
  if (lid.repeatMode === "compensated") {
    lid.compensatedExtra ??= 0
    lid.compensatedRow ??= 1
  }
  if (lid.compensatedRow !== undefined && lid.compensatedRow > lid.around) lid.compensatedRow = lid.around
  if (Number.isInteger(lid.across) && lid.across >= 1 && Number.parseInt(lid.activeStep ?? "1A", 10) > lid.across) lid.activeStep = "1A"
  if (lid.style === "round") lid.outerCutHeight = lid.outerCutWidth
  if (lid.mode === "auto") lid.artworkSafeArea = liddingSafeArea(lid)
  else if (changes.artworkSafeArea === undefined) {
    lid.artworkSafeArea = before.artworkSafeArea
      + (lid.outerCutWidth - before.outerCutWidth)
      - (lid.outerBleed - before.outerBleed)
      - (lid.sealOuter - before.sealOuter)
      - (lid.sealInner - before.sealInner)
  }
  const size = liddingCutterSize(lid, spec.eyeMarks)
  const next = { ...spec, lidding: lid, width: size.width, height: size.height }
  return { ...next, eyeMarks: clampLiddingEyemarkOffsets(next) }
}

/** The entered overall repeat sets only the added height; lid dimensions stay fixed. */
export function setLiddingOverallRepeat(spec: FlowwrapSpec, overall: number): FlowwrapSpec {
  if (!spec.lidding) return spec
  const uniform = liddingUniformRepeat(spec.lidding, spec.eyeMarks)
  return updateLiddingSpec(spec, { compensatedExtra: round(overall - uniform) })
}

/** Reductions rescue the lid by scaling every contour; growth can keep or scale it. */
export function setLiddingOverallSize(spec: FlowwrapSpec, size: { width?: number; height?: number }, scaleOnGrowth = false): FlowwrapSpec {
  if (!spec.lidding) return spec
  const lid = spec.lidding
  const oldSize = liddingSlitSize(lid, spec.eyeMarks)
  const requested = size.width !== undefined ? { old: oldSize.width, next: size.width, lid: lid.outerCutWidth, axis: "width" } :
    size.height !== undefined ? { old: oldSize.height, next: size.height, lid: lid.outerCutHeight, axis: "height" } : null
  const bands = liddingMinimumBands(spec.eyeMarks)
  const widthReserve = 2 * Math.max(bands.left, bands.right)
  const heightReserve = bands.top + bands.bottom
  const scale = requested && (requested.next < requested.old || scaleOnGrowth)
    ? Math.min(requested.next / requested.old, (requested.next - (requested.axis === "width" ? widthReserve : heightReserve)) / requested.lid) : 1
  const scaled = scale > 0 && scale !== 1 ? {
    outerCutWidth: round(lid.outerCutWidth * scale), outerCutHeight: round(lid.outerCutHeight * scale),
    outerBleed: round(lid.outerBleed * scale), sealOuter: round(lid.sealOuter * scale),
    sealInner: round(lid.sealInner * scale),
    ...(lid.mode === "manual" ? { artworkSafeArea: round(lid.artworkSafeArea * scale) } : {}),
  } : {}
  return updateLiddingSpec(spec, {
    ...scaled,
    ...(size.width !== undefined ? { overallWidth: size.width } : {}),
    ...(size.height !== undefined ? { overallHeight: size.height } : {}),
    ...(size.width === undefined && lid.overallWidth !== undefined && scale > 0 && scale !== 1
      ? { overallWidth: round(Math.max(lid.overallWidth, lid.outerCutWidth * scale + widthReserve)) } : {}),
    ...(size.height === undefined && lid.overallHeight !== undefined && scale > 0 && scale !== 1
      ? { overallHeight: round(Math.max(lid.overallHeight, lid.outerCutHeight * scale + heightReserve)) } : {}),
  })
}

/** Editing an absolute seal outline keeps offsets linked and grows the cutter. */
export function resizeLiddingFromSealOuter(spec: FlowwrapSpec, size: number): FlowwrapSpec {
  if (!spec.lidding) return spec
  const delta = size - liddingSealOuterSize(spec.lidding)
  return updateLiddingSpec(spec, {
    outerCutWidth: spec.lidding.outerCutWidth + delta,
    outerCutHeight: spec.lidding.outerCutHeight + delta,
  })
}

export function validateLiddingSpec(spec: FlowwrapSpec) {
  const lid = spec.lidding
  const errors: string[] = []
  if (!lid) return { errors: ["Lidding settings are required."], warnings: [] }
  if (!["plain", "square", "round"].includes(lid.style)) errors.push("Choose a valid lid style.")
  if (!["manual", "auto"].includes(lid.mode)) errors.push("Choose manual or auto sizing.")
  if (!(lid.outerCutWidth > 0 && lid.outerCutHeight > 0)) errors.push("Outer cut dimensions must be greater than 0mm.")
  if (lid.style === "round" && lid.outerCutWidth !== lid.outerCutHeight) errors.push("Round lid width and height must match.")
  if (![lid.outerBleed, lid.sealOuter, lid.sealInner].every(value => Number.isFinite(value) && value >= 0)) errors.push("Bleed and seal dimensions must be 0mm or greater.")
  if (!(lid.artworkSafeArea > 0 && lid.artworkSafeArea <= liddingSafeAreaMaximum(lid) + EPSILON)) errors.push("Artwork safe area must not exceed the inner bleed outline.")
  if (lid.pullTabAngle !== undefined && !Number.isFinite(lid.pullTabAngle)) errors.push("Pull tab angle must be a finite degree value.")
  if (![lid.across, lid.around].every(value => Number.isInteger(value) && value >= 1)) errors.push("Across and Around must be whole numbers of at least 1.")
  if (lid.repeatMode !== undefined && !["uniform", "compensated"].includes(lid.repeatMode)) errors.push("Choose a valid repeat type.")
  if (lid.repeatMode === "compensated") {
    if (!Number.isFinite(lid.compensatedExtra) || (lid.compensatedExtra ?? -1) < 0) errors.push("Overall repeat must be at least the uniform Around height.")
    if (!Number.isInteger(lid.compensatedRow) || (lid.compensatedRow ?? 0) < 1 || (lid.compensatedRow ?? 0) > lid.around) errors.push("Choose an Around repeat from top to bottom.")
  }
  if (liddingAroundUsage(lid) > MAX_LIDDING_AROUND_MM) errors.push("Max Singular Repeat is 790mm. Check manufactures sleeve stock.")
  if (spec.hangerSlots?.length || spec.halfMoonCutouts?.length || spec.doyPouch || spec.kSealPouch || spec.sachet) errors.push("Lidding does not support gussets or pouch cut outs.")
  const minimum = liddingMinimumSlitSize(lid, spec.eyeMarks)
  if (lid.overallWidth !== undefined && !(lid.overallWidth >= minimum.width - EPSILON)) {
    errors.push(`Overall cutter width must be at least ${minimum.width}mm to keep ${LIDDING_EDGE_CLEARANCE_MM}mm eyemark clearances.`)
  }
  if (lid.overallHeight !== undefined && !(lid.overallHeight >= minimum.height - EPSILON)) {
    errors.push(`Overall cutter height must be at least ${minimum.height}mm to keep ${LIDDING_EDGE_CLEARANCE_MM}mm eyemark clearances.`)
  }
  errors.push(...liddingClearanceIssues(spec))
  const size = liddingCutterSize(lid, spec.eyeMarks)
  if (Math.abs(spec.width - size.width) > .001 || Math.abs(spec.height - size.height) > .001) errors.push("Lid and cutter dimensions are out of sync.")
  return { errors, warnings: [] as string[] }
}
