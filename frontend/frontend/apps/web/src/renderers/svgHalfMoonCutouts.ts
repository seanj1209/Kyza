import { evaluateHalfMoonCutout } from "../constraints/halfMoonCutouts"
import type { FlowwrapSpec, HalfMoonCutoutSpec } from "../types/flowwrap"
import { createMovementHandleImage } from "./movementHandleImages"

const SVG_NS = "http://www.w3.org/2000/svg"

const CUTOUT_STYLE = {
  stroke: "#2eb774",
  strokeWidth: 0.3,
  fill: "#d9d9d9",
  fillOpacity: 0.45
}
const WARNING_STYLE = {
  fill: "#f9d9d7",
  stroke: "#d23429",
  text: "#7a1b17"
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.6
}

function appendWarningBox(
  layer: SVGGElement,
  text: string,
  x: number,
  y: number
) {
  const fontSize = 4
  const paddingX = 3
  const paddingY = 2
  const textWidth = estimateTextWidth(text, fontSize)
  const boxWidth = textWidth + paddingX * 2
  const boxHeight = fontSize + paddingY * 2
  const rectEl = document.createElementNS(SVG_NS, "rect")
  rectEl.setAttribute("x", x.toString())
  rectEl.setAttribute("y", y.toString())
  rectEl.setAttribute("width", boxWidth.toString())
  rectEl.setAttribute("height", boxHeight.toString())
  rectEl.setAttribute("fill", WARNING_STYLE.fill)
  rectEl.setAttribute("stroke", WARNING_STYLE.stroke)
  rectEl.setAttribute("stroke-width", "0.4")
  rectEl.setAttribute("data-role", "half-moon-warning")
  layer.appendChild(rectEl)

  const textEl = document.createElementNS(SVG_NS, "text")
  textEl.setAttribute("x", (x + paddingX).toString())
  textEl.setAttribute("y", (y + boxHeight - paddingY).toString())
  textEl.setAttribute("fill", WARNING_STYLE.text)
  textEl.setAttribute("font-size", fontSize.toString())
  textEl.textContent = text
  textEl.setAttribute("data-role", "half-moon-warning")
  layer.appendChild(textEl)
}

function buildHalfMoonPath(
  centerX: number,
  centerY: number,
  radius: number,
  direction: "up" | "down"
) {
  const leftX = centerX - radius
  const rightX = centerX + radius
  const y = centerY
  const sweep = direction === "down" ? 1 : 0
  return `M ${leftX} ${y} A ${radius} ${radius} 0 0 ${sweep} ${rightX} ${y} L ${leftX} ${y} Z`
}

export function renderHalfMoonCutouts(
  layer: SVGGElement,
  spec: FlowwrapSpec,
  cutouts: HalfMoonCutoutSpec[],
  originX: number,
  originY: number
) {
  layer.setAttribute("data-handle-radius", "2")
  const cutterHeight = spec.height
  const edges: Array<"top" | "bottom"> = ["top", "bottom"]
  for (const cutout of cutouts) {
    const radius = cutout.radius
    const state = evaluateHalfMoonCutout(spec, cutout)
    const stroke = state.flags.warning || state.flags.hardViolation
      ? WARNING_STYLE.stroke
      : CUTOUT_STYLE.stroke
    const isSelected = cutout.selected === true

    edges.forEach(edge => {
      const centerX = originX + cutout.centerX
      const centerY =
        edge === "bottom" ? originY + cutterHeight : originY + cutout.centerY
      const direction = edge === "bottom" ? "down" : "up"

      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", buildHalfMoonPath(centerX, centerY, radius, direction))
        path.setAttribute("fill", CUTOUT_STYLE.fill)
        path.setAttribute("fill-opacity", CUTOUT_STYLE.fillOpacity.toString())
        path.setAttribute("stroke", stroke)
        path.setAttribute("stroke-width", CUTOUT_STYLE.strokeWidth.toString())
        path.setAttribute("pointer-events", "stroke")
        path.setAttribute("cursor", "move")
        path.setAttribute("data-cutout-id", cutout.id)
        path.setAttribute("data-role", "half-moon-cutout")
        path.setAttribute("data-edge", edge)
        path.setAttribute("data-selected", isSelected ? "true" : "false")
        layer.appendChild(path)

      const hitbox = document.createElementNS(SVG_NS, "path")
      hitbox.setAttribute("d", buildHalfMoonPath(centerX, centerY, radius, direction))
        hitbox.setAttribute("fill", "transparent")
        hitbox.setAttribute("pointer-events", "all")
        hitbox.setAttribute("cursor", "move")
        hitbox.setAttribute("data-cutout-id", cutout.id)
        hitbox.setAttribute("data-role", "half-moon-cutout-hit")
        hitbox.setAttribute("data-edge", edge)
        hitbox.setAttribute("data-selected", isSelected ? "true" : "false")
        layer.appendChild(hitbox)

      if (isSelected) {
        const moveHandle = createMovementHandleImage("resize", centerX, centerY)
        moveHandle.setAttribute("pointer-events", "all")
        moveHandle.setAttribute("cursor", "ew-resize")
        moveHandle.setAttribute("data-cutout-id", cutout.id)
        moveHandle.setAttribute("data-role", "half-moon-cutout-move")
        moveHandle.setAttribute("data-edge", edge)
        layer.appendChild(moveHandle)
      }
    })
  }
}

export function renderHalfMoonWarnings(
  warningLayer: SVGGElement,
  spec: FlowwrapSpec,
  cutouts: HalfMoonCutoutSpec[],
  originX: number,
  originY: number
) {
  warningLayer
    .querySelectorAll("[data-role=\"half-moon-warning\"]")
    .forEach(node => node.remove())

  cutouts.forEach(cutout => {
    const { warnings } = evaluateHalfMoonCutout(spec, cutout)
    if (!warnings.length) {
      return
    }
    const centerX = originX + cutout.centerX
    const centerY = originY + cutout.centerY
    const boxX = centerX + cutout.radius + 4
    let offsetY = -10
    warnings.forEach(text => {
      appendWarningBox(warningLayer, text, boxX, centerY + offsetY)
      offsetY += 14
    })
  })
}
