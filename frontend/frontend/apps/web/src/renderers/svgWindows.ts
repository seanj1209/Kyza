import type { WindowSpec } from "../types/flowwrap"
import {
  createMovementHandleImage,
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "./movementHandleImages"

const SVG_NS = "http://www.w3.org/2000/svg"

const WINDOW_STYLE = {
  stroke: "#206027",
  strokeWidth: 0.6
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

function buildTrianglePath(x: number, y: number, width: number, height: number) {
  const topX = x + width / 2
  const topY = y
  const rightX = x + width
  const rightY = y + height
  const leftX = x
  const leftY = y + height
  return `M ${topX} ${topY} L ${rightX} ${rightY} L ${leftX} ${leftY} Z`
}

function buildRoundedTrianglePath(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const r = Math.max(1, Math.min(width, height) * 0.1)
  const top = { x: x + width / 2, y }
  const right = { x: x + width, y: y + height }
  const left = { x, y: y + height }

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const pointAlong = (from: typeof top, to: typeof top, dist: number) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.max(1, Math.hypot(dx, dy))
    const t = Math.min(1, dist / len)
    return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
  }

  const p1 = pointAlong(top, right, r)
  const p2 = pointAlong(right, top, r)
  const p3 = pointAlong(right, left, r)
  const p4 = pointAlong(left, right, r)
  const p5 = pointAlong(left, top, r)
  const p6 = pointAlong(top, left, r)

  return [
    `M ${p1.x} ${p1.y}`,
    `Q ${top.x} ${top.y} ${p6.x} ${p6.y}`,
    `L ${p5.x} ${p5.y}`,
    `Q ${left.x} ${left.y} ${p4.x} ${p4.y}`,
    `L ${p3.x} ${p3.y}`,
    `Q ${right.x} ${right.y} ${p2.x} ${p2.y}`,
    "Z"
  ].join(" ")
}

function buildHalfCirclePath(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const radius = Math.min(width / 2, height)
  const cx = x + width / 2
  const cy = y + radius
  const leftX = cx - radius
  const rightX = cx + radius
  return `M ${leftX} ${cy} A ${radius} ${radius} 0 0 0 ${rightX} ${cy} L ${leftX} ${cy} Z`
}

export function renderWindows(
  layer: SVGGElement,
  windows: WindowSpec[],
  liveOriginX: number,
  liveOriginY: number
) {
  layer.setAttribute("data-handle-radius", "2")
  layer.setAttribute("data-rotate-handle-radius", "2")
  for (const window of windows) {
    const isSelected = window.selected === true
    const absX = liveOriginX + window.x
    const absY = liveOriginY + window.y
    const width = window.width
    const height = window.height
    const rotation = window.rotation ?? 0
    const centerX = absX + width / 2
    const centerY = absY + height / 2

    let shape: SVGElement
    if (window.shape === "circle") {
      const circle = document.createElementNS(SVG_NS, "circle")
      const radius = Math.min(width, height) / 2
      circle.setAttribute("cx", (absX + width / 2).toString())
      circle.setAttribute("cy", (absY + height / 2).toString())
      circle.setAttribute("r", radius.toString())
      shape = circle
    } else if (window.shape === "oval") {
      const ellipse = document.createElementNS(SVG_NS, "ellipse")
      ellipse.setAttribute("cx", (absX + width / 2).toString())
      ellipse.setAttribute("cy", (absY + height / 2).toString())
      ellipse.setAttribute("rx", (width / 2).toString())
      ellipse.setAttribute("ry", (height / 2).toString())
      shape = ellipse
    } else if (window.shape === "rounded-rectangle") {
      const rect = document.createElementNS(SVG_NS, "rect")
      const radius = Math.min(width, height) * 0.2
      rect.setAttribute("x", absX.toString())
      rect.setAttribute("y", absY.toString())
      rect.setAttribute("width", width.toString())
      rect.setAttribute("height", height.toString())
      rect.setAttribute("rx", radius.toString())
      rect.setAttribute("ry", radius.toString())
      shape = rect
    } else if (window.shape === "triangle") {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", buildTrianglePath(absX, absY, width, height))
      shape = path
    } else if (window.shape === "rounded-triangle") {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", buildRoundedTrianglePath(absX, absY, width, height))
      shape = path
    } else if (window.shape === "half-circle") {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", buildHalfCirclePath(absX, absY, width, height))
      shape = path
    } else {
      const rect = document.createElementNS(SVG_NS, "rect")
      rect.setAttribute("x", absX.toString())
      rect.setAttribute("y", absY.toString())
      rect.setAttribute("width", width.toString())
      rect.setAttribute("height", height.toString())
      shape = rect
    }

    shape.setAttribute("fill", "none")
    shape.setAttribute("stroke", WINDOW_STYLE.stroke)
    shape.setAttribute("stroke-width", WINDOW_STYLE.strokeWidth.toString())
    shape.setAttribute("pointer-events", "stroke")
    shape.setAttribute("cursor", "move")
    shape.setAttribute("data-window-id", window.id)
    shape.setAttribute("data-role", "window-shape")
    shape.setAttribute("data-shape", window.shape)
    shape.setAttribute("data-selected", isSelected ? "true" : "false")
    applyRotation(shape, rotation, centerX, centerY)
    layer.appendChild(shape)

    const hitbox = document.createElementNS(SVG_NS, "rect")
    hitbox.setAttribute("x", absX.toString())
    hitbox.setAttribute("y", absY.toString())
    hitbox.setAttribute("width", width.toString())
    hitbox.setAttribute("height", height.toString())
    hitbox.setAttribute("fill", "transparent")
    hitbox.setAttribute("pointer-events", "all")
    hitbox.setAttribute("cursor", "move")
    hitbox.setAttribute("data-window-id", window.id)
    hitbox.setAttribute("data-role", "window-hit")
    hitbox.setAttribute("data-selected", isSelected ? "true" : "false")
    applyRotation(hitbox, rotation, centerX, centerY)
    layer.appendChild(hitbox)

    if (isSelected) {
      const moveCenter = getMoveHandleCenter(absX, absY, width, height)
      const moveHandle = createMovementHandleImage("move", moveCenter.x, moveCenter.y)
      moveHandle.setAttribute("pointer-events", "all")
      moveHandle.setAttribute("cursor", "move")
      moveHandle.setAttribute("data-window-id", window.id)
      moveHandle.setAttribute("data-role", "window-move")
      applyRotation(moveHandle, rotation, centerX, centerY)
      layer.appendChild(moveHandle)

      const handles = getSquareResizeCorners(absX, absY, width, height)
      handles.forEach(corner => {
        const handle = createMovementHandleImage("resize", corner.x, corner.y)
        handle.setAttribute("pointer-events", "all")
        handle.setAttribute("cursor", `${corner.key}-resize`)
        handle.setAttribute("data-window-id", window.id)
        handle.setAttribute("data-handle", corner.key)
        handle.setAttribute("data-role", "window-handle")
        applyRotation(handle, rotation, centerX, centerY)
        layer.appendChild(handle)
      })

      const rotateCenter = getRotateHandleCenter(absX, absY, width)
      const rotateHandle = createMovementHandleImage("rotate", rotateCenter.x, rotateCenter.y)
      rotateHandle.setAttribute("pointer-events", "all")
      rotateHandle.setAttribute("cursor", "grab")
      rotateHandle.setAttribute("data-window-id", window.id)
      rotateHandle.setAttribute("data-handle", "top")
      rotateHandle.setAttribute("data-role", "window-rotate")
      applyRotation(rotateHandle, rotation, centerX, centerY)
      layer.appendChild(rotateHandle)

      const rotateLabel = document.createElementNS(SVG_NS, "text")
      rotateLabel.setAttribute("x", (absX + width + 2).toString())
      rotateLabel.setAttribute("y", (absY - 2).toString())
      rotateLabel.setAttribute("fill", ROTATE_LABEL_FILL)
      rotateLabel.setAttribute("font-size", "3.2")
      rotateLabel.setAttribute("text-anchor", "start")
      rotateLabel.setAttribute("dominant-baseline", "central")
      rotateLabel.setAttribute("pointer-events", "none")
      rotateLabel.setAttribute("opacity", "0")
      rotateLabel.setAttribute("data-window-id", window.id)
      rotateLabel.setAttribute("data-role", "window-rotate-label")
      rotateLabel.textContent = `${Math.round(rotation)}°`
      layer.appendChild(rotateLabel)
    }
  }
}
