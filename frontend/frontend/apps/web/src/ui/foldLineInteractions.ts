import { clearMeasurementAnnotations, updateMeasurementAnnotations } from "./measurementAnnotations"
import { snapMoveCoordinate } from "./movementSnap"
import { updateSubMeasuresLayer } from "../renderers/flowwrapSvg"
import { updateSachetMeasuresLayer } from "../renderers/sachetSvg"
import type { FlowwrapSpec } from "../types/flowwrap"
import type { FoldLineSpec } from "../geometry/foldLines"

type DragState = {
  lineId: string
  startX: number
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
  const step = 1
  const snap = (value: number) => Math.round(value / step) * step
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

  const getLiveBounds = () => {
    const sealLayer = svg.querySelector("g#seal_areas")
    const liveY = Number(sealLayer?.getAttribute("data-origin-y") ?? "0")
    const liveHeight = Number(sealLayer?.getAttribute("data-live-height") ?? "0")
    return { liveY, liveHeight }
  }

  const updateLineDom = (line: FoldLineSpec) => {
    const { liveX, minX, maxX } = getLayerMeta()
    const x = Math.max(minX, Math.min(liveX + line.offset, maxX))
    const lines = svg.querySelectorAll<SVGLineElement>(
      `[data-line-id="${line.id}"]`
    )
    lines.forEach(el => {
      if (el.hasAttribute("x1")) {
        el.setAttribute("x1", x.toString())
      }
      if (el.hasAttribute("x2")) {
        el.setAttribute("x2", x.toString())
      }
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
      originOffset: line.offset
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.foldLines) {
      return
    }
    const start = getSvgPoint(svg, drag.startX, event.clientY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x
    const dx = snap(rawDx)

    const nextLines = pendingSpec.foldLines.map(line => {
      if (line.id !== drag!.lineId) {
        return line
      }
      // AMENDS 6.1: the fold offset lands on the mouse movement grid.
      const updated = { ...line, offset: snapMoveCoordinate(drag!.originOffset + rawDx) }
      updateLineDom(updated)
      return updated
    })

    pendingSpec = { ...pendingSpec, foldLines: nextLines }
    updateSubMeasuresLayer(svg, pendingSpec)
    updateSachetMeasuresLayer(svg, pendingSpec)

    const moved = nextLines.find(line => line.id === drag!.lineId)
    if (moved) {
      const { liveX } = getLayerMeta()
      const { liveY, liveHeight } = getLiveBounds()
      const active = updateMeasurementAnnotations({
        svg,
        spec: pendingSpec,
        objectRect: {
          x: liveX + moved.offset,
          y: liveY,
          width: 0,
          height: liveHeight
        },
        deltaX: dx,
        deltaY: 0,
        allowHorizontal: true,
        allowVertical: false,
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
