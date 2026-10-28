import { getSafeZoneSealClearanceMm } from "../constraints/flowwrap"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import type { FlowwrapSpec, SafeZoneSpec } from "../types/flowwrap"

type DragState = {
  side: "top" | "bottom" | "left" | "right"
  startX: number
  startY: number
  seals: { top: number; bottom: number; left: number; right: number }
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

function maxSealFromZones(
  zones: SafeZoneSpec[] | undefined,
  side: "top" | "bottom" | "left" | "right",
  liveWidth: number,
  liveHeight: number,
  clearance: number
) {
  if (!zones || zones.length === 0) {
    return Infinity
  }
  const active = zones.filter(zone => zone.enabled !== false)
  if (active.length === 0) {
    return Infinity
  }

  if (side === "top") {
    return Math.min(
      ...active.map(zone => zone.y - clearance)
    )
  }
  if (side === "bottom") {
    return Math.min(
      ...active.map(zone => liveHeight - (zone.y + zone.height) - clearance)
    )
  }
  if (side === "left") {
    return Math.min(
      ...active.map(zone => zone.x - clearance)
    )
  }
  return Math.min(
    ...active.map(zone => liveWidth - (zone.x + zone.width) - clearance)
  )
}

export function attachSealInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  const step = 1
  const minLiveSize = 1
  const snap = (value: number) => Math.round(value / step) * step
  let pendingSpec = spec

  const getLayerMeta = () => {
    const layer = svg.querySelector("g#seal_areas")
    if (!layer) {
      const geometry = resolveFlowwrapGeometry(spec)
      return {
        originX: 0,
        originY: 0,
        cutterWidth: geometry.cutterRect.width,
        cutterHeight: geometry.cutterRect.height
      }
    }
    return {
      originX: Number(layer.getAttribute("data-origin-x") ?? "0"),
      originY: Number(layer.getAttribute("data-origin-y") ?? "0"),
      cutterWidth: Number(layer.getAttribute("data-cutter-width") ?? spec.width.toString()),
      cutterHeight: Number(layer.getAttribute("data-cutter-height") ?? spec.height.toString())
    }
  }

  const updateSealDom = (seals: { top: number; bottom: number; left: number; right: number }) => {
    const { originX, originY, cutterWidth, cutterHeight } = getLayerMeta()
    const liveWidth = cutterWidth - seals.left - seals.right
    const liveHeight = cutterHeight - seals.top - seals.bottom
    const liveOriginX = originX + seals.left
    const liveOriginY = originY + seals.top

    const rects = svg.querySelectorAll<SVGRectElement>('[data-role="seal-rect"]')
    rects.forEach(rect => {
      const side = rect.getAttribute("data-seal-side")
      if (side === "top") {
        rect.setAttribute("x", originX.toString())
        rect.setAttribute("y", originY.toString())
        rect.setAttribute("width", cutterWidth.toString())
        rect.setAttribute("height", seals.top.toString())
      } else if (side === "bottom") {
        rect.setAttribute("x", originX.toString())
        rect.setAttribute("y", (liveOriginY + liveHeight).toString())
        rect.setAttribute("width", cutterWidth.toString())
        rect.setAttribute("height", seals.bottom.toString())
      } else if (side === "left") {
        rect.setAttribute("x", originX.toString())
        rect.setAttribute("y", originY.toString())
        rect.setAttribute("width", seals.left.toString())
        rect.setAttribute("height", cutterHeight.toString())
      } else if (side === "right") {
        rect.setAttribute("x", (liveOriginX + liveWidth).toString())
        rect.setAttribute("y", originY.toString())
        rect.setAttribute("width", seals.right.toString())
        rect.setAttribute("height", cutterHeight.toString())
      }
    })

    const handles = svg.querySelectorAll<SVGRectElement>('[data-role="seal-handle"]')
    handles.forEach(handle => {
      const side = handle.getAttribute("data-seal-side")
      if (side === "top") {
        handle.setAttribute("x", originX.toString())
        handle.setAttribute("y", (liveOriginY - 5).toString())
        handle.setAttribute("width", cutterWidth.toString())
        handle.setAttribute("height", "10")
      } else if (side === "bottom") {
        handle.setAttribute("x", originX.toString())
        handle.setAttribute("y", (liveOriginY + liveHeight - 5).toString())
        handle.setAttribute("width", cutterWidth.toString())
        handle.setAttribute("height", "10")
      } else if (side === "left") {
        handle.setAttribute("x", (liveOriginX - 5).toString())
        handle.setAttribute("y", originY.toString())
        handle.setAttribute("width", "10")
        handle.setAttribute("height", cutterHeight.toString())
      } else if (side === "right") {
        handle.setAttribute("x", (liveOriginX + liveWidth - 5).toString())
        handle.setAttribute("y", originY.toString())
        handle.setAttribute("width", "10")
        handle.setAttribute("height", cutterHeight.toString())
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
    const side = target.getAttribute("data-seal-side") as DragState["side"]
    if (!side) {
      return
    }
    drag = {
      side,
      startX: event.clientX,
      startY: event.clientY,
      seals: resolveFlowwrapGeometry(pendingSpec).seals
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const dx = snap(current.x - start.x)
    const dy = snap(current.y - start.y)
    const geometry = resolveFlowwrapGeometry(pendingSpec)
    const liveWidth = geometry.liveRect.width
    const liveHeight = geometry.liveRect.height
    const seals = geometry.seals
    const maxFromZones = maxSealFromZones(
      pendingSpec.safeZones,
      drag.side,
      liveWidth,
      liveHeight,
      getSafeZoneSealClearanceMm(pendingSpec)
    )
    const maxFromCutter =
      drag.side === "top"
        ? pendingSpec.height - seals.bottom - minLiveSize
        : drag.side === "bottom"
          ? pendingSpec.height - seals.top - minLiveSize
          : drag.side === "left"
            ? pendingSpec.width - seals.right - minLiveSize
            : pendingSpec.width - seals.left - minLiveSize
    const maxSeal = Math.max(0, Math.min(maxFromZones, maxFromCutter))

    const nextSeals = { ...drag.seals }
    if (drag.side === "top") {
      nextSeals.top = clamp(drag.seals.top + dy, 0, maxSeal)
    } else if (drag.side === "bottom") {
      nextSeals.bottom = clamp(drag.seals.bottom - dy, 0, maxSeal)
    } else if (drag.side === "left") {
      nextSeals.left = clamp(drag.seals.left + dx, 0, maxSeal)
    } else {
      nextSeals.right = clamp(drag.seals.right - dx, 0, maxSeal)
    }

    pendingSpec = { ...pendingSpec, seals: nextSeals }
    updateSealDom(nextSeals)
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
