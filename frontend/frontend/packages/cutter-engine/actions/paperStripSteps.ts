import type { FlowwrapSpec, PaperStripStepElements, AttributeBoxSpec } from "../types"
import { clampPaperStripClearStripAttribute } from "../../../apps/web/src/constraints/paperStrip"
import { buildEyeMarkRects } from "../../../apps/web/src/geometry/eyeMarks"
import type { EyeMarkRect } from "../../../apps/web/src/geometry/eyeMarks"
import type { EyeMarkSpec } from "../../../apps/web/src/types/eyeMarks"
import { getHangerSlotHalfWidth, HANGER_SLOT_SIDE_CLEARANCE_MM } from "../../../apps/web/src/constraints/hangerSlots"

export type PaperStripMoveIntent={id:string;dx:number;dy:number}
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value))
const uniqueId=(id:string,peers:{id?:string}[])=>{let next=id,n=1;while(peers.some(p=>p.id===next))next=`${id}-moved-${n++}`;return next}

const keys=["attributeBoxes","safeZones","windows","hangerSlots","halfMoonCutouts","eyeMarks","foldLines","perfs"] as const
const clone=<T>(value:T):T=>value===undefined?value:JSON.parse(JSON.stringify(value))
export const paperStripSynced=(spec:FlowwrapSpec)=>spec.paperStrip?.stepping?.syncMirror!==false
export const paperStripActiveStep=(spec:FlowwrapSpec)=>paperStripSynced(spec)?0:Math.max(0,Math.min((spec.paperStrip?.stepping?.stepCount??1)-1,spec.paperStrip?.stepping?.activeStep??0))
export function paperStripElements(spec:FlowwrapSpec):PaperStripStepElements {
  return Object.fromEntries(keys.map(key=>[key,clone(spec[key])])) as PaperStripStepElements
}
function unselected(elements:PaperStripStepElements):PaperStripStepElements {
  const next=clone(elements)
  // JSON persistence omits undefined. Restore explicit empty fields before a
  // step projection is spread over the outgoing cutter's collections.
  for(const key of keys)if(!(key in next))(next as Record<string,unknown>)[key]=undefined
  for(const key of ["attributeBoxes","safeZones","windows","hangerSlots","halfMoonCutouts"] as const)next[key]?.forEach(item=>{item.selected=false})
  if(next.eyeMarks)next.eyeMarks.selectedIndex=undefined
  return next
}
export function getPaperStripStepSpec(spec:FlowwrapSpec,index:number):FlowwrapSpec {
  const active=paperStripActiveStep(spec)
  const elements=paperStripSynced(spec)||index===active?paperStripElements(spec):spec.paperStrip?.stepping?.elementsByStep?.[index]??unselected(paperStripElements(spec))
  return {...spec,...(index===active?clone(elements):unselected(elements))}
}
/** The top-level collections are the active editor projection; other steps are
 * durable snapshots. Existing tools therefore edit one normal cutter at a time. */
