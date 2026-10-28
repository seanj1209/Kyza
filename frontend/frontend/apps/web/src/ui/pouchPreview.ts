import type { FlowwrapSpec } from "../types/flowwrap"
import { resolveFlowwrapLayout } from "../core/geometry/resolvers/resolveFlowwrapLayout"
import { resolveKSealLayout } from "../core/geometry/resolvers/resolveKSealLayout"

export type PouchFace = "fop" | "bop"
type PouchPreviewOptions = { face: PouchFace; showTrim: boolean }
export type PouchPreviewViewport = {
  x: number; y: number; width: number; height: number
  faceWidth: number; faceHeight: number
  faceLeft: number; faceRight: number; faceTop: number; faceBottom: number
  /** Cutter x of the face's outer edge (trim included when shown). */
  outerX: number
  /** Cutter x of the face's centre bottom-seal / fold line. */
  innerX: number
  face: PouchFace
}
export type ViewBox = { x: number; y: number; width: number; height: number }

const NS = "http://www.w3.org/2000/svg"
const PREVIEW_MARGIN_MM = 34
/** Must match the side-seal pouch renderer's canvas margin. */
const SIDE_POUCH_MARGIN_MM = 38

/**
 * AMENDS 8.2 — in normal cutter view FOP is the LEFT half of the web and BOP
 * the RIGHT half. Preview turns the selected half upright: its outer cutter
 * edge (pouch top) at the top of the screen and the centre bottom-seal line
 * (pouch bottom) at the bottom. The left half therefore turns clockwise and
 * the right half anticlockwise.
 */
export const POUCH_PREVIEW_ROTATION: Record<PouchFace, 90 | -90> = { fop: 90, bop: -90 }

type WebFaces = {
  /** Cutter outer edges and height, in cutter (SVG user) coordinates. */
  left: number; right: number; top: number; height: number
  /** Trim band width on each outer edge (0 when trim is off). */
  trim: number
  /** Centre bottom-seal / fold line bounding each face: FOP ends at innerLeft, BOP at innerRight. */
  innerLeft: number; innerRight: number
}

/** Each pack's own geometry decides where its two faces end. */
export function resolvePouchWebFaces(spec: FlowwrapSpec): WebFaces | null {
  const sidePouch = spec.sideSealPouch
  if (sidePouch) {
    // 2SS / 3SS: one panel either side of the centre fold or bottom-seal line.
    const trim = sidePouch.trimEnabled ? Math.max(0, sidePouch.trimWidth) : 0
    const left = SIDE_POUCH_MARGIN_MM
    const centre = left + trim + spec.height
    return { left, right: centre + spec.height + trim, top: SIDE_POUCH_MARGIN_MM, height: spec.width, trim, innerLeft: centre, innerRight: centre }
  }
  if (spec.kSealPouch) {
    // K Seal: each face runs to the centre of its bottom seal (the dotted
    // bottom-seal guides), not into the gusset half beyond it.
    const layout = resolveKSealLayout(spec)
    const { geometry, originX, originY, width, height } = layout
    const half = geometry.bottomSealAreaWidth / 2
    return {
      left: originX, right: originX + width, top: originY, height,
      trim: geometry.trimEnabled ? Math.max(0, geometry.trimWidth) : 0,
      innerLeft: originX + geometry.leftBottomSealX + half,
      innerRight: originX + geometry.rightBottomSealX + half,
    }
  }
  if (spec.doyPouch) {
    // DOY: each face runs to its bottom-seal midline (the fold guides on the
    // 40 mm marks); the oval section between them is the gusset.
    const layout = resolveFlowwrapLayout(spec, "doy-pouch")
    const { originX, originY, cutterWidth, cutterHeight, liveOriginX, liveWidth } = layout
    const trim = spec.doyPouch.trimEnabled ? Math.max(0, (cutterWidth - spec.width) / 2) : 0
    const centre = liveOriginX + liveWidth / 2
    const halfGap = Math.max(0, spec.doyPouch.panelWidths?.center ?? 0) / 2
    return {
      left: originX, right: originX + cutterWidth, top: originY, height: cutterHeight, trim,
      innerLeft: layout.doyLayout?.centerLeft ?? centre - halfGap,
      innerRight: layout.doyLayout?.centerRight ?? centre + halfGap,
    }
  }
  return null
}

/**
 * The selected face only: from its outer cutter edge (or trim boundary when
 * Trim is off) to its centre bottom-seal line. Nothing of the other face, the
 * gusset section or the hidden trim lies inside these bounds.
 */
