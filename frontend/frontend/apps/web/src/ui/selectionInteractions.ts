import type { SelectionStore } from "../state/selectionStore"
import { refreshMovementHandleIcons } from "./movementHandleIcons"
import { attachDynamicElementMeasures } from "./dynamicElementMeasures"

const SVG_NS = "http://www.w3.org/2000/svg"
const SELECTION_COLOR = "#9E1316"
const SELECTION_STROKE_MM = 0.45
const SMART_SELECT_CATCHMENT_MM = 3.5
const SMART_ZONE_EDGE_PX = 8
const SMART_ZONE_CORNER_PX = 18
const ROTATE_CURSOR = 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M5 11a7 7 0 1 1 2 6M5 11V5m0 6h6%22 fill=%22none%22 stroke=%22white%22 stroke-width=%224%22/%3E%3Cpath d=%22M5 11a7 7 0 1 1 2 6M5 11V5m0 6h6%22 fill=%22none%22 stroke=%22%233e4b50%22 stroke-width=%222%22/%3E%3C/svg%3E") 12 12, crosshair'
const CANVAS_SELECTABLE_LAYER_IDS = new Set([
  "eyemarks",
  "safe-zones",
  "windows",
  "notes",
  "hanger-slots",
  "half-moon-cutouts",
  "tear-notches",
  "perf-lines",
  "fold-lines"
])

function ensureSelectionLayer(svg: SVGSVGElement) {
  let layer = svg.querySelector<SVGGElement>("g#selection_overlay")
  if (!layer) {
    layer = document.createElementNS(SVG_NS, "g")
    layer.id = "selection_overlay"
    svg.appendChild(layer)
  }
  layer.removeAttribute("pointer-events")
  return layer
}

function resolveSelectableLayerId(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null
  }
  const selectable = target.closest("[data-selectable-id]") as Element | null
  if (selectable) {
    return selectable.getAttribute("data-selectable-id")
  }
  const layer = target.closest("[data-layer-id]") as Element | null
  return layer?.getAttribute("data-layer-id") ?? null
}

function getSvgPoint(svg: SVGSVGElement, event: PointerEvent | MouseEvent) {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return null
  }
  return point.matrixTransform(ctm.inverse())
}

function distanceToBounds(
  pointX: number,
  pointY: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const dx = Math.max(x - pointX, 0, pointX - (x + width))
  const dy = Math.max(y - pointY, 0, pointY - (y + height))
  return Math.hypot(dx, dy)
}

function getNodeBoundsInSvg(svg: SVGSVGElement, node: SVGGraphicsElement) {
  const box = node.getBBox()
  const nodeCtm = node.getScreenCTM()
  const svgCtm = svg.getScreenCTM()
  if (!nodeCtm || !svgCtm) {
    return box
  }
  const svgInverse = svgCtm.inverse()
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x + box.width, box.y + box.height],
    [box.x, box.y + box.height]
  ].map(([x, y]) => {
    const point = svg.createSVGPoint()
    point.x = x
    point.y = y
    return point.matrixTransform(nodeCtm).matrixTransform(svgInverse)
  })
  const xs = corners.map(point => point.x)
  const ys = corners.map(point => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y
  }
}

function resolveSelectionPriority(node: Element) {
  const role = (node.getAttribute("data-role") ?? "").toLowerCase()
  if (role.includes("attribute-box")) return 120
  if (role.includes("window")) return 110
  if (role.includes("safe-zone")) return 100
  if (role.includes("hanger-slot")) return 100
  if (role.includes("eye-mark")) return 95
  if (role.includes("half-moon")) return 95
  if (role.includes("doy-center") || role.includes("gusset-arc")) return 90
  if (role.includes("hit")) return 80
  return 10
}

function resolveSmartSelectableId(
  svg: SVGSVGElement,
  event: PointerEvent | MouseEvent,
  store: SelectionStore
) {
  const point = getSvgPoint(svg, event)
  if (!point) {
    return null
  }
  const candidates = svg.querySelectorAll<SVGGraphicsElement>("[data-selectable-id]")
  let best: { id: string; distance: number; priority: number; inside: boolean; order: number } | null = null
  candidates.forEach((node, order) => {
    const id = node.getAttribute("data-selectable-id")
    if (!id || !store.canSelect(id)) {
      return
    }
    if (id.startsWith("layer:")) {
      const layerId = id.slice("layer:".length)
      if (!["gusset-fold-line", "gusset-side", "gusset-bottom", "kseal-bottom-seals", "kseal-arms"].includes(layerId)) {
        return
      }
    }
    try {
      const box = getNodeBoundsInSvg(svg, node)
      const distance = distanceToBounds(point.x, point.y, box.x, box.y, box.width, box.height)
      if (distance > SMART_SELECT_CATCHMENT_MM) {
        return
      }
      const priority = resolveSelectionPriority(node)
      const inside = distance <= 0.001
      const shouldReplace =
        !best ||
        (inside && !best.inside) ||
        (inside && best.inside && order > best.order) ||
        (!inside && !best.inside && distance < best.distance) ||
        (inside === best.inside && order === best.order && priority > best.priority)
      if (shouldReplace) {
        best = { id, distance, priority, inside, order }
      }
    } catch {
      return
    }
  })
  return best?.id ?? null
}

