import type { AttributeBoxSpec, RenderMode } from "../types/flowwrap"
import { createTextDirectionArt } from "./textDirectionArt"
import {
  createMovementHandleImage,
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "./movementHandleImages"

const SVG_NS = "http://www.w3.org/2000/svg"
const CLEAR_STRIP_FILL = "#f4fbff"
const CLEAR_STRIP_OPACITY = "0.82"
const CLEAR_STRIP_HANDLE_RADIUS = 2.4

const ATTRIBUTE_STYLE = {
  stroke: "#1a2a49",
  strokeWidth: 0.3
}
const LABEL_STYLE = {
  text: "#2eb774"
}
const ROTATE_LABEL_FILL = "#f59f3b"

function applyRotation(
  element: SVGElement,
  rotation: number,
  cx: number,
  cy: number
) {
  if (rotation === 0) {
    element.removeAttribute("transform")
    return
  }
  element.setAttribute("transform", `rotate(${rotation} ${cx} ${cy})`)
}

function setElementVisibility(element: SVGElement, visible: boolean) {
  element.setAttribute("display", visible ? "inline" : "none")
}

function appendClearStripResizeHandle(
  layer: SVGGElement,
  boxId: string,
  laneIndex: number,
  handle: "left" | "right",
  cx: number,
  cy: number,
  visible: boolean
) {
  const circle = document.createElementNS(SVG_NS, "circle")
  circle.setAttribute("cx", cx.toString())
  circle.setAttribute("cy", cy.toString())
  circle.setAttribute("r", CLEAR_STRIP_HANDLE_RADIUS.toString())
  circle.setAttribute("fill", "#ffffff")
  circle.setAttribute("stroke", "#94a3b8")
  circle.setAttribute("stroke-width", "0.5")
  circle.setAttribute("pointer-events", "all")
  circle.setAttribute("cursor", handle === "left" ? "w-resize" : "e-resize")
  circle.setAttribute("data-box-id", boxId)
  circle.setAttribute("data-handle", handle)
  circle.setAttribute("data-lane-index", laneIndex.toString())
  circle.setAttribute("data-role", "attribute-box-handle")
  setElementVisibility(circle, visible)
  layer.appendChild(circle)
}

export function renderAttributeBoxes(
  layer: SVGGElement,
  boxes: AttributeBoxSpec[],
  liveOriginX: number,
  liveOriginY: number,
  laneIndex = 0,
  isBoxVisible: ((box: AttributeBoxSpec) => boolean) | null = null,
  renderMode: RenderMode = "edit"
) {
  const packId = layer.getAttribute("data-pack-id") ?? ""
  const cutterOriginX = Number(layer.getAttribute("data-cutter-origin-x") ?? liveOriginX.toString())
  const cutterOriginY = Number(layer.getAttribute("data-cutter-origin-y") ?? liveOriginY.toString())
  const cutterHeight = Number(layer.getAttribute("data-cutter-height") ?? "0")
  const stepEnabled = layer.getAttribute("data-sachet-step-enabled") === "true"
  const stepSpan = Number(layer.getAttribute("data-sachet-step-span") ?? "0")
  const isPaperStrip = packId === "paper-strip"

  layer.setAttribute("data-handle-radius", "2")
  layer.setAttribute("data-rotate-handle-radius", "2")

  for (const box of boxes) {
    if (box.enabled === false) {
      continue
    }

    const visible = isBoxVisible ? isBoxVisible(box) : true
    const isSelected = box.selected === true
    const isLabel = box.kind === "label"
    const isClearStrip = isPaperStrip && box.kind === "clear-strip"
    const laneOffset =
      isClearStrip && stepEnabled && stepSpan > 0 ? laneIndex * stepSpan : 0
    const absX = (isClearStrip ? cutterOriginX : liveOriginX) + laneOffset + box.x
    const boxY = isClearStrip ? 0 : box.y
    const boxHeight = isClearStrip ? cutterHeight : box.height
    const absY = (isClearStrip ? cutterOriginY : liveOriginY) + boxY
    const rotation = isClearStrip ? 0 : (box.rotation ?? 0)
    const centerX = absX + box.width / 2
    const centerY = absY + boxHeight / 2

    const rect = document.createElementNS(SVG_NS, "rect")
    rect.setAttribute("x", absX.toString())
    rect.setAttribute("y", absY.toString())
    rect.setAttribute("width", box.width.toString())
    rect.setAttribute("height", boxHeight.toString())
    rect.setAttribute("fill", isClearStrip ? CLEAR_STRIP_FILL : "none")
    rect.setAttribute("fill-opacity", isClearStrip ? CLEAR_STRIP_OPACITY : "0")
    rect.setAttribute("stroke", isLabel || isClearStrip ? "none" : ATTRIBUTE_STYLE.stroke)
    rect.setAttribute(
      "stroke-width",
      (isLabel || isClearStrip ? 0 : ATTRIBUTE_STYLE.strokeWidth).toString()
    )
    rect.setAttribute("shape-rendering", "crispEdges")
    rect.setAttribute(
      "pointer-events",
      renderMode === "edit" && !isClearStrip ? "stroke" : "none"
    )
    rect.setAttribute("cursor", renderMode === "edit" ? "move" : "default")
    rect.setAttribute("data-box-id", box.id)
    rect.setAttribute("data-role", "attribute-box")
    rect.setAttribute("data-kind", box.kind)
    rect.setAttribute("data-lane-index", laneIndex.toString())
    rect.setAttribute("data-selected", isSelected ? "true" : "false")
    setElementVisibility(rect, visible)
    applyRotation(rect, rotation, centerX, centerY)
    layer.appendChild(rect)

    const hitbox = document.createElementNS(SVG_NS, "rect")
    hitbox.setAttribute("x", absX.toString())
    hitbox.setAttribute("y", absY.toString())
    hitbox.setAttribute("width", box.width.toString())
    hitbox.setAttribute("height", boxHeight.toString())
    hitbox.setAttribute("fill", "transparent")
    hitbox.setAttribute("pointer-events", "all")
    hitbox.setAttribute("cursor", "move")
    hitbox.setAttribute("data-box-id", box.id)
    hitbox.setAttribute("data-role", "attribute-box")
    hitbox.setAttribute("data-kind", box.kind)
    hitbox.setAttribute("data-lane-index", laneIndex.toString())
    hitbox.setAttribute("data-selected", isSelected ? "true" : "false")
    setElementVisibility(hitbox, visible)
    applyRotation(hitbox, rotation, centerX, centerY)
    layer.appendChild(hitbox)

    if (isSelected && renderMode === "edit") {
      const moveCenter = getMoveHandleCenter(absX, absY, box.width, boxHeight)
      const moveHandle = createMovementHandleImage("move", moveCenter.x, moveCenter.y)
      moveHandle.setAttribute("pointer-events", "all")
      moveHandle.setAttribute("cursor", "move")
      moveHandle.setAttribute("data-box-id", box.id)
      moveHandle.setAttribute("data-lane-index", laneIndex.toString())
      moveHandle.setAttribute("data-role", "attribute-box-move")
      setElementVisibility(moveHandle, visible)
      applyRotation(moveHandle, rotation, centerX, centerY)
      layer.appendChild(moveHandle)

      const corners = getSquareResizeCorners(absX, absY, box.width, boxHeight)
      if (isClearStrip) {
        appendClearStripResizeHandle(
          layer,
          box.id,
          laneIndex,
          "left",
          absX,
          absY + boxHeight / 2,
          visible
        )
        appendClearStripResizeHandle(
          layer,
          box.id,
          laneIndex,
          "right",
          absX + box.width,
          absY + boxHeight / 2,
          visible
        )
      } else {
        for (const corner of corners) {
          const handle = createMovementHandleImage("resize", corner.x, corner.y)
          handle.setAttribute("pointer-events", "all")
          handle.setAttribute("cursor", `${corner.key}-resize`)
          handle.setAttribute("data-box-id", box.id)
          handle.setAttribute("data-handle", corner.key)
          handle.setAttribute("data-lane-index", laneIndex.toString())
          handle.setAttribute("data-role", "attribute-box-handle")
          setElementVisibility(handle, visible)
          applyRotation(handle, rotation, centerX, centerY)
          layer.appendChild(handle)
        }
      }

      if (!isClearStrip) {
        const rotateCenter = getRotateHandleCenter(absX, absY, box.width)
        const rotateHandle = createMovementHandleImage("rotate", rotateCenter.x, rotateCenter.y)
        rotateHandle.setAttribute("pointer-events", "all")
        rotateHandle.setAttribute("cursor", "grab")
        rotateHandle.setAttribute("data-box-id", box.id)
        rotateHandle.setAttribute("data-lane-index", laneIndex.toString())
        rotateHandle.setAttribute("data-handle", "top")
        rotateHandle.setAttribute("data-role", "attribute-box-rotate")
        setElementVisibility(rotateHandle, visible)
        applyRotation(rotateHandle, rotation, centerX, centerY)
        layer.appendChild(rotateHandle)

        const rotateLabel = document.createElementNS(SVG_NS, "text")
        rotateLabel.setAttribute("x", (absX + box.width + 2).toString())
        rotateLabel.setAttribute("y", (absY - 2).toString())
        rotateLabel.setAttribute("fill", ROTATE_LABEL_FILL)
        rotateLabel.setAttribute("font-size", "3.2")
        rotateLabel.setAttribute("text-anchor", "start")
        rotateLabel.setAttribute("dominant-baseline", "central")
        rotateLabel.setAttribute("pointer-events", "none")
        rotateLabel.setAttribute("opacity", "0")
        rotateLabel.setAttribute("data-box-id", box.id)
        rotateLabel.setAttribute("data-lane-index", laneIndex.toString())
        rotateLabel.setAttribute("data-role", "attribute-box-rotate-label")
        rotateLabel.textContent = `${Math.round(rotation)}°`
        setElementVisibility(rotateLabel, visible)
        layer.appendChild(rotateLabel)
      }
    }

    if (isClearStrip) {
      continue
    }

    if (box.labelKey === "text-direction") {
      const art = createTextDirectionArt(box.id,laneIndex,absX,absY,box.width,boxHeight,rotation)
      setElementVisibility(art,visible)
      layer.appendChild(art)
      continue
    }
    const labelText =
      box.kind === "label"
        ? (box.label ?? box.labelKey ?? "LABEL")
        : box.kind === "barcode"
          ? "BARCODE"
          : box.kind === "qr"
            ? "QR"
            : "BBE"
    const normalizedLabel = labelText.toUpperCase()
    const baseFont = Math.max(3, Math.min(10, box.height * 0.6))
    const maxFont = box.width / Math.max(1, normalizedLabel.length * 0.6)
    const fontSize = Math.max(2, Math.min(baseFont, maxFont))
    const label = document.createElementNS(SVG_NS, "text")
    label.setAttribute("x", (absX + box.width / 2).toString())
    label.setAttribute("y", (absY + boxHeight / 2).toString())
    label.setAttribute("fill", isLabel ? LABEL_STYLE.text : ATTRIBUTE_STYLE.stroke)
    label.setAttribute("font-size", fontSize.toString())
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("dominant-baseline", "middle")
    label.setAttribute("pointer-events", "none")
    label.setAttribute("data-box-id", box.id)
    label.setAttribute("data-lane-index", laneIndex.toString())
    label.setAttribute("data-role", "attribute-box-label")
    label.textContent = normalizedLabel
    setElementVisibility(label, visible)
    applyRotation(label, rotation, centerX, centerY)
    layer.appendChild(label)
  }
}