export function resolvePouchPreviewViewport(
  _source: SVGSVGElement | null,
  spec: FlowwrapSpec,
  { face, showTrim }: PouchPreviewOptions
): PouchPreviewViewport | null {
  const web = resolvePouchWebFaces(spec)
  if (!web) return null
  const trim = showTrim ? 0 : web.trim
  const outerX = face === "fop" ? web.left + trim : web.right - trim
  const innerX = face === "fop" ? web.innerLeft : web.innerRight
  const faceLeft = Math.min(outerX, innerX)
  const faceRight = Math.max(outerX, innerX)
  const faceWidth = faceRight - faceLeft
  if (!(faceWidth > 0 && web.height > 0)) return null
  return {
    x: faceLeft,
    y: web.top - PREVIEW_MARGIN_MM,
    width: faceWidth,
    height: web.height + 2 * PREVIEW_MARGIN_MM,
    faceWidth,
    faceHeight: web.height,
    faceLeft,
    faceRight,
    faceTop: web.top,
    faceBottom: web.top + web.height,
    outerX,
    innerX,
    face,
  }
}

/**
 * Pixel size for the (pre-rotation) SVG element so its box has exactly the
 * viewport's aspect ratio. With no letterbox, nothing outside the face is
 * painted; after the ±90° turn the element fits inside the canvas.
 */
export function fitPouchPreviewElement(viewport: ViewBox, canvas: { width: number; height: number }) {
  const scale = Math.max(0, Math.min(canvas.height / viewport.width, canvas.width / viewport.height))
  return { width: viewport.width * scale, height: viewport.height * scale }
}

/**
 * Keep a zoomed or panned preview view inside the face: no zooming out past
 * the face and no panning into the neighbouring face, gusset or hidden trim.
 */
export function clampPouchPreviewView(viewport: ViewBox, box: ViewBox): ViewBox {
  const scale = Math.min(1, viewport.width / box.width, viewport.height / box.height)
  const width = box.width * scale
  const height = box.height * scale
  const clampAxis = (start: number, size: number, min: number, span: number) =>
    Math.min(Math.max(start, min), min + span - size)
  return {
    x: clampAxis(box.x, width, viewport.x, viewport.width),
    y: clampAxis(box.y, height, viewport.y, viewport.height),
    width,
    height,
  }
}

type MeasureSegment = { start: number; end: number; position: number; label: string }
const previewMeasureCleanup = new WeakMap<SVGSVGElement, () => void>()

/** Read the renderer's existing sub-measure geometry, including DOY grip, notch and zip rows. */
function readMeasureSegments(source: SVGSVGElement, id: string, axis: "x" | "y"): MeasureSegment[] {
  const group = source.querySelector(`#${id}`)
  if (!group) return []
  const segments: MeasureSegment[] = []
  let lines: SVGLineElement[] = []
  for (const child of group.children) {
    if (child instanceof SVGLineElement) lines.push(child)
    if (!(child instanceof SVGTextElement)) continue
    const [first, last] = lines.slice(-2)
    const start = Number(first?.getAttribute(axis === "x" ? "x1" : "y1"))
    const end = Number(last?.getAttribute(axis === "x" ? "x1" : "y1"))
    const position = Number(child.getAttribute(axis === "x" ? "y" : "x"))
    if (first && last && Number.isFinite(start) && Number.isFinite(end) && end > start) {
      segments.push({ start, end, position, label: child.textContent ?? "" })
    }
    lines = []
  }
  return segments
}

