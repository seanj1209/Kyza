import type {
  ResolvedPaperStripInstance,
  ResolvedPaperStripLayout
} from "../core/geometry/resolvers/resolvePaperStripLayout"
import { formatMetricMeasurement } from "../core/formatMetric"

const SVG_NS = "http://www.w3.org/2000/svg"
const DIMENSION_OFFSET = 5
const MAIN_DIMENSION_OFFSET = 10
const MAIN_WIDTH_TEXT_GAP = 2
const DIMENSION_STROKE = "#d23429"
const DIMENSION_STROKE_WIDTH = 0.3
const DIMENSION_CAP = 2
const DIMENSION_TEXT_SIZE = 3

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.6
}

const formatMm = formatMetricMeasurement

export function getPaperStripMainWidthOffset(
  measureScale: number,
  _subMeasuresEnabled?: boolean
) {
  const scale = Math.max(0.65, Math.min(2, measureScale))
  // Keep the lowest main measure close to, but clear of, the cutter top.
  return DIMENSION_OFFSET + 2.3 * MAIN_DIMENSION_OFFSET * scale + MAIN_WIDTH_TEXT_GAP
}

function dimensionLineWithCaps(
  layer: SVGGElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  textOffset: { x: number; y: number },
  rotate = 0,
  role?: string
) {
  const isHorizontal = y1 === y2
  const main=role?.startsWith("paper-strip-measure-main")
  let fontSize = (main ? 6 : 4) * Number(layer.getAttribute("data-measure-scale")??1)
  const length = Math.max(0, Math.abs(isHorizontal ? x2 - x1 : y2 - y1))
  if (label && length > 0) {
    const gap = 2
    const maxTextSize = Math.max(2, (length - gap * 2) / (label.length * 0.6))
    fontSize = Math.min(fontSize, maxTextSize)
  }
  const midX = (x1 + x2) / 2 + textOffset.x
  const midY = (y1 + y2) / 2 + textOffset.y

  const groupEl = document.createElementNS(SVG_NS, "g")
  if (role) {
    groupEl.setAttribute("data-role", role)
  }

  if (label) {
    const gap = 2
    if (isHorizontal) {
      const textWidth = estimateTextWidth(label, fontSize)
      const leftEnd = midX - textWidth / 2 - gap
      const rightStart = midX + textWidth / 2 + gap
      const leftLine = document.createElementNS(SVG_NS, "line")
      leftLine.setAttribute("x1", x1.toString())
      leftLine.setAttribute("y1", y1.toString())
      leftLine.setAttribute("x2", leftEnd.toString())
      leftLine.setAttribute("y2", y2.toString())
      leftLine.setAttribute("stroke", DIMENSION_STROKE)
      leftLine.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
      groupEl.appendChild(leftLine)

      const rightLine = document.createElementNS(SVG_NS, "line")
      rightLine.setAttribute("x1", rightStart.toString())
      rightLine.setAttribute("y1", y1.toString())
      rightLine.setAttribute("x2", x2.toString())
      rightLine.setAttribute("y2", y2.toString())
      rightLine.setAttribute("stroke", DIMENSION_STROKE)
      rightLine.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
      groupEl.appendChild(rightLine)
    } else {
      const textWidth = estimateTextWidth(label, fontSize)
      const textHalfHeight = textWidth / 2
      const gapY = Math.max(gap, fontSize * 1.2)
      const topEnd = midY - textHalfHeight - gapY
      const bottomStart = midY + textHalfHeight + gapY
      const yStart = Math.min(y1, y2)
      const yEnd = Math.max(y1, y2)
      const topLine = document.createElementNS(SVG_NS, "line")
      topLine.setAttribute("x1", x1.toString())
      topLine.setAttribute("y1", yStart.toString())
      topLine.setAttribute("x2", x2.toString())
      topLine.setAttribute("y2", topEnd.toString())
      topLine.setAttribute("stroke", DIMENSION_STROKE)
      topLine.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
      groupEl.appendChild(topLine)

      const bottomLine = document.createElementNS(SVG_NS, "line")
      bottomLine.setAttribute("x1", x1.toString())
      bottomLine.setAttribute("y1", bottomStart.toString())
      bottomLine.setAttribute("x2", x2.toString())
      bottomLine.setAttribute("y2", yEnd.toString())
      bottomLine.setAttribute("stroke", DIMENSION_STROKE)
      bottomLine.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
      groupEl.appendChild(bottomLine)
    }
  } else {
    const lineEl = document.createElementNS(SVG_NS, "line")
    lineEl.setAttribute("x1", x1.toString())
    lineEl.setAttribute("y1", y1.toString())
    lineEl.setAttribute("x2", x2.toString())
    lineEl.setAttribute("y2", y2.toString())
    lineEl.setAttribute("stroke", DIMENSION_STROKE)
    lineEl.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
    groupEl.appendChild(lineEl)
  }

  const cap1 = document.createElementNS(SVG_NS, "line")
  if (isHorizontal) {
    cap1.setAttribute("x1", x1.toString())
    cap1.setAttribute("y1", (y1 - DIMENSION_CAP).toString())
    cap1.setAttribute("x2", x1.toString())
    cap1.setAttribute("y2", (y1 + DIMENSION_CAP).toString())
  } else {
    cap1.setAttribute("x1", (x1 - DIMENSION_CAP).toString())
    cap1.setAttribute("y1", y1.toString())
    cap1.setAttribute("x2", (x1 + DIMENSION_CAP).toString())
    cap1.setAttribute("y2", y1.toString())
  }
  cap1.setAttribute("stroke", DIMENSION_STROKE)
  cap1.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
  groupEl.appendChild(cap1)

  const cap2 = document.createElementNS(SVG_NS, "line")
  if (isHorizontal) {
    cap2.setAttribute("x1", x2.toString())
    cap2.setAttribute("y1", (y2 - DIMENSION_CAP).toString())
    cap2.setAttribute("x2", x2.toString())
    cap2.setAttribute("y2", (y2 + DIMENSION_CAP).toString())
  } else {
    cap2.setAttribute("x1", (x2 - DIMENSION_CAP).toString())
    cap2.setAttribute("y1", y2.toString())
    cap2.setAttribute("x2", (x2 + DIMENSION_CAP).toString())
    cap2.setAttribute("y2", y2.toString())
  }
  cap2.setAttribute("stroke", DIMENSION_STROKE)
  cap2.setAttribute("stroke-width", DIMENSION_STROKE_WIDTH.toString())
  groupEl.appendChild(cap2)

  const textEl = document.createElementNS(SVG_NS, "text")
  textEl.setAttribute("x", midX.toString())
  textEl.setAttribute("y", midY.toString())
  textEl.setAttribute("fill", DIMENSION_STROKE)
  textEl.setAttribute("font-size", fontSize.toString())
  textEl.setAttribute("text-anchor", "middle")
  textEl.setAttribute("dominant-baseline", "middle")
  if (rotate !== 0) {
    textEl.setAttribute("transform", `rotate(${rotate} ${midX} ${midY})`)
  }
  textEl.textContent = label
  groupEl.appendChild(textEl)
  layer.appendChild(groupEl)
}

