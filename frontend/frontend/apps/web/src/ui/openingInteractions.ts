import type { FlowwrapSpec } from "../types/flowwrap"
import { updateSubMeasuresLayer } from "../renderers/flowwrapSvg"
import { snapResizeFromOrigin } from "./resizeSnap"

const NS = "http://www.w3.org/2000/svg"
/** Paired opening editor: horizontal movement and width only; height follows the cutter. */
export function attachOpeningInteractions(svg: SVGSVGElement, spec: FlowwrapSpec, commit: (next: FlowwrapSpec) => void) {
  if (!spec.doyPouch) return
  const zip = spec.doyPouch.showZipper === true
  if (!zip && spec.doyPouch.showGripSeal !== true) return
  svg.querySelectorAll<SVGElement>('[data-role="grip-seal"], [data-role="zipper-strip"]').forEach(n => n.setAttribute("pointer-events", "all"))
  let pending = spec
  let selected = false
  let drag: { mode: "move" | "resize"; edge: "inner" | "outer"; x: number; offset: number; width: number; side: number } | null = null
  const meta = svg.querySelector("g#seal_areas")!
  const ox = Number(meta.getAttribute("data-origin-x") ?? 0)
  const oy = Number(meta.getAttribute("data-origin-y") ?? 0)
  const cutterWidth = Number(meta.getAttribute("data-cutter-width") ?? spec.width)
  const cutterHeight = Number(meta.getAttribute("data-cutter-height") ?? spec.height)
  const trim = spec.doyPouch.trimEnabled ? Math.max(0, (cutterWidth - spec.width) / 2) : 0
  const overlay = document.createElementNS(NS, "g")
  overlay.setAttribute("data-export-ui", "true")
  overlay.setAttribute("data-role", "opening-controls")
  svg.appendChild(overlay)
  const values = () => ({ offset: zip ? pending.doyPouch!.zipper.offsetX ?? 0 : pending.doyPouch!.sideBleed, width: zip ? pending.doyPouch!.zipper.width ?? 10 : pending.doyPouch!.gripSeal })
  const point = (e: PointerEvent) => {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    return p.matrixTransform(svg.getScreenCTM()!.inverse())
  }
  const draw = () => {
    overlay.replaceChildren()
    if (!selected) return
    const { offset, width } = values()
    for (const side of ["left", "right"]) {
      const x = ox + (side === "left" ? offset : cutterWidth - offset - width)
      const outline = document.createElementNS(NS, "rect")
      for (const [k, v] of Object.entries({ x, y: oy, width, height: cutterHeight, fill: "#a7192010", stroke: "#a71920", "stroke-width": .6, "pointer-events": "none", "data-role": "opening-selection" })) outline.setAttribute(k, String(v))
      overlay.appendChild(outline)
      if (drag?.mode === "move" && offset > trim) {
        // Measure only from the opening's outer edge to the inner cutter/trim
        // edge. No guide extends toward the centre gusset.
        const from = side === "left" ? ox + trim : ox + cutterWidth - offset
        const to = side === "left" ? ox + offset : ox + cutterWidth - trim
        const y = oy + cutterHeight / 2
        const guide = document.createElementNS(NS, "line")
        for (const [k, v] of Object.entries({ x1: from, y1: y, x2: to, y2: y, stroke: "#d23429", "stroke-width": .45, "pointer-events": "none", "data-role": "opening-offset-measure" })) guide.setAttribute(k, String(v))
        overlay.appendChild(guide)
        const label = document.createElementNS(NS, "text")
        for (const [k, v] of Object.entries({ x: (from + to) / 2, y: y - 2, "font-size": 3, "text-anchor": "middle", fill: "#d23429", "pointer-events": "none", "data-role": "opening-offset-label" })) label.setAttribute(k, String(v))
        label.textContent = `${Math.round((offset - trim) * 100) / 100}mm`
        overlay.appendChild(label)
      }
      if (drag?.mode === "resize") {
        const text = document.createElementNS(NS, "text")
        text.setAttribute("x", String(x + width / 2)); text.setAttribute("y", String(oy + cutterHeight / 2 - 5)); text.setAttribute("font-size", "3"); text.setAttribute("text-anchor", "middle"); text.setAttribute("fill", "#59666c"); text.setAttribute("data-role", "opening-width-readout"); text.setAttribute("pointer-events", "none"); text.textContent = `${Math.round(width * 100) / 100}mm`
        overlay.appendChild(text)
      }
    }
  }
  const update = () => {
    const { offset, width } = values()
    svg.querySelectorAll<SVGRectElement>('[data-role="grip-seal"]').forEach(n => {
      n.setAttribute("x", String(ox + (n.dataset.gripSide === "right" ? cutterWidth - offset - width : offset)))
      n.setAttribute("width", String(width))
    })
    svg.querySelectorAll<SVGTextElement>('[data-role="grip-seal-label"]').forEach(n => {
      const right = n.dataset.gripSide === "right", x = ox + (right ? cutterWidth - offset - width / 2 : offset + width / 2), y = oy + cutterHeight / 2
      n.setAttribute("x", String(x)); n.setAttribute("font-size", String(Math.min(6, width * .65, cutterHeight / 7))); n.setAttribute("transform", `rotate(${right ? 90 : -90} ${x} ${y})`)
    })
    svg.querySelectorAll<SVGGElement>('[data-role="zipper-group"]').forEach(n => {
      n.setAttribute("transform", `translate(${ox + (n.dataset.zipperSide === "right" ? cutterWidth - offset - width : offset)} ${oy})`)
      n.querySelectorAll("rect").forEach(r => r.setAttribute("width", String(width)))
      // Scale the hatch preview horizontally; a full render restores native geometry on release.
      n.querySelectorAll("line").forEach(l => { l.setAttribute("visibility", "hidden") })
    })
    updateSubMeasuresLayer(svg, pending)
    draw()
  }
  const hit = (e: PointerEvent, side: string | null): { mode: "move" | "resize"; edge: "inner" | "outer" } => {
    const { offset, width } = values()
    const x = ox + (side === "right" ? cutterWidth - offset - width : offset)
    const localX = point(e).x - x
    const matrix = svg.getScreenCTM()!
    const edgeWidth = Math.min(width / 4, 6 / Math.max(.001, Math.hypot(matrix.a, matrix.b)))
    const outerDistance = side === "right" ? width - localX : localX
    const innerDistance = side === "right" ? localX : width - localX
    const edge = outerDistance < innerDistance ? "outer" : "inner"
    return { mode: Math.min(outerDistance, innerDistance) <= edgeWidth ? "resize" as const : "move" as const, edge }
  }
  svg.addEventListener("pointerdown", e => {
    if (svg.getAttribute("data-select-enabled") !== "true" || svg.getAttribute("data-pan-enabled") === "true" || svg.getAttribute("data-measure-enabled") === "true") return
    const target = e.target as Element
    const opening = target.closest('[data-role="grip-seal"], [data-role="grip-seal-label"], [data-role="zipper-group"]')
    if (!opening) { selected = false; draw(); return }
    e.stopImmediatePropagation(); e.preventDefault()
    selected = true
    const side = opening.getAttribute("data-opening-side") ?? opening.getAttribute("data-grip-side") ?? opening.getAttribute("data-zipper-side")
    drag = { ...hit(e, side), x: point(e).x, ...values(), side: side === "right" ? -1 : 1 }
    svg.setPointerCapture(e.pointerId); draw()
  }, true)
  svg.addEventListener("pointermove", e => {
    if (!drag) {
      const opening = (e.target as Element).closest('[data-role="grip-seal"], [data-role="grip-seal-label"], [data-role="zipper-group"]') as SVGElement | null
      if (opening) {
        const side = opening.getAttribute("data-grip-side") ?? opening.getAttribute("data-zipper-side")
        opening.style.cursor = hit(e, side).mode === "resize" ? "col-resize" : "move"
      }
      return
    }
    const dx = (point(e).x - drag.x) * drag.side
    const outerResize = drag.mode === "resize" && drag.edge === "outer"
    const offset = drag.mode === "move" || outerResize
      ? Math.max(0, Math.min((cutterWidth - (outerResize ? .5 : drag.width)) / 2, drag.offset + dx))
      : drag.offset
    const width = drag.mode === "resize"
      ? outerResize
        ? Math.max(.5, snapResizeFromOrigin(drag.width, drag.width - (offset - drag.offset)))
        : Math.max(.5, Math.min(cutterWidth - offset * 2, snapResizeFromOrigin(drag.width, drag.width + dx)))
      : drag.width
    const doy = pending.doyPouch!
    pending = { ...pending, doyPouch: zip ? { ...doy, zipper: { ...doy.zipper, offsetX: offset, width } } : { ...doy, sideBleed: offset, gripSeal: width } }
    update(); e.preventDefault()
  })
  svg.addEventListener("pointerup", e => {
    if (!drag) return
    const changed = JSON.stringify(pending) !== JSON.stringify(spec)
    drag = null; svg.releasePointerCapture(e.pointerId)
    if (changed) commit(pending)
  })
  svg.addEventListener("pointercancel", () => { drag = null; pending = spec; update() })
  svg.addEventListener("keydown", e => { if (e.key === "Escape") { selected = false; draw() } })
}
