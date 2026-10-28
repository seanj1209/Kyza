export type LegendKeyEntry = {
  label: string
  stroke: string
  fill: string
  dash: string
  shape: "line" | "rect" | "oval" | "perf" | "hanger" | "hole" | "eye"
  preview: string
}

const definitions: { label: string; selector: string; shape: LegendKeyEntry["shape"]; fallback: string }[] = [
  { label:"CUTTER", selector:'[data-layer-id="cutter-outline"] path, [data-layer-id="cutter-outline"] rect, [data-layer-id="cutter-outline"] line', shape:"line", fallback:"#1ca36a" },
  { label:"DIMENSIONS", selector:'[data-layer-id="measurement-guides"] line, [data-layer-id="measures"] line, #dimensions line', shape:"line", fallback:"#ff3939" },
  { label:"SAFE PRINT AREA", selector:'[data-role="safe-zone-outline"], [data-role="safe-zone-arc"], [data-role="safe-zone-k-arm"]', shape:"rect", fallback:"#ea0bba" },
  { label:"SEALS", selector:'[data-role="seal-rect"], [data-role="kseal-side-seal"]', shape:"rect", fallback:"#73b3a0" },
  // AMENDS 6.1: K Seal side seals (Seals) and the gusset (Gusset ▸ Fill) have separate paints.
  { label:"GUSSET", selector:'[data-role="kseal-bottom-seal"]', shape:"rect", fallback:"#2E8B57" },
  { label:"FOLDS", selector:'[data-role="fold-line"], [data-role="gusset-arc"], [data-role="doy-center-line"], [data-role="doy-oval"], [data-layer-id="fold-lines"] line, [data-layer-id="fold-lines"] path, [data-layer-id="gusset-fold-line"] line', shape:"line", fallback:"#59666c" },
  { label:"PERFORATIONS", selector:'[data-role="perf-lane"], [data-role="perf-dot"], [data-layer-id="perf-lines"] line, [data-layer-id="perf-lines"] path', shape:"perf", fallback:"#9e6bb2" },
  { label:"WINDOWS", selector:'[data-role="window-shape"]', shape:"oval", fallback:"#4a9ab9" },
  { label:"HANGER SLOTS", selector:'[data-role="hanger-slot"]', shape:"hanger", fallback:"#d08b40" },
  { label:"DIE CUT HOLES", selector:'[data-role="half-moon-cutout"]', shape:"hole", fallback:"#b4773e" },
  { label:"ATTRIBUTES", selector:'[data-role="attribute-box"]', shape:"rect", fallback:"#8a6cb4" },
  { label:"EYEMARKS", selector:'[data-role="eye-mark"]', shape:"eye", fallback:"#b8222a" }
]

const NS = "http://www.w3.org/2000/svg"
const valid = (value: string | null | undefined) => value?.trim() || undefined
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" })[character]!)

/** A miniature of the rendered object, using its own geometry and paint. */
function previewOf(source: SVGGraphicsElement, shape: LegendKeyEntry["shape"], stroke: string, fill: string, dash: string) {
  const clone = source.cloneNode(true) as SVGGraphicsElement
  clone.removeAttribute("id")
  clone.removeAttribute("pointer-events")
  clone.removeAttribute("cursor")
  clone.setAttribute("stroke", stroke)
  clone.setAttribute("fill", fill)
  if (dash !== "none") clone.setAttribute("stroke-dasharray", dash)
  const strokeWidth = valid(source.getAttribute("stroke-width")) ?? "0.6"
  clone.setAttribute("stroke-width", strokeWidth)
  if (shape === "line" || (shape === "perf" && source.tagName.toLowerCase() !== "circle")) {
    const style = ["opacity", "stroke-opacity", "stroke-linecap", "stroke-linejoin"]
      .map(name => source.getAttribute(name) ? ` ${name}="${escape(source.getAttribute(name)!)}"` : "").join("")
    return `<line x1="0" y1="2" x2="8" y2="2" stroke="${escape(stroke)}" fill="none" stroke-width="${escape(strokeWidth)}"${dash !== "none" ? ` stroke-dasharray="${escape(dash)}"` : ""}${style}/>`
  }
  // The source may have a large cutter-space translation. The key displays
  // its native silhouette, not its position on the cutter.
  clone.removeAttribute("transform")
  if (shape === "rect" && fill !== "none" && source.tagName.toLowerCase() === "rect") {
    clone.setAttribute("x", "2")
    clone.setAttribute("y", "0")
    clone.setAttribute("width", "4")
    clone.setAttribute("height", "4")
    return clone.outerHTML
  }
  const scratch = document.createElementNS(NS, "svg")
  scratch.style.cssText = "position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;visibility:hidden"
  scratch.append(clone)
  document.body.append(scratch)
  let box: SVGRect
  try { box = clone.getBBox() } finally { scratch.remove() }
  if (!Number.isFinite(box.width) || !Number.isFinite(box.height) || box.width <= 0 || box.height <= 0) {
    return `<rect x="2" y="0" width="4" height="4" fill="${escape(fill)}" stroke="${escape(stroke)}" stroke-width="${escape(strokeWidth)}"/>`
  }
  const rotate = shape === "hanger" && source.tagName.toLowerCase() === "path"
  const bounds = rotate
    ? { x:box.y, y:-box.x-box.width, width:box.height, height:box.width }
    : box
  const scale = Math.min(8 / bounds.width, 4 / bounds.height) * .8
  const x = (8 - bounds.width * scale) / 2 - bounds.x * scale
  const y = (4 - bounds.height * scale) / 2 - bounds.y * scale
  return `<g transform="translate(${x} ${y}) scale(${scale})${rotate ? " rotate(-90)" : ""}">${clone.outerHTML}</g>`
}

/** Build the key from visible artwork; identical looks share one sample. */
export function collectLegendKey(svg: SVGSVGElement): LegendKeyEntry[] {
  const entries: LegendKeyEntry[] = []
  for (const definition of definitions) {
    const seen = new Set<string>()
    for (const element of svg.querySelectorAll<SVGGraphicsElement>(definition.selector)) {
      if (element.closest('[display="none"], [data-export-ui="true"]') || element.style.display === "none") continue
      const computed = getComputedStyle(element)
      if (computed.display === "none" || computed.visibility === "hidden") continue
      const stroke = valid(element.getAttribute("stroke")) ?? valid(computed.getPropertyValue("stroke")) ?? definition.fallback
      const fill = valid(element.getAttribute("fill")) ?? valid(computed.getPropertyValue("fill")) ?? "none"
      const dash = valid(element.getAttribute("stroke-dasharray")) ?? valid(computed.getPropertyValue("stroke-dasharray")) ?? "none"
      const opacity = valid(element.getAttribute("opacity")) ?? valid(computed.getPropertyValue("opacity")) ?? "1"
      const silhouette = definition.shape === "hanger" || definition.shape === "oval" || definition.shape === "hole"
        ? element.getAttribute("d") ?? element.getAttribute("data-shape") ?? element.tagName
        : element.tagName
      const style = ["stroke-width", "stroke-opacity", "fill-opacity", "stroke-linecap", "stroke-linejoin"]
        .map(name => element.getAttribute(name) ?? "").join("|")
      const key = `${stroke}|${fill}|${dash}|${opacity}|${style}|${silhouette}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({ label:definition.label, stroke, fill, dash, shape:definition.shape,
        preview:previewOf(element, definition.shape, stroke, fill, dash) })
    }
  }
  return entries
}