function resolvePreferredSelectableId(
  directId: string | null,
  smartId: string | null
) {
  if (smartId && (!directId || directId.startsWith("layer:"))) {
    return smartId
  }
  if (directId && !directId.startsWith("layer:substrate")) {
    return directId
  }
  return smartId ?? directId
}

function isEditInteractionTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false
  }
  const roleNode = target.closest("[data-role]") as Element | null
  const role = roleNode?.getAttribute("data-role") ?? ""
  return (
    role.includes("handle") ||
    role.includes("move") ||
    role.includes("drag") ||
    role.includes("rotate") ||
    role.includes("adjust")
  )
}

function applySelectableMarkers(svg: SVGSVGElement) {
  const mark = (selector: string, idGetter: (node: Element) => string | null) => {
    svg.querySelectorAll(selector).forEach(node => {
      const id = idGetter(node)
      if (!id) {
        return
      }
      node.setAttribute("data-selectable-id", id)
      node.setAttribute("data-selectable", "true")
    })
  }
  mark('[data-role="safe-zone"][data-zone-id]', node => {
    const id = node.getAttribute("data-zone-id")
    return id ? `safe-zone:${id}` : null
  })
  mark('[data-role="window-shape"][data-window-id],[data-role="window-hit"][data-window-id]', node => {
    const id = node.getAttribute("data-window-id")
    return id ? `window:${id}` : null
  })
  mark('[data-role="attribute-box"][data-box-id]', node => {
    const id = node.getAttribute("data-box-id")
    return id ? `attribute-box:${id}` : null
  })
  mark('[data-role="eye-mark"][data-eye-index],[data-role="eye-mark-hit"][data-eye-index]', node => {
    const index = node.getAttribute("data-eye-index")
    return index !== null ? `eye-mark:${index}` : null
  })
  mark('[data-role="hanger-slot"][data-slot-id],[data-role="hanger-slot-hit"][data-slot-id]', node => {
    const id = node.getAttribute("data-slot-id")
    return id ? `hanger-slot:${id}` : null
  })
  mark('[data-role="half-moon-cutout"][data-cutout-id],[data-role="half-moon-cutout-hit"][data-cutout-id]', node => {
    const id = node.getAttribute("data-cutout-id")
    return id ? `half-moon:${id}` : null
  })
  mark('[data-line-id]', node => {
    const id = node.getAttribute("data-line-id")
    return id ? `fold-line:${id}` : null
  })
  mark('[data-role="perf-dot"][data-lane-index],[data-role="perf-drag"][data-lane-index]', node => {
    const index = node.getAttribute("data-lane-index")
    return index !== null ? `perf-lane:${index}` : null
  })
  mark('[data-role="doy-center-line"],[data-role="doy-center-hit"]', () => "layer:gusset-fold-line")
  mark('[data-role="gusset-arc"],[data-role="gusset-arc-hit"]', () => "layer:gusset-side")
  mark('[data-role="doy-oval"]', () => "layer:gusset-bottom")
  mark('[data-role="kseal-center-line"],[data-role="kseal-side-handle"],[data-role="kseal-side-hit"]', () => "layer:gusset-fold-line")
  mark('[data-role="kseal-bottom-seal"],[data-role="kseal-bottom-seal-guide"]', () => "layer:kseal-bottom-seals")
  mark('[data-role="kseal-arm"],[data-role="kseal-arm-junction-fill"],[data-role="kseal-corner-handle"],[data-role="kseal-corner-hit"],[data-role="kseal-inner-path"],[data-role="kseal-side-guide"],[data-role="kseal-side-guide-hit"]', () => "layer:kseal-arms")
  svg.querySelectorAll<SVGGElement>("[data-layer-id]").forEach(node => {
    const id = node.getAttribute("data-layer-id")
    if (!id) {
      return
    }
    if (id === "measurement-guides" || id === "annotations") {
      return
    }
    if (!CANVAS_SELECTABLE_LAYER_IDS.has(id)) {
      return
    }
    if (node.hasAttribute("data-selectable-id")) {
      return
    }
    node.setAttribute("data-selectable-id", `layer:${id}`)
    node.setAttribute("data-selectable", "true")
  })
}

