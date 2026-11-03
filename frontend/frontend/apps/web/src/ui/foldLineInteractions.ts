import { clearMeasurementAnnotations, updateMeasurementAnnotations } from "./measurementAnnotations"
import { snapMoveWithin } from "./movementSnap"
import { updateSubMeasuresLayer } from "../renderers/flowwrapSvg"
import { updateSachetMeasuresLayer } from "../renderers/sachetSvg"
import type { FlowwrapSpec } from "../types/flowwrap"
import { buildFoldLines, type FoldLineSpec } from "../geometry/foldLines"

type DragState = {
  lineId: string
  startX: number
  startY: number
  originOffset: number
}

function getSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
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

export function attachFoldLineInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void,
  onMeasurementActive?: (active: boolean) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec

  const getLayerMeta = () => {
    const layer = svg.querySelector("g#fold_lines")
    if (!layer) {
      return { liveX: 0, minX: 0, maxX: 0 }
    }
    return {
      liveX: Number(layer.getAttribute("data-live-origin-x") ?? "0"),
      minX: Number(layer.getAttribute("data-min-x") ?? "0"),
      maxX: Number(layer.getAttribute("data-max-x") ?? "0")
    }
  }

  const getCutterBounds = () => {
    const sealLayer = svg.querySelector("g#seal_areas")
    return {
      x: Number(sealLayer?.getAttribute("data-origin-x") ?? "0"),
      y: Number(sealLayer?.getAttribute("data-origin-y") ?? "0"),
      width: Number(sealLayer?.getAttribute("data-cutter-width") ?? spec.width),
      height: Number(sealLayer?.getAttribute("data-cutter-height") ?? spec.height)
    }
  }

  const getLineSegment = (line: FoldLineSpec) => {
    const { liveX, minX, maxX } = getLayerMeta()
    const cutter = getCutterBounds()
    return buildFoldLines([line], liveX, cutter.x, cutter.y, cutter.width, cutter.height, minX, maxX)[0]
  }

  const updateLineDom = (line: FoldLineSpec) => {
    const segment = getLineSegment(line)
    const lines = svg.querySelectorAll<SVGLineElement>(
      `[data-line-id="${line.id}"]`
    )
    lines.forEach(el => {
      for (const key of ["x1", "y1", "x2", "y2"] as const) {
        if (el.hasAttribute(key)) el.setAttribute(key, segment[key].toString())
      }
    })
  }

  for (const line of spec.foldLines ?? []) {
    svg.querySelectorAll(`[data-line-id="${line.id}"]`).forEach(el => {
      el.setAttribute("cursor", line.orientation === "horizontal" ? "row-resize" : "col-resize")
    })
  }

  const onPointerDown = (event: PointerEvent) => {
    if (svg.getAttribute("data-select-enabled") !== "true") {
      return
    }
    if (svg.getAttribute("data-pan-enabled") === "true") {
      return
    }
    if (svg.getAttribute("data-measure-enabled") === "true") {
      return
    }
    const target = event.target as HTMLElement
    const lineId = target.getAttribute("data-line-id")
    if (!lineId || !pendingSpec.foldLines) {
      return
    }
    const line = pendingSpec.foldLines.find(l => l.id === lineId)
    if (!line) {
      return
    }
    drag = {
      lineId,
      startX: event.clientX,
      startY: event.clientY,
      originOffset: line.offset
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.foldLines) {
      return
    }
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x
    const rawDy = current.y - start.y

    const nextLines = pendingSpec.foldLines.map(line => {
      if (line.id !== drag!.lineId) {
        return line
      }
      const horizontal = line.orientation === "horizontal"
      const { liveX, minX, maxX } = getLayerMeta()
      const updated = {
        ...line,
        offset: snapMoveWithin(
          drag!.originOffset + (horizontal ? rawDy : rawDx),
          horizontal ? 0 : minX - liveX,
          horizontal ? getCutterBounds().height : maxX - liveX,
          drag!.originOffset
        )
      }
      updateLineDom(updated)
      return updated
    })

    pendingSpec = { ...pendingSpec, foldLines: nextLines }
    updateSubMeasuresLayer(svg, pendingSpec)
    updateSachetMeasuresLayer(svg, pendingSpec)

    const moved = nextLines.find(line => line.id === drag!.lineId)
    if (moved) {
      const segment = getLineSegment(moved)
      const horizontal = moved.orientation === "horizontal"
      const active = updateMeasurementAnnotations({
        svg,
        spec: pendingSpec,
        objectRect: {
          x: segment.x1,
          y: segment.y1,
          width: segment.x2 - segment.x1,
          height: segment.y2 - segment.y1
        },
        deltaX: horizontal ? 0 : moved.offset - drag.originOffset,
        deltaY: horizontal ? moved.offset - drag.originOffset : 0,
        allowHorizontal: !horizontal,
        allowVertical: horizontal,
        excludeFoldId: moved.id
      })
      if (onMeasurementActive) {
        onMeasurementActive(active)
      }
    }
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    svg.releasePointerCapture(event.pointerId)
    onSpecChange(pendingSpec)
    clearMeasurementAnnotations(svg)
    if (onMeasurementActive) {
      onMeasurementActive(false)
    }
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointerleave", onPointerUp)
}
