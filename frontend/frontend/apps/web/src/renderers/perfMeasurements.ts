import type { PerfPoint } from "../geometry/perfs"
import type { PerfSpec } from "../types/perfs"
import type { Rect } from "../geometry/rect"
import { formatMetricMeasurement } from "../core/formatMetric"
import { overlaps } from "../geometry/annotationPlacement"

const NS = "http://www.w3.org/2000/svg"
type PerfDimension = {kind:string; x1:number; y1:number; x2:number; y2:number; distance:number}

/** Only engine-generated marker centres determine pitch and placement distances. */
export function buildPerfMeasurementDimensions(perfs: PerfSpec, centers: PerfPoint[], pack: Rect, obstacles:Rect[]=[],widthObstacles:Rect[]=obstacles): PerfDimension[] {
  const groups = new Map<number, PerfPoint[]>()
  centers.forEach(point => {
    const index = point.laneIndex ?? 0
    const lane = groups.get(index) ?? []
    if (!lane.some(p => Math.abs(p.x-point.x)<.001 && Math.abs(p.y-point.y)<.001)) lane.push(point)
    groups.set(index,lane)
  })
  const lanes = [...groups.values()].map(points=>points.sort((a,b)=>a.y-b.y)).sort((a,b)=>a[0].x-b[0].x)
  const result: PerfDimension[] = []
  const occupied=[...obstacles]
  const widthOccupied=[...widthObstacles]
  const horizontal=(kind:string,x1:number,x2:number,ideal:number)=>{
    const low=Math.min(x1,x2),width=Math.abs(x2-x1)
    const ys=[ideal,...widthOccupied.flatMap(r=>[r.y-2,r.y+r.height+7]),pack.y+7,pack.y+pack.height-3]
      .filter(y=>y>=pack.y+6 && y<=pack.y+pack.height-2).sort((a,b)=>Math.abs(a-ideal)-Math.abs(b-ideal))
    const y=ys.find(y=>!widthOccupied.some(r=>overlaps({x:low,y:y-6,width,height:7},r,1)))
    if(y===undefined)return
    result.push({kind,x1,y1:y,x2,y2:y,distance:width})
    const label={x:low+width/2-12,y:y-6,width:24,height:7}
    occupied.push(label);widthOccupied.push(label)
  }
  lanes.forEach((points,index) => {
    const first = points[0]
    const x = first.x + 5
    const positionY = pack.y + pack.height/2 + index*5
    const left = first.x-pack.x, right = pack.x+pack.width-first.x
    horizontal("edge-offset",left<=right?pack.x:first.x,left<=right?first.x:pack.x+pack.width,positionY)
    if (perfs.mode === "regulated") result.push({kind:"first-perf",x1:x,y1:pack.y,x2:x,y2:first.y,distance:first.y-pack.y})
    const pairs=points.slice(1).map((second,i)=>({first:points[i],second}))
    if(perfs.mode==="continuous")pairs.sort((a,b)=>Math.abs((a.first.y+a.second.y)/2-pack.y-pack.height/2)-Math.abs((b.first.y+b.second.y)/2-pack.y-pack.height/2))
    let placed=false
    for(const pair of pairs){
      for(const offset of [5,-20,12,-27,20]){
        const px=first.x+offset
        const footprint={x:px-1,y:pair.first.y-2,width:19,height:pair.second.y-pair.first.y+4}
        if(px<pack.x+1 || px+18>pack.x+pack.width || occupied.some(r=>overlaps(footprint,r,1)))continue
        result.push({kind:"pitch",x1:px,y1:pair.first.y,x2:px,y2:pair.second.y,distance:pair.second.y-pair.first.y})
        occupied.push(footprint);widthOccupied.push(footprint);placed=true;break
      }
      if(placed)break
    }
    if (index>0) horizontal("lane-spacing",lanes[index-1][0].x,first.x,positionY-8)
  })
  return result.filter(d=>Number.isFinite(d.distance) && d.distance>=0)
}

/** Shared by initial render and drag refresh. These are toggle-controlled exportable annotations. */
export function renderPerfMeasurements(layer: SVGGElement, perfs: PerfSpec, centers: PerfPoint[], pack: Rect, obstacles:Rect[]=[],widthObstacles:Rect[]=obstacles) {
  layer.replaceChildren()
  layer.setAttribute("data-role","perf-measures")
  layer.setAttribute("data-text-size","3")
  layer.setAttribute("pointer-events","none")
  const dimensions = buildPerfMeasurementDimensions(perfs,centers,pack,obstacles,widthObstacles)
  const labels = document.createElementNS(NS,"g")
  const line = (parent:SVGElement,x1:number,y1:number,x2:number,y2:number) => {
    const node = document.createElementNS(NS,"line")
    Object.entries({x1,y1,x2,y2}).forEach(([key,value])=>node.setAttribute(key,String(value)))
    node.setAttribute("stroke","#d23429"); node.setAttribute("stroke-width","0.25")
    parent.appendChild(node)
  }
  dimensions.forEach(d => {
    const group = document.createElementNS(NS,"g")
    group.setAttribute("data-perf-measure-kind",d.kind)
    group.setAttribute("data-distance-mm",String(d.distance))
    layer.appendChild(group)
    line(group,d.x1,d.y1,d.x2,d.y2)
    const vertical = d.x1===d.x2
    for (const [x,y] of [[d.x1,d.y1],[d.x2,d.y2]]) line(group,x-(vertical?1:0),y-(vertical?0:1),x+(vertical?1:0),y+(vertical?0:1))
    const text = document.createElementNS(NS,"text")
    const tx = (d.x1+d.x2)/2+(vertical?2:0), ty = (d.y1+d.y2)/2-(vertical?0:2)
    text.setAttribute("x",String(tx));text.setAttribute("y",String(ty))
    text.setAttribute("text-anchor",vertical?"start":"middle")
    text.setAttribute("dominant-baseline","middle")
    text.setAttribute("font-size","3");text.setAttribute("font-family","system-ui,sans-serif")
    text.setAttribute("fill","#d23429")
    text.setAttribute("paint-order","stroke");text.setAttribute("stroke","#fff");text.setAttribute("stroke-width","1.2")
    text.textContent = formatMetricMeasurement(d.distance)
    labels.appendChild(text)
    // Mask measured lines behind text, including lines from neighbouring dimensions.
    try {
      const box = text.getBBox(), mask = document.createElementNS(NS,"rect")
      Object.entries({x:box.x-.7,y:box.y-.4,width:box.width+1.4,height:box.height+.8}).forEach(([key,value])=>mask.setAttribute(key,String(value)))
      mask.setAttribute("fill","#fff");mask.setAttribute("fill-opacity",".94");mask.setAttribute("rx",".5")
      labels.insertBefore(mask,text)
    } catch { /* Detached render uses the same offset label and white outline. */ }
  })
  // All masks/text are above every dimension line, not merely their own line.
  layer.appendChild(labels)
}
