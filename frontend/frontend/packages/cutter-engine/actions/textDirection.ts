import type { FlowwrapSpec, AttributeBoxSpec } from "../types"
import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"
import { buildFoldLines } from "../../../apps/web/src/geometry/foldLines"
import { annotationObstacles, largestClearRect } from "../../../apps/web/src/geometry/annotationPlacement"
export const TEXT_DIRECTION_KEY="text-direction"
// Front-print wind directions from the supplied chart. Reverse-print 5–8 are
// reserved for Artwork Studio; they are not currently selectable cutter codes.
export const PIFA_ROTATIONS=[0,180,270,90] as const
export type TextDirectionPlacement = {enabled:true;box:AttributeBoxSpec} | {enabled:false;reason:string}
export function getTextDirectionPlacement(spec:FlowwrapSpec,id:string):TextDirectionPlacement {
  const box=spec.attributeBoxes?.find(b=>b.id===id && b.labelKey===TEXT_DIRECTION_KEY && b.enabled!==false)
  if(!box)return {enabled:false,reason:"Select an enabled Text Direction label."}
  if(spec.doyPouch || spec.kSealPouch)return {enabled:false,reason:"Automatic placement requires a straight-sided seal/fold panel."}
  const {liveRect:live,seals}=resolveFlowwrapGeometry(spec)
  if(live.width<=0 || live.height<=0)return {enabled:false,reason:"This cutter has no usable live area."}
  const xs=[{p:0,closed:seals.left>0},{p:live.width,closed:seals.right>0}]
  const ys=[{p:0,closed:seals.top>0},{p:live.height,closed:seals.bottom>0}]
  buildFoldLines(spec.foldLines??[],live.x,0,0,spec.width,spec.height,live.x,live.x+live.width).forEach(f=>{
    const vertical=Math.abs(f.x1-f.x2)<.001,p=vertical?f.x1-live.x:f.y1-live.y,limit=vertical?live.width:live.height
    if(p>0 && p<limit)(vertical?xs:ys).push({p,closed:true})
  })
  const enclosure=(list:typeof xs,center:number)=>{
    const sorted=list.sort((a,b)=>a.p-b.p)
    return sorted.slice(1).map((high,i)=>[sorted[i],high]).find(([a,b])=>center>=a.p && center<=b.p && a.closed && b.closed)
  }
  const x=enclosure(xs,box.x+box.width/2),y=enclosure(ys,box.y+box.height/2)
  if(!x || !y)return {enabled:false,reason:"Place the label inside four seal/fold boundaries."}
  const inset=Math.max(0,spec.sealClearance??3)
  const area={x:x[0].p+inset,y:y[0].p+inset,width:x[1].p-x[0].p-2*inset,height:y[1].p-y[0].p-2*inset}
  if(![area.x,area.y,area.width,area.height].every(Number.isFinite) || area.width<=0 || area.height<=0)return {enabled:false,reason:"The panel is too small for its configured clearance."}
  // Safe zones are usable content regions, not solid artwork obstacles.
  const obstacles=annotationObstacles({...spec,safeZones:[]},0,0,{x:-live.x,y:-live.y,width:spec.width,height:spec.height},id)
  const bbe=spec.attributeBoxes?.filter(b=>b.enabled!==false && b.kind==="bbe" && b.x+b.width>area.x && b.x<area.x+area.width && b.y>area.y && b.y<area.y+area.height).sort((a,b)=>a.y-b.y)[0]
  const above=bbe?largestClearRect({...area,height:bbe.y-area.y-1},obstacles):null
  const free=above && above.width>=12 && above.height>=12?above:largestClearRect(area,obstacles)
  if(!free)return {enabled:false,reason:"No clear space remains around the existing elements."}
  const angle=(box.rotation??0)*Math.PI/180
  // Idempotent target size: do not double the previous label on each Place.
  // A modest fraction of the selected panel, capped at the standard 46 mm.
  const idealWidth=Math.min(46,Math.max(12,Math.min(area.width,area.height)*.3)),idealHeight=idealWidth*24/46
  const rotatedW=idealWidth*Math.abs(Math.cos(angle))+idealHeight*Math.abs(Math.sin(angle))
  const rotatedH=idealWidth*Math.abs(Math.sin(angle))+idealHeight*Math.abs(Math.cos(angle))
  const scale=Math.min(1,free.width/Math.max(.001,rotatedW),free.height/Math.max(.001,rotatedH))
  if(idealWidth*scale<6)return {enabled:false,reason:"No clear space is large enough for a readable direction label."}
  const width=idealWidth*scale,height=idealHeight*scale
  return {enabled:true,box:{...box,x:free.x+(free.width-width)/2,y:free.y+(free.height-height)/2,width,height}}
}
export function placeTextDirection(spec:FlowwrapSpec,id:string):FlowwrapSpec|null {
  const result=getTextDirectionPlacement(spec,id)
  return result.enabled===true?{...spec,attributeBoxes:spec.attributeBoxes?.map(b=>b.id===id?result.box:b)}:null
}
export function addTextDirection(spec:FlowwrapSpec,pifa=1):FlowwrapSpec {
  const {liveRect:live}=resolveFlowwrapGeometry(spec)
  let n=1;while(spec.attributeBoxes?.some(b=>b.id===`text-direction-${n}`))n++
  const box:AttributeBoxSpec={id:`text-direction-${n}`,kind:"label",labelKey:TEXT_DIRECTION_KEY,label:"Text Reads This Way",x:Math.max(0,(live.width-46)/2),y:Math.max(0,(live.height-24)/2),width:46,height:24,rotation:PIFA_ROTATIONS[pifa-1]??0,enabled:true}
  const next={...spec,attributeBoxes:[...(spec.attributeBoxes??[]),box]}
  return placeTextDirection(next,box.id)??next
}
export function setTextDirectionPifa(spec:FlowwrapSpec,id:string,pifa:number):FlowwrapSpec|null {
  if(!Number.isInteger(pifa) || pifa<1 || pifa>4)return null
  if(!spec.attributeBoxes?.some(b=>b.id===id && b.labelKey===TEXT_DIRECTION_KEY))return null
  // Orientation only. Place is a separate, explicit resize/reposition action.
  return {...spec,attributeBoxes:spec.attributeBoxes.map(b=>b.id===id?{...b,rotation:PIFA_ROTATIONS[pifa-1]}:b)}
}
