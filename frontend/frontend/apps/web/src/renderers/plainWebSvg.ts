import type { ResolvedPlainWebLayout } from "../core/geometry/resolvers/resolvePlainWebLayout"
import { renderHangerSlotWarnings, renderHangerSlots } from "./svgHangerSlots"
import { renderEyeMarks } from "./svgEyeMarks"
import type { FlowwrapSpec } from "../types/flowwrap"

const SVG_NS = "http://www.w3.org/2000/svg"

function createGroup(id: string) {
  const group = document.createElementNS(SVG_NS, "g")
  group.setAttribute("data-layer-id", id)
  return group
}

export function renderResolvedPlainWeb(
  layout: ResolvedPlainWebLayout,
  spec?: FlowwrapSpec
): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("xmlns", SVG_NS)
  const plainFilm = Boolean(spec)
  const measureMargin = plainFilm ? 36 : 0
  svg.setAttribute("viewBox", `${-measureMargin} ${-measureMargin} ${layout.cutterRect.width + 2 * measureMargin} ${layout.cutterRect.height + 2 * measureMargin}`)
  svg.setAttribute("width", layout.cutterRect.width.toString())
  svg.setAttribute("height", layout.cutterRect.height.toString())

  const substrateLayer = createGroup("substrate")
  const cutterLayer = createGroup("cutter")
  const cutLineLayer = createGroup("cut-lines")
  const slitLineLayer = createGroup("slit-lines")
  const hangerSlotLayer = createGroup("hanger-slots")
  const warningLayer = createGroup("warnings")
  const measureLayer = createGroup("measures")
  const eyemarkLayer = createGroup("eyemark_track")
  eyemarkLayer.setAttribute("data-layer-id", "eyemarks")

  const cutter = document.createElementNS(SVG_NS, "rect")
  cutter.setAttribute("x", layout.cutterRect.x.toString())
  cutter.setAttribute("y", layout.cutterRect.y.toString())
  cutter.setAttribute("width", layout.cutterRect.width.toString())
  cutter.setAttribute("height", layout.cutterRect.height.toString())
  cutter.setAttribute("fill", "none")
  cutter.setAttribute("stroke", plainFilm ? "#2eb774" : "#111")
  cutter.setAttribute("stroke-width", "0.6")
  cutterLayer.appendChild(cutter)
  if (plainFilm) {
    const substrate = document.createElementNS(SVG_NS, "rect")
    for (const key of ["x", "y", "width", "height"] as const) substrate.setAttribute(key, String(layout.cutterRect[key]))
    substrate.setAttribute("fill", "#b9dfe8")
    substrate.setAttribute("opacity", ".28")
    substrate.setAttribute("data-role", "plain-film-substrate")
    substrateLayer.appendChild(substrate)
    const addMeasure = (role: string, x1: number, y1: number, x2: number, y2: number, label: string, tx: number, ty: number, rotate = false) => {
      const group = createGroup(role)
      group.setAttribute("data-role", role)
      const line = document.createElementNS(SVG_NS, "line")
      for (const [key, value] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(key, String(value))
      line.setAttribute("stroke", "#d23429")
      line.setAttribute("stroke-width", ".35")
      group.appendChild(line)
      const text = document.createElementNS(SVG_NS, "text")
      text.setAttribute("x", String(tx)); text.setAttribute("y", String(ty))
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("font-size", "5")
      text.setAttribute("fill", "#d23429")
      if (rotate) text.setAttribute("transform", `rotate(-90 ${tx} ${ty})`)
      text.textContent = label
      group.appendChild(text)
      measureLayer.appendChild(group)
    }
    const c = layout.cutterRect
    addMeasure("main-measure-width", c.x, c.y - 11, c.x + c.width, c.y - 11, `${c.width} mm`, c.x + c.width / 2, c.y - 15)
    addMeasure("main-measure-height", c.x - 11, c.y, c.x - 11, c.y + c.height, `${c.height} mm`, c.x - 15, c.y + c.height / 2, true)
  }

  layout.guideLines.forEach(guideLine => {
    const line = document.createElementNS(SVG_NS, "line")
    line.setAttribute("x1", guideLine.x1.toString())
    line.setAttribute("y1", guideLine.y1.toString())
    line.setAttribute("x2", guideLine.x2.toString())
    line.setAttribute("y2", guideLine.y2.toString())
    line.setAttribute("stroke", guideLine.kind === "cut" ? "#d23429" : "#1f8f57")
    line.setAttribute("stroke-width", "0.5")
    if (guideLine.kind === "slit") {
      line.setAttribute("stroke-dasharray", "4 2")
    }
    ;(guideLine.kind === "cut" ? cutLineLayer : slitLineLayer).appendChild(line)
  })

  if (layout.hangerSlots.length > 0) {
    renderHangerSlots(
      hangerSlotLayer,
      [...layout.hangerSlots],
      layout.liveRect.x,
      layout.liveRect.y,
      layout.liveRect.width,
      {cutterOriginX:layout.cutterRect.x,cutterWidth:layout.cutterRect.width}
    )
    renderHangerSlotWarnings(
      warningLayer,
      [...layout.hangerSlots],
      layout.liveRect.x,
      layout.liveRect.y,
      layout.cutterRect.x
    )
  }

  svg.appendChild(substrateLayer)
  svg.appendChild(cutterLayer)
  svg.appendChild(cutLineLayer)
  svg.appendChild(slitLineLayer)
  svg.appendChild(hangerSlotLayer)
  if (spec?.eyeMarks && spec.eyeMarks.count > 0) {
    renderEyeMarks(eyemarkLayer, spec.eyeMarks, layout.cutterRect.x, layout.cutterRect.y, layout.cutterRect.width, layout.cutterRect.height, { top: layout.cutterRect.height, bottom: layout.cutterRect.height, left: layout.cutterRect.width, right: layout.cutterRect.width })
    svg.appendChild(eyemarkLayer)
  }
  svg.appendChild(warningLayer)
  if (plainFilm) svg.appendChild(measureLayer)
  return svg
}
