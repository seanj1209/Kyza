import type { FlowwrapSpec, ObjectAppearance } from "../types/flowwrap"

export const hexColour = (value: unknown, fallback: string) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value : fallback
export const bounded = (n: unknown, fallback: number, min: number, max: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback
export function styleObject(node: SVGElement, style: ObjectAppearance) {
  if (style.fillEnabled !== undefined) node.setAttribute("fill", style.fillEnabled ? hexColour(style.fillColor, "#ffffff") : "none")
  else if (style.fillColor) node.setAttribute("fill", hexColour(style.fillColor, "#ffffff"))
  if (style.fillOpacity !== undefined) node.setAttribute("fill-opacity", String(bounded(style.fillOpacity, 1, 0, 1)))
  if (style.strokeEnabled !== undefined) node.setAttribute("stroke", style.strokeEnabled ? hexColour(style.strokeColor, "#1a2a49") : "none")
  else if (style.strokeColor) node.setAttribute("stroke", hexColour(style.strokeColor, "#1a2a49"))
  if (style.strokeOpacity !== undefined) node.setAttribute("stroke-opacity", String(bounded(style.strokeOpacity, 1, 0, 1)))
  if (style.strokeWidth !== undefined) node.setAttribute("stroke-width", String(bounded(style.strokeWidth, .3, .01, 20)))
  if (style.strokeStyle) node.setAttribute("stroke-dasharray", ({solid:"none",dashed:"3 2",dotted:".5 1.5"})[style.strokeStyle] ?? "none")
}
/** Uses the existing selection identities; geometry and interaction hit targets stay untouched. */
export function applyObjectAppearance(svg: SVGSVGElement, spec: FlowwrapSpec) {
  const attributes: Record<string,string> = { "attribute-box":"data-box-id",window:"data-window-id","safe-zone":"data-zone-id","fold-line":"data-line-id","hanger-slot":"data-slot-id","half-moon":"data-cutout-id","eye-mark":"data-eye-index","perf-lane":"data-lane-index",layer:"data-layer-id" }
  for (const [id, style] of Object.entries(spec.objectAppearance ?? {})) {
    const split = id.indexOf(":"), attribute = attributes[id.slice(0,split)], value = id.slice(split+1)
    if (!attribute) continue
    // Attribute comparisons avoid interpolating imported IDs into CSS selectors.
    svg.querySelectorAll<SVGElement>(`[${attribute}]`).forEach(root => {
      if (root.getAttribute(attribute) !== value) return
      const nodes = root.tagName.toLowerCase() === "g" ? [...root.querySelectorAll<SVGElement>("path,rect,line,ellipse,circle,polygon,polyline")] : [root]
      nodes.forEach(node => {
        const role = node.getAttribute("data-role") ?? ""
        if (/hit|handle|move|rotate|warning|drag|label/.test(role) || node.getAttribute("fill") === "transparent" || node.tagName.toLowerCase() === "text") return
        styleObject(node, style)
      })
    })
  }
}