export function activatePaperStripStep(spec:FlowwrapSpec,index:number):FlowwrapSpec {
  const stepping=spec.paperStrip?.stepping
  if(!stepping || paperStripSynced(spec))return spec
  const target=Math.max(0,Math.min(stepping.stepCount-1,Math.round(index))),active=paperStripActiveStep(spec)
  if(target===active)return spec
  const states={...stepping.elementsByStep,[active]:unselected(paperStripElements(spec))}
  const elements=unselected(states[target]??paperStripElements(spec))
  return {...spec,...elements,paperStrip:{...spec.paperStrip,stepping:{...stepping,activeStep:target,elementsByStep:states}}}
}
export function setPaperStripSync(spec:FlowwrapSpec,syncMirror:boolean):FlowwrapSpec {
  const stepping=spec.paperStrip?.stepping??{stepCount:1,gap:0}
  if(syncMirror===paperStripSynced(spec))return spec
  // Store independent work before showing the first cutter as the mirror source.
  const first=syncMirror?activatePaperStripStep(spec,0):spec
  const states={...first.paperStrip?.stepping?.elementsByStep}
  states[0]=unselected(paperStripElements(first))
  for(let i=1;i<stepping.stepCount;i++)if(!states[i])states[i]=unselected(paperStripElements(first))
  return {...first,paperStrip:{...first.paperStrip,stepping:{...stepping,...first.paperStrip?.stepping,syncMirror,activeStep:0,elementsByStep:states}}}
}
export function setPaperStripStepCount(spec:FlowwrapSpec,count:number):FlowwrapSpec {
  const stepCount=Math.max(1,Math.min(10,Math.round(count)))
  const first=paperStripActiveStep(spec)>=stepCount?activatePaperStripStep(spec,0):spec
  const stepping=first.paperStrip?.stepping??{stepCount:1,gap:0}
  const states={...stepping.elementsByStep}
  if(!paperStripSynced(first))for(let i=0;i<stepCount;i++)if(i!==paperStripActiveStep(first) && !states[i])states[i]=unselected(paperStripElements(getPaperStripStepSpec(first,0)))
  return {...first,paperStrip:{...first.paperStrip,stepping:{...stepping,stepCount,elementsByStep:states}}}
}
/** Transfer moved rectangular elements across repeats while retaining each
 * cutter's bounds/clear-strip constraints. Resize and rotate do not rehome. */
export function commitPaperStripStepEdit(before:FlowwrapSpec,edited:FlowwrapSpec,intent?:PaperStripMoveIntent):FlowwrapSpec {
  if(!before.paperStrip || paperStripSynced(before))return edited
  const transferred=intent?transferPaperStripElement(before,edited,intent):null
  if(transferred)return transferred
  const active=paperStripActiveStep(before),count=before.paperStrip.stepping?.stepCount??1,span=before.width+(before.paperStrip.stepping?.gap??0)
  const states={...before.paperStrip.stepping?.elementsByStep}
  const next={...edited}
  for(const key of ["attributeBoxes","safeZones","windows"] as const){
    const originals=before[key]??[],items=edited[key]??[]
    const retained:Array<(typeof items)[number]>=[]
    for(const item of items){
      const old=originals.find(o=>o.id===item.id)
      if(!old || item.x===old.x || item.width!==old.width || item.height!==old.height || item.rotation!==old.rotation){retained.push(item);continue}
      const cutterOrigin=key==="attributeBoxes" && "kind" in item && item.kind==="clear-strip"?0:(before.seals?.left??before.seal)
      const absolute=active*span+cutterOrigin+item.x+item.width/2,destination=Math.floor(absolute/span)
      if(destination===active || destination<0 || destination>=count || absolute-destination*span>before.width){retained.push(item);continue}
      const target=clone(states[destination]??unselected(paperStripElements(before)))
      const peers=target[key]??[]
      let id=item.id,n=1;while(peers.some(p=>p.id===id))id=`${item.id}-moved-${n++}`
      let moved={...item,id,x:item.x+(active-destination)*span,selected:false}
      if(key==="attributeBoxes" && "kind" in moved && moved.kind==="clear-strip")moved=clampPaperStripClearStripAttribute(before,moved as AttributeBoxSpec) as typeof moved
      else {
        const label="kind" in moved && moved.kind==="label",left=before.seals?.left??before.seal,right=before.seals?.right??before.seal
        const min=label?-left:Math.max(0,before.sealClearance??0),max=before.width-left-right+(label?right:-(before.sealClearance??0))-item.width
        moved.x=Math.max(min,Math.min(max,moved.x))
      }
      // These three collections share rectangular coordinates; keep their types.
      ;(target as Record<string,unknown>)[key]=[...peers,moved]
      states[destination]=target
    }
    ;(next as unknown as Record<string,unknown>)[key]=retained
  }
  states[active]=unselected(paperStripElements(next))
  return {...next,paperStrip:{...next.paperStrip,stepping:{...before.paperStrip.stepping!,elementsByStep:states}}}
}

