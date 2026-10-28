import type { FlowwrapSpec, WindowSpec } from "../types/flowwrap"
import { snapResizeFromOrigin } from "./resizeSnap"
import { snapMovedElement } from "./movementSnap"

import { proportionalResize } from "../../../../packages/cutter-engine/actions/proportionalResize"

type DragState = {
  mode: "move" | "resize" | "rotate"
  windowId: string
  handle?: "nw" | "ne" | "sw" | "se" | "left" | "right" | "top" | "bottom"
  startX: number
  startY: number
  origin: WindowSpec
  startAngle?: number
  startRotation?: number
}

type HandlePosition = { key: "nw" | "ne" | "sw" | "se"; x: number; y: number }

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

function normalizeRotation(rotation: number) {
  const raw = rotation % 360
  return raw < 0 ? raw + 360 : raw
}

function getAngleDegrees(cx: number, cy: number, x: number, y: number) {
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI
}

function rotateDelta(dx: number, dy: number, angleDegrees: number) {
  const angle = (angleDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos
  }
}

function getRotateHandlePositions(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const offset = 2
  const cx = x + width / 2
  const cy = y + height / 2
  const corners = [
    { key: "nw" as const, x, y },
    { key: "ne" as const, x: x + width, y },
    { key: "sw" as const, x, y: y + height },
    { key: "se" as const, x: x + width, y: y + height }
  ]
  return corners.map(corner => {
    const dx = corner.x - cx
    const dy = corner.y - cy
    const length = Math.max(0.001, Math.hypot(dx, dy))
    return {
      key: corner.key,
      x: corner.x + (dx / length) * offset,
      y: corner.y + (dy / length) * offset
    }
  })
}