function getGeometryNodes(svg: SVGSVGElement, id: string) {
  const editableLidCell = svg.getAttribute("data-active-lid-cell")
  const inEditableLidCell = (node: SVGGraphicsElement) => !editableLidCell ||
    node.closest("[data-lid-cell]")?.getAttribute("data-lid-cell") === editableLidCell
  const isLayerSelection = id.startsWith("layer:")
  if (isLayerSelection) {
    const layerId = id.slice("layer:".length)
    const layer = svg.querySelector<SVGGElement>(`[data-layer-id="${layerId}"]`)
    if (!layer) {
      return []
    }
    return [...layer.querySelectorAll<SVGGraphicsElement>("path,rect,circle,ellipse,line,polyline,polygon")]
  }
  if (id.startsWith("safe-zone:")) {
    const zoneId = id.slice("safe-zone:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-zone-id="${zoneId}"][data-role="safe-zone"],` +
          `[data-zone-id="${zoneId}"][data-role="safe-zone-outline"],` +
          `[data-zone-id="${zoneId}"][data-role="safe-zone-arc"],` +
          `[data-zone-id="${zoneId}"][data-role="safe-zone-k-arm"]`
      )
    ].filter(inEditableLidCell)
  }
  if (id.startsWith("window:")) {
    const windowId = id.slice("window:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-window-id="${windowId}"][data-role="window-shape"],` +
          `[data-window-id="${windowId}"][data-role="window-hit"]`
      )
    ].filter(inEditableLidCell)
  }
  if (id.startsWith("attribute-box:")) {
    const boxId = id.slice("attribute-box:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-box-id="${boxId}"][data-role="attribute-box"]`
      )
    ].filter(inEditableLidCell)
  }
  if (id.startsWith("eye-mark:")) {
    const eyeIndex = id.slice("eye-mark:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-eye-index="${eyeIndex}"][data-role="eye-mark"],` +
          `[data-eye-index="${eyeIndex}"][data-role="eye-mark-hit"]`
      )
    ]
  }
  if (id.startsWith("hanger-slot:")) {
    const slotId = id.slice("hanger-slot:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-slot-id="${slotId}"][data-role="hanger-slot"],` +
          `[data-slot-id="${slotId}"][data-role="hanger-slot-hit"]`
      )
    ]
  }
  if (id.startsWith("half-moon:")) {
    const cutoutId = id.slice("half-moon:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-cutout-id="${cutoutId}"][data-role="half-moon-cutout"],` +
          `[data-cutout-id="${cutoutId}"][data-role="half-moon-cutout-hit"]`
      )
    ]
  }
  if (id.startsWith("fold-line:")) {
    const lineId = id.slice("fold-line:".length)
    return [...svg.querySelectorAll<SVGGraphicsElement>(`[data-line-id="${lineId}"]`)]
  }
  if (id.startsWith("perf-lane:")) {
    const laneIndex = id.slice("perf-lane:".length)
    return [
      ...svg.querySelectorAll<SVGGraphicsElement>(
        `[data-lane-index="${laneIndex}"][data-role="perf-dot"],` +
          `[data-lane-index="${laneIndex}"][data-role="perf-drag"]`
      )
    ]
  }
  return [...svg.querySelectorAll<SVGGraphicsElement>(`[data-selectable-id="${id}"]`)]
}

function shouldSkipNode(node: SVGGraphicsElement, includeTransparentBounds: boolean) {
  const role = node.getAttribute("data-role") ?? ""
  if (
    role.includes("handle") ||
    role.includes("move") ||
    role.includes("rotate") ||
    role.includes("label")
  ) {
    return true
  }
  if (includeTransparentBounds && role.includes("hit")) {
    return false
  }
  const fill = node.getAttribute("fill") ?? ""
  const stroke = node.getAttribute("stroke") ?? ""
  const fillNone = fill === "none" || fill === "transparent" || fill === ""
  const strokeNone = stroke === "none" || stroke === ""
  return !includeTransparentBounds && fillNone && strokeNone
}

type SelectionBounds = {
  x: number
  y: number
  width: number
  height: number
}

type SmartZoneBehaviour = {
  moveRole: string
  handleRole: string
  rotateRole?: string
  idAttribute: string
  idValue: string
  laneIndex?: string
  supportsResize: boolean
  supportsRotate: boolean
  lineOrientation?: "horizontal" | "vertical"
}

