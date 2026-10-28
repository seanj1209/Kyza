import type { KSealArmLine, KSealPouchGeometry } from "./kSealPouchGeometry"

/**
 * AMENDS 6.1 — K Seal Gusset outline.
 *
 * The gusset fill is drawn as overlapping convex pieces: each K arm band, the
 * triangle between each outer/inner arm pair, and the two bottom-seal bands.
 * The Gusset outline traces the outer boundary of their union (the edges
 * highlighted in the 6.1 brief) and is restricted to the band between the top
 * and bottom side seals, so no outline ever enters a side seal.
 *
 * Coordinates are local to the cutter (origin 0,0), in millimetres.
 */
export type OutlinePoint = { x: number; y: number }
export type KSealGussetOutlinePath = {
  points: OutlinePoint[]
  closed: boolean
  /** Which half of the cutter the path sits in ("both" when the inner arm edges meet below a side seal). */
  side: "left" | "right" | "both"
  /** "outer" edges face the pouch panels; "inner" edges face the substrate inside the K. */
  edge: "outer" | "inner"
}
export type KSealGussetOutline = {
  paths: KSealGussetOutlinePath[]
  /** Live band the outline (and gusset fill) is restricted to: between the side seals. */
  liveTop: number
  liveBottom: number
}

type Polygon = OutlinePoint[]
type Segment = [OutlinePoint, OutlinePoint]

const EPS = 1e-7
const PROBE = 1e-4
const round = (value: number) => Math.round(value * 1e6) / 1e6

function armBand(arm: KSealArmLine, width: number): Polygon | null {
  const dx = arm.endX - arm.startX
  const dy = arm.endY - arm.startY
  const length = Math.hypot(dx, dy)
  if (length <= 0 || width <= 0) return null
  // Same offset convention as the renderer's bandPath(), so the outline sits
  // exactly on the drawn fill edges.
  const ox = (-dy / length) * (width / 2)
  const oy = (dx / length) * (width / 2)
  return [
    { x: arm.startX + ox, y: arm.startY + oy },
    { x: arm.endX + ox, y: arm.endY + oy },
    { x: arm.endX - ox, y: arm.endY - oy },
    { x: arm.startX - ox, y: arm.startY - oy }
  ]
}

const signedArea = (poly: Polygon) =>
  poly.reduce((sum, p, i) => {
    const q = poly[(i + 1) % poly.length]
    return sum + (p.x * q.y - q.x * p.y)
  }, 0) / 2

/** Counter-clockwise (in SVG y-down space the sign is only used consistently). */
const normalise = (poly: Polygon) => (signedArea(poly) < 0 ? [...poly].reverse() : poly)

function insideOrOn(point: OutlinePoint, poly: Polygon) {
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
    if (cross < -EPS) return false
  }
  return true
}

function segmentIntersectionT(a: OutlinePoint, b: OutlinePoint, c: OutlinePoint, d: OutlinePoint): number | null {
  const rX = b.x - a.x, rY = b.y - a.y
  const sX = d.x - c.x, sY = d.y - c.y
  const denom = rX * sY - rY * sX
  if (Math.abs(denom) < 1e-12) return null
  const t = ((c.x - a.x) * sY - (c.y - a.y) * sX) / denom
  const u = ((c.x - a.x) * rY - (c.y - a.y) * rX) / denom
  return t > EPS && t < 1 - EPS && u >= -EPS && u <= 1 + EPS ? t : null
}

const lerp = (a: OutlinePoint, b: OutlinePoint, t: number): OutlinePoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** Boundary of the union of convex polygons: every edge piece whose outside neighbourhood is uncovered. */
function unionBoundary(polygons: Polygon[]): Segment[] {
  const polys = polygons.map(normalise)
  const result: Segment[] = []
  polys.forEach((poly, index) => {
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i]
      const b = poly[(i + 1) % poly.length]
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      if (length < EPS) continue
      const ts = [0, 1]
      polys.forEach((other, otherIndex) => {
        if (otherIndex === index) return
        for (let j = 0; j < other.length; j += 1) {
          const t = segmentIntersectionT(a, b, other[j], other[(j + 1) % other.length])
          if (t !== null) ts.push(t)
        }
      })
      ts.sort((p, q) => p - q)
      // Outward normal for a counter-clockwise polygon with y-down axes.
      const nx = (b.y - a.y) / length
      const ny = -(b.x - a.x) / length
      for (let k = 0; k < ts.length - 1; k += 1) {
        if (ts[k + 1] - ts[k] < EPS) continue
        const mid = lerp(a, b, (ts[k] + ts[k + 1]) / 2)
        const probe = { x: mid.x + nx * PROBE, y: mid.y + ny * PROBE }
        if (polys.some((other, otherIndex) => otherIndex !== index && insideOrOn(probe, other))) continue
        result.push([lerp(a, b, ts[k]), lerp(a, b, ts[k + 1])])
      }
    }
  })
  return result
}

function clipToBand(segment: Segment, top: number, bottom: number, left: number, right: number): Segment | null {
  let [a, b] = segment
  let t0 = 0, t1 = 1
  const dx = b.x - a.x, dy = b.y - a.y
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-12) return q >= -EPS
    const r = q / p
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r }
    else { if (r < t0) return false; if (r < t1) t1 = r }
    return true
  }
  if (!clip(-dx, a.x - left) || !clip(dx, right - a.x) || !clip(-dy, a.y - top) || !clip(dy, bottom - a.y)) return null
  if (t1 - t0 < EPS) return null
  return [lerp(a, b, t0), lerp(a, b, t1)]
}

