import type {
  ArtworkBounds,
  ArtworkCollection,
  ArtworkItem
} from "./artworkTypes"

const SVG_NS = "http://www.w3.org/2000/svg"
const ARTWORK_LAYER_ID = "artwork-import-layer"
const ARTWORK_SELECTION_LAYER_ID = "artwork-selection-overlay"
const FLOOD_PREVIEW_LAYER_ID = "artwork-flood-preview-layer"
const FLOOD_PREVIEW_FILL = "#4aa3ff"
const FLOOD_PREVIEW_OPACITY = 0.2

export type ArtworkCornerHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right"

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const normalizeRotation = (rotation: number) => {
  const raw = rotation % 360
  return raw < 0 ? raw + 360 : raw
}

const getArtworkTransformScale = (item: ArtworkItem) => ({
  x: item.scale * (item.flipped && item.flipMode === "horizontal" ? -1 : 1),
  y: item.scale * (item.flipped && item.flipMode === "vertical" ? -1 : 1)
})

const getArtworkCenter = (item: ArtworkItem) => ({
  x: item.baseWidthMm / 2,
  y: item.baseHeightMm / 2
})

const transformArtworkPoint = (item: ArtworkItem, point: { x: number; y: number }) => {
  const rotation = (normalizeRotation(item.rotation ?? 0) * Math.PI) / 180
  const transformScale = getArtworkTransformScale(item)
  const center = getArtworkCenter(item)
  const localX = point.x - center.x
  const localY = point.y - center.y
  const rotatedX = localX * Math.cos(rotation) - localY * Math.sin(rotation)
  const rotatedY = localX * Math.sin(rotation) + localY * Math.cos(rotation)

  return {
    x: item.x + rotatedX * transformScale.x,
    y: item.y + rotatedY * transformScale.y
  }
}

const createBounds = (x: number, y: number, width: number, height: number): ArtworkBounds => ({
  x,
  y,
  width,
  height
})

const getViewBoxBounds = (svg: SVGSVGElement): ArtworkBounds => {
  const viewBox = svg.viewBox.baseVal
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return createBounds(viewBox.x, viewBox.y, viewBox.width, viewBox.height)
  }
  const width = Number.parseFloat(svg.getAttribute("width") ?? "")
  const height = Number.parseFloat(svg.getAttribute("height") ?? "")
  return createBounds(0, 0, Number.isFinite(width) ? width : 1, Number.isFinite(height) ? height : 1)
}

const measureElementBounds = (svg: SVGSVGElement, selector: string): ArtworkBounds | null => {
  const element = svg.querySelector<SVGGraphicsElement>(selector)
  if (!element) {
    return null
  }
  try {
    const bbox = element.getBBox()
    if (bbox.width > 0 && bbox.height > 0) {
      return createBounds(bbox.x, bbox.y, bbox.width, bbox.height)
    }
  } catch {
    // Fall back to the SVG viewBox below.
  }
  return null
}

const getBestBounds = (
  svg: SVGSVGElement,
  selectors: string[]
): ArtworkBounds => {
  for (const selector of selectors) {
    const bounds = measureElementBounds(svg, selector)
    if (bounds) {
      return bounds
    }
  }
  return getViewBoxBounds(svg)
}

const insertLayerBeforeFirstMatch = (
  svg: SVGSVGElement,
  layer: SVGGElement,
  selectors: string[]
) => {
  for (const selector of selectors) {
    const insertionPoint = svg.querySelector<SVGGElement>(selector)
    if (insertionPoint?.parentNode) {
      insertionPoint.parentNode.insertBefore(layer, insertionPoint)
      return true
    }
  }
  svg.appendChild(layer)
  return false
}

export const getCutterBounds = (svg: SVGSVGElement) =>
  getBestBounds(svg, ["#cut_line", "#cut_lines", "#cutter_outline"])

export const getBleedBounds = (svg: SVGSVGElement) => {
  const bounds = measureElementBounds(svg, "#bleed")
  return bounds && bounds.width > 0 && bounds.height > 0 ? bounds : null
}

export const getEyemarkBounds = (svg: SVGSVGElement) => {
  const bounds = measureElementBounds(svg, "#eyemark_track")
  return bounds && bounds.width > 0 && bounds.height > 0 ? bounds : null
}

