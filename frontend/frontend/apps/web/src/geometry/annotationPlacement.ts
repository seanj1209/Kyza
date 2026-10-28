import type { Rect } from "./rect"
import type { FlowwrapSpec } from "../types/flowwrap"
import { buildEyeMarkRects } from "./eyeMarks"

export const overlaps = (a:Rect,b:Rect,gap=0) => a.x < b.x+b.width+gap && a.x+a.width+gap > b.x && a.y < b.y+b.height+gap && a.y+a.height+gap > b.y
export function rotatedRect(rect:Rect, degrees=0):Rect {
  const a=degrees*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a))
  const width=rect.width*c+rect.height*s,height=rect.width*s+rect.height*c
  return {x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height}
}
/** Conservative rendered envelopes; annotation routing never alters production geometry. */
export function annotationObstacles(spec:FlowwrapSpec,liveX:number,liveY:number,pack:Rect,excludeId?:string):Rect[] {
  const items=[...(spec.attributeBoxes??[]),...(spec.safeZones??[]),...(spec.windows??[])]
    .filter(item=>item.id!==excludeId && (!("enabled" in item) || item.enabled!==false))
    .map(item=>rotatedRect({x:liveX+item.x,y:liveY+item.y,width:item.width,height:item.height},item.rotation??0))
  const eyes=spec.eyeMarks?buildEyeMarkRects(spec.eyeMarks,pack.x,pack.y,pack.width,pack.height):[]
  return [...items,...eyes].filter(r=>[r.x,r.y,r.width,r.height].every(Number.isFinite))
}
/** Largest axis-aligned empty rectangle within a panel; no hidden production allowance. */
export function largestClearRect(area:Rect,obstacles:Rect[],gap=1):Rect|null {
  const blocks=obstacles.filter(r=>overlaps(area,r)).map(r=>({x:r.x-gap,y:r.y-gap,width:r.width+2*gap,height:r.height+2*gap}))
  const xs=[...new Set([area.x,area.x+area.width,...blocks.flatMap(r=>[Math.max(area.x,r.x),Math.min(area.x+area.width,r.x+r.width)])])].sort((a,b)=>a-b)
  let best:Rect|null=null
  for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++){
    const x=xs[i],width=xs[j]-x
    const intervals=blocks.filter(r=>r.x<xs[j] && r.x+r.width>x).map(r=>[Math.max(area.y,r.y),Math.min(area.y+area.height,r.y+r.height)]).sort((a,b)=>a[0]-b[0])
    let y=area.y
    for(const [top,bottom] of [...intervals,[area.y+area.height,area.y+area.height]]){
      const candidate={x,y,width,height:top-y}
      if(candidate.height>0 && (!best || width*candidate.height>best.width*best.height))best=candidate
      y=Math.max(y,bottom)
    }
  }
  return best
}