function getUnitsPerPixel(svg: SVGSVGElement) {
  const rect = svg.getBoundingClientRect()
  const viewBox = svg.viewBox.baseVal
  if (rect.width > 0 && viewBox.width > 0) {
    return viewBox.width / rect.width
  }
  const ctm = svg.getScreenCTM()
  if (ctm && Math.abs(ctm.a) > 0.001) {
    return 1 / Math.abs(ctm.a)
  }
  return 1
}

function getSmartZoneBehaviour(
  id: string,
  nodes: SVGGraphicsElement[],
  store: SelectionStore
): SmartZoneBehaviour | null {
  const registered = store.getElement(id)
  if (!registered || registered.locked) {
    return null
  }
  if (id.startsWith("safe-zone:")) {
    return {
      moveRole: "safe-zone-move",
      handleRole: "safe-zone-handle",
      rotateRole: "safe-zone-rotate",
      idAttribute: "data-zone-id",
      idValue: id.slice("safe-zone:".length),
      supportsResize: registered.resizable,
      supportsRotate: registered.rotatable
    }
  }
  if (id.startsWith("window:")) {
    return {
      moveRole: "window-move",
      handleRole: "window-handle",
      rotateRole: "window-rotate",
      idAttribute: "data-window-id",
      idValue: id.slice("window:".length),
      supportsResize: registered.resizable,
      supportsRotate: registered.rotatable
    }
  }
  if (id.startsWith("attribute-box:")) {
    const laneIndex =
      nodes.find(node => node.hasAttribute("data-lane-index"))?.getAttribute("data-lane-index") ??
      "0"
    return {
      moveRole: "attribute-box-move",
      handleRole: "attribute-box-handle",
      rotateRole: "attribute-box-rotate",
      idAttribute: "data-box-id",
      idValue: id.slice("attribute-box:".length),
      laneIndex,
      supportsResize: registered.resizable,
      supportsRotate: registered.rotatable
    }
  }
  if (id.startsWith("eye-mark:")) {
    return {
      moveRole: "eye-mark-move",
      handleRole: "eye-mark-handle",
      idAttribute: "data-eye-index",
      idValue: id.slice("eye-mark:".length),
      supportsResize: registered.resizable,
      supportsRotate: false
    }
  }
  if (id.startsWith("hanger-slot:")) {
    return {
      moveRole: "hanger-slot-move",
      handleRole: "hanger-slot-handle",
      idAttribute: "data-slot-id",
      idValue: id.slice("hanger-slot:".length),
      supportsResize: registered.resizable,
      supportsRotate: false
    }
  }
  if (id.startsWith("half-moon:")) {
    return {
      moveRole: "half-moon-cutout-move",
      handleRole: "half-moon-cutout-handle",
      idAttribute: "data-cutout-id",
      idValue: id.slice("half-moon:".length),
      supportsResize: registered.resizable,
      supportsRotate: false
    }
  }
  if (id.startsWith("fold-line:")) {
    const line = nodes.find(node => node.tagName.toLowerCase() === "line")
    const x1 = Number(line?.getAttribute("x1") ?? "0")
    const x2 = Number(line?.getAttribute("x2") ?? "0")
    const orientation = Math.abs(x2 - x1) < 0.001 ? "vertical" : "horizontal"
    return {
      moveRole: "fold-line-adjust",
      handleRole: "fold-line-adjust",
      idAttribute: "data-line-id",
      idValue: id.slice("fold-line:".length),
      supportsResize: false,
      supportsRotate: false,
      lineOrientation: orientation
    }
  }
  return null
}

function setSmartZoneAttributes(
  element: SVGElement,
  behaviour: SmartZoneBehaviour,
  role: string,
  cursor: string,
  handle?: "nw" | "ne" | "sw" | "se" | "left" | "right" | "top" | "bottom"
) {
  element.setAttribute("data-role", role)
  element.setAttribute(behaviour.idAttribute, behaviour.idValue)
  element.setAttribute("data-selection-smart-zone", "true")
  element.setAttribute("fill", "#000")
  element.setAttribute("opacity", "0")
  element.setAttribute("pointer-events", "all")
  element.setAttribute("cursor", cursor)
  if (handle) {
    element.setAttribute("data-handle", handle)
  }
  if (behaviour.laneIndex !== undefined) {
    element.setAttribute("data-lane-index", behaviour.laneIndex)
  }
}