/** Raw move intent is needed for tools which clamp at the old cutter boundary.
 * Resize/rotation never call this; ownership changes only on a cross-step move. */
function transferPaperStripElement(before:FlowwrapSpec,edited:FlowwrapSpec,intent:PaperStripMoveIntent):FlowwrapSpec|null {
  const active=paperStripActiveStep(before),stepping=before.paperStrip!.stepping!,span=before.width+(stepping.gap??0)
  const [kind,...parts]=intent.id.split(':'),id=parts.join(':'),dx=Math.round(intent.dx),dy=Math.round(intent.dy)
  const left=before.seals?.left??before.seal,right=before.seals?.right??before.seal,liveWidth=before.width-left-right
  const top=before.seals?.top??before.seal,bottom=before.seals?.bottom??before.seal,clearance=before.sealClearance??5
  let center:number|undefined
  const rectangleKey=kind==='attribute-box'?'attributeBoxes':kind==='safe-zone'?'safeZones':kind==='window'?'windows':null
  const rectangle=rectangleKey?before[rectangleKey]?.find(item=>item.id===id):undefined
  const slot=kind==='hanger-slot'?before.hangerSlots?.find(item=>item.id===id):undefined
  const moon=kind==='half-moon'?before.halfMoonCutouts?.find(item=>item.id===id):undefined
  const fold=kind==='fold-line'?before.foldLines?.find(item=>item.id===id):undefined
  const lanes=before.perfs?.lanes?.length?before.perfs.lanes:before.perfs?[{originX:before.perfs.originX,originY:before.perfs.originY}]:[]
  const lane=kind==='perf-lane'?lanes[Number(id)]:undefined
  const eyes=before.eyeMarks?buildEyeMarkRects(before.eyeMarks,0,0,before.width,before.height):[]
  const eye=kind==='eye-mark'?eyes[Number(id)]:undefined
  if(rectangle)center=(('kind' in rectangle && rectangle.kind==='clear-strip')?0:left)+rectangle.x+rectangle.width/2
  else if(slot)center=left+slot.centerX
  else if(moon)center=moon.centerX
  else if(fold?.orientation==='vertical')center=left+fold.offset
  else if(lane)center=left+lane.originX
  else if(eye)center=eye.x+eye.width/2
  if(center===undefined || !Number.isFinite(dx) || !Number.isFinite(dy))return null
  const absolute=active*span+center+dx,destination=Math.floor(absolute/span)
  // Do not send objects outside the sheet, or into the inter-step gap.
  if(destination===active || destination<0 || destination>=stepping.stepCount || absolute-destination*span>before.width)return null
  const states={...stepping.elementsByStep},target=clone(states[destination]??unselected(paperStripElements(before))),next={...edited}
  const translated=(active-destination)*span+dx
  if(rectangleKey && rectangle){
    const peers=target[rectangleKey]??[]
    let moved={...rectangle,id:uniqueId(id,peers),x:rectangle.x+translated,y:rectangle.y+dy,selected:false}
    if('kind' in moved && moved.kind==='clear-strip')moved=clampPaperStripClearStripAttribute(before,moved as AttributeBoxSpec) as typeof moved
    else {
      const label='kind' in moved && moved.kind==='label'
      moved.x=clamp(moved.x,label?-left:clearance,liveWidth+(label?right:-clearance)-moved.width)
      moved.y=clamp(moved.y,label?-top:clearance,before.height-top-bottom+(label?bottom:-clearance)-moved.height)
    }
    ;(target as Record<string,unknown>)[rectangleKey]=[...peers,moved]
    ;(next as unknown as Record<string,unknown>)[rectangleKey]=(edited[rectangleKey]??[]).filter(item=>item.id!==id)
  }else if(slot){
    const peers=target.hangerSlots??[],half=getHangerSlotHalfWidth(slot)
    target.hangerSlots=[...peers,{...slot,id:uniqueId(id,peers),centerX:clamp(slot.centerX+translated,HANGER_SLOT_SIDE_CLEARANCE_MM+half,liveWidth-half),selected:false}]
    next.hangerSlots=edited.hangerSlots?.filter(item=>item.id!==id)
  }else if(moon){
    const peers=target.halfMoonCutouts??[]
    target.halfMoonCutouts=[...peers,{...moon,id:uniqueId(id,peers),centerX:clamp(moon.centerX+translated,left+moon.radius,before.width-right-moon.radius),centerY:0,selected:false}]
    next.halfMoonCutouts=edited.halfMoonCutouts?.filter(item=>item.id!==id)
  }else if(fold){
    const peers=target.foldLines??[],bleed=Math.max(0,before.bleed??0)
    target.foldLines=[...peers,{...fold,id:uniqueId(id,peers),offset:clamp(fold.offset+translated,bleed,liveWidth-bleed)}]
    next.foldLines=edited.foldLines?.filter(item=>item.id!==id)
  }else if(lane && before.perfs){
    // A repeat has one perforation construction specification. Never silently
    // change a destination's spacing/mode to accommodate a different source.
    if(target.perfs && (target.perfs.mode!==before.perfs.mode || target.perfs.separation!==before.perfs.separation))return null
    const peers=target.perfs?(target.perfs.lanes?.length?target.perfs.lanes:[{originX:target.perfs.originX,originY:target.perfs.originY}]):[]
    const moved={...lane,id:uniqueId(lane.id??'perf',peers),originX:clamp(lane.originX+translated,0,liveWidth),originY:before.perfs.mode==='regulated'?Math.max(0,(lane.originY??0)+dy):lane.originY}
    target.perfs={...before.perfs,...target.perfs,lanes:[...peers,moved]}
    const remaining=lanes.filter((_,index)=>index!==Number(id))
    next.perfs=remaining.length?{...edited.perfs!,lanes:remaining,originX:remaining[0].originX,originY:remaining[0].originY}:undefined
  }else if(eye && before.eyeMarks){
    const peers=target.eyeMarks?buildEyeMarkRects(target.eyeMarks,0,0,before.width,before.height):[]
    if(peers.length>=2)return null // Preserve the existing two-eyemark limit.
    const moved={...eye,x:clamp(eye.x+translated,1.5,before.width-eye.width-1.5),y:clamp(eye.y+dy,1.5,before.height-eye.height-1.5)}
    target.eyeMarks=eyeState([...peers,moved],target.eyeMarks??before.eyeMarks,before)
    next.eyeMarks=eyeState(eyes.filter((_,index)=>index!==Number(id)),before.eyeMarks,before)
  }else return null
  states[destination]=target;states[active]=unselected(paperStripElements(next))
  return {...next,paperStrip:{...next.paperStrip,stepping:{...stepping,elementsByStep:states}}}
}
function eyeState(rects:EyeMarkRect[],original:EyeMarkSpec,spec:FlowwrapSpec):EyeMarkSpec|undefined {
  if(!rects.length)return undefined
  const state:EyeMarkSpec={count:rects.length,position:rects.length===1?'top-left':'top',color:original.color,width:rects[0].width,height:rects[0].height,width2:rects[1]?.width,height2:rects[1]?.height,manualPositioned:true,manualPositioned2:rects.length===2}
  const bases=buildEyeMarkRects(state,0,0,spec.width,spec.height)
  state.offsetX=rects[0].x-bases[0].x;state.offsetY=rects[0].y-bases[0].y
  if(rects[1]){state.offsetX2=rects[1].x-bases[1].x;state.offsetY2=rects[1].y-bases[1].y}
  return state
}