export const getArtworkBounds = (item: ArtworkItem): ArtworkBounds => {
  return getTransformedArtworkBounds(item)
}

export const getTransformedArtworkBounds = (item: ArtworkItem): ArtworkBounds => {
  const corners = [
    transformArtworkPoint(item, { x: 0, y: 0 }),
    transformArtworkPoint(item, { x: item.baseWidthMm, y: 0 }),
    transformArtworkPoint(item, { x: 0, y: item.baseHeightMm }),
    transformArtworkPoint(item, { x: item.baseWidthMm, y: item.baseHeightMm })
  ]
  const xs = corners.map(point => point.x)
  const ys = corners.map(point => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return createBounds(minX, minY, maxX - minX, maxY - minY)
}

export const getArtworkSelectionGeometry = (item: ArtworkItem) => {
  const bounds = getArtworkBounds(item)
  return {
    bounds,
    handles: {
      "top-left": { x: bounds.x, y: bounds.y },
      "top-right": { x: bounds.x + bounds.width, y: bounds.y },
      "bottom-left": { x: bounds.x, y: bounds.y + bounds.height },
      "bottom-right": { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    } satisfies Record<ArtworkCornerHandle, { x: number; y: number }>
  }
}

export const centerArtworkInBounds = (
  item: ArtworkItem,
  bounds: ArtworkBounds,
  scale = item.scale
): ArtworkItem => ({
  ...item,
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
  scale: clamp(scale, 0.01, 20)
})

export const fitArtworkToWidth = (item: ArtworkItem, bounds: ArtworkBounds): ArtworkItem =>
  centerArtworkInBounds(item, bounds, bounds.width / Math.max(0.01, getTransformedArtworkBounds({ ...item, scale: 1 }).width))

export const fitArtworkToHeight = (item: ArtworkItem, bounds: ArtworkBounds): ArtworkItem =>
  centerArtworkInBounds(item, bounds, bounds.height / Math.max(0.01, getTransformedArtworkBounds({ ...item, scale: 1 }).height))

export const fitArtworkToArea = (item: ArtworkItem, bounds: ArtworkBounds): ArtworkItem =>
  centerArtworkInBounds(
    item,
    bounds,
    Math.min(
      bounds.width / Math.max(0.01, getTransformedArtworkBounds({ ...item, scale: 1 }).width),
      bounds.height / Math.max(0.01, getTransformedArtworkBounds({ ...item, scale: 1 }).height)
    )
  )

export const resetArtworkPosition = (item: ArtworkItem): ArtworkItem => ({
  ...item,
  x: item.initialX,
  y: item.initialY,
  scale: item.initialScale
})

export const getArtworkTransform = (item: ArtworkItem) =>
  {
    const transformScale = getArtworkTransformScale(item)
    return `translate(${item.x} ${item.y}) scale(${transformScale.x} ${transformScale.y}) rotate(${normalizeRotation(item.rotation ?? 0)}) translate(${-item.baseWidthMm / 2} ${-item.baseHeightMm / 2})`
  }

const ensureArtworkLayer = (svg: SVGSVGElement) => {
  let layer = svg.querySelector<SVGGElement>(`#${ARTWORK_LAYER_ID}`)
  if (layer) {
    return layer
  }

  layer = document.createElementNS(SVG_NS, "g")
  layer.setAttribute("id", ARTWORK_LAYER_ID)
  layer.setAttribute("data-layer-id", "artwork-assets")
  svg.appendChild(layer)
  return layer
}

const ensureFloodPreviewLayer = (svg: SVGSVGElement) => {
  let layer = svg.querySelector<SVGGElement>(`#${FLOOD_PREVIEW_LAYER_ID}`)
  if (layer) {
    return layer
  }

  layer = document.createElementNS(SVG_NS, "g")
  layer.setAttribute("id", FLOOD_PREVIEW_LAYER_ID)
  layer.setAttribute("data-layer-id", "artwork-flood-preview")
  layer.setAttribute("pointer-events", "none")
  insertLayerBeforeFirstMatch(svg, layer, [
    "#bleed",
    "#seal_areas",
    "#safe_zones",
    "#windows",
    "#attribute_boxes",
    "#hanger_slots",
    "#fold_lines",
    "#gusset_fold_lines",
    "#gusset_side_gusset",
    "#gusset_bottom_gusset",
    "#grip_seal_layer",
    "#zipper_layer",
    "#tear_notches",
    "#perf_layer",
    "#cut_line",
    "#cut_lines",
    "#eyemark_track",
    "#measurement_annotations",
    "#annotations",
    "#soft_warnings"
  ])
  return layer
}

const renderArtworkItem = (item: ArtworkItem, selected: boolean) => {
  const group = document.createElementNS(SVG_NS, "g")
  group.setAttribute("class", `artwork-item${selected ? " is-selected" : ""}`)
  group.setAttribute("data-artwork-id", item.id)
  group.setAttribute("data-upload-type", item.uploadType)
  group.setAttribute("data-visible", item.visible ? "true" : "false")
  group.setAttribute("data-locked", item.locked ? "true" : "false")
  group.setAttribute("display", item.visible ? "inline" : "none")
  group.setAttribute("opacity", item.opacity.toString())
  group.setAttribute("transform", getArtworkTransform(item))
  group.setAttribute("cursor", item.locked ? "not-allowed" : selected ? "move" : "grab")
  group.setAttribute("pointer-events", "visiblePainted")

  const title = document.createElementNS(SVG_NS, "title")
  title.textContent = `${item.filename} (${item.uploadType})`
  group.appendChild(title)

  const image = document.createElementNS(SVG_NS, "image")
  image.setAttribute("href", item.sourceDataUrl)
  image.setAttribute("x", "0")
  image.setAttribute("y", "0")
  image.setAttribute("width", item.baseWidthMm.toString())
  image.setAttribute("height", item.baseHeightMm.toString())
  image.setAttribute("preserveAspectRatio", "none")
  image.setAttribute("pointer-events", "visiblePainted")
  image.setAttribute("style", "overflow: visible;")
  group.appendChild(image)

  return group
}

export const syncArtworkLayer = (
  svg: SVGSVGElement,
  collection: ArtworkCollection,
  editingId: string | null = null
) => {
  const layer = ensureArtworkLayer(svg)
  layer.replaceChildren(
    ...collection.items.slice().reverse().map(item =>
      renderArtworkItem(item, collection.selectedId === item.id && editingId === item.id)
    )
  )
}

export const syncFloodPreviewLayer = (svg: SVGSVGElement, enabled: boolean) => {
  const existing = svg.querySelector<SVGGElement>(`#${FLOOD_PREVIEW_LAYER_ID}`)
  if (!enabled) {
    existing?.remove()
    return
  }

  const layer = ensureFloodPreviewLayer(svg)
  const bounds = getCutterBounds(svg)
  layer.replaceChildren()

  const rect = document.createElementNS(SVG_NS, "rect")
  rect.setAttribute("x", bounds.x.toString())
  rect.setAttribute("y", bounds.y.toString())
  rect.setAttribute("width", bounds.width.toString())
  rect.setAttribute("height", bounds.height.toString())
  rect.setAttribute("fill", FLOOD_PREVIEW_FILL)
  rect.setAttribute("fill-opacity", FLOOD_PREVIEW_OPACITY.toString())
  rect.setAttribute("stroke", "none")
  rect.setAttribute("pointer-events", "none")
  layer.appendChild(rect)
}

export const syncArtworkSelectionOverlay = (
  svg: SVGSVGElement,
  item: ArtworkItem | null,
  handleSizeMm: number
) => {
  let layer = svg.querySelector<SVGGElement>(`#${ARTWORK_SELECTION_LAYER_ID}`)
  if (!item) {
    layer?.remove()
    return
  }

  if (!layer) {
    layer = document.createElementNS(SVG_NS, "g")
    layer.setAttribute("id", ARTWORK_SELECTION_LAYER_ID)
    layer.setAttribute("data-layer-id", "artwork-selection")
    svg.appendChild(layer)
  }

  layer.replaceChildren()

  const geometry = getArtworkSelectionGeometry(item)
  const outline = document.createElementNS(SVG_NS, "rect")
  outline.setAttribute("x", geometry.bounds.x.toString())
  outline.setAttribute("y", geometry.bounds.y.toString())
  outline.setAttribute("width", geometry.bounds.width.toString())
  outline.setAttribute("height", geometry.bounds.height.toString())
  outline.setAttribute("fill", "none")
  outline.setAttribute("stroke", item.locked ? "#9a6c18" : "#1f4d42")
  outline.setAttribute("stroke-width", item.locked ? "0.9" : "0.8")
  outline.setAttribute("stroke-dasharray", "3 2")
  outline.setAttribute("vector-effect", "non-scaling-stroke")
  outline.setAttribute("pointer-events", "none")
  layer.appendChild(outline)

  const handleStroke = item.locked ? "#9a6c18" : "#1f4d42"
  const handleFill = item.locked ? "#f4efe5" : "#ffffff"
  const handleOpacity = item.locked ? "0.72" : "1"
  const handleCursorMap: Record<ArtworkCornerHandle, string> = {
    "top-left": "nwse-resize",
    "top-right": "nesw-resize",
    "bottom-left": "nesw-resize",
    "bottom-right": "nwse-resize"
  }

  ;(Object.entries(geometry.handles) as Array<[ArtworkCornerHandle, { x: number; y: number }]>)
    .forEach(([handle, point]) => {
      const rect = document.createElementNS(SVG_NS, "rect")
      rect.setAttribute("x", (point.x - handleSizeMm / 2).toString())
      rect.setAttribute("y", (point.y - handleSizeMm / 2).toString())
      rect.setAttribute("width", handleSizeMm.toString())
      rect.setAttribute("height", handleSizeMm.toString())
      rect.setAttribute("rx", (handleSizeMm * 0.18).toString())
      rect.setAttribute("ry", (handleSizeMm * 0.18).toString())
      rect.setAttribute("fill", handleFill)
      rect.setAttribute("fill-opacity", handleOpacity)
      rect.setAttribute("stroke", handleStroke)
      rect.setAttribute("stroke-width", "0.7")
      rect.setAttribute("vector-effect", "non-scaling-stroke")
      rect.setAttribute("data-artwork-handle", handle)
      rect.setAttribute("data-artwork-handle-for", item.id)
      rect.setAttribute("data-artwork-id", item.id)
      rect.setAttribute("cursor", item.locked ? "not-allowed" : handleCursorMap[handle])
      rect.setAttribute("pointer-events", "all")
      layer.appendChild(rect)
    })
}

export const boundsIntersect = (a: ArtworkBounds, b: ArtworkBounds) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

export const isArtworkSmallerThanBounds = (
  artworkBounds: ArtworkBounds,
  referenceBounds: ArtworkBounds
) =>
  artworkBounds.width < referenceBounds.width ||
  artworkBounds.height < referenceBounds.height

export type ArtworkZoneCheckStatus =
  | {
      status: "unknown"
      bounds: ArtworkBounds
      message: string
    }
  | {
      status: "clear"
      bounds: ArtworkBounds
      message: string
    }
  | {
      status: "overlap"
      bounds: ArtworkBounds
      message: string
    }

const createUnknownArtworkZoneStatus = (
  bounds: ArtworkBounds,
  message: string
): ArtworkZoneCheckStatus => ({
  status: "unknown",
  bounds,
  message
})

export const getArtworkSafeZoneStatus = (
  item: ArtworkItem,
  _zones: readonly unknown[] = []
): ArtworkZoneCheckStatus =>
  createUnknownArtworkZoneStatus(getArtworkBounds(item), "Safe zone preflight is not implemented yet.")

export const getArtworkBleedCoverageStatus = (
  item: ArtworkItem,
  _zones: readonly unknown[] = []
): ArtworkZoneCheckStatus =>
  createUnknownArtworkZoneStatus(getArtworkBounds(item), "Bleed coverage preflight is not implemented yet.")

export const getArtworkSealOverlapStatus = (
  item: ArtworkItem,
  _zones: readonly unknown[] = []
): ArtworkZoneCheckStatus =>
  createUnknownArtworkZoneStatus(getArtworkBounds(item), "Seal overlap preflight is not implemented yet.")

export const getArtworkEyemarkOverlapStatus = (
  item: ArtworkItem,
  _zones: readonly unknown[] = []
): ArtworkZoneCheckStatus =>
  createUnknownArtworkZoneStatus(getArtworkBounds(item), "Eyemark overlap preflight is not implemented yet.")
