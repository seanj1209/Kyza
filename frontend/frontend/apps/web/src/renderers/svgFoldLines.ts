import type { FoldLineSegment } from "../geometry/foldLines"

const SVG_NS = "http://www.w3.org/2000/svg"
const FOLD_STYLE = {
  stroke: "#2eb774",
  strokeWidth: 0.3,
  dash: "3 2"
}

export function renderFoldLines(
  layer: SVGGElement,
  lines: FoldLineSegment[],
  liveOriginX: number,
  minX: number,
  maxX: number
) {
  layer.setAttribute("data-live-origin-x", liveOriginX.toString())
  layer.setAttribute("data-min-x", minX.toString())
  layer.setAttribute("data-max-x", maxX.toString())

  for (const segment of lines) {
    const l = document.createElementNS(SVG_NS, "line")
    l.setAttribute("x1", segment.x1.toString())
    l.setAttribute("y1", segment.y1.toString())
    l.setAttribute("x2", segment.x2.toString())
    l.setAttribute("y2", segment.y2.toString())
    l.setAttribute("stroke", FOLD_STYLE.stroke)
    l.setAttribute("stroke-width", FOLD_STYLE.strokeWidth.toString())
    l.setAttribute("stroke-dasharray", FOLD_STYLE.dash)
    l.setAttribute("stroke-linecap", "round")
    if (segment.id) {
      l.setAttribute("data-line-id", segment.id)
    }
    l.setAttribute("data-role", "fold-line")
    l.setAttribute("cursor", "col-resize")
    l.setAttribute("pointer-events", "stroke")
    layer.appendChild(l)

    const hitbox = document.createElementNS(SVG_NS, "line")
    hitbox.setAttribute("x1", segment.x1.toString())
    hitbox.setAttribute("y1", segment.y1.toString())
    hitbox.setAttribute("x2", segment.x2.toString())
    hitbox.setAttribute("y2", segment.y2.toString())
    hitbox.setAttribute("stroke", "transparent")
    hitbox.setAttribute("stroke-width", "8")
    if (segment.id) {
      hitbox.setAttribute("data-line-id", segment.id)
    }
    hitbox.setAttribute("data-role", "fold-line-hit")
    hitbox.setAttribute("cursor", "col-resize")
    hitbox.setAttribute("pointer-events", "stroke")
    layer.appendChild(hitbox)
  }
}