function clearPaperStripMeasureGroups(layer: SVGGElement) {
  layer
    .querySelectorAll('[data-role^="paper-strip-measure"]')
    .forEach(node => node.remove())
}

function getOverallLayoutRect(layout: ResolvedPaperStripLayout) {
  const firstInstance = layout.instances[0]
  if (!firstInstance) {
    return {
      x: layout.cutterRect.x,
      y: layout.cutterRect.y,
      width: layout.measurements.overallWidth,
      height: layout.measurements.overallHeight
    }
  }
  return {
    x: firstInstance.cutterRect.x,
    y: firstInstance.cutterRect.y,
    width: layout.measurements.overallWidth,
    height: layout.measurements.overallHeight
  }
}

function renderMainPaperStripMeasurements(
  layer: SVGGElement,
  layout: ResolvedPaperStripLayout
) {
  const meta = layout.measurements
  const overallRect = getOverallLayoutRect(layout)
  const measureScale = Number(layer.getAttribute("data-measure-scale") ?? 1)
  const mainTopY =
    overallRect.y -
    getPaperStripMainWidthOffset(measureScale)
  dimensionLineWithCaps(
    layer,
    overallRect.x,
    mainTopY,
    overallRect.x + overallRect.width,
    mainTopY,
    `W ${formatMm(meta.overallWidth)}`,
    { x: 0, y: 0 },
    0,
    "paper-strip-measure-main-width"
  )

  layout.instances.forEach(instance => {
    const cutterLeft = instance.cutterRect.x
    const cutterRight = cutterLeft + instance.cutterRect.width
    const stepTopY = mainTopY + MAIN_DIMENSION_OFFSET * measureScale
    dimensionLineWithCaps(
      layer,
      cutterLeft,
      stepTopY,
      cutterRight,
      stepTopY,
      `W ${formatMm(instance.cutterRect.width)}`,
      { x: 0, y: 0 },
      0,
      `paper-strip-measure-main-step-width:${instance.index}`
    )

    const contentTopY = stepTopY + MAIN_DIMENSION_OFFSET * measureScale
    const liveRight = instance.liveRect.x + instance.liveRect.width
    const segments = [
      { start: cutterLeft, end: instance.liveRect.x, value: instance.seals.left, name: "left-seal" },
      { start: instance.liveRect.x, end: liveRight, value: instance.liveRect.width, name: "working-area" },
      { start: liveRight, end: cutterRight, value: instance.seals.right, name: "right-seal" }
    ]
    segments.forEach(segment => {
      if (segment.end <= segment.start || segment.value <= 0) return
      dimensionLineWithCaps(
        layer,
        segment.start,
        contentTopY,
        segment.end,
        contentTopY,
        formatMm(segment.value),
        { x: 0, y: 0 },
        0,
        `paper-strip-measure-main-${segment.name}:${instance.index}`
      )
    })
  })

  const mainLeftX = overallRect.x - MAIN_DIMENSION_OFFSET
  dimensionLineWithCaps(
    layer,
    mainLeftX,
    overallRect.y,
    mainLeftX,
    overallRect.y + overallRect.height,
    `H ${formatMm(meta.overallHeight)}`,
    { x: 0, y: 0 },
    -90,
    "paper-strip-measure-main-height"
  )
}

