import type { FlowwrapSpec, SafeZoneSpec } from "../../../apps/web/src/types/flowwrap"
import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"
import { resolveDoyLayout } from "../../../apps/web/src/core/geometry/resolvers/resolveDoyLayout"
import { resolveKSealPouchGeometry } from "../../../apps/web/src/geometry/kSealPouchGeometry"
import { DEFAULT_SEAL_CLEARANCE_MM } from "../../../apps/web/src/constraints/flowwrap"

type Point = { x: number; y: number }
// Intersect a convex working area with a half-plane. Distances are in mm.
function clip(points: Point[], distance: (p: Point) => number): Point[] {
  const out: Point[] = []
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length], da = distance(a), db = distance(b)
    if (da >= -1e-8) out.push(a)
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db)
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) })
    }
  })
  return out
}
const rectangle = (left: number, top: number, right: number, bottom: number): Point[] =>
  right > left && bottom > top ? [{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}] : []

/** True working boundaries, offset normal to arms/arcs rather than translated in X. */
export function pouchSafeZoneContour(spec: FlowwrapSpec, left: boolean, clearance: number): Point[] {
  if (spec.kSealPouch) {
    const g = resolveKSealPouchGeometry(spec)
    const minX = left ? g.leftPanelX : g.rightBottomSealX + g.bottomSealAreaWidth
    const maxX = left ? g.leftBottomSealX : g.rightPanelX + g.pouchHeight
    let points = rectangle(minX + clearance, g.liveY + clearance, maxX - clearance, g.liveY + g.liveHeight - clearance)
    for (const arm of g.armLines.filter(a => a.position === "outer" && a.side.endsWith(left ? "left" : "right"))) {
      const dx = arm.endX - arm.startX, dy = arm.endY - arm.startY, length = Math.hypot(dx, dy)
      if (!length) continue
      const reference = { x: left ? minX : maxX, y: g.height / 2 }
      const cross = (p: Point) => (dx * (p.y - arm.startY) - dy * (p.x - arm.startX)) / length
      const sign = Math.sign(cross(reference))
      points = clip(points, p => sign * cross(p) - g.armWidth / 2 - clearance)
    }
    return points.map(p => ({x:p.x-g.liveX,y:p.y-g.liveY}))
  }
  const {liveRect: live} = resolveFlowwrapGeometry(spec)
  const layout = resolveDoyLayout(spec, 0, live.x, live.width, spec.width)
  if (!layout) return []
  let points = rectangle(live.x + clearance, live.y + clearance, live.x + live.width - clearance, live.y + live.height - clearance)
  const arcX = left ? layout.arcLeftX : layout.arcRightX
  // Inscribed chords are conservative; 128 segments keep the visible curve smooth.
  const curve = (t: number): Point => ({
    x: arcX + (left ? 1 : -1) * 3 * layout.arcInsetDepth * t * (1-t),
    y: spec.height * (0.75*t + 0.75*t*t - 0.5*t*t*t)
  })
  for (let i=0;i<128;i++) {
    const a=curve(i/128), b=curve((i+1)/128), dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy)
    points=clip(points,p => (left ? 1 : -1)*(dx*(p.y-a.y)-dy*(p.x-a.x))/length-clearance)
  }
  return points.map(p=>({x:p.x-live.x,y:p.y-live.y}))
}

export function zoneFromContour(zone: SafeZoneSpec, points: Point[]): SafeZoneSpec | null {
  if(points.length<3) return null
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y))
  const width=Math.max(...points.map(p=>p.x))-x,height=Math.max(...points.map(p=>p.y))-y
  if(width<1 || height<1) return null
  return {...zone,x,y,width,height,rotation:0,fitOutline:points.map(p=>({x:(p.x-x)/width,y:(p.y-y)/height}))}
}

export function safeZoneOutlinePath(zone: SafeZoneSpec, originX=0, originY=0): string | null {
  if(!zone.fitOutline?.length) return null
  return zone.fitOutline.map((p,i)=>`${i?'L':'M'} ${originX+zone.x+p.x*zone.width} ${originY+zone.y+p.y*zone.height}`).join(' ')+' Z'
}

export function zonePoints(zone: SafeZoneSpec): Point[] {
  const points=zone.fitOutline??[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]
  const angle=(zone.rotation??0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle)
  return points.map(p=>{const x=(p.x-.5)*zone.width,y=(p.y-.5)*zone.height;return {x:zone.x+zone.width/2+x*c-y*s,y:zone.y+zone.height/2+x*s+y*c}})
}

export function pointInConvexContour(point: Point, polygon: Point[]): boolean {
  return polygon.length>=3 && polygon.every((a,i)=>{const b=polygon[(i+1)%polygon.length];return (b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x)>=-1e-6})
}

export function safeZoneRespectsConstruction(spec: FlowwrapSpec, zone: SafeZoneSpec): boolean {
  const points=zonePoints(zone),clearance=spec.sealClearance??DEFAULT_SEAL_CLEARANCE_MM
  if(spec.kSealPouch || spec.doyPouch){
    const flow=resolveFlowwrapGeometry(spec)
    const left=zone.x+zone.width/2<flow.liveRect.width/2
    const polygon=pouchSafeZoneContour(spec,left,clearance)
    return points.every(p=>pointInConvexContour(p,polygon))
  }
  if(spec.paperStrip){
    const {liveRect:live}=resolveFlowwrapGeometry(spec)
    const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x))
    return (spec.attributeBoxes??[]).filter(b=>b.kind==='clear-strip' && b.enabled!==false).every(b=>maxX<=b.x-live.x-clearance+1e-6 || minX>=b.x+b.width-live.x+clearance-1e-6)
  }
  return true
}

/** Stop an edit at the construction boundary, before it is drawn or persisted. */
export function constrainPouchSafeZone(spec: FlowwrapSpec, previous: SafeZoneSpec, requested: SafeZoneSpec): SafeZoneSpec {
  if (!(spec.kSealPouch || spec.doyPouch) || requested.enabled === false) return requested
  if (safeZoneRespectsConstruction(spec, requested)) return requested
  if (!safeZoneRespectsConstruction(spec, previous)) {
    const flow = resolveFlowwrapGeometry(spec)
    const boundary = pouchSafeZoneContour(spec, requested.x + requested.width / 2 < flow.liveRect.width / 2, spec.sealClearance ?? DEFAULT_SEAL_CLEARANCE_MM)
    let points = zonePoints(requested)
    boundary.forEach((a,i) => { const b=boundary[(i+1)%boundary.length]; points=clip(points,p=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)) })
    return zoneFromContour(requested, points) ?? zoneFromContour(requested, boundary) ?? previous
  }
  // Rotation is not monotonic: reject an unsafe rotation instead of crossing a seal.
  if ((requested.rotation ?? 0) !== (previous.rotation ?? 0)) return previous
  let low=0, high=1
  const at=(t:number):SafeZoneSpec=>({...requested,
    x:previous.x+(requested.x-previous.x)*t, y:previous.y+(requested.y-previous.y)*t,
    width:previous.width+(requested.width-previous.width)*t, height:previous.height+(requested.height-previous.height)*t})
  for(let i=0;i<40;i++){const mid=(low+high)/2;if(safeZoneRespectsConstruction(spec,at(mid)))low=mid;else high=mid}
  return at(low)
}
