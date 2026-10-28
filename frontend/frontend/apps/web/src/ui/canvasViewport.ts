/** Presentation scaling only. SVG coordinates remain millimetres. */
export const MIN_CANVAS_ZOOM = .2
export const MAX_CANVAS_ZOOM = 64
export const REFERENCE_PPI = 600
export const REFERENCE_PIXEL_MM = 25.4 / REFERENCE_PPI
/** Display grid tiers only, never an artwork-resolution claim. */
export const referenceGridDpi = (zoom:number) => zoom<2?150:zoom<4?200:zoom<8?300:600
export const wheelZoomFactor = (delta:number) => Math.exp(-Math.max(-600,Math.min(600,delta))*.0015)
export const clampCanvasZoom = (zoom: number) => Number.isFinite(zoom)
  ? Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, zoom)) : 1
export type ViewBox = { x: number; y: number; width: number; height: number }
export function zoomViewBox(base: ViewBox, current: ViewBox, zoom: number, anchor = { x: current.x + current.width / 2, y: current.y + current.height / 2 }) {
  const width = base.width / clampCanvasZoom(zoom), height = base.height / clampCanvasZoom(zoom)
  return { x: anchor.x - (anchor.x - current.x) / current.width * width,
    y: anchor.y - (anchor.y - current.y) / current.height * height, width, height }
}
/** Display precision only; snapping and stored coordinates retain full precision. */
export const measurementDecimals = (zoom: number) => zoom < 2 ? 2 : zoom < 16 ? 2 : 3
export const formatMeasurement = (value: number, zoom = 16) => value.toFixed(measurementDecimals(zoom))
export function measurementReadout(length: number, dx: number, dy: number, zoom = 16) {
  const mm = (n: number) => formatMeasurement(n, zoom)
  return `${mm(length)} mm · ΔX ${mm(Math.abs(dx))} · ΔY ${mm(Math.abs(dy))} · ${(length / REFERENCE_PIXEL_MM).toFixed(2)} px at 600 ppi (reference)`
}