const key = (p: OutlinePoint) => `${round(p.x).toFixed(5)},${round(p.y).toFixed(5)}`

function chain(segments: Segment[]): { points: OutlinePoint[]; closed: boolean }[] {
  const nodes = new Map<string, { point: OutlinePoint; edges: number[] }>()
  segments.forEach((segment, index) => {
    segment.forEach(point => {
      const k = key(point)
      const node = nodes.get(k) ?? { point: { x: round(point.x), y: round(point.y) }, edges: [] }
      node.edges.push(index)
      nodes.set(k, node)
    })
  })
  const used = new Set<number>()
  const walk = (startKey: string) => {
    const points = [nodes.get(startKey)!.point]
    let current = startKey
    for (;;) {
      const next = nodes.get(current)!.edges.find(edge => !used.has(edge))
      if (next === undefined) break
      used.add(next)
      const [a, b] = segments[next]
      const nextKey = key(a) === current ? key(b) : key(a)
      points.push(nodes.get(nextKey)!.point)
      current = nextKey
      if (current === startKey) break
    }
    return { points, closed: points.length > 2 && current === startKey }
  }
  const paths: { points: OutlinePoint[]; closed: boolean }[] = []
  // Open chains first (they start at the side-seal boundary), then any loops.
  ;[...nodes.entries()].filter(([, node]) => node.edges.length === 1).forEach(([k]) => {
    if (nodes.get(k)!.edges.some(edge => !used.has(edge))) paths.push(walk(k))
  })
  segments.forEach((segment, index) => { if (!used.has(index)) paths.push(walk(key(segment[0]))) })
  return paths.map(path => ({ ...path, points: simplify(path.points, path.closed) }))
}

/** Drop collinear joints left behind by intersection splits. */
function simplify(points: OutlinePoint[], closed: boolean) {
  const pts = closed ? points.slice(0, -1) : [...points]
  const kept = pts.filter((p, i) => {
    if (!closed && (i === 0 || i === pts.length - 1)) return true
    const a = pts[(i - 1 + pts.length) % pts.length]
    const b = pts[(i + 1) % pts.length]
    const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x)
    return Math.abs(cross) > 1e-6
  })
  return closed ? [...kept, kept[0]] : kept
}

export function resolveKSealGussetPieces(geometry: KSealPouchGeometry): Polygon[] {
  const pieces: Polygon[] = []
  geometry.armLines.forEach(arm => {
    const band = armBand(arm, geometry.armWidth)
    if (band) pieces.push(band)
  })
  ;(["top-left", "top-right", "bottom-left", "bottom-right"] as const).forEach(side => {
    const inner = geometry.armLines.find(arm => arm.side === side && arm.position === "inner")
    const outer = geometry.armLines.find(arm => arm.side === side && arm.position === "outer")
    if (!inner || !outer) return
    const triangle = [
      { x: outer.startX, y: outer.startY },
      { x: inner.startX, y: inner.startY },
      { x: inner.endX, y: inner.endY }
    ]
    if (Math.abs(signedArea(triangle)) > EPS) pieces.push(triangle)
  })
  ;[geometry.leftBottomSealX, geometry.rightBottomSealX].forEach(x => {
    if (geometry.bottomSealAreaWidth > 0 && geometry.height > 0) {
      pieces.push([
        { x, y: 0 },
        { x: x + geometry.bottomSealAreaWidth, y: 0 },
        { x: x + geometry.bottomSealAreaWidth, y: geometry.height },
        { x, y: geometry.height }
      ])
    }
  })
  return pieces
}

export function resolveKSealGussetOutline(geometry: KSealPouchGeometry): KSealGussetOutline {
  const liveTop = geometry.sideSeal
  const liveBottom = geometry.height - geometry.sideSeal
  const segments = unionBoundary(resolveKSealGussetPieces(geometry))
    .map(segment => clipToBand(segment, liveTop, liveBottom, 0, geometry.width))
    .filter((segment): segment is Segment => segment !== null)
  const paths = chain(segments).filter(path => path.points.length > 1).map(path => {
    const meanX = path.points.reduce((sum, p) => sum + p.x, 0) / path.points.length
    const minX = Math.min(...path.points.map(p => p.x))
    const maxX = Math.max(...path.points.map(p => p.x))
    const side: KSealGussetOutlinePath["side"] =
      minX < geometry.centerX - EPS && maxX > geometry.centerX + EPS ? "both" : meanX < geometry.centerX ? "left" : "right"
    const edge: KSealGussetOutlinePath["edge"] = side === "both"
      ? "inner"
      : side === "left"
        ? (meanX < geometry.leftFoldX ? "outer" : "inner")
        : (meanX > geometry.rightFoldX ? "outer" : "inner")
    return { ...path, side, edge }
  })
  return { paths, liveTop, liveBottom }
}

export function outlinePathData(path: KSealGussetOutlinePath, originX = 0, originY = 0) {
  const pts = path.closed ? path.points.slice(0, -1) : path.points
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${round(originX + p.x)} ${round(originY + p.y)}`).join(" ") + (path.closed ? " Z" : "")
}
