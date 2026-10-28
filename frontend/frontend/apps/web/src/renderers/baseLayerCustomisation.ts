import type { BaseLayerCustomisationSpec, FlowwrapSpec } from "../types/flowwrap"
import { applyElementAppearance, KSEAL_SIDE_SEAL_DEFAULTS } from "./elementAppearance"

const EYE_MARK_DEFAULTS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  "dark-blue": "#0b1b4a"
}

const HEX_RE = /^#([0-9a-f]{6})$/i

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const sanitizeHex = (value: string, fallback: string) =>
  HEX_RE.test(value) ? value.toLowerCase() : fallback

export function resolveBaseCustomisation(
  spec: FlowwrapSpec
): BaseLayerCustomisationSpec {
  const eyeMarkDefault = EYE_MARK_DEFAULTS[spec.eyeMarks?.color ?? "black"] ?? "#000000"
  const doySeal = Boolean(spec.doyPouch && !spec.kSealPouch)
  const sidePouchSeal = Boolean(spec.sideSealPouch)
  // AMENDS 6.1: on K Seal the Seals customise owns the side seals (#2eb774, 32%, solid).
  const kSeal = Boolean(spec.kSealPouch)
  const sealColourDefault = sidePouchSeal ? "#2e8b57" : doySeal ? "#2E8B57" : kSeal ? KSEAL_SIDE_SEAL_DEFAULTS.color : "#2eb774"
  const sealOpacityDefault = sidePouchSeal || doySeal ? 0.32 : kSeal ? KSEAL_SIDE_SEAL_DEFAULTS.opacity : 0.15
  return {
    cutter: {
      style: ["dashed", "dotted"].includes(spec.baseCustomisation?.cutter?.style ?? "") ? spec.baseCustomisation!.cutter.style : "default",
      thickness: clamp(spec.baseCustomisation?.cutter?.thickness ?? 0.75, 0.1, 10),
      color: sanitizeHex(spec.baseCustomisation?.cutter?.color ?? "#2eb774", "#2eb774"),
      opacity: clamp(spec.baseCustomisation?.cutter?.opacity ?? 1, 0, 1)
    },
    eyemark: {
      color: sanitizeHex(spec.baseCustomisation?.eyemark?.color ?? eyeMarkDefault, eyeMarkDefault),
      opacity: clamp(spec.baseCustomisation?.eyemark?.opacity ?? 1, 0, 1)
    },
    seals: {
      style: ["dashed", "dotted"].includes(spec.baseCustomisation?.seals?.style ?? "") ? spec.baseCustomisation!.seals.style : "default",
      thickness: clamp(spec.baseCustomisation?.seals?.thickness ?? 0.6, 0.1, 10),
      color: sanitizeHex(spec.baseCustomisation?.seals?.color ?? sealColourDefault, sealColourDefault),
      opacity: clamp(spec.baseCustomisation?.seals?.opacity ?? sealOpacityDefault, 0, 1)
    }
  }
}

export function applyBaseLayerCustomisation(svg: SVGSVGElement, spec: FlowwrapSpec) {
  const custom = resolveBaseCustomisation(spec)
  const doySeal = Boolean(spec.doyPouch && !spec.kSealPouch)
  const sidePouchSeal = Boolean(spec.sideSealPouch)

  const updateStrokeNodes = (
    root: ParentNode | null,
    options: { color: string; thickness: number; opacity: number }
  ) => {
    if (!root) {
      return
    }
    root
      .querySelectorAll<SVGElement>(
        "path, line, rect, polyline, polygon, circle, ellipse"
      )
      .forEach(node => {
        if (node.getAttribute("fill") === "transparent") {
          return
        }
        node.setAttribute("stroke", options.color)
        node.setAttribute("stroke-width", options.thickness.toString())
        node.setAttribute("opacity", options.opacity.toString())
      })
  }

  const cutterLayer = svg.querySelector<SVGGElement>('[data-layer-id="cutter-outline"]')
  updateStrokeNodes(cutterLayer, {
    color: custom.cutter.color,
    thickness: custom.cutter.thickness,
    opacity: custom.cutter.opacity
  })
  cutterLayer?.querySelectorAll<SVGElement>("path,line,rect,polyline,polygon,circle,ellipse").forEach(node => {
    if (node.getAttribute("fill") !== "transparent") node.setAttribute("stroke-dasharray", custom.cutter.style === "dashed" ? "3 2" : custom.cutter.style === "dotted" ? ".5 1.5" : "none")
  })

  const sealRects = svg.querySelectorAll<SVGRectElement>(
    '[data-layer-id="seal-areas"] [data-role="seal-rect"]'
  )
  const doyVisual = doySeal ? svg.querySelector<SVGGElement>('[data-role="doy-seal-visual"]') : null
  if (doyVisual) doyVisual.setAttribute("opacity", custom.seals.opacity.toString())
  sealRects.forEach(node => {
    node.setAttribute("fill", custom.seals.color)
    node.setAttribute("stroke", doySeal || sidePouchSeal ? "none" : custom.seals.color)
    node.setAttribute("stroke-width", custom.seals.thickness.toString())
    node.setAttribute("opacity", doyVisual ? "1" : custom.seals.opacity.toString())
    node.setAttribute("stroke-dasharray", sidePouchSeal ? "none" : custom.seals.style === "dashed" ? "3 2" : custom.seals.style === "dotted" ? ".5 1.5" : "none")
  })
  doyVisual?.querySelectorAll<SVGElement>('path[data-role="doy-bottom-seal-region"]').forEach(node => {
    node.setAttribute("fill", custom.seals.color)
    node.setAttribute("opacity", "1")
  })

  // K Seal side seals: one solid fill under the seal-areas group opacity, like
  // DOY seals. The gusset fill is a sibling group owned by Gusset ▸ Fill.
  if (spec.kSealPouch) {
    const kSealSideLayer = svg.querySelector<SVGGElement>('[data-layer-id="seal-areas"]')
    kSealSideLayer?.setAttribute("opacity", custom.seals.opacity.toString())
    kSealSideLayer?.querySelectorAll<SVGRectElement>('[data-role="kseal-side-seal"]').forEach(node => {
      node.setAttribute("fill", custom.seals.color)
      node.setAttribute("stroke", "none")
    })
  }

  const eyeMarks = svg.querySelectorAll<SVGElement>(
    '[data-layer-id="eyemarks"] [data-role="eye-mark"]'
  )
  eyeMarks.forEach(node => {
    // A stroke increases the visible size beyond the specified eyemark size.
    node.setAttribute("stroke", "none")
    node.removeAttribute("stroke-width")
    const fill = (node.getAttribute("fill") ?? "").toLowerCase()
    if (fill === "#d7261d") {
      return
    }
    node.setAttribute("fill", custom.eyemark.color)
    node.setAttribute("opacity", custom.eyemark.opacity.toString())
  })
  applyElementAppearance(svg, spec)
}