function appendSmartZoneRect(
  group: SVGGElement,
  bounds: SelectionBounds,
  behaviour: SmartZoneBehaviour,
  role: string,
  cursor: string,
  handle?: "nw" | "ne" | "sw" | "se" | "left" | "right" | "top" | "bottom"
) {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return
  }
  const rect = document.createElementNS(SVG_NS, "rect")
  rect.setAttribute("x", bounds.x.toString())
  rect.setAttribute("y", bounds.y.toString())
  rect.setAttribute("width", bounds.width.toString())
  rect.setAttribute("height", bounds.height.toString())
  setSmartZoneAttributes(rect, behaviour, role, cursor, handle)
  group.appendChild(rect)
}

function appendSmartCursorZones(
  svg: SVGSVGElement,
  group: SVGGElement,
  id: string,
  nodes: SVGGraphicsElement[],
  bounds: SelectionBounds,
  store: SelectionStore
) {
  const behaviour = getSmartZoneBehaviour(id, nodes, store)
  if (!behaviour) {
    return
  }
  const unitsPerPixel = getUnitsPerPixel(svg)
  const edge = Math.max(0.8, SMART_ZONE_EDGE_PX * unitsPerPixel)
  const corner = Math.max(edge * 1.5, SMART_ZONE_CORNER_PX * unitsPerPixel)
  const x = bounds.x
  const y = bounds.y
  const width = bounds.width
  const height = bounds.height
  const innerX = x + Math.min(edge, width / 3)
  const innerY = y + Math.min(edge, height / 3)
  const innerWidth = Math.max(0, width - (innerX - x) * 2)
  const innerHeight = Math.max(0, height - (innerY - y) * 2)
  const cornerWidth = Math.min(corner, width / 2)
  const cornerHeight = Math.min(corner, height / 2)

  if (behaviour.lineOrientation) {
    const hit = document.createElementNS(SVG_NS, "rect")
    const tolerance = Math.max(1.2, edge)
    hit.setAttribute("x", (x - (behaviour.lineOrientation === "vertical" ? tolerance : 0)).toString())
    hit.setAttribute("y", (y - (behaviour.lineOrientation === "horizontal" ? tolerance : 0)).toString())
    hit.setAttribute(
      "width",
      (behaviour.lineOrientation === "vertical" ? tolerance * 2 : Math.max(width, tolerance)).toString()
    )
    hit.setAttribute(
      "height",
      (behaviour.lineOrientation === "horizontal" ? tolerance * 2 : Math.max(height, tolerance)).toString()
    )
    setSmartZoneAttributes(
      hit,
      behaviour,
      behaviour.moveRole,
      behaviour.lineOrientation === "vertical" ? "ew-resize" : "ns-resize"
    )
    group.appendChild(hit)
    return
  }

  appendSmartZoneRect(
    group,
    { x: innerX, y: innerY, width: innerWidth, height: innerHeight },
    behaviour,
    behaviour.moveRole,
    "move"
  )

  if (!behaviour.supportsResize) {
    return
  }

  appendSmartZoneRect(
    group,
    { x, y: y + cornerHeight, width: edge, height: Math.max(0, height - cornerHeight * 2) },
    behaviour,
    behaviour.handleRole,
    "ew-resize",
    "left"
  )
  appendSmartZoneRect(
    group,
    {
      x: x + width - edge,
      y: y + cornerHeight,
      width: edge,
      height: Math.max(0, height - cornerHeight * 2)
    },
    behaviour,
    behaviour.handleRole,
    "ew-resize",
    "right"
  )
  if (!id.startsWith("half-moon:") && !id.startsWith("hanger-slot:")) {
    appendSmartZoneRect(
      group,
      { x: x + cornerWidth, y, width: Math.max(0, width - cornerWidth * 2), height: edge },
      behaviour,
      behaviour.handleRole,
      "ns-resize",
      "top"
    )
    appendSmartZoneRect(
      group,
      {
        x: x + cornerWidth,
        y: y + height - edge,
        width: Math.max(0, width - cornerWidth * 2),
        height: edge
      },
      behaviour,
      behaviour.handleRole,
      "ns-resize",
      "bottom"
    )
  }

  const cornerZones = [
    { handle: "nw" as const, cursor: "nwse-resize", x, y },
    { handle: "ne" as const, cursor: "nesw-resize", x: x + width - cornerWidth, y },
    { handle: "sw" as const, cursor: "nesw-resize", x, y: y + height - cornerHeight },
    {
      handle: "se" as const,
      cursor: "nwse-resize",
      x: x + width - cornerWidth,
      y: y + height - cornerHeight
    }
  ]

  cornerZones.forEach(cornerZone => {
    appendSmartZoneRect(
      group,
      {
        x: cornerZone.x,
        y: cornerZone.y,
        width: cornerWidth,
        height: cornerHeight
      },
      behaviour,
      behaviour.handleRole,
      cornerZone.cursor,
      cornerZone.handle
    )

    if (behaviour.supportsRotate && behaviour.rotateRole) {
      const rotateSize = Math.max(edge * 1.25, Math.min(cornerWidth, cornerHeight) * 0.65)
      const rotateX = cornerZone.handle.endsWith("w")
        ? x - rotateSize
        : x + width
      const rotateY = cornerZone.handle.startsWith("n")
        ? y - rotateSize
        : y + height
      appendSmartZoneRect(
        group,
        { x: rotateX, y: rotateY, width: rotateSize, height: rotateSize },
        behaviour,
        behaviour.rotateRole,
        ROTATE_CURSOR,
        cornerZone.handle
      )
    }
  })
}

