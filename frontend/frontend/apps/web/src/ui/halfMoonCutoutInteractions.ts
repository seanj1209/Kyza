import {
  HALFMOON_OUTSIDE_GUSSET_ERROR,
  clampHalfMoonRadius,
  evaluateHalfMoonCutout
} from "../constraints/halfMoonCutouts"
import type { FlowwrapSpec, HalfMoonCutoutSpec } from "../types/flowwrap"
import { snapResizeFromOrigin } from "./resizeSnap"
import { snapMoveWithin } from "./movementSnap"

type DragState = {
  mode: "move" | "resize"
  cutoutId: string
  originOffset: number
  originCenterX: number
  originSide: "left" | "right"
  startX: number
  startY: number
  origin: HalfMoonCutoutSpec
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

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}

export function attachHalfMoonCutoutInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec
  let selectedCutoutId =
    pendingSpec.halfMoonCutouts?.find(cutout => cutout.selected)?.id ?? null

  const setSelectedCutout = (cutoutId: string | null) => {
    if (!pendingSpec.halfMoonCutouts) {
      selectedCutoutId = null
      return
    }
    selectedCutoutId = cutoutId
    pendingSpec = {
      ...pendingSpec,
      halfMoonCutouts: pendingSpec.halfMoonCutouts.map(cutout => ({
        ...cutout,
        selected: cutout.id === cutoutId
      }))
    }
    onSpecChange(pendingSpec)
  }

  const getLayerMeta = () => {
    const sealLayer = svg.querySelector("g#seal_areas")
    const originX = Number(sealLayer?.getAttribute("data-origin-x") ?? "0")
    const originY = Number(sealLayer?.getAttribute("data-origin-y") ?? "0")
    const cutterWidth = Number(sealLayer?.getAttribute("data-cutter-width") ?? "0")
    const cutterHeight = Number(sealLayer?.getAttribute("data-cutter-height") ?? "0")
    const sealsTop = pendingSpec.seals?.top ?? pendingSpec.seal
    const sealsLeft = pendingSpec.seals?.left ?? pendingSpec.seal
    const sealsRight = pendingSpec.seals?.right ?? pendingSpec.seal
    return { originX, originY, cutterWidth, cutterHeight, sealsTop, sealsLeft, sealsRight }
  }

  const updateWarnings = () => {
    const warningLayer = svg.querySelector<SVGGElement>("g#soft_warnings")
    if (!warningLayer) {
      return
    }
    warningLayer
      .querySelectorAll("[data-role=\"half-moon-warning\"]")
      .forEach(node => node.remove())
  }

  const updateCutoutDom = (cutout: HalfMoonCutoutSpec) => {
    const meta = getLayerMeta()
    const { originX, originY } = meta
    const absX = originX + cutout.centerX
    const absY = originY + cutout.centerY
    const radius = cutout.radius
    const state = evaluateHalfMoonCutout(pendingSpec, cutout)
    const stroke = state.flags.warning || state.flags.hardViolation ? "#d23429" : "#2eb774"
    const buildPath = (cx: number, cy: number, direction: "up" | "down") => {
      const sweep = direction === "down" ? 1 : 0
      return `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 ${sweep} ${cx + radius} ${cy} L ${cx - radius} ${cy} Z`
    }

    const shapes = svg.querySelectorAll<SVGPathElement>(
      `[data-cutout-id="${cutout.id}"][data-role="half-moon-cutout"],` +
        `[data-cutout-id="${cutout.id}"][data-role="half-moon-cutout-hit"]`
    )
    shapes.forEach(shape => {
      const edge = shape.getAttribute("data-edge") === "bottom" ? "bottom" : "top"
      const faceCenterX = absX
      const faceCenterY = edge === "bottom" ? originY + meta.cutterHeight : absY
      const faceD = buildPath(faceCenterX, faceCenterY, edge === "bottom" ? "down" : "up")
      shape.setAttribute("d", faceD)
      if (shape.getAttribute("data-role") === "half-moon-cutout") {
        shape.setAttribute("stroke", stroke)
      }
    })

    const moveHandles = svg.querySelectorAll<SVGCircleElement>(
      `[data-cutout-id="${cutout.id}"][data-role="half-moon-cutout-move"]`
    )
    moveHandles.forEach(handle => {
      const edge = handle.getAttribute("data-edge") === "bottom" ? "bottom" : "top"
      const faceCenterX = absX
      const faceCenterY = edge === "bottom" ? originY + meta.cutterHeight : absY
      handle.setAttribute("cx", faceCenterX.toString())
      handle.setAttribute("cy", faceCenterY.toString())
    })

    const resizeHandles = svg.querySelectorAll<SVGCircleElement>(
      `[data-cutout-id="${cutout.id}"][data-role="half-moon-cutout-handle"]`
    )
    resizeHandles.forEach(handle => {
      const edge = handle.getAttribute("data-edge") === "bottom" ? "bottom" : "top"
      const faceCenterX = absX
      const faceCenterY = edge === "bottom" ? originY + meta.cutterHeight : absY
      handle.setAttribute("cx", (faceCenterX + radius).toString())
      handle.setAttribute("cy", faceCenterY.toString())
    })
  }

  const hasBlockingHalfMoonError = (messages: string[]) =>
    messages.some(message => message !== HALFMOON_OUTSIDE_GUSSET_ERROR)

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
    const cutoutId = target.getAttribute("data-cutout-id")
    if (!cutoutId) {
      if (selectedCutoutId) {
        setSelectedCutout(null)
      }
      return
    }
    if (!pendingSpec.halfMoonCutouts) {
      return
    }
    const cutout = pendingSpec.halfMoonCutouts.find(item => item.id === cutoutId)
    if (!cutout) {
      return
    }
    if (cutout.id !== selectedCutoutId) {
      return
    }

    const meta = getLayerMeta()
    const originOffset = Math.min(cutout.centerX, meta.cutterWidth - cutout.centerX)
    const originSide = cutout.centerX > meta.cutterWidth / 2 ? "right" : "left"
    if (
      target.getAttribute("data-role") === "half-moon-cutout" ||
      target.getAttribute("data-role") === "half-moon-cutout-hit" ||
      target.getAttribute("data-role") === "half-moon-cutout-move"
    ) {
      drag = {
        mode: "move",
        cutoutId,
        originOffset,
        originCenterX: cutout.centerX,
        originSide,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...cutout }
      }
    } else if (target.getAttribute("data-role") === "half-moon-cutout-handle") {
      drag = {
        mode: "resize",
        cutoutId,
        originOffset,
        originCenterX: cutout.centerX,
        originSide,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...cutout }
      }
    }

    if (drag) {
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.halfMoonCutouts) {
      return
    }
    const meta = getLayerMeta()
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x

    const nextCutouts = pendingSpec.halfMoonCutouts.map(cutout => {
      if (drag!.mode === "move") {
        const minOffset = meta.sealsLeft + cutout.radius
        const maxOffset = meta.cutterWidth - meta.sealsRight - cutout.radius
        const direction = drag!.originSide === "right" ? -1 : 1
        // AMENDS 6.1: snap the stored centre to the mouse movement grid within the same offset limits.
        const rawOffset = drag!.originOffset + rawDx * direction
        const isLeft = cutout.centerX <= meta.cutterWidth / 2
        const nextCenterX = isLeft
          ? snapMoveWithin(rawOffset, minOffset, maxOffset, cutout.centerX)
          : snapMoveWithin(meta.cutterWidth - rawOffset, meta.cutterWidth - maxOffset, meta.cutterWidth - minOffset, cutout.centerX)
        const moved = { ...cutout, centerX: nextCenterX, centerY: 0 }
        if (hasBlockingHalfMoonError(evaluateHalfMoonCutout(pendingSpec, moved).hardErrors)) {
          return cutout
        }
        updateCutoutDom(moved)
        return moved
      }

      const pointer = getSvgPoint(svg, event.clientX, event.clientY)
      const rawRadius = Math.abs(pointer.x - (meta.originX + drag!.originCenterX))
      const nextRadius = clampHalfMoonRadius(pendingSpec, snapResizeFromOrigin(drag!.origin.radius, rawRadius, .5))
      const resized = { ...cutout, radius: nextRadius, centerY: 0 }
      if (hasBlockingHalfMoonError(evaluateHalfMoonCutout(pendingSpec, resized).hardErrors)) {
        return cutout
      }
      updateCutoutDom(resized)
      return resized
    })

    pendingSpec = { ...pendingSpec, halfMoonCutouts: nextCutouts }
    updateWarnings()
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag) {
      return
    }
    drag = null
    svg.releasePointerCapture(event.pointerId)
    onSpecChange(pendingSpec)
    updateWarnings()
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointerleave", onPointerUp)

  updateWarnings()
}
