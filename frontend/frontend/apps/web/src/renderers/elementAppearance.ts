import type { FlowwrapSpec } from "../types/flowwrap"

export type Appearance = NonNullable<FlowwrapSpec["elementAppearance"]>[string]
export type AppearanceTarget = {
  id: string; name: string; group: "elements" | "measures"; selector: string
  icon: string; caps: (keyof Appearance)[]; defaults: Required<Appearance>
  /** Targets that share a feature appear as one Customise chip with a part switch (K Seal Gusset: Fill / Outline). */
  feature?: { id: string; name: string; part: "Fill" | "Outline" }
}
const defaults = (color = "#1a2a49", thickness = .3, opacity = 1, fill: Appearance["fill"] = "none"): Required<Appearance> =>
  ({ color, thickness, opacity, lineStyle: "solid", fill: fill!, fontSize: 4 })
const lineCaps: (keyof Appearance)[] = ["color", "thickness", "lineStyle", "opacity"]
/** Shared dash mapping so renderer defaults and Customise overrides draw identical line styles. */
export const LINE_STYLE_DASH: Record<Appearance["lineStyle"] & string, string> = { solid: "none", dashed: "3 2", dotted: ".5 1.5" }

/**
 * AMENDS 6.1 K Seal styling ownership — the single source of the defaults the
 * renderer draws and the Customise panel shows:
 *  - Gusset Fill    → K arms, arm junctions and bottom-seal bands (stored as "gusset-seals")
 *  - Gusset Outline → gusset boundary edges, fold guides and centre line (stored as "gusset")
 *  - Side seals     → Base ▸ Seals customise (baseCustomisation.seals)
 * The storage keys are the existing 6.0 keys, so saved projects keep their colours.
 */
