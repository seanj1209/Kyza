import { buildEyeMarkRects } from "../geometry/eyeMarks"
import type { EyeMarkColor, EyeMarkSpec } from "../types/eyeMarks"
import {
  createMovementHandleImage,
  getMoveHandleCenter,
  getRotateHandleCenter,
  getSquareResizeCorners
} from "./movementHandleImages"

const SVG_NS = "http://www.w3.org/2000/svg"

const EYE_MARK_COLORS: Record<EyeMarkColor, string> = {
  black: "#000000",
  white: "#ffffff",
  "dark-blue": "#0b1b4a"
}

export function renderEyeMarks(
  layer: SVGGElement,
  spec: EyeMarkSpec,
  cutterOriginX: number,
  cutterOriginY: number,
  cutterWidth: number,
  cutterHeight: number,
  seals: { top: number; bottom: number; left: number; right: number },
  doyOval?: { centerX: number; width: number } | null,
  overrideRects?: ReturnType<typeof buildEyeMarkRects>
) {
  const rects =
    overrideRects ??
    buildEyeMarkRects(
      spec,
      cutterOriginX,
      cutterOriginY,
      cutterWidth,
      cutterHeight,
      {
        seals
      }
    )
  layer.setAttribute("data-handle-radius", "2")

  const color = EYE_MARK_COLORS[spec.color]

  const topSeal = {
    x: cutterOriginX,
    y: cutterOriginY,
    width: cutterWidth,
    height: seals.top
  }
  const bottomSeal = {
    x: cutterOriginX,
    y: cutterOriginY + cutterHeight - seals.bottom,
    width: cutterWidth,
    height: seals.bottom
  }
  const leftSeal = {
    x: cutterOriginX,
    y: cutterOriginY,
    width: seals.left,
    height: cutterHeight
  }
  const rightSeal = {
    x: cutterOriginX + cutterWidth - seals.right,
    y: cutterOriginY,
    width: seals.right,
    height: cutterHeight
  }
  const topLeftSeal = {
    x: cutterOriginX,
    y: cutterOriginY,
    width: seals.left,
    height: seals.top
  }
  const topRightSeal = {
    x: cutterOriginX + cutterWidth - seals.right,
    y: cutterOriginY,
    width: seals.right,
    height: seals.top
  }
  const bottomLeftSeal = {
    x: cutterOriginX,
    y: cutterOriginY + cutterHeight - seals.bottom,
    width: seals.left,
    height: seals.bottom
  }
  const bottomRightSeal = {
    x: cutterOriginX + cutterWidth - seals.right,
    y: cutterOriginY + cutterHeight - seals.bottom,
    width: seals.right,
    height: seals.bottom
  }

  const fits = (rect: { x: number; y: number; width: number; height: number }, sealRect: typeof topSeal) =>
    rect.x >= sealRect.x &&
    rect.y >= sealRect.y &&
    rect.x + rect.width <= sealRect.x + sealRect.width &&
    rect.y + rect.height <= sealRect.y + sealRect.height

  const sealBands = [topSeal, bottomSeal, leftSeal, rightSeal]

  const rectFitsAnySeal = (rect: { x: number; y: number; width: number; height: number }) =>
    sealBands.some(seal => fits(rect, seal))

  const rectInsideOval = (
    rect: { x: number; y: number; width: number; height: number }
  ) => {
    if (!doyOval) {
      return false
    }
    const rx = doyOval.width / 2
    const ry = cutterHeight / 2
    if (rx <= 0 || ry <= 0) {
      return false
    }
    const cx = doyOval.centerX
    const cy = cutterOriginY + cutterHeight / 2
    const points = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.width, y: rect.y },
      { x: rect.x, y: rect.y + rect.height },
      { x: rect.x + rect.width, y: rect.y + rect.height }
    ]
    return points.every(point => {
      const dx = (point.x - cx) / rx
      const dy = (point.y - cy) / ry
      return dx * dx + dy * dy <= 1
    })
  }

  rects.forEach((rect, index) => {
    const inSeal = rectFitsAnySeal(rect)
    const inOval = rectInsideOval(rect)
    const r = document.createElementNS(SVG_NS, "rect")
    r.setAttribute("x", rect.x.toString())
    r.setAttribute("y", rect.y.toString())
    r.setAttribute("width", rect.width.toString())
    r.setAttribute("height", rect.height.toString())
    r.setAttribute("data-eye-index", index.toString())
    r.setAttribute("data-role", "eye-mark")
    r.setAttribute("fill", color)
    r.setAttribute("stroke", "none")
    r.setAttribute("data-eye-outside-safe", !(inSeal || inOval) ? "true" : "false")
    layer.appendChild(r)

    const hitbox = document.createElementNS(SVG_NS, "rect")
    hitbox.setAttribute("x", rect.x.toString())
    hitbox.setAttribute("y", rect.y.toString())
    hitbox.setAttribute("width", rect.width.toString())
    hitbox.setAttribute("height", rect.height.toString())
    hitbox.setAttribute("fill", "transparent")
    hitbox.setAttribute("pointer-events", "all")
    hitbox.setAttribute("cursor", "move")
    hitbox.setAttribute("data-eye-index", index.toString())
    hitbox.setAttribute("data-role", "eye-mark-hit")
    layer.appendChild(hitbox)

    if (spec.selectedIndex === index) {
      const moveCenter = getMoveHandleCenter(rect.x, rect.y, rect.width, rect.height)
      const moveHandle = createMovementHandleImage("move", moveCenter.x, moveCenter.y)
      moveHandle.setAttribute("pointer-events", "all")
      moveHandle.setAttribute("cursor", "move")
      moveHandle.setAttribute("data-eye-index", index.toString())
      moveHandle.setAttribute("data-role", "eye-mark-move")
      layer.appendChild(moveHandle)

      const corners = getSquareResizeCorners(rect.x, rect.y, rect.width, rect.height)
      corners.forEach(corner => {
        const handle = createMovementHandleImage("resize", corner.x, corner.y)
        handle.setAttribute("pointer-events", "all")
        handle.setAttribute("cursor", `${corner.key}-resize`)
        handle.setAttribute("data-eye-index", index.toString())
        handle.setAttribute("data-handle", corner.key)
        handle.setAttribute("data-role", "eye-mark-handle")
        layer.appendChild(handle)
      })

      const rotateCenter = getRotateHandleCenter(rect.x, rect.y, rect.width)
      const rotateHandle = createMovementHandleImage("rotate", rotateCenter.x, rotateCenter.y)
      rotateHandle.setAttribute("pointer-events", "all")
      rotateHandle.setAttribute("cursor", "grab")
      rotateHandle.setAttribute("data-eye-index", index.toString())
      rotateHandle.setAttribute("data-handle", "top")
      rotateHandle.setAttribute("data-role", "eye-mark-rotate")
      layer.appendChild(rotateHandle)
    }
  })
}
