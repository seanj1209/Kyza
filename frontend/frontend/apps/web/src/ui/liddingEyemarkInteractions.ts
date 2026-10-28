import { LIDDING_CANVAS_MARGIN_MM, liddingEyemarkRects, moveLiddingEyemark } from "../constraints/lidding"
import type { FlowwrapSpec } from "../types/flowwrap"
import { snapMoveCoordinate } from "./movementSnap"

/**
 * Lidding eyemarks move only inside their legal band: at least 1.5 mm inside
 * the reel slit edge and 1.5 mm clear of the lid's outer cut. The constraint
 * (moveLiddingEyemark) decides every position; this maps the pointer only.
 */
export function attachLiddingEyemarkInteractions(
  svg: SVGSVGElement,
  spec: FlowwrapSpec,
  onSpecChange: (next: FlowwrapSpec) => void
) {
  if (!spec.lidding || !spec.eyeMarks) return
  let drag: { index: number; startX: number; startY: number; offsetX: number; offsetY: number } | null = null
  let pending = spec

  const marks = () => svg.querySelectorAll<SVGRectElement>('[data-layer-id="eyemarks"] [data-role="eye-mark"]')
  marks().forEach(el => {
    el.setAttribute("data-draggable", "true")
    el.setAttribute("cursor", "move")
  })
  const toSvg = (clientX: number, clientY: number) => {
    const matrix = svg.getScreenCTM()
    if (!matrix) return { x: clientX, y: clientY }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const local = point.matrixTransform(matrix.inverse())
    return { x: local.x, y: local.y }
  }
  const place = () => {
    const rects = liddingEyemarkRects(pending)
    marks().forEach(el => {
      const rect = rects[Number(el.getAttribute("data-eye-index"))]
      if (!rect) return
      el.setAttribute("x", String(rect.x + LIDDING_CANVAS_MARGIN_MM))
      el.setAttribute("y", String(rect.y + LIDDING_CANVAS_MARGIN_MM))
    })
  }

  svg.addEventListener("pointerdown", event => {
    if (svg.getAttribute("data-select-enabled") !== "true") return
    if (svg.getAttribute("data-pan-enabled") === "true" || svg.getAttribute("data-measure-enabled") === "true") return
    const target = event.target as Element
    // The first click selects the mark (and redraws); the drag then starts on
    // the selection overlay's move target, as for every other pack.
    if (!["eye-mark", "eye-mark-move", "eye-mark-hit"].includes(target.getAttribute("data-role") ?? "")) return
    const rawIndex = Number(target.getAttribute("data-eye-index"))
    const index = Number(target.getAttribute("data-eye-side") ?? rawIndex % Math.max(1, pending.eyeMarks?.count ?? 0))
    const eyeMarks = pending.eyeMarks
    if (!eyeMarks || !Number.isInteger(index)) return
    const start = toSvg(event.clientX, event.clientY)
    drag = {
      index, startX: start.x, startY: start.y,
      offsetX: (index === 1 ? eyeMarks.offsetX2 : eyeMarks.offsetX) ?? 0,
      offsetY: (index === 1 ? eyeMarks.offsetY2 : eyeMarks.offsetY) ?? 0,
    }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopPropagation()
  })
  svg.addEventListener("pointermove", event => {
    if (!drag) return
    const now = toSvg(event.clientX, event.clientY)
    pending = moveLiddingEyemark(
      pending,
      drag.index,
      snapMoveCoordinate(drag.offsetX + now.x - drag.startX),
      snapMoveCoordinate(drag.offsetY + now.y - drag.startY)
    )
    place()
  })
  const finish = (event: PointerEvent) => {
    if (!drag) return
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
    drag = null
    if (pending !== spec) onSpecChange(pending)
  }
  svg.addEventListener("pointerup", finish)
  svg.addEventListener("pointercancel", finish)
}
