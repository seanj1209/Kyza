import { formatMeasurement } from "./canvasViewport"
import type { FlowwrapSpec } from "../types/flowwrap"
import { directionalDimensions, separateMeasureLabel, type DynamicDimension, type MeasureRect } from "./dynamicMeasureGeometry"

const NS = "http://www.w3.org/2000/svg"

export function renderDynamicDimensions(svg: SVGSVGElement, dimensions: DynamicDimension[]) {
  let layer = svg.querySelector<SVGGElement>("g#measurement_annotations")
  if (!layer) { layer = document.createElementNS(NS,"g"); layer.id = "measurement_annotations"; svg.appendChild(layer) }
  layer.replaceChildren()
  layer.setAttribute("data-export-ui", "true")
  layer.setAttribute("pointer-events", "none")
  const matrix = svg.getScreenCTM()
  const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1
  const px = 1 / Math.max(0.001,scale)
  const zoom = Number(svg.getAttribute("data-canvas-zoom") ?? 1)
  const occupied: MeasureRect[] = []
  for (const dimension of dimensions) {
    const group = document.createElementNS(NS,"g")
    group.setAttribute("data-dynamic-direction",dimension.direction ?? "perf")
    layer.appendChild(group)
    const line = document.createElementNS(NS,"line")
    for (const key of ["x1","y1","x2","y2"] as const) line.setAttribute(key,String(dimension[key]))
    line.setAttribute("stroke",dimension.aligned?"#2eb774":"#59666c")
    group.setAttribute("data-aligned",dimension.aligned?"true":"false")
    line.setAttribute("stroke-width","1")
    line.setAttribute("vector-effect","non-scaling-stroke")
    line.setAttribute("stroke-opacity","0.75")
    group.appendChild(line)
    const text = document.createElementNS(NS,"text")
    const vertical = Math.abs(dimension.x2-dimension.x1)<0.001
    text.setAttribute("x",String((dimension.x1+dimension.x2)/2 + (vertical ? 7*px : 0)))
    text.setAttribute("y",String((dimension.y1+dimension.y2)/2 - (vertical ? 0 : 7*px)))
    text.setAttribute("fill",dimension.aligned?"#19824d":"#3e4b50")
    text.setAttribute("font-size",String(11*px))
    text.setAttribute("font-family","system-ui,sans-serif")
    text.setAttribute("text-anchor",vertical ? "start" : "middle")
    text.setAttribute("dominant-baseline","middle")
    text.setAttribute("paint-order","stroke")
    text.setAttribute("stroke","#fff")
    text.setAttribute("stroke-width",String(3*px))
    text.setAttribute("stroke-linejoin","round")
    text.textContent = `${dimension.label ? dimension.label+": " : ""}${formatMeasurement(dimension.distance,zoom)} mm`
    group.appendChild(text)
    const originalBox = text.getBBox()
    const placed = separateMeasureLabel(originalBox,occupied,4*px)
    const shift = placed.y-originalBox.y
    if (shift>0) {
      const labelY = Number(text.getAttribute("y"))+shift
      text.setAttribute("y",String(labelY))
      const leader = document.createElementNS(NS,"line")
      const labelX = Number(text.getAttribute("x"))
      leader.setAttribute("x1",String(labelX));leader.setAttribute("x2",String(labelX))
      leader.setAttribute("y1",String(originalBox.y+originalBox.height));leader.setAttribute("y2",String(labelY-7*px))
      leader.setAttribute("stroke","#59666c");leader.setAttribute("stroke-opacity","0.45")
      leader.setAttribute("stroke-width","0.75");leader.setAttribute("vector-effect","non-scaling-stroke")
      group.insertBefore(leader,text)
    }
    occupied.push(placed)
  }
  return dimensions.length > 0
}

// Compatibility for legacy drag callers. Shared selection attachment owns the new overlay.
export function updateMeasurementAnnotations({svg,objectRect,deltaX,deltaY,allowHorizontal,allowVertical}: {
  svg: SVGSVGElement; spec: FlowwrapSpec; objectRect: MeasureRect; deltaX: number; deltaY: number;
  allowHorizontal: boolean; allowVertical: boolean; excludeFoldId?: string
}) {
  if (svg.getAttribute("data-dynamic-measures") === "true") return true
  const layer = svg.querySelector("g#seal_areas")
  const pack = {x:Number(layer?.getAttribute("data-origin-x")??0),y:Number(layer?.getAttribute("data-origin-y")??0),width:Number(layer?.getAttribute("data-cutter-width")??0),height:Number(layer?.getAttribute("data-cutter-height")??0)}
  return renderDynamicDimensions(svg,directionalDimensions(objectRect,[pack],allowHorizontal?deltaX:0,allowVertical?deltaY:0))
}

export function clearMeasurementAnnotations(svg: SVGSVGElement) {
  svg.querySelector("g#measurement_annotations")?.replaceChildren()
}

/** One compact readout while sizing/rotating; never mixes with movement distances. */
export function renderElementReadout(svg: SVGSVGElement, bounds: MeasureRect, value: string) {
  renderDynamicDimensions(svg, [])
  const layer = svg.querySelector<SVGGElement>("g#measurement_annotations")!
  const scale = svg.getScreenCTM()
  const px = 1 / Math.max(.001, scale ? Math.hypot(scale.a, scale.b) : 1)
  const text = document.createElementNS(NS, "text")
  text.setAttribute("data-role", "element-size-readout")
  text.setAttribute("x", String(bounds.x + bounds.width / 2))
  text.setAttribute("y", String(bounds.y + bounds.height + 11 * px))
  text.setAttribute("text-anchor", "middle")
  text.setAttribute("font-family", "system-ui,sans-serif")
  text.setAttribute("font-size", String(10 * px))
  text.setAttribute("fill", "#59666c")
  text.setAttribute("paint-order", "stroke")
  text.setAttribute("stroke", "#fff")
  text.setAttribute("stroke-width", String(3 * px))
  text.textContent = value
  layer.appendChild(text)
}