function drawOverlayForElement(svg: SVGSVGElement, id: string, store: SelectionStore) {
  const layer = ensureSelectionLayer(svg)
  const nodes = getGeometryNodes(svg, id).filter(node => !shouldSkipNode(node, !id.startsWith("layer:")))
  if (nodes.length === 0) {
    return
  }
  const group = document.createElementNS(SVG_NS, "g")
  group.setAttribute("data-selection-id", id)
  group.setAttribute("data-role", "selection-frame")
  if(/^layer:(gusset-|kseal-)/.test(id)){
    group.setAttribute("data-export-ui","true")
    const visible=nodes.filter(node=>!/(hit|handle|label|junction)/.test(node.getAttribute("data-role")??""))
    for(const node of visible){
      const outline=node.cloneNode(false) as SVGElement
      outline.removeAttribute("id");outline.removeAttribute("data-selectable-id")
      outline.setAttribute("fill","none");outline.setAttribute("stroke",SELECTION_COLOR);outline.setAttribute("stroke-width","2");outline.setAttribute("vector-effect","non-scaling-stroke");outline.setAttribute("pointer-events","none")
      const ctm=node.getScreenCTM(),root=svg.getScreenCTM()
      if(ctm && root){const m=root.inverse().multiply(ctm);outline.setAttribute("transform",`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`)}
      group.append(outline)
    }
    if(store.getElement(id)?.movable && !store.getElement(id)?.locked){
      const units=getUnitsPerPixel(svg),seen=new Set<string>()
      for(const node of visible){
        const role=node.getAttribute("data-role")??"",side=node.getAttribute("data-arc-side")??node.getAttribute("data-arm-side")??""
        if(seen.has(side)||role.includes("guide")||role.includes("bottom-seal"))continue
        seen.add(side)
        const box=getNodeBoundsInSvg(svg,node),handle=document.createElementNS(SVG_NS,"g")
        handle.setAttribute("transform",`translate(${box.x+box.width/2} ${box.y+box.height/2}) scale(${units})`)
        handle.setAttribute("data-selectable-id",id);handle.setAttribute("class","gusset-move-handle")
        let moveRole="doy-center-handle"
        if(role==="gusset-arc"){moveRole="doy-gusset-handle";handle.setAttribute("data-arc-side",side)}
        else if(role==="doy-oval")moveRole="doy-oval-handle"
        else if(role==="kseal-arm"){moveRole="kseal-arm-move";handle.setAttribute("data-corner",side)}
        else if(role==="kseal-center-line"){moveRole="kseal-side-handle";handle.setAttribute("data-side","right")}
        handle.setAttribute("data-role",moveRole);handle.setAttribute("data-handle","move");handle.style.cursor="move"
        const circle=document.createElementNS(SVG_NS,"circle");circle.setAttribute("r","11");circle.setAttribute("fill","var(--kyza-surface,#faf7f3)");circle.setAttribute("stroke",SELECTION_COLOR);circle.setAttribute("stroke-width","1")
        const icon=document.createElementNS(SVG_NS,"path");icon.setAttribute("d","M-6 0H6M0-6V6M-3-3 0-6 3-3M-3 3 0 6 3 3M-3-3-6 0-3 3M3-3 6 0 3 3");icon.setAttribute("fill","none");icon.setAttribute("stroke",SELECTION_COLOR);icon.setAttribute("stroke-width","1.3");icon.setAttribute("pointer-events","none")
        handle.append(circle,icon);group.append(handle)
      }
    }
    layer.append(group);return
  }
  const transforms = new Set(
    nodes.map(node => node.getAttribute("transform") ?? "")
  )
  const sharedTransform = transforms.size === 1 ? [...transforms][0] : ""
  if (sharedTransform) {
    group.setAttribute("transform", sharedTransform)
  }
  let bounds:
    | { x: number; y: number; maxX: number; maxY: number }
    | null = null
  nodes.forEach(node => {
    try {
      const box = sharedTransform ? node.getBBox() : getNodeBoundsInSvg(svg, node)
      if (box.width > 0 || box.height > 0) {
        bounds = bounds
          ? {
              x: Math.min(bounds.x, box.x),
              y: Math.min(bounds.y, box.y),
              maxX: Math.max(bounds.maxX, box.x + box.width),
              maxY: Math.max(bounds.maxY, box.y + box.height)
            }
          : {
              x: box.x,
              y: box.y,
              maxX: box.x + box.width,
              maxY: box.y + box.height
            }
      }
    } catch {
      // Some SVG nodes do not expose geometry while detached/hidden.
    }
  })
  if (bounds) {
    const pad = 1.2
    const x = bounds.x - pad
    const y = bounds.y - pad
    const width = bounds.maxX - bounds.x + pad * 2
    const height = bounds.maxY - bounds.y + pad * 2
    const contour = id.startsWith("safe-zone:") ? nodes.find(n => n.tagName === "path" && /safe-zone-(arc|k-arm)/.test(n.getAttribute("data-role") ?? "")) : undefined
    const frame = document.createElementNS(SVG_NS, contour ? "path" : "rect")
    if (contour) frame.setAttribute("d", contour.getAttribute("d") ?? "")
    frame.setAttribute("x", x.toString())
    frame.setAttribute("y", y.toString())
    frame.setAttribute("width", width.toString())
    frame.setAttribute("height", height.toString())
    frame.setAttribute("rx", "0.6")
    frame.setAttribute("fill", "none")
    frame.setAttribute("stroke", SELECTION_COLOR)
    frame.setAttribute("stroke-width", SELECTION_STROKE_MM.toString())
    frame.setAttribute("stroke-opacity", "0.88")
    frame.setAttribute("vector-effect", "non-scaling-stroke")
    frame.setAttribute("shape-rendering", "geometricPrecision")
    frame.setAttribute("pointer-events", "none")
    group.appendChild(frame)
    appendSmartCursorZones(svg, group, id, nodes, { x, y, width, height }, store)
  }
  layer.appendChild(group)
}