export type PaperStripHorizontalSegment = Readonly<{
  start: number
  end: number
  value: number
  kind: "solid" | "clear"
  role: string
}>

export function getPaperStripHorizontalSegments(
  instance: ResolvedPaperStripInstance
): readonly PaperStripHorizontalSegment[] {
  const cutterLeft = instance.cutterRect.x
  const cutterRight = cutterLeft + instance.cutterRect.width
  const stripRects =
    instance.clearStripRects.length > 0
      ? instance.clearStripRects
      : instance.clearStripRect
        ? [instance.clearStripRect]
        : []
  const visibleStrips = stripRects
    .map(rect => ({
      start: Math.max(cutterLeft, rect.x),
      end: Math.min(cutterRight, rect.x + rect.width)
    }))
    .filter(rect => rect.end > rect.start)
    .sort((left, right) => left.start - right.start)

  const segments: PaperStripHorizontalSegment[] = []
  let cursor = cutterLeft
  let solidIndex = 0

  visibleStrips.forEach((strip, stripIndex) => {
    if (strip.start > cursor) {
      segments.push({
        start: cursor,
        end: strip.start,
        value: strip.start - cursor,
        kind: "solid",
        role: `paper-strip-measure-solid:${instance.index}:${solidIndex}`
      })
      solidIndex += 1
    }

    const clearStart = Math.max(cursor, strip.start)
    if (strip.end > clearStart) {
      segments.push({
        start: clearStart,
        end: strip.end,
        value: strip.end - clearStart,
        kind: "clear",
        role: `paper-strip-measure-clear-strip:${instance.index}:${stripIndex}`
      })
    }
    cursor = Math.max(cursor, strip.end)
  })

  if (cursor < cutterRight) {
    segments.push({
      start: cursor,
      end: cutterRight,
      value: cutterRight - cursor,
      kind: "solid",
      role: `paper-strip-measure-solid:${instance.index}:${solidIndex}`
    })
  }

  return segments
}

export function splitPaperStripSegmentsAtFolds<T extends { start: number; end: number; value: number; role: string }>(
  segments: readonly T[], foldXs: readonly number[] = []
): Array<T> {
  return segments.flatMap(segment => {
    const boundaries = [segment.start, ...foldXs.filter(x => x > segment.start && x < segment.end), segment.end]
    return boundaries.slice(0, -1).map((start, index) => ({
      ...segment,
      start,
      end: boundaries[index + 1],
      value: boundaries[index + 1] - start,
      role: boundaries.length > 2 ? `${segment.role}:fold${index}` : segment.role,
    }))
  })
}

function renderSubPaperStripMeasurements(
  layer: SVGGElement,
  layout: ResolvedPaperStripLayout
) {
  layout.instances.forEach(instance => {
    const subTopY = instance.cutterRect.y + instance.cutterRect.height + DIMENSION_OFFSET
    const cutterRight = instance.cutterRect.x + instance.cutterRect.width
    const liveRight = instance.liveRect.x + instance.liveRect.width
    const horizontalSegments =
      instance.clearStripRects.length > 0 || instance.clearStripRect
        ? getPaperStripHorizontalSegments(instance)
        : [
            {
              start: instance.cutterRect.x,
              end: instance.liveRect.x,
              value: instance.seals.left,
              role: `paper-strip-measure-left-seal:${instance.index}`
            },
            {
              start: instance.liveRect.x,
              end: liveRight,
              value: instance.liveRect.width,
              role: `paper-strip-measure-live-width:${instance.index}`
            },
            {
              start: liveRight,
              end: cutterRight,
              value: instance.seals.right,
              role: `paper-strip-measure-right-seal:${instance.index}`
            }
          ]

    splitPaperStripSegmentsAtFolds(horizontalSegments, instance.foldXs).forEach(segment => {
      if (segment.end <= segment.start || segment.value <= 0) {
        return
      }
      dimensionLineWithCaps(
        layer,
        segment.start,
        subTopY,
        segment.end,
        subTopY,
        formatMm(segment.value),
        { x: 0, y: 0 },
        0,
        segment.role
      )
    })
  })
}

export function renderPaperStripMeasurements(
  layer: SVGGElement,
  layout: ResolvedPaperStripLayout,
  options: { main: boolean; sub: boolean }
) {
  layer.setAttribute("data-measure-scale",String(Math.max(.65,Math.min(2,Math.max(layout.cutterRect.width,layout.cutterRect.height)/310))))
  clearPaperStripMeasureGroups(layer)
  if (!options.main && !options.sub) {
    return
  }

  if (options.main) {
    renderMainPaperStripMeasurements(layer, layout)
  }

  if (!options.sub) {
    return
  }
  renderSubPaperStripMeasurements(layer, layout)
}
