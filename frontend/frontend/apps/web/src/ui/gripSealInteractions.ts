import { updateSubMeasuresLayer } from "../renderers/flowwrapSvg"
import type { FlowwrapSpec } from "../types/flowwrap"
import { snapMoveWithin } from "./movementSnap"

type DragState = {
  startX: number
  originSideBleed: number
  gripWidth: number
  side: "left" | "right"
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

function getCutterMeta(svg: SVGSVGElement) {
  const sealLayer = svg.querySelector("g#seal_areas")
  return {
    originX: Number(sealLayer?.getAttribute("data-origin-x") ?? "0"),
    cutterWidth: Number(sealLayer?.getAttribute("data-cutter-width") ?? "0")
  }
}

function updateGripDom(
  svg: SVGSVGElement,
  originX: number,
  cutterWidth: number,
  sideBleed: number,
  gripWidth: number
) {
  const leftX = originX + sideBleed
  const rightX = originX + cutterWidth - sideBleed - gripWidth
  const grips = svg.querySelectorAll<SVGRectElement>("[data-role=\"grip-seal\"]")
  grips.forEach(grip => {
    const side = grip.getAttribute("data-grip-side")
    grip.setAttribute("x", (side === "right" ? rightX : leftX).toString())
  })
  const labels = svg.querySelectorAll<SVGTextElement>("[data-role=\"grip-seal-label\"]")
  labels.forEach(label => {
    const side = label.getAttribute("data-grip-side")
    const x = side === "right" ? rightX + gripWidth / 2 : leftX + gripWidth / 2
    const y = Number(label.getAttribute("y") ?? "0")
    label.setAttribute("x", x.toString())
    label.setAttribute(
      "transform",
      side === "right"
        ? `rotate(90 ${x} ${y})`
        : `rotate(-90 ${x} ${y})`
    )
  })
}

export function attachGripSealInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec

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
    const target = event.target as HTMLElement | null
    const grip = target?.closest?.("[data-role=\"grip-seal\"]") as Element | null
    if (!grip || !pendingSpec.doyPouch) {
      return
    }
    const side = grip.getAttribute("data-grip-side") === "right" ? "right" : "left"
    drag = {
      startX: event.clientX,
      originSideBleed: pendingSpec.doyPouch.sideBleed,
      gripWidth: pendingSpec.doyPouch.gripSeal,
      side
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.doyPouch) {
      return
    }
    const { originX, cutterWidth } = getCutterMeta(svg)
    const start = getSvgPoint(svg, drag.startX, event.clientY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const maxBleed = Math.max(0, cutterWidth - drag.gripWidth)
    // AMENDS 6.1: the grip seal position lands on the mouse movement grid.
    const nextBleed = snapMoveWithin(drag.originSideBleed + (current.x - start.x), 0, maxBleed, pendingSpec.doyPouch.sideBleed ?? drag.originSideBleed)

    pendingSpec = {
      ...pendingSpec,
      doyPouch: { ...pendingSpec.doyPouch, sideBleed: nextBleed }
    }
    updateGripDom(svg, originX, cutterWidth, nextBleed, drag.gripWidth)
    updateSubMeasuresLayer(svg, pendingSpec)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    svg.releasePointerCapture(event.pointerId)
    onSpecChange(pendingSpec)
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointerleave", onPointerUp)
}
