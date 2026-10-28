import { applySubstrateAppearance } from "./substrateAppearance"
import type { FlowwrapSpec } from "../types/flowwrap"

const SVG_NS = "http://www.w3.org/2000/svg"
/** Same green and weight as every other pack's cutter outline. */
export const SANDBOX_CUTTER_STROKE = "#2eb774"
export const SANDBOX_CUTTER_STROKE_WIDTH = 0.75
const MARGIN_MM = 40

/** Sandbox Film Colour (Specs ▸ Substrate) → canvas substrate appearance. */
export function sandboxSubstrateFor(filmColour: string): NonNullable<FlowwrapSpec["substrate"]> {
  switch (filmColour) {
    case "White": case "Matt": return "white"
    case "White Paper": return "white-paper"
    case "Brown Paper": return "paper"
    case "Black Paper": return "black-paper"
    default: return "clear"
  }
}

/**
 * AMENDS 6.2 — the Sandbox Set-Up cutter: a substrate and a green cutter
 * outline only. No seals, eyemarks, measures or other elements.
 */
export function renderSandboxCutter(widthMm: number, heightMm: number, filmColour = "Clear"): SVGSVGElement {
  const width = Math.max(1, widthMm), height = Math.max(1, heightMm)
  const svg = document.createElementNS(SVG_NS, "svg")
  svg.setAttribute("viewBox", `0 0 ${width + MARGIN_MM * 2} ${height + MARGIN_MM * 2}`)
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.setAttribute("data-pack", "sandbox")
  svg.setAttribute("data-sandbox-width", String(width))
  svg.setAttribute("data-sandbox-height", String(height))
  svg.style.background = "#fff"

  const substrateLayer = document.createElementNS(SVG_NS, "g")
  substrateLayer.setAttribute("id", "substrate")
  substrateLayer.setAttribute("data-layer-id", "substrate")
  const substrate = document.createElementNS(SVG_NS, "rect")
  for (const [key, value] of Object.entries({ x: MARGIN_MM, y: MARGIN_MM, width, height, stroke: "none" })) substrate.setAttribute(key, String(value))
  substrateLayer.appendChild(substrate)

  const cutterLayer = document.createElementNS(SVG_NS, "g")
  cutterLayer.setAttribute("id", "cut_lines")
  cutterLayer.setAttribute("data-layer-id", "cutter-outline")
  const inset = SANDBOX_CUTTER_STROKE_WIDTH / 2
  const outline = document.createElementNS(SVG_NS, "rect")
  for (const [key, value] of Object.entries({
    x: MARGIN_MM + inset, y: MARGIN_MM + inset,
    width: Math.max(0, width - SANDBOX_CUTTER_STROKE_WIDTH), height: Math.max(0, height - SANDBOX_CUTTER_STROKE_WIDTH),
    fill: "none", stroke: SANDBOX_CUTTER_STROKE, "stroke-width": SANDBOX_CUTTER_STROKE_WIDTH,
    "data-role": "sandbox-cutter-outline", "pointer-events": "none"
  })) outline.setAttribute(key, String(value))
  cutterLayer.appendChild(outline)

  svg.append(substrateLayer, cutterLayer)
  applySubstrateAppearance(svg, { substrate: sandboxSubstrateFor(filmColour) } as FlowwrapSpec)
  svg.setAttribute("data-substrate", sandboxSubstrateFor(filmColour))
  return svg
}