/** Preview dimensions live in a transparent sibling SVG, outside the cropped cutter face. */
export function showPouchPreviewMeasures(source: SVGSVGElement, viewport: PouchPreviewViewport | null, spec?: FlowwrapSpec | null) {
  previewMeasureCleanup.get(source)?.()
  previewMeasureCleanup.delete(source)
  source.querySelector('[data-layer-id="pouch-preview-measures"]')?.remove()
  if (!viewport || !source.parentElement) return
  const canvas = source.parentElement
  const host = document.createElement("div")
  host.className = "pouch-preview-measure-host"
  host.setAttribute("data-export-ui", "true")
  const overlay = document.createElementNS(NS, "svg")
  overlay.setAttribute("data-layer-id", "pouch-preview-measures")
  overlay.setAttribute("aria-hidden", "true")
  host.append(overlay)
  canvas.append(host)
  const upright = -POUCH_PREVIEW_ROTATION[viewport.face]
  const colour = "#d23429"
  const dimension = (role: string, x1: number, y1: number, x2: number, y2: number, label: string, sub = false, stagger = 0) => {
    const group = document.createElementNS(NS, "g")
    group.setAttribute("data-role", role)
    group.setAttribute("aria-label", label)
    const horizontal = Math.abs(y1 - y2) < .001
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2
    let font = sub ? 6 : 8
    const stroke = sub ? .4 : .6, cap = sub ? 2 : 4
    const span = horizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1)
    const fits = (text: string) => text.length * font * .55 <= span - .5
    let display = label
    if (!fits(display)) display = display.replace(/\s+/g, "")
    while (!fits(display) && font > 3) font -= .5
    if (!fits(display)) {
      display = display.replace(/mm$/i, "")
      while (font < (sub ? 6 : 8) && display.length * (font + .5) * .55 <= span - .5) font += .5
    }
    const short = !fits(display)
    const gap = short ? 0 : Math.min(span, display.length * font * .3 + 3) / 2
    const line = (a: number, b: number, c: number, d: number) => {
      const element = document.createElementNS(NS, "line")
      for (const [key, value] of Object.entries({ x1: a, y1: b, x2: c, y2: d })) element.setAttribute(key, String(value))
      element.setAttribute("stroke", colour); element.setAttribute("stroke-width", String(stroke))
      group.append(element)
    }
    if (horizontal) {
      if (midX - gap > x1) line(x1, y1, midX - gap, y1)
      if (midX + gap < x2) line(midX + gap, y1, x2, y1)
      line(x1, y1 - cap, x1, y1 + cap); line(x2, y2 - cap, x2, y2 + cap)
    } else {
      if (midY - gap > y1) line(x1, y1, x1, midY - gap)
      if (midY + gap < y2) line(x1, midY + gap, x2, y2)
      line(x1 - cap, y1, x1 + cap, y1); line(x2 - cap, y2, x2 + cap, y2)
    }
    const textX = midX + (short && !horizontal ? 8 + stagger * 8 : 0)
    const textY = midY - (short && horizontal ? 8 + stagger * 8 : 0)
    if (short) line(midX, midY, textX, textY)
    const text = document.createElementNS(NS, "text")
    for (const [key, value] of Object.entries({ x: textX, y: textY, fill: colour, "font-size": font, "text-anchor": "middle", "dominant-baseline": "middle" })) text.setAttribute(key, String(value))
    text.setAttribute("transform", `rotate(${upright} ${textX} ${textY})`)
    text.textContent = display
    group.append(text)
    overlay.append(group)
  }
  const mm = (value: number) => `${Math.round(value * 100) / 100} mm`
  const { faceLeft, faceRight, faceTop, faceBottom, faceWidth, faceHeight, innerX, outerX } = viewport
  // The source turns upright: X becomes screen height and Y becomes screen width.
  const fop = viewport.face === "fop"
  const rightY = (offset: number) => fop ? faceTop - offset : faceBottom + offset
  const leftY = (offset: number) => fop ? faceBottom + offset : faceTop - offset
  const topX = fop ? faceLeft - 10 : faceRight + 10
  const bottomX = fop ? faceRight + 12 : faceLeft - 12
  const along = (distance: number) => outerX + (fop ? distance : -distance)
  const horizontal = (role: string, start: number, end: number, y: number, stagger = 0) =>
    dimension(role, Math.min(start, end), y, Math.max(start, end), y, mm(Math.abs(end - start)), true, stagger)
  dimension("pouch-preview-length", faceLeft, rightY(32), faceRight, rightY(32), mm(faceWidth))
  dimension("pouch-preview-width", topX, faceTop, topX, faceBottom, mm(faceHeight))
  const outsideX = fop ? faceRight + 1 : faceLeft - 1
  const withinFace = (segment: MeasureSegment) => segment.start >= faceLeft - .01 && segment.end <= faceRight + .01
  if (spec?.doyPouch && !spec.kSealPouch) {
    const pouch = spec.doyPouch
    const length = Math.abs(innerX - outerX)
    const web = resolvePouchWebFaces(spec)
    const hiddenTrim = web ? Math.max(0, fop ? outerX - web.left : web.right - outerX) : 0
    if (pouch.trimEnabled && web?.trim && hiddenTrim < .01) {
      horizontal("pouch-preview-trim", outerX, along(web.trim), rightY(10))
    }
    if (pouch.showZipper !== false) {
      const opening = Math.max(0, (pouch.zipper.offsetX ?? 0) - hiddenTrim)
      const width = Math.max(0, pouch.zipper.width ?? 10)
      if (opening > 0 && opening < length) horizontal("pouch-preview-opening-distance", outerX, along(opening), rightY(16))
      if (width > 0 && opening + width < length) horizontal("pouch-preview-opening-width", along(opening), along(opening + width), leftY(10), 1)
    }
    if (pouch.showTearNotch !== false) {
      const notch = Math.max(0, (pouch.tearNotch.offsetX ?? 0) - hiddenTrim)
      if (notch > 0 && notch < length) horizontal("pouch-preview-tear-distance", outerX, along(notch), leftY(17))
    }
    if (pouch.showGusset !== false) {
      const seal = Math.max(0, pouch.bottomSeal ?? 7.5)
      if (seal > 0 && seal < length) horizontal("pouch-preview-bottom-seal", along(length - seal), innerX, rightY(24))
      const arc = resolveFlowwrapLayout(spec, "doy-pouch").doyLayout
      const arcHeight = arc ? (fop ? arc.centerLeft - arc.arcLeftX : arc.arcRightX - arc.centerRight) : 0
      if (arcHeight > 0 && arcHeight < length) horizontal("pouch-preview-side-arc", along(length - arcHeight), innerX, leftY(24))
    }
    if (spec.seal > 0 && faceHeight > 2 * spec.seal) {
      const seal = spec.seal
      dimension("pouch-preview-side-seal-first", bottomX, faceTop, bottomX, faceTop + seal, mm(seal), true)
      dimension("pouch-preview-between-seals", bottomX, faceTop + seal, bottomX, faceBottom - seal, mm(faceHeight - 2 * seal), true)
      dimension("pouch-preview-side-seal-last", bottomX, faceBottom - seal, bottomX, faceBottom, mm(seal), true)
    }
  } else {
    readMeasureSegments(source, "sub_measure_width", "x").filter(withinFace)
      .filter(segment => Math.abs(segment.end - segment.start - faceWidth) > .01)
      .forEach((segment, index) => dimension(`pouch-preview-sub-length-${index}`, segment.start, rightY(12), segment.end, rightY(12), segment.label, true, index % 2))
    const featureRows = readMeasureSegments(source, "sub_measure_features", "x").filter(withinFace)
    const distinctRows = [...new Set(featureRows.map(segment => segment.position))].sort((a, b) => a - b)
    featureRows.forEach((segment, index) => {
      const row = distinctRows.indexOf(segment.position)
      dimension(`pouch-preview-feature-${index}`, segment.start, rightY(20 + row * 7), segment.end, rightY(20 + row * 7), segment.label, true, index % 3)
    })
    readMeasureSegments(source, "sub_measure_height", "y")
      .filter(segment => Math.abs(segment.end - segment.start - faceHeight) > .01)
      .forEach((segment, index) => dimension(`pouch-preview-sub-width-${index}`, bottomX + (fop ? 8 : -8), segment.start, bottomX + (fop ? 8 : -8), segment.end, segment.label, true, index % 2))
  }
  if (spec?.sideSealPouch) {
    const trim = viewport.face === "fop" ? faceLeft + spec.sideSealPouch.trimWidth : faceRight - spec.sideSealPouch.trimWidth
    if (spec.sideSealPouch.trimEnabled && spec.sideSealPouch.trimWidth > 0 && trim > faceLeft && trim < faceRight) {
      const [start, end] = viewport.face === "fop" ? [faceLeft, trim] : [trim, faceRight]
      dimension("pouch-preview-trim", start, faceTop - 12, end, faceTop - 12, mm(end - start), true)
    }
    const seals = spec.seals
    const side = viewport.face === "fop" ? seals?.left : seals?.right
    if (side && side > 0 && side < faceHeight) {
      const x = outsideX + (viewport.face === "fop" ? 10 : -10)
      dimension("pouch-preview-side-seal", x, faceTop, x, faceTop + side, mm(side), true)
    }
  }
  const sync = () => {
    const width = Number.parseFloat(source.style.width), height = Number.parseFloat(source.style.height)
    if (!Number.isFinite(width) || !Number.isFinite(height)) return
    overlay.setAttribute("viewBox", source.getAttribute("viewBox") ?? `${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`)
    overlay.style.width = `${width}px`; overlay.style.height = `${height}px`
    overlay.style.left = `${(canvas.clientWidth - width) / 2}px`
    overlay.style.top = `${(canvas.clientHeight - height) / 2}px`
    overlay.style.transform = `rotate(${POUCH_PREVIEW_ROTATION[viewport.face]}deg)`
  }
  source.addEventListener("canvasviewportchange", sync)
  previewMeasureCleanup.set(source, () => { source.removeEventListener("canvasviewportchange", sync); host.remove() })
  sync()
}
