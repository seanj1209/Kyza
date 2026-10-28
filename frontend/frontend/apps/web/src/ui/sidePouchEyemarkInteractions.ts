import { SIDE_POUCH_CANVAS_MARGIN, sidePouchEyemarkRects } from "../geometry/sidePouchEyemarks"
import { selectionStore } from "../state/selectionStore"
import type { FlowwrapSpec } from "../types/flowwrap"

export function attachSidePouchEyemarkInteractions(svg: SVGSVGElement, spec: FlowwrapSpec, onSpecChange: (next: FlowwrapSpec) => void) {
  let pending = spec
  let drag: { index: number; pointer: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null = null
  const point = (event: PointerEvent) => {
    const local = svg.createSVGPoint()
    local.x = event.clientX; local.y = event.clientY
    const ctm = svg.getScreenCTM()
    return ctm ? local.matrixTransform(ctm.inverse()) : local
  }
  svg.addEventListener("pointerdown", event => {
    if (svg.getAttribute("data-select-enabled") !== "true") return
    const target = (event.target as Element).closest<SVGElement>('[data-role="eye-mark"][data-eye-index], [data-role="eye-mark-move"][data-eye-index]')
    if (!target || !pending.eyeMarks) return
    const index = Number(target.getAttribute("data-eye-index"))
    const rect = sidePouchEyemarkRects(pending)[index]
    if (!rect) return
    const start = point(event)
    drag = { index, pointer: event.pointerId, startX: start.x, startY: start.y, originX: rect.x, originY: rect.y, moved: false }
    svg.setPointerCapture(event.pointerId)
    event.preventDefault()
    event.stopImmediatePropagation()
  }, true)
  svg.addEventListener("pointermove", event => {
    if (!drag || drag.pointer !== event.pointerId || !pending.eyeMarks) return
    const start = sidePouchEyemarkRects(pending)[drag.index]
    if (!start) return
    const current = point(event)
    const x = Math.max(start.bandX, Math.min(start.bandX + start.bandWidth - start.width, drag.originX + current.x - drag.startX))
    const y = Math.max(SIDE_POUCH_CANVAS_MARGIN, Math.min(SIDE_POUCH_CANVAS_MARGIN + pending.width - start.height, drag.originY + current.y - drag.startY))
    if (Math.abs(x - drag.originX) > 0.001 || Math.abs(y - drag.originY) > 0.001) drag.moved = true
    const nextMarks = { ...pending.eyeMarks,
      [drag.index ? "offsetX2" : "offsetX"]: x - start.baseX,
      [drag.index ? "offsetY2" : "offsetY"]: y - start.baseY }
    pending = { ...pending, eyeMarks: nextMarks }
    const mark = svg.querySelector<SVGRectElement>(`[data-role="eye-mark"][data-eye-index="${drag.index}"]`)
    mark?.setAttribute("x", String(x)); mark?.setAttribute("y", String(y))
  })
  const finish = (event: PointerEvent) => {
    if (!drag || drag.pointer !== event.pointerId) return
    const index = drag.index
    const moved = drag.moved
    drag = null
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
    if (moved) onSpecChange(pending)
    selectionStore.selectElement(`eye-mark:${index}`, false)
  }
  svg.addEventListener("pointerup", finish)
  svg.addEventListener("pointercancel", finish)
}
