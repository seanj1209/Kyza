import type { FlowwrapSpec, SafeZoneSpec } from "../../../apps/web/src/types/flowwrap"
import { resolveFlowwrapGeometry } from "../../../apps/web/src/geometry/flowwrapGeometry"

const paperGeometryKey=(spec:FlowwrapSpec)=>JSON.stringify([
  spec.width,spec.height,spec.seals,spec.seal,spec.sealClearance,
  (spec.attributeBoxes??[]).filter(b=>b.kind==='clear-strip' && b.enabled!==false).map(b=>[b.id,b.x,b.width])
])

export function fitPaperSafeZone(spec: FlowwrapSpec, zone: SafeZoneSpec): SafeZoneSpec | null {
  const {liveRect: live}=resolveFlowwrapGeometry(spec), c=spec.sealClearance??5
  const strips=(spec.attributeBoxes??[]).filter(b=>b.kind==='clear-strip' && b.enabled!==false).sort((a,b)=>a.x-b.x)
  const regions: {left:number;right:number;leftId:string;rightId:string}[]=[]
  let left=0,leftId='seal-left'
  for(const strip of strips){
    const right=strip.x-live.x
    if(right>left)regions.push({left,right,leftId,rightId:strip.id})
    if(right+strip.width>left){left=right+strip.width;leftId=strip.id}
  }
  if(left<live.width)regions.push({left,right:live.width,leftId,rightId:'seal-right'})
  const center=zone.x+zone.width/2
  const region=regions.find(r=>zone.paperFit?.leftId===r.leftId && zone.paperFit?.rightId===r.rightId)
    ?? regions.find(r=>center>=r.left && center<=r.right)
    ?? regions.reduce<typeof regions[number]|undefined>((best,r)=>!best || Math.abs((r.left+r.right)/2-center)<Math.abs((best.left+best.right)/2-center)?r:best,undefined)
  if(!region || !Number.isFinite(c) || c<0 || region.right-region.left-2*c<1 || live.height-2*c<1)return null
  return {...zone,x:region.left+c,y:c,width:region.right-region.left-2*c,height:live.height-2*c,rotation:0,
    fitContour:undefined,fitOutline:undefined,paperFit:{leftId:region.leftId,rightId:region.rightId,geometryKey:paperGeometryKey(spec)}}
}

/** Keep fitted regions attached to their strip boundaries as strips move, grow or disappear. */
export function refitPaperSafeZones(spec: FlowwrapSpec): FlowwrapSpec {
  const refit=(source:FlowwrapSpec)=>({...source,safeZones:source.safeZones?.map(z=>z.enabled===false || !z.paperFit || z.paperFit.geometryKey===paperGeometryKey(source)?z:fitPaperSafeZone(source,z)??z)})
  const next=refit(spec), stepping=next.paperStrip?.stepping
  if(stepping?.elementsByStep && stepping.syncMirror===false){
    const states=Object.fromEntries(Object.entries(stepping.elementsByStep).map(([id,elements])=>[id,{...elements,safeZones:refit({...spec,...elements}).safeZones}]))
    next.paperStrip={...next.paperStrip,stepping:{...stepping,elementsByStep:states}}
  }
  return next
}
