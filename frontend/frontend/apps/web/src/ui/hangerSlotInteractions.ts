import {
  HANGER_SLOT_SIDE_CLEARANCE_MM,
  HANGER_SLOT_MIN_WIDTH_MM,
  HANGER_SLOT_MIN_HEIGHT_MM,
  HANGER_SLOT_MAX_WIDTH_MM,
  HANGER_SLOT_MAX_HEIGHT_MM,
  clampHangerSlotDiameter,
  clampHangerSlotHeight,
  clampHangerSlotWidth,
  getHangerSlotHalfHeight,
  getHangerSlotHalfWidth,
  isHangerSlotLeftClearanceViolated
} from "../constraints/hangerSlots"
import { getHangerSlotDisplayBounds, getHangerSlotTransform, hangerSlotPath } from "../geometry/hangerSlotShapes"
import { resolveFlowwrapGeometry } from "../geometry/flowwrapGeometry"
import { getMoveHandleCenter, getRotateHandleCenter, getSquareResizeCorners } from "../renderers/movementHandleImages"
import { renderHangerSlotWarnings } from "../renderers/svgHangerSlots"
import {
  clampKSealTacHole,
  isKSealTacHole
} from "../rules/kSealTacHoleRules"
import type { FlowwrapSpec, HangerSlotSpec } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"
import { snapResizeFromOrigin } from "./resizeSnap"
import { snapMovedElement } from "./movementSnap"