export function attachSelectionInteractions(
  svg: SVGSVGElement,
  store: SelectionStore,
  activateSelect: () => void = () => store.setSelectionMode(true)
) {
  ensureSelectionLayer(svg)
  applySelectableMarkers(svg)
  svg.querySelectorAll<SVGElement>('[data-role*="rotate"]').forEach(node => node.style.cursor = ROTATE_CURSOR)
  const layer = ensureSelectionLayer(svg)
  const overlayMap = new Map<string, SVGElement>()

  const redrawDiff = (selectedIds: string[], force = false) => {
    const next = new Set(selectedIds)
    overlayMap.forEach((node, id) => {
      if (next.has(id) && !force) {
        return
      }
      node.remove()
      overlayMap.delete(id)
    })
    next.forEach(id => {
      if (overlayMap.has(id)) {
        return
      }
      drawOverlayForElement(svg, id, store)
      const node = layer.querySelector<SVGElement>(`[data-selection-id="${id}"]`)
      if (node) {
        overlayMap.set(id, node)
      }
    })
  }

  const unsubscribe = store.subscribe(state => {
    svg.setAttribute("data-select-enabled", state.selectionMode ? "true" : "false")
    redrawDiff(state.selectedElementIds)
    refreshMovementHandleIcons(svg, {
      selectedIds: state.selectedElementIds,
      selectionMode: state.selectionMode
    })
  })
  const current = store.getState()
  svg.setAttribute("data-select-enabled", current.selectionMode ? "true" : "false")
  if (!svg.hasAttribute("data-dragging")) {
    svg.setAttribute("data-dragging", "false")
  }
  redrawDiff(current.selectedElementIds)
  refreshMovementHandleIcons(svg, {
    selectedIds: current.selectedElementIds,
    selectionMode: current.selectionMode
  })

  const onPointerDown = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("[data-context-action]")) return
    const state = store.getState()
    if (!state.selectionMode) {
      return
    }
    if (svg.getAttribute("data-pan-enabled") === "true") {
      return
    }
    if (svg.getAttribute("data-measure-enabled") === "true") {
      return
    }
    if (isEditInteractionTarget(event.target)) {
      return
    }
    const directId = resolveSelectableLayerId(event.target)
    const smartId = resolveSmartSelectableId(svg, event, store)
    const id = resolvePreferredSelectableId(directId, smartId)
    if (!id) {
      if (state.selectedElementIds.length) event.stopImmediatePropagation()
      store.clearSelection()
      return
    }
    const multi = event.shiftKey
    if (!multi) {
      // Selecting a different element rebuilds the SVG synchronously. Complete
      // that handoff before legacy object handlers can capture a detached SVG.
      if (state.selectedElementIds.length!==1 || state.selectedElementIds[0]!==id) event.stopImmediatePropagation()
      store.selectElement(id, false)
      return
    }
    event.stopImmediatePropagation()
    store.toggleSelection(id, true)
  }

  svg.addEventListener("pointerdown", onPointerDown, true)
  const onDoubleClick = (event: MouseEvent) => {
    const eyeNode = event.target instanceof Element
      ? event.target.closest('[data-eye-index][data-role="eye-mark"], [data-eye-index][data-role="eye-mark-move"], [data-eye-index][data-role="eye-mark-hit"]')
      : null
    const eyeId = eyeNode?.getAttribute("data-eye-index")
    if (eyeId !== null && eyeId !== undefined && store.canSelect(`eye-mark:${eyeId}`)) {
      event.preventDefault()
      event.stopPropagation()
      activateSelect()
      store.selectElement(`eye-mark:${eyeId}`, false)
      return
    }
    if (isEditInteractionTarget(event.target)) {
      return
    }
    const directId = resolveSelectableLayerId(event.target)
    const smartId = resolveSmartSelectableId(svg, event, store)
    const id = resolvePreferredSelectableId(directId, smartId)
    if (!id || !store.canSelect(id)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    activateSelect()
    store.selectElement(id, false)
  }
  svg.addEventListener("dblclick", onDoubleClick)
  const onViewportRefresh = () => {
    const state = store.getState()
    redrawDiff(state.selectedElementIds, true)
    refreshMovementHandleIcons(svg, {
      selectedIds: state.selectedElementIds,
      selectionMode: state.selectionMode
    })
  }
  svg.addEventListener("canvasviewportchange", onViewportRefresh)
  window.addEventListener("resize", onViewportRefresh)
  const startsDrag = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return false
    }
    const role = (target.closest("[data-role]") as Element | null)?.getAttribute("data-role") ?? ""
    return (
      role.includes("move") ||
      role.includes("handle") ||
      role.includes("rotate") ||
      role.includes("adjust") ||
      role === "safe-zone" ||
      role === "window-shape" ||
      role === "window-hit" ||
      role === "attribute-box" ||
      role === "eye-mark" ||
      role === "eye-mark-hit" ||
      role === "hanger-slot" ||
      role === "hanger-slot-hit" ||
      role === "half-moon-cutout" ||
      role === "half-moon-cutout-hit" ||
      role === "tear-notch"
    )
  }
  const onGlobalPointerDown = (event: PointerEvent) => {
    if (startsDrag(event.target)) {
      svg.setAttribute("data-dragging", "true")
    }
  }
  const onGlobalPointerUp = () => {
    svg.setAttribute("data-dragging", "false")
  }
  svg.addEventListener("pointerdown", onGlobalPointerDown, true)
  window.addEventListener("pointerup", onGlobalPointerUp, true)
  window.addEventListener("pointercancel", onGlobalPointerUp, true)
  let gussetFrame:number|null=null
  const onGussetMove=()=>{
    if(svg.getAttribute("data-dragging")!=="true" || !store.getState().selectedElementIds.some(id=>/^layer:(gusset-|kseal-)/.test(id)) || gussetFrame!==null)return
    gussetFrame=window.requestAnimationFrame(()=>{gussetFrame=null;onViewportRefresh()})
  }
  svg.addEventListener("pointermove",onGussetMove)
  const dynamicMeasures = attachDynamicElementMeasures(svg, store)

  return {
    destroy() {
      dynamicMeasures.destroy()
      svg.removeEventListener("pointermove",onGussetMove)
      if(gussetFrame!==null)window.cancelAnimationFrame(gussetFrame)
      svg.removeEventListener("pointerdown", onPointerDown, true)
      svg.removeEventListener("dblclick", onDoubleClick)
      svg.removeEventListener("canvasviewportchange", onViewportRefresh)
      svg.removeEventListener("pointerdown", onGlobalPointerDown, true)
      window.removeEventListener("resize", onViewportRefresh)
      window.removeEventListener("pointerup", onGlobalPointerUp, true)
      window.removeEventListener("pointercancel", onGlobalPointerUp, true)
      unsubscribe()
    },
    refreshMarkers() {
      applySelectableMarkers(svg)
      const state = store.getState()
      redrawDiff(state.selectedElementIds, true)
      refreshMovementHandleIcons(svg, {
        selectedIds: state.selectedElementIds,
        selectionMode: state.selectionMode
      })
    }
  }
}