function getWindowHandlePositions(
  shape: WindowSpec["shape"],
  x: number,
  y: number,
  width: number,
  height: number
): HandlePosition[] {
  if (shape === "circle" || shape === "oval") {
    const cx = x + width / 2
    const cy = y + height / 2
    const rx = width / 2
    const ry = height / 2
    const angle = Math.PI / 4
    return [
      { key: "ne", x: cx + rx * Math.cos(angle), y: cy - ry * Math.sin(angle) },
      { key: "nw", x: cx - rx * Math.cos(angle), y: cy - ry * Math.sin(angle) },
      { key: "sw", x: cx - rx * Math.cos(angle), y: cy + ry * Math.sin(angle) },
      { key: "se", x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
    ]
  }
  if (shape === "triangle" || shape === "rounded-triangle") {
    const top = { x: x + width / 2, y }
    const left = { x, y: y + height }
    const right = { x: x + width, y: y + height }
    return [
      { key: "nw", ...top },
      { key: "sw", ...left },
      { key: "se", ...right }
    ]
  }
  if (shape === "half-circle") {
    const radius = Math.min(width / 2, height)
    const cx = x + width / 2
    const cy = y + radius
    const angle = Math.PI / 4
    const left = { x: cx - radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
    const right = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
    return [
      { key: "sw", ...left },
      { key: "se", ...right }
    ]
  }
  return [
    { key: "nw", x, y },
    { key: "ne", x: x + width, y },
    { key: "sw", x, y: y + height },
    { key: "se", x: x + width, y: y + height }
  ]
}

export function attachWindowInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  let drag: DragState | null = null
  let pendingSpec = spec
  let selectedWindowId =
    pendingSpec.windows?.find(win => win.selected)?.id ?? null

  const setSelectedWindow = (windowId: string | null) => {
    if (!pendingSpec.windows) {
      selectedWindowId = null
      return
    }
    selectedWindowId = windowId
    pendingSpec = {
      ...pendingSpec,
      windows: pendingSpec.windows.map(win => ({
        ...win,
        selected: win.id === windowId
      }))
    }
    onSpecChange(pendingSpec)
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
    const windowId = target.getAttribute("data-window-id")
    if (!windowId) {
      if (selectedWindowId) {
        setSelectedWindow(null)
      }
      return
    }
    if (!pendingSpec.windows) {
      return
    }
    const window = pendingSpec.windows.find(win => win.id === windowId)
    if (!window) {
      return
    }
    if (window.id !== selectedWindowId) {
      return
    }

    const handle = target.getAttribute("data-handle") as DragState["handle"]
    if (
      target.getAttribute("data-role") === "window-shape" ||
      target.getAttribute("data-role") === "window-hit" ||
      target.getAttribute("data-role") === "window-move"
    ) {
      drag = {
        mode: "move",
        windowId,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...window }
      }
    } else if (target.getAttribute("data-role") === "window-handle" && handle) {
      drag = {
        mode: "resize",
        windowId,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...window }
      }
    } else if (target.getAttribute("data-role") === "window-rotate") {
      const { liveX, liveY } = getLayerMeta()
      const centerX = liveX + window.x + window.width / 2
      const centerY = liveY + window.y + window.height / 2
      const startPoint = getSvgPoint(svg, event.clientX, event.clientY)
      drag = {
        mode: "rotate",
        windowId,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...window },
        startAngle: getAngleDegrees(centerX, centerY, startPoint.x, startPoint.y),
        startRotation: window.rotation ?? 0
      }
      svg.style.cursor = "grabbing"
    }

    if (drag) {
      svg.setPointerCapture(event.pointerId)
      event.preventDefault()
    }
  }

  const getLayerMeta = () => {
    const layer = svg.querySelector("g#windows")
    const sealLayer = svg.querySelector("g#seal_areas")
    if (!layer) {
      return {
        liveX: 0,
        liveY: 0,
        liveWidth: 0,
        liveHeight: 0,
        cutterMinX: 0,
        cutterMinY: 0,
        cutterWidth: 0,
        cutterHeight: 0,
        handleRadius: 0.5,
        rotateHandleRadius: 1.2
      }
    }
    const liveX = Number(layer.getAttribute("data-live-origin-x") ?? "0")
    const liveY = Number(layer.getAttribute("data-live-origin-y") ?? "0")
    const liveWidth = Number(layer.getAttribute("data-live-width") ?? "0")
    const liveHeight = Number(layer.getAttribute("data-live-height") ?? "0")
    const handleRadius = Number(layer.getAttribute("data-handle-radius") ?? "0.5")
    const rotateHandleRadius = Number(layer.getAttribute("data-rotate-handle-radius") ?? "1.2")
    const cutterOriginX = Number(sealLayer?.getAttribute("data-origin-x") ?? liveX)
    const cutterOriginY = Number(sealLayer?.getAttribute("data-origin-y") ?? liveY)
    const cutterWidth = Number(sealLayer?.getAttribute("data-cutter-width") ?? liveWidth)
    const cutterHeight = Number(sealLayer?.getAttribute("data-cutter-height") ?? liveHeight)
    return {
      liveX,
      liveY,
      liveWidth,
      liveHeight,
      cutterMinX: cutterOriginX - liveX,
      cutterMinY: cutterOriginY - liveY,
      cutterWidth,
      cutterHeight,
      handleRadius,
      rotateHandleRadius
    }
  }

  const updateWindowDom = (window: WindowSpec) => {
    const { liveX, liveY, handleRadius, rotateHandleRadius } = getLayerMeta()
    const absX = liveX + window.x
    const absY = liveY + window.y
    const rotation = window.rotation ?? 0
    const centerX = absX + window.width / 2
    const centerY = absY + window.height / 2

    const shapes = svg.querySelectorAll<SVGElement>(
      `[data-window-id="${window.id}"][data-role="window-shape"]`
    )
    shapes.forEach(shape => {
      const shapeType = shape.getAttribute("data-shape")
      if (shapeType === "circle") {
        const circle = shape as SVGCircleElement
        const radius = Math.min(window.width, window.height) / 2
        circle.setAttribute("cx", (absX + window.width / 2).toString())
        circle.setAttribute("cy", (absY + window.height / 2).toString())
        circle.setAttribute("r", radius.toString())
      } else if (shapeType === "oval") {
        const ellipse = shape as SVGEllipseElement
        ellipse.setAttribute("cx", (absX + window.width / 2).toString())
        ellipse.setAttribute("cy", (absY + window.height / 2).toString())
        ellipse.setAttribute("rx", (window.width / 2).toString())
        ellipse.setAttribute("ry", (window.height / 2).toString())
      } else if (shapeType === "rounded-rectangle") {
        const rect = shape as SVGRectElement
        const radius = Math.min(window.width, window.height) * 0.2
        rect.setAttribute("x", absX.toString())
        rect.setAttribute("y", absY.toString())
        rect.setAttribute("width", window.width.toString())
        rect.setAttribute("height", window.height.toString())
        rect.setAttribute("rx", radius.toString())
        rect.setAttribute("ry", radius.toString())
      } else if (shapeType === "triangle" || shapeType === "rounded-triangle") {
        const path = shape as SVGPathElement
        const topX = absX + window.width / 2
        const topY = absY
        const rightX = absX + window.width
        const rightY = absY + window.height
        const leftX = absX
        const leftY = absY + window.height
        if (shapeType === "triangle") {
          path.setAttribute("d", `M ${topX} ${topY} L ${rightX} ${rightY} L ${leftX} ${leftY} Z`)
        } else {
          const r = Math.max(1, Math.min(window.width, window.height) * 0.1)
          const lerp = (a: number, b: number, t: number) => a + (b - a) * t
          const pointAlong = (fx: number, fy: number, tx: number, ty: number, dist: number) => {
            const dx = tx - fx
            const dy = ty - fy
            const len = Math.max(1, Math.hypot(dx, dy))
            const t = Math.min(1, dist / len)
            return { x: lerp(fx, tx, t), y: lerp(fy, ty, t) }
          }
          const p1 = pointAlong(topX, topY, rightX, rightY, r)
          const p2 = pointAlong(rightX, rightY, topX, topY, r)
          const p3 = pointAlong(rightX, rightY, leftX, leftY, r)
          const p4 = pointAlong(leftX, leftY, rightX, rightY, r)
          const p5 = pointAlong(leftX, leftY, topX, topY, r)
          const p6 = pointAlong(topX, topY, leftX, leftY, r)
          path.setAttribute(
            "d",
            `M ${p1.x} ${p1.y} Q ${topX} ${topY} ${p6.x} ${p6.y} ` +
              `L ${p5.x} ${p5.y} Q ${leftX} ${leftY} ${p4.x} ${p4.y} ` +
              `L ${p3.x} ${p3.y} Q ${rightX} ${rightY} ${p2.x} ${p2.y} Z`
          )
        }
      } else if (shapeType === "half-circle") {
        const path = shape as SVGPathElement
        const radius = Math.min(window.width / 2, window.height)
        const cx = absX + window.width / 2
        const cy = absY + radius
        const leftX = cx - radius
        const rightX = cx + radius
        path.setAttribute(
          "d",
          `M ${leftX} ${cy} A ${radius} ${radius} 0 0 0 ${rightX} ${cy} L ${leftX} ${cy} Z`
        )
      } else {
        const rect = shape as SVGRectElement
        rect.setAttribute("x", absX.toString())
        rect.setAttribute("y", absY.toString())
        rect.setAttribute("width", window.width.toString())
        rect.setAttribute("height", window.height.toString())
      }
    })

    const hitbox = svg.querySelector<SVGRectElement>(
      `[data-window-id="${window.id}"][data-role="window-hit"]`
    )
    if (hitbox) {
      hitbox.setAttribute("x", absX.toString())
      hitbox.setAttribute("y", absY.toString())
      hitbox.setAttribute("width", window.width.toString())
      hitbox.setAttribute("height", window.height.toString())
    }

    const moveHandle = svg.querySelector<SVGCircleElement>(
      `[data-window-id="${window.id}"][data-role="window-move"]`
    )
    if (moveHandle) {
      let moveCenterX = centerX
      let moveCenterY = centerY
      if (window.shape === "half-circle") {
        const radius = Math.min(window.width / 2, window.height)
        moveCenterX = absX + window.width / 2
        moveCenterY = absY + radius / 2
      }
      moveHandle.setAttribute("cx", moveCenterX.toString())
      moveHandle.setAttribute("cy", moveCenterY.toString())
      moveHandle.setAttribute("r", handleRadius.toString())
    }

    const handlePositions = getWindowHandlePositions(
      window.shape,
      absX,
      absY,
      window.width,
      window.height
    )
    const handleMap = new Map(handlePositions.map(handle => [handle.key, handle]))
    const handles = svg.querySelectorAll<SVGCircleElement>(
      `[data-window-id="${window.id}"][data-role="window-handle"]`
    )
    handles.forEach(handle => {
      const key = handle.getAttribute("data-handle") as HandlePosition["key"] | null
      const position = key ? handleMap.get(key) : null
      if (!position) {
        return
      }
      handle.setAttribute("cx", position.x.toString())
      handle.setAttribute("cy", position.y.toString())
      handle.setAttribute("r", rotateHandleRadius.toString())
    })

    const rotateHandles = svg.querySelectorAll<SVGCircleElement>(
      `[data-window-id="${window.id}"][data-role="window-rotate"]`
    )
    const rotatePositions = getRotateHandlePositions(
      absX,
      absY,
      window.width,
      window.height
    )
    const rotateMap = new Map(rotatePositions.map(pos => [pos.key, pos]))
    rotateHandles.forEach(handle => {
      const key = handle.getAttribute("data-handle") as HandlePosition["key"] | null
      const position = key ? rotateMap.get(key) : null
      if (!position) {
        return
      }
      handle.setAttribute("cx", position.x.toString())
      handle.setAttribute("cy", position.y.toString())
      handle.setAttribute("r", handleRadius.toString())
    })

    const rotateLabel = svg.querySelector<SVGTextElement>(
      `[data-window-id="${window.id}"][data-role="window-rotate-label"]`
    )
    if (rotateLabel) {
      rotateLabel.setAttribute("x", (absX + window.width + 2).toString())
      rotateLabel.setAttribute("y", (absY - 2).toString())
      rotateLabel.textContent = `${Math.round(normalizeRotation(rotation))}°`
    }

    const rotatable = svg.querySelectorAll<SVGElement>(
      `[data-window-id="${window.id}"]`
    )
    rotatable.forEach(element => {
      if (element.getAttribute("data-role") === "window-rotate-label") {
        element.removeAttribute("transform")
        return
      }
      applyRotation(element, rotation, centerX, centerY)
    })
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || !pendingSpec.windows) {
      return
    }
    const {
      liveX,
      liveY,
      cutterMinX,
      cutterMinY,
      cutterWidth,
      cutterHeight
    } = getLayerMeta()
    const getCutterBounds = (width: number, height: number) => ({
      minX: cutterMinX,
      minY: cutterMinY,
      maxX: Math.max(cutterMinX, cutterMinX + cutterWidth - width),
      maxY: Math.max(cutterMinY, cutterMinY + cutterHeight - height)
    })
    const start = getSvgPoint(svg, drag.startX, drag.startY)
    const current = getSvgPoint(svg, event.clientX, event.clientY)
    const rawDx = current.x - start.x
    const rawDy = current.y - start.y
    const dx = snap(rawDx, 1)
    const dy = snap(rawDy, 1)

    const nextWindows = pendingSpec.windows.map(win => {
      if (win.id !== drag!.windowId) {
        return win
      }
      if (drag!.mode === "rotate") {
        const rotationStart = drag!.startRotation ?? 0
        const centerX = liveX + drag!.origin.x + drag!.origin.width / 2
        const centerY = liveY + drag!.origin.y + drag!.origin.height / 2
        const angle = getAngleDegrees(centerX, centerY, current.x, current.y)
        const startAngle = drag!.startAngle ?? angle
        const rawRotation = rotationStart + (angle - startAngle)
        const nextRotation = snap(rawRotation, event.shiftKey ? 15 : 1)
        const rotated = { ...win, rotation: nextRotation }
        updateWindowDom(rotated)
        const label = svg.querySelector<SVGTextElement>(
          `[data-window-id="${win.id}"][data-role="window-rotate-label"]`
        )
        if (label) {
          label.setAttribute("opacity", "1")
          label.setAttribute("x", (current.x + 2).toString())
          label.setAttribute("y", (current.y - 2).toString())
          label.textContent = `${Math.round(normalizeRotation(nextRotation))}°`
        }
        return rotated
      }
      if (drag!.mode === "move") {
        // AMENDS 6.1: snap the resulting position to the mouse movement grid.
        const { minX, minY, maxX, maxY } = getCutterBounds(win.width, win.height)
        const moved = snapMovedElement(
          { ...win, x: drag!.origin.x + rawDx, y: drag!.origin.y + rawDy },
          ["x", "y"],
          next => ({ ...next, x: Math.min(maxX, Math.max(minX, next.x)), y: Math.min(maxY, Math.max(minY, next.y)) }),
          drag!.origin
        )
        updateWindowDom(moved)
        return moved
      }

      const rotation = drag!.origin.rotation ?? 0
      const localDelta = rotateDelta(dx, dy, -rotation)
      const localDx = localDelta.x
      const localDy = localDelta.y

      if (win.shape === "half-circle") {
        const originRadius = Math.min(drag!.origin.width / 2, drag!.origin.height)
        const centerAbsX = liveX + drag!.origin.x + drag!.origin.width / 2
        const centerAbsY = liveY + drag!.origin.y + originRadius
        const radiusAbs = Math.hypot(current.x - centerAbsX, current.y - centerAbsY)
        const minRadius = 2.5
        const radius = Math.max(minRadius, snapResizeFromOrigin(originRadius, radiusAbs, .5))
        const width = radius * 2
        const height = radius
        let x = centerAbsX - liveX - radius
        let y = centerAbsY - liveY - radius
        const { minX, minY, maxX, maxY } = getCutterBounds(width, height)
        x = Math.min(maxX, Math.max(minX, x))
        y = Math.min(maxY, Math.max(minY, y))
        const resized = { ...win, x, y, width, height }
        updateWindowDom(resized)
        return resized
      }

      const minSize = 5
      let x = drag!.origin.x
      let y = drag!.origin.y
      let width = drag!.origin.width
      let height = drag!.origin.height

      if (drag!.handle === "se") {
        width = Math.max(minSize, drag!.origin.width + localDx)
        height = Math.max(minSize, drag!.origin.height + localDy)
      } else if (drag!.handle === "sw") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        height = Math.max(minSize, drag!.origin.height + localDy)
        x = drag!.origin.x + localDx
      } else if (drag!.handle === "ne") {
        width = Math.max(minSize, drag!.origin.width + localDx)
        height = Math.max(minSize, drag!.origin.height - localDy)
        y = drag!.origin.y + localDy
      } else if (drag!.handle === "nw") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        height = Math.max(minSize, drag!.origin.height - localDy)
        x = drag!.origin.x + localDx
        y = drag!.origin.y + localDy
      } else if (drag!.handle === "left") {
        width = Math.max(minSize, drag!.origin.width - localDx)
        x = drag!.origin.x + localDx
      } else if (drag!.handle === "right") {
        width = Math.max(minSize, drag!.origin.width + localDx)
      } else if (drag!.handle === "top") {
        height = Math.max(minSize, drag!.origin.height - localDy)
        y = drag!.origin.y + localDy
      } else if (drag!.handle === "bottom") {
        height = Math.max(minSize, drag!.origin.height + localDy)
      }

      width = Math.max(minSize, snapResizeFromOrigin(drag!.origin.width, width))
      height = Math.max(minSize, snapResizeFromOrigin(drag!.origin.height, height))
      if (drag!.handle?.includes("w") || drag!.handle === "left") x = drag!.origin.x + drag!.origin.width - width
      if (drag!.handle?.includes("n") || drag!.handle === "top") y = drag!.origin.y + drag!.origin.height - height
      if (((event.shiftKey && !event.ctrlKey) || win.shape === "circle") && drag!.origin.height > 0) {
        const ratio = drag!.origin.width / drag!.origin.height
        if (drag!.handle === "left" || drag!.handle === "right") {
          const oldHeight = height
          height = Math.max(minSize, width / ratio)
          y -= (height - oldHeight) / 2
        } else {
          const oldWidth = width
          width = Math.max(minSize, height * ratio)
          x -= (width - oldWidth) / 2
        }
      }

      if(event.ctrlKey)({x,y,width,height}=proportionalResize(drag!.origin,{x,y,width,height},drag!.handle,minSize))
      const resized = { ...win, x, y, width, height }
      const { minX, minY, maxX, maxY } = getCutterBounds(
        resized.width,
        resized.height
      )
      resized.x = Math.min(maxX, Math.max(minX, resized.x))
      resized.y = Math.min(maxY, Math.max(minY, resized.y))
      updateWindowDom(resized)
      return resized
    })

    pendingSpec = { ...pendingSpec, windows: nextWindows }
  }

  const finishDrag = (event: PointerEvent, releaseCapture: boolean) => {
    if (!drag) {
      return
    }
    const windowId = drag.windowId
    drag = null
    if (releaseCapture && svg.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId)
    }
    onSpecChange(pendingSpec)
    const rotateLabel = svg.querySelector<SVGTextElement>(
      `[data-window-id="${windowId}"][data-role="window-rotate-label"]`
    )
    if (rotateLabel) {
      rotateLabel.setAttribute("opacity", "0")
    }
    svg.style.cursor = ""
  }

  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", event => finishDrag(event, true))
  svg.addEventListener("pointercancel", event => finishDrag(event, true))
  svg.addEventListener("lostpointercapture", event => finishDrag(event, false))
}
