export type Point = { x: number; y: number }
export type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number }
export const transformPoint = (p: Point, m: Matrix): Point => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f })
export function nearestSegmentPoint(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y, divisor = dx * dx + dy * dy
  const t = divisor ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / divisor)) : 0
  const point = { x: a.x + t * dx, y: a.y + t * dy }
  return { point, distance: Math.hypot(p.x - point.x, p.y - point.y) }
}
export type EdgeHit = { element: SVGGeometryElement; screen: Point; distance: number; segment?: [Point, Point] }
// The K Seal gusset outline (AMENDS 6.1) traces arm/bottom-seal edges that are already measurable;
// its polyline bounding boxes must not become phantom drag/measure references.
const excluded = '[data-export-ui="true"],defs,clipPath,mask,#annotations,#measurement_annotations,#measurement_guides,#selection_overlay,#soft_warnings,#substrate_background,#bleed,#cutter_legend,[data-role="kseal-gusset-outline"]'
export function collectMeasureEdges(svg: SVGSVGElement) {
  return Array.from(svg.querySelectorAll<SVGGeometryElement>('line,rect,path,polyline,polygon,circle,ellipse')).filter(e =>
    !e.closest(excluded) && !/hit|handle|label|measure|rotate|move/.test(e.getAttribute('data-role') ?? ''))
}
export function visibleEdge(e: SVGGeometryElement) {
  for (let node: Element | null = e; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
  }
  const style = getComputedStyle(e)
  return (style.stroke !== 'none' && style.stroke !== 'transparent' && Number(style.strokeOpacity) > 0 && parseFloat(style.strokeWidth) > 0)
    || (e.tagName !== 'line' && style.fill !== 'none' && style.fill !== 'transparent' && Number(style.fillOpacity) > 0)
}
function straightSegments(e: SVGGeometryElement): [Point, Point][] | null {
  const n = (key: string) => Number(e.getAttribute(key) ?? 0)
  if (e.tagName === 'line') return [[{ x: n('x1'), y: n('y1') }, { x: n('x2'), y: n('y2') }]]
  if (e.tagName === 'rect' && !n('rx') && !n('ry')) {
    const x=n('x'),y=n('y'),w=n('width'),h=n('height')
    const points=[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h},{x,y}]
    return points.slice(1).map((p,i) => [points[i],p])
  }
  if (e.tagName === 'polyline' || e.tagName === 'polygon') {
    const list=(e as SVGPolylineElement).points, points: Point[]=[]
    for(let i=0;i<list.numberOfItems;i++){const p=list.getItem(i);points.push({x:p.x,y:p.y})}
    if(e.tagName==='polygon'&&points.length)points.push(points[0])
    return points.slice(1).map((p,i) => [points[i],p])
  }
  return null
}
function insideClips(element: SVGGeometryElement, screen: Point) {
  // The engine uses user-space rectangular cutter clips. Respect them in hit tests.
  for(let node: SVGGraphicsElement|null=element;node&&node!==element.ownerSVGElement;node=node.parentElement as unknown as SVGGraphicsElement|null){
    const id=node.getAttribute('clip-path')?.match(/url\(["']?#([^"')]+)["']?\)/)?.[1]
    if(!id)continue
    const clip=element.ownerSVGElement?.getElementById(id)
    const rect=clip?.querySelector('rect')
    if(!rect||clip?.getAttribute('clipPathUnits')==='objectBoundingBox')continue
    const m=node.getScreenCTM()
    if(!m)return false
    const local=transformPoint(screen,m.inverse())
    const x=Number(rect.getAttribute('x')??0),y=Number(rect.getAttribute('y')??0)
    const width=Number(rect.getAttribute('width')??0),height=Number(rect.getAttribute('height')??0)
    if(local.x<x-.000001||local.x>x+width+.000001||local.y<y-.000001||local.y>y+height+.000001)return false
  }
  return true
}
/** Screen-pixel tolerance stays predictable at any zoom or nested transform. */
export function findMeasureEdge(edges: SVGGeometryElement[], cursor: Point, tolerance = 8): EdgeHit | null {
  let best: EdgeHit | null = null
  for (const element of edges) {
    if (!element.isConnected) continue
    const bounds=element.getBoundingClientRect()
    if(cursor.x<bounds.left-tolerance||cursor.x>bounds.right+tolerance||cursor.y<bounds.top-tolerance||cursor.y>bounds.bottom+tolerance)continue
    if(!visibleEdge(element))continue
    const matrix=element.getScreenCTM()
    if(!matrix)continue
    const segments=straightSegments(element)
    if(segments){
      for(const segment of segments){const hit=nearestSegmentPoint(cursor,transformPoint(segment[0],matrix),transformPoint(segment[1],matrix));if(hit.distance<=tolerance&&(!best||hit.distance<best.distance)&&insideClips(element,hit.point))best={element,screen:hit.point,distance:hit.distance,segment}}
      continue
    }
    // Browser path geometry preserves curves; refine the closest sample in screen space.
    try {
      const length=element.getTotalLength()
      if(!length)continue
      const count=Math.min(256,Math.max(32,Math.ceil(length/2)))
      const at=(s:number)=>transformPoint(element.getPointAtLength(s),matrix)
      const distance=(s:number)=>{const p=at(s);return Math.hypot(p.x-cursor.x,p.y-cursor.y)}
      let position=0,nearest=Infinity
      for(let i=0;i<=count;i++){const s=length*i/count,d=distance(s);if(d<nearest){nearest=d;position=s}}
      let low=Math.max(0,position-length/count),high=Math.min(length,position+length/count)
      for(let i=0;i<24;i++){const a=low+(high-low)/3,b=high-(high-low)/3;if(distance(a)<distance(b))high=b;else low=a}
      for(const s of [position,(low+high)/2,0,length]){const d=distance(s);if(d<=tolerance&&(!best||d<best.distance)&&insideClips(element,at(s)))best={element,screen:at(s),distance:d}}
    } catch { /* Invalid or non-rendered geometry is not a measurable edge. */ }
  }
  return best
}
