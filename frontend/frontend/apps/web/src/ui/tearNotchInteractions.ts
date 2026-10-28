import type { FlowwrapSpec } from "../types/flowwrap"
import { updateSubMeasuresLayer } from "../renderers/flowwrapSvg"
import { snapMoveWithin } from "./movementSnap"

type DragState = {
  startX: number
  originOffset: number
  notchWidth: number
  notchDepth: number
}

const NOTCH_OUTER_OFFSET = 7.5

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
    originY: Number(sealLayer?.getAttribute("data-origin-y") ?? "0"),
    cutterWidth: Number(sealLayer?.getAttribute("data-cutter-width") ?? "0"),
    cutterHeight: Number(sealLayer?.getAttribute("data-cutter-height") ?? "0")
  }
}

function updateNotchDom(
  svg: SVGSVGElement,
  originX: number,
  originY: number,
  cutterWidth: number,
  cutterHeight: number,
  notchOffset: number,
  notchWidth: number,
  notchDepth: number
) {
  const leftX = originX + notchOffset
  const rightX = originX + cutterWidth - notchOffset
  const notchHalf = notchWidth / 2
  const buildPath = (x: number, y: number, direction: number) =>
    [
      `M ${x - notchHalf} ${y}`,
      `L ${x} ${y + notchDepth * direction}`,
      `L ${x + notchHalf} ${y}`
    ].join(" ")

  const notches = svg.querySelectorAll<SVGPathElement>(
    "[data-role=\"tear-notch\"]"
  )
  notches.forEach(notch => {
    const side = notch.getAttribute("data-notch-side")
    const pos = notch.getAttribute("data-notch-pos")
    const x = side === "right" ? rightX : leftX
    const y = pos === "bottom" ? originY + cutterHeight : originY
    const direction = pos === "bottom" ? -1 : 1
    notch.setAttribute("d", buildPath(x, y, direction))
  })
}

export function attachTearNotchInteractions(
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
    const notch = target?.closest?.("[data-role=\"tear-notch\"]") as Element | null
    if (!notch || !pendingSpec.doyPouch?.tearNotch) {
      return
    }
    const defaultOffset =
      (pendingSpec.doyPouch.zipper.offsetX ?? 0) - NOTCH_OUTER_OFFSET
    drag = {
      startX: event.clientX,
      originOffset: pendingSpec.doyPouch.tearNotch.offsetX ?? defaultOffset,
      notchWidth: pendingSpec.doyPouch.tearNotch.width,
      notchDepth: pendingSpec.doyPouch.tearNotch.depth
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.doyPouch?.tearNotch || !pendingSpec.doyPouch?.zipper) {
      return
    }
    const { originX, originY, cutterWidth, cutterHeight } = getCutterMeta(svg)
    const start = getSvgPoint(svg, drag.startX, event.clientY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const maxOffset = cutterWidth / 2 - drag.notchWidth
    const minOffset = drag.notchWidth
    // AMENDS 6.1: the notch offset lands on the mouse movement grid.
    const nextOffset = snapMoveWithin(drag.originOffset + (current.x - start.x), minOffset, maxOffset, pendingSpec.doyPouch.tearNotch.offsetX ?? drag.originOffset)

    pendingSpec = {
      ...pendingSpec,
      doyPouch: {
        ...pendingSpec.doyPouch,
        tearNotch: { ...pendingSpec.doyPouch.tearNotch, offsetX: nextOffset }
      }
    }
    updateNotchDom(
      svg,
      originX,
      originY,
      cutterWidth,
      cutterHeight,
      nextOffset,
      drag.notchWidth,
      drag.notchDepth
    )
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
