import { resolveSachetLayout } from "../core/geometry/resolvers/resolveSachetLayout"
import type { FlowwrapSpec, RenderOptions } from "../types/flowwrap"
import { renderResolvedSachet } from "./sachetSvg"
import { sidePouchEyemarkRects } from "../geometry/sidePouchEyemarks"

const NS = "http://www.w3.org/2000/svg"
const el = <K extends keyof SVGElementTagNameMap>(tag: K) => document.createElementNS(NS, tag)

/** A side-seal pouch is one printed web: FOP at left, BOP reflected at right. */
export function renderSideSealPouch(spec: FlowwrapSpec, options: RenderOptions = {}): SVGSVGElement {
  const pouch = spec.sideSealPouch
  if (!pouch) throw new Error("Side-seal pouch settings are required")
  const trim = pouch.trimEnabled ? Math.max(0, pouch.trimWidth) : 0
  const panelWidth = spec.height
  const webHeight = spec.width
  const margin = 38
  const left = margin + trim
  const top = margin
  const centre = left + panelWidth
  const contentWidth = 2 * panelWidth + 2 * trim
  const root = el("svg")
  root.setAttribute("viewBox", `0 0 ${contentWidth + 2 * margin} ${webHeight + 2 * margin}`)
  root.setAttribute("width", "100%")
  root.setAttribute("height", "100%")
  root.setAttribute("data-side-pouch", String(pouch.sides))
  root.setAttribute("data-panel-width", String(panelWidth))
  root.setAttribute("data-panel-height", String(webHeight))
  root.setAttribute("data-substrate", spec.substrate ?? "clear")

  // Reuse the deterministic single-panel drawing for every seal and attribute.
  // The second face is a non-interactive mirror of the first, so an edited euro
  // slot or other placed element is reflected without creating another model item.
  const panelSpec: FlowwrapSpec = {
    ...spec,
    eyeMarks: undefined,
    sideSealPouch: { ...pouch, trimEnabled: false },
    sachet: { ...spec.sachet, trimWidth: 0, trimPosition: "both", stepEnabled: false, stepCount: 1 },
  }
  const panel = renderResolvedSachet(panelSpec, resolveSachetLayout(panelSpec), options)
  panel.querySelectorAll('[data-role="pouch-centre-fold"], [data-role="bottom-seal-centre-line"], [data-layer-id="measurement-guides"], [data-role^="sachet-measure"], [data-face="bop"]').forEach(node => node.remove())
  const face = (id: "fop" | "bop") => {
    const placed = el("g")
    placed.setAttribute("data-pouch-face", id)
    if (id === "bop") {
      placed.setAttribute("transform", `translate(${2 * centre} 0) scale(-1 1)`)
      placed.setAttribute("pointer-events", "none")
    }
    const turned = el("g")
    turned.setAttribute("transform", `translate(${left} ${top + webHeight}) rotate(-90)`)
    const viewport = el("svg")
    viewport.setAttribute("width", String(webHeight))
    viewport.setAttribute("height", String(panelWidth))
    viewport.setAttribute("viewBox", `80 80 ${webHeight} ${panelWidth}`)
    viewport.setAttribute("overflow", "hidden")
    viewport.setAttribute("data-role", "pouch-face-viewport")
    // AMENDS 8.2: canvas rules aimed at the root drawing (`#preview svg` sets
    // width/height auto, max-* 100% and a white card background) also match
    // this nested viewport and would override its size attributes, drawing the
    // face unturned and off the web. Inline values keep it a plain viewport.
    viewport.setAttribute("style", `width:${webHeight}px;height:${panelWidth}px;max-width:none;max-height:none;background:none;box-shadow:none;border-radius:0;overflow:hidden`)
    Array.from(panel.childNodes).forEach(node => viewport.appendChild(node.cloneNode(true)))
    if (id === "bop") viewport.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"))
    turned.appendChild(viewport)
    placed.appendChild(turned)
    root.appendChild(placed)
  }
  face("fop")
  face("bop")

  const guides = el("g")
  guides.setAttribute("data-layer-id", "pouch-guides")
  const outer = el("rect")
  for (const [key, value] of Object.entries({ x: margin, y: top, width: contentWidth, height: webHeight })) outer.setAttribute(key, String(value))
  outer.setAttribute("fill", "none")
  outer.setAttribute("stroke", "#2eb774")
  outer.setAttribute("stroke-width", ".75")
  outer.setAttribute("data-role", "pouch-web-outline")
  guides.appendChild(outer)
  const centreLine = el("line")
  centreLine.setAttribute("x1", String(centre)); centreLine.setAttribute("x2", String(centre))
  centreLine.setAttribute("y1", String(top)); centreLine.setAttribute("y2", String(top + webHeight))
  centreLine.setAttribute("stroke", "#2eb774")
  centreLine.setAttribute("stroke-width", ".3")
  centreLine.setAttribute("data-role", pouch.sides === 2 ? "pouch-centre-fold" : "bottom-seal-centre-line")
  if (pouch.sides === 2) centreLine.setAttribute("stroke-dasharray", "2 1")
  guides.appendChild(centreLine)
  root.appendChild(guides)

  const eyemarks = el("g")
  eyemarks.setAttribute("data-layer-id", "eyemarks")
  if (trim > 0) {
    for (const [index, x] of [margin, margin + contentWidth - trim].entries()) {
      const band = el("rect")
      for (const [key, value] of Object.entries({ x, y: top, width: trim, height: webHeight })) band.setAttribute(key, String(value))
      band.setAttribute("fill", "#b9dfe8")
      band.setAttribute("opacity", ".3")
      band.setAttribute("data-role", "pouch-trim")
      band.setAttribute("data-trim-side", index === 0 ? "left" : "right")
      root.appendChild(band)
      const placement = sidePouchEyemarkRects(spec)[index]
      if (!placement) continue
      const mark = el("rect")
      for (const [key, value] of Object.entries({ x: placement.x, y: placement.y, width: placement.width, height: placement.height })) mark.setAttribute(key, String(value))
      mark.setAttribute("fill", "#000000")
      mark.setAttribute("data-role", "eye-mark")
      mark.setAttribute("data-eye-index", String(index))
      eyemarks.appendChild(mark)
    }
  }
  root.appendChild(eyemarks)

  const measures = el("g")
  measures.setAttribute("data-layer-id", "measurement-guides")
  const measure = (role: string, x1: number, y1: number, x2: number, y2: number, label: string, tx: number, ty: number, rotated = false) => {
    const group = el("g")
    group.setAttribute("data-role", role)
    const line = el("line")
    for (const [key, value] of Object.entries({ x1, y1, x2, y2 })) line.setAttribute(key, String(value))
    line.setAttribute("stroke", "#d23429"); line.setAttribute("stroke-width", ".3")
    group.appendChild(line)
    const startCap = el("line"), endCap = el("line")
    if (rotated) {
      for (const [cap, y] of [[startCap, y1], [endCap, y2]] as const) {
        cap.setAttribute("x1", String(x1 - 3)); cap.setAttribute("x2", String(x1 + 3))
        cap.setAttribute("y1", String(y)); cap.setAttribute("y2", String(y))
      }
    } else {
      for (const [cap, x] of [[startCap, x1], [endCap, x2]] as const) {
        cap.setAttribute("x1", String(x)); cap.setAttribute("x2", String(x))
        cap.setAttribute("y1", String(y1 - 3)); cap.setAttribute("y2", String(y1 + 3))
      }
    }
    for (const cap of [startCap, endCap]) {
      cap.setAttribute("stroke", "#d23429"); cap.setAttribute("stroke-width", ".3")
      cap.setAttribute("data-role", `${role}-cap`)
      group.appendChild(cap)
    }
    const text = el("text")
    text.setAttribute("x", String(tx)); text.setAttribute("y", String(ty))
    text.setAttribute("text-anchor", "middle"); text.setAttribute("font-size", "4")
    text.setAttribute("fill", "#d23429")
    if (rotated) text.setAttribute("transform", `rotate(-90 ${tx} ${ty})`)
    text.textContent = label
    group.appendChild(text)
    measures.appendChild(group)
  }
  measure("main-measure-width", margin, top - 11, margin + contentWidth, top - 11, `${contentWidth} mm`, margin + contentWidth / 2, top - 15)
  measure("main-measure-height", margin - 11, top, margin - 11, top + webHeight, `${webHeight} mm`, margin - 15, top + webHeight / 2, true)
  root.appendChild(measures)
  return root
}