export const KSEAL_GUSSET_FILL_DEFAULTS: Required<Appearance> = { ...defaults("#2E8B57", .3, .32, "solid") }
export const KSEAL_GUSSET_OUTLINE_DEFAULTS: Required<Appearance> = { ...defaults("#188b54", .6, .7), lineStyle: "dotted" }
export const KSEAL_SIDE_SEAL_DEFAULTS = { color: "#2eb774", opacity: .32, style: "default" as const }
const KSEAL_GUSSET_TARGETS: AppearanceTarget[] = [
  { id: "gusset-seals", name: "Gusset fill", group: "elements", selector: '[data-role="kseal-gusset-seal-visual"]', icon: "gusset-arch",
    caps: ["color", "opacity", "fill"], defaults: KSEAL_GUSSET_FILL_DEFAULTS, feature: { id: "gusset", name: "Gusset", part: "Fill" } },
  { id: "gusset", name: "Gusset outline", group: "elements", selector: '[data-role="kseal-gusset-outline"], [data-role="kseal-bottom-seal-guide"], [data-role="kseal-center-line"]', icon: "gusset-arch",
    caps: lineCaps, defaults: KSEAL_GUSSET_OUTLINE_DEFAULTS, feature: { id: "gusset", name: "Gusset", part: "Outline" } }
]
export const APPEARANCE_TARGETS: AppearanceTarget[] = [
  {id:"text-direction",name:"Text Direction",group:"elements",selector:'[data-role="text-direction-art"]',icon:"text-direction",caps:["color","opacity"],defaults:defaults("#2eb774",.3,.4)},
  ...["bbe", "barcode", "qr", "label", "clear-strip"].map(kind => ({
    id: kind, name: ({ bbe: "BBE box", barcode: "Barcode", qr: "QR code", label: "Label", "clear-strip": "Clear strip" })[kind]!,
    group: "elements" as const, selector: `[data-role="attribute-box"][data-kind="${kind}"]`,
    icon: kind === "qr" ? "qr-code" : kind === "label" ? "labels" : kind,
    caps: kind === "label" ? ["color", "opacity", "fontSize"] as (keyof Appearance)[] : kind === "clear-strip" ? ["color", "opacity", "fill"] as (keyof Appearance)[] : lineCaps,
    defaults: defaults(kind === "clear-strip" ? "#f4fbff" : "#1a2a49", .3, kind === "clear-strip" ? .82 : 1, kind === "clear-strip" ? "solid" : "none")
  })),
  { id: "windows", name: "Windows", group: "elements", selector: '[data-role="window-shape"]', icon: "window-rounded-rectangle", caps: [...lineCaps, "fill"], defaults: defaults("#206027", .6) },
  { id: "hanger", name: "Hanger slots / holes", group: "elements", selector: '[data-role="hanger-slot"]', icon: "hanger", caps: lineCaps, defaults: defaults("#2eb774") },
  { id: "halfmoon", name: "Half-moon cutouts", group: "elements", selector: '[data-role="half-moon-cutout"]', icon: "half-moon", caps: [...lineCaps, "fill"], defaults: defaults("#2eb774", .3, 1, "tint") },
  { id: "safe", name: "Safe zones", group: "elements", selector: '[data-role="safe-zone-outline"]:not([stroke="none"]), [data-role="safe-zone-arc"], [data-role="safe-zone-k-arm"]', icon: "safe", caps: lineCaps, defaults: { ...defaults("#ea0bba", .6, .6), lineStyle: "dashed" } },
  { id: "fold", name: "Fold lines", group: "elements", selector: '[data-role="fold-line"]', icon: "fold", caps: lineCaps, defaults: { ...defaults("#2eb774"), lineStyle: "dashed" } },
  { id: "zip", name: "Zipper", group: "elements", selector: '[data-layer-id="zips"]', icon: "zipper", caps: lineCaps, defaults: defaults("#2eb774") },
  { id: "grip", name: "Grip seals", group: "elements", selector: '[data-layer-id="grip-seals"]', icon: "grip", caps: lineCaps, defaults: defaults("#2eb774") },
  { id: "tear", name: "Tear notches", group: "elements", selector: '[data-layer-id="tear-notches"]', icon: "tear", caps: lineCaps, defaults: defaults("#2eb774") },
  { id: "gusset", name: "Gusset guides", group: "elements", selector: '[data-layer-id^="gusset-"], [data-role="kseal-center-line"], [data-role="kseal-bottom-seal-guide"], [data-role="kseal-inner-arm-guide"]', icon: "gusset-arch", caps: lineCaps, defaults: defaults("#20784a") },
  { id: "gusset-seals", name: "Gusset Seals", group: "elements", selector: '[data-role="doy-seal-visual"], [data-role="kseal-gusset-seal-visual"]', icon: "gusset-arch", caps: ["color", "opacity", "fill"], defaults: defaults("#2E8B57", .3, .32, "solid") },
  { id: "main", name: "Main measures", group: "measures", selector: '#annotations, #measurement_annotations, #measurement_guides, [data-role^="paper-strip-measure-main"]', icon: "scribe", caps: ["color", "thickness", "opacity", "fontSize"], defaults: { ...defaults("#d23429", .6), fontSize: 6 } },
  { id: "sub", name: "Sub measures", group: "measures", selector: '[id^="sub_measure"], [data-role^="kseal-submeasure"], [data-role^="paper-strip-measure"]:not([data-role^="paper-strip-measure-main"])', icon: "scribe", caps: ["color", "thickness", "opacity", "fontSize"], defaults: defaults("#d23429", .3) }
]
/** Pack-aware target list: K Seal swaps the DOY-shaped gusset targets for its Gusset Fill/Outline pair. */
export function appearanceTargetsFor(spec: FlowwrapSpec | null | undefined): AppearanceTarget[] {
  if (!spec?.kSealPouch) return APPEARANCE_TARGETS
  return APPEARANCE_TARGETS.map(t => KSEAL_GUSSET_TARGETS.find(k => k.id === t.id) ?? t)
}
export function availableAppearanceTargets(spec: FlowwrapSpec) {
  return appearanceTargetsFor(spec).filter(t => {
    if(t.id==="text-direction")return spec.attributeBoxes?.some(b=>b.labelKey==="text-direction" && b.enabled!==false)
    if (t.group === "measures") return true
    if (["bbe", "barcode", "qr", "label", "clear-strip"].includes(t.id)) return spec.attributeBoxes?.some(b => b.kind === t.id && b.enabled !== false)
    return ({ windows: !!spec.windows?.length, hanger: !!spec.hangerSlots?.length, halfmoon: !!spec.halfMoonCutouts?.length,
      safe: spec.safeZones?.some(z => z.enabled !== false), fold: !!spec.foldLines?.length, zip: spec.doyPouch?.showZipper,
      grip: spec.doyPouch?.showGripSeal, tear: spec.doyPouch?.showTearNotch || spec.sachet?.tearNotch?.enabled,
      gusset: !!spec.doyPouch || !!spec.kSealPouch, "gusset-seals": !!spec.doyPouch || !!spec.kSealPouch } as Record<string, unknown>)[t.id]
  })
}
export function resolveAppearance(target: AppearanceTarget, value: Appearance = {}): Required<Appearance> {
  const fallback = target.defaults
  const bounded = (n: number | undefined, d: number, min: number, max: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d
  return { color: /^#[0-9a-f]{6}$/i.test(value.color ?? "") ? value.color!.toLowerCase() : fallback.color,
    thickness: bounded(value.thickness, fallback.thickness, .1, 10), opacity: bounded(value.opacity, fallback.opacity, 0, 1),
    fontSize: bounded(value.fontSize, fallback.fontSize, 2, 12),
    lineStyle: ["solid", "dashed", "dotted"].includes(value.lineStyle ?? "") ? value.lineStyle! : fallback.lineStyle,
    fill: ["none", "solid", "tint", "hatch"].includes(value.fill ?? "") ? value.fill! : fallback.fill }
}
/** Renderer-owned appearance pass shared by preview, artwork and exports. No coordinates change. */
export function applyElementAppearance(svg: SVGSVGElement, spec: FlowwrapSpec) {
  const directionTarget=APPEARANCE_TARGETS.find(t=>t.id==="text-direction")!
  const direction=resolveAppearance(directionTarget,{color:spec.baseCustomisation?.cutter.color,opacity:.4,...spec.elementAppearance?.["text-direction"]})
  svg.querySelectorAll<SVGElement>('[data-role="text-direction-art"]').forEach(art=>{
    art.setAttribute("fill",direction.color);art.setAttribute("opacity",String(direction.opacity))
  })
  appearanceTargetsFor(spec).forEach(target => {
    if(target.id==="text-direction")return
    const raw = spec.elementAppearance?.[target.id]
    if (!raw) return // Legacy/default renders remain byte-for-byte untouched.
    const appearance = resolveAppearance(target, raw)
    if (target.id === "gusset-seals" && (raw.opacity !== undefined || raw.fill !== undefined)) {
      svg.querySelectorAll(target.selector).forEach(group => group.setAttribute("opacity", String(appearance.opacity * (appearance.fill === "tint" ? .2 : 1))))
    }
    const nodes = new Set<SVGElement>()
    svg.querySelectorAll<SVGElement>(target.selector).forEach(root => {
      if (root.tagName.toLowerCase() === "g") root.querySelectorAll<SVGElement>("path,line,rect,polyline,polygon,circle,ellipse,text").forEach(n => nodes.add(n))
      else nodes.add(root)
      if (["bbe", "barcode", "qr", "label", "clear-strip"].includes(target.id)) root.parentElement?.querySelectorAll<SVGElement>('text[data-role="attribute-box-label"]').forEach(n => {
        if (n.getAttribute("data-box-id") === root.getAttribute("data-box-id")) nodes.add(n)
      })
    })
    nodes.forEach(node => {
      const role = node.getAttribute("data-role") ?? ""
      if (/hit|handle|move|rotate|warning|drag/.test(role) || node.getAttribute("fill") === "transparent") return
      const sub = node.closest('[id^="sub_measure"], [data-role^="kseal-submeasure"], [data-role^="paper-strip-measure"]:not([data-role^="paper-strip-measure-main"])')
      if (target.id === "main" && (sub || node.closest('[data-role="perf-measures"]'))) return
      if (target.id !== "gusset-seals" && target.caps.includes("opacity") && raw.opacity !== undefined) node.setAttribute("opacity", String(appearance.opacity))
      if (node.tagName.toLowerCase() === "text") {
        if (raw.color !== undefined) node.setAttribute("fill", appearance.color)
        if (target.caps.includes("fontSize") && raw.fontSize !== undefined) node.setAttribute("font-size", String(appearance.fontSize))
        return
      }
      if (target.caps.includes("thickness") && raw.thickness !== undefined) node.setAttribute("stroke-width", String(appearance.thickness))
      if (target.caps.includes("color") && raw.color !== undefined && target.id !== "label" && target.id !== "gusset-seals") node.setAttribute("stroke", appearance.color)
      if (target.caps.includes("lineStyle") && raw.lineStyle !== undefined) node.setAttribute("stroke-dasharray", LINE_STYLE_DASH[appearance.lineStyle])
      if (target.caps.includes("fill") && (raw.fill !== undefined || (raw.color !== undefined && ["solid", "tint", "hatch"].includes(appearance.fill)))) {
        let fill = appearance.fill === "none" ? "none" : appearance.color
        if (appearance.fill === "hatch") {
          const id = `kyza-appearance-hatch-${target.id}`
          if (!svg.querySelector(`#${id}`)) {
            const defs = document.createElementNS(svg.namespaceURI, "defs")
            defs.innerHTML = `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V3" stroke="${appearance.color}" stroke-width=".4"/></pattern>`
            svg.prepend(defs)
          }
          fill = `url(#${id})`
        }
        node.setAttribute("fill", fill)
        node.setAttribute("fill-opacity", target.id !== "gusset-seals" && appearance.fill === "tint" ? ".2" : "1")
      }
    })
  })
}