type DragState = {
  mode: "move" | "resize"
  slotId: string
  handle?: string
  startX: number
  startY: number
  mirroredFace?: boolean
  origin: HangerSlotSpec
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


export function attachHangerSlotInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec
  let selectedSlotId =
    pendingSpec.hangerSlots?.find(slot => slot.selected)?.id ?? null

  const setSelectedSlot = (slotId: string | null) => {
    if (!pendingSpec.hangerSlots) {
      selectedSlotId = null
      return
    }
    selectedSlotId = slotId
    pendingSpec = {
      ...pendingSpec,
      hangerSlots: pendingSpec.hangerSlots.map(slot => ({
        ...slot,
        selected: slot.id === slotId
      }))
    }
    onSpecChange(pendingSpec)
  }

  const getLayerMeta = () => {
    const layer = svg.querySelector("g#hanger_slots")
    if (!layer) {
      return { liveX: 0, liveY: 0, liveWidth: 0, cutterX:0, cutterRight:0, handleRadius: 0.5 }
    }
    const liveX = Number(layer.getAttribute("data-live-origin-x") ?? "0")
    const liveY = Number(layer.getAttribute("data-live-origin-y") ?? "0")
    const liveWidth = Number(layer.getAttribute("data-live-width") ?? "0")
    const cutterX = Number(layer.getAttribute("data-cutter-origin-x") ?? liveX)
    const cutterRight = Number(layer.getAttribute("data-cutter-right") ?? liveX+liveWidth)
    const handleRadius = Number(layer.getAttribute("data-handle-radius") ?? "0.5")
    return { liveX, liveY, liveWidth, cutterX, cutterRight, handleRadius }
  }

  const updateWarnings = () => {
    const warningLayer = svg.querySelector<SVGGElement>("g#soft_warnings")
    if (!warningLayer) {
      return
    }
    const slots = pendingSpec.hangerSlots ?? []
    const { liveX, liveY, cutterX } = getLayerMeta()
    renderHangerSlotWarnings(warningLayer, slots, liveX, liveY,cutterX)
  }

  const updateSlotDom = (slot: HangerSlotSpec) => {
    const { liveX, liveY, liveWidth, cutterX, cutterRight } = getLayerMeta()
    const isEuroSlot =
      slot.subtype !== "round-hole"
    const slotWidth = isEuroSlot ? slot.width ?? slot.diameter : slot.diameter
    const slotHeight = isEuroSlot ? slot.height ?? slot.diameter : slot.diameter
    const halfWidth = getHangerSlotHalfWidth(slot)
    const halfHeight = getHangerSlotHalfHeight(slot)
    const bounds=getHangerSlotDisplayBounds(slot)
    const absX = liveX + slot.centerX
    const absY = liveY + slot.centerY
    const isLeftViolation = isHangerSlotLeftClearanceViolated(slot,cutterX-liveX)
    const stroke = isLeftViolation ? "#d23429" : "#2eb774"

    const shapes = svg.querySelectorAll<SVGGraphicsElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot"],` +
        `[data-slot-id="${slot.id}"][data-role="hanger-slot-hit"]`
    )
    shapes.forEach(shape => {
      const face = shape.getAttribute("data-face")
      const faceCenterX = face === "bop" ? liveX + (liveWidth - slot.centerX) : absX
      if (shape instanceof SVGCircleElement) {
        shape.setAttribute("cx", faceCenterX.toString())
        shape.setAttribute("cy", absY.toString())
        shape.setAttribute("r", halfWidth.toString())
      } else if (shape instanceof SVGRectElement) {
        shape.setAttribute("x", (faceCenterX - slotWidth / 2).toString())
        shape.setAttribute("y", (absY - slotHeight / 2).toString())
        shape.setAttribute("width", slotWidth.toString())
        shape.setAttribute("height", slotHeight.toString())
        shape.setAttribute("rx", (slotHeight / 2).toString())
        shape.setAttribute("ry", (slotHeight / 2).toString())
        shape.setAttribute("transform", `rotate(-90 ${faceCenterX} ${absY})`)
      } else if (shape instanceof SVGPathElement) {
        const scaleX = slotWidth
        const scaleY = slotHeight
        shape.setAttribute("d", hangerSlotPath(slot.subtype))
        shape.setAttribute(
          "transform",
          getHangerSlotTransform(faceCenterX, absY, scaleX, scaleY, face === "bop")
        )
      }
      if (shape.getAttribute("data-role") === "hanger-slot") {
        shape.setAttribute("stroke", stroke)
      }
    })

    const handles = svg.querySelectorAll<SVGImageElement>(
      `image[data-slot-id="${slot.id}"]`
    )
    handles.forEach(handle => {
      const face = handle.getAttribute("data-face")
      const faceCenterX = face === "bop" ? liveX + (liveWidth - slot.centerX) : absX
      const faceBounds = face === "bop" && isEuroSlot ? { ...bounds, left: -bounds.right, right: -bounds.left } : bounds
      const displayWidth = faceBounds.right-faceBounds.left
      const displayHeight = bounds.bottom-bounds.top
      const x=faceCenterX+faceBounds.left,y=absY+bounds.top
      const role=handle.getAttribute("data-role")
      const center=role==="hanger-slot-move" ? getMoveHandleCenter(x,y,displayWidth,displayHeight)
        : role==="hanger-slot-rotate" ? getRotateHandleCenter(x,y,displayWidth)
        : getSquareResizeCorners(x,y,displayWidth,displayHeight).find(c=>c.key===handle.getAttribute("data-handle"))
      if(!center)return
      handle.setAttribute("x",String(center.x-Number(handle.getAttribute("width"))/2))
      handle.setAttribute("y",String(center.y-Number(handle.getAttribute("height"))/2))
    })

    svg.querySelector('[data-role="hanger-size-readout"]')?.remove()
    if (drag?.mode === "resize") {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
      label.setAttribute("data-role", "hanger-size-readout")
      label.setAttribute("x", String(absX + bounds.right + 4))
      label.setAttribute("y", String(absY + bounds.bottom + 3))
      label.setAttribute("font-size", "3")
      label.setAttribute("fill", "#59666c")
      label.setAttribute("pointer-events", "none")
      label.textContent = slot.subtype === "round-hole" ? `Ø ${formatMetricMeasurement(slot.diameter)}` : `${formatMetricMeasurement(slot.width ?? slot.diameter)} × ${formatMetricMeasurement(slot.height ?? slot.diameter)}`
      svg.appendChild(label)
    }

    const leftLines = svg.querySelectorAll<SVGLineElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot-measure-left"]`
    )
    leftLines.forEach(line => {
      const face = line.getAttribute("data-face")
      if (face === "bop") {
        return
      }
      const leftEdge = absX + bounds.left
      const measureY = Math.max(liveY + 2, absY)
      line.setAttribute("x1", cutterX.toString())
      line.setAttribute("y1", measureY.toString())
      line.setAttribute("x2", leftEdge.toString())
      line.setAttribute("y2", measureY.toString())
    })

    const leftText = svg.querySelectorAll<SVGTextElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot-measure-left-text"]`
    )
    leftText.forEach(text => {
      const face = text.getAttribute("data-face")
      if (face === "bop") {
        return
      }
      const leftEdge = absX + bounds.left
      const measureY = Math.max(liveY + 2, absY)
      text.setAttribute("x", ((cutterX + leftEdge) / 2).toString())
      text.setAttribute("y", (measureY - 3).toString())
      text.textContent = formatMetricMeasurement(leftEdge-cutterX)
    })

    const rightLines = svg.querySelectorAll<SVGLineElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot-measure-right"]`
    )
    rightLines.forEach(line => {
      const face = line.getAttribute("data-face")
      const faceCenterX =
        face === "bop" ? liveX + (liveWidth - slot.centerX) : absX
      const rightEdge = faceCenterX + (face === "bop" && isEuroSlot ? -bounds.left : bounds.right)
      const rightSeal = cutterRight
      const measureY = Math.max(liveY + 2, absY)
      line.setAttribute("x1", rightEdge.toString())
      line.setAttribute("y1", measureY.toString())
      line.setAttribute("x2", rightSeal.toString())
      line.setAttribute("y2", measureY.toString())
    })

    const rightText = svg.querySelectorAll<SVGTextElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot-measure-right-text"]`
    )
    rightText.forEach(text => {
      const face = text.getAttribute("data-face")
      const faceCenterX =
        face === "bop" ? liveX + (liveWidth - slot.centerX) : absX
      const rightEdge = faceCenterX + (face === "bop" && isEuroSlot ? -bounds.left : bounds.right)
      const rightSeal = cutterRight
      const measureY = Math.max(liveY + 2, absY)
      text.setAttribute("x", ((rightEdge + rightSeal) / 2).toString())
      text.setAttribute("y", (measureY - 3).toString())
      text.textContent = formatMetricMeasurement(rightSeal-rightEdge)
    })

    const diameterLines = svg.querySelectorAll<SVGLineElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot-diameter"]`
    )
    diameterLines.forEach(line => {
      if (slot.subtype !== "round-hole") {
        return
      }
      const leftEdge = absX - halfWidth
      const rightEdge = absX + halfWidth
      const diameterLineY = absY + halfWidth + 3
      line.setAttribute("x1", leftEdge.toString())
      line.setAttribute("y1", diameterLineY.toString())
      line.setAttribute("x2", rightEdge.toString())
      line.setAttribute("y2", diameterLineY.toString())
    })

    const diameterText = svg.querySelectorAll<SVGTextElement>(
      `[data-slot-id="${slot.id}"][data-role="hanger-slot-diameter-text"]`
    )
    diameterText.forEach(text => {
      if (slot.subtype !== "round-hole") {
        return
      }
      const leftEdge = absX - halfWidth
      const rightEdge = absX + halfWidth
      const diameterLineY = absY + halfWidth + 3
      text.setAttribute("x", ((leftEdge + rightEdge) / 2).toString())
      text.setAttribute("y", (diameterLineY + 3).toString())
      text.textContent = `D ${formatMetricMeasurement(slot.diameter)}`
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
    const slotId = target.getAttribute("data-slot-id")
    if (!slotId) {
      if (selectedSlotId) {
        setSelectedSlot(null)
      }
      return
    }
    if (!pendingSpec.hangerSlots) {
      return
    }
    const slot = pendingSpec.hangerSlots.find(s => s.id === slotId)
    if (!slot) {
      return
    }
    if (slot.id !== selectedSlotId) {
      return
    }

    if (
      target.getAttribute("data-role") === "hanger-slot" ||
      target.getAttribute("data-role") === "hanger-slot-hit" ||
      target.getAttribute("data-role") === "hanger-slot-move"
    ) {
      drag = {
        mode: "move",
        slotId,
        startX: event.clientX,
        startY: event.clientY,
        mirroredFace: target.getAttribute("data-face") === "bop",
        origin: { ...slot }
      }
    } else if (target.getAttribute("data-role") === "hanger-slot-handle") {
      drag = {
        mode: "resize",
        slotId,
        handle: target.getAttribute("data-handle") ?? "se",
        startX: event.clientX,
        startY: event.clientY,
        mirroredFace: target.getAttribute("data-face") === "bop",
        origin: { ...slot }
      }
    }

    if (drag) {
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.hangerSlots) {
      return
    }
    const { liveWidth } = getLayerMeta()
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x
    const rawDy = current.y - start.y
    const dx = snap(rawDx, 1)
    const dy = snap(rawDy, 1)

    const nextSlots = pendingSpec.hangerSlots.map(slot => {
      if (slot.id !== drag!.slotId) {
        return slot
      }
      if (drag!.mode === "move") {
        // AMENDS 6.1: snap the resulting centre to the mouse movement grid.
        if (pendingSpec.kSealPouch && isKSealTacHole(slot)) {
          const moved = snapMovedElement(
            { ...slot, centerX: drag!.origin.centerX + rawDx, centerY: drag!.origin.centerY + rawDy },
            ["centerX", "centerY"],
            next => clampKSealTacHole(pendingSpec, next),
            drag!.origin
          )
          updateSlotDom(moved)
          return moved
        }
        const bounds=getHangerSlotDisplayBounds(slot)
        const liveHeight=resolveFlowwrapGeometry(pendingSpec).liveRect.height
        const moved = snapMovedElement(
          {
            ...slot,
            // A centred hanger remains on its face's fixed vertical axis.
            centerX: drag!.origin.centerX + rawDx * (drag!.mirroredFace ? -1 : 1),
            centerY: drag!.origin.centerY + rawDy
          },
          ["centerX", "centerY"],
          next => ({
            ...next,
            centerX: Math.max(-bounds.left, Math.min(liveWidth / 2 - bounds.right, next.centerX)),
            centerY: Math.max(-bounds.top, Math.min(liveHeight - bounds.bottom, next.centerY))
          }),
          drag!.origin
        )
        updateSlotDom(moved)
        return moved
      }

      const originCenterY = drag!.origin.centerY
      const pointer = getSvgPoint(svg, event.clientX, event.clientY)
      const { liveX, liveY } = getLayerMeta()
      const lockedCenterX = drag!.origin.centerX
      if (slot.subtype !== "round-hole") {
        const originalWidth=drag!.origin.width??drag!.origin.diameter
        const originalHeight=drag!.origin.height??drag!.origin.diameter
        const originalBounds=getHangerSlotDisplayBounds(drag!.origin)
        const sx=1+2*rawDx*(drag!.handle?.includes('w')?-1:1)/(originalBounds.right-originalBounds.left)
        const sy=1+2*rawDy*(drag!.handle?.includes('n')?-1:1)/(originalBounds.bottom-originalBounds.top)
        const desired=1+((sx-1)+(sy-1))/2
        const minScale=Math.max(HANGER_SLOT_MIN_WIDTH_MM/originalWidth,HANGER_SLOT_MIN_HEIGHT_MM/originalHeight)
        const axis=drag!.origin.centerX
        const {liveX,cutterX,cutterRight}=getLayerMeta()
        const cutterHalf=Math.min(liveX+axis-cutterX,cutterRight-liveX-axis)-HANGER_SLOT_SIDE_CLEARANCE_MM
        const maxByCutter=cutterHalf/Math.max(.001,getHangerSlotHalfWidth(drag!.origin))
        const maxScale=Math.max(minScale,Math.min(HANGER_SLOT_MAX_WIDTH_MM/originalWidth,HANGER_SLOT_MAX_HEIGHT_MM/originalHeight,maxByCutter))
        const steppedWidth=snapResizeFromOrigin(originalWidth,originalWidth*desired)
        const scale=Math.max(minScale,Math.min(maxScale,steppedWidth/originalWidth))
        const nextWidth=originalWidth*scale
        const nextHeight=originalHeight*scale
        const resized = {
          ...slot,
          centerX: lockedCenterX,
          centerY: originCenterY,
          width: nextWidth,
          height: nextHeight,
          diameter: slot.diameter
        }
        updateSlotDom(resized)
        return resized
      }
      const dxRadius = pointer.x - (liveX + lockedCenterX)
      const rawRadius = Math.abs(dxRadius)
      const rawDiameter = rawRadius * 2
      const nextDiameter = clampHangerSlotDiameter(snapResizeFromOrigin(drag!.origin.diameter, rawDiameter), liveWidth)
      const resized = {
        ...slot,
        centerX: lockedCenterX,
        centerY: originCenterY,
        diameter: nextDiameter
      }
      const constrained =
        pendingSpec.kSealPouch && isKSealTacHole(slot)
          ? clampKSealTacHole(pendingSpec, resized)
          : resized
      updateSlotDom(constrained)
      return constrained
    })

    pendingSpec = { ...pendingSpec, hangerSlots: nextSlots }
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
}
