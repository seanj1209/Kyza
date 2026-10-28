import {
  getHangerSlotHalfHeight,
  getHangerSlotHalfWidth,
  isHangerSlotLeftClearanceViolated
} from "../constraints/hangerSlots"
import { getHangerSlotTransform, hangerSlotPath } from "../geometry/hangerSlotShapes"
import { getHangerSlotDisplayBounds } from "../geometry/hangerSlotShapes"
import type { HangerSlotSpec } from "../types/flowwrap"
import { formatMetricMeasurement } from "../core/formatMetric"
import {
  createMovementHandleImage,
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "./movementHandleImages"

const SVG_NS = "http://www.w3.org/2000/svg"

const HANGER_STYLE = {
  stroke: "#2eb774",
  strokeWidth: 0.3,
  fill: "#d9d9d9",
  fillOpacity: 0.45
}
const WARNING_STYLE = {
  fill: "#f9d9d7",
  stroke: "#d23429",
  text: "#7a1b17"
}
const HANGER_MEASURE_COLOR = "#f59f3b"

function getFaceCenterX(
  face: "fop" | "bop" | "single",
  centerX: number,
  liveWidth: number
) {
  if (face === "bop") {
    return liveWidth - centerX
  }
  return centerX
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.6
}

function appendWarningBox(
  layer: SVGGElement,
  text: string,
  style: typeof WARNING_STYLE,
  x: number,
  y: number
) {
  const fontSize = 4
  const paddingX = 3
  const paddingY = 2
  const textWidth = estimateTextWidth(text, fontSize)
  const boxWidth = textWidth + paddingX * 2
  const boxHeight = fontSize + paddingY * 2
  const rectEl = document.createElementNS(SVG_NS, "rect")
  rectEl.setAttribute("x", x.toString())
  rectEl.setAttribute("y", y.toString())
  rectEl.setAttribute("width", boxWidth.toString())
  rectEl.setAttribute("height", boxHeight.toString())
  rectEl.setAttribute("fill", style.fill)
  rectEl.setAttribute("stroke", style.stroke)
  rectEl.setAttribute("stroke-width", "0.4")
  rectEl.setAttribute("data-role", "hanger-warning")
  layer.appendChild(rectEl)

  const textEl = document.createElementNS(SVG_NS, "text")
  textEl.setAttribute("x", (x + paddingX).toString())
  textEl.setAttribute("y", (y + boxHeight - paddingY).toString())
  textEl.setAttribute("fill", style.text)
  textEl.setAttribute("font-size", fontSize.toString())
  textEl.textContent = text
  textEl.setAttribute("data-role", "hanger-warning")
  layer.appendChild(textEl)
}

export function renderHangerSlots(
  layer: SVGGElement,
  slots: HangerSlotSpec[],
  liveOriginX: number,
  liveOriginY: number,
  liveWidth: number,
  options: {
    tacFill?: string
    tacFillOpacity?: number
    tacStroke?: string
    cutterOriginX?: number
    cutterWidth?: number
  } = {}
) {
  layer.setAttribute("data-handle-radius", "2")
  layer.setAttribute("data-live-origin-x", liveOriginX.toString())
  layer.setAttribute("data-live-origin-y", liveOriginY.toString())
  layer.setAttribute("data-live-width", liveWidth.toString())
  const cutterOriginX=options.cutterOriginX??liveOriginX
  const cutterRight=cutterOriginX+(options.cutterWidth??liveWidth)
  layer.setAttribute("data-cutter-origin-x",String(cutterOriginX))
  layer.setAttribute("data-cutter-right",String(cutterRight))

  for (const slot of slots) {
    const faces: Array<"fop" | "bop" | "single"> = slot.mirrored
      ? ["fop", "bop"]
      : ["single"]
    for (const face of faces) {
      const isSelected = slot.selected === true
      const isEuroSlot =
        slot.subtype !== "round-hole"
      const slotWidth = isEuroSlot ? slot.width ?? slot.diameter : slot.diameter
      const slotHeight = isEuroSlot ? slot.height ?? slot.diameter : slot.diameter
      const halfWidth = getHangerSlotHalfWidth(slot)
      const halfHeight = getHangerSlotHalfHeight(slot)
      const bounds=getHangerSlotDisplayBounds(slot)
      const faceBounds = face === "bop" && isEuroSlot
        ? { ...bounds, left: -bounds.right, right: -bounds.left }
        : bounds
      const faceCenterX = getFaceCenterX(face, slot.centerX, liveWidth)
      const centerX = liveOriginX + faceCenterX
      const centerY = liveOriginY + slot.centerY
      const isLeftViolation = isHangerSlotLeftClearanceViolated(slot,cutterOriginX-liveOriginX)
      const isTacHole = slot.purpose === "tac-hole"
      const slotFill = isTacHole ? options.tacFill ?? HANGER_STYLE.fill : HANGER_STYLE.fill
      const slotFillOpacity = isTacHole
        ? options.tacFillOpacity ?? HANGER_STYLE.fillOpacity
        : HANGER_STYLE.fillOpacity
      const stroke = isTacHole
        ? options.tacStroke ?? "#65747a"
        : isLeftViolation ? WARNING_STYLE.stroke : HANGER_STYLE.stroke
      if (isEuroSlot) {
        for(const hit of [false,true]){
          const path=document.createElementNS(SVG_NS,"path")
          path.setAttribute("d",hangerSlotPath(slot.subtype))
          path.setAttribute("transform", getHangerSlotTransform(centerX, centerY, slotWidth, slotHeight, face === "bop"))
          path.setAttribute("fill",hit?"transparent":slotFill)
          path.setAttribute("fill-opacity",hit?"0":String(slotFillOpacity))
          path.setAttribute("stroke",hit?"none":stroke)
          path.setAttribute("stroke-width",String(HANGER_STYLE.strokeWidth))
          path.setAttribute("vector-effect","non-scaling-stroke")
          path.setAttribute("pointer-events",hit?"all":"stroke")
          path.setAttribute("cursor","move")
          path.setAttribute("data-slot-id",slot.id)
          path.setAttribute("data-role",hit?"hanger-slot-hit":"hanger-slot")
          path.setAttribute("data-face",face)
          path.setAttribute("data-selected",String(isSelected))
          layer.appendChild(path)
        }
      } else {
        const circle = document.createElementNS(SVG_NS, "circle")
        circle.setAttribute("cx", centerX.toString())
        circle.setAttribute("cy", centerY.toString())
        circle.setAttribute("r", halfWidth.toString())
        circle.setAttribute("fill", slotFill)
        circle.setAttribute("fill-opacity", slotFillOpacity.toString())
        circle.setAttribute("stroke", stroke)
        circle.setAttribute("stroke-width", HANGER_STYLE.strokeWidth.toString())
        circle.setAttribute("pointer-events", "stroke")
        circle.setAttribute("cursor", "move")
        circle.setAttribute("data-slot-id", slot.id)
        circle.setAttribute("data-role", "hanger-slot")
        circle.setAttribute("data-face", face)
        circle.setAttribute("data-selected", isSelected ? "true" : "false")
        layer.appendChild(circle)

        const hitbox = document.createElementNS(SVG_NS, "circle")
        hitbox.setAttribute("cx", centerX.toString())
        hitbox.setAttribute("cy", centerY.toString())
        hitbox.setAttribute("r", halfWidth.toString())
        hitbox.setAttribute("fill", "transparent")
        hitbox.setAttribute("pointer-events", "all")
        hitbox.setAttribute("cursor", "move")
        hitbox.setAttribute("data-slot-id", slot.id)
        hitbox.setAttribute("data-role", "hanger-slot-hit")
        hitbox.setAttribute("data-face", face)
        hitbox.setAttribute("data-selected", isSelected ? "true" : "false")
        layer.appendChild(hitbox)
      }

      if (face === "fop" || face === "single") {
        const leftEdge = liveOriginX + slot.centerX + bounds.left
        const measureY = Math.max(liveOriginY + 2, centerY)
        const leftLine = document.createElementNS(SVG_NS, "line")
        leftLine.setAttribute("x1", cutterOriginX.toString())
        leftLine.setAttribute("y1", measureY.toString())
        leftLine.setAttribute("x2", leftEdge.toString())
        leftLine.setAttribute("y2", measureY.toString())
        leftLine.setAttribute("stroke", HANGER_MEASURE_COLOR)
        leftLine.setAttribute("stroke-width", "0.3")
        leftLine.setAttribute("data-slot-id", slot.id)
        leftLine.setAttribute("data-role", "hanger-slot-measure-left")
        leftLine.setAttribute("data-selected", isSelected ? "true" : "false")
        leftLine.setAttribute("data-face", face)
        layer.appendChild(leftLine)

        const leftText = document.createElementNS(SVG_NS, "text")
        leftText.setAttribute("x", ((cutterOriginX + leftEdge) / 2).toString())
        leftText.setAttribute("y", (measureY - 3).toString())
        leftText.setAttribute("fill", HANGER_MEASURE_COLOR)
        leftText.setAttribute("font-size", "3")
        leftText.setAttribute("text-anchor", "middle")
        leftText.setAttribute("dominant-baseline", "middle")
        leftText.textContent = formatMetricMeasurement(leftEdge-cutterOriginX)
        leftText.setAttribute("data-slot-id", slot.id)
        leftText.setAttribute("data-role", "hanger-slot-measure-left-text")
        leftText.setAttribute("data-selected", isSelected ? "true" : "false")
        leftText.setAttribute("data-face", face)
        layer.appendChild(leftText)
      }

      if (face === "bop" || face === "single") {
        const rightEdge = liveOriginX + (liveWidth - slot.centerX) + faceBounds.right
        const rightSeal = cutterRight
        const measureY = Math.max(liveOriginY + 2, centerY)
        const rightLine = document.createElementNS(SVG_NS, "line")
        rightLine.setAttribute("x1", rightEdge.toString())
        rightLine.setAttribute("y1", measureY.toString())
        rightLine.setAttribute("x2", rightSeal.toString())
        rightLine.setAttribute("y2", measureY.toString())
        rightLine.setAttribute("stroke", HANGER_MEASURE_COLOR)
        rightLine.setAttribute("stroke-width", "0.3")
        rightLine.setAttribute("data-slot-id", slot.id)
        rightLine.setAttribute("data-role", "hanger-slot-measure-right")
        rightLine.setAttribute("data-selected", isSelected ? "true" : "false")
        rightLine.setAttribute("data-face", face)
        layer.appendChild(rightLine)

        const rightText = document.createElementNS(SVG_NS, "text")
        rightText.setAttribute("x", ((rightEdge + rightSeal) / 2).toString())
        rightText.setAttribute("y", (measureY - 3).toString())
        rightText.setAttribute("fill", HANGER_MEASURE_COLOR)
        rightText.setAttribute("font-size", "3")
        rightText.setAttribute("text-anchor", "middle")
        rightText.setAttribute("dominant-baseline", "middle")
        rightText.textContent = formatMetricMeasurement(rightSeal-rightEdge)
        rightText.setAttribute("data-slot-id", slot.id)
        rightText.setAttribute("data-role", "hanger-slot-measure-right-text")
        rightText.setAttribute("data-selected", isSelected ? "true" : "false")
        rightText.setAttribute("data-face", face)
        layer.appendChild(rightText)
      }

      if (isSelected && (face === "fop" || face === "single") && !isEuroSlot) {
        const leftEdge = liveOriginX + slot.centerX - halfWidth
        const rightEdge = liveOriginX + slot.centerX + halfWidth
        const diameterLineY = centerY + halfWidth + 3
        const diameterLine = document.createElementNS(SVG_NS, "line")
        diameterLine.setAttribute("x1", leftEdge.toString())
        diameterLine.setAttribute("y1", diameterLineY.toString())
        diameterLine.setAttribute("x2", rightEdge.toString())
        diameterLine.setAttribute("y2", diameterLineY.toString())
        diameterLine.setAttribute("stroke", HANGER_MEASURE_COLOR)
        diameterLine.setAttribute("stroke-width", "0.3")
        diameterLine.setAttribute("data-slot-id", slot.id)
        diameterLine.setAttribute("data-role", "hanger-slot-diameter")
        diameterLine.setAttribute("data-selected", "true")
        layer.appendChild(diameterLine)

        const diameterText = document.createElementNS(SVG_NS, "text")
        diameterText.setAttribute("x", ((leftEdge + rightEdge) / 2).toString())
        diameterText.setAttribute("y", (diameterLineY + 3).toString())
        diameterText.setAttribute("fill", HANGER_MEASURE_COLOR)
        diameterText.setAttribute("font-size", "3")
        diameterText.setAttribute("text-anchor", "middle")
        diameterText.setAttribute("dominant-baseline", "middle")
        diameterText.textContent = `D ${formatMetricMeasurement(slot.diameter)}`
        diameterText.setAttribute("data-slot-id", slot.id)
        diameterText.setAttribute("data-role", "hanger-slot-diameter-text")
        diameterText.setAttribute("data-selected", "true")
        layer.appendChild(diameterText)
      }

      if (isSelected) {
        // The silhouette is rotated for production display, so the visible
        // selection bounds are the authored height by authored width.
        const boundsWidth = faceBounds.right-faceBounds.left
        const boundsHeight = faceBounds.bottom-faceBounds.top
        const boundsX = centerX+faceBounds.left
        const boundsY = centerY+faceBounds.top
        const moveCenter = getMoveHandleCenter(
          boundsX,
          boundsY,
          boundsWidth,
          boundsHeight
        )
        const moveHandle = createMovementHandleImage("move", moveCenter.x, moveCenter.y)
        moveHandle.setAttribute("pointer-events", "all")
        moveHandle.setAttribute("cursor", "move")
        moveHandle.setAttribute("data-slot-id", slot.id)
        moveHandle.setAttribute("data-role", "hanger-slot-move")
        moveHandle.setAttribute("data-face", face)
        layer.appendChild(moveHandle)

        const corners = getSquareResizeCorners(
          boundsX,
          boundsY,
          boundsWidth,
          boundsHeight
        )
        corners.forEach(corner => {
          const handle = createMovementHandleImage("resize", corner.x, corner.y)
          handle.setAttribute("pointer-events", "all")
          handle.setAttribute("cursor", `${corner.key}-resize`)
          handle.setAttribute("data-slot-id", slot.id)
          handle.setAttribute("data-handle", corner.key)
          handle.setAttribute("data-role", "hanger-slot-handle")
          handle.setAttribute("data-face", face)
          layer.appendChild(handle)
        })

        const rotateCenter = getRotateHandleCenter(boundsX, boundsY, boundsWidth)
        const rotateHandle = createMovementHandleImage("rotate", rotateCenter.x, rotateCenter.y)
        rotateHandle.setAttribute("pointer-events", "all")
        rotateHandle.setAttribute("cursor", "grab")
        rotateHandle.setAttribute("data-slot-id", slot.id)
        rotateHandle.setAttribute("data-handle", "top")
        rotateHandle.setAttribute("data-role", "hanger-slot-rotate")
        rotateHandle.setAttribute("data-face", face)
        layer.appendChild(rotateHandle)
      }
    }
  }
}

export function renderHangerSlotWarnings(
  warningLayer: SVGGElement,
  slots: HangerSlotSpec[],
  liveOriginX: number,
  liveOriginY: number,
  cutterOriginX=liveOriginX
) {
  warningLayer
    .querySelectorAll("[data-role=\"hanger-warning\"]")
    .forEach(node => node.remove())

  if (!slots.length) {
    return
  }

  slots.forEach(slot => {
    const halfWidth = getHangerSlotHalfWidth(slot)
    const centerX = liveOriginX + slot.centerX
    const centerY = liveOriginY + slot.centerY
    const boxX = centerX + halfWidth + 4
    let offsetY = -10
    const shouldWarnLeft = isHangerSlotLeftClearanceViolated(slot,cutterOriginX-liveOriginX)
    if (shouldWarnLeft) {
      appendWarningBox(
        warningLayer,
        "Hanger slot must be at least 10mm from the cutter edge.",
        WARNING_STYLE,
        boxX,
        centerY + offsetY
      )
      offsetY += 14
    }
  })
}
