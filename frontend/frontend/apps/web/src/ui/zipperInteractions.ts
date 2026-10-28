import type { FlowwrapSpec } from "../types/flowwrap"
import { updateSubMeasuresLayer } from "../renderers/flowwrapSvg"

type DragState = {
  startX: number
  originOffset: number
  width: number
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
    originY: Number(sealLayer?.getAttribute("data-origin-y") ?? "0"),
    cutterWidth: Number(sealLayer?.getAttribute("data-cutter-width") ?? "0")
  }
}

function updateZipperDom(
  svg: SVGSVGElement,
  originX: number,
  cutterWidth: number,
  offset: number,
  width: number,
  zipperY: number
) {
  const leftX = originX + offset
  const rightX = originX + cutterWidth - offset - width
  const groups = svg.querySelectorAll<SVGGElement>("[data-role=\"zipper-group\"]")
  groups.forEach(group => {
    const side = group.getAttribute("data-zipper-side")
    const x = side === "right" ? rightX : leftX
    group.setAttribute("transform", `translate(${x} ${zipperY})`)
  })
}

export function attachZipperInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec
  const snap = (value: number) => Math.round(value)

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
    const zipper = target?.closest?.("[data-role=\"zipper-strip\"]") as Element | null
    if (!zipper || !pendingSpec.doyPouch?.zipper) {
      return
    }
    const width = pendingSpec.doyPouch.zipper.width ?? 5
    drag = {
      startX: event.clientX,
      originOffset: pendingSpec.doyPouch.zipper.offsetX ?? 0,
      width
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.doyPouch?.zipper) {
      return
    }
    const { originX, originY, cutterWidth } = getCutterMeta(svg)
    const start = getSvgPoint(svg, drag.startX, event.clientY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const dx = snap(current.x - start.x)
    const maxOffset = Math.max(0, (cutterWidth - drag.width * 2) / 2)
    const nextOffset = Math.max(
      0,
      Math.min(maxOffset, drag.originOffset + dx)
    )
    const zipperY = originY

    pendingSpec = {
      ...pendingSpec,
      doyPouch: {
        ...pendingSpec.doyPouch,
        zipper: { ...pendingSpec.doyPouch.zipper, offsetX: nextOffset }
      }
    }
    updateZipperDom(svg, originX, cutterWidth, nextOffset, drag.width, zipperY)
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
