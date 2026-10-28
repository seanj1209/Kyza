const SVG_NS = "http://www.w3.org/2000/svg"

const ICONS = {
  move: "/Icons/UI Movement Icons/Move_ICON.png",
  resize: "/Icons/UI Movement Icons/Resize_ICON.png",
  rotate: "/Icons/UI Movement Icons/Rotate_ICON.png"
} as const

const TARGET_ICON_PX = 14

function ensureIconLayer(svg: SVGSVGElement) {
  let layer = svg.querySelector<SVGGElement>("g#movement_icon_overlay")
  if (!layer) {
    layer = document.createElementNS(SVG_NS, "g")
    layer.setAttribute("id", "movement_icon_overlay")
    layer.setAttribute("pointer-events", "none")
    svg.appendChild(layer)
  }
  return layer
}

function getUnitsPerPixel(svg: SVGSVGElement) {
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return 1
  }
  const xScale = Math.hypot(ctm.a, ctm.b)
  const yScale = Math.hypot(ctm.c, ctm.d)
  const avgScale = (xScale + yScale) / 2
  if (!Number.isFinite(avgScale) || avgScale <= 0) {
    return 1
  }
  return 1 / avgScale
}

function resolveIconKind(role: string, node: Element) {
  const loweredRole = role.toLowerCase()
  if (loweredRole.includes("hit") || loweredRole.includes("label") || loweredRole.includes("measure")) {
    return null
  }
  if (loweredRole.includes("rotate")) {
    return "rotate" as const
  }
  if(node.getAttribute("data-handle")==="move")return "move" as const
  if (
    loweredRole.includes("doy-oval-handle") ||
    loweredRole.includes("doy-gusset-handle") ||
    loweredRole.includes("doy-center-handle") ||
    loweredRole.includes("gusset-depth-handle") ||
    loweredRole.includes("half-moon")
  ) {
    return "resize" as const
  }
  if (loweredRole.includes("move")) {
    return "move" as const
  }
  if (loweredRole.includes("handle")) {
    const handleType = (node.getAttribute("data-handle") ?? "").toLowerCase()
    if (handleType.includes("move")) {
      return "move" as const
    }
    if (handleType.includes("rotate")) {
      return "rotate" as const
    }
    return "resize" as const
  }
  return null
}

function getNodeCenter(node: Element) {
  if (!(node instanceof SVGGraphicsElement)) {
    return null
  }
  const tag = node.tagName.toLowerCase()
  if (tag === "circle") {
    const cx = Number(node.getAttribute("cx") ?? "")
    const cy = Number(node.getAttribute("cy") ?? "")
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      return { x: cx, y: cy }
    }
  }
  if (tag === "ellipse") {
    const cx = Number(node.getAttribute("cx") ?? "")
    const cy = Number(node.getAttribute("cy") ?? "")
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      return { x: cx, y: cy }
    }
  }
  if (tag === "rect" || tag === "image") {
    const x = Number(node.getAttribute("x") ?? "")
    const y = Number(node.getAttribute("y") ?? "")
    const w = Number(node.getAttribute("width") ?? "")
    const h = Number(node.getAttribute("height") ?? "")
    if ([x, y, w, h].every(Number.isFinite)) {
      return { x: x + w / 2, y: y + h / 2 }
    }
  }
  if (tag === "line") {
    const x1 = Number(node.getAttribute("x1") ?? "")
    const y1 = Number(node.getAttribute("y1") ?? "")
    const x2 = Number(node.getAttribute("x2") ?? "")
    const y2 = Number(node.getAttribute("y2") ?? "")
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
    }
  }
  try {
    const box = node.getBBox()
    if (Number.isFinite(box.x) && Number.isFinite(box.y)) {
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }
  } catch {
    return null
  }
  return null
}

export function refreshMovementHandleIcons(
  svg: SVGSVGElement,
  options?: { selectedIds?: string[]; selectionMode?: boolean }
) {
  const layer = ensureIconLayer(svg)
  layer.innerHTML = ""
  void svg
  void options
}

function resolveOwnerId(role: string, node: Element) {
  if (role === "seal-handle") {
    return "layer:seal-areas"
  }
  if (role.startsWith("window-")) {
    const id = node.getAttribute("data-window-id")
    return id ? `window:${id}` : null
  }
  if (role.startsWith("attribute-box-")) {
    const id = node.getAttribute("data-box-id")
    return id ? `attribute-box:${id}` : null
  }
  if (role.startsWith("safe-zone-")) {
    const id = node.getAttribute("data-zone-id")
    return id ? `safe-zone:${id}` : null
  }
  if (role.startsWith("eye-mark-")) {
    const index = node.getAttribute("data-eye-index")
    return index !== null ? `eye-mark:${index}` : null
  }
  if (role.startsWith("hanger-slot-")) {
    const id = node.getAttribute("data-slot-id")
    return id ? `hanger-slot:${id}` : null
  }
  if (role.startsWith("half-moon-cutout-")) {
    const id = node.getAttribute("data-cutout-id")
    return id ? `half-moon:${id}` : null
  }
  if (role === "doy-oval-handle") {
    return "layer:gusset-bottom"
  }
  if (role === "doy-gusset-handle" || role === "gusset-depth-handle") {
    return "layer:gusset-side"
  }
  if (role === "doy-center-handle") {
    return "layer:gusset-fold-line"
  }
  if (role === "kseal-corner-handle") {
    return "layer:kseal-arms"
  }
  if (role === "kseal-side-handle") {
    return "layer:gusset-fold-line"
  }
  return null
}
